type SeedCollection = {
  name: string;
  slug: string;
  description: string;
};

type SeedCategory = {
  name: string;
  slug: string;
  description: string;
};

export type SeedProduct = {
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  country: string;
  season: string;
  type: string;
  fit: string;
  material: string;
  badgeLabel?: string;
  accentFrom: string;
  accentVia: string;
  accentTo: string;
  primaryHex: string;
  secondaryHex: string;
  details: string[];
  highlights: string[];
  colors: string[];
  sizes: string[];
  images: { url: string; alt: string; isPrimary?: boolean }[];
  collectionSlug: string;
  categorySlug: string;
  isRetro: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  isActive: boolean;
};

export const seedCollections: SeedCollection[] = [
  {
    name: "Partida",
    slug: "partida",
    description: "Camisas pensadas para jogo, uso recorrente e leitura direta do produto."
  },
  {
    name: "Studio",
    slug: "studio",
    description: "Pecas com recorte mais urbano, acabamento limpo e foco em composicao."
  },
  {
    name: "Edicao especial",
    slug: "selecao-2026",
    description: "Selecao destacada da colecao, com espaco proprio dentro da vitrine e linguagem visual contida."
  },
  {
    name: "Travel",
    slug: "travel",
    description: "Camisas pensadas para treino, deslocamento e rotina com leitura esportiva discreta."
  }
];

export const seedCategories: SeedCategory[] = [
  {
    name: "Casa",
    slug: "casa",
    description: "Camisas principais com leitura cromatica central da colecao."
  },
  {
    name: "Visitante",
    slug: "visitante",
    description: "Versoes visitantes com contraste limpo e foco na versatilidade."
  },
  {
    name: "Terceira",
    slug: "terceira",
    description: "Pecas especiais com maior liberdade de cor e composicao."
  },
  {
    name: "Treino",
    slug: "treino",
    description: "Camisas orientadas para treino, deslocamento e uso leve."
  }
];

export const seedSizes = [
  { label: "PP", sortOrder: 1 },
  { label: "P", sortOrder: 2 },
  { label: "M", sortOrder: 3 },
  { label: "G", sortOrder: 4 },
  { label: "GG", sortOrder: 5 }
];

