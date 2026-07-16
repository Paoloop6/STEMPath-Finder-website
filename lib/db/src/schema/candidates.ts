import { pgTable, text, serial, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const candidatesTable = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  organization: text("organization").notNull(),
  category: text("category").notNull().default("Unknown"),
  stemField: text("stem_field").notNull().default("Unknown"),
  possibleGrades: text("possible_grades").notNull().default("Unknown"),
  possibleAges: text("possible_ages").notNull().default("Unknown"),
  location: text("location").notNull().default("Unknown"),
  format: text("format").notNull().default("Unknown"),
  possibleCost: text("possible_cost").notNull().default("Unknown"),
  possibleDeadline: date("possible_deadline", { mode: "string" }),
  requirements: text("requirements").notNull().default(""),
  officialUrl: text("official_url").notNull(),
  sourceUrls: text("source_urls").notNull().default(""),
  summary: text("summary").notNull().default(""),
  dateDiscovered: date("date_discovered", { mode: "string" }).notNull(),
  reviewStatus: text("review_status").notNull().default("needs_verification"), // needs_verification | approved | rejected | duplicate
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCandidateSchema = createInsertSchema(candidatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidatesTable.$inferSelect;
