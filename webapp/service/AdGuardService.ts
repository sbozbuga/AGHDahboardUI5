import { AdGuardData, RawAdGuardData, AdGuardStats, RawAdGuardStats, StatsEntry, LogEntry } from "../model/AdGuardTypes";
import { Constants } from "../model/Constants";
import SettingsService from "./SettingsService";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import ResourceBundle from "sap/base/i18n/ResourceBundle";

/**
 * Service for interacting with AdGuard Home API
 * @namespace ui5.aghd.service
 */
export default class AdGuardService {

    private static instance: AdGuardService;
    private _isLoginDialogOpen = false;
    private _resourceBundle: ResourceBundle | null = null;

    public static getInstance(): AdGuardService {
        if (!AdGuardService.instance) {
            AdGuardService.instance = new AdGuardService();
        }
        return AdGuardService.instance;
    }

    public setResourceBundle(bundle: ResourceBundle): void {
        this._resourceBundle = bundle;
    }

    public clearCache(): void {
        this._slowestQueriesCache = null;
        this._slowestQueriesCacheTime = 0;
        this._slowestQueriesCacheDepth = 0;
    }

    private _getText(key: string, args: string[] = []): string {
        if (this._resourceBundle) {
            return this._resourceBundle.getText(key, args) || key;
        }
        return key; // Fallback to key if bundle not loaded
    }

    private static readonly DEFAULT_SCAN_DEPTH = 1000;
    private static readonly TOP_LIST_LIMIT = 10;
    private static readonly REQUEST_TIMEOUT = 10000;
    private static readonly SLOWEST_QUERY_CACHE_DURATION = 60000;
    private _slowestQueriesCache: { domain: string; elapsedMs: number; client: string; reason: string; occurrences: number[]; }[] | null = null;
    private _slowestQueriesCacheTime: number = 0;
    private _slowestQueriesCacheDepth: number = 0;

