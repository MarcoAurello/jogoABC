# ABC da Tia ANA

Jogo em HTML5 (funciona como app/PWA, offline) para crianças com dificuldade de leitura.
A criança vê a figura e arrasta as letras até o lugar certo da palavra. A Tia Ana fala e reage:
**pensativa** enquanto a criança procura a letra, **dançando** quando acerta e **triste** quando erra.

## Como funciona
- Pede o nome do jogador e mostra a Tia Ana.
- Partida de **1 min e 30 s** (o relógio para enquanto a Tia Ana troca de palavra).
- Palavras só com sílabas simples (consoante + vogal), de 2 a 5 sílabas, em `dados.js`.
- Começa fácil e vai dificultando:
  - 1ª e 2ª palavras: falta só **uma letra** (ex.: `C _ P O`);
  - 3ª e 4ª: falta **metade**;
  - depois: a palavra inteira (às vezes ainda vem pela metade);
  - a cada 2 palavras montadas a palavra ganha mais uma sílaba.
- 9 letras para escolher: as da palavra + letras parecidas que confundem (b/d/p, m/n, f/v...). Mudam a cada palavra.
- Dá para **arrastar** ou **tocar na letra e depois no espaço** (mais fácil para quem tem dificuldade motora). Também funciona pelo teclado.

## Métrica (tempo por letra)
| Tempo médio por letra | Resultado |
|---|---|
| até 2 s | Ótimo |
| até 4 s | Regular |
| mais de 4 s | Precisa treinar mais |

Ex.: BOLA (4 letras) em 8 s = ótimo; 16 s = regular; 24 s = treinar mais.
Os limites estão em `jogo.js` (`OTIMO`, `REGULAR`).

## Relatório
Ao fim: selo do resultado, números, gráfico do tempo por letra em cada palavra, gráfico das letras com mais
dificuldade, principais dificuldades (trocas de letras, letras lentas) e evolução das últimas partidas.
**Enviar para a Tia Ana** compartilha o PDF (no celular abre a lista de apps: WhatsApp, e-mail...).
No computador baixa o PDF e abre o WhatsApp com o resumo. Para já abrir a conversa da Tia Ana,
coloque o número em `TELEFONE_ANA` no `jogo.js`.

## Áudios da Tia Ana (`audios/`)
| Arquivo | Quando toca |
|---|---|
| convite.ogg | tela inicial |
| explicacao-inicial.ogg | antes de começar a partida |
| acerto1/2.ogg | letra certa (alternando) |
| erroletra1/2/3.ogg | letra errada (em rodízio) |
| mudar-palavra.ogg | palavra completa, antes da próxima |
| recado-fim.ogg | fim do tempo |

O silêncio do começo e do fim das gravações é cortado na hora de tocar. Se o aparelho não tocar `.ogg`,
a voz do aparelho fala uma frase parecida. A música de fundo é gerada pelo próprio navegador (`musica.js`).

## Figuras
Fotos em `assets/figuras/` (recortadas de `imgs/palavras.jpg`, sem os nomes). As outras palavras usam emoji.
Para usar uma foto, coloque `img: 'assets/figuras/nome.jpg'` na palavra em `dados.js`.

## Tia Ana animada
`ferramentas/sprites.ps1` recorta `imgs/sprites para o jogo.jpeg` e tira o fundo quadriculado,
gerando `assets/ana/ana_danca.png`, `ana_triste.png` e `ana_pensa.png`.

## Atualizar
Ao mudar arquivos, aumente `VERSAO` no `service-worker.js` e o `?v=` no `index.html`.

© Marco Nunes — Todos os direitos reservados
