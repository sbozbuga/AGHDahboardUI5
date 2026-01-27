import { AdGuardData, AdGuardStats, RawAdGuardStats, StatsEntry } from "../model/AdGuardTypes";

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
     * Authenticates with AdGuard Home
     */
    public async login(name: string, password: string): Promise<void> {
        const response = await fetch("/control/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, password })
        });

        if (!response.ok) {
            throw new Error("Login failed");
        }
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
        const response = await fetch("/control/stats");
        if (response.status === 401) {
            // intercept 401 and throw specific error or handle via event/router
            // For now, let caller handle or we can emit a global event
            throw new Error("Unauthorized");
        }
        if (!response.ok) {
            throw new Error(`Error fetching stats: ${response.statusText}`);
        }
        const rawData = await response.json() as RawAdGuardStats;

        const block_percentage = rawData.num_dns_queries > 0
            ? (rawData.num_blocked_filtering / rawData.num_dns_queries) * 100
            : 0;

        return {
            num_dns_queries: rawData.num_dns_queries,
            num_blocked_filtering: rawData.num_blocked_filtering,
            avg_processing_time: parseFloat((rawData.avg_processing_time * 1000).toFixed(2)),
            block_percentage: parseFloat(block_percentage.toFixed(2)),
            top_queried_domains: this.transformList(rawData.top_queried_domains, "domain").slice(0, AdGuardService.TOP_LIST_LIMIT),
            top_blocked_domains: this.transformList(rawData.top_blocked_domains, "domain").slice(0, AdGuardService.TOP_LIST_LIMIT),
            top_clients: this.transformList(rawData.top_clients, "ip").slice(0, AdGuardService.TOP_LIST_LIMIT)
        };
    }

    /**
     * Fetches query logs with pagination and filtering
     * @param limit Number of items to fetch
     * @param offset Offset for pagination
     * @param filterStatus Optional status filter (e.g., "Blocked")
     */
    public async getQueryLog(limit: number, offset: number, filterStatus?: string): Promise<AdGuardData> {
        let url = `/control/querylog?limit=${limit}&offset=${offset}`;
        if (filterStatus) {
            url += `&response_status=${filterStatus}`;
        }

        const response = await fetch(url);
        if (response.status === 401) {
            throw new Error("Unauthorized");
        }
        if (!response.ok) {
            throw new Error(`Error fetching logs: ${response.statusText}`);
        }

        return await response.json() as AdGuardData;
    }

    /**
     * Fetches the last N records and returns the top 5 slowest queries
     * @param scanDepth Number of records to scan (default 1000)
     */
    public async getSlowestQueries(scanDepth: number = AdGuardService.DEFAULT_SCAN_DEPTH): Promise<{ domain: string; elapsedMs: number; client: string; reason: string; }[]> {
        try {
            const data = await this.getQueryLog(scanDepth, 0);

            // Filter out entries with invalid elapsed times
            const validEntries = data.data.filter(e => e.elapsedMs);

            // Sort by elapsedMs descending
            const sorted = validEntries.sort((a, b) => {
                const elapsedA = parseFloat(a.elapsedMs) || 0;
                const elapsedB = parseFloat(b.elapsedMs) || 0;
                return elapsedB - elapsedA;
            });

            // Return Top N
            return sorted.slice(0, AdGuardService.TOP_LIST_LIMIT).map(e => ({
                domain: e.question.name,
                elapsedMs: parseFloat(e.elapsedMs),
                client: e.client,
                reason: e.reason
            }));
        } catch (error) {
            console.error("Failed to fetch slowest queries", error);
            return [];
        }
    }

    /**
     * Helper to transform Map/Object/Array responses from AdGuard API into a unified Array format
     */
    private transformList(list: unknown, preferredKey: string): StatsEntry[] {
        if (!list) return [];
        if (Array.isArray(list)) {
            return list.map((item: unknown) => {
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
            return Object.entries(list as Record<string, unknown>).map(([key, count]) => ({
                name: key,
                count: Number(count)
            }));
        }
        return [];
    }
}
