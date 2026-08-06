---
target: apps/admin/src/app/App.tsx
total_score: 24
p0_count: 0
p1_count: 3
timestamp: 2026-08-06T03-57-53Z
slug: apps-admin-src-app-app-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---:|---:|---|
| 1 | Visibility of System Status | 3 | Skeletons, notices and alerts existem, mas a tela de login mostra erro genérico para uma falha real de CORS/API. |
| 2 | Match System / Real World | 3 | Linguagem majoritariamente clara; "Motion", "SEO" e "Config" ainda soam técnicos para gestor não técnico. |
| 3 | User Control and Freedom | 2 | Cancelamentos existem em formulários, mas remoção usa `window.confirm`, filtros não têm limpar explícito e não há undo. |
| 4 | Consistency and Standards | 3 | Design system coeso, porém placeholders parecem módulos funcionais e algumas ações fogem do padrão. |
| 5 | Error Prevention | 2 | Há validação e confirmação básica, mas ações destrutivas e estados de API precisam de guardrails melhores. |
| 6 | Recognition Rather Than Recall | 2 | Navegação com 11 itens e labels ocultos em tablet aumentam esforço de memória. |
| 7 | Flexibility and Efficiency | 2 | Filtros e tabelas ajudam, mas faltam bulk actions, atalhos e caminhos rápidos para operação diária. |
| 8 | Aesthetic and Minimalist Design | 3 | Visual restrito e confiável, mas muitos painéis têm peso parecido e a tela perde foco. |
| 9 | Error Recovery | 2 | Erros são legíveis, mas nem sempre acionáveis; alguns não têm retry contextual. |
| 10 | Help and Documentation | 2 | Há microcopy em formulários, mas falta ajuda contextual para decisões complexas. |
| **Total** |  | **24/40** | **Acceptable: boa base, mas melhorias importantes antes de escalar uso real.** |

## Anti-Patterns Verdict

**LLM assessment**: Não parece "AI slop" de marketing, e isso é bom para produto. O painel tem densidade, tabelas reais, estados de loading e uma gramática visual contida. O risco está no outro lado: muitas superfícies usam o mesmo painel branco, o mesmo peso de borda e o mesmo tipo de título, então o usuário precisa descobrir sozinho o que é operacional, o que é placeholder e o que é crítico.

**Deterministic scan**: O detector CLI em `apps/admin/src/app/App.tsx` retornou `[]`. Na inspeção headless com overlay injetado na tela acessível de login, o console reportou: `layout-transition` em transição de `width`, `codex-grid-background` na moldura de preview e, no mobile, `flat-type-hierarchy`.

**Visual overlays**: Injeção funcionou em Playwright headless, mas não há aba humana persistente. A tela autenticada não foi alcançada: `http://127.0.0.1:5174` caiu no login e a sessão falhou por CORS contra `http://127.0.0.1:3333/admin/auth/session`.

## Overall Impression

A fundação é séria e operacional, com mais cuidado do que um dashboard genérico. A maior oportunidade é transformar "painel com muitos módulos" em "centro de controle guiado por risco e frequência": agrupar, priorizar, revelar aos poucos e remover sinais hard-coded da Bespoke.

## What's Working

- O sistema visual é contido: tokens claros, raio de 8px, alto contraste e poucos acentos.
- Produtos e pedidos usam padrões familiares: tabelas, filtros, badges, skeletons, `aria-live`, labels e mascaramento de e-mail.
- A Vitrine tem uma ambição boa: edição com preview, modos de dispositivo e controles de marca/conteúdo no mesmo fluxo.

## Priority Issues

**[P1] A tela autenticada não fica visualmente verificável no ambiente atual**
Why it matters: se gestores ou suporte caem nesse estado, a mensagem "Confirme se a API está ativa" não explica CORS, sessão nem próximo passo.
Fix: diferenciar API offline, CORS, sessão expirada e credenciais; adicionar retry e contato/suporte; alinhar origem permitida no dev.
Suggested command: `$impeccable harden`

**[P1] White-label ainda quebra no primeiro sinal de marca**
Why it matters: o produto promete operar futuras marcas, mas login/sidebar usam logo/alt "Bespoke Admin" e fallback "Bespoke".
Fix: puxar nome/logo admin de configuração white-label, usar fallback neutro ("Admin da loja") e reservar Bespoke só para ambiente interno.
Suggested command: `$impeccable polish`

**[P1] Carga cognitiva alta em navegação e Vitrine**
Why it matters: 11 itens de nav, 6 abas de aparência e muitos controles visíveis fazem gestor não técnico hesitar antes de agir.
Fix: agrupar nav por objetivo, separar módulos não prontos, priorizar "tarefas frequentes" e introduzir disclosure progressivo nas seções mais densas.
Suggested command: `$impeccable distill`

**[P2] Ações destrutivas ainda usam confirmação nativa**
Why it matters: `window.confirm` perde contexto visual, não ensina consequência e não oferece undo ou estado de recuperação.
Fix: trocar por diálogo próprio com nome do produto, consequência, alternativa de arquivar, loading, erro e retorno seguro.
Suggested command: `$impeccable harden`

**[P2] Responsividade existe, mas a navegação perde reconhecimento**
Why it matters: em tablet os labels da sidebar somem; no mobile a nav vira uma grade longa sem agrupamento.
Fix: usar nav compacta com tooltip/label persistente, agrupamento por área e bottom/action shortcuts para tarefas principais.
Suggested command: `$impeccable adapt`

## Persona Red Flags

**Alex, operador experiente**: consegue filtrar e editar, mas não encontra bulk actions, atalhos, exportação real em vários módulos nem forma rápida de limpar filtros. A operação diária ainda é muito "um item por vez".

**Sam, usuário de teclado/leitor de tela**: há bons sinais (`role=alert`, `aria-live`, labels), mas a sidebar icon-only em tablet e componentes customizados como combobox/abas/preview precisam de auditoria real de foco, roving tab index e anúncio de estado.

**Marina, gestora de boutique não técnica**: a tela de login passa confiança visual, mas uma falha técnica aparece como "API ativa"; dentro do admin, termos como "Motion", "SEO" e "Config" exigem tradução mental; placeholders de módulos parecem recursos prontos.

## Minor Observations

- A busca global na topbar aparece como funcional, mas não há comportamento visível no `Shell`.
- Placeholders de Estoque, Clientes, Pagamentos, Relatórios, Auditoria e Configurações usam controles de filtro/aplicar, o que pode prometer funcionalidade inexistente.
- O grid de preview é um falso positivo aceitável se for tratado como palco/canvas, mas hoje ainda parece decoração de ferramenta gerada.
- A hierarquia tipográfica do login mobile é limpa, mas um pouco plana; o H1 poderia liderar mais.

## Questions to Consider

- O admin deve abrir por áreas de negócio ou por tarefas frequentes do dia?
- Quais módulos ainda não prontos deveriam ficar ocultos, bloqueados ou rotulados como "em preparação"?
- A Vitrine é um editor para especialistas de marca ou um assistente guiado para gestores?
