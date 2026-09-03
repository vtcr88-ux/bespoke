# Bespoke E-Commerce

Projeto de portifolio full-stack que simula uma plataforma de e-commerce
white-label. A aplicacao conecta uma vitrine publica, um painel administrativo
e uma API de negocio em uma arquitetura preparada para varias lojas.

Este projeto foi desenvolvido para demonstrar competencias praticas relevantes
para uma oportunidade de estagio ou primeiro emprego em tecnologia: organizacao
de monorepo, desenvolvimento de interfaces responsivas, integracao com API,
autenticacao, persistencia de dados, pagamentos, testes e preocupacoes de
seguranca.

## O que o projeto demonstra

- Vitrine responsiva com catalogo, busca, carrinho e checkout.
- Painel administrativo protegido para produtos, pedidos, relatorios e
  configuracoes da loja.
- Preview da vitrine e personalizacao de marca, cores, tipografia, imagens e
  conteudo.
- Compra assistida pelo WhatsApp e pagamento online com Mercado Pago e Pix.
- Arquitetura white-label com isolamento entre lojas e configuracoes por
  instancia.
- Contratos, autenticacao e componentes compartilhados entre aplicacoes.
- Testes automatizados de API e fluxos de usuario com Vitest e Playwright.

## Stack e arquitetura

- **Frontend:** React, TypeScript, Vite, React Router, TanStack Query, Zustand,
  Motion e Lucide.
- **Backend:** Node.js, TypeScript, Express, Zod, Pino e MySQL.
- **Qualidade:** ESLint, TypeScript, Vitest e Playwright.
- **Organizacao:** npm workspaces em um monorepo com apps, pacotes compartilhados,
  migrations, seeds e scripts operacionais.

Principais partes do repositorio:

- `apps/web`: experiencia publica da loja.
- `apps/admin`: painel administrativo.
- `apps/api`: API de negocio, autenticacao e persistencia.
- `apps/control` e `apps/control-api`: gerenciamento da plataforma white-label.
- `packages/contracts`: contratos compartilhados entre frontend e backend.
- `packages/design-system`: componentes e tokens de interface.
- `packages/server-auth`: autenticacao reutilizavel no servidor.
- `packages/instance-kit`: configuracao e bootstrap de instancias.
- `database` e `scripts`: banco, migrations, seeds e automacoes locais.
- `tests`: cenarios ponta a ponta com Playwright.

## Como executar localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie os arquivos locais de ambiente a partir dos respectivos arquivos
   `.env.example`.

3. Preencha somente com credenciais exclusivas de desenvolvimento. Os arquivos
   `.env` reais devem permanecer fora do controle de versao.

4. Prepare o banco e inicie o ambiente usando os scripts definidos no
   `package.json`:

```bash
npm run dev
```

Os enderecos locais ativos sao exibidos pelos proprios processos durante a
inicializacao.

### Comandos uteis

```bash
npm run dev          # inicia web, admin, APIs e control plane
npm run verify       # lint, typecheck, testes e builds
npm run build        # gera os builds de todos os workspaces
npm run test         # executa os testes unitarios e de integracao
```

Para os fluxos de pagamento e WhatsApp, configure as integracoes somente com
credenciais de desenvolvimento. Os arquivos `.env` reais sao locais e nao
devem ser commitados.

## Fluxos de compra

- Compra assistida pelo WhatsApp com dados do carrinho gerados pelo sistema.
- Pagamento online com continuidade de atendimento para combinar entrega ou
  retirada.
- Pagamento por Pix quando habilitado pela loja.
- Confirmacao financeira registrada pelo back-end antes da atualizacao do
  pedido.

## Configuracao segura

- Nunca registre senhas, hashes, tokens, chaves, cookies ou credenciais reais em
  arquivos Markdown.
- Nunca inclua valores reais de ambiente em exemplos, comandos, logs, imagens
  ou relatos de erro.
- Use credenciais, banco, armazenamento e dominios exclusivos para cada loja.
- Mantenha configuracoes de producao fora do repositorio e limite seu acesso aos
  responsaveis pela operacao.
- Segredos pertencem exclusivamente ao back-end. Variaveis publicadas no bundle
  do navegador nao podem conter informacoes confidenciais.
- Consulte a documentacao operacional restrita para provisionamento,
  autenticacao, pagamentos, webhooks, infraestrutura e deploy.

## Seguranca e producao

Segredos pertencem exclusivamente ao back-end. Nunca registre senhas, hashes,
tokens, chaves, cookies ou credenciais reais no repositorio, em documentacao,
logs ou imagens. O modo de desenvolvimento nao deve ser usado em producao: a
publicacao exige builds de producao, HTTPS, persistencia, backups, isolamento
por loja e gestao segura de credenciais.

## Proximos passos

- Evoluir cobertura de testes e observabilidade.
- Ampliar o gerenciamento de instancias no control plane.
- Automatizar deploy e verificacoes de ambiente em CI/CD.
- Adicionar documentacao de API e exemplos de integracao.

## Objetivo do repositorio

Este e um projeto demonstrativo para estudo e portfolio. Ele apresenta decisoes
de produto e engenharia de ponta a ponta, sem expor credenciais ou dados reais.
