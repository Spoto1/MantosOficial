"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  CONTACT_RATE_LIMIT,
  NEWSLETTER_RATE_LIMIT
} from "@/lib/rate-limit-policies";
import {
  buildRateLimitIdentifier,
  enforceRateLimit,
  getRequestIp,
  RateLimitExceededError
} from "@/lib/rate-limit";
import { resolveAppUrlFromHeaders } from "@/lib/runtime-config";
import { getCustomerSession } from "@/lib/auth/customer";
import { isLocalCheckoutDemoAllowed } from "@/lib/checkout-mode";
import {
  isLocalValidationContext,
  LOCAL_VALIDATION_CONTEXT,
  LOCAL_VALIDATION_FLOW
} from "@/lib/local-validation";
import { createContactLead, subscribeNewsletter } from "@/lib/repositories/marketing";
import { updateDemoOrderStatus } from "@/lib/repositories/orders";
import type { ActionResponse } from "@/lib/types";

function optionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : undefined;
}

function resolveActionFormData(
  previousStateOrFormData: ActionResponse | FormData,
  maybeFormData?: FormData
) {
  if (previousStateOrFormData instanceof FormData) {
    return previousStateOrFormData;
  }

  return maybeFormData;
}

export async function subscribeNewsletterAction(
  previousStateOrFormData: ActionResponse | FormData,
  maybeFormData?: FormData
): Promise<ActionResponse> {
  const formData = resolveActionFormData(previousStateOrFormData, maybeFormData);

  if (!formData) {
    return {
      ok: false,
      message: "Não foi possível ler os dados da newsletter."
    };
  }

  try {
    const requestHeaders = await headers();

    await enforceRateLimit({
      policy: NEWSLETTER_RATE_LIMIT,
      identifier: buildRateLimitIdentifier([
        getRequestIp(requestHeaders),
        String(formData.get("email") ?? "")
      ])
    });

    await subscribeNewsletter({
      email: String(formData.get("email") ?? ""),
      source: optionalString(formData.get("source")) ?? "footer"
    });
    revalidatePath("/admin/newsletter");

    return {
      ok: true,
      message: "E-mail salvo na newsletter com sucesso."
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof RateLimitExceededError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possível salvar o e-mail."
    };
  }
}

export async function createContactLeadAction(
  previousStateOrFormData: ActionResponse | FormData,
  maybeFormData?: FormData
): Promise<ActionResponse> {
  const formData = resolveActionFormData(previousStateOrFormData, maybeFormData);

  if (!formData) {
    return {
      ok: false,
      message: "Não foi possível ler os dados do formulário."
    };
  }

  try {
    const requestHeaders = await headers();

    await enforceRateLimit({
      policy: CONTACT_RATE_LIMIT,
      identifier: buildRateLimitIdentifier([
        getRequestIp(requestHeaders),
        String(formData.get("email") ?? "")
      ])
    });

    await createContactLead({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: optionalString(formData.get("phone")),
      subject: String(formData.get("subject") ?? ""),
      message: String(formData.get("message") ?? "")
    });
    revalidatePath("/admin/contacts");

    return {
      ok: true,
      message: "Mensagem enviada com sucesso. A equipe responde pelo mesmo canal assim que houver retorno."
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof RateLimitExceededError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Não foi possível enviar a mensagem."
    };
  }
}

export async function simulateCheckoutDemoAction(formData: FormData) {
  const requestHeaders = await headers();
  const customerSession = await getCustomerSession();
  const orderId = String(formData.get("orderId") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim() as
    | "success"
    | "pending"
    | "failure";
  const context = String(formData.get("context") ?? "").trim();

  if (
    !customerSession ||
    !isLocalCheckoutDemoAllowed({
      requestUrl: resolveAppUrlFromHeaders(requestHeaders)
    }) ||
    !isLocalValidationContext(context) ||
    !orderId ||
    !["success", "pending", "failure"].includes(outcome)
  ) {
    redirect("/checkout");
  }

  const order = await updateDemoOrderStatus({
    orderId,
    outcome,
    expectedCustomerId: customerSession.customerId
  });

  if (outcome === "success") {
    redirect(
      `/checkout/success?order=${order.id}&flow=${LOCAL_VALIDATION_FLOW}&context=${LOCAL_VALIDATION_CONTEXT}`
    );
  }

  if (outcome === "failure") {
    redirect(
      `/checkout/failure?order=${order.id}&flow=${LOCAL_VALIDATION_FLOW}&context=${LOCAL_VALIDATION_CONTEXT}`
    );
  }

  redirect(
    `/checkout/pending?order=${order.id}&flow=${LOCAL_VALIDATION_FLOW}&context=${LOCAL_VALIDATION_CONTEXT}`
  );
}
