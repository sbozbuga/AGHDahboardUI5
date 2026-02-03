import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import Controller from "sap/ui/core/mvc/Controller";
import AppComponent from "../Component";
import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import UIComponent from "sap/ui/core/UIComponent";
import SearchField from "sap/m/SearchField";
import Input from "sap/m/Input";
import { InputType } from "sap/m/library";
import Event from "sap/ui/base/Event";
import ListBinding from "sap/ui/model/ListBinding";
import Sorter from "sap/ui/model/Sorter";
import AdGuardService from "../service/AdGuardService";
import formatter from "../model/formatter";
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

interface ProcessedLogEntry extends Omit<LogEntry, "time" | "elapsedMs"> {
	time: Date;
	elapsedMs: number;
}

interface RouteArguments {
	"?query"?: {
		status?: string;
	};
}

interface ViewSettingsEventParams {
	sortItem?: ViewSettingsItem;
	sortDescending: boolean;
	filterItems?: ViewSettingsItem[];
}

/**
 * @namespace ui5.aghd.controller
 */
export default class Logs extends Controller {
	public formatter = formatter;

	// Dialog Cache
	private _mDialogs: Map<string, Promise<Dialog>> = new Map();

	// Filter State
	private _sSearchQuery: string = "";
	private _aViewSettingsFilters: Filter[] = [];
	private _aSorters: Sorter[] = [];

	private static readonly DEFAULT_LIMIT = 1000;
	private static readonly BOLD_REGEX = /\*\*(.*?)\*\*/g;
	private static readonly NEWLINE_REGEX = /\n/g;

	public onInit(): void {
		// apply content density mode to root view
		const view = this.getView();
		if (view) {
			view.addStyleClass((this.getOwnerComponent() as AppComponent).getContentDensityClass());

			// Initialize Model with Pagination Defaults
			const modelData = {
				data: [],
				limit: Logs.DEFAULT_LIMIT,
				offset: 0,
				total: 0,
				advancedFilters: []
			};
			const model = new JSONModel(modelData);
			model.setSizeLimit(Logs.DEFAULT_LIMIT);
			view.setModel(model);
		}

		const router = UIComponent.getRouterFor(this);
		router.getRoute(Constants.Routes.Logs)?.attachPatternMatched(this.onRouteMatched.bind(this), this);
	}

	public onExit(): void {
		// Cleanup if necessary
		this._mDialogs.clear();
	}

	public onRouteMatched(event: Event): void {
		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;

		const params = event.getParameters() as { arguments: RouteArguments };
		const args = params.arguments;
		const query = args["?query"];

		if (query && query.status === "Blocked") {
			model.setProperty(Constants.ModelProperties.FilterStatus, "filtered");
			model.setProperty(Constants.ModelProperties.Offset, 0);
		} else {
			model.setProperty(Constants.ModelProperties.FilterStatus, "");
			model.setProperty(Constants.ModelProperties.Offset, 0);
		}

		void this.onRefreshLogs();
	}


	public async onRefreshLogs(bAppend: boolean = false): Promise<void> {
		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;

		const limit = (model.getProperty(Constants.ModelProperties.Limit) as number) || Logs.DEFAULT_LIMIT;
		// If appending, use current offset; if refreshing, reset to 0
		let offset = (model.getProperty(Constants.ModelProperties.Offset) as number) || 0;
		if (!bAppend) {
			offset = 0;
			model.setProperty(Constants.ModelProperties.Offset, 0);
		}

		const filterStatus = (model.getProperty(Constants.ModelProperties.FilterStatus) as string) || "";

		view.setBusy(true);

		try {
			const data = await AdGuardService.getInstance().getQueryLog(limit, offset, filterStatus);

			// Transform ISO date strings to JS Date objects
			const processedData = data.data.map(item => ({
				...item,
				time: new Date(item.time),
				elapsedMs: parseFloat(item.elapsedMs)
			})) as ProcessedLogEntry[];

			if (bAppend) {
				const currentData = model.getProperty(Constants.ModelProperties.Data) as ProcessedLogEntry[];
				currentData.push(...processedData);
				model.refresh(true);
			} else {
				model.setProperty(Constants.ModelProperties.Data, processedData);
			}

			// Increment offset for next fetch
			if (processedData.length > 0) {
				model.setProperty(Constants.ModelProperties.Offset, offset + processedData.length);
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

		const reason = (event.getParameters() as { reason: string }).reason;

		if (reason === "Growing") {
			// Attempt to fetch next chunk
			void this.onRefreshLogs(true);
		}
	}

	public onSearch(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof SearchField)) return;
		this._sSearchQuery = source.getValue();
		this._applyFilters();
	}

