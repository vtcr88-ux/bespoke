# Pix manual V1

## Escopo

O Pix manual e uma forma de pagamento independente do Mercado Pago. A API
recalcula o carrinho, cria o pedido, gera um BR Code estatico com valor fixo e
retorna o QR Code em PNG. Nao existe integracao com uma API bancaria nesta
versao.

O pagamento permanece `pending` ate o administrador conferir o comprovante e o
recebimento na conta. Abrir o WhatsApp registra apenas uma tentativa de contato;
nao confirma pagamento nem envio de mensagem.

## Configuracao por loja

No painel, acesse `Pagamentos` e informe a chave Pix, o nome e a cidade do
recebedor. Os dados sao armazenados em `store_settings` com a chave
`payments.pix.manual`.

Em uma arquitetura mini white-label, cada implantacao usa seu proprio banco,
credenciais, uploads e configuracoes. A chave Pix de uma loja nao e
compartilhada com outra.

## Fluxo publico

1. O cliente escolhe `Comprar online`.
2. O checkout consulta as formas de pagamento habilitadas.
3. Em Pix, a API recalcula produtos e descontos usando o catalogo persistido.
4. A API cria o pedido de forma idempotente e gera BR Code, QR Code e copia e
   cola.
5. O cliente paga no banco e abre o WhatsApp para enviar o comprovante.
6. O administrador confere o recebimento e confirma ou rejeita o pagamento.

O frete permanece `NULL` e aparece como `A combinar pelo WhatsApp`.

## Seguranca e idempotencia

- O valor enviado pelo navegador nunca e usado para gerar o Pix.
- Cada tentativa possui um `operationId` UUID.
- Repetir a mesma tentativa e o mesmo carrinho devolve o pedido existente.
- Reutilizar a tentativa com outro carrinho retorna conflito.
- O acesso ao QR Code exige um token cujo hash e persistido no pedido.
- O token e derivado com `SESSION_SECRET` e nao aparece na URL.
- Um pagamento do Mercado Pago nao pode ser confirmado pela acao manual do Pix.
- Confirmacoes e rejeicoes sao finais e idempotentes para o mesmo estado.

## Ngrok e VPS

O Pix manual nao usa webhook nem callback externo. Ele funciona em localhost,
ngrok e dominio real desde que a pagina publica consiga acessar a API pelo
endereco configurado ou pelo proxy reverso existente.

No deploy, aplique as migrations antes de iniciar a API:

```bash
npm run db:migrate:prod
```

A migration `009_manual_pix_payment.sql` habilita o provedor `pix_manual` e os
campos de payload e revisao. Nenhuma credencial Pix deve ser adicionada ao bundle
Vite ou a variaveis `VITE_*`.

## Limites da V1

- A confirmacao e manual.
- Nao existe consulta bancaria, expiracao automatica ou estorno Pix.
- O QR Code e estatico, com valor e referencia do pedido.
- O cliente ainda precisa confirmar o envio do comprovante dentro do WhatsApp.
