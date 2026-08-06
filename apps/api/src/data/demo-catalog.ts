import type { Category, Product } from "@bespoke/contracts";

export const categories: Category[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "chas-soluveis",
    name: "Ch\u00e1s Sol\u00faveis",
    description: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "encapsulados",
    name: "Encapsulados",
    description: null,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    slug: "injetaveis",
    name: "Injet\u00e1veis",
    description: null,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    slug: "suplementacoes",
    name: "Suplementa\u00e7\u00f5es",
    description: null,
  },
];

const solubleTeaCategory = categories[0]!;
const capsuleCategory = categories[1]!;
const injectableCategory = categories[2]!;

const imageBase = "https://images.unsplash.com";

export const products: Product[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    slug: "kit-ritual-equilibrio",
    sku: "BSP-RIT-001",
    name: "Kit Ritual Equilibrio",
    subtitle: "Curadoria premium para uma rotina leve.",
    description:
      "Uma composicao elegante de itens de autocuidado para apoiar momentos de pausa. A Bespoke evita promessas medicas e recomenda avaliacao profissional para necessidades especificas.",
    category: solubleTeaCategory,
    priceInCents: 28900,
    compareAtPriceInCents: null,
    stock: 18,
    lowStockThreshold: 5,
    lowStockWarningEnabled: false,
    images: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11",
        url: `${imageBase}/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=82`,
        alt: "Kit de autocuidado Bespoke sobre uma bancada clara",
        width: 1200,
        height: 1500,
      },
    ],
    tags: ["curadoria", "rotina", "presente"],
    isActive: true,
    isFeatured: true,
    sortOrder: 10,
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    slug: "blend-bespoke-matutino",
    sku: "BSP-BLD-002",
    name: "Blend Bespoke Matutino",
    subtitle: "Sabor delicado para comecar o dia com calma.",
    description:
      "Blend de ingredientes selecionados para consumo dentro de uma rotina equilibrada. Nao substitui orientacao nutricional, tratamento ou acompanhamento profissional.",
    category: solubleTeaCategory,
    priceInCents: 14900,
    compareAtPriceInCents: 16900,
    stock: 7,
    lowStockThreshold: 8,
    lowStockWarningEnabled: true,
    images: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa22",
        url: `${imageBase}/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=82`,
        alt: "Blend premium servido em composicao minimalista",
        width: 1200,
        height: 1500,
      },
    ],
    tags: ["blend", "manha", "leve"],
    isActive: true,
    isFeatured: true,
    sortOrder: 20,
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    slug: "garrafa-termica-verde",
    sku: "BSP-ACC-003",
    name: "Garrafa Termica Verde",
    subtitle: "Acessorio discreto para acompanhar a rotina.",
    description:
      "Garrafa termica com acabamento fosco, pensada para mobilidade e uso diario. Produto complementar a habitos de hidratacao e organizacao pessoal.",
    category: capsuleCategory,
    priceInCents: 9900,
    compareAtPriceInCents: null,
    stock: 31,
    lowStockThreshold: 6,
    lowStockWarningEnabled: false,
    images: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa33",
        url: `${imageBase}/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1200&q=82`,
        alt: "Garrafa termica verde com acabamento fosco",
        width: 1200,
        height: 1500,
      },
    ],
    tags: ["acessorio", "hidratacao", "minimalista"],
    isActive: true,
    isFeatured: true,
    sortOrder: 30,
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4",
    slug: "sessao-curadoria-bespoke",
    sku: "BSP-CNS-004",
    name: "Sessao Curadoria Bespoke",
    subtitle: "Compra assistida com atencao individual.",
    description:
      "Atendimento para entender preferencias, restricoes declaradas pelo cliente e objetivos de estilo de vida, sem diagnostico ou prescricao medica.",
    category: injectableCategory,
    priceInCents: 19900,
    compareAtPriceInCents: null,
    stock: 12,
    lowStockThreshold: 3,
    lowStockWarningEnabled: false,
    images: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa44",
        url: `${imageBase}/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=82`,
        alt: "Atendimento consultivo em mesa organizada",
        width: 1200,
        height: 1500,
      },
    ],
    tags: ["assistido", "curadoria", "personalizacao"],
    isActive: true,
    isFeatured: true,
    sortOrder: 40,
  },
];
