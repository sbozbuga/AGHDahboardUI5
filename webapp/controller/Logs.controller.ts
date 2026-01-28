import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import Controller from "sap/ui/core/mvc/Controller";
import AppComponent from "../Component";
import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import UIComponent from "sap/ui/core/UIComponent";
import SearchField from "sap/m/SearchField";
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
import { LogEntry } from "../model/AdGuardTypes";
import ViewSettingsItem from "sap/m/ViewSettingsItem";
import encodeXML from "sap/base/security/encodeXML";

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
	private _pViewSettingsDialog: Promise<Dialog> | undefined;
	private _pSettingsDialog: Promise<Dialog> | undefined;
	private _pInsightsDialog: Promise<Dialog> | undefined;

	private static readonly DEFAULT_LIMIT = 1000;

	public onInit(): void {
		// apply content density mode to root view
		const view = this.getView();
		if (view) {
			view.addStyleClass((this.getOwnerComponent() as AppComponent).getContentDensityClass());

			// Initialize Model with Pagination Defaults
			const model = new JSONModel({
				data: [],
				limit: Logs.DEFAULT_LIMIT,
				offset: 0,
				total: 0 // Track total records if API provides it, or infer
			});
			view.setModel(model);

		}

		const router = UIComponent.getRouterFor(this);
		router.getRoute("logs")?.attachPatternMatched(this.onRouteMatched.bind(this), this);
	}

	public onExit(): void {
		// Cleanup if necessary
	}

	public onRouteMatched(event: Event): void {
		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;

		const params = event.getParameters() as { arguments: RouteArguments };
		const args = params.arguments;
		const query = args["?query"];

		if (query && query.status === "Blocked") {
			model.setProperty("/filterStatus", "filtered");
			model.setProperty("/offset", 0);
		} else {
			model.setProperty("/filterStatus", "");
			model.setProperty("/offset", 0);
		}

		void this.onRefreshLogs();
	}


	public async onRefreshLogs(bAppend: boolean = false): Promise<void> {
		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;

		const limit = (model.getProperty("/limit") as number) || Logs.DEFAULT_LIMIT;
		// If appending, use current offset; if refreshing, reset to 0
		let offset = (model.getProperty("/offset") as number) || 0;
		if (!bAppend) {
			offset = 0;
			model.setProperty("/offset", 0);
		}

		const filterStatus = (model.getProperty("/filterStatus") as string) || "";

		view.setBusy(true);

		try {
			const data = await AdGuardService.getInstance().getQueryLog(limit, offset, filterStatus);

			// Transform ISO date strings to JS Date objects
			const processedData = data.data.map(item => ({
				...item,
				time: new Date(item.time),
				elapsedMs: parseFloat(item.elapsedMs)
			}));

			if (bAppend) {
				const currentData = model.getProperty("/data") as LogEntry[];
				model.setProperty("/data", [...currentData, ...processedData]);
			} else {
				model.setProperty("/data", processedData);
			}

			// Increment offset for next fetch
			if (processedData.length > 0) {
				model.setProperty("/offset", offset + processedData.length);
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



		// If we showed all loaded items, try to load more
		// Use a small buffer or check if actual == total 
		// Logic depends on 'growing' mechanism. 
		// With growing=true, UI5 manages the 'growing' automatically for Client-Side models 
		// IF the model has all data. 
		// Since we are doing server-side pagination manually via 'append', 
		// we can check if the last fetch returned < limit.

		// Actually, for "Infinity Scroll" with server-side pagination in UI5 with JSONModel,
		// typically user scrolls to bottom -> 'updateFinished' triggering with reason 'Growing'.

		// However, 'growing' feature in sap.m.Table works best with complete data or OData. 
		// For manual JSON, we might need 'growingTriggerText' or custom logic.
		// Let's rely on the fact that if we scroll to bottom, we want more.

		const reason = (event.getParameters() as { reason: string }).reason;

		// If the table grew, it means user clicked "More" or scrolled down.
		// BUT, since we have JSONModel with limited data, matching 'total' matches 'data.length'.
		// We need to fetch MORE from server if we reached the end of local data.

		if (reason === "Growing") {
			// Attempt to fetch next chunk
			void this.onRefreshLogs(true);
		}
	}

	// Pagination controls removed


	public onSearch(event: Event): void {
		const source = event.getSource();
		if (!(source instanceof SearchField)) return;
		const query = source.getValue();
		const filters: Filter[] = [];

		if (query && query.length > 0) {
			filters.push(new Filter({
				filters: [
					new Filter("question/name", FilterOperator.Contains, query),
					new Filter("client", FilterOperator.Contains, query)
				],
				and: false
			}));
		}

		const view = this.getView();
		if (view) {
			const table = view.byId("logsTable") as Table;
			const binding = table.getBinding("items") as ListBinding;
			binding.filter(filters);
		}
	}

	public onNavBack(): void {
		const router = UIComponent.getRouterFor(this);
		router.navTo("dashboard");
	}
	private _aSorters: Sorter[] = [];

	public async onOpenViewSettings(): Promise<void> {
		const view = this.getView();
		if (!view) return;

		// Load fragment if not already loaded
		if (!this._pViewSettingsDialog) {
			this._pViewSettingsDialog = (this.loadFragment({
				name: "ui5.aghd.view.ViewSettingsDialog"
			}) as Promise<Dialog>).then((dialog: Dialog) => {
				view.addDependent(dialog);
				return dialog;
			});
		}

		const dialog = await this._pViewSettingsDialog;
		dialog.open();
	}

	public onConfirmViewSettings(event: Event): void {
		// Logic handles Dialog output (single sort usually)
		// We reset our multi-sort stack if the dialog is used, to avoid confusion.
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

		// ... Filters logic remains same ...
		const dialogFilters: Filter[] = [];
		if (params.filterItems) {
			params.filterItems.forEach((item: ViewSettingsItem) => {
				const key = item.getKey();
				dialogFilters.push(new Filter("status", FilterOperator.EQ, key));
			});
		}
		binding.filter(dialogFilters);
	}



	public onSort(event: Event): void {
		// ...
		const source = event.getSource();
		if (!(source instanceof Button)) return;

		const key = source.getCustomData()[0].getValue() as string; // "time", "client", etc.

		const currentDesc = source.getIcon() === "sap-icon://sort-descending";
		const newDesc = !currentDesc;

		source.setIcon(newDesc ? "sap-icon://sort-descending" : "sap-icon://sort-ascending");

		// Update Sorter Stack - Single Column Sort Mode
		this._aSorters = []; // Clear stack

		// Reset icons on other columns (Visual cleanup)
		this.resetColumnIcons(source);

		// Add new sorter
		this._aSorters.push(new Sorter(key, newDesc, false));

		// Apply Binding
		const view = this.getView();
		if (view) {
			const table = view.byId("logsTable") as Table;
			const binding = table.getBinding("items") as ListBinding;
			binding.sort(this._aSorters);
		}
	}

	private resetColumnIcons(activeButton: Button): void {
		// Helper to clear icons on other buttons
		const view = this.getView();
		if (!view) return;

		// Heuristic: iterate over known IDs or just Query?
		// We'll iterate the columns of the table
		const table = view.byId("logsTable") as Table;
		table.getColumns().forEach((col: Column) => {
			const header = col.getHeader();
			// Check if header is a button and not the active one
			if (header && header !== activeButton && header instanceof Button) {
				header.setIcon(""); // Clear icon
			}
		});
	}


	public async onOpenSettings(): Promise<void> {
		const view = this.getView();
		if (!view) return;

		if (!this._pSettingsDialog) {
			this._pSettingsDialog = (this.loadFragment({
				name: "ui5.aghd.view.fragment.SettingsDialog"
			}) as Promise<Dialog>).then((dialog: Dialog) => {
				view.addDependent(dialog);
				return dialog;
			});
		}

		const dialog = await this._pSettingsDialog;
		const apiKey = SettingsService.getInstance().getApiKey();
		const currentModel = SettingsService.getInstance().getModel();
		const model = view.getModel() as JSONModel;

		model.setProperty("/apiKey", apiKey);
		model.setProperty("/selectedModel", currentModel);
		model.setProperty("/systemContext", SettingsService.getInstance().getSystemContext());
		model.setProperty("/availableModels", []); // Clear first

		dialog.open();

		// Fetch models if API key is present
		if (apiKey) {
			dialog.setBusy(true);
			try {
				const models = await GeminiService.getInstance().getAvailableModels();
				model.setProperty("/availableModels", models);

				// Ensure selected model is still valid, else default to first or keep current
				if (models.length > 0 && !models.find(m => m.key === currentModel)) {
					model.setProperty("/selectedModel", models[0].key);
				}
			} catch {
				// verify silent fail or user toast?
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
		const logs = model.getProperty("/data") as LogEntry[];

		if (!logs || logs.length === 0) {
			MessageBox.information("No logs available to analyze.");
			return;
		}

		view.setBusy(true);

		try {
			const insights = await GeminiService.getInstance().generateInsights(logs);
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

		// Use Clipboard API
		navigator.clipboard.writeText(text).then(() => {
			MessageToast.show("Insights copied to clipboard.");
		}).catch((err) => {
			console.error("Could not copy text: ", err);
			MessageBox.error("Failed to copy insights to clipboard.");
		});
	}

	public formatInsights(text: string): string {
		if (!text) return "";
		// 1. Sanitize HTML
		let safeText = encodeXML(text);

		// 2. Apply formatting
		// Note: encodeXML replaces < with &lt;, so our tags <br/> and <strong> are safe to add afterwards.
		safeText = safeText
			.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
			.replace(/\n/g, "<br/>"); // Newlines

		return safeText;
	}

	public async onOpenInsights(): Promise<void> {
		const view = this.getView();
		if (!view) return;

		if (!this._pInsightsDialog) {
			this._pInsightsDialog = (this.loadFragment({
				name: "ui5.aghd.view.fragment.InsightsDialog"
			}) as Promise<Dialog>).then((dialog: Dialog) => {
				view.addDependent(dialog);
				return dialog;
			});
		}

		const dialog = await this._pInsightsDialog;
		dialog.open();
	}

	public onCloseInsights(): void {
		const view = this.getView();
		if (!view) return;
		(view.byId("insightsDialog") as Dialog).close();
	}
}
