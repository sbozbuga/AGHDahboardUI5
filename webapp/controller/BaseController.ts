import Controller from "sap/ui/core/mvc/Controller";
import Dialog from "sap/m/Dialog";
import View from "sap/ui/core/mvc/View";
import AppComponent from "../Component";
import { Constants } from "../model/Constants";
import SettingsService from "../service/SettingsService";
import GeminiService from "../service/GeminiService";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import Input from "sap/m/Input";
import { InputType } from "sap/m/library";
import Event from "sap/ui/base/Event";
import formatter from "../model/formatter";

/**
 * @namespace ui5.aghd.controller
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

        try {
            SettingsService.getInstance().setApiKey(apiKey);
            const systemContext = model.getProperty("/systemContext") as string;
            SettingsService.getInstance().setSystemContext(systemContext);

            if (selectedModel) {
                SettingsService.getInstance().setModel(selectedModel);
            }

            SettingsService.getInstance().setBaseUrl(baseUrl);

            (view.byId("settingsDialog") as Dialog).close();
            MessageBox.success("Settings saved successfully. The application will now reload.", {
                onClose: () => {
                    window.location.reload();
                }
            });
        } catch (error) {
            MessageBox.error((error as Error).message);
        }
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

    /**
     * Copies text to clipboard with a fallback for non-secure contexts.
     * @param text The text to copy
     * @param successMessage The message to show on success
     */
    protected copyToClipboard(text: string, successMessage: string): void {
        if (!text) return;

        // Navigator clipboard requires Secure Context (HTTPS/localhost)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                MessageToast.show(successMessage);
            }).catch((err) => {
                console.warn("Clipboard API failed, falling back to execCommand", err);
                this.fallbackCopy(text, successMessage);
            });
        } else {
            this.fallbackCopy(text, successMessage);
        }
    }

    /**
     * Fallback for copying to clipboard using a hidden textarea and execCommand.
     */
    protected fallbackCopy(text: string, successMessage: string): void {
        const textArea = document.createElement("textarea");
        textArea.value = text;

        // Ensure it's not visible but part of the DOM
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        try {
            // execCommand is deprecated but widely supported as fallback
            const successful = document.execCommand("copy");
            if (successful) {
                MessageToast.show(successMessage);
            } else {
                MessageBox.error("Clipboard access not available. Please copy manually: " + text);
            }
        } catch (err) {
            console.error("Fallback copy failed", err);
            MessageBox.error("Clipboard access not available. Please copy manually: " + text);
        }

        document.body.removeChild(textArea);
    }
}
