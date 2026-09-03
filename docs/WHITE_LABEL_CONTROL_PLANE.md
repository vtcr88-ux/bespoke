# Bespoke Control Plane

## Objetivo

O Bespoke Control inicia a automatizacao da mini plataforma white-label sem
transformar as lojas em um SaaS multi-tenant. A base de codigo e compartilhada;
cada loja continua sendo uma implantacao single-tenant com banco, credenciais,
uploads, processos e dominios exclusivos.

## Componentes

- `apps/control`: interface interna do operador Bespoke.
- `apps/control-api`: autenticacao e metadados operacionais.
- `packages/instance-kit`: validacao, reserva de porta e geracao atomica dos
  templates em `instances/<slug>`.
- `database/control-plane/001_control_plane.sql`: schema do banco central.

O banco central guarda somente nome, slug, dominios, porta reservada, contato do
proprietario, observacoes, estado e eventos. Ele nao guarda catalogo, clientes,
pedidos, pagamentos, tokens do Mercado Pago, senhas ou sessoes das lojas.

## Fluxo V1

1. O operador entra no Control com credenciais proprias.
2. Cadastra identidade, dominios e responsavel.
3. A API impede duplicidade de slug, dominio e porta.
4. O operador confirma o preparo dos templates.
5. O `instance-kit` cria os arquivos em diretorio temporario e publica por
   rename atomico, sem segredos reais.
6. O checklist mostra o que ainda depende da VPS: cofre de segredos, banco,
   runtime, Nginx e TLS.

O botao de preparo nao executa comandos como root e nao provisiona MySQL,
systemd, Nginx ou certificados. Essa separacao reduz a superficie de ataque do
painel web. Uma proxima etapa pode consumir uma fila assinada por um worker
privilegiado com operacoes permitidas e idempotentes.

## Desenvolvimento

```bash
cp apps/control-api/.env.example apps/control-api/.env
cp apps/control/.env.example apps/control/.env
npm run admin:create
npm run dev:control-api
npm run dev:control
```

Use `CONTROL_STORAGE=file` apenas localmente. O arquivo fica sob `storage/` e e
ignorado pelo Git.

## Producao

- Use `CONTROL_STORAGE=mysql` e aplique a migration central.
- Defina `CONTROL_INSTANCES_ROOT` como caminho absoluto protegido.
- Use segredo de sessao e CSRF exclusivos do Control.
- Sirva o frontend somente por HTTPS e mantenha a API em loopback.
- Restrinja o dominio do Control por firewall, VPN ou allowlist quando possivel.
- Nao reutilize as credenciais administrativas de nenhuma loja.
- Inclua o banco central e os templates de instancia no plano de backup.

## Proximas etapas

1. Worker de provisionamento com fila, allowlist e logs estruturados.
2. Cofre de segredos ou arquivos root-only fora do repositorio.
3. Criacao idempotente do banco e usuario exclusivo por loja.
4. Renderizacao e ativacao controlada de systemd, Nginx e TLS.
5. Health checks por instancia e reconciliacao de estado.
6. Suspensao e desativacao sem apagar dados historicos.
