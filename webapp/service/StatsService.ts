import BaseApiService from "./BaseApiService";
import { RawAdGuardStats, AdGuardStats, RawAdGuardData, StatsEntry } from "../model/AdGuardTypes";
import { Constants } from "../model/Constants";

export interface SlowestQueryEntry {
    domain: string;
    elapsedMs: number;
    client: string;
    reason: string;
    occurrences: number[];
}

/**
 * Service for fetching Dashboard Statistics and performing "Slowest Queries" calculations.
 * @namespace ui5.aghd.service
 */
export default class StatsService extends BaseApiService {
    private static instance: StatsService;

    // Cache Optimization variables
    private static readonly TOP_LIST_LIMIT = 10;
    private static readonly DEFAULT_SCAN_DEPTH = 1000;
    private static readonly SLOWEST_QUERY_CACHE_DURATION = 60000;

    private _slowestQueriesMap = new Map<string, SlowestQueryEntry>();
    private _slowestQueriesCache: SlowestQueryEntry[] | null = null;
    private _slowestQueriesCacheTime: number = 0;
    private _slowestQueriesCacheDepth: number = 0;

    public static getInstance(): StatsService {
        if (!StatsService.instance) {
            StatsService.instance = new StatsService();
        }
        return StatsService.instance;
    }

    public clearCache(): void {
        this._slowestQueriesCache = null;
        this._slowestQueriesCacheTime = 0;
        this._slowestQueriesCacheDepth = 0;
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
            top_queried_domains: this.transformList(rawData.top_queried_domains, "domain", StatsService.TOP_LIST_LIMIT),
            top_blocked_domains: this.transformList(rawData.top_blocked_domains, "domain", StatsService.TOP_LIST_LIMIT),
            top_clients: this.transformList(rawData.top_clients, "ip", StatsService.TOP_LIST_LIMIT)
        };
    }

    public async getSlowestQueries(scanDepth: number = StatsService.DEFAULT_SCAN_DEPTH): Promise<SlowestQueryEntry[]> {
        // Cache Optimization check
        if (this._slowestQueriesCache &&
            (Date.now() - this._slowestQueriesCacheTime < StatsService.SLOWEST_QUERY_CACHE_DURATION) &&
            this._slowestQueriesCacheDepth === scanDepth) {
            return this._slowestQueriesCache;
        }

        try {
            // Using BaseApiService fetch for query logs here purely to calculate the slow queries.
            const url = `${Constants.ApiEndpoints.QueryLog}?limit=${scanDepth}&offset=0`;
            const data = await this._request<RawAdGuardData>(url);

            this._slowestQueriesMap.clear();
            const domainMap = this._slowestQueriesMap;

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

            const top10: SlowestQueryEntry[] = [];
            const limit = 10;

            for (const item of domainMap.values()) {
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

            this._slowestQueriesCache = top10;
            this._slowestQueriesCacheTime = Date.now();
            this._slowestQueriesCacheDepth = scanDepth;

            return top10;
        } catch (error) {
            console.error("Failed to fetch slowest queries", error);
            return [];
        }
    }

    private _updateTopOccurrences(occurrences: number[], val: number): void {
        const limit = 5;
        if (occurrences.length === limit && val <= occurrences[limit - 1]) {
            return;
        }

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

    private transformList(list: unknown, preferredKey: string, limit?: number): StatsEntry[] {
        if (!Array.isArray(list)) {
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

        const arr = list as unknown[];
        const len = arr.length;
        const count = limit && len > limit ? limit : len;
        const result = new Array<StatsEntry>(count);

        for (let i = 0; i < count; i++) {
            const item = arr[i];
            let entry: StatsEntry;

            if (typeof item !== 'object' || item === null) {
                entry = { name: "Unknown", count: 0 };
            } else {
                const obj = item as Record<string, unknown>;
                const cnt = typeof obj.count === 'number' ? obj.count : Number(obj.count) || 0;

                const preferredVal = obj[preferredKey];
                if (typeof preferredVal === 'string' && preferredVal) {
                    entry = { name: preferredVal, count: cnt };
                } else if (typeof obj.name === 'string' && obj.name) {
                    entry = { name: obj.name, count: cnt };
                } else if (typeof obj.domain === 'string' && obj.domain) {
                    entry = { name: obj.domain, count: cnt };
                } else if (typeof obj.ip === 'string' && obj.ip) {
                    entry = { name: obj.ip, count: cnt };
                } else {
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
