/**
 * @namespace ui5.aghd.model
 */
export const Constants = {
	Fragments: {
		SettingsDialog: "ui5.aghd.view.fragment.SettingsDialog",
		ViewSettingsDialog: "ui5.aghd.view.ViewSettingsDialog",
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
		QuestionType: "question/type",
		Client: "client",
		Status: "status",
		Blocked: "blocked",
		FilterId: "filterId",
		Rule: "rule",
		Upstream: "upstream",
		Reason: "reason"
	},
	Routes: {
		Dashboard: "dashboard",
		Logs: "logs"
	},
	ApiEndpoints: {
		Stats: "/control/stats",
		QueryLog: "/control/querylog",
		FilteringStatus: "/control/filtering/status",
		Clients: "/control/clients",
		DHCPStatus: "/control/dhcp/status"
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
