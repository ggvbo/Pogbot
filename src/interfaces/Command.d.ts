import type {
    ChatInputCommandInteraction,
    PermissionResolvable,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface SlashCommand {
    data:
        | SlashCommandBuilder
        | SlashCommandSubcommandsOnlyBuilder
        | SlashCommandOptionsOnlyBuilder;
    requires: PermissionResolvable[];
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