	private _applyFilters(): void {
		const view = this.getView();
		if (!view) return;
		const table = view.byId("logsTable") as Table;
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
		const model = view.getModel() as JSONModel;
		const advancedFilters = model.getProperty(Constants.ModelProperties.AdvancedFilters) as AdvancedFilterRule[];

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

	/**
	 * Generic helper to load and cache dialogs
	 */
	private async _openDialog(fragmentName: string): Promise<Dialog> {
		const view = this.getView();
		if (!view) throw new Error("View not available");

		if (!this._mDialogs.has(fragmentName)) {
			const pDialog = this.loadFragment({
				name: fragmentName
			}) as Promise<Dialog>;

			// Cache the promise immediately
			this._mDialogs.set(fragmentName, pDialog);

			const dialog = await pDialog;
			view.addDependent(dialog);

			// Add style class if needed
			dialog.addStyleClass((this.getOwnerComponent() as AppComponent).getContentDensityClass());

			return dialog;
		}

		return this._mDialogs.get(fragmentName) as Promise<Dialog>;
	}

	public async onOpenViewSettings(): Promise<void> {
		const dialog = await this._openDialog(Constants.Fragments.ViewSettingsDialog);
		dialog.open();
	}

	public onConfirmViewSettings(event: Event): void {
		this._aSorters = [];

		const view = this.getView();
		if (!view) return;

		const table = view.byId("logsTable") as Table;
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

		this._aSorters = [];
		this.resetColumnIcons(source);
		this._aSorters.push(new Sorter(key, newDesc, false));

		const view = this.getView();
		if (view) {
			const table = view.byId("logsTable") as Table;
			const binding = table.getBinding("items") as ListBinding;
			binding.sort(this._aSorters);
		}
	}

	private resetColumnIcons(activeButton: Button): void {
		const view = this.getView();
		if (!view) return;

		const table = view.byId("logsTable") as Table;
		table.getColumns().forEach((col: Column) => {
			const header = col.getHeader();
			if (header && header !== activeButton && header instanceof Button) {
				header.setIcon("");
			}
		});
	}

	public onToggleApiKeyVisibility(event: Event): void {
		const input = event.getSource();
		if (!(input instanceof Input)) return;

		const currentType = input.getType();
		if (currentType === InputType.Password) {
			input.setType(InputType.Text);
			input.setValueHelpIconSrc("sap-icon://hide");
		} else {
			input.setType(InputType.Password);
			input.setValueHelpIconSrc("sap-icon://show");
		}
	}

	public async onOpenSettings(): Promise<void> {
		const dialog = await this._openDialog(Constants.Fragments.SettingsDialog);

		const view = this.getView();
		if (!view) return;

		const apiKey = SettingsService.getInstance().getApiKey();
		const currentModel = SettingsService.getInstance().getModel();
		const model = view.getModel() as JSONModel;

		model.setProperty("/apiKey", apiKey);
		model.setProperty("/selectedModel", currentModel);
		model.setProperty("/systemContext", SettingsService.getInstance().getSystemContext());
		model.setProperty("/availableModels", []);

		dialog.open();

		if (apiKey) {
			dialog.setBusy(true);
			try {
				const models = await GeminiService.getInstance().getAvailableModels();
				model.setProperty("/availableModels", models);

				if (models.length > 0 && !models.find(m => m.key === currentModel)) {
					model.setProperty("/selectedModel", models[0].key);
				}
			} catch {
				// ignore
			} finally {
				dialog.setBusy(false);
			}
		}
	}

	public onSaveSettings(): void {
		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;
		const apiKey = model.getProperty("/apiKey") as string;
		const selectedModel = model.getProperty("/selectedModel") as string;

		SettingsService.getInstance().setApiKey(apiKey);
		const systemContext = model.getProperty("/systemContext") as string;
		SettingsService.getInstance().setSystemContext(systemContext);
		if (selectedModel) {
			SettingsService.getInstance().setModel(selectedModel);
		}

		(view.byId("settingsDialog") as Dialog).close();
		MessageBox.success("Settings saved successfully.");
	}

	public onCancelSettings(): void {
		const view = this.getView();
		if (!view) return;
		(view.byId("settingsDialog") as Dialog).close();
	}

	public async onAnalyzeLogs(): Promise<void> {
		if (!SettingsService.getInstance().hasApiKey()) {
			MessageBox.warning("Please configure your Gemini API Key in Settings first.");
			void this.onOpenSettings();
			return;
		}

		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;
		const logs = model.getProperty(Constants.ModelProperties.Data) as ProcessedLogEntry[];

		if (!logs || logs.length === 0) {
			MessageBox.information("No logs available to analyze.");
			return;
		}

		view.setBusy(true);

		try {
			// Cast to LogEntry[] as GeminiService doesn't use the time/elapsedMs fields for summary
			const insights = await GeminiService.getInstance().generateInsights(logs as unknown as LogEntry[]);
			const html = this.formatInsights(insights);

			model.setProperty("/analysisHtml", html);
			model.setProperty("/analysisText", insights);
			void this.onOpenInsights();
		} catch (error) {
			MessageBox.error((error as Error).message);
		} finally {
			view.setBusy(false);
		}
	}

	public onCopyInsights(): void {
		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;
		const text = model.getProperty("/analysisText") as string;

		if (!text) return;

		navigator.clipboard.writeText(text).then(() => {
			MessageToast.show("Insights copied to clipboard.");
		}).catch((err) => {
			console.error("Could not copy text: ", err);
			MessageBox.error("Failed to copy insights to clipboard.");
		});
	}

	public formatInsights(text: string): string {
		if (!text) return "";
		let safeText = encodeXML(text);
		safeText = safeText
			.replace(Logs.BOLD_REGEX, "<strong>$1</strong>")
			.replace(Logs.NEWLINE_REGEX, "<br/>");
		return safeText;
	}

	public async onOpenInsights(): Promise<void> {
		const dialog = await this._openDialog(Constants.Fragments.InsightsDialog);
		dialog.open();
	}

	public onCloseInsights(): void {
		const view = this.getView();
		if (!view) return;
		(view.byId("insightsDialog") as Dialog).close();
	}

	// Advanced Filter Handlers
	public async onOpenAdvancedFilter(): Promise<void> {
		const dialog = await this._openDialog(Constants.Fragments.AdvancedFilterDialog);
		dialog.open();
	}

	public onAddFilterRow(): void {
		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;
		const filters = model.getProperty(Constants.ModelProperties.AdvancedFilters) as AdvancedFilterRule[];

		filters.push({ column: Constants.ColumnIds.ElapsedMs, operator: "GT", value: "" });
		model.setProperty(Constants.ModelProperties.AdvancedFilters, filters);
	}

	public onRemoveFilterRow(event: Event): void {
		const source = event.getSource();
		// Type Guard
		if (!(source instanceof Button)) return;
		const context = source.getBindingContext();
		if (!context) return;

		const path = context.getPath();
		const index = parseInt(path.split("/").pop() || "0", 10);

		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;
		const filters = model.getProperty(Constants.ModelProperties.AdvancedFilters) as AdvancedFilterRule[];

		filters.splice(index, 1);
		model.setProperty(Constants.ModelProperties.AdvancedFilters, filters);
	}

	public onConfirmAdvancedFilter(): void {
		this._applyFilters();
		this.onCancelAdvancedFilter();
	}

	public onClearAdvancedFilters(): void {
		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;
		model.setProperty(Constants.ModelProperties.AdvancedFilters, []);
		this._applyFilters();
	}

	public onCancelAdvancedFilter(): void {
		const view = this.getView();
		if (!view) return;
		(view.byId("advancedFilterDialog") as Dialog).close();

	}
}
