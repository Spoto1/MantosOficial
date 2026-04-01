import {
  KANBAN_PRIORITY_VALUES,
  KANBAN_STATUS_VALUES,
  KANBAN_TYPE_VALUES
} from "./kanban";

type KanbanSeedTask = {
  title: string;
  aliases?: string[];
  description: string;
  notes?: string;
  status: (typeof KANBAN_STATUS_VALUES)[number];
  priority: (typeof KANBAN_PRIORITY_VALUES)[number];
  type: (typeof KANBAN_TYPE_VALUES)[number];
  dueDate?: string;
  assigneeEmail?: string;
  isArchived?: boolean;
  checklistItems?: Array<{
    label: string;
    isDone: boolean;
  }>;
};

const archivedSeedKanbanTaskTitles = [
  "Frete por CEP real",
  "Integração com rastreio de transportadora",
  "Painel de cupons mais completo",
  "Expandir campaigns para mais placements",
  "Melhorar área da conta do usuário",
  "Testes E2E do checkout Stripe",
  "Testes E2E do admin",
  "Polir UX do checkout Stripe",
  "Runbook de operação",
  "Revisar performance/LCP da home",
  "Melhorar rastreamento de pedidos na área do cliente",
  "Integrar CDN para assets administrativos",
  "Evoluir favoritos autenticados",
  "Trocar assets antigos do catálogo por peças mais premium",
  "Revisar configuração de APP_URL / NEXT_PUBLIC_APP_URL por ambiente"
] as const;

