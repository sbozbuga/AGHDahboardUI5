import BaseApiService from "./BaseApiService";
import { Constants } from "../model/Constants";

export interface Filter {
	id: number;
	name: string;
	enabled: boolean;
	url: string;
	rulesCount: number;
	lastUpdated?: string;
}

/**
 * Service to manage AdGuard Home filtering configuration and filter lists.
 * @namespace ui5.aghd.service
 */
export default class FilteringService extends BaseApiService {
	private static instance: FilteringService;
	private _filterCache: Map<number, string> = new Map();
	private _filters: Filter[] = [];
	private _loaded = false;

	public static getInstance(): FilteringService {
		if (!FilteringService.instance) {
			FilteringService.instance = new FilteringService();
		}
		return FilteringService.instance;
	}

	public async getFilters(): Promise<Filter[]> {
		if (this._loaded) {
			return this._filters;
		}

		try {
			const data = await this._request<{ filters: Filter[] }>(Constants.ApiEndpoints.FilteringStatus);
			this._filters = data.filters || [];
			this._filterCache.clear();
			// Optimization: Native for...of loops eliminate callback allocation and invocation overhead associated with .forEach()
			for (const f of this._filters) {
				this._filterCache.set(f.id, f.name);
			}
			this._loaded = true;
			return this._filters;
		} catch (error) {
			console.error("Failed to fetch filters", error);
			return [];
		}
	}

	public async getFilterName(id: number): Promise<string> {
		if (!this._loaded) {
			await this.getFilters();
		}
		return this._filterCache.get(id) || `Filter ${id}`;
	}

	public getFilterNameSync(id: number): string | undefined {
		return this._filterCache.get(id);
	}

	public clearCache(): void {
		this._loaded = false;
		this._filterCache.clear();
	}
}
