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

	public async getQueryLog(limit: number, offset: number, filterStatus?: string): Promise<AdGuardData> {
		let url = `${Constants.ApiEndpoints.QueryLog}?limit=${limit}&offset=${offset}`;

		if (filterStatus) {
			url += `&response_status=${encodeURIComponent(filterStatus)}`;
		}

		const data = await this._request<RawAdGuardData>(url);
		const rawList = data.data || [];
		const processedList: LogEntry[] = [];

		for (const rawEntry of rawList) {
			const elapsedMs = Number(rawEntry.elapsedMs) || 0;
			const reason = rawEntry.reason;
			const isBlocked = reason === "SafeBrowsing" || (reason && reason.indexOf("Filtered") === 0);

			processedList.push({
				...rawEntry,
				elapsedMs,
				blocked: !!isBlocked
			});
		}

		return { data: processedList };
	}
}