export const seedKanbanTasks: KanbanSeedTask[] = [
  {
    title: "Checklist de go-live",
    aliases: ["Preparar go-live checklist"],
    description:
      "Consolidar o gate final de publicação com domínio, envs, Stripe, webhook, storage, rollback e validação pós-deploy.",
    notes:
      "Este card concentra a checagem final de liberação e deve refletir apenas itens realmente pendentes para o go-live.",
    status: "TODO",
    priority: "CRITICAL",
    type: "OPS",
    dueDate: "2026-04-05T18:00:00.000Z",
    assigneeEmail: "pedro@mantos.local",
    checklistItems: [
      { label: "Confirmar APP_URL e NEXT_PUBLIC_APP_URL publicados", isDone: false },
      { label: "Confirmar envs finais de Stripe e admin", isDone: false },
      { label: "Validar rollback e responsável do deploy final", isDone: false }
    ]
  },
  {
    title: "Conectar conta Stripe final",
    aliases: ["Conectar conta Stripe final do projeto"],
    description:
      "Apontar o ambiente para a conta Stripe definitiva, revisar branding e confirmar os dados operacionais antes da publicação.",
    notes:
      "O código já suporta Stripe; o que falta aqui é a troca segura para a conta real do projeto.",
    status: "TODO",
    priority: "CRITICAL",
    type: "CHECKOUT",
    dueDate: "2026-04-02T18:00:00.000Z",
    assigneeEmail: "pedro@mantos.local",
    checklistItems: [
      { label: "Preencher STRIPE_SECRET_KEY real", isDone: false },
      { label: "Preencher NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY real", isDone: false },
      { label: "Revisar branding, statement descriptor e meios ativos", isDone: false }
    ]
  },
  {
    title: "Cadastrar webhook Stripe público",
    aliases: ["Configurar webhook Stripe em ambiente público"],
    description:
      "Cadastrar o endpoint público do webhook, configurar o segredo assinado por ambiente e validar o retry da Stripe no ambiente publicado.",
    notes:
      "A operação não fecha sem assinatura verificada e sem prova de que checkout.session.* reconcilia corretamente.",
    status: "TODO",
    priority: "CRITICAL",
    type: "OPS",
    dueDate: "2026-04-02T18:00:00.000Z",
    assigneeEmail: "pedro@mantos.local",
    checklistItems: [
      { label: "Cadastrar /api/webhooks/stripe na conta correta", isDone: false },
      { label: "Configurar STRIPE_WEBHOOK_SECRET no ambiente publicado", isDone: false },
      { label: "Validar evento assinado chegando no pedido real", isDone: false }
    ]
  },
  {
    title: "Homologar pagamentos reais",
    aliases: ["Homologar pagamentos reais com a conta Stripe correta"],
    description:
      "Executar pagamentos reais de baixo valor e confirmar success, failure, pending, atualização do pedido e leitura correta no admin.",
    notes:
      "Essa é a validação prática mais importante antes de expor tráfego real.",
    status: "TODO",
    priority: "CRITICAL",
    type: "CHECKOUT",
    dueDate: "2026-04-03T18:00:00.000Z",
    assigneeEmail: "pedro@mantos.local",
    checklistItems: [
      { label: "Pagamento aprovado com pedido pago e admin consistente", isDone: false },
      { label: "Falha ou cancelamento com retorno correto no fluxo", isDone: false },
      { label: "Conferir webhook, payment intent e status final no pedido", isDone: false }
    ]
  },
  {
    title: "Validar reconciliação final do Stripe Checkout",
    aliases: ["Idempotência na criação do pedido", "Validar reconciliação final do Stripe Checkout"],
    description:
      "Fechar a revisão final do fluxo já implementado para garantir que checkout, retorno e webhook não deixem divergência operacional.",
    notes:
      "Card focado em validação final do que já existe, sem reabrir mudanças estruturais grandes nesta rodada.",
    status: "IN_REVIEW",
    priority: "CRITICAL",
    type: "CHECKOUT",
    dueDate: "2026-04-03T18:00:00.000Z",
    assigneeEmail: "pedro@mantos.local",
    checklistItems: [
      { label: "Validar success, pending e failure com pedido coerente", isDone: false },
      { label: "Conferir que estoque e pedido não duplicam no retry", isDone: false },
      { label: "Revisar sinais exibidos em /admin/orders", isDone: false }
    ]
  },
  {
    title: "Hardening final do admin publicado",
    aliases: [
      "Harden final para produção aberta",
      "Endurecer autenticação do admin",
      "Melhorar RBAC/permissões do admin",
      "Captcha/antiabuso avançado"
    ],
    description:
      "Consolidar a última revisão de autenticação, permissões e superfícies sensíveis do admin antes da publicação aberta.",
    notes:
      "O foco aqui é fechar o risco operacional do painel, não expandir escopo funcional.",
    status: "IN_REVIEW",
    priority: "HIGH",
    type: "SECURITY",
    dueDate: "2026-04-04T18:00:00.000Z",
    assigneeEmail: "pedro@mantos.local",
    checklistItems: [
      { label: "Revisar bootstrap/admin credentials restantes", isDone: false },
      { label: "Conferir guards de leitura vs edição nos módulos sensíveis", isDone: false },
      { label: "Fechar mitigação mínima de abuso em login e formulários", isDone: false }
    ]
  },
  {
    title: "Logs operacionais do admin",
    aliases: ["Logs operacionais estruturados"],
    description:
      "Ajustar o activity log para registrar eventos realmente úteis de pedidos, uploads, campanhas e Kanban na reta final.",
    notes:
      "A ideia é deixar o log acionável para operação, não aumentar volume sem utilidade.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    type: "OPS",
    dueDate: "2026-04-04T18:00:00.000Z"
  },
  {
    title: "Observabilidade e alertas de go-live",
    aliases: ["Observabilidade e alertas"],
    description:
      "Fechar a visibilidade mínima para pagamento, upload, login admin e falha silenciosa antes do deploy final.",
    notes:
      "Mantém o foco em sinais operacionais úteis para publicação, sem inflar backlog com métricas genéricas.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    type: "OPS",
    dueDate: "2026-04-05T18:00:00.000Z",
    checklistItems: [
      { label: "Alertar pedido pago sem atualização operacional", isDone: false },
      { label: "Cobrir falha de upload/admin com sinal visível", isDone: false },
      { label: "Cobrir falha de webhook e checkout com diagnóstico mínimo", isDone: false }
    ]
  },
  {
    title: "Revisão final dos breakpoints do admin e Kanban",
    aliases: ["QA final de UI e densidade em notebook", "Revisão final mobile"],
    description:
      "Passar pelas telas do admin e do board em notebook e mobile para eliminar overflow, quebra ruim e densidade excessiva.",
    notes:
      "Foco em /admin, /admin/orders, /admin/campaigns, /admin/uploads e /admin/kanban.",
    status: "TODO",
    priority: "HIGH",
    type: "POLISH",
    dueDate: "2026-04-05T18:00:00.000Z",
    checklistItems: [
      { label: "Validar dashboard e orders em notebook", isDone: false },
      { label: "Validar campaigns, uploads e Kanban sem overflow", isDone: false },
      { label: "Revisar versão mobile do board e dos cards administrativos", isDone: false }
    ]
  },
  {
    title: "QA final publicado",
    aliases: ["QA final de storefront e admin antes do deploy"],
    description:
      "Executar a rodada final de QA no ambiente publicado para confirmar comportamento real de admin, checkout e pós-compra.",
    notes:
      "É a validação ampla antes de aprovar o deploy final da loja e do painel.",
    status: "TODO",
    priority: "HIGH",
    type: "OPS",
    dueDate: "2026-04-06T18:00:00.000Z",
    checklistItems: [
      { label: "Revisar rotas públicas críticas no ambiente publicado", isDone: false },
      { label: "Revisar /admin, /admin/orders, /admin/campaigns, /admin/uploads e /admin/kanban", isDone: false },
      { label: "Conferir ausência de copy residual de seed/demo", isDone: false }
    ]
  },
  {
    title: "Published smoke test",
    description:
      "Executar um smoke enxuto pós-deploy para comprovar que home, checkout, success e admin continuam íntegros no ambiente publicado.",
    notes:
      "Card separado do QA final para garantir uma verificação rápida e repetível logo após cada publicação relevante.",
    status: "TODO",
    priority: "CRITICAL",
    type: "OPS",
    dueDate: "2026-04-06T21:00:00.000Z",
    checklistItems: [
      { label: "Abrir home e produto publicado sem erro crítico", isDone: false },
      { label: "Abrir checkout/success ou fluxo equivalente publicado", isDone: false },
      { label: "Abrir admin, orders e Kanban após deploy", isDone: false }
    ]
  },
  {
    title: "Storage externo do admin",
    aliases: ["Migrar uploads para storage externo"],
    description:
      "Migrar o acervo de uploads do admin para provider externo preparado para produção e múltiplos ambientes.",
    notes:
      "Sem esse passo, o painel continua dependente de persistência local e o go-live fica incompleto.",
    status: "BLOCKED",
    priority: "HIGH",
    type: "INFRA",
    dueDate: "2026-04-08T18:00:00.000Z",
    checklistItems: [
      { label: "Definir provider e bucket finais", isDone: false },
      { label: "Configurar credenciais por ambiente", isDone: false },
      { label: "Validar URL pública e leitura no admin", isDone: false }
    ]
  },
  {
    title: "Deploy final",
    description:
      "Publicar a versão final com envs aprovados, monitorar o pós-deploy imediato e fechar o aceite de go-live.",
    notes:
      "Este card só deve avançar depois de webhook, homologação real, QA final e smoke publicado concluídos.",
    status: "TODO",
    priority: "CRITICAL",
    type: "INFRA",
    dueDate: "2026-04-09T18:00:00.000Z",
    assigneeEmail: "pedro@mantos.local",
    checklistItems: [
      { label: "Validar build e config finais antes de publicar", isDone: false },
      { label: "Executar smoke publicado imediatamente após deploy", isDone: false },
      { label: "Registrar aceite final e plano de rollback", isDone: false }
    ]
  }
];

export const knownSeedKanbanTaskTitles = [
  ...new Set([
    ...archivedSeedKanbanTaskTitles,
    ...seedKanbanTasks.flatMap((task) => [task.title, ...(task.aliases ?? [])])
  ])
];

export function isSeedKanbanTask(task: { title: string }) {
  return knownSeedKanbanTaskTitles.includes(task.title.trim());
}
