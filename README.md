# Bespoke E-Commerce

Plataforma premium single-tenant para vitrine publica, compra assistida por WhatsApp, Checkout Pro do Mercado Pago e portal administrativo protegido.

O modelo white-label recomendado e multi-instancia isolado: o mesmo
repositorio/build Bespoke atende varias lojas no mesmo VPS, mas cada loja roda
com `.env`, porta de API, banco MySQL, uploads, Mercado Pago, dominios e admin
proprios. A identidade visual do Admin continua Bespoke; a identidade da loja
fica somente na pagina publica e nas configuracoes editaveis da vitrine.

## Estrutura

- `apps/web`: loja publica React + Vite.
- `apps/admin`: portal administrativo React + Vite.
- `apps/api`: API Node.js + Express + TypeScript.
- `packages/contracts`: contratos Zod compartilhados.
- `packages/design-system`: tokens e componentes compartilhados.
- `database/migrations`: schema MySQL versionado.
- `database/seeds`: dados demonstrativos sem informacoes reais.
- `instances`: templates isolados por loja, sem segredos reais.

## Setup local

1. Instale dependencias:

```bash
npm install
```

2. Copie os exemplos de ambiente e preencha com credenciais de desenvolvimento:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
```

3. Gere o hash da senha administrativa sem informar a senha na linha de comando:

```bash
npm --workspace @bespoke/api run auth:hash-password
```

Adicione o resultado em `ADMIN_PASSWORD_HASH` e defina o e-mail em `ADMIN_EMAIL`, ambos no `apps/api/.env`. A duracao da sessao pode ser ajustada por `ADMIN_SESSION_TTL_MINUTES`.

Confirme localmente que a senha corresponde ao hash configurado, sem expor nenhum dos dois:

```bash
npm run admin:verify
```

Depois de alterar `ADMIN_EMAIL` ou `ADMIN_PASSWORD_HASH`, reinicie o processo da API para carregar as novas credenciais. Isso vale tanto no desenvolvimento quanto em producao; iniciar uma segunda API sem encerrar a anterior apenas causa conflito na porta `3333`.

4. Configure o MySQL no `apps/api/.env`:

```env
DATABASE_URL=mysql://seu_usuario:sua_senha@localhost:3306/bespoke
```

As imagens enviadas pelo admin usam o caminho configurado em `UPLOADS_DIR` (por padrao, `apps/api/storage/uploads`). A API valida formato, tamanho e dimensoes e reprocessa PNG, JPG e WebP antes da publicacao. Em producao, use um diretorio persistente e exclusivo da instancia fora de qualquer `dist`.

A vitrine invalida settings, categorias e produtos por Server-Sent Events sempre que a API conclui uma mutacao administrativa. O notificador atual vive no processo da API; uma implantacao com varias replicas deve substitui-lo por pub/sub compartilhado. O armazenamento local tambem depende de um volume persistente compartilhado e nao deve ser usado em containers efemeros sem esse volume.

Para criar uma nova loja isolada:

```bash
npm run instance:create -- --slug=nome-da-loja --public-domain=loja.com.br --admin-domain=admin.loja.com.br --api-domain=api.loja.com.br
```

Depois copie `instances/nome-da-loja/.env.example` para o `.env` protegido da
loja, preencha segredos/credenciais e use `npm run instance:validate`,
`npm run instance:db:provision`, `npm run db:migrate:prod -- --instance=...` e
`npm run instance:render`. O guia completo fica em
`docs/WHITE_LABEL_INSTANCE_DEPLOYMENT.md`.

As sessoes administrativas e o limite de tentativas usam memoria do processo nesta fase. Reiniciar a API encerra as sessoes ativas; uma implantacao com varias replicas deve usar um armazenamento compartilhado com expiracao, como Redis.

Crie o banco se ele ainda nao existir:

```sql
CREATE DATABASE bespoke CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. Se preferir usar o MySQL via Docker local do projeto, inicie o banco primeiro:

```bash
docker compose up -d mysql
```

Depois que o healthcheck estiver saudavel, aplique schema e dados iniciais uma unica vez:

```bash
npm run db:setup
```

O container nao executa migrations automaticamente. Em producao, use apenas `npm run db:migrate:prod` e execute o seed inicial separadamente, com confirmacao explicita.

6. Rode os apps:

```bash
npm run dev
```

## Portas

- Loja: `http://localhost:5173`
- Admin: `http://localhost:5174`
- API: `http://localhost:3333`

## Fluxos de compra

- `Comprar pelo WhatsApp`: cria uma referencia publica e uma mensagem com itens, quantidades e valores gerados pelo servidor.
- `Comprar online`: cobra somente produtos e descontos no Mercado Pago. O frete permanece `NULL` e aparece como "A combinar pelo WhatsApp".
- O webhook assinado consulta o pagamento na API do Mercado Pago e e a unica fonte de verdade. A pagina de retorno consulta o estado registrado pela API antes de liberar o atendimento.
- O token opaco de consulta do pedido permanece no `sessionStorage` da aba e segue para a API pelo cabecalho `Authorization`; ele nao e incluido nas URLs do Mercado Pago, do WhatsApp ou no historico do navegador.

## Producao

Nao use `npm run dev` em producao. A estrategia preparada usa Nginx para os builds estaticos e systemd para `npm run start:prod`. Comece por [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) e [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md).

## Seguranca

- O front end envia apenas IDs, variantes e quantidades para checkout.
- A API recalcula precos, valida estoque e cria pedidos como `pending_payment`.
- Em producao, catalogo, pedidos, pagamentos, WhatsApp e visual da vitrine usam o MySQL exclusivo definido em `DATABASE_URL`.
- Webhooks sao validados por assinatura, consultados no provedor e processados com idempotencia antes de mudar status financeiro.
- O admin usa senha com hash `scrypt`, sessao opaca em cookie `HttpOnly`, protecao CSRF e limite de tentativas de login.
- O arquivo `.env` real nunca deve ser versionado, impresso ou copiado.
