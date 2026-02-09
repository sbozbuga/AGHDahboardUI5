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
    elapsedMs: string;
    reason: string;
    filterId: number;
    rule: string;
    blocked?: boolean;
}

export interface LogEntry extends Omit<RawLogEntry, "time" | "elapsedMs"> {
    time: Date;
    elapsedMs: number;
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
    [key: string]: string | number | undefined;
}

export interface AdGuardStats {
    num_dns_queries: number;
    num_blocked_filtering: number;
    avg_processing_time: number;
    block_percentage: number;
    top_queried_domains: StatsEntry[];
    top_blocked_domains: StatsEntry[];
    top_clients: StatsEntry[];
}

export interface RawAdGuardStats {
    num_dns_queries: number;
    num_blocked_filtering: number;
    avg_processing_time: number;
    top_queried_domains: unknown[];
    top_blocked_domains: unknown[];
    top_clients: unknown[];
}

export interface AdvancedFilterRule {
    column: string;
    operator: string;
    value: string;
}
