import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import UIComponent from "sap/ui/core/UIComponent";
import AdGuardService from "../service/AdGuardService";
import formatter from "../model/formatter";
import MessageBox from "sap/m/MessageBox";

export default class Dashboard extends Controller {
    public formatter = formatter;
    private _timer: ReturnType<typeof setInterval> | undefined;
    private _lastLatestTime: string | undefined;
    private static readonly REFRESH_INTERVAL = 15000;

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
                AdGuardService.getInstance().getQueryLog(1, 0, undefined, true)
            ]);

            const latestTime = latestLog.data.length > 0 ? latestLog.data[0].time : undefined;
            const currentData = model.getData() as Record<string, unknown>;
            let slowest = currentData.slowest_queries || [];

            // Only fetch heavy slowest queries if new data arrived (or first run)
            if (latestTime !== this._lastLatestTime || !this._lastLatestTime) {
                slowest = await AdGuardService.getInstance().getSlowestQueries(1000);
                this._lastLatestTime = latestTime;
            }

            model.setData({
                ...stats,
                slowest_queries: slowest
            });
        } catch (error) {
            if ((error as Error).message === "Unauthorized") {
                // Stop timer on auth error to prevent endless loops
                if (this._timer) clearInterval(this._timer);
                UIComponent.getRouterFor(this).navTo("login");
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

    public onLogoutPress(): void {
        AdGuardService.getInstance().logout();
        UIComponent.getRouterFor(this).navTo("login");
        MessageBox.success("Logged out successfully.");
    }
}
