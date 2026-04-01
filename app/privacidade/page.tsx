import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { buildMetadata, siteName } from "@/lib/seo";

const lastUpdated = "27 de março de 2026";

const privacyHighlights = [
  {
    label: "Escopo",
    value: "Navegação, conta, checkout, rastreio e atendimento."
  },
  {
    label: "Compartilhamento",
    value: "Só com parceiros necessários para pagamento, entrega e operação."
  },
  {
    label: "Contato",
    value: "A equipe responde pedidos ligados a dados, conta e suporte comercial."
  }
] as const;

const privacySections = [
  {
    title: "1. O que esta página cobre",
    paragraphs: [
      `Esta política resume como a ${siteName} trata dados ligados à navegação da loja, ao uso da conta, à compra, ao rastreio e ao contato com a equipe.`,
      "O objetivo é explicar o tratamento de dados de forma clara e proporcional ao funcionamento atual da plataforma, sem promessas jurídicas que não possam ser sustentadas pela operação."
    ]
  },
  {
    title: "2. Dados que podem ser tratados",
    paragraphs: [
      "Dependendo da interação, a loja pode tratar dados como nome, e-mail, telefone, endereço de entrega, itens comprados, informações do pedido, favoritos salvos e mensagens enviadas pelos formulários de contato.",
      "Também podem existir dados técnicos básicos de navegação e sessão, usados para manter a conta ativa, proteger formulários, limitar abusos e preservar a estabilidade da experiência."
    ]
  },
  {
    title: "3. Como esses dados são usados",
    paragraphs: [
      "Os dados são usados para permitir a navegação, concluir a compra, associar pedidos à conta do cliente, exibir o andamento do pós-compra e responder solicitações de suporte.",
      "Quando o cliente salva favoritos, acessa a própria conta ou retorna para acompanhar um pedido, essas informações ajudam a manter a experiência consistente entre checkout, detalhe do pedido e rastreio."
    ]
  },
  {
    title: "4. Compartilhamento necessário para operar a compra",
    paragraphs: [
      "Parte dos dados pode ser compartilhada apenas com serviços envolvidos na execução da compra, como pagamento, entrega e infraestrutura da aplicação.",
      "Esse compartilhamento é limitado ao que for necessário para processar o pedido, atualizar o status da compra, viabilizar o envio e oferecer atendimento adequado."
    ]
  },
  {
    title: "5. Sessão, cookies e proteção operacional",
    paragraphs: [
      "A plataforma utiliza mecanismos de sessão para manter o acesso do cliente à conta e permitir que pedidos, favoritos e histórico sejam exibidos com segurança no navegador em uso.",
      "Também podem ser utilizados recursos técnicos de proteção, como controle de tentativas excessivas em formulários e rastreio, para reduzir abuso e preservar a experiência normal da loja."
    ]
  },
  {
    title: "6. Tempo de retenção e contato",
    paragraphs: [
      "Dados ligados à operação da compra e ao atendimento podem ser mantidos pelo período compatível com rotinas operacionais, obrigações legais, suporte e histórico do pedido.",
      "Se você precisar tratar um tema relacionado à sua conta, ao pedido ou às informações enviadas para a marca, utilize os canais de contato da loja para que a equipe possa analisar o caso."
    ]
  }
] as const;

export const metadata: Metadata = buildMetadata({
  title: "Política de privacidade",
  description:
    `Diretrizes de privacidade da ${siteName} para navegação, conta, compra, rastreio e atendimento.`,
  path: "/privacidade"
});

export default function PrivacyPage() {
  return (
    <section className="shell py-10">
      <PageIntro
        actions={
          <>
            <Link className="button-secondary justify-center" href="/termos">
              Ver termos
            </Link>
            <Link className="button-ghost justify-center" href="/contato">
              Falar com a equipe
            </Link>
          </>
        }
        breadcrumbs={[
          { label: "Início", href: "/" },
          { label: "Privacidade" }
        ]}
        description="Este texto resume como a plataforma trata dados ligados à navegação, à conta, à compra e ao atendimento. A intenção é manter a leitura objetiva, útil e coerente com o funcionamento real da loja."
        eyebrow="Privacidade"
        title="Tratamento de dados com clareza, contexto e uso responsável."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {privacyHighlights.map((highlight) => (
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
        {privacySections.map((section) => (
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
