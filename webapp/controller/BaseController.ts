import Controller from "sap/ui/core/mvc/Controller";
import Dialog from "sap/m/Dialog";
import View from "sap/ui/core/mvc/View";
import AppComponent from "../Component";
import { Constants } from "../model/Constants";
import SettingsService from "../service/SettingsService";
import GeminiService from "../service/GeminiService";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import Input from "sap/m/Input";
import { InputType } from "sap/m/library";
import Event from "sap/ui/base/Event";
import formatter from "../model/formatter";

/**
 * Base Controller with shared logic (Settings, Dialogs, etc.)
 */
export default class BaseController extends Controller {
    public formatter = formatter;
    protected _mDialogs: Map<string, Promise<Dialog>> = new Map();

    public onExit(): void {
        this._mDialogs.clear();
    }

    /**
     * Generic helper to load and cache dialogs
     */
    protected async _openDialog(fragmentName: string): Promise<Dialog> {
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

    /* =========================================================== */
    /* Settings Dialog Logic                                       */
    /* =========================================================== */

    public async onOpenSettings(): Promise<void> {
        const dialog = await this._openDialog(Constants.Fragments.SettingsDialog);

        const view = this.getView() as View;
        if (!view) return;

        const apiKey = SettingsService.getInstance().getApiKey();
        const currentModel = SettingsService.getInstance().getModel();
        const baseUrl = SettingsService.getInstance().getBaseUrl();

        // Ensure model exists or create a temporary one for the dialog if the view doesn't have one
        // Ideally, the view should have a model. We'll use the view's default model.
        let model = view.getModel() as JSONModel;
        if (!model) {
            model = new JSONModel();
            view.setModel(model);
        }

        model.setProperty("/apiKey", apiKey);
        model.setProperty("/selectedModel", currentModel);
        model.setProperty("/baseUrl", baseUrl);
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
        const baseUrl = model.getProperty("/baseUrl") as string;

        SettingsService.getInstance().setApiKey(apiKey);
        const systemContext = model.getProperty("/systemContext") as string;
        SettingsService.getInstance().setSystemContext(systemContext);

        if (selectedModel) {
            SettingsService.getInstance().setModel(selectedModel);
        }

        SettingsService.getInstance().setBaseUrl(baseUrl);

        (view.byId("settingsDialog") as Dialog).close();
        MessageBox.success("Settings saved successfully.");
    }

    public onCancelSettings(): void {
        const view = this.getView();
        if (!view) return;
        (view.byId("settingsDialog") as Dialog).close();
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
}
