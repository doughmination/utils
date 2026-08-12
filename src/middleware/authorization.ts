import { Interaction, EmbedBuilder } from 'discord.js';

/**
 * Authorization levels for the bot
 *
 * Commands are PUBLIC by default — anyone can use them. Only the commands
 * listed in RESTRICTED_COMMANDS below need an auth level, and within those a
 * subcommand can be narrowed further to owner-only.
 *
 * OWNER: Full access to all commands including sensitive operations
 * FRIEND: Access to restricted commands, minus owner-only subcommands
 * PUBLIC: Everything that isn't restricted
 */

/** Owner - Full access (you) */
const OWNER_ID = process.env.OWNER_ID;

if (!OWNER_ID || OWNER_ID === 'bot_owner_id') {
  throw new Error('OWNER_ID is not defined in the environment variables.');
}


/** Friends - Access to restricted commands, minus owner-only subcommands */
const FRIEND_IDS = process.env.FRIEND_IDS
  ? process.env.FRIEND_IDS.split(',').map(id => id.trim()).filter(id => id.length > 0)
  : [];

/** Commands that are NOT public — friends and the owner only */
const RESTRICTED_COMMANDS: string[] = [
    'dough',
];

/** Commands that require owner-level access (entire command) */
const OWNER_ONLY_COMMANDS: string[] = [
    // No longer blocking entire 'dough' command
];

/** Subcommands that require owner-level access (format: "command:subcommand") */
const OWNER_ONLY_SUBCOMMANDS = [
    'dough:add',      // Only owner can add fronters
    'dough:remove',   // Only owner can remove fronters
    'dough:health',   // Only owner can check API health
];

export enum AuthLevel {
    PUBLIC = 0,
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
    return AuthLevel.PUBLIC;
}

/**
 * Is this command (or subcommand) restricted to friends and the owner?
 */
function isRestricted(commandName: string, subcommandName?: string): boolean {
    if (RESTRICTED_COMMANDS.includes(commandName) || OWNER_ONLY_COMMANDS.includes(commandName)) {
        return true;
    }
    return subcommandName
        ? OWNER_ONLY_SUBCOMMANDS.includes(`${commandName}:${subcommandName}`)
        : false;
}

/**
 * Check if a user is authorized to use a specific command/subcommand
 */
export function isAuthorizedForCommand(
    userId: string,
    commandName: string,
    subcommandName?: string
): boolean {
    // Public by default — only restricted commands need an auth check.
    if (!isRestricted(commandName, subcommandName)) {
        return true;
    }

    const authLevel = getAuthLevel(userId);

    // Owner can use everything
    if (authLevel === AuthLevel.OWNER) {
        return true;
    }

    if (authLevel === AuthLevel.FRIEND) {
        // Whole-command owner locks beat friend access
        if (OWNER_ONLY_COMMANDS.includes(commandName)) {
            return false;
        }

        if (subcommandName && OWNER_ONLY_SUBCOMMANDS.includes(`${commandName}:${subcommandName}`)) {
            return false;
        }

        // Friends get the rest of the restricted command
        return true;
    }

    // Everyone else: restricted means no
    return false;
}

/**
 * Check if the interaction user is authorized for the command
 */
export function isAuthorized(interaction: Interaction): boolean {
    if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) {
        // Buttons, select menus, context menus — these belong to commands that
        // already passed their own check, so let them through.
        return true;
    }

    const commandName = interaction.commandName;

    // Try to get subcommand name if it exists
    let subcommandName: string | undefined;
    try {
        subcommandName = interaction.options.getSubcommand(false) || undefined;
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
    const fullSubcommandName = commandName && subcommandName
        ? `${commandName}:${subcommandName}`
        : undefined;
    const label = subcommandName
        ? `/${commandName} ${subcommandName}`
        : `/${commandName}`;

    let title: string;
    let description: string;

    if (
        commandName &&
        (OWNER_ONLY_COMMANDS.includes(commandName) ||
            (fullSubcommandName && OWNER_ONLY_SUBCOMMANDS.includes(fullSubcommandName)))
    ) {
        // Owner-only, whoever is asking
        title = '🔒 Owner Only';
        description = `The \`${label}\` command is restricted to the bot owner for security reasons.`;
    } else if (commandName && authLevel === AuthLevel.PUBLIC && RESTRICTED_COMMANDS.includes(commandName)) {
        // Public user hitting a friends-only command
        title = '🔒 Friends Only';
        description = `The \`${label}\` command is restricted to the bot owner and their friends.`;
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
