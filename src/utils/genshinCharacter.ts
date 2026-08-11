import {
    ChatInputCommandInteraction,
    SlashCommandSubcommandBuilder,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js';
import { genshinAPI, GenshinNotFoundError, GenshinCharacter, GenshinCharacterDetail } from './genshinAPI';
import { GenshinAccountKey, GENSHIN_ACCOUNTS } from '../config/genshin';
import { stars, formatStat, elementEmoji } from './genshinFormat';

/**
 * The two per-account character subcommands (/genshin main-chara,
 * /genshin alt-chara) are built from this one factory. The account is baked
 * into the subcommand rather than passed as an option, so autocomplete always
 * knows exactly which UID to search — the two accounts hold different rosters.
 */

/** Maps a subcommand name to the account it targets (used by autocomplete). */
export const ACCOUNT_BY_SUBCOMMAND: Record<string, GenshinAccountKey> = {
    'main-chara': 'main',
    'alt-chara': 'alt',
};

export function makeCharacterCommand(subName: string, accountKey: GenshinAccountKey) {
    const account = GENSHIN_ACCOUNTS[accountKey];

    return {
        data: new SlashCommandSubcommandBuilder()
            .setName(subName)
            .setDescription(`Character detail on the ${account.label} account`)
            .addStringOption(option =>
                option
                    .setName('name')
                    .setDescription('Character name')
                    .setRequired(true)
                    .setAutocomplete(true)
            ),

        async execute(interaction: ChatInputCommandInteraction) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const query = interaction.options.getString('name', true);

            try {
                // Resolve the name to an id via the roster (full catalog).
                const roster = await genshinAPI.getRoster(account.uid);
                const match = findCharacter(roster.characters, query);

                if (!match) {
                    await interaction.editReply({
                        content: `❌ No character matching "${query}" was found in the catalog.`,
                    });
                    return;
                }

                const detail = await genshinAPI.getCharacter(account.uid, match.id);
                await interaction.editReply({
                    embeds: [buildCharacterEmbed(detail, account.label)],
                });
            } catch (error) {
                const notFound = error instanceof GenshinNotFoundError;
                const message = notFound
                    ? `No Enka.Network record for the ${account.label} account. The profile may be private, unindexed, or the UID is wrong.`
                    : error instanceof Error ? error.message : 'Unknown error occurred';

                await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xED4245)
                            .setTitle(notFound ? '❓ Not Found' : '❌ Error')
                            .setDescription(message)
                            .setTimestamp(),
                    ],
                });
            }
        },
    };
}

const SLOT_LABELS: Record<string, string> = {
    flower: 'Flower',
    plume: 'Plume',
    sands: 'Sands',
    goblet: 'Goblet',
    circlet: 'Circlet',
};

function slotLabel(slot: string): string {
    return SLOT_LABELS[slot] ?? slot;
}

/** Case-insensitive exact match, then first partial match. */
function findCharacter(characters: GenshinCharacter[], query: string): GenshinCharacter | null {
    const q = query.toLowerCase();
    const exact = characters.find(c => c.name.toLowerCase() === q);
    if (exact) return exact;
    const partial = characters.filter(c => c.name.toLowerCase().includes(q));
    return partial.length > 0 ? partial[0] : null;
}

export function buildCharacterEmbed(detail: GenshinCharacterDetail, accountLabel: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setColor(detail.owned ? 0x5865F2 : 0x99AAB5)
        .setTitle(`${elementEmoji(detail.element)} ${detail.name}`)
        .setDescription(`${stars(detail.rarity)} • ${detail.element} • ${accountLabel} account`)
        .setTimestamp(detail.updated_at || Date.now());

    if (detail.icon_url) embed.setThumbnail(detail.icon_url);

    if (!detail.owned) {
        embed.addFields({ name: 'Ownership', value: '❌ Not owned on this account.', inline: false });
        return embed;
    }

    embed.addFields(
        { name: 'Level', value: detail.level != null ? `${detail.level}` : 'Unknown', inline: true },
        { name: 'Constellation', value: `C${detail.constellation}`, inline: true },
        { name: 'Friendship', value: detail.friendship != null ? `${detail.friendship}` : '—', inline: true },
    );

    if (!detail.tracked) {
        embed.addFields({
            name: 'ℹ️ Last known',
            value: 'This character isn\'t in the live showcase right now, so the build below may be missing. Level/constellation are last-known values.',
            inline: false,
        });
    }

    if (detail.weapon) {
        const w = detail.weapon;
        const weaponStats = [formatStat(w.base_stat), formatStat(w.sub_stat)]
            .filter((s): s is string => s !== null)
            .join(' • ');
        embed.addFields({
            name: '⚔️ Weapon',
            value:
                `**${w.name}** ${stars(w.rarity)}\n` +
                `Lv.${w.level} • R${w.refinement}` +
                (weaponStats ? `\n${weaponStats}` : ''),
            inline: false,
        });
    }

    if (detail.artifacts.length > 0) {
        const artifactLines = detail.artifacts.map(a => {
            const main = formatStat(a.main_stat);
            return `**${slotLabel(a.slot)}** +${a.level} — ${a.set_name}` + (main ? `\n  ${main}` : '');
        });
        embed.addFields({
            name: `🛡️ Artifacts (${detail.artifacts.length})`,
            value: artifactLines.join('\n'),
            inline: false,
        });
    } else if (detail.tracked) {
        embed.addFields({
            name: '🛡️ Artifacts',
            value: 'No artifact data — pin this character to the in-game showcase to expose their full build.',
            inline: false,
        });
    }

    return embed;
}
