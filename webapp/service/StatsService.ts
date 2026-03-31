import BaseApiService from "./BaseApiService";
import { RawAdGuardStats, AdGuardStats, RawAdGuardData, StatsEntry } from "../model/AdGuardTypes";
import { Constants } from "../model/Constants";
import FilteringService from "./FilteringService";
import ClientService from "./ClientService";
import SettingsService from "./SettingsService";

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

	public async getStats(period: string = "all"): Promise<AdGuardStats> {
		if (period !== "all") {
			return this._getStatsFromLogs(period);
		}

		const rawData = await this._request<RawAdGuardStats>(Constants.ApiEndpoints.Stats);

		const block_percentage =
			rawData.num_dns_queries > 0 ? (rawData.num_blocked_filtering / rawData.num_dns_queries) * 100 : 0;

		const filteringService = FilteringService.getInstance();
		const clientService = ClientService.getInstance();
		await Promise.all([filteringService.getFilters(), clientService.getClients()]);

		const rawTopFilters = rawData.top_filters || rawData.top_blocked_filters || [];
		let topFilters = this.transformList(rawTopFilters, "id", StatsService.TOP_LIST_LIMIT);

		// Fallback: If API returns no filter stats, aggregate from recent logs
		if (topFilters.length === 0) {
			topFilters = await this._getTopFiltersFromLogs();
		} else {
			// Resolve names for filters from API (they usually only have IDs)
			topFilters.forEach((f) => {
				const filterId = Number(f.name);
				if (!isNaN(filterId)) {
					f.name = filteringService.getFilterNameSync(filterId) || `Filter ${filterId}`;
				}
			});
		}

		const topClients = this.transformList(rawData.top_clients, "ip", StatsService.TOP_LIST_LIMIT);
		topClients.forEach((c) => {
			c.ip = c.name; // Preserve IP
			c.name = clientService.getName(c.name);
		});

		return {
			num_dns_queries: rawData.num_dns_queries,
			num_blocked_filtering: rawData.num_blocked_filtering,
			avg_processing_time: Math.round(rawData.avg_processing_time * 1000 * 100) / 100,
			block_percentage: Math.round(block_percentage * 100) / 100,
			top_queried_domains: this.transformList(rawData.top_queried_domains, "domain", StatsService.TOP_LIST_LIMIT),
			top_blocked_domains: this.transformList(rawData.top_blocked_domains, "domain", StatsService.TOP_LIST_LIMIT),
			top_clients: topClients,
			top_filters: topFilters
		};
	}

	public async getSlowestQueries(scanDepth?: number): Promise<SlowestQueryEntry[]> {
		if (!scanDepth) {
			scanDepth = SettingsService.getInstance().getDashboardScanDepth();
		}
		// Cache Optimization check
		if (
			this._slowestQueriesCache &&
			Date.now() - this._slowestQueriesCacheTime < StatsService.SLOWEST_QUERY_CACHE_DURATION &&
			this._slowestQueriesCacheDepth === scanDepth
		) {
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
				// Optimization: Native Number() is faster than typeof check + parseFloat
				const val = Number(rawElapsed) || 0;

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
			console.error("Failed to fetch slowest queries", (error as Error).message || "Unknown error");
			return [];
		}
	}

	private async _getStatsFromLogs(period: string): Promise<AdGuardStats> {
		const scanDepth = SettingsService.getInstance().getDashboardScanDepth();
		const startTime = this._getStartTimeForPeriod(period);
		const endTime = period === "yesterday" ? this._getEndTimeForYesterday() : undefined;

		try {
			const url = `${Constants.ApiEndpoints.QueryLog}?limit=${scanDepth}&offset=0`;
			const data = await this._request<RawAdGuardData>(url);
			const filteringService = FilteringService.getInstance();
			const clientService = ClientService.getInstance();
			await clientService.getClients();

			let total = 0;
			let blocked = 0;
			let totalProcessingTime = 0;
			const domains = new Map<string, number>();
			const blockedDomains = new Map<string, number>();
			const clients = new Map<string, number>();
			const filters = new Map<number, number>();

			for (const e of data.data) {
				const logTime = new Date(e.time);
				if (startTime && logTime < startTime) continue;
				if (endTime && logTime > endTime) continue;

				total++;
				const isBlocked = !!(e.filterId && e.filterId > 0) || e.reason === "FilteredBlockedService";
				if (isBlocked) {
					blocked++;
					const domain = e.question.name;
					blockedDomains.set(domain, (blockedDomains.get(domain) || 0) + 1);

					if (e.filterId && e.filterId > 0) {
						filters.set(e.filterId, (filters.get(e.filterId) || 0) + 1);
					}
				}

				const domain = e.question.name;
				domains.set(domain, (domains.get(domain) || 0) + 1);
				clients.set(e.client, (clients.get(e.client) || 0) + 1);

				const procTime = Number(e.elapsedMs) || 0;
				totalProcessingTime += procTime;
			}

			const topDomains = Array.from(domains.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, StatsService.TOP_LIST_LIMIT)
				.map(([name, count]) => ({ name, count }));

			const topBlockedDomains = Array.from(blockedDomains.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, StatsService.TOP_LIST_LIMIT)
				.map(([name, count]) => ({ name, count }));

			const topClients = Array.from(clients.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, StatsService.TOP_LIST_LIMIT)
				.map(([ip, count]) => ({
					name: clientService.getName(ip),
					ip,
					count
				}));

			const topFilters = Array.from(filters.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, StatsService.TOP_LIST_LIMIT)
				.map(([id, count]) => ({
					name: filteringService.getFilterNameSync(id) || `Filter ${id}`,
					count
				}));

			return {
				num_dns_queries: total,
				num_blocked_filtering: blocked,
				avg_processing_time: total > 0 ? Math.round((totalProcessingTime / total) * 100) / 100 : 0,
				block_percentage: total > 0 ? Math.round((blocked / total) * 10000) / 100 : 0,
				top_queried_domains: topDomains,
				top_blocked_domains: topBlockedDomains,
				top_clients: topClients,
				top_filters: topFilters,
				lastUpdated: new Date()
			};
		} catch (error) {
			console.error("Failed to aggregate stats from logs", error);
			throw error;
		}
	}

	private _getStartTimeForPeriod(period: string): Date | undefined {
		const now = new Date();
		switch (period) {
			case "24h":
				return new Date(now.getTime() - 24 * 60 * 60 * 1000);
			case "today":
				return new Date(now.getFullYear(), now.getMonth(), now.getDate());
			case "yesterday":
				return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
			case "7d":
				return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			case "week": {
				const day = now.getDay();
				const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
				const start = new Date(now);
				start.setDate(diff);
				start.setHours(0, 0, 0, 0);
				return start;
			}
			default:
				return undefined;
		}
	}

	private _getEndTimeForYesterday(): Date {
		const now = new Date();
		const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		end.setMilliseconds(-1);
		return end;
	}

	private async _getTopFiltersFromLogs(scanDepth?: number): Promise<StatsEntry[]> {
		if (!scanDepth) {
			scanDepth = SettingsService.getInstance().getDashboardScanDepth();
		}
		try {
			const url = `${Constants.ApiEndpoints.QueryLog}?limit=${scanDepth}&offset=0`;
			const data = await this._request<RawAdGuardData>(url);
			const filteringService = FilteringService.getInstance();

			const filterCounts = new Map<number, number>();

			for (const e of data.data) {
				// AdGuard Home API uses 'reason' or 'status' to indicate filtering blocks.
				// We check 'filterId' being non-zero as a reliable indicator of a list block.
				if (e.filterId && e.filterId > 0) {
					const count = filterCounts.get(e.filterId) || 0;
					filterCounts.set(e.filterId, count + 1);
				}
			}

			const result: StatsEntry[] = [];
			for (const [id, count] of filterCounts.entries()) {
				const name = filteringService.getFilterNameSync(id) || `Filter ${id}`;
				result.push({ name, count });
			}

			// Sort by count descending and limit
			return result.sort((a, b) => b.count - a.count).slice(0, StatsService.TOP_LIST_LIMIT);
		} catch (error) {
			console.error("Failed to aggregate top filters from logs", error);
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
			if (typeof list === "object" && list !== null) {
				const entries = Object.entries(list as Record<string, unknown>);
				const len = limit ? Math.min(entries.length, limit) : entries.length;
				const result = new Array(len) as StatsEntry[];
				// Optimization: Loop mapping avoids creating intermediate sliced arrays
				for (let i = 0; i < len; i++) {
					const [k, v] = entries[i];
					result[i] = {
						name: k,
						count: typeof v === "number" ? v : Number(v) || 0
					};
				}
				return result;
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

			if (typeof item !== "object" || item === null) {
				entry = { name: "Unknown", count: 0 };
			} else {
				const obj = item as Record<string, unknown>;
				// Try common count property names
				const cnt =
					typeof obj.count === "number"
						? obj.count
						: typeof obj.value === "number"
							? obj.value
							: Number(obj.count) || 0;

				const preferredVal = obj[preferredKey];
				if (typeof preferredVal === "string" && preferredVal) {
					entry = { name: preferredVal, count: cnt };
				} else if (typeof obj.name === "string" && obj.name) {
					entry = { name: obj.name, count: cnt };
				} else if (typeof obj.domain === "string" && obj.domain) {
					entry = { name: obj.domain, count: cnt };
				} else if (typeof obj.ip === "string" && obj.ip) {
					entry = { name: obj.ip, count: cnt };
				} else {
					const keys = Object.keys(obj);
					if (keys.length === 1) {
						const key = keys[0];
						const val = obj[key];
						if (typeof val === "number") {
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
