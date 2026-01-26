import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import UIComponent from "sap/ui/core/UIComponent";
import AdGuardService from "../service/AdGuardService";
import formatter from "../model/formatter";
import MessageBox from "sap/m/MessageBox";

export default class Dashboard extends Controller {
    public formatter = formatter;

    public onInit(): void {
        this.getView()?.setModel(new JSONModel());
        this.onRefreshStats();
    }

    public async onRefreshStats(): Promise<void> {
        const model = this.getView()?.getModel() as JSONModel;
        if (!model) return;

        this.getView()?.setBusy(true);

        try {
            const data = await AdGuardService.getInstance().getStats();
            const slowest = await AdGuardService.getInstance().getSlowestQueries(1000);

            model.setData({
                ...data,
                slowest_queries: slowest
            });
        } catch (error) {
            if ((error as Error).message === "Unauthorized") {
                UIComponent.getRouterFor(this).navTo("login");
                return;
            }
            MessageBox.error((error as Error).message);
            console.error("Failed to fetch stats", error); // Kept console.error for debugging
        } finally {
            this.getView()?.setBusy(false);
        }
    }

    public onPressLogs(): void {
        const router = UIComponent.getRouterFor(this);
        router.navTo("logs");
    }

    public onPressBlockedLogs(): void {
        const router = UIComponent.getRouterFor(this);
        router.navTo("logs", {
            query: {
                status: "Blocked"
            }
        });
    }
}
