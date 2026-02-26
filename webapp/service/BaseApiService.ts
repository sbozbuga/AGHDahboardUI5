import SettingsService from "./SettingsService";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import MessageBox from "sap/m/MessageBox";

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
export default class BaseApiService {
    protected _resourceBundle: ResourceBundle | null = null;
    protected _isLoginDialogOpen = false;
    protected static readonly REQUEST_TIMEOUT = 10000;

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
            ...options,
            signal: controller.signal
        };

        if (baseUrl) {
            config.credentials = "include";
        }

        try {
            const response = await fetch(targetUrl, config);

            if (response.status === 401) {
                this._handleSessionExpiration();
                throw new ApiError(this._getText("unauthorized"), 401);
            }

            if (!response.ok) {
                throw new ApiError(this._getText("requestFailed", [response.statusText]), response.status);
            }

            const text = await response.text();
            try {
                return text ? (JSON.parse(text) as T) : ({} as T);
            } catch (error) {
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

    // A hook for subclasses like AuthService to override with popup logic
    protected _handleSessionExpiration(): void {
        // Default behavior: Emit an event that App Controller listens to to open settings
        // if no connection url is defined.
        if (this._isLoginDialogOpen) return;

        const baseUrl = SettingsService.getInstance().getBaseUrl();
        const openSettingsText = this._getText("openSettings");

        if (!baseUrl) {
            this._isLoginDialogOpen = true;
            MessageBox.warning(this._getText("connectionFailed"), {
                actions: [openSettingsText, MessageBox.Action.CANCEL],
                onClose: (sAction: string | null) => {
                    this._isLoginDialogOpen = false;
                    if (sAction === openSettingsText) {
                        const bus = sap.ui.getCore().getEventBus();
                        bus.publish("ui5.aghd", "openSettings");
                    }
                }
            });
        }
    }
}
