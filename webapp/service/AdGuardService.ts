import { AdGuardData, RawAdGuardData, AdGuardStats, RawAdGuardStats, StatsEntry, LogEntry } from "../model/AdGuardTypes";
import { Constants } from "../model/Constants";
import SettingsService from "./SettingsService";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";

/**
 * Service for interacting with AdGuard Home API
 * @namespace ui5.aghd.service
 */
export default class AdGuardService {

    private static instance: AdGuardService;
    private _isLoginDialogOpen = false;

    public static getInstance(): AdGuardService {
        if (!AdGuardService.instance) {
            AdGuardService.instance = new AdGuardService();
        }
        return AdGuardService.instance;
    }

    private static readonly DEFAULT_SCAN_DEPTH = 1000;
    private static readonly TOP_LIST_LIMIT = 10;
    private static readonly REQUEST_TIMEOUT = 10000;

    /**
     * Generic wrapper for API requests
     */
    private async _request<T>(url: string, options?: RequestInit): Promise<T> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AdGuardService.REQUEST_TIMEOUT);

        // Construct full URL with Base URL if configured
        const baseUrl = SettingsService.getInstance().getBaseUrl();
        // If baseUrl is set, it might include a path. If set, we treat the input 'url' as relative to it.
        // However, 'url' from Constants usually starts with '/'.
        // We need to ensure correct concatenation.

        let targetUrl = url;
        if (baseUrl) {
            // Remove leading slash from endpoint if base url has no trailing slash (guaranteed by setter)
            // But actually, Constants endpoints are like "/control/stats".
            // If BaseUrl is "http://host/agh", we want "http://host/agh/control/stats".
            targetUrl = `${baseUrl}${url}`;
        }

        const config: RequestInit = {
            ...options,
            signal: controller.signal
        };

        // If using a custom Base URL (likely Cross-Origin), we must include credentials
        if (baseUrl) {
            config.credentials = "include";
        }

        try {
            const response = await fetch(targetUrl, config);

            if (response.status === 401) {
                this._handleSessionExpiration();
                throw new Error("Unauthorized");
            }

            if (!response.ok) {
                throw new Error(`Request failed: ${response.statusText}`);
            }

            // Handle empty bodies (e.g. login)
            const text = await response.text();
            try {
                return text ? (JSON.parse(text) as T) : ({} as T);
            } catch (error) {
                // If parsing fails (e.g., HTML error page), throw a generic error to avoid leaking implementation details
                throw new Error("Invalid response format from AdGuard Home API", { cause: error });
            }
        } catch (error) {
            if ((error as Error).name === "AbortError") {
                throw new Error("Request timed out", { cause: error });
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private _handleSessionExpiration(): void {
        if (this._isLoginDialogOpen) {
            return;
        }

        const baseUrl = SettingsService.getInstance().getBaseUrl();

        // Check if we likely need configuration (empty URL and unauthorized)
        // If baseUrl is empty, we are in Proxy mode. If that fails with 401, it usually means 
        // the proxy isn't authenticated or we really aren't logged in. 
        // But user asked: "if base url empty and auth is failing then open up the settings popup"

        if (!baseUrl) {
            this._isLoginDialogOpen = true;
            MessageBox.warning("Connection failed. Please configure the AdGuard Home Base URL.", {
                actions: ["Open Settings", MessageBox.Action.CANCEL],
                onClose: (sAction: string | null) => {
                    this._isLoginDialogOpen = false;
                    if (sAction === "Open Settings") {
                        // Publish event to open settings
                        const bus = sap.ui.getCore().getEventBus();
                        bus.publish("ui5.aghd", "openSettings");
                    }
                }
            });
            return;
        }

        this._isLoginDialogOpen = true;

        MessageBox.warning("Session expired. Please log in to AdGuard Home.", {
            actions: ["Log In", MessageBox.Action.CANCEL],
            onClose: (sAction: string | null) => {
                if (sAction === "Log In") {
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
        // If baseUrl is set, open that (it's the root of AGH).
        // If not set, we default to "/" because we are serving from the same host (Proxy), 
        // and usually AGH is at root or we are conducting a relative nav.
        // Actually, if we are at /dashboard/index.html, opening "/" goes to root.
        // If user wants specific login path, they can put it in Base URL? 
        // No, Base URL is for API. Login is usually at root or /login.html.
        // Let's assume opening the Base URL is the safest bet to get to the dashboard/login page.
        // If empty, we try "/".

        const targetUrl = baseUrl || "/";

        // Security: Defense in Depth - Ensure targetUrl is safe before opening
        if (targetUrl !== "/" && !targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            MessageBox.error("Blocked unsafe Base URL configuration.");
            this._isLoginDialogOpen = false;
            return;
        }

        const popup = window.open(
            targetUrl,
            "agh_login",
            `width=${width},height=${height},top=${top},left=${left},resizable,scrollbars`
        );

        if (!popup) {
            MessageBox.error("Popup blocked. Please allow popups for this site.");
            this._isLoginDialogOpen = false;
            return;
        }

        const pollInterval = setInterval(async () => {
            if (popup.closed) {
                clearInterval(pollInterval);
                this._isLoginDialogOpen = false;
                return;
            }

            try {
                // Try to fetch stats (lightweight check if session is active)
                await this.getStats();

                // If we reach here, login was successful
                clearInterval(pollInterval);
                popup.close();
                this._isLoginDialogOpen = false;
                MessageToast.show("Login successful. Reloading...");
                // Reload the page to restart timers and data fetching
                setTimeout(() => window.location.reload(), 1000);
            } catch {
                // Still unauthorized, continue polling
            }
        }, 2000);
    }

    /**
     * Authenticates with AdGuard Home
     */
    public async login(name: string, password: string): Promise<void> {
        await this._request(Constants.ApiEndpoints.Login, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, password })
        });
    }

    /**
     * Clears local session (cookie is cleared by browser or ignored on redirect)
     */
    public logout(): void {
        // Since it's a cookie, we can't delete it client-side if it's HttpOnly.
        // But we can redirect to login. AdGuard Home doesn't seem to have a logout endpoint.
        // We will just trust the redirect.
        SettingsService.getInstance().clearCredentials();
    }

    /**
     * Fetches dashboard statistics
     */
    public async getStats(): Promise<AdGuardStats> {
        const rawData = await this._request<RawAdGuardStats>(Constants.ApiEndpoints.Stats);

        const block_percentage = rawData.num_dns_queries > 0
            ? (rawData.num_blocked_filtering / rawData.num_dns_queries) * 100
            : 0;

        return {
            num_dns_queries: rawData.num_dns_queries,
            num_blocked_filtering: rawData.num_blocked_filtering,
            avg_processing_time: parseFloat((rawData.avg_processing_time * 1000).toFixed(2)),
            block_percentage: parseFloat(block_percentage.toFixed(2)),
            top_queried_domains: this.transformList(rawData.top_queried_domains, "domain", AdGuardService.TOP_LIST_LIMIT),
            top_blocked_domains: this.transformList(rawData.top_blocked_domains, "domain", AdGuardService.TOP_LIST_LIMIT),
            top_clients: this.transformList(rawData.top_clients, "ip", AdGuardService.TOP_LIST_LIMIT)
        };
    }

    /**
     * Fetches query logs with pagination and filtering
     * @param limit Number of items to fetch
     * @param offset Offset for pagination
     * @param filterStatus Optional status filter (e.g., "Blocked")
     */
    public async getQueryLog(limit: number, offset: number, filterStatus?: string): Promise<AdGuardData> {
        const data = await this._fetchRawQueryLog(limit, offset, filterStatus);

        const processedData: LogEntry[] = data.data.map(entry => {
            const isBlocked = (entry.reason && entry.reason.startsWith("Filtered")) ||
                (entry.reason === "SafeBrowsing");

            return {
                ...entry,
                time: new Date(entry.time),
                elapsedMs: entry.elapsedMs, // Already parsed in _fetchRawQueryLog
                blocked: isBlocked
            };
        });

        return { data: processedData };
    }

    private async _fetchRawQueryLog(limit: number, offset: number, filterStatus?: string, skipEnrichment: boolean = false): Promise<RawAdGuardData> {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString()
        });

        if (filterStatus) {
            params.append("response_status", filterStatus);
        }

        const url = `${Constants.ApiEndpoints.QueryLog}?${params.toString()}`;
        const data = await this._request<RawAdGuardData>(url);

        data.data.forEach(entry => {
            // Normalize elapsedMs from string to number
            // We cast to any because the raw API response has string, but our interface says number
            entry.elapsedMs = parseFloat(entry.elapsedMs as unknown as string) || 0;

            if (!skipEnrichment) {
                // Post-process to add blocked status
                // Heuristic: If reason starts with "Filtered" (e.g. FilteredBlackList, FilteredSafeBrowsing), it is blocked.
                // "NotFiltered..." reasons are obviously not blocked.
                if (entry.reason && entry.reason.startsWith("Filtered")) {
                    entry.blocked = true;
                } else if (entry.reason && entry.reason === "SafeBrowsing") {
                    // Some versions might just say SafeBrowsing? Rare but safe to add if needed.
                    // Stick to Filtered for now as per screenshot.
                    entry.blocked = true;
                } else {
                    entry.blocked = false;
                }
            }
        });

        return data;
    }

    /**
     * Helper to maintain a sorted array of top 5 occurrences
     */
    private _updateTopOccurrences(occurrences: number[], val: number): void {
        const limit = 5;
        let i = 0;
        // Find insertion point (descending order)
        // Optimization: Linear scan is faster than sort() for small fixed-size arrays (N=5)
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

    /**
     * Fetches the last N records and returns the top 5 slowest queries
     * @param scanDepth Number of records to scan (default 1000)
     */
    public async getSlowestQueries(scanDepth: number = AdGuardService.DEFAULT_SCAN_DEPTH): Promise<{ domain: string; elapsedMs: number; client: string; reason: string; occurrences: number[]; }[]> {
        try {
            // Optimization: Fetch raw data directly to avoid unnecessary object creation (Date, etc.) in getQueryLog
            const data = await this._fetchRawQueryLog(scanDepth, 0, undefined, true);

            const domainMap = new Map<string, { domain: string; elapsedMs: number; client: string; reason: string; occurrences: number[] }>();

            for (const e of data.data) {
                const val = e.elapsedMs;
                if (val <= 0) {
                    continue;
                }

                // Aggregate by domain
                if (domainMap.has(e.question.name)) {
                    const existing = domainMap.get(e.question.name)!;
                    this._updateTopOccurrences(existing.occurrences, val);

                    // Keep the max elapsed time and its details
                    if (val > existing.elapsedMs) {
                        existing.elapsedMs = val;
                        existing.client = e.client;
                        existing.reason = e.reason;
                    }
                } else {
                    domainMap.set(e.question.name, {
                        domain: e.question.name,
                        elapsedMs: val,
                        client: e.client,
                        reason: e.reason,
                        occurrences: [val]
                    });
                }
            }

            // Single-pass selection of top 10 domains
            const top10: { domain: string; elapsedMs: number; client: string; reason: string; occurrences: number[] }[] = [];
            const limit = 10;

            for (const item of domainMap.values()) {
                let i = 0;
                // Find insertion point (descending order)
                // Optimization: Linear scan is faster than sort() for small fixed-size arrays (N=10)
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

            return top10;
        } catch (error) {
            console.error("Failed to fetch slowest queries", error);
            return [];
        }
    }

    /**
     * Helper to transform Map/Object/Array responses from AdGuard API into a unified Array format
     */
    private transformList(list: unknown, preferredKey: string, limit?: number): StatsEntry[] {
        if (!list) return [];
        if (Array.isArray(list)) {
            let targetList = list;
            if (limit && list.length > limit) {
                targetList = list.slice(0, limit);
            }

            // Optimization: Cache discovered fallback key to avoid repeated searches
            let fallbackKeyCache: string | null = null;

            return targetList.map((item: unknown) => {
                const obj = item as Record<string, unknown>;

                // Case 1: Standard Object (already has keys like ip, domain, or name)
                if (obj.count !== undefined || obj[preferredKey] !== undefined || obj.name !== undefined) {
                    let nameVal = obj[preferredKey] || obj.name || obj.ip || obj.domain;

                    // Try cached fallback key if specific keys are missing
                    if (!nameVal && fallbackKeyCache && typeof obj[fallbackKeyCache] === 'string') {
                        nameVal = obj[fallbackKeyCache];
                    }

                    if (!nameVal) {
                        // Optimization: Use for...in loop instead of Object.keys().find()
                        // to avoid array allocation and allow early exit.
                        for (const key in obj) {
                            if (key !== 'count' && key !== 'source' && typeof obj[key] === 'string') {
                                nameVal = obj[key];
                                fallbackKeyCache = key; // Cache for subsequent items
                                break;
                            }
                        }
                        if (!nameVal) {
                            nameVal = "Unknown";
                        }
                    }
                    return {
                        name: String(nameVal),
                        count: Number(obj.count)
                    };
                }

                // Case 2: Single-Key Object { "192.168.1.1": 123 }
                // Optimization: Use for...in loop instead of Object.keys() to avoid array allocation
                for (const key in obj) {
                    return {
                        name: key,
                        count: Number(obj[key])
                    };
                }

                return { name: "Unknown", count: 0 };
            });
        } else if (typeof list === 'object') {
            // Case 3: Map { "192.168.1.1": 123 }
            let entries = Object.entries(list as Record<string, unknown>);
            if (limit && entries.length > limit) {
                entries = entries.slice(0, limit);
            }
            return entries.map(([key, count]) => ({
                name: key,
                count: Number(count)
            }));
        }
        return [];
    }
}
