import BaseApiService from "./BaseApiService";
import type { AdGuardData, RawAdGuardData, LogEntry } from "../model/AdGuardTypes";
import { Constants } from "../model/Constants";
import FilteringService from "./FilteringService";
import ClientService from "./ClientService";

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

	public async getQueryLog(limit: number, offset: number, filterStatus?: string): Promise<AdGuardData> {
		let url = `${Constants.ApiEndpoints.QueryLog}?limit=${limit}&offset=${offset}`;

		if (filterStatus) {
			url += `&response_status=${encodeURIComponent(filterStatus)}`;
		}

		const filteringService = FilteringService.getInstance();
		const clientService = ClientService.getInstance();

		// Pre-load filters and clients concurrently with log fetching if we need mapping for logs
		// ⚡ Bolt: Fetching logs, filters, and clients concurrently reduces overall latency
		const [data] = await Promise.all([
			this._request<RawAdGuardData>(url),
			filteringService.getFilters(),
			clientService.getClients()
		]);

		const rawList = data.data || [];
		const processedList: LogEntry[] = [];

		for (const rawEntry of rawList) {
			const elapsedMs = Number(rawEntry.elapsedMs) || 0;
			const reason = rawEntry.reason;
			const isBlocked = reason === "SafeBrowsing" || (reason && reason.indexOf("Filtered") === 0);

			if (isBlocked && !rawEntry.upstream) {
				// Use filter name from cache or fallback
				const filterName = filteringService.getFilterNameSync(rawEntry.filterId);
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
