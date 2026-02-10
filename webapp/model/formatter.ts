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
    }
};
