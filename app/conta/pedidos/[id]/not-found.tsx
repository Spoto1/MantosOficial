import Link from "next/link";

import { AccountEmptyPanel } from "@/components/account/account-cards";
import { AccountShell } from "@/components/account/account-shell";

export default function AccountOrderNotFound() {
  return (
    <AccountShell
      actions={
        <Link className="button-secondary justify-center" href="/conta/pedidos">
          Voltar aos pedidos
        </Link>
      }
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Minha conta", href: "/conta" },
        { label: "Pedidos", href: "/conta/pedidos" },
        { label: "Pedido não encontrado" }
      ]}
      description="Se o identificador não pertence à sua conta ou não existe mais, o painel bloqueia a visualização para preservar a privacidade do histórico."
      eyebrow="Pedido"
      section="orders"
      title="Não encontramos este pedido."
    >
      <section className="account-panel">
        <AccountEmptyPanel
          description="Confira se você abriu o pedido certo a partir da sua lista de pedidos. Se precisar de ajuda, fale com a equipe informando o número da compra."
          primaryAction={{ label: "Voltar aos pedidos", href: "/conta/pedidos" }}
          secondaryAction={{ label: "Falar com suporte", href: "/contato" }}
          title="Este detalhe não está disponível."
        />
      </section>
    </AccountShell>
  );
}
