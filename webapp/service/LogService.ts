import BaseApiService from "./BaseApiService";
import { AdGuardData, RawAdGuardData, LogEntry } from "../model/AdGuardTypes";
import { Constants } from "../model/Constants";

/**
 * Service to fetch, handle pagination, and normalize raw AdGuard logs
 * into a type-safe structure for the Logs view Datatable.
 * @namespace ui5.aghd.service
 */
export default class LogService extends BaseApiService {
	private static instance: LogService;

	public static getInstance(): LogService {
		if (!LogService.instance) {
			LogService.instance = new LogService();
		}
		return LogService.instance;
	}
	private filterCache: Map<number, string> = new Map();

	private async _fetchFilters(): Promise<void> {
		try {
			const data = await this._request<{ filters: { id: number; name: string }[] }>(
				Constants.ApiEndpoints.FilteringStatus
			);
			if (data && data.filters) {
				data.filters.forEach((f) => this.filterCache.set(f.id, f.name));
			}
		} catch (error) {
			console.error("Failed to fetch filters", error);
		}
	}

	public async getQueryLog(limit: number, offset: number, filterStatus?: string): Promise<AdGuardData> {
		let url = `${Constants.ApiEndpoints.QueryLog}?limit=${limit}&offset=${offset}`;

		if (filterStatus) {
			url += `&response_status=${encodeURIComponent(filterStatus)}`;
		}

		const data = await this._request<RawAdGuardData>(url);
		const rawList = data.data || [];
		const processedList: LogEntry[] = [];

		if (this.filterCache.size === 0) {
			await this._fetchFilters();
		}

		for (const rawEntry of rawList) {
			const elapsedMs = Number(rawEntry.elapsedMs) || 0;
			const reason = rawEntry.reason;
			const isBlocked = reason === "SafeBrowsing" || (reason && reason.indexOf("Filtered") === 0);

			if (isBlocked && !rawEntry.upstream) {
				// Use filter name from cache or fallback
				const filterName = this.filterCache.get(rawEntry.filterId);
				rawEntry.upstream = filterName || rawEntry.rule || rawEntry.reason;
			}

			processedList.push({
				...rawEntry,
				elapsedMs,
				blocked: !!isBlocked
			});
		}

		return { data: processedList };
	}
}
