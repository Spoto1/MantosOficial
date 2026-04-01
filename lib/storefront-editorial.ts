import type { StorefrontProduct } from "@/lib/types";

export const tournamentCollectionSlug = "selecao-2026";
export const tournamentProductSlug = "camisa-noite-verde-dourado";
export const tournamentCapsuleName = "Edição especial";

export function isTournamentCapsule(
  product?: Pick<StorefrontProduct, "slug" | "collectionSlug"> | null
) {
  return Boolean(
    product &&
      (product.slug === tournamentProductSlug || product.collectionSlug === tournamentCollectionSlug)
  );
}

export const homeTrustSignals = [
  {
    value: "Fluxo de compra claro",
    label: "Resumo transparente, etapa de pagamento orientada e continuidade do pedido pela conta."
  },
  {
    value: "Troca em 30 dias",
    label: "Primeira solicitação em até 30 dias após o recebimento."
  },
  {
    value: "Acompanhamento consistente",
    label: "Conta, detalhe do pedido e rastreio seguem a mesma leitura do pós-compra."
  }
] as const;

export const editorialPillars = [
  {
    title: "Partida",
    description: "Camisas pensadas para dia de jogo, com presença visual forte e leitura direta da peça.",
    href: "/colecao?collection=partida"
  },
  {
    title: "Edição especial",
    description:
      "Uma seleção com atmosfera própria para quem busca presença mais marcada dentro da coleção.",
    href: `/colecao?collection=${tournamentCollectionSlug}`
  },
  {
    title: "Travel",
    description:
      "Peças para deslocamento, treino e rotina urbana com linguagem esportiva mais contida.",
    href: "/colecao?collection=travel"
  }
] as const;

export const institutionalHighlights = [
  {
    title: "FAQ de operação",
    description: "Respostas claras sobre compra, entrega, troca, favoritos e atendimento.",
    href: "/faq"
  },
  {
    title: "Acompanhamento do pedido",
    description: "Consulta por número do pedido e e-mail para acompanhar pagamento, preparo e envio.",
    href: "/rastreio"
  },
  {
    title: "Trocas e política",
    description: "Regras objetivas para troca e devolução, explicadas em linguagem direta.",
    href: "/trocas"
  },
  {
    title: "Manifesto da marca",
    description: "Contexto sobre curadoria, linguagem visual e a assinatura da Mantos Oficial.",
    href: "/sobre"
  }
] as const;
