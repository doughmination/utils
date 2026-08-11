import {
    ChatInputCommandInteraction,
    SlashCommandSubcommandBuilder,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js';
import { genshinAPI, GenshinNotFoundError } from '../../utils/genshinAPI';
import { resolveGenshinAccount, GENSHIN_ACCOUNT_CHOICES } from '../../config/genshin';
import { ELEMENT_ORDER, elementEmoji, capFieldLines } from '../../utils/genshinFormat';

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('roster')
        .setDescription('List the characters you own, grouped by element')
        .addStringOption(option =>
            option
                .setName('account')
                .setDescription('Which account (defaults to Main)')
                .setRequired(false)
                .addChoices(...GENSHIN_ACCOUNT_CHOICES)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const account = resolveGenshinAccount(interaction.options.getString('account'));

        try {
            const roster = await genshinAPI.getRoster(account.uid);
            const owned = roster.characters.filter(c => c.owned);

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`🎮 Genshin Roster — ${roster.nickname ?? account.label}`)
                .setDescription(
                    `**UID:** ${roster.uid}` +
                    (roster.player_level ? ` • **AR ${roster.player_level}**` : '') +
                    `\n**Owned:** ${roster.owned_count}/${roster.total_count} characters` +
                    ` • **Tracked live:** ${roster.tracked_count}`
                )
                .setTimestamp(roster.updated_at || Date.now());

            // Group owned characters by element in a stable order.
            for (const element of ELEMENT_ORDER) {
                const inElement = owned
                    .filter(c => c.element === element)
                    .sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || a.name.localeCompare(b.name));

                if (inElement.length === 0) continue;

                const lines = inElement.map(c => {
                    const level = c.level != null ? `Lv.${c.level}` : 'Lv.?';
                    const flag = c.tracked ? '' : ' *(last known)*';
                    return `${c.name} — ${level}${flag}`;
                });

                embed.addFields({
                    name: `${elementEmoji(element)} ${element === 'All' ? 'Traveler' : element} (${inElement.length})`,
                    value: capFieldLines(lines),
                    inline: true,
                });
            }

            if (roster.partial) {
                embed.addFields({
                    name: '⚠️ Partial data',
                    value:
                        'Only your pinned showcase characters are visible. Enable ' +
                        '**"Display all your characters"** in-game (Character Showcase) ' +
                        'for the full roster.',
                    inline: false,
                });
            }

            if (roster.stale) {
                embed.setFooter({ text: 'Served from the ownership ledger — Enka was unavailable, levels are last-known.' });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ embeds: [buildErrorEmbed(error, account.label)] });
        }
    },
};

function buildErrorEmbed(error: unknown, accountLabel: string): EmbedBuilder {
    const notFound = error instanceof GenshinNotFoundError;
    const message = notFound
        ? `No Enka.Network record for the ${accountLabel} account. The profile may be private, unindexed, or the UID is wrong.`
        : error instanceof Error
            ? error.message
            : 'Unknown error occurred';

    return new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(notFound ? '❓ Roster Not Found' : '❌ Error')
        .setDescription(message)
        .setTimestamp();
}
