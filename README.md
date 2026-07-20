# Bespoke E-Commerce

Plataforma premium de e-commerce para vitrine publica, compra assistida por WhatsApp, Checkout Pro do Mercado Pago e portal administrativo protegido.

## Estrutura

- `apps/web`: loja publica React + Vite.
- `apps/admin`: portal administrativo React + Vite.
- `apps/api`: API Node.js + Express + TypeScript.
- `packages/contracts`: contratos Zod compartilhados.
- `packages/design-system`: tokens e componentes compartilhados.
- `database/migrations`: schema MySQL versionado.
- `database/seeds`: dados demonstrativos sem informacoes reais.

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

3. Configure o MySQL no `apps/api/.env`:

```env
DATABASE_URL=mysql://seu_usuario:sua_senha@localhost:3306/bespoke
```

Crie o banco se ele ainda nao existir:

```sql
CREATE DATABASE bespoke CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. Aplique schema e dados iniciais:

```bash
npm run db:setup
```

Se preferir usar o MySQL via Docker local do projeto:

```bash
docker compose up -d mysql
```

5. Rode os apps:

```bash
npm run dev
```

## Portas

- Loja: `http://localhost:5173`
- Admin: `http://localhost:5174`
- API: `http://localhost:3333`

## Seguranca

- O front end envia apenas IDs, variantes e quantidades para checkout.
- A API recalcula precos, valida estoque e cria pedidos como `pending_payment`.
- Em desenvolvimento e producao, catalogo, pedidos, pagamentos, WhatsApp e visual da vitrine usam o MySQL definido em `DATABASE_URL`.
- Webhooks devem ser verificados no back end antes de mudar status financeiro.
- O arquivo `.env` real nunca deve ser versionado, impresso ou copiado.
