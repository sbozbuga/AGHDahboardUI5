import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import { Constants } from "./Constants";
import type { AdvancedFilterRule } from "./AdGuardTypes";

/**
 * Helper class for creating UI5 Filter objects for query logs.
 * @namespace ui5.aghd.model
 */
export default class FilterHelper {
	/**
	 * Creates a client-side search filter based on the search query.
	 * Searches in Question Name and Client fields.
	 *
	 * @public
	 * @param {string} query The search query string
	 * @returns {sap.ui.model.Filter|null} The combined Filter object or null if query is empty
	 */
	public static getSearchFilter(query: string): Filter | null {
		if (!query || query.trim().length === 0) {
			return null;
		}
		const trimmed = query.trim();
		return new Filter(
			[
				new Filter(Constants.ColumnIds.QuestionName, FilterOperator.Contains, trimmed),
				new Filter(Constants.ColumnIds.Client, FilterOperator.Contains, trimmed)
			],
			false
		);
	}

	/**
	 * Combines view settings filters (e.g. status) using OR since they are within the same group.
	 *
	 * @public
	 * @param {sap.ui.model.Filter[]} filters Array of individual view settings filters
	 * @returns {sap.ui.model.Filter|null} A single combined Filter object, or null if empty
	 */
	public static getViewSettingsFilter(filters: Filter[]): Filter | null {
		if (!filters || filters.length === 0) {
			return null;
		}
		return new Filter(filters, false);
	}

	/**
	 * Creates filters from the active advanced filter rules.
	 * Performs necessary type conversions based on the column type.
	 *
	 * @public
	 * @param {AdvancedFilterRule[]} advancedRules List of active advanced filter rules from the view model
	 * @returns {sap.ui.model.Filter[]} Array of UI5 Filter objects
	 */
	public static getAdvancedFilters(advancedRules: AdvancedFilterRule[]): Filter[] {
		if (!advancedRules || advancedRules.length === 0) {
			return [];
		}

		const aFilters: Filter[] = [];
		for (const f of advancedRules) {
			if (f.value === "") {
				continue;
			}

			let value: string | number | boolean = f.value;
			const operator = f.operator as FilterOperator;

			// Type conversion for numeric/boolean columns
			if (f.column === Constants.ColumnIds.ElapsedMs) {
				value = parseFloat(f.value);
				if (isNaN(value)) continue;
			} else if (f.column === Constants.ColumnIds.Blocked) {
				const sVal = String(f.value).toLowerCase();
				value = sVal === "true" || sVal === "1" || sVal === "yes";
			} else if (f.column === Constants.ColumnIds.FilterId) {
				value = parseInt(String(f.value), 10);
				if (isNaN(value)) continue;
			}

			aFilters.push(new Filter(f.column, operator, value));
		}
		return aFilters;
	}
}
