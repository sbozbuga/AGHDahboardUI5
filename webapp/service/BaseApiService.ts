import SettingsService from "./SettingsService";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import UI5Object from "sap/ui/base/Object";
import EventBus from "sap/ui/core/EventBus";

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status?: number,
		public readonly code?: string
	) {
		super(message);
		this.name = "ApiError";
	}
}

/**
 * Base service for executing API requests with common logic
 * like timeout handling, base URL resolution, and error parsing.
 * @namespace ui5.aghd.service
 */
export default class BaseApiService extends UI5Object {
	protected _resourceBundle: ResourceBundle | null = null;
	protected static readonly REQUEST_TIMEOUT = 10000;
	protected static _eventBus: EventBus | null = null;

	public static setGlobalEventBus(bus: EventBus): void {
		BaseApiService._eventBus = bus;
	}

	public setResourceBundle(bundle: ResourceBundle): void {
		this._resourceBundle = bundle;
	}

	protected _getText(key: string, args: string[] = []): string {
		if (this._resourceBundle) {
			return this._resourceBundle.getText(key, args) || key;
		}
		return key;
	}

	/**
	 * Generic wrapper for API requests
	 */
	protected async _request<T>(url: string, options?: RequestInit): Promise<T> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), BaseApiService.REQUEST_TIMEOUT);

		const baseUrl = SettingsService.getInstance().getBaseUrl();
		let targetUrl = url;

		if (baseUrl) {
			// Remove leading slash from endpoint if base url has no trailing slash (guaranteed by setter)
			targetUrl = `${baseUrl}${url}`;
		}

		const config: RequestInit = {
			cache: "no-store", // Security Enhancement: Prevent caching of sensitive API data
			...options,
			signal: controller.signal
		};

		if (baseUrl) {
			config.credentials = "include";
		}

		try {
			const response = await fetch(targetUrl, config);

			if (!response.ok) {
				throw new ApiError(this._getText("requestFailed", [response.statusText]), response.status);
			}

			const text = await response.text();
			try {
				return text ? (JSON.parse(text) as T) : ({} as T);
			} catch {
				throw new ApiError(this._getText("invalidResponseFormat"));
			}
		} catch (error) {
			if ((error as Error).name === "AbortError") {
				throw new ApiError(this._getText("requestTimedOut"));
			}
			throw error;
		} finally {
			clearTimeout(timeoutId);
		}
	}
}
