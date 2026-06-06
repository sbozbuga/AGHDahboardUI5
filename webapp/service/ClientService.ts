import BaseApiService from "./BaseApiService";
import { Constants } from "../model/Constants";

import type { RawDHCPStatus } from "../model/AdGuardTypes";
import Log from "sap/base/Log";

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

export interface ClientMappingSource {
	name: string;
	ids?: string[] | string;
	ip?: string;
	mac?: string;
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
	private static readonly BRACKET_REGEX = /[[\]]/g;

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
			const data = await this._request<RawClientsData>(Constants.ApiEndpoints.Clients);
			this._clients = Array.isArray(data.clients) ? data.clients : [];

			// Map configured clients
			for (const c of this._clients) {
				try {
					this._mapClient(c, true);
				} catch {
					// Defensive: skip clients with malformed data (e.g. non-iterable ids)
				}
			}

			// Map DHCP leases
			await this._loadDHCPClients();

			// Map auto-detected clients if available
			if (data.auto_clients && Array.isArray(data.auto_clients)) {
				for (const c of data.auto_clients) {
					try {
						this._mapClient(c, false);
					} catch {
						// Defensive: skip auto_clients with malformed data
					}
				}
			}

			this._lastFetchTime = now;
			return this._clients;
		} catch (error) {
			// Security Enhancement: Use framework logging to prevent data leakage in browser console.
			Log.error("Failed to fetch clients", (error as Error).message || "Unknown error");
			return [];
		}
	}

	/**
	 * Normalizes and maps all identifiers (IPs, MACs, ClientIDs) of a client to its name in the internal client map.
	 * @private
	 * @param {ClientMappingSource} c - The client object to map.
	 * @param {boolean} [overwrite=false] - Whether to overwrite existing mappings.
	 */
	private _mapClient(c: ClientMappingSource, overwrite = false): void {
		if (!c || !c.name) return;

		const idsToMap: string[] = [];

		// Handle c.ids if it is an array
		if (Array.isArray(c.ids)) {
			for (const id of c.ids) {
				if (typeof id === "string") {
					idsToMap.push(id);
				}
			}
		} else if (typeof c.ids === "string" && c.ids) {
			// Fallback: c.ids is a string
			idsToMap.push(c.ids);
		}

		// Handle c.ip if it exists (highly common for auto_clients)
		if (typeof c.ip === "string" && c.ip) {
			idsToMap.push(c.ip);
		}

		// Handle c.mac if it exists (common for auto_clients)
		if (typeof c.mac === "string" && c.mac) {
			idsToMap.push(c.mac);
		}

		// Map all gathered identifiers
		for (const id of idsToMap) {
			const normalizedId = id.replace(ClientService.BRACKET_REGEX, "").toLowerCase();
			if (overwrite || !this._clientMap.has(normalizedId)) {
				this._clientMap.set(normalizedId, c.name);
			}
		}
	}

	private async _loadDHCPClients(): Promise<void> {
		try {
			const dhcpData = await this._request<RawDHCPStatus>(Constants.ApiEndpoints.DHCPStatus);
			if (dhcpData && dhcpData.enabled) {
				const v4Leases = (dhcpData as { v4?: { leases: unknown[] } }).v4?.leases || [];
				const v4Static = (dhcpData as { v4?: { static_leases: unknown[] } }).v4?.static_leases || [];
				const allLeases = [...(dhcpData.leases || []), ...(dhcpData.static_leases || []), ...v4Leases, ...v4Static] as {
					hostname?: string;
					ip: string;
					mac: string;
				}[];

				// Optimization: Native for...of loops eliminate callback allocation and invocation overhead associated with .forEach()
				for (const lease of allLeases) {
					if (lease.hostname) {
						const normalizedIp = lease.ip.toLowerCase();
						const normalizedMac = lease.mac.toLowerCase();
						// Map IP and MAC to hostname if not already present
						if (!this._clientMap.has(normalizedIp)) {
							this._clientMap.set(normalizedIp, lease.hostname);
						}
						if (!this._clientMap.has(normalizedMac)) {
							this._clientMap.set(normalizedMac, lease.hostname);
						}
					}
				}
			}
		} catch (error) {
			// DHCP might not be enabled or supported, ignore
			Log.warning("Failed to fetch DHCP leases", (error as Error).message || "Unknown error");
		}
	}

	/**
	 * Returns a client name for a given ID (IP, MAC, ClientID) if known.
	 * Returns the ID itself if no name is found.
	 */
	public getName(id: string): string {
		if (!id) return "";
		const normalizedId = id.replace(ClientService.BRACKET_REGEX, "").toLowerCase();
		return this._clientMap.get(normalizedId) || id;
	}

	/**
	 * Returns true if the client name is known (resolved).
	 */
	public isResolved(id: string): boolean {
		if (!id) return false;
		const normalizedId = id.replace(ClientService.BRACKET_REGEX, "").toLowerCase();
		return this._clientMap.has(normalizedId);
	}

	public clearCache(): void {
		this._clients = [];
		this._clientMap.clear();
		this._lastFetchTime = 0;
	}
}
