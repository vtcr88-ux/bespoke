# Teste local do webhook do Mercado Pago

O tunel local expoe somente:

- `POST /webhooks/mercado-pago` para notificacoes assinadas;
- `GET /health` para diagnostico;
- `GET /checkout/return` para devolver o comprador ao checkout local depois do
  pagamento.

Todas as outras rotas recebem `404` no ngrok e nao chegam a API local.

## Preparacao

1. Inicie API, Web e Admin:

   ```bash
   npm run dev
   ```

2. Confirme a instalacao e o arquivo de configuracao do ngrok:

   ```bash
   npm run ngrok:check
   ```

3. Em outro terminal, abra o tunel restrito:

   ```bash
   npm run ngrok
   ```

4. Copie apenas a URL HTTPS base gerada, sem acrescentar uma barra no final. No
   arquivo local `apps/api/.env`, atualize `PUBLIC_API_URL` com essa URL.

5. Reinicie a API. As variaveis de ambiente sao lidas na inicializacao, e uma
   API que permaneceu aberta continuara criando preferencias com a URL antiga.
   O hostname de `PUBLIC_API_URL` e incluido automaticamente entre os hosts
   confiaveis da API.

## Mercado Pago

Na aplicacao de teste do Mercado Pago, use a URL:

```text
https://SEU-ENDERECO-NGROK/webhooks/mercado-pago
```

Ative o evento de pagamentos e use a assinatura secreta gerada para a mesma
aplicacao e o mesmo ambiente de teste. A variavel
`MERCADO_PAGO_WEBHOOK_SECRET` permanece somente no back-end. Reinicie a API
depois de atualiza-la.

O Checkout Pro tambem envia `notification_url` ao criar cada preferencia. No
projeto, esse valor e montado a partir de `PUBLIC_API_URL`, por isso ele deve
apontar para o tunel atual antes de criar um novo pedido.

Como o Mercado Pago nao aceita `localhost` nem URLs HTTP em `back_urls`, a API
usa `PUBLIC_API_URL/checkout/return` durante o desenvolvimento. Essa rota HTTPS
redireciona o navegador para `PUBLIC_WEB_URL/checkout/sandbox`; o status do
pagamento continua sendo consultado na API e validado pelo webhook.

## Diagnostico

- `https://SEU-ENDERECO-NGROK/health` deve responder com status `200`.
- `https://SEU-ENDERECO-NGROK/checkout/return?order=ORD-EXEMPLO` deve responder
  com redirecionamento para a pagina local de retorno.
- Qualquer outra rota deve responder com `404` no ngrok.
- O inspetor local fica em `http://127.0.0.1:4040` enquanto o tunel estiver
  ativo.
- Uma chamada manual sem `x-signature` valida deve ser recusada pela API. Isso
  confirma a protecao, mas nao substitui o simulador oficial do Mercado Pago.
- Em contas gratuitas, a URL pode mudar quando o ngrok for reiniciado. Nesse
  caso, atualize `PUBLIC_API_URL`, reinicie a API e configure novamente a URL de
  teste antes de criar outra preferencia.
