/**
 * @namespace ui5.aghd.model
 */
export const Constants = {
    Fragments: {
        SettingsDialog: "ui5.aghd.view.fragment.SettingsDialog",
        ViewSettingsDialog: "ui5.aghd.view.ViewSettingsDialog",
        InsightsDialog: "ui5.aghd.view.fragment.InsightsDialog",
        AdvancedFilterDialog: "ui5.aghd.view.fragment.AdvancedFilterDialog"
    },
    ModelProperties: {
        AdvancedFilters: "/advancedFilters",
        Data: "/data",
        Limit: "/limit",
        Offset: "/offset",
        FilterStatus: "/filterStatus"
    },
    ColumnIds: {
        ElapsedMs: "elapsedMs",
        QuestionName: "question/name",
        Client: "client",
        Status: "status"
    },
    Routes: {
        Dashboard: "dashboard",
        Logs: "logs"
    },
    ApiEndpoints: {
        Login: "/control/login",
        Stats: "/control/stats",
        QueryLog: "/control/querylog"
    },
    LogStatus: {
        Blocked: "Blocked",
        Filtered: "Filtered",
        SafeBrowsing: "SafeBrowsing"
    },
    FilterOperators: {
        GreaterThan: "GT"
    },
    Events: {
        Search: "search",
        Growing: "Growing"
    }
};
