import { MessageFlags, SlashCommandBuilder, userMention } from "discord.js";

import type { SlashCommand } from "../interfaces/Command.js";
import { PogbotDB } from "../structures/PogbotDB.js";

export default {
    data: new SlashCommandBuilder()
        .setName("setscore")
        .setDescription(
            "Set your (or someone else's) score to an specific value.",
        )
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("User to modify scores for.")
                .setRequired(true),
        )
        .addIntegerOption((option) =>
            option
                .setName("value")
                .setDescription("Value to set score to.")
                .setMinValue(0)
                .setRequired(true),
        ),
    requires: ["ManageGuild"],
    async execute(interaction) {
        const user = interaction.options.getUser("user", true);
        const value = interaction.options.getInteger("value", true);

        await PogbotDB.getInstance().updateScore(user.id, value, false);

        await interaction.reply({
            content: `:tools: Done! ${userMention(user.id)} now has ${value} pogs.`,
            flags: [MessageFlags.Ephemeral],
        });
    },
} satisfies SlashCommand;
