import { AdGuardData, AdGuardStats, RawAdGuardStats, StatsEntry, LogEntry } from "../model/AdGuardTypes";
import { Constants } from "../model/Constants";

/**
 * Service for interacting with AdGuard Home API
 * @namespace ui5.aghd.service
 */
export default class AdGuardService {

    private static instance: AdGuardService;

    public static getInstance(): AdGuardService {
        if (!AdGuardService.instance) {
            AdGuardService.instance = new AdGuardService();
        }
        return AdGuardService.instance;
    }

    private static readonly DEFAULT_SCAN_DEPTH = 1000;
    private static readonly TOP_LIST_LIMIT = 10;

    /**
     * Generic wrapper for API requests
     */
    private async _request<T>(url: string, options?: RequestInit): Promise<T> {
        const response = await fetch(url, options);

        if (response.status === 401) {
            throw new Error("Unauthorized");
        }

        if (!response.ok) {
            throw new Error(`Request failed: ${response.statusText}`);
        }

        // Handle empty bodies (e.g. login)
        const text = await response.text();
        return text ? (JSON.parse(text) as T) : {} as T;
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
     * @param skipEnrichment Optional flag to skip post-processing (e.g. for simple stats)
     */
    public async getQueryLog(limit: number, offset: number, filterStatus?: string, skipEnrichment: boolean = false): Promise<AdGuardData> {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString()
        });

        if (filterStatus) {
            params.append("response_status", filterStatus);
        }

        const url = `${Constants.ApiEndpoints.QueryLog}?${params.toString()}`;
        const data = await this._request<AdGuardData>(url);

        if (!skipEnrichment) {
            // Post-process to add blocked status
            data.data.forEach(entry => {
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
            });
        }

        return data;
    }

    /**
     * Fetches the last N records and returns the top 5 slowest queries
     * @param scanDepth Number of records to scan (default 1000)
     */
    public async getSlowestQueries(scanDepth: number = AdGuardService.DEFAULT_SCAN_DEPTH): Promise<{ domain: string; elapsedMs: number; client: string; reason: string; }[]> {
        try {
            const data = await this.getQueryLog(scanDepth, 0, undefined, true);

            // Map to intermediate structure with parsed value for efficient sorting
            // Combine filter and map to avoid intermediate array allocation
            const mapped: { origin: LogEntry; elapsedVal: number }[] = [];
            for (const e of data.data) {
                if (e.elapsedMs) {
                    mapped.push({
                        origin: e,
                        elapsedVal: parseFloat(e.elapsedMs) || 0
                    });
                }
            }

            // Sort by elapsedMs descending
            mapped.sort((a, b) => b.elapsedVal - a.elapsedVal);

            // Return Top N
            return mapped.slice(0, AdGuardService.TOP_LIST_LIMIT).map(item => ({
                domain: item.origin.question.name,
                elapsedMs: item.elapsedVal,
                client: item.origin.client,
                reason: item.origin.reason
            }));
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
            return targetList.map((item: unknown) => {
                const obj = item as Record<string, unknown>;

                // Case 1: Standard Object (already has keys like ip, domain, or name)
                if (obj.count !== undefined || obj[preferredKey] !== undefined || obj.name !== undefined) {
                    let nameVal = obj[preferredKey] || obj.name || obj.ip || obj.domain;
                    if (!nameVal) {
                        const fallbackKey = Object.keys(obj).find(k => k !== 'count' && k !== 'source' && typeof obj[k] === 'string');
                        nameVal = fallbackKey ? obj[fallbackKey] : "Unknown";
                    }
                    return {
                        name: String(nameVal),
                        count: Number(obj.count)
                    };
                }

                // Case 2: Single-Key Object { "192.168.1.1": 123 }
                const keys = Object.keys(obj);
                if (keys.length > 0) {
                    const key = keys[0];
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
