import BaseApiService from "./BaseApiService";
import { Constants } from "../model/Constants";
import SettingsService from "./SettingsService";
import { RawDHCPStatus } from "../model/AdGuardTypes";

export interface AdGuardClient {
	name: string;
	ids: string[];
	use_global_settings?: boolean;
	filtering_enabled?: boolean;
	parental_enabled?: boolean;
	safebrowsing_enabled?: boolean;
	use_global_blocked_services?: boolean;
	blocked_services?: string[];
	upstreams?: string[];
	tags?: string[];
}

export interface RawClientsData {
	clients: AdGuardClient[];
	auto_clients?: AdGuardClient[];
}

/**
 * Service for managing AdGuard Home Client data and name resolution.
 * @namespace ui5.aghd.service
 */
export default class ClientService extends BaseApiService {
	private static instance: ClientService;
	private _clientMap = new Map<string, string>();
	private _clients: AdGuardClient[] = [];
	private _lastFetchTime = 0;
	private static readonly CACHE_DURATION = 300000; // 5 minutes

	public static getInstance(): ClientService {
		if (!ClientService.instance) {
			ClientService.instance = new ClientService();
		}
		return ClientService.instance;
	}

	/**
	 * Fetches all clients from AdGuard Home and builds an ID-to-Name map.
	 */
	public async getClients(forceFetch = false): Promise<AdGuardClient[]> {
		const now = Date.now();
		if (!forceFetch && this._clients.length > 0 && now - this._lastFetchTime < ClientService.CACHE_DURATION) {
			return this._clients;
		}

		try {
			this._clientMap.clear();
			this._loadCustomClients();
			const data = await this._request<RawClientsData>(Constants.ApiEndpoints.Clients);
			this._clients = data.clients || [];

			// Map configured clients
			this._clients.forEach((c) => {
				c.ids.forEach((id) => {
					this._clientMap.set(id, c.name);
				});
			});

			// Map auto-detected clients if available
			if (data.auto_clients) {
				data.auto_clients.forEach((c) => {
					c.ids.forEach((id) => {
						// Don't overwrite configured clients
						if (!this._clientMap.has(id)) {
							this._clientMap.set(id, c.name);
						}
					});
				});
			}

			// Map DHCP leases
			await this._loadDHCPClients();

			this._lastFetchTime = now;
			return this._clients;
		} catch (error) {
			this._loadCustomClients(); // Still load local even if API fails
			console.error("Failed to fetch clients", (error as Error).message || "Unknown error");
			return [];
		}
	}

	private _loadCustomClients(): void {
		const raw = SettingsService.getInstance().getCustomClients();
		if (!raw) return;

		const lines = raw.split("\n");
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			// Support space or tab separation: "IP Name" or "IP   Name"
			const parts = trimmed.split(/\s+/);
			if (parts.length >= 2) {
				const id = parts[0];
				const name = parts.slice(1).join(" ");
				this._clientMap.set(id, name);
			}
		}
	}

	private async _loadDHCPClients(): Promise<void> {
		try {
			const dhcpData = await this._request<RawDHCPStatus>(Constants.ApiEndpoints.DHCPStatus);
			if (dhcpData && dhcpData.enabled) {
				const allLeases = [...(dhcpData.leases || []), ...(dhcpData.static_leases || [])];
				allLeases.forEach((lease) => {
					if (lease.hostname) {
						// Map IP and MAC to hostname if not already present
						if (!this._clientMap.has(lease.ip)) {
							this._clientMap.set(lease.ip, lease.hostname);
						}
						if (!this._clientMap.has(lease.mac)) {
							this._clientMap.set(lease.mac, lease.hostname);
						}
					}
				});
			}
		} catch (error) {
			// DHCP might not be enabled or supported, ignore
			console.warn("Failed to fetch DHCP leases", (error as Error).message || "Unknown error");
		}
	}

	/**
	 * Returns a client name for a given ID (IP, MAC, ClientID) if known.
	 * Returns the ID itself if no name is found.
	 */
	public getName(id: string): string {
		return this._clientMap.get(id) || id;
	}

	/**
	 * Returns true if the client name is known (resolved).
	 */
	public isResolved(id: string): boolean {
		return this._clientMap.has(id);
	}

	public clearCache(): void {
		this._clients = [];
		this._clientMap.clear();
		this._lastFetchTime = 0;
	}
}
