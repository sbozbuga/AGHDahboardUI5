import BaseController from "./BaseController";
import UIComponent from "sap/ui/core/UIComponent";

/**
 * @namespace ui5.aghd.controller
 */
export default class App extends BaseController {
    public onInit(): void {
        const eventBus = sap.ui.getCore().getEventBus();
        eventBus.subscribe("ui5.aghd", "openSettings", this.onOpenSettings, this);
    }

    public onExit(): void {
        const eventBus = sap.ui.getCore().getEventBus();
        eventBus.unsubscribe("ui5.aghd", "openSettings", this.onOpenSettings, this);
        super.onExit();
    }
}
