import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import AuthService from "../service/AuthService";
import StatsService from "../service/StatsService";
import LogService from "../service/LogService";
// formatter imported in BaseController
import MessageBox from "sap/m/MessageBox";
import Button from "sap/m/Button";
import { Constants } from "../model/Constants";
import { AdGuardStats, StatsEntry } from "../model/AdGuardTypes";
import Event from "sap/ui/base/Event";
import ColumnListItem from "sap/m/ColumnListItem";

/**
 * @namespace ui5.aghd.controller
 */
export default class Dashboard extends BaseController {
	// formatter = formatter; -> Inherited
	private _timer: ReturnType<typeof setTimeout> | undefined;
	private _isPolling = false;
	private _lastLatestTime: Date | undefined;
	private _lastSlowestQueryFetchTime: number | undefined;
	private static readonly REFRESH_INTERVAL = 15000;
	private static readonly SLOWEST_QUERY_INTERVAL = 60000; // 1 minute throttle for heavy queries

	public onInit(): void {
		const view = this.getView();
		view?.setModel(
			new JSONModel({
				selectedTimePeriod: "all",
				selectedTimePeriodText: this.getText("allTime")
			}),
			"view"
		);
		view?.setModel(new JSONModel());
		void this.onRefreshStats();

		// Start Auto-Refresh
		this.startPolling();

		// Optimize: Pause polling when tab is inactive
		document.addEventListener("visibilitychange", this.onVisibilityChange);
	}

	public onExit(): void {
		this.stopPolling();
		document.removeEventListener("visibilitychange", this.onVisibilityChange);
	}

	private onVisibilityChange = (): void => {
		if (document.hidden) {
			this.stopPolling();
		} else {
			// Refresh immediately when becoming visible to show latest data
			void this.onRefreshStats(true);
			this.startPolling();
		}
	};

	private startPolling(): void {
		if (this._isPolling) return;
		this._isPolling = true;
		this.scheduleNextPoll();
	}

	private stopPolling(): void {
		this._isPolling = false;
		if (this._timer) {
			clearTimeout(this._timer);
			this._timer = undefined;
		}
	}

	private scheduleNextPoll(): void {
		if (this._timer) clearTimeout(this._timer);
		this._timer = setTimeout(() => {
			void this.pollStats();
		}, Dashboard.REFRESH_INTERVAL);
	}

	private async pollStats(): Promise<void> {
		if (!this._isPolling) return;
		try {
			await this.onRefreshStats(true);
		} finally {
			// Schedule next one only after this one completes, if still polling
			if (this._isPolling) {
				this.scheduleNextPoll();
			}
		}
	}

	public async onManualRefresh(): Promise<void> {
		// Reset polling timer to avoid double fetch
		this.stopPolling();
		await this.onRefreshStats(false);
		this.startPolling();
	}

	public onTimeFilterChange(): void {
		// Update subheader text
		const viewModel = this.getViewModel("view");
		const period = viewModel.getProperty("/selectedTimePeriod") as string;
		const textMap: Record<string, string> = {
			all: this.getText("allTime"),
			"24h": this.getText("last24Hours"),
			today: this.getText("today"),
			yesterday: this.getText("yesterday"),
			"7d": this.getText("last7Days"),
			week: this.getText("thisWeek")
		};
		viewModel.setProperty("/selectedTimePeriodText", textMap[period] || textMap.all);

		// Stop polling to prevent conflicts, then refresh immediately
		this.stopPolling();
		void this.onRefreshStats(false).then(() => {
			this.startPolling();
		});
	}

	public async onRefreshStats(silent: boolean = false): Promise<void> {
		const model = this.getViewModel();
		if (!model) return;

		if (!silent) {
			this.getView()?.setBusy(true);
		}

		try {
			const viewModel = this.getViewModel("view");
			const period = viewModel.getProperty("/selectedTimePeriod") as string;

			// Check for new logs before fetching heavy metrics
			// We fetch stats (lightweight if period is 'all') and the latest log entry (lightweight)
			const [stats, latestLog] = await Promise.all([
				StatsService.getInstance().getStats(period),
				LogService.getInstance().getQueryLog(1, 0)
			]);

			const latestLogEntry = latestLog.data.length > 0 ? latestLog.data[0] : undefined;
			const latestTimeStr = latestLogEntry ? latestLogEntry.time : undefined;
			// Parse time if it's a string (new optimization)
			const latestTime =
				latestTimeStr instanceof Date ? latestTimeStr : latestTimeStr ? new Date(latestTimeStr) : undefined;

			const currentData = model.getData() as AdGuardStats & { slowest_queries: unknown[] };

			let slowest = currentData?.slowest_queries || [];
			let slowestChanged = false;

			// Only fetch heavy slowest queries if new data arrived (or first run)
			// AND enough time has passed since last fetch to avoid server load
			const now = Date.now();
			const isDataNew =
				(latestTime ? latestTime.getTime() : 0) !== (this._lastLatestTime ? this._lastLatestTime.getTime() : 0);
			const isTimeDue =
				!this._lastSlowestQueryFetchTime || now - this._lastSlowestQueryFetchTime >= Dashboard.SLOWEST_QUERY_INTERVAL;

			if (isDataNew && isTimeDue) {
				slowest = await StatsService.getInstance().getSlowestQueries(1000);
				this._lastLatestTime = latestTime;
				this._lastSlowestQueryFetchTime = now;
				slowestChanged = true;
			}

			// Optimization: Skip model update if data hasn't changed
			if (!slowestChanged && currentData && currentData.num_dns_queries !== undefined) {
				const statsUnchanged =
					currentData.num_dns_queries === stats.num_dns_queries &&
					currentData.num_blocked_filtering === stats.num_blocked_filtering &&
					currentData.avg_processing_time === stats.avg_processing_time &&
					currentData.block_percentage === stats.block_percentage &&
					this.areStatsEqual(currentData.top_queried_domains, stats.top_queried_domains) &&
					this.areStatsEqual(currentData.top_blocked_domains, stats.top_blocked_domains) &&
					this.areStatsEqual(currentData.top_clients, stats.top_clients) &&
					this.areStatsEqual(currentData.top_filters, stats.top_filters);

				if (statsUnchanged) {
					// Even if stats are unchanged, update the "Last Updated" timestamp to show we checked
					model.setProperty("/lastUpdated", new Date());

					if (!silent) {
						this.getView()?.setBusy(false);
					}
					return;
				}
			}

			model.setData({
				...stats,
				slowest_queries: slowest,
				lastUpdated: new Date()
			});
		} catch (error) {
			if ((error as Error).message === "Unauthorized") {
				// Stop timer on auth error to prevent endless loops.
				// Service handles the UI (Popup).
				this.stopPolling();
				return;
			}
			// Suppress errors during silent refresh to avoid popup span
			if (!silent) {
				this.showError(error);
			}
			console.error("Failed to fetch stats", (error as Error).message || "Unknown error");
		} finally {
			if (!silent) {
				this.getView()?.setBusy(false);
			}
		}
	}

