/**
 * Hardcoded Genshin accounts for the /genshin command.
 * These are the operator's own UIDs — main and alt.
 */

export type GenshinAccountKey = 'main' | 'alt';

export interface GenshinAccount {
    label: string;
    uid: string;
}

export const GENSHIN_ACCOUNTS: Record<GenshinAccountKey, GenshinAccount> = {
    main: {
        label: 'Main',
        uid: '691386457',
    },
    alt: {
        label: 'Alt',
        uid: '640990645',
    },
};

/** Account used when the command is invoked without an explicit choice. */
export const DEFAULT_GENSHIN_ACCOUNT: GenshinAccountKey = 'main';

/** Resolve an account option value (or undefined) to a concrete account. */
export function resolveGenshinAccount(key?: string | null): GenshinAccount {
    if (key && key in GENSHIN_ACCOUNTS) {
        return GENSHIN_ACCOUNTS[key as GenshinAccountKey];
    }
    return GENSHIN_ACCOUNTS[DEFAULT_GENSHIN_ACCOUNT];
}

/** Choices array for a SlashCommand string option. */
export const GENSHIN_ACCOUNT_CHOICES = (
    Object.entries(GENSHIN_ACCOUNTS) as [GenshinAccountKey, GenshinAccount][]
).map(([value, account]) => ({
    name: account.label,
    value,
}));
