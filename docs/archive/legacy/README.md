# Legacy Archive

## Scripts arquivados

Os arquivos abaixo foram preservados como referência histórica, mas não são mais os pontos de entrada recomendados:

- `scripts/archive/legacy/orbe-browser-smoke.mjs`
- `scripts/archive/legacy/storefront-http-qa.js`
- `scripts/archive/legacy/contact-smoke.playwright.js`

## Motivo do arquivamento

- nomes e fluxos antigos ainda carregavam o branding `Orbe`;
- existia um `.js` redundante de um script cujo fonte TypeScript foi promovido para `scripts/qa/`;
- havia snippets/smokes ad hoc misturados com `tmp/`.

## Compatibilidades mantidas fora do archive

- `app/minha-conta/page.tsx` continua ativo como redirect para `/conta`, porque é compatibilidade pública de rota e não arquivo morto.
