import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db/client";
import { env, adminEmails } from "@/lib/env";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    "https://requiem.isabelledutoit.com",
    ...(process.env.NODE_ENV === "development"
      ? [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3002",
          "http://localhost:3007",
        ]
      : []),
  ],
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "user", input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    // Email verification is intentionally OFF for now (no Resend wired yet).
    // The two known admins sign in immediately. Flip to true + add the
    // emailVerification block once send.isabelledutoit.com is verified.
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once per day
  },
  databaseHooks: {
    user: {
      create: {
        before: async (data) => {
          const isAdmin = adminEmails.includes(data.email.toLowerCase());
          return { data: { ...data, role: isAdmin ? "admin" : "user" } };
        },
      },
    },
  },
});

export type Auth = typeof auth;
