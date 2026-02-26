import MessageBox from "sap/m/MessageBox";
import AppComponent from "../Component";
import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import UIComponent from "sap/ui/core/UIComponent";
import SearchField from "sap/m/SearchField";
import Event from "sap/ui/base/Event";
import ListBinding from "sap/ui/model/ListBinding";
import Sorter from "sap/ui/model/Sorter";
import LogService from "../service/LogService";
import Dialog from "sap/m/Dialog";
import Button from "sap/m/Button";
import Column from "sap/m/Column";
import Table from "sap/m/Table";
import SettingsService from "../service/SettingsService";
import GeminiService from "../service/GeminiService";
import { LogEntry, AdvancedFilterRule } from "../model/AdGuardTypes";
import ViewSettingsItem from "sap/m/ViewSettingsItem";
import encodeXML from "sap/base/security/encodeXML";
import { Constants } from "../model/Constants";
import BaseController from "./BaseController";

interface RouteArguments {
	"?query"?: {
		status?: string;
		search?: string;
	};
}

interface ViewSettingsEventParams {
	sortItem?: ViewSettingsItem;
	sortDescending: boolean;
	filterItems?: ViewSettingsItem[];
}

const BOLD_REGEX = /\*\*(.*?)\*\*/g;
const NEWLINE_REGEX = /\n/g;

/**
 * @namespace ui5.aghd.controller
 */
export default class Logs extends BaseController {
	// Dialog Cache (Inherited from BaseController)

	// Filter State
	private _sSearchQuery: string = "";
	private _aViewSettingsFilters: Filter[] = [];
	private _aSorters: Sorter[] = [];
	private _iSearchTimer: ReturnType<typeof setTimeout> | null = null;

	private static readonly DEFAULT_LIMIT = 1000;
	private static readonly SEARCH_DELAY = 300;

	public onInit(): void {
		// apply content density mode to root view
		const view = this.getView();
		if (view) {
			view.addStyleClass((this.getOwnerComponent() as AppComponent).getContentDensityClass());

			// Initialize Data Model (default)
			const contentModel = new JSONModel({
				data: []
			});
			contentModel.setSizeLimit(Logs.DEFAULT_LIMIT);
			view.setModel(contentModel);

			// Initialize UI State Model ('view')
			const viewModel = new JSONModel({
				limit: Logs.DEFAULT_LIMIT,
				offset: 0,
				total: 0,
				advancedFilters: [],
				filterStatus: ""
			});
			view.setModel(viewModel, "view");
		}

		const router = UIComponent.getRouterFor(this);
		router.getRoute(Constants.Routes.Logs)?.attachPatternMatched(this.onRouteMatched.bind(this), this);
	}

	public onRouteMatched(event: Event): void {
		const view = this.getView();
		if (!view) return;
		const viewModel = this.getViewModel("view");

		const params = event.getParameters() as { arguments: RouteArguments };
		const args = params.arguments;
		const query = args["?query"];

		// Handle Status Filter
		if (query && query.status === Constants.LogStatus.Blocked) {
			viewModel.setProperty(Constants.ModelProperties.FilterStatus, "filtered");
			viewModel.setProperty(Constants.ModelProperties.Offset, 0);
		} else {
			viewModel.setProperty(Constants.ModelProperties.FilterStatus, "");
			viewModel.setProperty(Constants.ModelProperties.Offset, 0);
		}

		// Handle Search Query
		const searchField = this.getControl<SearchField>("searchField");
		if (query && query.search) {
			this._sSearchQuery = query.search;
			if (searchField) {
				searchField.setValue(query.search);
			}
		} else {
			this._sSearchQuery = "";
			if (searchField) {
				searchField.setValue("");
			}
		}

		// Apply client-side filters
		this._applyFilters();

		void this.onRefreshLogs();
	}


