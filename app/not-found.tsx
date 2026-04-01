import Link from "next/link";

export default function NotFound() {
  return (
    <section className="shell py-24">
      <div className="empty-state mx-auto max-w-3xl">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 font-display text-5xl leading-none text-ink sm:text-6xl">
          Essa rota saiu da linha de jogo.
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate">
          A página que você tentou abrir não está disponível na Mantos Oficial. Volte para a
          vitrine, navegue pela coleção ou siga para o contato.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="button-primary justify-center" href="/">
            Voltar ao início
          </Link>
          <Link className="button-secondary justify-center" href="/colecao">
            Ir para a coleção
          </Link>
          <Link className="button-secondary justify-center" href="/contato">
            Falar com a equipe
          </Link>
        </div>
      </div>
    </section>
  );
}
