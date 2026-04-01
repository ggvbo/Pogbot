import { readdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import {
    Client,
    Collection,
    GatewayIntentBits,
    MessageFlags,
    PermissionsBitField,
    REST,
    Routes,
    type ApplicationCommandDataResolvable,
    type Interaction,
    type Channel,
    TextChannel,
    Role,
    Message,
    userMention,
} from "discord.js";
import humanizeDuration from "humanize-duration";

import type { SlashCommand } from "../interfaces/Command.js";
import { PogbotDB } from "./PogbotDB.js";

const EXPECTED_FILE_EXTENSION =
    process.env.NODE_ENV === "development" ? ".ts" : ".js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Pogbot extends Client {
    public readonly commands = new Collection<string, SlashCommand>();

    private database: PogbotDB;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });

        this.database = PogbotDB.getInstance();

        this.registerEvents();
    }

    private registerEvents(): void {
        this.once("clientReady", this.onceClientReady);
        this.on("interactionCreate", this.onInteractionCreate);
        this.on("messageCreate", this.onMessageCreate);
        this.on("channelDelete", this.onChannelDelete);
        this.on("roleDelete", this.onRoleDelete);
    }

    private async loadCommands(): Promise<void> {
        const rest = new REST().setToken(this.token as string);

        const filePath = join(__dirname, "..", "commands");

        const files = (await readdir(filePath)).filter((file) =>
            file.endsWith(EXPECTED_FILE_EXTENSION),
        );

        const slashCommands: ApplicationCommandDataResolvable[] = [];

        for (const file of files) {
            const { default: command } = (await import(
                join(filePath, file)
            )) as { default: SlashCommand };

            this.commands.set(command.data.name, command);
            slashCommands.push(command.data);
        }

        console.log(`Loaded ${slashCommands.length} commands.`);

        await rest.put(Routes.applicationCommands(this.user!.id), {
            body: slashCommands,
        });
    }

    // #region Event handlers
    private async onceClientReady(): Promise<void> {
        console.log(
            `Logged in as ${this.user?.displayName} (id: ${this.user!.id})`,
        );

        try {
            await this.database.initializeInMemoryCache();
            await this.loadCommands();
        } catch (error) {
            console.error(`Error while handling clientReady.\n${error}`);
        }
    }

    private async onInteractionCreate(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;

        const command = this.commands.get(
            interaction.commandName,
        ) as SlashCommand;

        const memberPermissions =
            interaction.memberPermissions as PermissionsBitField;

        if (!memberPermissions.has(command.requires)) {
            await interaction.reply({
                content: `:x: You do not have the required permissions (\`${command.requires}\`) to run this command!`,
                flags: [MessageFlags.Ephemeral],
            });
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            if (!interaction.replied)
                await interaction.reply({
                    content: `:bug: Could not execute command due to an error!`,
                    flags: [MessageFlags.Ephemeral],
                });
            console.log(
                `Error while executing command ${interaction.commandName}.\n${error}`,
            );
        }
    }

    private async onMessageCreate(message: Message): Promise<void> {
        if (!message.inGuild() || message.author.bot) return;

        const listenedChannels = await this.database.getChannels(
            message.guildId,
        );
        if (listenedChannels.includes(message.channelId)) {
            console.log(
                `Found message in listened channel ${message.channelId}`,
            );
            const triggers = await this.database.getTriggers(message.guildId);

            if (triggers.some((id) => message.mentions.roles.has(id))) {
                console.log(`Message in listened channel contains trigger.`);

                const initialTime = Date.now();

                await message.react("👀");

                const filter = (message: Message) =>
                    message.content.toLowerCase().includes("pog");
                try {
                    const collector = await message.channel.awaitMessages({
                        filter,
                        max: 1,
                        time: 60_000,
                        errors: ["time"],
                    });

                    const winner = collector.first();

                    await winner!.reply(
                        `:tada: And it's ${userMention(winner!.author.id)} on top with a time of **${humanizeDuration(Date.now() - initialTime)}**. GG!`,
                    );

                    await this.database.updateScore(winner!.author.id, 1);
                } catch {
                    await message.channel.send(
                        ":pensive: Looks like no one pogged in time. Better luck next time!",
                    );
                }
            }
        }
    }

    private async onChannelDelete(channel: Channel): Promise<void> {
        if (channel.isTextBased() && !channel.isDMBased())
            await this.database.checkDeletedChannel(channel as TextChannel);
    }

    private async onRoleDelete(role: Role): Promise<void> {
        await this.database.checkDeletedRole(role);
    }
    // #endregion
}
