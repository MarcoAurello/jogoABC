# ABC da Tia ANA

Jogo em HTML5 (funciona como app/PWA, offline) para crianças com dificuldade de leitura.
A criança vê a figura e arrasta as letras até o lugar certo da palavra. A Tia Ana fala e reage:
**pensativa** enquanto a criança procura a letra, **dançando** quando acerta e **triste** quando erra.

## Como funciona
- Pede o nome do jogador e mostra a Tia Ana.
- Partida de **2 minutos** (o relógio para enquanto a Tia Ana troca de palavra). Faltando 30 s o relógio pisca e a Tia Ana avisa para correr.
- Palavras só com sílabas simples (consoante + vogal), de 2 e 3 sílabas (até 6 letras), em `dados.js`.
- Começa fácil e vai dificultando:
  - 1ª e 2ª palavras: falta só **uma letra** (ex.: `C _ P O`);
  - 3ª e 4ª: falta **metade**;
  - depois: a palavra inteira (às vezes ainda vem pela metade);
  - a cada 2 palavras montadas a palavra ganha mais uma sílaba.
- As palavras alternam entre montar com **letras** (C · O · P · O) e com **sílabas inteiras** (BA · NA · NA).
- 9 peças para escolher: as da palavra + peças parecidas que confundem (B/D/P, M/N, F/V; BA/DA/BO...). Mudam a cada palavra.
- Dá para **arrastar** ou **tocar na letra e depois no espaço** (mais fácil para quem tem dificuldade motora). Também funciona pelo teclado.

## Métrica (tempo por peça: letra ou sílaba)
| Tempo médio por peça | Resultado |
|---|---|
| até 5 s | Ótimo |
| até 10 s | Regular |
| mais de 10 s | Precisa treinar mais |

Ex.: BOLA (4 letras) em até 20 s = ótimo; até 40 s = regular; mais que isso = treinar mais.
Os limites estão em `jogo.js` (`OTIMO`, `REGULAR`).

## Relatório
Ao fim: selo do resultado, números, gráfico do tempo por letra em cada palavra, gráfico das letras com mais
dificuldade, principais dificuldades (trocas de letras, letras lentas) e evolução das últimas partidas.
**Enviar para a Tia Ana** compartilha o PDF: no celular abre a lista de apps (escolha WhatsApp e a Tia Ana).
No computador baixa o PDF e abre a conversa da Tia Ana no WhatsApp para anexar;
o número está em `TELEFONE_ANA` no `jogo.js` (81 98821-9018). A mensagem é "Oi Tia Ana, segue o relatório de NOME".

## Áudios da Tia Ana (`audios/`)
| Arquivo | Quando toca |
|---|---|
| convite.ogg | tela inicial |
| explicacao-inicial.ogg | antes de começar a partida |
| acerto1/2.ogg | letra certa (alternando) |
| erroletra1/2/3.ogg | letra errada (em rodízio) |
| mudar-palavra.ogg | a cada 3 palavras montadas |
| faltam-30.ogg | faltando 30 segundos (**ainda falta gravar**: "Corre! Faltam só 30 segundos!"; até lá a voz do aparelho avisa) |
| recado-fim.ogg | fim do tempo |

A Tia Ana fala **um áudio por vez**: se já estiver falando, o novo áudio não toca.
O silêncio do começo e do fim das gravações é cortado na hora de tocar. Se o aparelho não tocar `.ogg`,
a voz do aparelho fala uma frase parecida. A música de fundo é gerada pelo próprio navegador (`musica.js`).

## Fotos
Fotos reais do Wikimedia Commons em `assets/fotos/` (um objeto só, bem claro). Créditos e licenças em `CREDITOS.md`.
Palavras de no máximo 6 letras (2 e 3 sílabas), para crianças com deficiência intelectual.
Para trocar uma foto, substitua o arquivo (quadrado, 400x400) com o mesmo nome. `ferramentas/fotos.ps1` e
`ferramentas/candidatas.ps1` ajudam a buscar fotos no Commons.

## Tia Ana animada
`ferramentas/sprites.ps1` recorta `imgs/sprites para o jogo.jpeg` e tira o fundo quadriculado,
gerando `assets/ana/ana_danca.png`, `ana_triste.png` e `ana_pensa.png`.

## Atualizar
Ao mudar arquivos, aumente `VERSAO` no `service-worker.js` e o `?v=` no `index.html`.

© Marco Nunes — Todos os direitos reservados
