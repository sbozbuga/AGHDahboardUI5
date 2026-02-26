import Storage from "sap/ui/util/Storage";

export default class SettingsService {
    private static instance: SettingsService;
    private storage: Storage;
    private readonly STORAGE_KEY_API_KEY = "gemini_api_key";
    private readonly STORAGE_KEY_MODEL = "gemini_model";
    private readonly STORAGE_KEY_CONTEXT = "gemini_system_context";
    private readonly STORAGE_KEY_BASE_URL = "aghd_base_url";
    private readonly DEFAULT_MODEL = "gemini-1.5-flash";

    private readonly MAX_API_KEY_LENGTH = 255;
    private readonly MAX_CONTEXT_LENGTH = 1000;

    // In-memory cache to avoid synchronous storage access
    private _apiKey: string | null = null;
    private _model: string | null = null;
    private _context: string | null = null;
    private _baseUrl: string | null = null;

    private constructor() {
        this.storage = new Storage(Storage.Type.local, "aghd_settings");
    }

    public static getInstance(): SettingsService {
        if (!SettingsService.instance) {
            SettingsService.instance = new SettingsService();
        }
        return SettingsService.instance;
    }

    public getApiKey(): string {
        if (this._apiKey !== null) {
            return this._apiKey;
        }
        this._apiKey = (this.storage.get(this.STORAGE_KEY_API_KEY) as string) || "";
        return this._apiKey;
    }

    public setApiKey(key: string): void {
        if (key.length > 255) {
            throw new Error("API Key too long (max 255 chars).");
        }
        this._apiKey = key;
        this.storage.put(this.STORAGE_KEY_API_KEY, key);
    }

    public hasApiKey(): boolean {
        return !!this.getApiKey();
    }

    public getModel(): string {
        if (this._model !== null) {
            return this._model;
        }
        this._model = (this.storage.get(this.STORAGE_KEY_MODEL) as string) || this.DEFAULT_MODEL;
        return this._model;
    }

    public setModel(model: string): void {
        this._model = model || this.DEFAULT_MODEL;
        this.storage.put(this.STORAGE_KEY_MODEL, model);
    }

    public getSystemContext(): string {
        if (this._context !== null) {
            return this._context;
        }
        this._context = (this.storage.get(this.STORAGE_KEY_CONTEXT) as string) || "";
        return this._context;
    }

    public setSystemContext(context: string): void {
        if (context.length > 1000) {
            throw new Error("Context too long (max 1000 chars).");
        }
        this._context = context;
        this.storage.put(this.STORAGE_KEY_CONTEXT, context);
    }

    /**
     * Returns the configured AdGuard Home Base URL.
     * If empty, returns "" (implies relative path / proxy).
     * If set, returns the URL without trailing slash (e.g. "http://192.168.1.1").
     */
    public getBaseUrl(): string {
        if (this._baseUrl !== null) {
            return this._baseUrl;
        }
        let url = (this.storage.get(this.STORAGE_KEY_BASE_URL) as string) || "";
        if (url.endsWith("/")) {
            url = url.slice(0, -1);
        }
        this._baseUrl = url;
        return this._baseUrl;
    }

    public setBaseUrl(url: string): void {
        let cleanUrl = url.trim();
        if (cleanUrl.endsWith("/")) {
            cleanUrl = cleanUrl.slice(0, -1);
        }

        if (!cleanUrl) {
            this._baseUrl = "";
            this.storage.put(this.STORAGE_KEY_BASE_URL, "");
            return;
        }

        // Security: Validate URL format to prevent XSS (javascript:) and ensure protocol
        // Also forbid embedded credentials to prevent leakage in logs
        try {
            const parsedUrl = new URL(cleanUrl);
            if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
                throw new Error("Invalid Base URL. Must start with http:// or https://");
            }
            if (parsedUrl.username || parsedUrl.password) {
                throw new Error("Base URL must not contain credentials.");
            }
            if (parsedUrl.search || parsedUrl.hash) {
                throw new Error("Base URL must not contain query parameters or fragments.");
            }
        } catch (error) {
            // Map URL constructor errors to friendly message if needed, or rethrow custom ones
            if (error instanceof Error && (error.message.includes("Invalid Base URL") || error.message.includes("credentials") || error.message.includes("query parameters"))) {
                throw error;
            }
            throw new Error("Invalid URL format.", { cause: error });
        }

        this._baseUrl = cleanUrl;
        this.storage.put(this.STORAGE_KEY_BASE_URL, cleanUrl);
    }

    public clearCredentials(): void {
        this._apiKey = null;
        this._model = null;
        this._context = null;
        // Do not clear Base URL on logout, as it's a system config
        this.storage.remove(this.STORAGE_KEY_API_KEY);
        this.storage.remove(this.STORAGE_KEY_MODEL);
        this.storage.remove(this.STORAGE_KEY_CONTEXT);
    }
}
