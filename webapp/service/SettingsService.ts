import Storage from "sap/ui/util/Storage";

/**
 * Service for managing local dashboard settings like the AdGuard Home base URL
 * and query scan depth.
 * @namespace ui5.aghd.service
 */
export default class SettingsService {
	private static instance: SettingsService;
	private storage: Storage;
	private readonly STORAGE_KEY_BASE_URL = "aghd_base_url";
	private readonly STORAGE_KEY_SCAN_DEPTH = "dashboard_scan_depth";
	private readonly DEFAULT_SCAN_DEPTH = 1000;

	// In-memory cache to avoid synchronous storage access
	private _baseUrl: string | null = null;
	private _scanDepth: number | null = null;

	private constructor() {
		this.storage = new Storage(Storage.Type.local, "aghd_settings");

		// Cross-tab sync: Invalidate in-memory cache when another tab changes settings
		window.addEventListener("storage", (e) => {
			if (e.key === this.STORAGE_KEY_BASE_URL) this._baseUrl = null;
			if (e.key === this.STORAGE_KEY_SCAN_DEPTH) this._scanDepth = null;
		});
	}

	public static getInstance(): SettingsService {
		if (!SettingsService.instance) {
			SettingsService.instance = new SettingsService();
		}
		return SettingsService.instance;
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
			if (
				error instanceof Error &&
				(error.message.includes("Invalid Base URL") ||
					error.message.includes("credentials") ||
					error.message.includes("query parameters"))
			) {
				throw error;
			}
			throw new Error("Invalid URL format.", { cause: error });
		}

		this._baseUrl = cleanUrl;
		this.storage.put(this.STORAGE_KEY_BASE_URL, cleanUrl);
	}

	public getDashboardScanDepth(): number {
		if (this._scanDepth !== null) {
			return this._scanDepth;
		}
		const val = this.storage.get(this.STORAGE_KEY_SCAN_DEPTH);
		this._scanDepth = typeof val === "number" ? val : Number(val) || this.DEFAULT_SCAN_DEPTH;
		return this._scanDepth;
	}

	public setDashboardScanDepth(depth: number): void {
		if (depth < 500 || depth > 50000) {
			throw new Error("Scan depth must be between 500 and 50000.");
		}
		this._scanDepth = depth;
		this.storage.put(this.STORAGE_KEY_SCAN_DEPTH, depth);
	}
}
