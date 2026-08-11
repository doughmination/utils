import {
    ChatInputCommandInteraction,
    SlashCommandSubcommandBuilder,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js';
import { genshinAPI, GenshinNotFoundError } from '../../utils/genshinAPI';
import { resolveGenshinAccount, GENSHIN_ACCOUNT_CHOICES } from '../../config/genshin';

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('stats')
        .setDescription('Quick overview of an account (level, owned count, etc.)')
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
            const untracked = roster.owned_count - roster.tracked_count;

            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle(`📊 Genshin Stats — ${roster.nickname ?? account.label}`)
                .addFields(
                    { name: 'UID', value: roster.uid, inline: true },
                    { name: 'Adventure Rank', value: roster.player_level ? `${roster.player_level}` : 'Unknown', inline: true },
                    { name: 'Account', value: account.label, inline: true },
                    { name: 'Owned', value: `${roster.owned_count} / ${roster.total_count}`, inline: true },
                    { name: 'Tracked live', value: `${roster.tracked_count}`, inline: true },
                    { name: 'Last known only', value: `${untracked}`, inline: true },
                )
                .setTimestamp(roster.updated_at || Date.now());

            const notes: string[] = [];
            if (roster.partial) {
                notes.push('⚠️ Only pinned showcase characters visible — enable "Display all your characters" in-game.');
            }
            if (roster.stale) {
                notes.push('ℹ️ Served from the ownership ledger (Enka unavailable) — figures are last-known.');
            }
            if (notes.length > 0) {
                embed.setDescription(notes.join('\n'));
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            const notFound = error instanceof GenshinNotFoundError;
            const message = notFound
                ? `No Enka.Network record for the ${account.label} account. The profile may be private, unindexed, or the UID is wrong.`
                : error instanceof Error ? error.message : 'Unknown error occurred';

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle(notFound ? '❓ Account Not Found' : '❌ Error')
                        .setDescription(message)
                        .setTimestamp(),
                ],
            });
        }
    },
};
