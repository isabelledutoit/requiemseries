import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  // Comma-separated allowlist of emails that auto-promote to `admin` on
  // signup (Isabelle + Emile). See adminEmails below.
  ADMIN_EMAILS: z.string().min(1, "ADMIN_EMAILS is required"),
  BLOB_READ_WRITE_TOKEN: z
    .string()
    .startsWith(
      "vercel_blob_rw_",
      "BLOB_READ_WRITE_TOKEN must start with vercel_blob_rw_",
    ),
  // Email is OFF for now (email verification disabled). These are optional
  // until Resend + send.isabelledutoit.com are wired.
  RESEND_API_KEY: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().startsWith("re_").optional(),
  ),
  EMAIL_FROM: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
  ),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${formatted}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);

// Normalized admin allowlist (lowercased, trimmed).
export const adminEmails: string[] = env.ADMIN_EMAILS.split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
