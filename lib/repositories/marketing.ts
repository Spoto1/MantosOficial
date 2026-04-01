import "server-only";

import { ContactLeadStatus, LeadStatus, LeadType, NewsletterLeadStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  nonDemoAdminContactWhere,
  nonDemoAdminNewsletterWhere
} from "@/lib/repositories/admin-filters";
import {
  contactLeadSchema,
  contactLeadUpdateSchema,
  newsletterLeadSchema,
  newsletterUpdateSchema
} from "@/lib/validators";

export async function subscribeNewsletter(input: { email: string; source?: string }) {
  const parsed = newsletterLeadSchema.parse({
    email: input.email,
    source: input.source ?? "footer"
  });

  const newsletterLead = await prisma.newsletterLead.upsert({
    where: { email: parsed.email },
    update: {
      source: parsed.source,
      status: NewsletterLeadStatus.ACTIVE
    },
    create: {
      email: parsed.email,
      source: parsed.source,
      status: NewsletterLeadStatus.ACTIVE
    }
  });

  await prisma.lead.upsert({
    where: {
      newsletterLeadId: newsletterLead.id
    },
    update: {
      email: newsletterLead.email,
      source: newsletterLead.source,
      origin: "newsletter",
      status: LeadStatus.NEW,
      context: `Inscrição capturada via ${newsletterLead.source}.`
    },
    create: {
      type: LeadType.NEWSLETTER,
      email: newsletterLead.email,
      source: newsletterLead.source,
      origin: "newsletter",
      context: `Inscrição capturada via ${newsletterLead.source}.`,
      status: LeadStatus.NEW,
      newsletterLeadId: newsletterLead.id
    }
  });

  return newsletterLead;
}

export async function createContactLead(input: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}) {
  const parsed = contactLeadSchema.parse(input);

  const contactLead = await prisma.contactLead.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone || null,
      subject: parsed.subject,
      message: parsed.message
    }
  });

  await prisma.lead.create({
    data: {
      type: LeadType.CONTACT,
      source: "contact-form",
      origin: "contact",
      name: contactLead.name,
      email: contactLead.email,
      phone: contactLead.phone,
      message: `${contactLead.subject}\n\n${contactLead.message}`,
      context: `Mensagem de contato enviada com o assunto "${contactLead.subject}".`,
      status: LeadStatus.NEW,
      contactLeadId: contactLead.id
    }
  });

  return contactLead;
}

export async function getNewsletterLeads(filters?: {
  query?: string;
  status?: NewsletterLeadStatus | "ALL";
  dateFrom?: Date | null;
  dateTo?: Date | null;
}) {
  return prisma.newsletterLead.findMany({
    where: {
      AND: [
        nonDemoAdminNewsletterWhere,
        {
          status: filters?.status && filters.status !== "ALL" ? filters.status : undefined,
          email: filters?.query
            ? {
                contains: filters.query,
                mode: "insensitive"
              }
            : undefined,
          createdAt:
            filters?.dateFrom || filters?.dateTo
              ? {
                  gte: filters.dateFrom ?? undefined,
                  lte: filters.dateTo ?? undefined
                }
              : undefined
        }
      ]
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function getContactLeads(filters?: {
  query?: string;
  status?: ContactLeadStatus | "ALL";
  dateFrom?: Date | null;
  dateTo?: Date | null;
}) {
  return prisma.contactLead.findMany({
    where: {
      AND: [
        nonDemoAdminContactWhere,
        {
          status: filters?.status && filters.status !== "ALL" ? filters.status : undefined,
          OR: filters?.query
            ? [
                {
                  name: {
                    contains: filters.query,
                    mode: "insensitive"
                  }
                },
                {
                  email: {
                    contains: filters.query,
                    mode: "insensitive"
                  }
                },
                {
                  subject: {
                    contains: filters.query,
                    mode: "insensitive"
                  }
                },
                {
                  message: {
                    contains: filters.query,
                    mode: "insensitive"
                  }
                }
              ]
            : undefined,
          createdAt:
            filters?.dateFrom || filters?.dateTo
              ? {
                  gte: filters.dateFrom ?? undefined,
                  lte: filters.dateTo ?? undefined
                }
              : undefined
        }
      ]
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function getContactLeadById(id: string) {
  return prisma.contactLead.findUnique({
    where: {
      id
    }
  });
}

export async function updateNewsletterLead(input: {
  id: string;
  status: string;
  internalNotes?: string;
}) {
  const parsed = newsletterUpdateSchema.parse(input);

  return prisma.newsletterLead.update({
    where: {
      id: parsed.id
    },
    data: {
      status: parsed.status,
      internalNotes: parsed.internalNotes || null
    }
  });
}

export async function updateContactLead(input: {
  id: string;
  status: string;
  internalNotes?: string;
}) {
  const parsed = contactLeadUpdateSchema.parse(input);

  return prisma.contactLead.update({
    where: {
      id: parsed.id
    },
    data: {
      status: parsed.status,
      internalNotes: parsed.internalNotes || null
    }
  });
}
