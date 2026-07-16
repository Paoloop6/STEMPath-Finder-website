import { pgTable, text, serial, boolean, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const opportunitiesTable = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  organization: text("organization").notNull(),
  category: text("category").notNull().default("Unknown"),
  stemField: text("stem_field").notNull().default("Unknown"),
  eligibleGrades: text("eligible_grades").notNull().default("Unknown"),
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  location: text("location").notNull().default("Unknown"),
  format: text("format").notNull().default("Unknown"), // remote | in-person | hybrid
  costCategory: text("cost_category").notNull().default("Unknown"), // free | low | medium | high
  costAmount: text("cost_amount"),
  deadline: date("deadline", { mode: "string" }),
  applicationOpenDate: date("application_open_date", { mode: "string" }),
  experienceLevel: text("experience_level").notNull().default("Unknown"), // beginner | intermediate | advanced | any
  timeCommitment: text("time_commitment").notNull().default("Unknown"), // days | weeks | months | summer | year
  requirements: text("requirements").notNull().default(""),
  officialUrl: text("official_url").notNull(),
  sourceUrls: text("source_urls").notNull().default(""),
  summary: text("summary").notNull().default(""),
  verificationStatus: text("verification_status").notNull().default("needs_verification"), // needs_verification | verified | unverifiable
  published: boolean("published").notNull().default(false),
  lastVerifiedDate: date("last_verified_date", { mode: "string" }),
  isSampleData: boolean("is_sample_data").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOpportunitySchema = createInsertSchema(opportunitiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Opportunity = typeof opportunitiesTable.$inferSelect;
