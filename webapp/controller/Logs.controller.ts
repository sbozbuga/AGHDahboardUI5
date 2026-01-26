import MessageBox from "sap/m/MessageBox";
import Controller from "sap/ui/core/mvc/Controller";
import AppComponent from "../Component";
import JSONModel from "sap/ui/model/json/JSONModel";
import { AdGuardData } from "../model/AdGuardTypes";
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
import SettingsService from "../service/SettingsService";
import GeminiService from "../service/GeminiService";
import { LogEntry } from "../model/AdGuardTypes";

/**
 * @namespace ui5.aghd.controller
 */
export default class Logs extends Controller {
	public formatter = formatter;
	private _isCtrlPressed: boolean = false;
	private _pViewSettingsDialog: Promise<Dialog> | undefined;
	private _pSettingsDialog: Promise<Dialog> | undefined;
	private _pInsightsDialog: Promise<Dialog> | undefined;

	public onInit(): void {
		// apply content density mode to root view
		const view = this.getView();
		if (view) {
			view.addStyleClass((this.getOwnerComponent() as AppComponent).getContentDensityClass());

			// Initialize Model with Pagination Defaults
			const model = new JSONModel({
				data: [],
				limit: 50,
				offset: 0,
				hasPrevious: false,
				limitOptions: [
					{ key: 10, text: "10 items" },
					{ key: 50, text: "50 items" },
					{ key: 100, text: "100 items" },
					{ key: 500, text: "500 items" }
				]
			});
			view.setModel(model);
		}

		const router = UIComponent.getRouterFor(this);
		router.getRoute("logs")?.attachPatternMatched(this.onRouteMatched, this);

		// "Trick": Global key listener to track Ctrl key for multi-sort
		window.addEventListener("keydown", (e) => {
			if (e.key === "Control") this._isCtrlPressed = true;
		});
		window.addEventListener("keyup", (e) => {
			if (e.key === "Control") this._isCtrlPressed = false;
		});
	}

	public onRouteMatched(event: Event): void {
		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;

		const args = (event as any).getParameter("arguments");
		const query = args["?query"];

		if (query && query.status === "Blocked") {
			model.setProperty("/filterStatus", "filtered");
			model.setProperty("/offset", 0);
		} else {
			model.setProperty("/filterStatus", "");
			model.setProperty("/offset", 0);
		}

		this.onRefreshLogs();
	}


	public async onRefreshLogs(): Promise<void> {
		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;

		const limit = model.getProperty("/limit") || 50;
		const offset = model.getProperty("/offset") || 0;
		const filterStatus = model.getProperty("/filterStatus") || "";

		view.setBusy(true);

		try {
			const data = await AdGuardService.getInstance().getQueryLog(limit, offset, filterStatus);

			// Transform ISO date strings to JS Date objects for the DateTime type
			const processedData = data.data.map(item => ({
				...item,
				time: new Date(item.time),
				elapsedMs: parseFloat(item.elapsedMs)
			}));

			model.setProperty("/data", processedData);

			// Update Pagination State
			model.setProperty("/hasPrevious", offset > 0);

		} catch (error) {
			MessageBox.error((error as Error).message);
		} finally {
			view.setBusy(false);
		}
	}

	public onPageNext(): void {
		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;

		const limit = model.getProperty("/limit");
		const currentOffset = model.getProperty("/offset");

		model.setProperty("/offset", currentOffset + limit);
		this.onRefreshLogs();
	}

	public onPagePrevious(): void {
		const view = this.getView();
		if (!view) return;
		const model = view.getModel() as JSONModel;

		const limit = model.getProperty("/limit");
		const currentOffset = model.getProperty("/offset");

		const newOffset = Math.max(0, currentOffset - limit);
		model.setProperty("/offset", newOffset);
		this.onRefreshLogs();
	}

	public onSearch(event: Event): void {
		const query = (event.getSource() as SearchField).getValue();
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
			const table = view.byId("logsTable") as any;
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

		const table = view.byId("logsTable") as any;
		const binding = table.getBinding("items") as ListBinding;
		const params = (event as any).getParameters();

		const sortPath = params.sortItem ? params.sortItem.getKey() : null;
		const sortDescending = params.sortDescending;

		if (sortPath) {
			this._aSorters.push(new Sorter(sortPath, sortDescending, false));
		}

		binding.sort(this._aSorters);

		// ... Filters logic remains same ...
		const dialogFilters: Filter[] = [];
		if (params.filterItems) {
			params.filterItems.forEach((item: any) => {
				const key = item.getKey();
				dialogFilters.push(new Filter("status", FilterOperator.EQ, key));
			});
		}
		binding.filter(dialogFilters);
	}



	public onSort(event: Event): void {
		// ...
		const source = event.getSource() as Button;
		const key = source.getCustomData()[0].getValue(); // "time", "client", etc.

		// Trick: UI5 often keeps the last event or we can try to access logic.
		// Since we cannot easily get the event object's modifier from 'press', 
		// we will assume a standard single sort unless we can prove otherwise. 
		// HOWEVER, we can stick a quick 'click' delegate on the buttons in onInit to capture this.
		// For now, let's implement the logic assuming we have 'isCtrlPressed'.

		// Hack to detect Ctrl Key:
		// We can't easily get it here. 
		// Let's use a simpler heuristic or just implement the logic for now, 
		// I will add the delegate in onInit to set a flag on the controller.

		const isCtrlPressed = this._isCtrlPressed === true;

		const currentDesc = source.getIcon() === "sap-icon://sort-descending";
		const newDesc = !currentDesc;

		source.setIcon(newDesc ? "sap-icon://sort-descending" : "sap-icon://sort-ascending");

		// Update Sorter Stack
		if (!isCtrlPressed) {
			this._aSorters = []; // Clear stack if Ctrl not held

			// Reset icons on other columns (Visual cleanup)
			this.resetColumnIcons(source);
		}

		// Remove existing sorter for this key if present (to re-add at end or flip)
		this._aSorters = this._aSorters.filter(s => s.getPath() !== key);

		// Add new sorter
		this._aSorters.push(new Sorter(key, newDesc, false));

		// Apply Binding
		const view = this.getView();
		if (view) {
			const table = view.byId("logsTable") as any;
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
		const table = view.byId("logsTable") as any;
		table.getColumns().forEach((col: Column) => {
			const header = col.getHeader();
			if (header && header !== activeButton && (header as any).setIcon) {
				(header as any).setIcon(""); // Clear icon
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
			} catch (e) {
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
		const apiKey = model.getProperty("/apiKey");
		const selectedModel = model.getProperty("/selectedModel");

		SettingsService.getInstance().setApiKey(apiKey);
		const systemContext = model.getProperty("/systemContext");
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
			this.onOpenSettings();
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

			// Format Markdown to HTML (simple conversion or use a library if available, 
			// for now we'll do a very basic replacement for bold and newlines for the FormattedText control)
			let html = insights
				.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
				.replace(/\n/g, "<br/>"); // Newlines

			model.setProperty("/analysisHtml", html);
			this.onOpenInsights();
		} catch (error) {
			MessageBox.error((error as Error).message);
		} finally {
			view.setBusy(false);
		}
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