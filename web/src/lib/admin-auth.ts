import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { config } from "./config";

const COOKIE = "admin_session";

const sessionValue = () => createHmac("sha256", config.sessionSecret).update(config.adminPassword).digest("hex");

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function isAdmin() {
  const value = (await cookies()).get(COOKIE)?.value;
  return Boolean(value && safeEqual(value, sessionValue()));
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function loginAdmin(password: string) {
  if (!safeEqual(password, config.adminPassword)) return false;
  (await cookies()).set(COOKIE, sessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 3600,
    path: "/",
  });
  return true;
}

export async function logoutAdmin() {
  (await cookies()).delete(COOKIE);
}
