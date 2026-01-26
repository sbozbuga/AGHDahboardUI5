import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import AdGuardService from "../service/AdGuardService";
import MessageBox from "sap/m/MessageBox";
import UIComponent from "sap/ui/core/UIComponent";

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

    public async onLoginPress(): Promise<void> {
        const view = this.getView();
        if (!view) return;

        const model = view.getModel() as JSONModel;
        const username = model.getProperty("/username") as string;
        const password = model.getProperty("/password") as string;

        if (!username || !password) {
            MessageBox.error("Please enter both username and password.");
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
