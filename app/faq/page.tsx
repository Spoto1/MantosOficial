import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { buildMetadata, siteName } from "@/lib/seo";

const faqGroups = [
  {
    title: "Compra e pagamento",
    items: [
      {
        question: "Como a finalização do pedido acontece?",
        answer:
          "A compra segue para uma etapa própria de checkout, separada da vitrine. Depois da confirmação, o pedido continua disponível na conta, no detalhe do pedido e no rastreio com o mesmo número."
      },
      {
        question: "Posso salvar peças e voltar depois para decidir?",
        answer:
          "Sim. Você pode navegar com calma, salvar seus favoritos e retomar a curadoria antes de concluir a compra."
      },
      {
        question: "Existe frete grátis?",
        answer:
          "Sim. O frete padrão é grátis acima de R$ 650,00. O valor final aparece de forma clara antes de concluir o pedido."
      }
    ]
  },
  {
    title: "Entrega e rastreio",
    items: [
      {
        question: "Como acompanho meu pedido?",
        answer:
          "Use o número do pedido e o e-mail da compra na página de rastreio para consultar pagamento, preparação e andamento da entrega."
      },
      {
        question: "Quando meu pedido é postado?",
        answer:
          "Assim que o pagamento é confirmado, a equipe segue com a preparação do envio e atualiza o andamento da compra."
      },
      {
        question: "Posso ajustar algum dado depois da compra?",
        answer:
          "Se precisar revisar informações de contato ou entrega, fale com a equipe o quanto antes para verificar as possibilidades do pedido."
      }
    ]
  },
  {
    title: "Trocas e suporte",
    items: [
      {
        question: "Como funciona a primeira troca?",
        answer:
          "A primeira solicitação pode ser feita em até 30 dias após o recebimento, com a peça em bom estado e dentro dos critérios informados na política de trocas."
      },
      {
        question: "Posso pedir ajuda para escolher tamanho ou entender a modelagem?",
        answer:
          "Sim. O contato da marca pode orientar sobre caimento, disponibilidade e contexto de uso para ajudar na escolha."
      },
      {
        question: "Os favoritos ficam salvos?",
        answer:
          "Sim. As peças favoritas ficam associadas à sua conta para facilitar o retorno em outra visita."
      }
    ]
  }
] as const;

export const metadata: Metadata = buildMetadata({
  title: "Perguntas frequentes",
  description:
    `FAQ da ${siteName} com respostas claras sobre compra, pagamento, entrega, troca, favoritos e atendimento.`,
  path: "/faq"
});

export default function FaqPage() {
  return (
    <section className="shell py-10">
      <PageIntro
        breadcrumbs={[
          { label: "Início", href: "/" },
          { label: "FAQ" }
        ]}
        description="Uma base de respostas para compra, pagamento, troca, rastreio e atendimento. O objetivo é transmitir clareza comercial sem excesso de discurso."
        eyebrow="FAQ"
        title="Respostas diretas para as dúvidas que mais influenciam a compra."
      />

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="grid gap-5">
          {faqGroups.map((group) => (
            <section className="panel rounded-[2rem] p-5 sm:p-6" key={group.title}>
              <h2 className="text-xl font-semibold text-ink">{group.title}</h2>
              <div className="mt-5 grid gap-3">
                {group.items.map((item) => (
                  <details className="rounded-[1.35rem] bg-black/5 p-4" key={item.question}>
                    <summary className="cursor-pointer list-none text-[0.98rem] font-semibold text-ink">
                      {item.question}
                    </summary>
                    <p className="mt-3 pr-4 text-sm leading-6 text-slate">{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="panel-dark rounded-[2rem] p-5 sm:p-6 xl:sticky xl:top-28">
          <p className="eyebrow !text-white/55">Atendimento</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,2.9vw,2.85rem)] leading-[0.92]">
            Se a dúvida exigir contexto do pedido, a equipe responde com a informação necessária.
          </h2>
          <div className="mt-6 space-y-3 text-sm leading-6 text-white/72">
            <p>Pedidos especiais, collabs, suporte comercial e dúvidas sobre modelagem.</p>
            <p>
              O retorno acontece pelo canal informado, com prioridade para pedidos e solicitações em
              andamento.
            </p>
            <p>
              Quando necessário, a equipe usa o contexto do pedido para orientar a melhor solução.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link className="button-primary justify-center" href="/contato">
              Abrir contato
            </Link>
            <Link className="button-secondary justify-center" href="/rastreio">
              Rastrear pedido
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
