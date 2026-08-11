import axios, { AxiosInstance } from 'axios';

/**
 * Client for the Doughmination Discord profile endpoint.
 *
 * Lives at the WORKER ROOT (`/v2/discord/...`), NOT under `/v2/plural` —
 * a public passthrough of Discord's profile data (including fields the
 * regular bot gateway/REST API doesn't expose, like bio, pronouns, and
 * connected accounts). No auth token required, same as genshinAPI.
 *
 * Envelope: `{ success: true, data }` on success, or
 * `{ success: false, error: { code, message } }` on failure.
 */

export interface DiscordProfileFlag {
    id: string;
    name: string;
}

export interface DiscordProfileClan {
    guild_id: string;
    tag: string;
    badge: string;
    badge_url: string;
}

export interface DiscordProfilePremium {
    type_id: number;
    type: string;
    since: string | null;
    guild_since: string | null;
}

export interface DiscordProfileUser {
    id: string;
    username: string;
    global_name: string | null;
    display_name: string | null;
    legacy_username: string | null;
    avatar: string | null;
    avatar_url: string;
    banner: string | null;
    banner_url: string | null;
    accent_color: number | null;
    public_flags: number;
    flags: DiscordProfileFlag[];
    clan: DiscordProfileClan | null;
    bio: string | null;
    pronouns: string | null;
    premium: DiscordProfilePremium | null;
}

export interface DiscordProfilePresence {
    status: string;
    online: boolean;
    activities: unknown[];
    custom_status: string | null;
    listening_to_spotify: boolean;
    spotify: unknown | null;
}

export interface DiscordProfileBadge {
    id: string;
    description: string;
    icon: string;
    icon_url: string;
    link: string | null;
    source: string;
}

export interface DiscordConnectedAccount {
    type: string;
    id: string;
    name: string;
    verified: boolean;
}

export interface DiscordProfile {
    user: DiscordProfileUser;
    presence: DiscordProfilePresence | null;
    badges: DiscordProfileBadge[];
    connected_accounts: DiscordConnectedAccount[];
    pronoundb: string | null;
    timezone: { timezone: string; local_time: string; utc_offset_minutes: number } | null;
    updated_at: number;
}

interface ApiEnvelope<T> {
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
}

/** Thrown when the API has no record of the user (not found / invalid ID). */
export class DiscordProfileNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DiscordProfileNotFoundError';
    }
}

class DiscordProfileAPIClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: 'https://doughmination.uk/v2/discord',
            headers: {
                'User-Agent': 'CloveShortcuts/1.0.0',
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
    }

    /** Full Discord profile (user, presence, badges, connections) for a user ID. */
    async getUser(userId: string): Promise<DiscordProfile> {
        try {
            const response = await this.client.get<ApiEnvelope<DiscordProfile>>(`/users/${userId}`);
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
                    throw new DiscordProfileNotFoundError(message);
                }
                throw new Error(`Discord profile API error: ${message}`);
            }
            throw error;
        }
    }
}

export const discordProfileAPI = new DiscordProfileAPIClient();
