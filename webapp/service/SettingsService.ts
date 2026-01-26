import Storage from "sap/ui/util/Storage";

export default class SettingsService {
    private static instance: SettingsService;
    private storage: Storage;
    private readonly STORAGE_KEY_API_KEY = "gemini_api_key";
    private readonly STORAGE_KEY_MODEL = "gemini_model";
    private readonly STORAGE_KEY_CONTEXT = "gemini_system_context";
    private readonly DEFAULT_MODEL = "gemini-1.5-flash";

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
        return (this.storage.get(this.STORAGE_KEY_API_KEY) as string) || "";
    }

    public setApiKey(key: string): void {
        this.storage.put(this.STORAGE_KEY_API_KEY, key);
    }

    public hasApiKey(): boolean {
        return !!this.getApiKey();
    }

    public getModel(): string {
        return (this.storage.get(this.STORAGE_KEY_MODEL) as string) || this.DEFAULT_MODEL;
    }

    public setModel(model: string): void {
        this.storage.put(this.STORAGE_KEY_MODEL, model);
    }

    public getSystemContext(): string {
        return (this.storage.get(this.STORAGE_KEY_CONTEXT) as string) || "";
    }

    public setSystemContext(context: string): void {
        this.storage.put(this.STORAGE_KEY_CONTEXT, context);
    }
}
