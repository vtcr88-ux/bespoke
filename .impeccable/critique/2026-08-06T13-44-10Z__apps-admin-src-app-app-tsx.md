---
target: apps/admin/src/app/App.tsx
total_score: 28
p0_count: 0
p1_count: 1
timestamp: 2026-08-06T13-44-10Z
slug: apps-admin-src-app-app-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---:|---:|---|
| 1 | Visibility of System Status | 3 | Login e erros estao mais claros; ainda falta diagnostico tecnico completo para CORS/origem local. |
| 2 | Match System / Real World | 3 | Linguagem melhorou com "Ajustes", "Movimento" e "Busca"; ainda ha termos operacionais complexos em Vitrine. |
| 3 | User Control and Freedom | 3 | Filtros agora podem ser limpos e delete saiu do `window.confirm`; falta undo real. |
| 4 | Consistency and Standards | 3 | Confirmacao destrutiva e placeholders estao mais alinhados; tela interna ainda precisa validacao visual autenticada. |
| 5 | Error Prevention | 3 | Acao destrutiva ficou contextual e estados inativos reduzem falsa promessa; falta estrategia de recuperacao/undo. |
| 6 | Recognition Rather Than Recall | 3 | Labels de nav receberam `title`/`aria-label` e placeholders foram clarificados; nav continua extensa. |
| 7 | Flexibility and Efficiency | 2 | Filtros melhoraram, mas ainda faltam bulk actions, atalhos e exportacao real. |
| 8 | Aesthetic and Minimalist Design | 3 | Visual atual foi preservado e os sinais do detector sumiram; painel ainda tende a peso visual uniforme. |
| 9 | Error Recovery | 3 | Mensagens de login mais acionaveis; falta retry contextual em mais telas internas. |
| 10 | Help and Documentation | 2 | Microcopy melhorou, mas nao ha ajuda contextual robusta para Vitrine/operacao avancada. |
| **Total** |  | **28/40** | **Good lower band: base confiavel com pendencias de eficiencia e validacao autenticada.** |

## Anti-Patterns Verdict

**LLM assessment**: O admin esta mais confiavel sem perder o gosto visual original. As correcoes reduziram falsa promessa, hard-code de marca e estranheza em acoes criticas. Nao parece "AI slop"; parece um produto admin em maturacao. O maior risco remanescente e estrutural: a navegacao ainda mostra muitos destinos e a Vitrine ainda concentra muitas decisoes.

**Deterministic scan**: `node .agents/skills/impeccable/scripts/detect.mjs --json apps/admin/src/app/App.tsx` retornou `[]`.

**Visual overlays**: Injeção do `detect.js` funcionou em desktop/mobile para `localhost:5174` e `127.0.0.1:5174`. Console reportou `No anti-patterns found` nos quatro cenarios. A tela autenticada continuou indisponivel sem sessao; `localhost` retorna 401 normal, `127.0.0.1` ainda revela CORS na API.

## Overall Impression

O polish fez o que deveria: melhorou confiança e clareza sem redesenhar. A experiencia agora comunica melhor o que esta pronto, o que esta em preparacao e quais acoes sao de risco. O proximo salto nao e estetico; e operacional: validar o painel autenticado, melhorar eficiencia de uso frequente e criar ajuda contextual para Vitrine.

## What's Working

- A tela de login manteve a identidade visual e ficou mais clara em mobile/desktop.
- Produtos agora tem controle melhor: limpar filtros, empty state diferente para filtro ativo e confirmacao destrutiva contextual.
- Modulos placeholder deixam de parecer recursos quebrados e passam a parecer areas futuras do painel.

## Priority Issues

**[P1] Inspecao autenticada ainda nao esta garantida**
Why it matters: sem entrar no painel real, nao da para validar visualmente Produtos, Pedidos e Vitrine com dados reais.
Fix: alinhar origem local/CORS ou usar fixture/session de admin para Playwright; incluir rota autenticada no fluxo de QA visual.
Suggested command: `$impeccable audit`

**[P2] Navegacao continua larga para gestor de primeira viagem**
Why it matters: 11 destinos ainda exigem mapa mental; os labels ajudam, mas nao resolvem agrupamento.
Fix: agrupar por Operacao, Loja, Atendimento e Sistema; manter favoritos/tarefas frequentes visiveis.
Suggested command: `$impeccable distill`

**[P2] Vitrine ainda e poderosa demais para modo unico**
Why it matters: Marca, Conteudo, Composicao, Movimento, Busca e Rodape em uma unica superficie funcionam para usuario avancado, mas intimidam gestor nao tecnico.
Fix: criar modo simples/avancado ou checklist guiado por objetivos.
Suggested command: `$impeccable shape`

**[P2] Eficiencia operacional ainda baixa para power users**
Why it matters: sem bulk actions, atalhos e exportacao real, operacao diaria fica um item por vez.
Fix: priorizar bulk edit em produtos, exportacao de pedidos e atalhos de teclado discretos.
Suggested command: `$impeccable harden`

## Persona Red Flags

**Alex, operador experiente**: Ganhou limpar filtros e confirmacao melhor, mas ainda nao tem bulk actions, shortcuts ou exportacao pronta.

**Sam, usuario de teclado/leitor de tela**: Labels e estados melhoraram; ainda falta auditoria real dos componentes ricos no painel autenticado, especialmente abas, combobox e preview.

**Marina, gestora de boutique**: Entende melhor o que esta em preparacao e o que e perigoso. Ainda pode se intimidar na Vitrine se precisar decidir marca, tipografia, movimento, SEO/busca e rodape sem um roteiro.

## Minor Observations

- `127.0.0.1:5174` ainda expõe CORS; `localhost:5174` segue o fluxo esperado de 401 sem mensagem de erro no login.
- O detector visual limpo e um bom sinal, mas nao substitui teste autenticado.
- O snapshot anterior marcou 24/40; a maior melhoria veio em controle, prevencao de erro e reconhecimento.

## Questions to Consider

- O proximo investimento deve ser QA autenticado ou simplificacao da Vitrine?
- Quais tres tarefas diarias merecem atalho/bulk action primeiro?
- A navegacao deve refletir departamentos ou frequencia de uso?
