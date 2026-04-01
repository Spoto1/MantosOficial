import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { buildMetadata, siteName } from "@/lib/seo";

const pillars = [
  {
    title: "Curadoria de coleção",
    description:
      "Cada linha nasce com função clara para jogo, cidade, viagem e rotina urbana."
  },
  {
    title: "Acabamento que comunica",
    description:
      "Modelagem, material e cor trabalham juntos para valorizar a peça sem excesso gráfico."
  },
  {
    title: "Serviço sem ruído",
    description:
      "Contato, rastreio e política de troca aparecem com a mesma clareza da vitrine."
  }
] as const;

export const metadata: Metadata = buildMetadata({
  title: `Sobre a ${siteName}`,
  description:
    `Conheça a assinatura da ${siteName}: camisas autorais, coleção organizada e linguagem direta entre vitrine e pós-compra.`,
  path: "/sobre"
});

export default function AboutPage() {
  return (
    <section className="shell py-10">
      <PageIntro
        breadcrumbs={[
          { label: "Início", href: "/" },
          { label: "Sobre" }
        ]}
        description={`${siteName} reúne camisas e jerseys autorais com foco em produto, coleção e informação clara entre vitrine, compra e pós-compra.`}
        eyebrow="Sobre"
        title="Uma marca de mantos pensada para ser escolhida, usada e acompanhada."
      />

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-5">
          <article className="panel rounded-[2rem] p-5 sm:p-6">
            <h2 className="text-[1.7rem] font-semibold text-ink">A assinatura da casa</h2>
            <div className="mt-4 space-y-3.5 text-sm leading-7 text-slate">
              <p>
                A identidade da marca parte do encontro entre repertório esportivo, moda urbana e
                leitura direta do produto para deixar a peça ocupar o centro da escolha.
              </p>
              <p>
                As coleções são organizadas em recortes claros como Partida, Studio e Travel,
                permitindo navegar por uso, linguagem e intenção sem transformar o catálogo em um
                conjunto disperso de peças.
              </p>
              <p>
                A proposta é simples: produto forte, linguagem contida e serviço claro para que a
                compra pareça confiável do primeiro clique ao pós-compra.
              </p>
            </div>
          </article>

          <div className="grid gap-4 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article className="panel rounded-[1.6rem] p-4" key={pillar.title}>
                <h3 className="text-lg font-semibold text-ink">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate">{pillar.description}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel-dark rounded-[2rem] p-5 sm:p-6">
          <p className="eyebrow !text-white/55">O que sustenta a marca</p>
          <div className="mt-4 grid gap-3">
            {[
              ["Peças de leitura limpa", "Silhuetas, materiais e cores pensadas para dar protagonismo ao produto."],
              ["Destaques de coleção", "Seleções especiais entram como parte do catálogo, não como excesso visual."],
              ["Suporte próximo", "Contato, rastreio e política de troca apresentados com linguagem direta."]
            ].map(([title, description]) => (
              <div className="rounded-[1.4rem] border border-white/10 p-4" key={title}>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/70">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link className="button-primary justify-center" href="/colecao">
              Ver coleção
            </Link>
            <Link className="button-secondary justify-center" href="/contato">
              Falar com a equipe
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
