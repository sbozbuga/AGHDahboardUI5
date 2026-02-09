import Storage from "sap/ui/util/Storage";

export default class SettingsService {
    private static instance: SettingsService;
    private storage: Storage;
    private readonly STORAGE_KEY_API_KEY = "gemini_api_key";
    private readonly STORAGE_KEY_MODEL = "gemini_model";
    private readonly STORAGE_KEY_CONTEXT = "gemini_system_context";
    private readonly DEFAULT_MODEL = "gemini-1.5-flash";

    // In-memory cache to avoid synchronous storage access
    private _apiKey: string | null = null;
    private _model: string | null = null;
    private _context: string | null = null;

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
        this._context = context;
        this.storage.put(this.STORAGE_KEY_CONTEXT, context);
    }

    public clearCredentials(): void {
        this._apiKey = null;
        this._model = null;
        this._context = null;
        this.storage.remove(this.STORAGE_KEY_API_KEY);
        this.storage.remove(this.STORAGE_KEY_MODEL);
        this.storage.remove(this.STORAGE_KEY_CONTEXT);
    }
}
