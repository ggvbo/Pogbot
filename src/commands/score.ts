import { MessageFlags, SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../interfaces/Command.js";
import { PogbotDB } from "../structures/PogbotDB.js";

export default {
    data: new SlashCommandBuilder()
        .setName("score")
        .setDescription("See your score."),
    requires: [],
    async execute(interaction) {
        const score = await PogbotDB.getInstance().getScore(
            interaction.user.id,
        );

        await interaction.reply({
            content: `:star: You have ${score} pogs!`,
            flags: [MessageFlags.Ephemeral],
        });
    },
} satisfies SlashCommand;
