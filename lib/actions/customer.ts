"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { clearCustomerSession, createCustomerSession, resolveSafeRedirectPath } from "@/lib/auth/customer";
import {
  CUSTOMER_LOGIN_RATE_LIMIT,
  CUSTOMER_REGISTER_RATE_LIMIT
} from "@/lib/rate-limit-policies";
import {
  buildRateLimitIdentifier,
  enforceRateLimit,
  getRequestIp,
  RateLimitExceededError
} from "@/lib/rate-limit";
import { authenticateCustomerCredentials, registerCustomerAccount } from "@/lib/repositories/customers";
import type { ActionResponse } from "@/lib/types";

function resolveActionFormData(
  previousStateOrFormData: ActionResponse | FormData,
  maybeFormData?: FormData
) {
  if (previousStateOrFormData instanceof FormData) {
    return previousStateOrFormData;
  }

  return maybeFormData;
}

function getNextPath(formData: FormData, fallback: string) {
  return resolveSafeRedirectPath(String(formData.get("next") ?? ""), fallback);
}

export async function loginCustomerAction(
  previousStateOrFormData: ActionResponse | FormData,
  maybeFormData?: FormData
): Promise<ActionResponse> {
  const formData = resolveActionFormData(previousStateOrFormData, maybeFormData);

  if (!formData) {
    return {
      ok: false,
      message: "Não foi possível ler os dados de acesso."
    };
  }

  try {
    const requestHeaders = await headers();

    await enforceRateLimit({
      policy: CUSTOMER_LOGIN_RATE_LIMIT,
      identifier: buildRateLimitIdentifier([
        getRequestIp(requestHeaders),
        String(formData.get("email") ?? "")
      ])
    });

    const customer = await authenticateCustomerCredentials({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? "")
    });

    if (!customer) {
      return {
        ok: false,
        message: "E-mail ou senha inválidos."
      };
    }

    await createCustomerSession({
      customerId: customer.id,
      userAgent: requestHeaders.get("user-agent")
    });

    redirect(getNextPath(formData, "/conta"));
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof RateLimitExceededError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possível entrar."
    };
  }
}

export async function registerCustomerAction(
  previousStateOrFormData: ActionResponse | FormData,
  maybeFormData?: FormData
): Promise<ActionResponse> {
  const formData = resolveActionFormData(previousStateOrFormData, maybeFormData);

  if (!formData) {
    return {
      ok: false,
      message: "Não foi possível ler os dados de cadastro."
    };
  }

  try {
    const requestHeaders = await headers();

    await enforceRateLimit({
      policy: CUSTOMER_REGISTER_RATE_LIMIT,
      identifier: buildRateLimitIdentifier([
        getRequestIp(requestHeaders),
        String(formData.get("email") ?? "")
      ])
    });

    const customer = await registerCustomerAccount({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? "")
    });

    await createCustomerSession({
      customerId: customer.id,
      userAgent: requestHeaders.get("user-agent")
    });

    redirect(getNextPath(formData, "/checkout"));
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof RateLimitExceededError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possível criar a conta."
    };
  }
}

export async function logoutCustomerAction(formData: FormData) {
  const nextPath = getNextPath(formData, "/");

  await clearCustomerSession();
  redirect(nextPath);
}
