"use client";

import { createAuthClient } from "better-auth/react";

// No explicit baseURL — Better-Auth uses the current origin (same-origin
// auth). Do not import @/lib/env here: it eagerly validates server-only
// vars and would throw at module load in the browser.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
