export interface LogEntry {
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
}

export interface AdGuardData {
    data: LogEntry[];
}

export interface AdGuardStats {
    num_dns_queries: number;
    num_blocked_filtering: number;
    avg_processing_time: number;
    block_percentage?: number;
}
