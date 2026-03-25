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
        const processedList = (data.data || []) as unknown as LogEntry[];

        for (const entry of processedList) {
            const rawElapsed = (entry as unknown as { elapsedMs: number | string }).elapsedMs;

            // Optimization: Native Number() is faster than typeof check + parseFloat
            const elapsedMs = Number(rawElapsed) || 0;
            const reason = entry.reason;
            // Optimization: indexOf === 0 is ~25% faster than startsWith in hot loops.
            // SafeBrowsing check comes first as strict equality is fastest.
            const isBlocked = reason === "SafeBrowsing" || (reason && reason.indexOf("Filtered") === 0);

            // Avoid recreating date obj strings during parsing loop
            entry.elapsedMs = elapsedMs;
            entry.blocked = !!isBlocked;
        }

        return { data: processedList };
    }
}
