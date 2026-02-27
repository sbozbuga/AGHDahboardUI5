import SettingsService from "./SettingsService";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import BaseApiService from "./BaseApiService";
import { Constants } from "../model/Constants";

/**
 * Service for handling AdGuard Home Authentication.
 * Parses the base URL safely, manages login endpoints, and handles session expiration gracefully with popups.
 * @namespace ui5.aghd.service
 */
export default class AuthService extends BaseApiService {
    private static instance: AuthService;

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    private _isSafeUrl(url: string): boolean {
        try {
            // Handle relative URLs
            if (url.startsWith("/")) {
                // Ensure it's not a protocol-relative URL (e.g., //attacker.com)
                return !url.startsWith("//");
            }

            const urlObj = new URL(url);
            const hostname = urlObj.hostname;

            // Check if same origin
            if (hostname === window.location.hostname) {
                return true;
            }

            // Check localhost
            if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
                return true;
            }

            // Check private IPs (IPv4)
            const parts = hostname.split(".").map(Number);
            if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
                if (parts[0] === 10) return true;
                if (parts[0] === 192 && parts[1] === 168) return true;
                if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
            }

            return false;
        } catch {
            return false;
        }
    }

    /**
     * Overrides BaseApiService's _handleSessionExpiration to open a custom login popup.
     */
    protected _handleSessionExpiration(): void {
        const baseUrl = SettingsService.getInstance().getBaseUrl();

        if (!baseUrl) {
            super._handleSessionExpiration();
            return;
        }

        if (this._isLoginDialogOpen) return;
        this._isLoginDialogOpen = true;

        const logInText = this._getText("logIn");

        MessageBox.warning(this._getText("sessionExpired"), {
            actions: [logInText, MessageBox.Action.CANCEL],
            onClose: (sAction: string | null) => {
                if (sAction === logInText) {
                    this._openLoginPopup();
                } else {
                    this._isLoginDialogOpen = false;
                }
            }
        });
    }

    private _openLoginPopup(): void {
        const width = 1000;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const baseUrl = SettingsService.getInstance().getBaseUrl();
        const targetUrl = baseUrl || "/";

        // Security: Defense in Depth - Ensure targetUrl is safe before opening
        try {
            if (targetUrl.startsWith("/")) {
                if (targetUrl.startsWith("//")) {
                    throw new Error("Protocol-relative URLs are not allowed");
                }
            } else {
                const parsed = new URL(targetUrl);
                if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                    throw new Error("Unsafe Protocol");
                }
            }
        } catch {
            MessageBox.error(this._getText("unsafeBaseUrl"));
            this._isLoginDialogOpen = false;
            return;
        }

        const performOpen = () => {
            const popup = window.open(
                targetUrl,
                "agh_login",
                `width=${width},height=${height},top=${top},left=${left},resizable,scrollbars,noopener,noreferrer`
            );

            if (!popup) {
                MessageBox.error(this._getText("popupBlocked"));
                this._isLoginDialogOpen = false;
                return;
            }

            // Since we can't easily check auth status from another window due to CORS,
            // we will poll the server for stats. If we get stats, auth is successful.
            const pollInterval = setInterval(() => {
                void (async () => {
                    if (popup.closed) {
                        clearInterval(pollInterval);
                        this._isLoginDialogOpen = false;
                        return;
                    }

                    try {
                        const response = await fetch(baseUrl ? `${baseUrl}/control/status` : "/control/status", {
                            credentials: baseUrl ? "include" : "same-origin"
                        });

                        if (response.ok) {
                            clearInterval(pollInterval);
                            popup.close();
                            this._isLoginDialogOpen = false;
                            MessageToast.show(this._getText("loginSuccessful"));
                            setTimeout(() => window.location.reload(), 1000);
                        }
                    } catch {
                        // Still unauthorized or net error, let interval continue
                    }
                })();
            }, 2000);
        };

        if (this._isSafeUrl(targetUrl)) {
            performOpen();
        } else {
            MessageBox.confirm(this._getText("externalUrlWarning", [targetUrl]), {
                onClose: (sAction: string | null) => {
                    if (sAction === MessageBox.Action.OK) {
                        performOpen();
                    } else {
                        this._isLoginDialogOpen = false;
                    }
                }
            });
        }
    }

    public async login(name: string, password: string): Promise<void> {
        await this._request(Constants.ApiEndpoints.Login, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, password })
        });
    }

    public async logout(): Promise<void> {
        try {
            await this._request(Constants.ApiEndpoints.Logout, {
                method: "POST"
            });
        } catch (error) {
            console.warn("Server logout failed, clearing local credentials anyway", error);
        } finally {
            SettingsService.getInstance().clearCredentials();
        }
    }
}
