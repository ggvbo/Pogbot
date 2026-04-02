import { MessageFlags, SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "../interfaces/Command.js";

export default {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check bot latency."),
    requires: [],
    async execute(interaction) {
        await interaction.reply({
            content: `:ping_pong: Pong! Average latency is \`${Math.round(interaction.client.ws.ping)}ms\``,
            flags: [MessageFlags.Ephemeral],
        });
    },
} satisfies SlashCommand;
