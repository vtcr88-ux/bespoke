# Bespoke Control

Painel interno para preparar e acompanhar lojas white-label isoladas. Ele administra metadados operacionais, dominios, prontidao e eventos de provisionamento; nao administra produtos, clientes, pedidos, pagamentos ou segredos das lojas.

## Usuarios

- Operador da plataforma Bespoke: cria e acompanha instancias.
- Proprietario da loja: continua usando apenas o painel administrativo isolado da propria loja.

## Principios

- Cada loja permanece single-tenant, com banco, credenciais, uploads e processos proprios.
- Preparar arquivos e provisionar infraestrutura sao etapas explicitas e auditaveis.
- Operacoes privilegiadas de VPS nao sao executadas pelo navegador.
- A interface deve ser direta, didatica e responsiva.
