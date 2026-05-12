import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const petSizeEnum = [
  "mini_curto",
  "mini_longo",
  "pequeno_curto",
  "pequeno_longo",
  "medio_curto",
  "medio_longo",
  "grande_curto",
  "grande_longo",
  "gigante",
] as const;

export type PetSize = typeof petSizeEnum[number];

export const petsTable = pgTable("pets", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  breed: text("breed"),
  size: text("size").notNull().$type<PetSize>(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPetSchema = createInsertSchema(petsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPet = z.infer<typeof insertPetSchema>;
export type Pet = typeof petsTable.$inferSelect;
