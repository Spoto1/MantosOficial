import { NextResponse } from "next/server";

import { clearAdminSession } from "@/lib/auth/admin";
import { resolveAppUrl } from "@/lib/runtime-config";

export async function GET() {
  await clearAdminSession();
  return NextResponse.redirect(new URL("/admin", resolveAppUrl()));
}
