import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import UIComponent from "sap/ui/core/UIComponent";
import AdGuardService from "../service/AdGuardService";
// formatter imported in BaseController
import MessageBox from "sap/m/MessageBox";
import { Constants } from "../model/Constants";
import { AdGuardStats, StatsEntry } from "../model/AdGuardTypes";
import Event from "sap/ui/base/Event";
import ColumnListItem from "sap/m/ColumnListItem";

export default class Dashboard extends BaseController {
    // formatter = formatter; -> Inherited
    private _timer: ReturnType<typeof setInterval> | undefined;
    private _lastLatestTime: Date | undefined;
    private _lastSlowestQueryFetchTime: number | undefined;
    private static readonly REFRESH_INTERVAL = 15000;
    private static readonly SLOWEST_QUERY_INTERVAL = 60000; // 1 minute throttle for heavy queries

    private areStatsEqual(a: StatsEntry[], b: StatsEntry[]): boolean {
        if (a === b) return true;
        if (!a || !b) return false;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i].name !== b[i].name || a[i].count !== b[i].count) {
                return false;
            }
        }
        return true;
    }

    public onInit(): void {
        this.getView()?.setModel(new JSONModel());
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
        if (!this._timer) {
            this._timer = setInterval(() => {
                void this.onRefreshStats(true); // true = silent refresh
            }, Dashboard.REFRESH_INTERVAL);
        }
    }

    private stopPolling(): void {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
    }

    public async onRefreshStats(silent: boolean = false): Promise<void> {
        const model = this.getView()?.getModel() as JSONModel;
        if (!model) return;

        if (!silent) {
            this.getView()?.setBusy(true);
        }

        try {
            // Check for new logs before fetching heavy "slowest queries" list
            // We fetch stats (lightweight) and the latest log entry (lightweight)
            const [stats, latestLog] = await Promise.all([
                AdGuardService.getInstance().getStats(),
                AdGuardService.getInstance().getQueryLog(1, 0)
            ]);

            const latestTime = latestLog.data.length > 0 ? latestLog.data[0].time : undefined;
            const currentData = model.getData() as AdGuardStats & { slowest_queries: unknown[] };

            let slowest = currentData?.slowest_queries || [];
            let slowestChanged = false;

            // Only fetch heavy slowest queries if new data arrived (or first run)
            // AND enough time has passed since last fetch to avoid server load
            const now = Date.now();
            const isDataNew = (latestTime ? latestTime.getTime() : 0) !== (this._lastLatestTime ? this._lastLatestTime.getTime() : 0);
            const isTimeDue = !this._lastSlowestQueryFetchTime || (now - this._lastSlowestQueryFetchTime >= Dashboard.SLOWEST_QUERY_INTERVAL);

            if (isDataNew && isTimeDue) {
                slowest = await AdGuardService.getInstance().getSlowestQueries(1000);
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
                    this.areStatsEqual(currentData.top_clients, stats.top_clients);

                if (statsUnchanged) {
                    if (!silent) {
                        this.getView()?.setBusy(false);
                    }
                    return;
                }
            }

            model.setData({
                ...stats,
                slowest_queries: slowest
            });
        } catch (error) {
            if ((error as Error).message === "Unauthorized") {
                // Stop timer on auth error to prevent endless loops.
                // Service handles the UI (Popup).
                if (this._timer) clearInterval(this._timer);
                return;
            }
            // Suppress errors during silent refresh to avoid popup span
            if (!silent) {
                MessageBox.error((error as Error).message);
            }
            console.error("Failed to fetch stats", error);
        } finally {
            if (!silent) {
                this.getView()?.setBusy(false);
            }
        }
    }

    public onPressLogs(): void {
        const router = UIComponent.getRouterFor(this);
        router.navTo(Constants.Routes.Logs);
    }

    public onPressBlockedLogs(): void {
        const router = UIComponent.getRouterFor(this);
        router.navTo(Constants.Routes.Logs, {
            query: {
                status: "Blocked"
            }
        });
    }

    public onPressClient(event: Event): void {
        const item = event.getSource();
        if (!(item instanceof ColumnListItem)) return;
        const context = item.getBindingContext();
        if (!context) return;
        const entry = context.getObject() as StatsEntry;

        const router = UIComponent.getRouterFor(this);
        router.navTo(Constants.Routes.Logs, {
            query: {
                search: entry.name
            }
        });
    }

    public onPressDomain(event: Event): void {
        const item = event.getSource();
        if (!(item instanceof ColumnListItem)) return;
        const context = item.getBindingContext();
        if (!context) return;
        const entry = context.getObject() as StatsEntry;

        const router = UIComponent.getRouterFor(this);
        router.navTo(Constants.Routes.Logs, {
            query: {
                search: entry.name
            }
        });
    }

    public onPressBlockedDomain(event: Event): void {
        const item = event.getSource();
        if (!(item instanceof ColumnListItem)) return;
        const context = item.getBindingContext();
        if (!context) return;
        const entry = context.getObject() as StatsEntry;

        const router = UIComponent.getRouterFor(this);
        router.navTo(Constants.Routes.Logs, {
            query: {
                status: "Blocked",
                search: entry.name
            }
        });
    }

    public onPressSlowestDomain(event: Event): void {
        const item = event.getSource();
        if (!(item instanceof ColumnListItem)) return;
        const context = item.getBindingContext();
        if (!context) return;
        const entry = context.getObject() as { domain: string };

        const router = UIComponent.getRouterFor(this);
        router.navTo(Constants.Routes.Logs, {
            query: {
                search: entry.domain
            }
        });
    }

    public onLogoutPress(): void {
        AdGuardService.getInstance().logout();
        UIComponent.getRouterFor(this).navTo(Constants.Routes.Login);
        MessageBox.success("Logged out successfully.");
    }
}
