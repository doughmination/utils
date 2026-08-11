import axios, { AxiosInstance } from 'axios';

/**
 * Client for the Doughmination Genshin roster endpoints.
 *
 * These live at the WORKER ROOT (`/v2/genshin/...`), NOT under `/v2/plural`,
 * and are a public Enka.Network passthrough — no auth token is required.
 * That's why this is a separate client from doughAPI (different base path,
 * no Authorization header).
 *
 * Envelope: every response is `{ success: true, data }` on success, or
 * `{ success: false, error: { code, message } }` on failure.
 */

// ---- Response types (mirror the API's Unified* Genshin shapes) ------------

export interface GenshinStat {
    name: string;
    value: number;
    is_percent: boolean;
}

export interface GenshinWeapon {
    id: string;
    name: string;
    rarity: number;
    level: number;
    ascension: number;
    refinement: number;
    base_stat: GenshinStat | null;
    sub_stat: GenshinStat | null;
    icon_url: string;
}

export type GenshinArtifactSlot = 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet';

export interface GenshinArtifact {
    id: string;
    name: string;
    set_name: string;
    slot: GenshinArtifactSlot;
    rarity: number;
    level: number;
    main_stat: GenshinStat | null;
    sub_stats: GenshinStat[];
    icon_url: string;
}

export interface GenshinCharacter {
    id: string;
    name: string;
    element: string;
    rarity: number;
    icon_url: string;
    owned: boolean;
    level: number | null;
    tracked: boolean;
    last_seen: number | null;
}

export interface GenshinRoster {
    uid: string;
    nickname: string | null;
    player_level: number | null;
    partial: boolean;
    stale: boolean;
    owned_count: number;
    tracked_count: number;
    total_count: number;
    characters: GenshinCharacter[];
    updated_at: number;
}

export interface GenshinCharacterDetail extends GenshinCharacter {
    constellation: number;
    friendship: number | null;
    weapon: GenshinWeapon | null;
    artifacts: GenshinArtifact[];
    updated_at: number;
}

interface ApiEnvelope<T> {
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
}

/** Thrown when Enka has no record of the UID (private / unindexed / typo). */
export class GenshinNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GenshinNotFoundError';
    }
}

class GenshinAPIClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: 'https://doughmination.uk/v2/genshin',
            headers: {
                'User-Agent': 'CloveShortcuts/1.0.0',
                'Content-Type': 'application/json',
            },
            timeout: 15000, // Enka upstream can be a little slow on a cold cache
        });
    }

    /** Full owned/not-owned roster (with levels) for a UID. */
    async getRoster(uid: string, force = false): Promise<GenshinRoster> {
        return this.get<GenshinRoster>(`/roster/${uid}${force ? '?fresh=1' : ''}`);
    }

    /** Full detail (level, constellation, friendship, weapon, artifacts). */
    async getCharacter(uid: string, heroId: string, force = false): Promise<GenshinCharacterDetail> {
        return this.get<GenshinCharacterDetail>(`/roster/${uid}/${heroId}${force ? '?fresh=1' : ''}`);
    }

    private async get<T>(path: string): Promise<T> {
        try {
            const response = await this.client.get<ApiEnvelope<T>>(path);
            if (!response.data.success || response.data.data === undefined) {
                throw new Error(response.data.error?.message || 'Unknown API error');
            }
            return response.data.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const body = error.response?.data as ApiEnvelope<unknown> | undefined;
                const code = body?.error?.code;
                const message = body?.error?.message || error.message;
                if (error.response?.status === 404 || code === 'not_found') {
                    throw new GenshinNotFoundError(message);
                }
                throw new Error(`Genshin API error: ${message}`);
            }
            throw error;
        }
    }
}

export const genshinAPI = new GenshinAPIClient();
