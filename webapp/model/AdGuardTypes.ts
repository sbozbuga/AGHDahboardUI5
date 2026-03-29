export interface RawLogEntry {
	answer: {
		type: string;
		value: string;
		ttl: number;
	}[];
	original_answer: {
		type: string;
		value: string;
		ttl: number;
	}[];
	upstream: string;
	status: string;
	question: {
		type: string;
		name: string;
		class: string;
	};
	client: string;
	time: string;
	elapsedMs: number | string;
	reason: string;
	filterId: number;
	rule: string;
	blocked?: boolean;
}

export interface LogEntry extends Omit<RawLogEntry, "time" | "elapsedMs"> {
	time: string | Date;
	elapsedMs: number;
	blocked: boolean;
}

export interface RawAdGuardData {
	data: RawLogEntry[];
}

export interface AdGuardData {
	data: LogEntry[];
}

export interface StatsEntry {
	name: string;
	count: number;
	[key: string]: any; // Allow for dynamic properties from different stats types
}

export interface AdGuardStats {
	num_dns_queries: number;
	num_blocked_filtering: number;
	avg_processing_time: number;
	block_percentage: number;
	top_queried_domains: StatsEntry[];
	top_blocked_domains: StatsEntry[];
	top_clients: StatsEntry[];
	lastUpdated?: Date;
}

export interface RawAdGuardStats {
	num_dns_queries: number;
	num_blocked_filtering: number;
	avg_processing_time: number;
	top_queried_domains: Record<string, number>[];
	top_blocked_domains: Record<string, number>[];
	top_clients: Record<string, number>[];
}

export interface AdvancedFilterRule {
	column: string;
	operator: string;
	value: string;
}
