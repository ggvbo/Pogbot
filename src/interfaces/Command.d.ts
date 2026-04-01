import type {
    ChatInputCommandInteraction,
    PermissionResolvable,
    SlashCommandBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface SlashCommand {
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
    requires: PermissionResolvable[];
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
