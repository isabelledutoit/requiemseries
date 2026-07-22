import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────────────────────────
// Better-Auth core tables (names + column shapes match Better-Auth's
// Drizzle adapter expectations as of v1.6.11).
// ──────────────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ──────────────────────────────────────────────────────────────────
// Feature — Portfolio (Isabelle's broader body of work)
//
// One artwork has many images (full view + detail crops). Cipher-free —
// unlike the fixed Requiem series on the landing. Images live in Vercel
// Blob; we store the public URL + pathname per image.
// ──────────────────────────────────────────────────────────────────

export const portfolioArtwork = pgTable(
  "portfolio_artwork",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    medium: text("medium"),
    year: text("year"),
    dimensions: text("dimensions"),
    // Sort order among artworks on /portfolio (ascending).
    position: integer("position").notNull().default(0),
    published: boolean("published").notNull().default(true),
    uploadedBy: text("uploaded_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("portfolio_artwork_position_idx").on(t.position)],
);

export const portfolioImage = pgTable(
  "portfolio_image",
  {
    id: text("id").primaryKey(),
    artworkId: text("artwork_id")
      .notNull()
      .references(() => portfolioArtwork.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    imagePathname: text("image_pathname").notNull(),
    altText: text("alt_text"),
    // Sort order of images within an artwork (ascending).
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("portfolio_image_artwork_idx").on(t.artworkId)],
);

export type User = typeof user.$inferSelect;
export type PortfolioArtwork = typeof portfolioArtwork.$inferSelect;
export type PortfolioArtworkInsert = typeof portfolioArtwork.$inferInsert;
export type PortfolioImage = typeof portfolioImage.$inferSelect;
export type PortfolioImageInsert = typeof portfolioImage.$inferInsert;