	public onPressLogs(): void {
		this.navToLogs();
	}

	public onPressBlockedLogs(): void {
		this.navToLogs({
			status: Constants.LogStatus.Blocked
		});
	}

	public onPressClient(event: Event): void {
		const item = event.getSource();
		if (!(item instanceof ColumnListItem)) return;
		const context = item.getBindingContext();
		if (!context) return;
		const entry = context.getObject() as StatsEntry;

		this.navToLogs({
			search: entry.name
		});
	}

	public onPressDomain(event: Event): void {
		const item = event.getSource();
		if (!(item instanceof ColumnListItem)) return;
		const context = item.getBindingContext();
		if (!context) return;
		const entry = context.getObject() as StatsEntry;

		this.navToLogs({
			search: entry.name
		});
	}

	public onPressBlockedDomain(event: Event): void {
		const item = event.getSource();
		if (!(item instanceof ColumnListItem)) return;
		const context = item.getBindingContext();
		if (!context) return;
		const entry = context.getObject() as StatsEntry;

		this.navToLogs({
			status: Constants.LogStatus.Blocked,
			search: entry.name
		});
	}

	public onPressSlowestDomain(event: Event): void {
		const item = event.getSource();
		if (!(item instanceof ColumnListItem)) return;
		const context = item.getBindingContext();
		if (!context) return;
		const entry = context.getObject() as { domain: string };

		this.navToLogs({
			search: entry.domain
		});
	}

	public onLogoutPress(): void {
		MessageBox.confirm(this.getText("logoutConfirmation"), {
			title: this.getText("logout"),
			actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
			onClose: (action: string | null) => {
				if (action === MessageBox.Action.OK) {
					const model = this.getViewModel();
					// Security Enhancement: Clear sensitive data from the UI model
					// before the async logout and reload happen to prevent temporary exposure
					if (model) {
						model.setData({});
					}
					void (async () => {
						await AuthService.getInstance().logout();
						MessageBox.success(this.getText("loggedOut"), {
							onClose: () => {
								window.location.reload();
							}
						});
					})();
				}
			}
		});
	}

	public onCopyDomain(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof Button)) return;

		const context = source.getBindingContext();
		if (!context) return;

		// Try 'name' (Top Lists) or 'domain' (Slowest Queries)
		const name = context.getProperty("name") as string;
		const domain = context.getProperty("domain") as string;
		const textToCopy = name || domain;

		if (textToCopy) {
			this.copyToClipboard(this.escapeCsvField(textToCopy), this.getText("domainCopied"), source);
		}
	}

	public onCopyClient(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof Button)) return;

		const context = source.getBindingContext();
		if (!context) return;

		// Top Clients uses 'name' for IP
		const client = context.getProperty("name") as string;

		if (client) {
			this.copyToClipboard(this.escapeCsvField(client), this.getText("clientCopied"), source);
		}
	}

	public onCopyAllClients(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof Button)) return;

		const model = this.getViewModel();
		const data = model.getData() as AdGuardStats;
		this.copyListToClipboard(data.top_clients, "name", "clientsListCopied", source);
	}

	public onCopyAllDomains(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof Button)) return;

		const model = this.getViewModel();
		const data = model.getData() as AdGuardStats;
		this.copyListToClipboard(data.top_queried_domains, "name", "domainsListCopied", source);
	}

	public onCopyAllBlockedDomains(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof Button)) return;

		const model = this.getViewModel();
		const data = model.getData() as AdGuardStats;
		this.copyListToClipboard(data.top_blocked_domains, "name", "blockedDomainsListCopied", source);
	}

	public onCopyAllSlowestQueries(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof Button)) return;

		const model = this.getViewModel();
		const data = model.getData() as AdGuardStats & { slowest_queries: { domain: string }[] };
		this.copyListToClipboard(data.slowest_queries, "domain", "slowestQueriesListCopied", source);
	}

	public onCopyFilter(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof Button)) return;

		const context = source.getBindingContext();
		if (!context) return;

		const name = context.getProperty("name") as string;
		if (name) {
			this.copyToClipboard(this.escapeCsvField(name), this.getText("filterCopied"), source);
		}
	}

	public onCopyAllFilters(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof Button)) return;

		const model = this.getViewModel();
		const data = model.getData() as AdGuardStats;
		this.copyListToClipboard(data.top_filters, "name", "filtersListCopied", source);
	}
}
