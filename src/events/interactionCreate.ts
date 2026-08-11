import { Events, Interaction, AutocompleteInteraction } from 'discord.js';
import { loadCommands } from '../handlers/commandHandler';
import { doughAPI } from '../utils/doughAPI';
import { genshinAPI } from '../utils/genshinAPI';
import { GENSHIN_ACCOUNTS } from '../config/genshin';
import { ACCOUNT_BY_SUBCOMMAND } from '../utils/genshinCharacter';
import { isAuthorized, sendUnauthorizedResponse } from '../middleware/authorization';

export const name = Events.InteractionCreate;
export const once = false;

let commands: Awaited<ReturnType<typeof loadCommands>>;

// Load commands once when the module is imported
loadCommands().then(loaded => {
    commands = loaded;
});

export async function execute(interaction: Interaction) {
    // Check authorization first for all interactions
    if (!isAuthorized(interaction)) {
        let commandName: string | undefined;
        let subcommandName: string | undefined;

        if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
            commandName = interaction.commandName;
            
            // Try to get subcommand name
            try {
                subcommandName = interaction.options.getSubcommand(false) || undefined;
            } catch {
                // No subcommand, that's fine
            }
        }

        await sendUnauthorizedResponse(interaction, commandName, subcommandName);
        return;
    }

    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
        await handleAutocomplete(interaction);
        return;
    }

    if (!interaction.isChatInputCommand() && !interaction.isUserContextMenuCommand() && !interaction.isMessageContextMenuCommand()) {
        return;
    }

    const command = commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction as any);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);

        const errorMessage = { content: 'There was an error while executing this command!', ephemeral: true };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}

async function handleAutocomplete(interaction: AutocompleteInteraction) {
    const commandName = interaction.commandName;
    const focusedOption = interaction.options.getFocused(true);

    // Handle dough add/remove autocomplete
    if (commandName === 'dough' && focusedOption.name === 'member') {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'add' || subcommand === 'remove') {
            try {
                let members: any[];

                if (subcommand === 'add') {
                    // For add, show all members
                    members = await doughAPI.getMembers();
                } else {
                    // For remove, show only current fronters
                    const frontersData = await doughAPI.getFronters();
                    members = frontersData.members || [];
                }

                if (!members || members.length === 0) {
                    await interaction.respond([]);
                    return;
                }

                // Filter members based on user input (search display_name or name)
                const searchQuery = focusedOption.value.toLowerCase();
                const filtered = members
                    .filter((m: any) => {
                        const displayName = (m.display_name || m.name).toLowerCase();
                        const name = m.name.toLowerCase();
                        return displayName.includes(searchQuery) || name.includes(searchQuery);
                    })
                    .slice(0, 25) // Discord limits to 25 autocomplete options
                    .map((m: any) => ({
                        name: m.display_name || m.name,
                        value: m.display_name || m.name
                    }));

                await interaction.respond(filtered);
            } catch (error) {
                console.error('Error in autocomplete:', error);
                await interaction.respond([]);
            }
        }
    }

    // Handle genshin character autocomplete. The subcommand (main-chara /
    // alt-chara) determines which account's roster to search — the two
    // accounts hold different characters.
    if (commandName === 'genshin' && focusedOption.name === 'name') {
        const subcommand = interaction.options.getSubcommand(false) || '';
        const accountKey = ACCOUNT_BY_SUBCOMMAND[subcommand];
        if (!accountKey) {
            await interaction.respond([]);
            return;
        }

        try {
            const account = GENSHIN_ACCOUNTS[accountKey];
            const roster = await genshinAPI.getRoster(account.uid);

            const searchQuery = focusedOption.value.toLowerCase();
            // Owned first (sorted by level), then the rest of the catalog, so
            // owned characters surface but nothing is hidden.
            const filtered = roster.characters
                .filter(c => c.name.toLowerCase().includes(searchQuery))
                .sort((a, b) => {
                    if (a.owned !== b.owned) return a.owned ? -1 : 1;
                    return (b.level ?? 0) - (a.level ?? 0) || a.name.localeCompare(b.name);
                })
                .slice(0, 25) // Discord limits to 25 autocomplete options
                .map(c => ({
                    name: c.owned && c.level != null ? `${c.name} (Lv.${c.level})` : c.name,
                    value: c.name,
                }));

            await interaction.respond(filtered);
        } catch (error) {
            console.error('Error in genshin autocomplete:', error);
            await interaction.respond([]);
        }
    }
}