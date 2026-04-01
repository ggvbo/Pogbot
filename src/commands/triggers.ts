import {
    InteractionContextType,
    LabelBuilder,
    MessageFlags,
    ModalBuilder,
    ModalSubmitInteraction,
    roleMention,
    RoleSelectMenuBuilder,
    SlashCommandBuilder,
    type Snowflake,
} from "discord.js";
import type { SlashCommand } from "../interfaces/Command.js";
import { PogbotDB } from "../structures/PogbotDB.js";

export default {
    data: new SlashCommandBuilder()
        .setName("triggers")
        .setDescription("Edit mention triggers.")
        .setContexts(InteractionContextType.Guild)
        .addSubcommand((subcommand) =>
            subcommand.setName("list").setDescription("List role triggers."),
        )
        .addSubcommand((subcommand) =>
            subcommand.setName("edit").setDescription("Edit role triggers."),
        ),
    requires: ["ManageGuild"],
    async execute(interaction) {
        const triggers: Snowflake[] = await PogbotDB.getInstance().getTriggers(
            interaction.guildId!,
        );

        switch (interaction.options.getSubcommand()) {
            case "list": {
                if (triggers.length == 0) {
                    await interaction.reply({
                        content: `:thinking: It looks like there aren't any triggers. Try adding one using </triggers edit:${interaction.commandId}>.`,
                        flags: [MessageFlags.Ephemeral],
                    });
                    return;
                }

                await interaction.reply({
                    content: `:eyes: Pogbot is currently listening to these triggers: ${triggers.map((trigger) => `\n- ${roleMention(trigger)}`).join(", ")}`,
                    flags: [MessageFlags.Ephemeral],
                });

                break;
            }
            case "edit": {
                const modal = new ModalBuilder()
                    .setCustomId("pogbot_new_trigger")
                    .setTitle("Role Trigger Selection");

                const triggerSelect = new RoleSelectMenuBuilder()
                    .setCustomId("role_select")
                    .setRequired(false)
                    .setMinValues(0)
                    .setMaxValues(5)
                    .setDefaultRoles(triggers);

                const selectLabel = new LabelBuilder()
                    .setLabel("Role mentions that should trigger Pogbot.")
                    .setRoleSelectMenuComponent(triggerSelect);

                modal.addLabelComponents(selectLabel);

                await interaction.showModal(modal);

                try {
                    const modalInteraction = await interaction.awaitModalSubmit(
                        {
                            time: 60_000,
                            filter: (modal: ModalSubmitInteraction) =>
                                modal.customId === "pogbot_new_trigger",
                        },
                    );

                    const selectedRoles =
                        modalInteraction.fields.getSelectedRoles("role_select");

                    if (!selectedRoles) {
                        await PogbotDB.getInstance().setTriggers(
                            interaction.guildId!,
                            [],
                        );

                        await modalInteraction.reply({
                            content: `:+1: Done! Pogbot is no longer listening to any trigger.`,
                            flags: [MessageFlags.Ephemeral],
                        });

                        return;
                    }

                    const roleIds: Snowflake[] = selectedRoles.map(
                        (role) => role!.id,
                    );

                    await PogbotDB.getInstance().setTriggers(
                        interaction.guildId!,
                        roleIds,
                    );

                    await modalInteraction.reply({
                        content: `:+1: Done! Pogbot is now listening to these triggers: ${roleIds.map((id) => `\n- ${roleMention(id)}`).join(", ")}`,
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
