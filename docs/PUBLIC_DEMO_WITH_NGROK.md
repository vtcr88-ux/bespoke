# Demonstracao temporaria com ngrok

Este modo publica a loja e, em um caminho aleatorio separado, o login do painel
administrativo. Ele existe para demonstracoes e testes responsivos temporarios
antes do deploy e do dominio real.

## Iniciar

1. Encerre qualquer outro terminal que esteja executando ngrok.
2. Na raiz do projeto, execute:

   ```bash
   npm run demo:public
   ```

3. Aguarde as linhas `Loja publica:` e `Painel temporario:`.
4. Compartilhe somente a URL da loja. O endereco completo do painel deve ficar
   restrito aos responsaveis pelos testes.
5. Mantenha o computador e o terminal ligados durante a demonstracao.
6. Use `Ctrl+C` para encerrar a vitrine, o painel, a API e o tunel.

O comando monitora a vitrine, a API e o agente ngrok. Se um processo encerrar
enquanto o terminal continuar aberto, ele tenta recuperar o servico e exibe
novamente o endereco publico. A verificacao acontece tambem pela rota de
prontidao, incluindo banco e diretorio de uploads.

Para consultar novamente a URL e o estado dos servicos em outro terminal:

```bash
npm run demo:status
```

O status tambem compara o build publico com os arquivos-fonte. Se uma alteracao
for feita enquanto o tunel estiver aberto, ele informa que o build esta
desatualizado. Encerre a demonstracao com `Ctrl+C` e execute
`npm run demo:public` novamente para reconstruir a vitrine, o Admin e a API.

O comando nao modifica os arquivos `.env`. Ele usa uma API separada na porta
`3334`, o build publico na porta `4173`, o build temporario do Admin na porta
`4174` e as configuracoes protegidas que ja existem no ambiente local.

Os builds temporarios ficam em `apps/web/dist-demo` e
`apps/admin/dist-demo`. Eles sao separados dos diretórios `dist` normais para
que lint, testes e builds locais nao substituam as telas apresentadas pelo
ngrok. O Admin usa um subcaminho aleatorio e chama a API pela mesma origem
HTTPS, mantendo cookie de sessao e CSRF sem expor uma URL local no celular.
O documento HTML nao e armazenado pelo navegador, evitando que celulares
continuem abrindo uma versao antiga depois de uma atualizacao. Os assets com
nome versionado continuam aproveitando o cache normal do navegador.

## Mercado Pago

Ao iniciar, o terminal tambem informa a URL temporaria do webhook. Configure
essa URL na aplicacao de teste do Mercado Pago sempre que o endereco do ngrok
mudar. As preferencias criadas nesse modo usam automaticamente a mesma origem
HTTPS para webhook e retorno do checkout.

## Protecao e limitacoes

- `/admin` e `/api/admin` continuam retornando `404` no endereco compartilhado.
- O painel so e servido no subcaminho aleatorio exibido pelo supervisor, nao e
  vinculado na loja e recebe `noindex`, `nofollow` e `no-referrer`.
- O caminho aleatorio e apenas uma camada de discricao. A seguranca real
  continua sendo e-mail, senha, cookie HttpOnly, CSRF e rate limit de login.
- O caminho secreto permanece o mesmo entre reinicializacoes e fica somente em
  `.runtime/public-demo-admin-path.txt`, que e ignorado pelo Git. Isso evita que
  um link salvo passe a abrir a vitrine depois de reiniciar o computador.
- Caminhos `painel-*` antigos ou incorretos retornam `404`; nunca recebem o
  fallback HTML da loja publica.
- O painel local continua em `http://localhost:5174`.
- O ngrok e adequado para demonstracao, nao para operacao definitiva.
- O endereco deixa de funcionar se o terminal, o computador ou a internet
  local forem desligados.
- O plano gratuito do ngrok mostra uma pagina de confirmacao no primeiro acesso
  de cada navegador ao dominio. Esse aviso pertence ao ngrok, nao solicita
  acesso ao computador e nao pode ser removido pelo codigo da loja. Depois de
  confirmar, o ngrok grava um cookie e normalmente nao repete o aviso por sete
  dias. Planos pagos removem essa pagina.
- O plano gratuito atual fornece um dominio de desenvolvimento atribuido a
  conta. O supervisor reutiliza o endereco informado pelo agente; se o ngrok
  entregar outro endereco, a API da demonstracao e reiniciada automaticamente
  com as novas URLs de checkout e webhook.
- A loja nao tenta mais abrir o WhatsApp automaticamente. O sistema operacional
  so pode pedir confirmacao para abrir outro aplicativo depois que o visitante
  tocar em um botao de WhatsApp.
- Suspensao, reinicio ou desligamento do computador interrompem qualquer tunel
  local. Disponibilidade continua exige deploy em um servidor ou ngrok
  instalado como servico do Windows.

## Diagnostico

- `http://127.0.0.1:4173` confirma a vitrine local da demonstracao.
- `npm run demo:status` informa o endereco atual do painel e o estado dos dois
  previews.
- `npm run demo:check-admin-mobile` valida a tela de login do painel em 320px,
  390px e 768px sem ler credenciais administrativas.

## Producao com dominio

No deploy, loja e painel usam dominios separados, por exemplo
`loja.exemplo.com.br` e `admin.exemplo.com.br`. O template Nginx da loja bloqueia
`/admin`, `/api/admin` e qualquer caminho temporario `painel-*`, impedindo que
uma URL administrativa incorreta seja absorvida pelo fallback da vitrine. O
template do dominio administrativo serve somente o build do Admin e encaminha
`/api/` para a API isolada da instancia.

- `http://127.0.0.1:3334/health/ready` confirma API, banco e uploads.
- `http://127.0.0.1:4040` mostra o inspetor do agente enquanto o tunel esta
  ativo.
- A URL publica seguida de `/health/ready` deve responder com
  `{ "status": "ready" }`.
- `npm exec -- ngrok diagnose` verifica DNS, TCP e TLS quando houver falha de
  conectividade.