    /**
     * Generic wrapper for API requests
     */
    private async _request<T>(url: string, options?: RequestInit): Promise<T> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AdGuardService.REQUEST_TIMEOUT);

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
                throw new Error(this._getText("unauthorized"));
            }

            if (!response.ok) {
                throw new Error(this._getText("requestFailed", [response.statusText]));
            }

            const text = await response.text();
            try {
                return text ? (JSON.parse(text) as T) : ({} as T);
            } catch (error) {
                throw new Error(this._getText("invalidResponseFormat"), { cause: error });
            }
        } catch (error) {
            if ((error as Error).name === "AbortError") {
                throw new Error(this._getText("requestTimedOut"), { cause: error });
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
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
            // 10.0.0.0 - 10.255.255.255
            // 172.16.0.0 - 172.31.255.255
            // 192.168.0.0 - 192.168.255.255
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

    private _handleSessionExpiration(): void {
        if (this._isLoginDialogOpen) {
            return;
        }

        const baseUrl = SettingsService.getInstance().getBaseUrl();
        const openSettingsText = this._getText("openSettings");
        const logInText = this._getText("logIn");

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
            return;
        }

        this._isLoginDialogOpen = true;

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
            // If it's a relative URL (starts with /), it's safe (same origin)
            if (targetUrl.startsWith("/")) {
                if (targetUrl.startsWith("//")) {
                    throw new Error("Protocol-relative URLs are not allowed");
                }
                // Safe
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

            const pollInterval = setInterval(() => {
                void (async () => {
                    if (popup.closed) {
                        clearInterval(pollInterval);
                        this._isLoginDialogOpen = false;
                        return;
                    }

                    try {
                        await this.getStats();
                        clearInterval(pollInterval);
                        popup.close();
                        this._isLoginDialogOpen = false;
                        MessageToast.show(this._getText("loginSuccessful"));
                        setTimeout(() => window.location.reload(), 1000);
                    } catch {
                        // Still unauthorized
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

    public logout(): void {
        SettingsService.getInstance().clearCredentials();
    }

    public async getStats(): Promise<AdGuardStats> {
        const rawData = await this._request<RawAdGuardStats>(Constants.ApiEndpoints.Stats);

        const block_percentage = rawData.num_dns_queries > 0
            ? (rawData.num_blocked_filtering / rawData.num_dns_queries) * 100
            : 0;

        return {
            num_dns_queries: rawData.num_dns_queries,
            num_blocked_filtering: rawData.num_blocked_filtering,
            avg_processing_time: Math.round(rawData.avg_processing_time * 1000 * 100) / 100,
            block_percentage: Math.round(block_percentage * 100) / 100,
            top_queried_domains: this.transformList(rawData.top_queried_domains, "domain", AdGuardService.TOP_LIST_LIMIT),
            top_blocked_domains: this.transformList(rawData.top_blocked_domains, "domain", AdGuardService.TOP_LIST_LIMIT),
            top_clients: this.transformList(rawData.top_clients, "ip", AdGuardService.TOP_LIST_LIMIT)
        };
    }

    public async getQueryLog(limit: number, offset: number, filterStatus?: string): Promise<AdGuardData> {
        const data = await this._fetchRawQueryLog(limit, offset, filterStatus);
        const processedList = data.data as unknown as LogEntry[];

        for (const entry of processedList) {
            const rawElapsed = (entry as unknown as { elapsedMs: number | string }).elapsedMs;

            const elapsedMs = typeof rawElapsed === "number" ? rawElapsed : (parseFloat(rawElapsed) || 0);
            const isBlocked = (entry.reason && entry.reason.startsWith("Filtered")) ||
                (entry.reason === "SafeBrowsing");

            // entry.time is already a string from the API response
            // optimization: parsing is deferred to the formatter
            entry.elapsedMs = elapsedMs;
            entry.blocked = isBlocked;
        }

        return { data: processedList };
    }

    private async _fetchRawQueryLog(limit: number, offset: number, filterStatus?: string): Promise<RawAdGuardData> {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString()
        });

        if (filterStatus) {
            params.append("response_status", filterStatus);
        }

        const url = `${Constants.ApiEndpoints.QueryLog}?${params.toString()}`;
        return await this._request<RawAdGuardData>(url);
    }

    private _updateTopOccurrences(occurrences: number[], val: number): void {
        const limit = 5;
        let i = 0;
        while (i < occurrences.length && val <= occurrences[i]) {
            i++;
        }

        if (i < limit) {
            occurrences.splice(i, 0, val);
            if (occurrences.length > limit) {
                occurrences.pop();
            }
        }
    }

    public async getSlowestQueries(scanDepth: number = AdGuardService.DEFAULT_SCAN_DEPTH): Promise<{ domain: string; elapsedMs: number; client: string; reason: string; occurrences: number[]; }[]> {
        // Cache Optimization: Check if we have a valid cache entry
        if (this._slowestQueriesCache &&
            (Date.now() - this._slowestQueriesCacheTime < AdGuardService.SLOWEST_QUERY_CACHE_DURATION) &&
            this._slowestQueriesCacheDepth === scanDepth) {
            return this._slowestQueriesCache;
        }

        try {
            const data = await this._fetchRawQueryLog(scanDepth, 0);

            const domainMap = new Map<string, { domain: string; elapsedMs: number; client: string; reason: string; occurrences: number[] }>();

            for (const e of data.data) {
                const rawElapsed = e.elapsedMs;
                const val = typeof rawElapsed === "number" ? rawElapsed : (parseFloat(rawElapsed as unknown as string) || 0);

                if (val <= 0) continue;

                const domainName = e.question.name;
                const existing = domainMap.get(domainName);

                if (existing) {
                    this._updateTopOccurrences(existing.occurrences, val);
                    if (val > existing.elapsedMs) {
                        existing.elapsedMs = val;
                        existing.client = e.client;
                        existing.reason = e.reason;
                    }
                } else {
                    domainMap.set(domainName, {
                        domain: domainName,
                        elapsedMs: val,
                        client: e.client,
                        reason: e.reason,
                        occurrences: [val]
                    });
                }
            }

            const top10: { domain: string; elapsedMs: number; client: string; reason: string; occurrences: number[] }[] = [];
            const limit = 10;

            for (const item of domainMap.values()) {
                // Optimization: Early exit if item is smaller than the smallest in top10
                if (top10.length === limit && item.elapsedMs <= top10[limit - 1].elapsedMs) {
                    continue;
                }

                let i = 0;
                while (i < top10.length && item.elapsedMs <= top10[i].elapsedMs) {
                    i++;
                }

                if (i < limit) {
                    top10.splice(i, 0, item);
                    if (top10.length > limit) {
                        top10.pop();
                    }
                }
            }

            // Update Cache
            this._slowestQueriesCache = top10;
            this._slowestQueriesCacheTime = Date.now();
            this._slowestQueriesCacheDepth = scanDepth;

            return top10;
        } catch (error) {
            console.error("Failed to fetch slowest queries", error);
            return [];
        }
    }

    /**
     * Transforms API response list into uniform StatsEntry array.
     * Enforces type safety and avoids loose loops.
     */
    private transformList(list: unknown, preferredKey: string, limit?: number): StatsEntry[] {
        if (!Array.isArray(list)) {
            // Handle Map-like object { "domain": 123 }
            if (typeof list === 'object' && list !== null) {
                const entries = Object.entries(list as Record<string, unknown>);
                const sliced = limit ? entries.slice(0, limit) : entries;
                return sliced.map(([k, v]) => ({
                    name: k,
                    count: typeof v === 'number' ? v : Number(v) || 0
                }));
            }
            return [];
        }

        // Optimization: Single pass loop with pre-allocation to avoid intermediate array creation (slice)
        // and reduce function call overhead (map). Significant for high-frequency polling.
        const arr = list as unknown[];
        const len = arr.length;
        const count = limit && len > limit ? limit : len;
        const result = new Array<StatsEntry>(count);

        for (let i = 0; i < count; i++) {
            const item = arr[i];
            let entry: StatsEntry;

            // Strict check for known object shapes
            if (typeof item !== 'object' || item === null) {
                entry = { name: "Unknown", count: 0 };
            } else {
                const obj = item as Record<string, unknown>;
                const cnt = typeof obj.count === 'number' ? obj.count : Number(obj.count) || 0;

                // Try preferred key first (e.g., 'domain' or 'ip')
                // Use type assertion to ensure TypeScript knows we're accessing a string
                const preferredVal = obj[preferredKey];
                if (typeof preferredVal === 'string' && preferredVal) {
                    entry = { name: preferredVal, count: cnt };
                }
                // Fallbacks for common keys if preferred key is missing or different
                else if (typeof obj.name === 'string' && obj.name) {
                    entry = { name: obj.name, count: cnt };
                } else if (typeof obj.domain === 'string' && obj.domain) {
                    entry = { name: obj.domain, count: cnt };
                } else if (typeof obj.ip === 'string' && obj.ip) {
                    entry = { name: obj.ip, count: cnt };
                } else {
                    // Fallback for key-value pair object inside array (uncommon but possible in some legacy APIs)
                    // e.g. [{ "192.168.1.1": 123 }, ...]
                    const keys = Object.keys(obj);
                    if (keys.length === 1) {
                        const key = keys[0];
                        const val = obj[key];
                        if (typeof val === 'number') {
                            entry = { name: key, count: val };
                        } else {
                            entry = { name: "Unknown", count: cnt };
                        }
                    } else {
                        entry = { name: "Unknown", count: cnt };
                    }
                }
            }
            result[i] = entry;
        }

        return result;
    }
}
