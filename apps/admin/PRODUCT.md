# Product

## Register

product

## Platform

web

## Users

O publico principal e formado por proprietarios e gestores da Bespoke e das futuras marcas que utilizarem a estrutura white-label. Eles precisam administrar a operacao comercial sem depender de alteracoes no codigo ou de conhecimento tecnico avancado.

A equipe de suporte e o publico secundario. Ela precisa diagnosticar problemas, orientar configuracoes e acompanhar a operacao sem perder o contexto da marca atendida.

O produto deve funcionar com a mesma clareza em celular, tablet e desktop. Entre as tarefas recorrentes estao configurar a identidade e os textos da loja, manter catalogo, imagens e estoque, acompanhar pedidos e conferir dados de pagamento e entrega.

## Product Purpose

Centralizar a operacao comercial em um ambiente seguro, compreensivel e adaptavel. O admin permite manter catalogo, imagens, estoque, pedidos, aparencia e conteudo da loja sem editar codigo.

Na Vitrine, a identidade do rodape permite usar uma logo responsiva e escolher se o nome da marca tambem sera exibido em texto, atendendo marcas cuja logo ja contenha o nome completo.

O produto tem sucesso quando uma pessoa entende as configuracoes na primeira utilizacao, conclui tarefas rotineiras sem ajuda tecnica, confia nos dados apresentados e consegue operar integralmente em qualquer tamanho de tela. A estrutura deve evoluir para white-label sem elementos da Bespoke fixados nas regras ou na interface.

Ao editar produtos, o painel deve explicar que os cards publicos exibem ate 200 caracteres da descricao e aceitam pequenos topicos por linha. O preview precisa reproduzir a expansao real do card antes de salvar.

A aba Vitrine e a fonte de verdade para Header, textos do catalogo, Manifestos, Motion por bloco e Avaliacoes. Configuracoes antigas devem receber novos campos por normalizacao, sem exigir que o administrador refaca a identidade visual existente.

Na Composicao, o administrador controla separadamente a exibicao mobile dos atalhos e do divisor do manifesto, evitando separadores consecutivos sem alterar tablet ou desktop.

Cabecalho, Home, Catalogo e Rodape possuem etapas e configuracoes independentes. Restaurar uma etapa altera somente os campos sob responsabilidade dela; configuracoes gerais servem como fallback e nunca devem substituir uma personalizacao explicita de outro componente. A cor de fundo do Rodape pertence exclusivamente a etapa Rodape.

Seletores de fonte por componente mostram apenas familias visualmente distintas. Valores antigos continuam aceitos para compatibilidade, mas o editor os apresenta como o padrao sem duplicar nomes diferentes para a mesma escolha.

A busca global do painel deve localizar paginas e etapas especificas da Vitrine, aceitar termos sem acento e apenas conduzir a navegacao. Pesquisar, abrir um resultado ou limpar a busca nao modifica nem salva configuracoes.

Avaliacoes permanecem desativadas ate que exista ao menos um relato real, autorizado e habilitado. O editor permite controlar titulo, etiqueta, tipografia, cores e velocidade, mas nao deve gerar depoimentos de exemplo para a pagina publica.

## Positioning

Um centro de controle confiavel, didatico e adaptavel para toda a operacao comercial de cada boutique.

## Pagamentos Pix

A pagina de Pagamentos concentra a ativacao e os dados do Pix manual por loja,
alem da fila de pedidos aguardando conferencia. Confirmar ou rejeitar altera o
estado financeiro somente de pedidos `pix_manual`; pagamentos do Mercado Pago
continuam dependentes do webhook validado.

## Brand Personality

- Claro: usa linguagem direta, hierarquia previsivel e rotulos que explicam a acao.
- Didatico: apresenta contexto, consequencias e validacoes no ponto em que a decisao acontece.
- Confiavel: trata dados comerciais, pessoais e financeiros com precisao e discricao.
- Adaptavel: acolhe diferentes identidades de marca sem perder consistencia operacional.

A voz deve ser calma, objetiva e prestativa. Evitar jargao tecnico, instrucoes vagas, tom promocional e excesso de texto. Quando uma configuracao puder afetar a loja publica, explicar o efeito e oferecer uma visualizacao previa sempre que for pertinente.

## Anti-references

- Configuracoes tecnicas dificeis de interpretar ou que dependam de tentativa e erro.
- Interfaces decorativas que escondam informacao operacional importante.
- Fluxos que funcionem apenas em desktop ou percam recursos em telas menores.
- Elementos da Bespoke fixos no codigo que impeçam a personalizacao white-label.

## Design Principles

1. Tornar operacoes complexas autoexplicativas. Agrupar configuracoes por objetivo, usar termos familiares e manter ajuda contextual perto do controle relevante.
2. Preservar contexto e prevenir erros. Mostrar estado atual, validacao em linha, previa de mudancas e confirmacoes proporcionais ao risco da acao.
3. Entregar paridade responsiva. Todas as tarefas essenciais devem ser concluidas em celular, tablet e desktop, sem cortes, sobreposicoes ou perda de informacao.
4. Preparar o white-label desde a base. Identidade, conteudo e configuracoes de cada marca devem ser substituiveis e isolados, sem regras visuais ou textuais rigidas da Bespoke.
5. Tratar dados como fonte de confianca. Precos, estoque, pedidos e estados financeiros devem usar fontes oficiais; dados pessoais devem ser protegidos e acoes administrativas autorizadas no servidor.

## Accessibility & Inclusion

Atender WCAG 2.2 nivel AA. Todos os fluxos devem funcionar por teclado e com leitores de tela, apresentar foco visivel, rotulos programaticos, contraste adequado e mensagens de erro que nao dependam apenas de cor.

Respeitar preferencias de movimento reduzido e manter alvos de toque confortaveis. A responsividade inclui zoom, aumento de texto, palavras longas e conteudo dinamico sem cortes ou sobreposicoes. A linguagem deve ser inclusiva, direta e compreensivel para pessoas com diferentes niveis de familiaridade digital.
