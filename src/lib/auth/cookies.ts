import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  signSessionToken,
  type SessionPayload,
} from "@/lib/auth/session-token";

export async function setSessionCookie(payload: Omit<SessionPayload, "exp">) {
  const token = await signSessionToken(payload);
  (await cookies()).set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
