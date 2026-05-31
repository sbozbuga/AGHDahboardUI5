import BaseController from "./BaseController";
import AppComponent from "../Component";

/**
 * @namespace ui5.aghd.controller
 */
export default class App extends BaseController {
	public onInit(): void {
		this.getView()?.addStyleClass((this.getOwnerComponent() as AppComponent).getContentDensityClass());

		const eventBus = this.getOwnerComponent()?.getEventBus();
		// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
		eventBus?.subscribe("ui5.aghd", "openSettings", this.onOpenSettings, this);
	}

	public onExit(): void {
		const eventBus = this.getOwnerComponent()?.getEventBus();
		// eslint-disable-next-line @typescript-eslint/no-misused-promises, @typescript-eslint/unbound-method
		eventBus?.unsubscribe("ui5.aghd", "openSettings", this.onOpenSettings, this);
		super.onExit();
	}

	private _handleOpenSettings(): void {
		void this.onOpenSettings();
	}
}
