import { Interaction, EmbedBuilder } from 'discord.js';

/**
 * Authorization levels for the bot
 * 
 * OWNER: Full access to all commands including sensitive operations
 * FRIEND: Access to non-sensitive commands only
 */

/** Owner - Full access (you) */
const OWNER_ID = process.env.OWNER_ID;

if (!OWNER_ID || OWNER_ID === 'bot_owner_id') {
  throw new Error('OWNER_ID is not defined in the environment variables.');
}


/** Friends - Limited access (non-sensitive commands only) */
const FRIEND_IDS = process.env.FRIEND_IDS
  ? process.env.FRIEND_IDS.split(',').map(id => id.trim())
  : [];

/** Commands that require owner-level access */
const OWNER_ONLY_COMMANDS: string[] = [
    // No longer blocking entire 'dough' command
];

/** Subcommands that require owner-level access (format: "command:subcommand") */
const OWNER_ONLY_SUBCOMMANDS = [
    'dough:add',      // Only owner can add fronters
    'dough:remove',   // Only owner can remove fronters
    'dough:health',   // Only owner can check API health
];

/** Subcommands that friends CAN use (format: "command:subcommand") */
const FRIEND_ALLOWED_SUBCOMMANDS = [
    'dough:check',    // Friends can check who's fronting
];

export enum AuthLevel {
    UNAUTHORIZED = 0,
    FRIEND = 1,
    OWNER = 2
}

/**
 * Get the authorization level for a user
 */
export function getAuthLevel(userId: string): AuthLevel {
    if (userId === OWNER_ID) {
        return AuthLevel.OWNER;
    }
    if (FRIEND_IDS.includes(userId)) {
        return AuthLevel.FRIEND;
    }
    return AuthLevel.UNAUTHORIZED;
}

/**
 * Check if a user is authorized to use a specific command/subcommand
 */
export function isAuthorizedForCommand(
    userId: string,
    commandName: string,
    subcommandName?: string
): boolean {
    const authLevel = getAuthLevel(userId);

    // Unauthorized users can't use anything
    if (authLevel === AuthLevel.UNAUTHORIZED) {
        return false;
    }

    // Owner can use everything
    if (authLevel === AuthLevel.OWNER) {
        return true;
    }

    // For friends, check subcommand-level permissions
    if (authLevel === AuthLevel.FRIEND) {
        // Check if the entire command is owner-only
        if (OWNER_ONLY_COMMANDS.includes(commandName)) {
            return false;
        }

        // If there's a subcommand, check subcommand-level permissions
        if (subcommandName) {
            const fullSubcommandName = `${commandName}:${subcommandName}`;

            // If it's explicitly owner-only, deny
            if (OWNER_ONLY_SUBCOMMANDS.includes(fullSubcommandName)) {
                return false;
            }

            // If it's explicitly allowed for friends, allow
            if (FRIEND_ALLOWED_SUBCOMMANDS.includes(fullSubcommandName)) {
                return true;
            }

            // If it's part of a command with owner-only subcommands but not explicitly allowed, deny
            // This is a safelist approach - friends can only use what's explicitly allowed
            const hasOwnerOnlySubcommands = OWNER_ONLY_SUBCOMMANDS.some(
                sub => sub.startsWith(`${commandName}:`)
            );
            if (hasOwnerOnlySubcommands) {
                return false;
            }
        }

        // Friends can use everything else
        return true;
    }

    return false;
}

/**
 * Check if the interaction user is authorized for the command
 */
export function isAuthorized(interaction: Interaction): boolean {
    if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) {
        // For non-command interactions, just check if they're not unauthorized
        return getAuthLevel(interaction.user.id) !== AuthLevel.UNAUTHORIZED;
    }

    const commandName = interaction.commandName;
    
    // Try to get subcommand name if it exists
    let subcommandName: string | undefined;
    try {
        if (interaction.isChatInputCommand()) {
            subcommandName = interaction.options.getSubcommand(false) || undefined;
        } else if (interaction.isAutocomplete()) {
            subcommandName = interaction.options.getSubcommand(false) || undefined;
        }
    } catch {
        // No subcommand exists, that's fine
    }

    return isAuthorizedForCommand(interaction.user.id, commandName, subcommandName);
}

/**
 * Send an unauthorized response
 */
export async function sendUnauthorizedResponse(
    interaction: Interaction,
    commandName?: string,
    subcommandName?: string
): Promise<void> {
    if (!interaction.isRepliable()) return;

    const authLevel = getAuthLevel(interaction.user.id);
    
    let title: string;
    let description: string;

    if (authLevel === AuthLevel.UNAUTHORIZED) {
        // Completely unauthorized
        title = '🔒 Unauthorized';
        description = 'You are not authorized to use this bot.';
    } else if (authLevel === AuthLevel.FRIEND && commandName) {
        // Friend trying to use restricted command/subcommand
        if (subcommandName) {
            const fullSubcommandName = `${commandName}:${subcommandName}`;
            if (OWNER_ONLY_SUBCOMMANDS.includes(fullSubcommandName)) {
                title = '🔒 Owner Only';
                description = `The \`/${commandName} ${subcommandName}\` command is restricted to the bot owner for security reasons.`;
            } else {
                title = '🔒 Owner Only';
                description = `The \`/${commandName} ${subcommandName}\` command is restricted to the bot owner.`;
            }
        } else if (OWNER_ONLY_COMMANDS.includes(commandName)) {
            title = '🔒 Owner Only';
            description = `The \`/${commandName}\` command is restricted to the bot owner for security reasons.`;
        } else {
            title = '🔒 Unauthorized';
            description = 'You do not have permission to use this command.';
        }
    } else {
        // Fallback
        title = '🔒 Unauthorized';
        description = 'You do not have permission to use this command.';
    }

    const embed = new EmbedBuilder()
        .setColor(0xED4245) // Red
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: 'Access restricted' })
        .setTimestamp();

    const response = { embeds: [embed], ephemeral: true };

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response);
    } else {
        await interaction.reply(response);
    }
}
