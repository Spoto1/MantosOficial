import { NextResponse } from "next/server";

import { getCustomerSession } from "@/lib/auth/customer";
import {
  buildRateLimitIdentifier,
  enforceRateLimit,
  getRequestIp,
  RateLimitExceededError,
  type RateLimitPolicy
} from "@/lib/rate-limit";
import { toggleFavorite } from "@/lib/repositories/orders";
import {
  getFavoriteProductsByCustomerId,
  isFavoriteProductSaved
} from "@/lib/repositories/storefront";

const FAVORITES_READ_POLICY: RateLimitPolicy = {
  scope: "favorites-read",
  limit: 60,
  windowMs: 1000 * 60 * 10,
  message: "Muitas consultas de favoritos em sequência. Aguarde alguns instantes."
};

const FAVORITES_WRITE_POLICY: RateLimitPolicy = {
  scope: "favorites-write",
  limit: 20,
  windowMs: 1000 * 60 * 10,
  message: "Muitas alterações de favoritos em sequência. Aguarde antes de tentar novamente."
};

function buildFavoritesIdentifier(request: Request, customerId: string) {
  return buildRateLimitIdentifier([customerId, getRequestIp(request.headers)]);
}

export async function GET(request: Request) {
  try {
    const session = await getCustomerSession();

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          message: "Entre na sua conta para consultar os favoritos."
        },
        {
          status: 401
        }
      );
    }

    await enforceRateLimit({
      policy: FAVORITES_READ_POLICY,
      identifier: buildFavoritesIdentifier(request, session.customerId)
    });

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (productId) {
      const saved = await isFavoriteProductSaved({
        customerId: session.customerId,
        productId
      });

      return NextResponse.json({
        ok: true,
        saved
      });
    }

    const products = await getFavoriteProductsByCustomerId(session.customerId);

    return NextResponse.json({
      ok: true,
      products
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfterSeconds)
          }
        }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Não foi possível consultar os favoritos."
      },
      {
        status: 400
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          message: "Entre na sua conta para salvar favoritos."
        },
        {
          status: 401
        }
      );
    }

    await enforceRateLimit({
      policy: FAVORITES_WRITE_POLICY,
      identifier: buildFavoritesIdentifier(request, session.customerId)
    });

    const payload = (await request.json()) as {
      productId: string;
    };
    const result = await toggleFavorite({
      customerId: session.customerId,
      productId: payload.productId
    });

    return NextResponse.json({
      ok: true,
      saved: result.saved
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfterSeconds)
          }
        }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Não foi possível salvar o favorito."
      },
      {
        status: 400
      }
    );
  }
}
