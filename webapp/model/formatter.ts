import formatMessage from "sap/base/strings/formatMessage";
import DateFormat from "sap/ui/core/format/DateFormat";

export default {
    formatMessage: formatMessage,

    /**
     * Formats a date string or Date object.
     * @param date Date object or string
     * @returns Formatted date string
     */
    formatDateTime: function (date: string | Date | null | undefined): string {
        if (!date) {
            return "";
        }
        const oDate = date instanceof Date ? date : new Date(date);
        const oFormat = DateFormat.getDateTimeInstance({ pattern: "yyyy-MM-dd HH:mm:ss.SSS" });
        return oFormat.format(oDate);
    },

    /**
     * Formats elapsed time in milliseconds to a string with 3 decimal places.
     * @param ms Elapsed time in milliseconds (number)
     * @returns Formatted string "0.000"
     */
    formatElapsed: function (ms: number | null | undefined): string {
        return (typeof ms === 'number') ? ms.toFixed(3) : "0.000";
    },

    /**
     * Formats the domain with occurrence count if greater than 1.
     * @param domain Domain name
     * @param occurrences Array of elapsed times
     * @returns "domain.com" or "domain.com (3)"
     */
    formatDomainWithCount: function (domain: string, occurrences: number[] | undefined): string {
        if (!occurrences || occurrences.length <= 1) {
            return domain;
        }
        return `${domain} (${occurrences.length})`;
    },

    /**
     * Generates a tooltip listing all elapsed times.
     * @param occurrences Array of elapsed times
     * @returns Formatted string with newlines
     */
    slowestTooltip: function (occurrences: number[] | undefined): string {
        if (!occurrences || !Array.isArray(occurrences) || occurrences.length === 0) {
            return "";
        }
        // Occurrences are already sorted descending by AdGuardService.
        return occurrences.map(t => `${t.toFixed(3)} ms`).join("\n");
    },

    /**
     * Formats the value state based on elapsed time.
     * @param ms Elapsed time in milliseconds
     * @returns "Error" | "Warning" | "None"
     */
    formatElapsedState: function (ms: number | string | null | undefined): string {
        if (ms === null || ms === undefined) {
            return "None";
        }
        const val = typeof ms === 'string' ? parseFloat(ms) : ms;

        if (val > 500) {
            return "Error";
        } else if (val > 200) {
            return "Warning";
        } else {
            return "None";
        }
    },

    /**
     * Formats the value state text based on elapsed time.
     * @param ms Elapsed time in milliseconds
     * @returns "Critical (> 500ms)" | "Warning (> 200ms)" | "Good (< 200ms)"
     */
    formatElapsedStateText: function (ms: number | string | null | undefined): string {
        if (ms === null || ms === undefined) {
            return "None";
        }
        const val = typeof ms === 'string' ? parseFloat(ms) : ms;

        if (val > 500) {
            return "Critical (> 500ms)";
        } else if (val > 200) {
            return "Warning (> 200ms)";
        } else {
            return "Good (< 200ms)";
        }
    },

    /**
     * Formats the value color for NumericContent based on elapsed time.
     * @param ms Elapsed time in milliseconds
     * @returns "Good" | "Critical" | "Error" | "Neutral"
     */
    formatElapsedColor: function (ms: number | string | null | undefined): string {
        if (ms === null || ms === undefined) {
            return "Neutral";
        }
        const val = typeof ms === 'string' ? parseFloat(ms) : ms;

        if (val > 500) {
            return "Error";
        } else if (val > 200) {
            return "Critical";
        } else {
            return "Good";
        }
    }
};
