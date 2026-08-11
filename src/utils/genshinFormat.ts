import type { GenshinStat } from './genshinAPI';

/** Element -> a small emoji, for nicer roster grouping. Falls back to a dot. */
const ELEMENT_EMOJI: Record<string, string> = {
    Pyro: '🔥',
    Hydro: '💧',
    Anemo: '🌀',
    Electro: '⚡',
    Cryo: '❄️',
    Geo: '🪨',
    Dendro: '🌿',
    All: '✨', // Traveler
};

/** Stable display order for element groups. */
export const ELEMENT_ORDER = [
    'Pyro',
    'Hydro',
    'Anemo',
    'Electro',
    'Cryo',
    'Geo',
    'Dendro',
    'All',
];

export function elementEmoji(element: string): string {
    return ELEMENT_EMOJI[element] ?? '•';
}

/** Rarity as star glyphs, e.g. 5 -> "★★★★★". */
export function stars(rarity: number): string {
    return '★'.repeat(Math.max(0, rarity));
}

/** Render one stat line as "Name: value" (with % when appropriate). */
export function formatStat(stat: GenshinStat | null): string | null {
    if (!stat) return null;
    // Enka reports percent stats already scaled (e.g. 46.6), so just append %.
    const value = stat.is_percent ? `${stat.value.toFixed(1)}%` : Math.round(stat.value).toString();
    return `${stat.name}: ${value}`;
}

/**
 * Join a list of lines into an embed field value, capped at Discord's 1024
 * char limit. If it overflows, keep as many whole lines as fit and append a
 * "…and N more" tail.
 */
export function capFieldLines(lines: string[]): string {
    if (lines.length === 0) return '—';
    const LIMIT = 1024;
    const kept: string[] = [];
    let length = 0;
    for (let i = 0; i < lines.length; i++) {
        const tail = `\n…and ${lines.length - i} more`;
        const addition = (kept.length ? 1 : 0) + lines[i].length; // +1 for newline
        if (length + addition + tail.length > LIMIT) {
            kept.push(`…and ${lines.length - i} more`);
            break;
        }
        kept.push(lines[i]);
        length += addition;
    }
    return kept.join('\n');
}
