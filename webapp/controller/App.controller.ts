import BaseController from "./BaseController";

/**
 * @namespace ui5.aghd.controller
 */
export default class App extends BaseController {
    public onInit(): void {
        const eventBus = sap.ui.getCore().getEventBus();
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
        eventBus.subscribe("ui5.aghd", "openSettings", this.onOpenSettings, this);
    }

    public onExit(): void {
        const eventBus = sap.ui.getCore().getEventBus();
        // eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
        eventBus.unsubscribe("ui5.aghd", "openSettings", this.onOpenSettings, this);
        super.onExit();
    }

    private _handleOpenSettings(): void {
        void this.onOpenSettings();
    }
}
