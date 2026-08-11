import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
} from 'discord.js';
import QRCode from 'qrcode';

/**
 * Standalone /qr command — generates a QR code PNG from text or a URL and
 * returns it as an image attachment. Uses the `qrcode` library (pure JS, no
 * external service), so nothing leaves the bot.
 */
export const command = {
    data: new SlashCommandBuilder()
        .setName('qr')
        .setDescription('Generate a QR code from text or a URL')
        .addStringOption(option =>
            option
                .setName('text')
                .setDescription('The text or URL to encode')
                .setRequired(true)
                .setMaxLength(2000)
        )
        .addIntegerOption(option =>
            option
                .setName('size')
                .setDescription('Image size in pixels (128–1024, default 512)')
                .setMinValue(128)
                .setMaxValue(1024)
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const text = interaction.options.getString('text', true);
        const size = interaction.options.getInteger('size') ?? 512;

        try {
            const buffer = await QRCode.toBuffer(text, {
                type: 'png',
                width: size,
                margin: 2,
                errorCorrectionLevel: 'M',
                color: { dark: '#000000ff', light: '#ffffffff' },
            });

            const attachment = new AttachmentBuilder(buffer, { name: 'qrcode.png' });

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🔳 QR Code')
                .setImage('attachment://qrcode.png')
                .setFooter({ text: `${size}×${size}px` })
                .setTimestamp();

            // Show the encoded content inline only when it's short enough to be useful.
            if (text.length <= 200) {
                embed.setDescription(`\`\`\`\n${text}\n\`\`\``);
            }

            await interaction.editReply({ embeds: [embed], files: [attachment] });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            const tooBig = /too big|too long|code length overflow/i.test(message);

            const errorEmbed = new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('❌ Could not generate QR code')
                .setDescription(
                    tooBig
                        ? 'That text is too long to fit in a QR code. Try shortening it (long URLs can be run through a link shortener first).'
                        : message
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
