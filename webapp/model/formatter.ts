export default {
    /**
     * Formats elapsed time in milliseconds to a string with 3 decimal places.
     * @param ms Elapsed time in milliseconds (number or string)
     * @returns Formatted string "0.000"
     */
    formatElapsed: function (ms: number | string | null | undefined): string {
        if (ms === null || ms === undefined) {
            return "0.000";
        }
        const val = typeof ms === 'string' ? parseFloat(ms) : ms;
        return val.toFixed(3);
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
        // Sort descending for the tooltip as well
        const sorted = [...occurrences].sort((a, b) => b - a);
        return sorted.map(t => `${t.toFixed(3)} ms`).join("\n");
    }
};
