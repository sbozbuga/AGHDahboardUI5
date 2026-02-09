import SettingsService from "./SettingsService";
import { LogEntry } from "../model/AdGuardTypes";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface LogSummary {
    total_queries: number;
    blocked_count: number;
    block_percentage: string;
    top_clients: [string, number][];
    top_domains: [string, number][];
    top_upstreams: [string, number][];
}

interface GeminiModel {
    name: string;
    displayName: string;
    supportedGenerationMethods: string[];
}

interface GeminiResponse {
    models: GeminiModel[];
}

export default class GeminiService {
    private static instance: GeminiService;
    // eslint-disable-next-line no-control-regex
    private static readonly CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F-\x9F]/g;
    private static readonly REQUEST_TIMEOUT = 30000;
    private static readonly MIN_ANALYSIS_INTERVAL = 10000; // 10 seconds
    private static readonly MAX_INPUT_LENGTH = 255;

    private lastAnalysisTime = 0;

    public static getInstance(): GeminiService {
        if (!GeminiService.instance) {
            GeminiService.instance = new GeminiService();
        }
        return GeminiService.instance;
    }

    public sanitizeInput(str: string): string {
        // Remove control characters (0-31, 127, and C1 128-159) to prevent prompt injection via newlines etc.
        const cleaned = str.replace(GeminiService.CONTROL_CHARS_REGEX, "").trim();
        // Truncate to prevent token exhaustion / DoS
        return cleaned.length > GeminiService.MAX_INPUT_LENGTH
            ? cleaned.substring(0, GeminiService.MAX_INPUT_LENGTH)
            : cleaned;
    }

    public async generateInsights(logs: LogEntry[]): Promise<string> {
        const apiKey = SettingsService.getInstance().getApiKey();
        if (!apiKey) {
            throw new Error("API Key is missing. Please configure it in settings.");
        }

        const now = Date.now();
        if (now - this.lastAnalysisTime < GeminiService.MIN_ANALYSIS_INTERVAL) {
            const waitSeconds = Math.ceil((GeminiService.MIN_ANALYSIS_INTERVAL - (now - this.lastAnalysisTime)) / 1000);
            throw new Error(`Please wait ${waitSeconds} seconds before requesting new insights.`);
        }

        this.lastAnalysisTime = now;

        const summary = this.summarizeLogs(logs);
        const prompt = this.buildPrompt(summary);

        try {
            // Initialize Gemini AI Client
            const genAI = new GoogleGenerativeAI(apiKey);
            const modelName = SettingsService.getInstance().getModel();
            const model = genAI.getGenerativeModel({ model: modelName });

            // Generate Content
            const result = await model.generateContent(prompt, { timeout: GeminiService.REQUEST_TIMEOUT });
            const response = result.response;
            const text = response.text();

            return text || "No insights generated.";
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            // Safe redaction without Regex issues
            const safeMsg = apiKey ? msg.split(apiKey).join("[REDACTED]") : msg;
            console.error("Gemini API Error:", safeMsg);
            throw new Error("Failed to generate insights. Check your API Key and network connection.", { cause: error });
        }
    }

    private summarizeLogs(logs: LogEntry[]): LogSummary {
        const total = logs.length;
        let blockedCount = 0;
        const clientCounts = new Map<string, number>();
        const domainCounts = new Map<string, number>();
        const upstreamCounts = new Map<string, number>();

        // Single pass aggregation
        for (const log of logs) {
            // Blocked status check
            if (log.status === "Blocked" || log.status === "Filtered" || log.status === "SafeBrowsing") {
                blockedCount++;
            }

            // Client counts
            // Performance: Removed sanitizeInput from loop to save regex overhead (approx 4x speedup)
            const client = log.client || "Unknown";
            clientCounts.set(client, (clientCounts.get(client) || 0) + 1);

            // Domain counts
            const domain = log.question?.name || "Unknown";
            domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);

            // Upstream counts
            const upstream = log.upstream || "Unknown";
            upstreamCounts.set(upstream, (upstreamCounts.get(upstream) || 0) + 1);
        }

        return {
            total_queries: total,
            blocked_count: blockedCount,
            block_percentage: total > 0 ? ((blockedCount / total) * 100).toFixed(2) + "%" : "0%",
            top_clients: this.getTopK(clientCounts, 5),
            top_domains: this.getTopK(domainCounts, 5),
            top_upstreams: this.getTopK(upstreamCounts, 3)
        };
    }

    private getTopK(counts: Map<string, number>, k: number): [string, number][] {
        // Optimization: Linear scan (O(N)) instead of sorting the whole array (O(N log N))
        // This is significantly faster for large datasets where K is small
        const topK: [string, number][] = [];

        for (const [key, value] of counts) {
            if (topK.length < k) {
                topK.push([key, value]);
                topK.sort((a, b) => b[1] - a[1]);
            } else if (value > topK[k - 1][1]) {
                // Find insertion point
                let i = 0;
                while (i < k && value <= topK[i][1]) {
                    i++;
                }
                topK.splice(i, 0, [key, value]);
                topK.pop();
            }
        }
        return topK;
    }

    private buildPrompt(summary: LogSummary): string {
        // Sanitize context to prevent prompt injection or control character issues
        const context = this.sanitizeInput(SettingsService.getInstance().getSystemContext());
        let contextSection = "";
        if (context) {
            contextSection = `
        System Context (User Provided):
        ${context}
            `;
        }

        return `
        You are a Cyber Security Expert and Data Analyst for a home network.
        ${contextSection}
        Analyze the following AdGuard Home log summary and provide 3-5 distinct, actionable insights.
        Focus on:
        1. Security anomalies (e.g., unusual high frequency from a client).
        2. Privacy concerns (e.g., highly frequent tracking domains).
        3. Performance observations (if apparent).
        
        Data Summary:
        ${JSON.stringify(summary, null, 2)}

        Format the output as a Markdown list with bold headers for each insight. 
        Keep it concise and friendly.
        `;
    }
    public async getAvailableModels(): Promise<{ key: string, text: string }[]> {
        const apiKey = SettingsService.getInstance().getApiKey();
        if (!apiKey) return [];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GeminiService.REQUEST_TIMEOUT);

        try {
            // We use the REST API manually here because the SDK's listModels might be node-only or explicit
            // simpler to just hit the endpoint for this specific list.
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
                headers: {
                    "x-goog-api-key": apiKey
                },
                signal: controller.signal
            });
            if (!response.ok) return [];

            const data = await response.json() as GeminiResponse;
            const models = (data.models || []);

            // Filter for models that support 'generateContent'
            return models
                .filter((m) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                .map((m) => ({
                    key: m.name.replace("models/", ""), // remove prefix for cleaner ID
                    text: m.displayName || m.name
                }));
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            // Safe redaction without Regex issues
            const safeMsg = apiKey ? msg.split(apiKey).join("[REDACTED]") : msg;
            console.error("Failed to fetch models", safeMsg);
            return [];
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
