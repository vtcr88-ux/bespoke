# Product

## Register

brand

## Platform

web

## Users

O publico principal e formado por clientes finais que buscam produtos premium e chegam a loja por campanhas, redes sociais, links compartilhados ou acesso direto. Muitos fazem toda a jornada pelo celular e precisam avaliar o produto, montar o carrinho e escolher como comprar sem friccao.

Clientes recorrentes e pessoas que preferem atendimento humano formam um publico igualmente importante. A experiencia publica sera configurada por negocios que adotarem a estrutura white-label, mas deve conservar a sensacao de uma boutique coerente e confiavel em cada marca.

## Product Purpose

Oferecer uma boutique digital completa para descobrir, avaliar e comprar produtos premium com confianca. A estrutura combina a agilidade da compra online com o acolhimento da negociacao direta pelo WhatsApp, servindo tanto a campanhas e catalogos compartilhaveis quanto a uma operacao real de e-commerce.

O produto tem sucesso quando o cliente compreende as duas formas de compra, preserva produtos, quantidades e valores no carrinho e conclui a opcao escolhida em qualquer tamanho de tela. A loja nao deve parecer apenas uma lista de produtos: descoberta, confianca, pagamento, entrega e atendimento fazem parte da mesma experiencia.

## Positioning

Uma boutique digital que combina curadoria premium, compra segura e atendimento humano.

## Pagamento Pix

O checkout online oferece Pix manual, quando habilitado pela loja, e Mercado
Pago. O Pix exibe QR Code e copia e cola gerados pela API com o valor oficial do
carrinho, preserva a consulta ao recarregar e orienta o envio do comprovante pelo
WhatsApp. A confirmacao continua manual no painel.

A identidade visual publicada pelo painel deve permanecer legivel no cabecalho e no rodape. Logos horizontais recebem espaco proporcional, e o nome em texto no rodape e opcional quando ja fizer parte da propria logo.

## Conversion & proof

A acao primaria e **Compra online**. O cliente explora o catalogo, adiciona produtos ao carrinho e paga os produtos pelo Mercado Pago. Depois da confirmacao validada pela API, a loja continua o atendimento pelo WhatsApp para combinar frete ou retirada.

A acao secundaria e **Compra pelo WhatsApp**. Ela nao exige CEP: o sistema prepara uma mensagem com os produtos, quantidades e valores do carrinho, e o cliente continua a negociacao diretamente com a boutique. As duas opcoes devem permanecer claramente distintas, completas e acessiveis, na ordem compra online e depois compra pelo WhatsApp.

Linha memoravel: "Uma boutique digital para comprar online ou conversar diretamente com quem entende do produto."

Os textos relevantes da experiencia publica, incluindo chamadas e orientacoes de compra, devem ser integrados ao produto e editaveis pelo painel admin, sem depender de alteracao no codigo.

Antes de converter, o cliente precisa acreditar que:

1. Produtos, imagens, disponibilidade e valores sao claros e confiaveis.
2. A loja funciona como uma boutique completa, e nao apenas como um catalogo.
3. O carrinho preserva corretamente produtos, quantidades e precos.
4. A compra online calcula frete e encaminha o pagamento com seguranca.
5. O WhatsApp oferece uma alternativa humana e direta, sem exigir CEP.

Ainda nao existem depoimentos, casos, logos de clientes, avaliacoes ou outros ativos de prova social confirmados. Nao inventar ou simular prova. Esses elementos so devem aparecer quando houver conteudo real, verificavel e autorizado.

## Brand Personality

- Confiavel: comunica precos, disponibilidade, entrega e proximos passos com transparencia.
- Exclusiva: apresenta curadoria e qualidade com sobriedade, sem exagero ou ostentacao.
- Acolhedora: aproxima o atendimento humano e reduz a ansiedade da decisao de compra.
- Sofisticada: usa composicao, imagens e linguagem precisas, mantendo o produto como protagonista.

