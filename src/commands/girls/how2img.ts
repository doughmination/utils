import {
    ChatInputCommandInteraction,
    SlashCommandSubcommandBuilder
} from 'discord.js';

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('how2img')
        .setDescription('How to get image perms in the Girls Discord'),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply("All image permissions are locked behind the level 5 role, however you may use <#1498840148824031303> to show images if relevant to the conversation.");
    }
};