export const seedProducts: SeedProduct[] = [
  {
    name: "Camisa Casa Vermelho Mineral",
    slug: "camisa-casa-vermelho-mineral",
    sku: "MNT-ATL-01",
    shortDescription: "Camisa principal em vermelho mineral com contraste claro.",
    description:
      "Camisa principal com base vermelha, recortes claros e leitura limpa para dia de jogo, uso casual e vitrine de colecao.",
    price: 329.9,
    stock: 38,
    country: "Brasil",
    season: "Linha permanente",
    type: "Camisa principal",
    fit: "Regular",
    material: "Malha dry touch com textura leve",
    accentFrom: "#8b342e",
    accentVia: "#bb6b3d",
    accentTo: "#f2c883",
    primaryHex: "#8b342e",
    secondaryHex: "#f2c883",
    details: [
      "Escudo minimalista em silicone fosco",
      "Painel lateral com ventilacao discreta",
      "Barra levemente curva para ajuste melhor no corpo"
    ],
    highlights: [
      "Leitura direta do produto na vitrine",
      "Toque macio para uso recorrente",
      "Funciona bem em jogo, rotina e deslocamento"
    ],
    colors: ["Vermelho mineral", "Creme claro"],
    sizes: ["PP", "P", "M", "G", "GG"],
    images: [
      {
        url: "/products/atlas-home.svg",
        alt: "Camisa Casa Vermelho Mineral",
        isPrimary: true
      }
    ],
    collectionSlug: "partida",
    categorySlug: "casa",
    isRetro: false,
    isFeatured: true,
    isNew: false,
    isBestSeller: false,
    isActive: true
  },
  {
    name: "Camisa Visitante Azul Noturno",
    slug: "camisa-visitante-azul-noturno",
    sku: "MNT-AUR-02",
    shortDescription: "Versao visitante em azul noturno com contraste areia.",
    description:
      "Camisa visitante com base azul escura, contraste controlado e leitura sobria para uso dentro e fora do jogo.",
    price: 319.9,
    stock: 34,
    country: "Brasil",
    season: "Linha permanente",
    type: "Camisa visitante",
    fit: "Slim confortavel",
    material: "Poliester reciclado com elastano leve",
    accentFrom: "#243b63",
    accentVia: "#4169a1",
    accentTo: "#9ec8d6",
    primaryHex: "#243b63",
    secondaryHex: "#9ec8d6",
    details: [
      "Gola canelada com estrutura leve",
      "Grafismo frontal em baixa opacidade",
      "Logo bordado de alta definicao"
    ],
    highlights: [
      "Visual limpo para diferentes contextos de uso",
      "Secagem rapida para dias quentes",
      "Mobilidade confortavel sem excesso de compressao"
    ],
    colors: ["Azul noturno", "Areia fria"],
    sizes: ["PP", "P", "M", "G", "GG"],
    images: [
      {
        url: "/products/aurora-away.svg",
        alt: "Camisa Visitante Azul Noturno",
        isPrimary: true
      }
    ],
    collectionSlug: "partida",
    categorySlug: "visitante",
    isRetro: false,
    isFeatured: true,
    isNew: false,
    isBestSeller: false,
    isActive: true
  },
  {
    name: "Camisa Terceira Marfim",
    slug: "camisa-terceira-marfim",
    sku: "MNT-HAL-03",
    shortDescription: "Terceira camisa em marfim com linhas verdes discretas.",
    description:
      "Camisa terceira com base clara, contraste verde contido e construida para funcionar como alternativa visual dentro da colecao.",
    price: 349.9,
    stock: 28,
    country: "Portugal",
    season: "Linha especial",
    type: "Camisa terceira",
    fit: "Regular",
    material: "Malha dupla de toque seco",
    accentFrom: "#d7cbb8",
    accentVia: "#f5f1e8",
    accentTo: "#516a49",
    primaryHex: "#d7cbb8",
    secondaryHex: "#516a49",
    details: [
      "Padronagem linear com relevo sutil",
      "Punhos com retorno elastico discreto",
      "Tag interna estampada para reduzir atrito"
    ],
    highlights: [
      "Alternativa clara dentro da grade principal",
      "Peso leve para uso prolongado",
      "Acabamento pensado para manter estrutura por mais tempo"
    ],
    colors: ["Marfim", "Verde musgo"],
    sizes: ["PP", "P", "M", "G", "GG"],
    images: [
      {
        url: "/products/halo-third.svg",
        alt: "Camisa Terceira Marfim",
        isPrimary: true
      }
    ],
    collectionSlug: "studio",
    categorySlug: "terceira",
    isRetro: false,
    isFeatured: true,
    isNew: false,
    isBestSeller: false,
    isActive: true
  },
  {
    name: "Camisa Noite Verde e Dourado",
    slug: "camisa-noite-verde-dourado",
    sku: "MNT-BR26-07",
    shortDescription: "Peca especial em grafite, verde profundo e dourado fosco.",
    description:
      "Camisa de destaque com base escura, frente clara e contraste controlado para ocupar o espaco de selecao especial dentro da colecao.",
    price: 389.9,
    stock: 22,
    country: "Brasil",
    season: "Edicao especial",
    type: "Edicao especial",
    fit: "Regular elevado",
    material: "Malha dupla com textura seca",
    accentFrom: "#0f1413",
    accentVia: "#17342d",
    accentTo: "#b4943a",
    primaryHex: "#17342d",
    secondaryHex: "#b4943a",
    details: [
      "Painel frontal claro com trama linear discreta",
      "Filetes dourados de baixa espessura",
      "Sombra azul fria aplicada apenas como apoio visual"
    ],
    highlights: [
      "Peca especial sem discurso promocional inflado",
      "Contraste forte para vitrine e uso recorrente",
      "Caimento limpo para jogo, rotina e deslocamento"
    ],
    colors: ["Grafite", "Marfim"],
    sizes: ["PP", "P", "M", "G", "GG"],
    images: [
      {
        url: "/products/brasil-2026-noite.svg",
        alt: "Camisa Noite Verde e Dourado",
        isPrimary: true
      }
    ],
    collectionSlug: "selecao-2026",
    categorySlug: "terceira",
    isRetro: false,
    isFeatured: true,
    isNew: false,
    isBestSeller: false,
    isActive: true
  },
  {
    name: "Camisa Treino Verde Petroleo",
    slug: "camisa-treino-verde-petroleo",
    sku: "MNT-DEL-04",
    shortDescription: "Camisa de treino verde petroleo com recortes carvao.",
    description:
      "Camisa de treino com estrutura leve, base escura e leitura simples para sessao, viagem e uso casual.",
    price: 269.9,
    stock: 46,
    country: "Brasil",
    season: "Linha permanente",
    type: "Camisa de treino",
    fit: "Performance fit",
    material: "Mesh respiravel com toque gelado",
    accentFrom: "#14352f",
    accentVia: "#25544d",
    accentTo: "#91c6b5",
    primaryHex: "#14352f",
    secondaryHex: "#91c6b5",
    details: [
      "Painel traseiro com ventilacao ampliada",
      "Costura plana para reduzir atrito",
      "Detalhe refletivo tonal para baixa luz"
    ],
    highlights: [
      "Troca termica eficiente",
      "Estrutura leve para mobilidade",
      "Resistencia pensada para uso frequente"
    ],
    colors: ["Verde petroleo", "Carvao"],
    sizes: ["PP", "P", "M", "G", "GG"],
    images: [
      {
        url: "/products/delta-training.svg",
        alt: "Camisa Treino Verde Petroleo",
        isPrimary: true
      }
    ],
    collectionSlug: "travel",
    categorySlug: "treino",
    isRetro: false,
    isFeatured: false,
    isNew: false,
    isBestSeller: false,
    isActive: true
  },
  {
    name: "Jersey Zip Terra",
    slug: "jersey-zip-terra",
    sku: "MNT-SOL-05",
    shortDescription: "Jersey com meia gola e zip frontal curto.",
    description:
      "Peca de transicao com zip frontal, estrutura levemente encorpada e proposta de uso entre deslocamento, rotina e pre-jogo.",
    price: 359.9,
    stock: 24,
    country: "Italia",
    season: "Linha especial",
    type: "Jersey com zip",
    fit: "Boxy",
    material: "Jersey encorpado com trama dupla respiravel",
    accentFrom: "#493220",
    accentVia: "#8e6043",
    accentTo: "#dec2aa",
    primaryHex: "#493220",
    secondaryHex: "#dec2aa",
    details: [
      "Ziper metalico fosco com puxador discreto",
      "Gola alta curta para composicao em camadas",
      "Ombro deslocado para caimento mais solto"
    ],
    highlights: [
      "Funciona em meia-estacao e deslocamento",
      "Mistura bem com camadas leves",
      "Silhueta pensada para uso casual"
    ],
    colors: ["Terra", "Areia tostada"],
    sizes: ["PP", "P", "M", "G", "GG"],
    images: [
      {
        url: "/products/solace-zip.svg",
        alt: "Jersey Zip Terra",
        isPrimary: true
      }
    ],
    collectionSlug: "studio",
    categorySlug: "treino",
    isRetro: false,
    isFeatured: false,
    isNew: false,
    isBestSeller: false,
    isActive: true
  },
  {
    name: "Camisa Noturna Preta",
    slug: "camisa-noturna-preta",
    sku: "MNT-NEO-06",
    shortDescription: "Camisa preta com detalhes de alto contraste para uso noturno.",
    description:
      "Camisa de base preta com textura discreta e acento de cor limitado para quem prefere uma leitura mais seca na colecao.",
    price: 309.9,
    stock: 32,
    country: "Brasil",
    season: "Linha permanente",
    type: "Camisa noturna",
    fit: "Regular",
    material: "Malha microtexturizada com respiro lateral",
    accentFrom: "#161616",
    accentVia: "#32422d",
    accentTo: "#d2f561",
    primaryHex: "#161616",
    secondaryHex: "#d2f561",
    details: [
      "Grafismo em linhas de baixa espessura",
      "Etiqueta externa minimalista na barra",
      "Acabamento seco para clima quente"
    ],
    highlights: [
      "Visual escuro e direto dentro da grade",
      "Peso leve com estrutura suficiente para o uso recorrente",
      "Combina facilmente com pecas utilitarias"
    ],
    colors: ["Preto", "Lima contido"],
    sizes: ["PP", "P", "M", "G", "GG"],
    images: [
      {
        url: "/products/neon-drift.svg",
        alt: "Camisa Noturna Preta",
        isPrimary: true
      }
    ],
    collectionSlug: "travel",
    categorySlug: "visitante",
    isRetro: false,
    isFeatured: false,
    isNew: false,
    isBestSeller: false,
    isActive: true
  }
];
