import type { Metadata } from "next";
import Link from "next/link";

import {
  AccountActionTile,
  AccountEmptyPanel,
  AccountFavoriteCard,
  AccountMetricCard,
  AccountPanelHeading
} from "@/components/account/account-cards";
import { AccountShell } from "@/components/account/account-shell";
import { requireCustomerAuth } from "@/lib/auth/customer";
import { isLocalCheckoutDemoAllowed } from "@/lib/checkout-mode";
import {
  appendLocalValidationContext,
  isLocalValidationContext
} from "@/lib/local-validation";
import { getFavoriteProductsByCustomerId } from "@/lib/repositories/storefront";
import { buildMetadata, siteName } from "@/lib/seo";
import { tournamentCapsuleName, tournamentCollectionSlug } from "@/lib/storefront-editorial";

export const metadata: Metadata = buildMetadata({
  title: "Favoritos salvos",
  description:
    `Curadoria autenticada de peças salvas para comparar produtos e retomar a compra na ${siteName}.`,
  path: "/favoritos",
  noIndex: true
});

export const dynamic = "force-dynamic";

type FavoritesPageProps = {
  searchParams?: Promise<{
    context?: string;
  }>;
};

export default async function FavoritesPage({ searchParams }: FavoritesPageProps) {
  const resolved = (await searchParams) ?? {};
  const localValidationLookup =
    isLocalCheckoutDemoAllowed() && isLocalValidationContext(resolved.context);
  const dashboardHref = appendLocalValidationContext("/conta", localValidationLookup);
  const ordersHref = appendLocalValidationContext("/conta/pedidos", localValidationLookup);
  const favoritesHref = appendLocalValidationContext("/favoritos", localValidationLookup);
  const session = await requireCustomerAuth({
    next: favoritesHref
  });
  const products = await getFavoriteProductsByCustomerId(session.customerId);
  const readyToShipCount = products.filter((product) => product.stock > 0).length;
  const collectionCount = new Set(products.map((product) => product.collection)).size;

  return (
    <AccountShell
      actions={
        <>
          <Link className="button-secondary button-compact justify-center" href={dashboardHref}>
            Voltar ao dashboard
          </Link>
          <Link className="button-accent button-compact justify-center" href="/colecao">
            Explorar coleção
          </Link>
        </>
      }
      breadcrumbs={[
        { label: "Início", href: "/" },
        { label: "Minha conta", href: dashboardHref },
        { label: "Favoritos" }
      ]}
      description="Peças salvas para comparar produtos, abrir o detalhe e retomar a compra com a conta já conectada à jornada."
      eyebrow="Favoritos"
      preserveLocalValidationContext={localValidationLookup}
      section="favorites"
      title="Favoritos salvos"
    >
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        <AccountMetricCard
          detail="Seleção privada vinculada à sua conta."
          emphasize
          label="Peças salvas"
          value={String(products.length)}
        />
        <AccountMetricCard
          detail="Itens com estoque para seguir do produto ao carrinho."
          label="Com estoque"
          value={String(readyToShipCount)}
        />
        <AccountMetricCard
          detail="Linhas diferentes reunidas na sua curadoria."
          label="Linhas salvas"
          value={String(collectionCount)}
        />
      </div>

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-[1.12fr_0.88fr]">
        {products.length === 0 ? (
          <AccountEmptyPanel
            description="Ainda não há nenhuma peça salva nesta conta. Navegue pela coleção, marque os produtos que merecem uma segunda olhada e retome a compra a partir da sua curadoria quando quiser."
            primaryAction={{ label: "Explorar coleção", href: "/colecao" }}
            secondaryAction={{ label: "Voltar ao dashboard", href: dashboardHref }}
            title="Sua lista de favoritos está vazia."
          />
        ) : (
          <section className="account-panel">
            <AccountPanelHeading
              action={
                <Link className="button-secondary button-compact justify-center px-4" href="/colecao">
                  Continuar explorando
                </Link>
              }
              description="Uma lista direta para revisar peças, comparar melhor e voltar ao produto certo antes de seguir para o carrinho."
              kicker="Peças salvas"
              title="Favoritos da sua conta"
            />

            <div className="mt-4 grid gap-2.5 md:grid-cols-2">
              {products.map((product, index) => (
                <AccountFavoriteCard key={product.id} priority={index === 0} product={product} />
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-3">
          <section className="account-panel">
            <AccountPanelHeading
              description="Os favoritos ficam vinculados à sua conta para manter a seleção privada e pronta para ser retomada em qualquer visita."
              kicker="Curadoria protegida"
              title="Como esta lista ajuda"
            />

            <div className="mt-4 grid gap-2.5">
              <div className="account-panel-muted">
                <p className="text-[0.84rem] leading-6 text-slate">
                  Você está visualizando apenas os itens salvos na conta{" "}
                  <span className="font-semibold text-ink">{session.customer.email}</span>. Isso
                  mantém a curadoria associada ao seu perfil e pronta para voltar do produto ao
                  carrinho quando fizer sentido.
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <AccountActionTile
                  description="Volte para a linha destacada da coleção e salve novas peças para comparar depois."
                  eyebrow="Coleção"
                  href={`/colecao?collection=${tournamentCollectionSlug}`}
                  title={`Ver ${tournamentCapsuleName.toLowerCase()}`}
                />
                <AccountActionTile
                  description="Se já concluiu a compra, acompanhe o pós-compra com a mesma conta usada para salvar suas peças."
                  eyebrow="Pós-compra"
                  href={ordersHref}
                  title="Ver pedidos"
                />
              </div>
            </div>
          </section>

          <section className="account-panel">
            <AccountPanelHeading
              description="Atalhos úteis para sair da curadoria e seguir o próximo passo da jornada."
              kicker="Ações rápidas"
              title="Próximos movimentos"
            />

            <div className="mt-4 grid gap-2.5">
              <AccountActionTile
                description="Continue navegando pela coleção geral com a conta autenticada."
                eyebrow="Comprar"
                href="/colecao"
                title="Continuar comprando"
              />
              <AccountActionTile
                description="Abra seus pedidos para retomar a leitura entre pagamento, detalhe e transporte."
                eyebrow="Pedidos"
                href={ordersHref}
                title="Ver pedidos"
              />
            </div>
          </section>
        </div>
      </div>
    </AccountShell>
  );
}
