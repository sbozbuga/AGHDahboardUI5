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

    public static getInstance(): GeminiService {
        if (!GeminiService.instance) {
            GeminiService.instance = new GeminiService();
        }
        return GeminiService.instance;
    }

    public async generateInsights(logs: LogEntry[]): Promise<string> {
        const apiKey = SettingsService.getInstance().getApiKey();
        if (!apiKey) {
            throw new Error("API Key is missing. Please configure it in settings.");
        }

        const summary = this.summarizeLogs(logs);
        const prompt = this.buildPrompt(summary);

        try {
            // Initialize Gemini AI Client
            const genAI = new GoogleGenerativeAI(apiKey);
            const modelName = SettingsService.getInstance().getModel();
            const model = genAI.getGenerativeModel({ model: modelName });

            // Generate Content
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            return text || "No insights generated.";
        } catch (error) {
            console.error("Gemini API Error:", error);
            throw new Error("Failed to generate insights. Check your API Key and network connection.");
        }
    }

    private summarizeLogs(logs: LogEntry[]): LogSummary {
        const total = logs.length;
        let blockedCount = 0;
        const clientCounts: Record<string, number> = {};
        const domainCounts: Record<string, number> = {};
        const upstreamCounts: Record<string, number> = {};

        // Single pass aggregation
        for (const log of logs) {
            // Blocked status check
            if (log.status === "Blocked" || log.status === "Filtered" || log.status === "SafeBrowsing") {
                blockedCount++;
            }

            // Client counts
            const client = log.client || "Unknown";
            clientCounts[client] = (clientCounts[client] || 0) + 1;

            // Domain counts
            const domain = log.question?.name || "Unknown";
            domainCounts[domain] = (domainCounts[domain] || 0) + 1;

            // Upstream counts
            const upstream = log.upstream || "Unknown";
            upstreamCounts[upstream] = (upstreamCounts[upstream] || 0) + 1;
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

    private getTopK(counts: Record<string, number>, k: number): [string, number][] {
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1]) // Sort by count descending
            .slice(0, k);
    }

    private buildPrompt(summary: LogSummary): string {
        const context = SettingsService.getInstance().getSystemContext();
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

        try {
            // We use the REST API manually here because the SDK's listModels might be node-only or explicit
            // simpler to just hit the endpoint for this specific list.
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
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
            console.error("Failed to fetch models", error);
            return [];
        }
    }
}
