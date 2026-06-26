"use server";

import { clearSessionCookie } from "@/lib/auth/cookies";
import { performDirectorLogin, performStaffLogin } from "@/lib/auth/credentials";

export async function loginStaff(email: string, password: string) {
  return performStaffLogin(email, password);
}

export async function loginDirector(email: string, password: string) {
  return performDirectorLogin(email, password);
}

export async function logout() {
  await clearSessionCookie();
}
