import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import AdGuardService from "../service/AdGuardService";
import MessageBox from "sap/m/MessageBox";
import UIComponent from "sap/ui/core/UIComponent";
import Input from "sap/m/Input";
import { ValueState } from "sap/ui/core/library";
import { InputType } from "sap/m/library";
import Event from "sap/ui/base/Event";

/**
 * @namespace ui5.aghd.controller
 */
export default class Login extends Controller {

    public onInit(): void {
        const model = new JSONModel({
            username: "",
            password: ""
        });
        this.getView()?.setModel(model);
    }

    public onAfterRendering(): void {
        const view = this.getView();
        if (view) {
            const usernameInput = view.byId("usernameInput") as Input;
            if (usernameInput) {
                usernameInput.focus();
            }
        }
    }

    public onInputChange(event: Event): void {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const input = event.getSource() as Input;
        if (input.getValueState() === ValueState.Error) {
            input.setValueState(ValueState.None);
            input.setValueStateText("");
        }
    }

    public onShowPassword(event: Event): void {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const input = event.getSource() as Input;
        if (input.getType() === InputType.Password) {
            input.setType(InputType.Text);
            input.setValueHelpIconSrc("sap-icon://hide");
        } else {
            input.setType(InputType.Password);
            input.setValueHelpIconSrc("sap-icon://show");
        }
    }

    public async onLoginPress(): Promise<void> {
        const view = this.getView();
        if (!view) return;

        const model = view.getModel() as JSONModel;
        const username = model.getProperty("/username") as string;
        const password = model.getProperty("/password") as string;

        const usernameInput = view.byId("usernameInput") as Input;
        const passwordInput = view.byId("passwordInput") as Input;
        let bValidationError = false;

        if (!username) {
            usernameInput.setValueState(ValueState.Error);
            usernameInput.setValueStateText("Username is required");
            bValidationError = true;
        } else {
            usernameInput.setValueState(ValueState.None);
        }

        if (!password) {
            passwordInput.setValueState(ValueState.Error);
            passwordInput.setValueStateText("Password is required");
            bValidationError = true;
        } else {
            passwordInput.setValueState(ValueState.None);
        }

        if (bValidationError) {
            return;
        }

        view.setBusy(true);

        try {
            await AdGuardService.getInstance().login(username, password);

            // Navigate to Dashboard on success
            const router = UIComponent.getRouterFor(this);
            router.navTo("dashboard");

            // Clear password
            model.setProperty("/password", "");

        } catch {
            MessageBox.error("Login failed. Please check your credentials.");
        } finally {
            view.setBusy(false);
        }
    }
}
