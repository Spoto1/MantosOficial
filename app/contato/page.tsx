import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import { PageIntro } from "@/components/page-intro";
import { buildMetadata, siteName } from "@/lib/seo";

const contactHighlights = [
  {
    title: "Suporte de pedido",
    description:
      "Use este canal para dúvidas sobre checkout, confirmação, detalhe do pedido, rastreio e trocas."
  },
  {
    title: "Projetos especiais",
    description:
      "Pedidos corporativos, collabs, ativações e produções sob demanda passam pelo mesmo fluxo comercial."
  },
  {
    title: "Resposta objetiva",
    description:
      "Quanto mais contexto você enviar, mais rápido a equipe consegue orientar o próximo passo."
  }
] as const;

export const metadata: Metadata = buildMetadata({
  title: "Contato comercial e suporte",
  description:
    "Canal de contato da Mantos Oficial para suporte de compra, pedidos corporativos, ativações e collabs.",
  path: "/contato"
});

export default function ContactPage() {
  return (
    <section className="shell py-10">
      <PageIntro
        breadcrumbs={[
          { label: "Início", href: "/" },
          { label: "Contato" }
        ]}
        description="Use este canal para suporte de pedido, produção especial, trocas, parcerias e dúvidas sobre a curadoria. A equipe responde com linguagem direta e contexto comercial."
        eyebrow="Contato"
        title={`Fale com a equipe da ${siteName}.`}
      />

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[1fr_0.9fr]">
        <ContactForm />

        <aside className="panel-dark rounded-[2rem] p-5 sm:p-6">
          <p className="eyebrow !text-white/50">Atendimento</p>
          <h2 className="mt-3 font-display text-[clamp(2rem,2.9vw,2.85rem)] leading-[0.92]">
            Atendimento comercial e pós-compra com leitura objetiva do que precisa ser resolvido.
          </h2>
          <div className="mt-6 grid gap-3">
            {contactHighlights.map((highlight) => (
              <div className="rounded-[1.4rem] border border-white/10 p-4" key={highlight.title}>
                <h3 className="text-base font-semibold text-white">{highlight.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/72">{highlight.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/72">
            <p className="font-semibold text-white">Antes de enviar</p>
            <p className="mt-2">
              Se a mensagem estiver ligada a um pedido, informe o número da compra, o e-mail usado
              no checkout e o ponto exato que precisa de apoio.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