	public async onRefreshLogs(bAppend: boolean = false): Promise<void> {
		const view = this.getView();
		if (!view) return;
		const dataModel = this.getViewModel();
		const viewModel = this.getViewModel("view");

		const limit = (viewModel.getProperty(Constants.ModelProperties.Limit) as number) || Logs.DEFAULT_LIMIT;
		// If appending, use current offset; if refreshing, reset to 0
		let offset = (viewModel.getProperty(Constants.ModelProperties.Offset) as number) || 0;
		if (!bAppend) {
			offset = 0;
			viewModel.setProperty(Constants.ModelProperties.Offset, 0);
		}

		const filterStatus = (viewModel.getProperty(Constants.ModelProperties.FilterStatus) as string) || "";

		view.setBusy(true);

		try {
			const data = await LogService.getInstance().getQueryLog(limit, offset, filterStatus);

			// Use processed data directly from service
			const processedData = data.data;
			const len = processedData.length;

			if (bAppend) {
				const currentData = dataModel.getProperty(Constants.ModelProperties.Data) as LogEntry[];
				// Optimization: Use pre-allocated array and indexed assignment to avoid resize overhead of push()
				// and allocation of slice(). Significant for large datasets (e.g. 10k+ items).
				const newData = new Array(currentData.length + len);
				for (let i = 0; i < currentData.length; i++) {
					newData[i] = currentData[i];
				}
				for (let i = 0; i < len; i++) {
					newData[currentData.length + i] = processedData[i];
				}
				dataModel.setProperty(Constants.ModelProperties.Data, newData);
			} else {
				dataModel.setProperty(Constants.ModelProperties.Data, processedData);
			}

			// Increment offset for next fetch
			if (len > 0) {
				viewModel.setProperty(Constants.ModelProperties.Offset, offset + len);
			}

		} catch (error) {
			MessageBox.error((error as Error).message);
		} finally {
			view.setBusy(false);
		}
	}

	public onUpdateFinished(event: Event): void {
		const table = event.getSource();
		if (!(table instanceof Table)) return;
		const binding = table.getBinding("items") as ListBinding;
		if (!binding) return;

		const params = event.getParameters() as { reason: string; actual: number; total: number };
		const reason = params.reason;
		const actual = params.actual;
		const total = params.total;

		if (reason === Constants.Events.Growing && actual >= total) {
			// Attempt to fetch next chunk
			void this.onRefreshLogs(true);
		}
	}

	public onExit(): void {
		super.onExit();
		if (this._iSearchTimer) {
			clearTimeout(this._iSearchTimer);
			this._iSearchTimer = null;
		}
	}

