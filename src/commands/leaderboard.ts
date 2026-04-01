import {
    Colors,
    EmbedBuilder,
    SlashCommandBuilder,
    userMention,
} from "discord.js";

import type { Score } from "../db/schema.js";
import type { SlashCommand } from "../interfaces/Command.js";
import { PogbotDB } from "../structures/PogbotDB.js";

export default {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("See top scores.")
        .addIntegerOption((option) =>
            option
                .setName("page")
                .setDescription("Page to show.")
                .setMinValue(1)
                .setMaxValue(10)
                .setRequired(false),
        ),
    requires: [],
    async execute(interaction) {
        const page = interaction.options.getInteger("page", false) ?? 1;

        const scores: Score[] =
            await PogbotDB.getInstance().getLeaderboard(page);

        const embed = new EmbedBuilder().setTitle("Pog Leaderboard");

        embed.setColor(Colors.Blurple);

        if (scores.length === 0) {
            embed.setDescription("*That page is empty!*");
        } else {
            embed.setDescription(
                scores
                    .map(
                        (user, index) =>
                            `**${calculatePosition(page, index)}.** ${userMention(user.id)} - ${user.score} pogs`,
                    )
                    .join("\n"),
            );
        }

        embed.setFooter({ text: `Page ${page}` });

        await interaction.reply({ embeds: [embed] });
    },
} satisfies SlashCommand;

function calculatePosition(page: number, index: number): number {
    return (
        (page - 1) * PogbotDB.getInstance().LEADERBOARD_PAGE_SIZE + index + 1
    );
}