A voz deve ser segura, clara e gentil. Evitar pressao promocional, superlativos vazios, promessas absolutas e alegacoes medicas ou garantias que nao possam ser comprovadas.

## Anti-references

- Marketplaces genericos que tratem todos os produtos como itens indiferenciados.
- Estetica rustica ou artesanal que conflite com a proposta de boutique premium.
- Excesso promocional, urgencia artificial, banners concorrentes e ruido visual.
- Linguagem de luxo exagerada, distante ou pouco humana.

## Design Principles

1. Construir uma boutique, nao uma listagem. Imagem, informacao e contexto de compra devem ajudar o cliente a avaliar cada produto com seguranca.
2. Sustentar duas jornadas completas. Compra online e WhatsApp devem compartilhar o mesmo carrinho e preservar contexto, mas comunicar claramente seus requisitos e proximos passos.
3. Projetar primeiro para campanhas mobile. Links vindos de redes sociais devem abrir rapidamente, manter a identidade da marca e permitir compra sem cortes, sobreposicoes ou controles inacessiveis.
4. Manter conteudo e identidade sob controle do admin. Textos, imagens e elementos de marca relevantes devem ser configuraveis para suportar a evolucao white-label.
5. Conquistar confianca antes da conversao. Exibir informacoes consistentes sobre produto, preco, frete, pagamento e atendimento antes de pedir uma decisao.

A Home deve exibir todos os produtos ativos marcados como destaque no painel. A API permanece paginada para proteger a operacao, mas a vitrine percorre todas as paginas sem aplicar um limite visual fixo aos destaques.

Os cards exibem ate 200 caracteres da descricao e crescem conforme o conteudo. Quebras de linha iniciadas por marcadores simples devem permanecer legiveis como topicos curtos sem comprometer a grade responsiva.

A Home pode publicar uma secao de avaliacoes reais entre o conteudo principal e o rodape. O carrossel deve ser continuo, pausavel, legivel e substituido por navegacao horizontal estatica quando o visitante preferir movimento reduzido. Sem relatos reais habilitados, a secao nao deve ser renderizada.

O catalogo usa titulo, etiqueta, descricao e densidade definidos pela Vitrine do Admin. Sua composicao permanece generica para diferentes nichos, com filtros previsiveis, duas colunas de produtos no mobile e hierarquia responsiva em tablet e desktop.

Cabecalho, indicador de navegacao e botoes recebem a paleta publicada pelo Admin. A cor manual dos textos deve ser renderizada exatamente como foi salva. A adaptacao automatica de contraste fica restrita aos botoes configurados no modo automatico; combinacoes manuais exigem revisao de legibilidade no painel.

Cabecalho e Catalogo usam tokens proprios de paleta, tipografia, dimensoes e acabamento. Os tokens gerais da Home funcionam somente como fallback; uma configuracao explicita de um componente deve prevalecer dentro daquele componente e nao pode vazar para os demais.

O divisor visual do manifesto pode ser ocultado apenas em celulares. Quando desativado, o elemento nao deve ser renderizado, mas o respiro inferior do manifesto deve ser preservado para que a borda da secao seguinte nao encoste no texto. Quando visivel, o primeiro e o ultimo manifesto mantem respiro equivalente em relacao a Hero e ao divisor, acompanhando o espacamento global escolhido para a Home.

## Accessibility & Inclusion

Atender WCAG 2.2 nivel AA. Catalogo, produto, carrinho, calculo de frete, pagamento e WhatsApp devem funcionar por teclado e com leitores de tela, apresentar foco visivel, rotulos programaticos, contraste adequado e erros que nao dependam apenas de cor.

Respeitar preferencias de movimento reduzido, zoom e aumento de texto. Alvos de toque devem ser confortaveis, e textos, imagens, precos e acoes nao podem sofrer cortes ou sobreposicoes em celular, tablet ou desktop. A escolha entre compra online e WhatsApp deve permanecer compreensivel sem impor um unico modo de atendimento.