	public onSearch(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof SearchField)) return;

		const sQuery = source.getValue();
		const sEventId = event.getId();

		if (this._iSearchTimer) {
			clearTimeout(this._iSearchTimer);
			this._iSearchTimer = null;
		}

		if (sEventId === Constants.Events.Search) {
			// Immediate search
			this._sSearchQuery = sQuery;
			this._applyFilters();
		} else {
			// Debounced search
			this._iSearchTimer = setTimeout(() => {
				this._sSearchQuery = sQuery;
				this._applyFilters();
				this._iSearchTimer = null;
			}, Logs.SEARCH_DELAY);
		}
	}

	private _applyFilters(): void {
		const view = this.getView();
		if (!view) return;
		const table = this.getControl<Table>("logsTable");
		const binding = table.getBinding("items") as ListBinding;

		const aFilters: Filter[] = [];

		// 1. Search Query Filters
		if (this._sSearchQuery && this._sSearchQuery.length > 0) {
			aFilters.push(new Filter({
				filters: [
					new Filter(Constants.ColumnIds.QuestionName, FilterOperator.Contains, this._sSearchQuery),
					new Filter(Constants.ColumnIds.Client, FilterOperator.Contains, this._sSearchQuery)
				],
				and: false
			}));
		}

		// 2. View Settings Filters (Status)
		if (this._aViewSettingsFilters && this._aViewSettingsFilters.length > 0) {
			aFilters.push(...this._aViewSettingsFilters);
		}

		// 3. Advanced Filters
		const viewModel = this.getViewModel("view");
		const advancedFilters = viewModel.getProperty(Constants.ModelProperties.AdvancedFilters) as AdvancedFilterRule[];

		if (advancedFilters && advancedFilters.length > 0) {
			advancedFilters.forEach(f => {
				let value: string | number | boolean = f.value;
				const operator = f.operator as FilterOperator;

				// Type conversion
				if (f.column === Constants.ColumnIds.ElapsedMs) {
					value = parseFloat(f.value);
				}

				if (f.value !== "") {
					aFilters.push(new Filter(f.column, operator, value));
				}
			});
		}

		binding.filter(aFilters);
	}

	public onNavBack(): void {
		const router = UIComponent.getRouterFor(this);
		router.navTo(Constants.Routes.Dashboard);
	}



	public async onOpenViewSettings(): Promise<void> {
		const dialog = await this._openDialog(Constants.Fragments.ViewSettingsDialog);
		dialog.open();
	}

	public onConfirmViewSettings(event: Event): void {
		this._aSorters = [];

		const view = this.getView();
		if (!view) return;

		const table = this.getControl<Table>("logsTable");
		const binding = table.getBinding("items") as ListBinding;

		const params = event.getParameters() as unknown as ViewSettingsEventParams;

		const sortPath = params.sortItem ? params.sortItem.getKey() : null;
		const sortDescending = params.sortDescending;

		if (sortPath) {
			this._aSorters.push(new Sorter(sortPath, sortDescending, false));
		}

		binding.sort(this._aSorters);

		const dialogFilters: Filter[] = [];
		if (params.filterItems) {
			params.filterItems.forEach((item: ViewSettingsItem) => {
				const key = item.getKey();
				dialogFilters.push(new Filter(Constants.ColumnIds.Status, FilterOperator.EQ, key));
			});
		}

		this._aViewSettingsFilters = dialogFilters;
		this._applyFilters();
	}

	public onSort(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof Button)) return;

		const key = source.getCustomData()[0].getValue() as string;

		const currentDesc = source.getIcon() === "sap-icon://sort-descending";
		const newDesc = !currentDesc;

		source.setIcon(newDesc ? "sap-icon://sort-descending" : "sap-icon://sort-ascending");

		const directionText = this.getText(newDesc ? "sortDescending" : "sortAscending");
		source.setTooltip(`${source.getText()} (${directionText})`);

		this._aSorters = [];
		this.resetColumnIcons(source);
		this._aSorters.push(new Sorter(key, newDesc, false));

		const view = this.getView();
		if (view) {
			const table = this.getControl<Table>("logsTable");
			const binding = table.getBinding("items") as ListBinding;
			binding.sort(this._aSorters);
		}
	}

	private resetColumnIcons(activeButton: Button): void {
		const view = this.getView();
		if (!view) return;

		const table = this.getControl<Table>("logsTable");
		table.getColumns().forEach((col: Column) => {
			const header = col.getHeader();
			if (header && header !== activeButton && header instanceof Button) {
				header.setIcon("");
				header.setTooltip(header.getText());
			}
		});
	}

	public async onAnalyzeLogs(): Promise<void> {
		if (!SettingsService.getInstance().hasApiKey()) {
			MessageBox.warning(this.getText("apiKeyMissing"));
			void this.onOpenSettings();
			return;
		}

		const view = this.getView();
		if (!view) return;
		const model = this.getViewModel();
		const logs = model.getProperty(Constants.ModelProperties.Data) as LogEntry[];

		if (!logs || logs.length === 0) {
			MessageBox.information(this.getText("noLogsFound"));
			return;
		}

		view.setBusy(true);

		try {
			const insights = await GeminiService.getInstance().generateInsights(logs);
			const html = this.formatInsights(insights);

			// We put these on the view model so they don't pollute the data model
			const viewModel = this.getViewModel("view");
			viewModel.setProperty("/analysisHtml", html);
			viewModel.setProperty("/analysisText", insights);
			void this.onOpenInsights();
		} catch (error) {
			MessageBox.error((error as Error).message);
		} finally {
			view.setBusy(false);
		}
	}

	public onCopyInsights(event: Event): void {
		const viewModel = this.getViewModel("view");
		const text = viewModel.getProperty("/analysisText") as string;
		const source = event.getSource();

		if (!text) return;

		// Pass source as Button if it is one, otherwise undefined
		const btn = source instanceof Button ? source : undefined;
		this.copyToClipboard(text, this.getText("listCopied"), btn);
	}

	public formatInsights(text: string): string {
		if (!text) return "";
		let safeText = encodeXML(text);
		safeText = safeText
			.replace(BOLD_REGEX, "<strong>$1</strong>")
			.replace(NEWLINE_REGEX, "<br/>");
		return safeText;
	}

	public async onOpenInsights(): Promise<void> {
		const dialog = await this._openDialog(Constants.Fragments.InsightsDialog);
		dialog.open();
	}

	public onCloseInsights(): void {
		const view = this.getView();
		if (!view) return;
		this.getControl<Dialog>("insightsDialog").close();
	}

	// Advanced Filter Handlers
	public async onOpenAdvancedFilter(): Promise<void> {
		const dialog = await this._openDialog(Constants.Fragments.AdvancedFilterDialog);
		dialog.open();
	}

	public onAddFilterRow(): void {
		const viewModel = this.getViewModel("view");
		const filters = viewModel.getProperty(Constants.ModelProperties.AdvancedFilters) as AdvancedFilterRule[];

		filters.push({ column: Constants.ColumnIds.ElapsedMs, operator: "GT", value: "" });
		viewModel.setProperty(Constants.ModelProperties.AdvancedFilters, filters);
	}

	public onRemoveFilterRow(event: Event): void {
		const source = event.getSource();
		// Type Guard
		if (!(source instanceof Button)) return;
		const context = source.getBindingContext();
		if (!context) return;

		const path = context.getPath();
		const index = parseInt(path.split("/").pop() || "0", 10);

		const viewModel = this.getViewModel("view");
		const filters = viewModel.getProperty(Constants.ModelProperties.AdvancedFilters) as AdvancedFilterRule[];

		filters.splice(index, 1);
		viewModel.setProperty(Constants.ModelProperties.AdvancedFilters, filters);
	}

	public onConfirmAdvancedFilter(): void {
		this._applyFilters();
		this.onCancelAdvancedFilter();
	}

	public onClearAdvancedFilters(): void {
		const viewModel = this.getViewModel("view");
		if (!viewModel) return;
		viewModel.setProperty(Constants.ModelProperties.AdvancedFilters, []);
		this._applyFilters();
	}

	public onCancelAdvancedFilter(): void {
		const view = this.getView();
		if (!view) return;
		this.getControl<Dialog>("advancedFilterDialog").close();

	}

	public onCopyDomain(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof Button)) return;

		const context = source.getBindingContext();
		if (!context) return;

		// Access the 'question' object from the model
		const question = context.getProperty("question") as { name: string };
		const domain = question ? question.name : "";

		if (domain) {
			this.copyToClipboard(domain, this.getText("domainCopied"), source);
		}
	}

	public onCopyClient(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof Button)) return;

		const context = source.getBindingContext();
		if (!context) return;

		const client = context.getProperty("client") as string;

		if (client) {
			this.copyToClipboard(client, this.getText("clientCopied"), source);
		}
	}

	public onCopyAllLogs(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof Button)) return;

		const model = this.getViewModel();
		const data = model.getProperty("/data") as LogEntry[];

		if (data && data.length > 0) {
			const header = "Time,Client,Domain,Type,Status,Elapsed(ms),Reason";
			const rows = data.map(log => {
				const time = log.time instanceof Date ? log.time.toISOString() : log.time;
				const client = this._escapeCsvField(log.client);
				const domain = this._escapeCsvField(log.question?.name);
				const type = this._escapeCsvField(log.question?.type);
				const status = this._escapeCsvField(log.status);
				const elapsed = this._escapeCsvField(log.elapsedMs);
				const reason = this._escapeCsvField(log.reason);
				return `${time},${client},${domain},${type},${status},${elapsed},${reason}`;
			}).join("\n");

			const csvContent = `${header}\n${rows}`;

			this.copyToClipboard(csvContent, this.getText("listCopied"), source);
		}
	}

	private _escapeCsvField(value: string | number | boolean | null | undefined): string {
		if (value === null || value === undefined) {
			return "";
		}
		let str = String(value);

		// Prevent Formula Injection
		if (/^[=+\-@\t\r]/.test(str)) {
			str = "'" + str;
		}

		// Quote if necessary
		if (/[",\n\r]/.test(str)) {
			str = '"' + str.replace(/"/g, '""') + '"';
		}

		return str;
	}
}
