import { sql, type InferSelectModel } from "drizzle-orm";
import { pgTable, integer, text } from "drizzle-orm/pg-core";

export const scores = pgTable("scores", {
    id: text().primaryKey(),
    score: integer().notNull().default(0),
    bestTime: integer()
});

export const settings = pgTable("settings", {
    id: text().primaryKey(),
    triggers: text()
        .array()
        .notNull()
        .default(sql`ARRAY[]::text[]`),
    channels: text()
        .array()
        .notNull()
        .default(sql`ARRAY[]::text[]`),
});

export type Score = InferSelectModel<typeof scores>;
export type Settings = InferSelectModel<typeof settings>;
