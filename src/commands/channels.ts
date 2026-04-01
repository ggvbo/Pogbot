import {
    channelMention,
    ChannelSelectMenuBuilder,
    ChannelType,
    InteractionContextType,
    LabelBuilder,
    MessageFlags,
    ModalBuilder,
    ModalSubmitInteraction,
    SlashCommandBuilder,
    type Snowflake,
} from "discord.js";

import type { SlashCommand } from "../interfaces/Command.js";
import { PogbotDB } from "../structures/PogbotDB.js";

export default {
    data: new SlashCommandBuilder()
        .setName("channels")
        .setDescription("Edit listened channels.")
        .setContexts(InteractionContextType.Guild)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list")
                .setDescription("List listened channels."),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("edit")
                .setDescription("Edit listened channels."),
        ),
    requires: ["ManageGuild"],
    async execute(interaction) {
        const channels: Snowflake[] = await PogbotDB.getInstance().getChannels(
            interaction.guildId!,
        );

        switch (interaction.options.getSubcommand()) {
            case "list": {
                if (channels.length == 0) {
                    await interaction.reply({
                        content: `:thinking: It looks like there aren't any listened channels. Try adding one using </channels edit:${interaction.commandId}>.`,
                        flags: [MessageFlags.Ephemeral],
                    });
                    return;
                }

                await interaction.reply({
                    content: `:eyes: Pogbot is currently listening to these channels: ${channels.map((id) => `\n- ${channelMention(id)}`).join(",")}`,
                    flags: [MessageFlags.Ephemeral],
                });

                break;
            }
            case "edit": {
                const modal = new ModalBuilder()
                    .setCustomId("pogbot_edit_channels")
                    .setTitle("Channel Selection");

                const selectMenu = new ChannelSelectMenuBuilder()
                    .setCustomId("channel_select")
                    .setRequired(false)
                    .setMinValues(0)
                    .setMaxValues(5)
                    .setDefaultChannels(channels)
                    .setChannelTypes(ChannelType.GuildText);

                const selectLabel = new LabelBuilder()
                    .setLabel("Channels that Pogbot should listen to.")
                    .setChannelSelectMenuComponent(selectMenu);

                modal.addLabelComponents(selectLabel);

                await interaction.showModal(modal);

                try {
                    const modalInteraction = await interaction.awaitModalSubmit(
                        {
                            time: 60_000,
                            filter: (modal: ModalSubmitInteraction) =>
                                modal.customId === "pogbot_edit_channels",
                        },
                    );

                    const selectedChannels =
                        modalInteraction.fields.getSelectedChannels(
                            "channel_select",
                        );

                    if (!selectedChannels) {
                        await PogbotDB.getInstance().setChannels(
                            interaction.guildId!,
                            [],
                        );

                        await modalInteraction.reply({
                            content: `:+1: Done! Pogbot is no longer listening to any channel.`,
                            flags: [MessageFlags.Ephemeral],
                        });

                        return;
                    }

                    const channelIds: Snowflake[] = selectedChannels.map(
                        (channel) => channel.id,
                    );

                    await PogbotDB.getInstance().setChannels(
                        interaction.guildId!,
                        channelIds,
                    );

                    await modalInteraction.reply({
                        content: `:+1: Done! Pogbot is now listening to these channels: ${channelIds.map((id) => `\n- <#${id}>`).join(", ")}`,
                        flags: [MessageFlags.Ephemeral],
                    });
                } catch (error) {
                    console.log(error);
                    await interaction.followUp({
                        content:
                            ":warning: You did not submit the modal in time.",
                        flags: [MessageFlags.Ephemeral],
                    });
                }

                break;
            }
        }
    },
} satisfies SlashCommand;
