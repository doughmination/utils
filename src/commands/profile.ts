import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
} from 'discord.js';
import { discordProfileAPI, DiscordProfileNotFoundError } from '../utils/discordProfileAPI';

const STATUS_EMOJI: Record<string, string> = {
    online: '🟢',
    idle: '🌙',
    dnd: '⛔',
    offline: '⚪',
};

/**
 * Standalone /profile command — fetches a user's Discord profile via the
 * Doughmination Discord API (`/v2/discord/users/:id`), which surfaces fields
 * the bot's own Discord connection can't see: bio, pronouns, banner,
 * connected accounts, timezone, and full badge list.
 */
export const command = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription("Get a user's Discord profile")
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to look up (defaults to you)')
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user') ?? interaction.user;

        try {
            const profile = await discordProfileAPI.getUser(target.id);
            const { user, presence, badges, connected_accounts, timezone } = profile;

            const displayName = user.display_name || user.global_name || user.username;
            const statusEmoji = presence ? STATUS_EMOJI[presence.status] ?? '⚪' : '⚪';

            const embed = new EmbedBuilder()
                .setColor(user.accent_color ?? 0x5865F2)
                .setAuthor({ name: `${displayName} (@${user.username})`, iconURL: user.avatar_url })
                .setThumbnail(user.avatar_url)
                .addFields(
                    { name: 'User ID', value: user.id, inline: true },
                    { name: 'Status', value: `${statusEmoji} ${presence?.status ?? 'unknown'}`, inline: true }
                )
                .setTimestamp(profile.updated_at);

            if (user.banner_url) {
                embed.setImage(user.banner_url);
            }

            if (user.pronouns) {
                embed.addFields({ name: 'Pronouns', value: user.pronouns, inline: true });
            }

            if (user.bio) {
                embed.addFields({ name: 'Bio', value: user.bio.slice(0, 1024) });
            }

            if (user.premium) {
                embed.addFields({ name: 'Nitro', value: user.premium.type, inline: true });
            }

            if (user.clan) {
                embed.addFields({ name: 'Clan Tag', value: user.clan.tag, inline: true });
            }

            if (timezone) {
                embed.addFields({ name: 'Timezone', value: timezone.timezone, inline: true });
            }

            if (badges.length > 0) {
                const badgeList = badges.slice(0, 10).map(b => b.description).join(', ');
                embed.addFields({ name: `Badges [${badges.length}]`, value: badgeList });
            }

            if (connected_accounts.length > 0) {
                const socials = connected_accounts
                    .filter(a => a.type !== 'domain')
                    .slice(0, 10)
                    .map(a => `${a.type}: ${a.name}`)
                    .join('\n');
                if (socials) {
                    embed.addFields({ name: 'Connected Accounts', value: socials });
                }
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error instanceof DiscordProfileNotFoundError) {
                await interaction.editReply({
                    content: `❌ No Discord profile found for <@${target.id}>.`,
                });
                return;
            }

            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ Could not fetch profile')
                .setDescription(message)
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
