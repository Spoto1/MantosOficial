import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { buildMetadata, siteName } from "@/lib/seo";

const lastUpdated = "27 de março de 2026";

const termsHighlights = [
  {
    label: "Compra",
    value: "O pedido depende de disponibilidade, revisão dos dados e confirmação do pagamento."
  },
  {
    label: "Conta",
    value: "O cliente é responsável pela veracidade das informações usadas na compra."
  },
  {
    label: "Pós-compra",
    value: "Conta, detalhe do pedido, rastreio e atendimento formam a leitura oficial do andamento."
  }
] as const;

const termsSections = [
  {
    title: "1. Uso da plataforma",
    paragraphs: [
      `Ao navegar na ${siteName}, o usuário concorda em utilizar a plataforma de forma compatível com a finalidade comercial da loja e com as regras publicadas nas páginas institucionais vigentes.`,
      "A navegação, o uso da conta e a finalização de pedidos devem acontecer com informações corretas e sem tentativa de interferência indevida no funcionamento normal da experiência."
    ]
  },
  {
    title: "2. Conta, cadastro e dados informados",
    paragraphs: [
      "Quando houver criação ou uso de conta, o cliente é responsável por manter seus dados de acesso protegidos e por informar dados corretos de contato, entrega e identificação da compra.",
      "Pedidos vinculados à conta, favoritos salvos e histórico de navegação autenticada dependem dessas informações para manter a experiência consistente entre checkout, detalhe do pedido e rastreio."
    ]
  },
  {
    title: "3. Catálogo, disponibilidade e preço",
    paragraphs: [
      "Produtos, estoque, preço, frete, campanhas e condições promocionais podem ser atualizados conforme disponibilidade e operação vigente no momento da compra.",
      "A exibição de um item na vitrine não representa garantia definitiva de disponibilidade até que o pedido seja efetivamente registrado e o fluxo de pagamento seja concluído conforme o estado correspondente."
    ]
  },
  {
    title: "4. Pagamento e confirmação do pedido",
    paragraphs: [
      "O pedido pode passar por estados como confirmação, análise, aprovação, cancelamento ou falha, dependendo do retorno do provedor de pagamento e das regras aplicáveis à transação.",
      "A leitura oficial do pedido aparece nas páginas de pós-compra, na área da conta e no rastreio, que informam o que já foi confirmado, o que ainda depende de validação e qual é a próxima etapa da compra."
    ]
  },
  {
    title: "5. Entrega, rastreio e trocas",
    paragraphs: [
      "Após a confirmação do pagamento, o pedido segue para preparação e depois para expedição ou retirada, conforme a modalidade selecionada no checkout.",
      "Critérios de troca, devolução e atendimento devem ser consultados nas páginas próprias da loja, que podem ser atualizadas para refletir a operação vigente, prazos e elegibilidade aplicável a cada caso."
    ]
  },
  {
    title: "6. Conteúdo da marca e atualizações",
    paragraphs: [
      "Elementos de identidade, textos, imagens, organização de coleção e demais conteúdos institucionais publicados na plataforma integram a apresentação da marca e não devem ser reproduzidos fora do contexto permitido pela operação.",
      "Estes termos podem ser ajustados para refletir mudanças operacionais, tecnológicas ou legais. A versão considerada vigente é sempre a publicada nesta página."
    ]
  }
] as const;

export const metadata: Metadata = buildMetadata({
  title: "Termos de uso",
  description:
    `Condições de uso da ${siteName}, com foco em compra, conta, disponibilidade, pagamento e pós-compra.`,
  path: "/termos"
});

export default function TermsPage() {
  return (
    <section className="shell py-10">
      <PageIntro
        actions={
          <>
            <Link className="button-secondary justify-center" href="/privacidade">
              Ver privacidade
            </Link>
            <Link className="button-ghost justify-center" href="/trocas">
              Ver trocas
            </Link>
          </>
        }
        breadcrumbs={[
          { label: "Início", href: "/" },
          { label: "Termos" }
        ]}
        description="Estas condições descrevem, de forma objetiva, como a plataforma organiza navegação, conta, compra, confirmação do pedido e leitura do pós-compra."
        eyebrow="Termos"
        title="Regras de uso e compra descritas com clareza e leitura comercial."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {termsHighlights.map((highlight) => (
          <article className="panel rounded-[1.7rem] p-5" key={highlight.label}>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate">
              {highlight.label}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate">{highlight.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-[1.8rem] border border-black/6 bg-black/[0.03] p-5 text-sm leading-7 text-slate">
        <span className="font-semibold text-ink">Última revisão editorial:</span> {lastUpdated}
      </div>

      <div className="mt-8 grid gap-5">
        {termsSections.map((section) => (
          <article className="panel rounded-[2rem] p-5 sm:p-6" key={section.title}>
            <h2 className="text-xl font-semibold text-ink">{section.title}</h2>
            <div className="mt-4 space-y-3.5 text-sm leading-7 text-slate">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
