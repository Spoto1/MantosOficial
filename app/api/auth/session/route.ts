import { NextResponse } from "next/server";

import { getCurrentCustomer } from "@/lib/auth/customer";
import type { CustomerSessionResponse } from "@/lib/types";

export async function GET() {
  const customer = await getCurrentCustomer();
  const body: CustomerSessionResponse = customer
    ? {
        authenticated: true,
        customer
      }
    : {
        authenticated: false,
        customer: null
      };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
