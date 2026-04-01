import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { buildMetadata, siteName } from "@/lib/seo";

const lastUpdated = "27 de março de 2026";

const exchangeHighlights = [
  {
    label: "Prazo inicial",
    value: "Até 30 dias após o recebimento para a primeira solicitação."
  },
  {
    label: "Condição da peça",
    value: "A análise considera estado geral, etiquetas e integridade do produto."
  },
  {
    label: "Canal de abertura",
    value: "O atendimento deve ser iniciado com número do pedido e contexto da solicitação."
  }
] as const;

const exchangeSteps = [
  "Abra o atendimento com número do pedido, motivo da solicitação e, se necessário, contexto adicional sobre a peça.",
  "A equipe analisa a elegibilidade e orienta os próximos passos conforme o tipo de troca, devolução ou ajuste possível no caso.",
  "Depois da conferência, o desfecho segue de acordo com a análise realizada, podendo envolver crédito, reenvio, troca ou estorno."
] as const;

const exchangeRules = [
  "A solicitação precisa respeitar o prazo informado nesta página ou o que for indicado pela equipe no caso concreto.",
  "A análise considera uso, conservação da peça, presença de etiquetas e qualquer modificação posterior ao recebimento.",
  "Dados do pedido e informações de contato devem estar disponíveis para localizar a compra e orientar o atendimento."
] as const;

export const metadata: Metadata = buildMetadata({
  title: "Trocas e devoluções",
  description:
    `Política de trocas da ${siteName} com critérios claros, prazo informado e linguagem direta para o pós-compra.`,
  path: "/trocas"
});

export default function ExchangesPage() {
  return (
    <section className="shell py-10">
      <PageIntro
        actions={
          <>
            <Link className="button-secondary justify-center" href="/rastreio">
              Consultar pedido
            </Link>
            <Link className="button-ghost justify-center" href="/contato">
              Falar com a equipe
            </Link>
          </>
        }
        breadcrumbs={[
          { label: "Início", href: "/" },
          { label: "Trocas" }
        ]}
        description="Esta página resume como a loja trata solicitações de troca e devolução, com linguagem objetiva e foco em reduzir atrito entre pedido, conta, rastreio e atendimento."
        eyebrow="Trocas"
        title="Trocas e devoluções com critérios claros e leitura consistente do pedido."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {exchangeHighlights.map((highlight) => (
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

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="panel rounded-[2rem] p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-ink">Como a solicitação é conduzida</h2>
          <div className="mt-5 grid gap-3">
            {exchangeSteps.map((step, index) => (
              <div className="rounded-[1.35rem] bg-black/5 p-4" key={step}>
                <p className="text-[0.72rem] uppercase tracking-[0.18em] text-slate">
                  Etapa {index + 1}
                </p>
                <p className="mt-2.5 text-sm leading-6 text-slate">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-[1.35rem] border border-black/6 bg-black/[0.03] p-4 text-sm leading-6 text-slate">
            Tenha em mãos o número do pedido, o e-mail usado na compra e o motivo da solicitação.
            Isso acelera a análise e evita retrabalho entre suporte, conta e rastreio.
          </div>
        </article>

        <article className="panel-dark rounded-[2rem] p-5 sm:p-6">
          <p className="eyebrow !text-white/55">Elegibilidade</p>
          <h2 className="mt-3 text-xl font-semibold text-white">Critérios usados na análise</h2>
          <ul className="mt-5 space-y-2.5 text-sm leading-6 text-white/72">
            {exchangeRules.map((rule) => (
              <li className="flex items-start gap-3" key={rule}>
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 rounded-full bg-white" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link className="button-primary justify-center" href="/contato">
              Falar com a equipe
            </Link>
            <Link className="button-secondary justify-center" href="/rastreio">
              Consultar pedido
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
