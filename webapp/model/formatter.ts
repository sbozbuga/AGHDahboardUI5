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
    }
};
