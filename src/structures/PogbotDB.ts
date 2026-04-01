import { Collection, Role, TextChannel, type Snowflake } from "discord.js";
import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import { scores, settings, type Score, type Settings } from "../db/schema.js";

export class PogbotDB {
    private static instance: PogbotDB;

    public readonly LEADERBOARD_PAGE_SIZE = 10;

    // In-memory cache.
    private readonly triggers = new Collection<Snowflake, Snowflake[]>();
    private readonly listenedChannels = new Collection<
        Snowflake,
        Snowflake[]
    >();

    private database = drizzle(process.env.DATABASE_URL!);

    private constructor() {}

    public async getTriggers(id: Snowflake): Promise<Snowflake[]> {
        return this.triggers.has(id)
            ? this.triggers.get(id)!
            : (await this.getSettings(id)).triggers;
    }

    public async setTriggers(
        id: Snowflake,
        triggers: Snowflake[],
    ): Promise<void> {
        await this.database
            .update(settings)
            .set({ triggers })
            .where(eq(settings.id, id));

        this.triggers.set(id, triggers);
    }

    public async getChannels(id: Snowflake): Promise<Snowflake[]> {
        return this.listenedChannels.has(id)
            ? this.listenedChannels.get(id)!
            : (await this.getSettings(id)).channels;
    }

    public async setChannels(
        id: Snowflake,
        channels: Snowflake[],
    ): Promise<void> {
        await this.database
            .update(settings)
            .set({ channels })
            .where(eq(settings.id, id));

        this.listenedChannels.set(id, channels);
    }

    public async getScore(id: Snowflake): Promise<number> {
        const result = await this.database
            .select({ score: scores.score })
            .from(scores)
            .where(eq(scores.id, id));

        if (!result[0])
            console.log(`Missing score information for ${id}. Returning 0.`);

        return result[0]?.score ?? 0;
    }

    public async updateScore(
        id: Snowflake,
        amount: number,
        increment: boolean = true,
    ): Promise<number> {
        const operation = increment ? sql`${scores.score} + ${amount}` : amount;

        if (!increment && amount == 0) {
            await this.database.delete(scores).where(eq(scores.id, id));
            return 0;
        }

        const [result] = await this.database
            .insert(scores)
            .values({ id, score: amount })
            .onConflictDoUpdate({
                target: scores.id,
                set: { score: operation },
            })
            .returning({ score: scores.score });

        if (result!.score <= 0) {
            await this.database.delete(scores).where(eq(scores.id, id));
            return 0;
        }

        return result!.score;
    }

    public async getLeaderboard(page: number): Promise<Score[]> {
        return await this.database
            .select({ id: scores.id, score: scores.score })
            .from(scores)
            .orderBy(desc(scores.score))
            .offset((page - 1) * this.LEADERBOARD_PAGE_SIZE)
            .limit(this.LEADERBOARD_PAGE_SIZE);
    }

    private async getSettings(id: Snowflake): Promise<Settings> {
        const result = await this.database
            .insert(settings)
            .values({ id })
            .onConflictDoUpdate({ target: settings.id, set: { id } })
            .returning();

        this.saveInMemoryCache(result[0]!);

        return result[0]!;
    }

    public async initializeInMemoryCache(): Promise<void> {
        const storedSettings: Settings[] = await this.database
            .select()
            .from(settings);

        storedSettings.forEach(async (guild) => {
            this.saveInMemoryCache(guild);
        });
    }

    public async checkDeletedChannel(channel: TextChannel): Promise<void> {
        const channels = this.listenedChannels.get(channel.guildId);
        if (channels) {
            const index = channels.indexOf(channel.id);
            if (index !== -1) {
                channels.splice(index, 1);
                await this.setChannels(channel.guildId, channels);
                console.log(
                    `Removed deleted channel with ID ${channel.id} from guild ${channel.guildId}.`,
                );
            }
        }
    }

    public async checkDeletedRole(role: Role): Promise<void> {
        const triggers = this.triggers.get(role.guild.id);
        if (triggers) {
            const index = triggers.indexOf(role.id);
            if (index !== -1) {
                triggers.splice(index, 1);
                await this.setTriggers(role.guild.id, triggers);
                console.log(
                    `Removed deleted role with ID ${role.id} from guild ${role.guild.id}.`,
                );
            }
        }
    }

    private saveInMemoryCache(guild: Settings): void {
        console.log(`Adding settings for ${guild.id} to in-memory cache.`);
        this.triggers.set(guild.id, guild.triggers);
        this.listenedChannels.set(guild.id, guild.channels);
    }

    public static getInstance() {
        return this.instance || (this.instance = new this());
    }
}
