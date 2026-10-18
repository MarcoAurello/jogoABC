/* Palavras do jogo: só sílabas simples de consoante + vogal (sem SS, Ç, RR, NH, LH, CH...).
   O jogo começa pelas de 2 sílabas e vai subindo.
   Para trocar a figura por uma foto, use img: 'assets/figuras/bola.png' no lugar do emoji. */
const PALAVRAS = [
  // 2 sílabas
  { silabas: ['BO', 'LA'], emoji: '⚽', img: 'assets/figuras/bola.jpg' },
  { silabas: ['VA', 'CA'], emoji: '🐄', img: 'assets/figuras/vaca.jpg' },
  { silabas: ['PA', 'TO'], emoji: '🦆', img: 'assets/figuras/pato.jpg' },
  { silabas: ['GA', 'TO'], emoji: '🐱', img: 'assets/figuras/gato.jpg' },
  { silabas: ['SA', 'PO'], emoji: '🐸' },
  { silabas: ['MA', 'LA'], emoji: '🧳' },
  { silabas: ['DA', 'DO'], emoji: '🎲', img: 'assets/figuras/dado.jpg' },
  { silabas: ['FO', 'CA'], emoji: '🦭' },
  { silabas: ['MA', 'PA'], emoji: '🗺️' },
  { silabas: ['SI', 'NO'], emoji: '🔔' },
  { silabas: ['MO', 'TO'], emoji: '🏍️' },
  { silabas: ['PI', 'PA'], emoji: '🪁' },
  { silabas: ['BO', 'LO'], emoji: '🎂' },
  { silabas: ['CA', 'MA'], emoji: '🛏️' },
  { silabas: ['LO', 'BO'], emoji: '🐺' },
  { silabas: ['GE', 'LO'], emoji: '🧊' },
  { silabas: ['CA', 'SA'], emoji: '🏠', img: 'assets/figuras/casa.jpg' },
  { silabas: ['DE', 'DO'], emoji: '☝️' },
  { silabas: ['PE', 'NA'], emoji: '🪶' },
  { silabas: ['LA', 'TA'], emoji: '🥫' },
  { silabas: ['PE', 'RA'], emoji: '🍐' },
  { silabas: ['RA', 'TO'], emoji: '🐭' },
  { silabas: ['BO', 'TA'], emoji: '👢' },
  { silabas: ['LU', 'PA'], emoji: '🔍' },
  { silabas: ['SU', 'CO'], emoji: '🧃' },
  { silabas: ['GA', 'LO'], emoji: '🐓' },
  { silabas: ['ME', 'SA'], emoji: '🪑', img: 'assets/figuras/mesa.jpg' },
  { silabas: ['FO', 'GO'], emoji: '🔥', img: 'assets/figuras/fogo.jpg' },
  { silabas: ['CO', 'PO'], emoji: '🥛' },
  // 3 sílabas
  { silabas: ['BA', 'NA', 'NA'], emoji: '🍌', img: 'assets/figuras/banana.jpg' },
  { silabas: ['CA', 'VA', 'LO'], emoji: '🐎' },
  { silabas: ['MA', 'CA', 'CO'], emoji: '🐒' },
  { silabas: ['BO', 'NE', 'CA'], emoji: '🪆' },
  { silabas: ['SA', 'PA', 'TO'], emoji: '👞', img: 'assets/figuras/sapato.jpg' },
  { silabas: ['BA', 'TA', 'TA'], emoji: '🥔' },
  { silabas: ['TO', 'MA', 'TE'], emoji: '🍅' },
  { silabas: ['PI', 'PO', 'CA'], emoji: '🍿' },
  { silabas: ['CA', 'ME', 'LO'], emoji: '🐫' },
  { silabas: ['JA', 'NE', 'LA'], emoji: '🪟', img: 'assets/figuras/janela.jpg' },
  { silabas: ['CA', 'NE', 'TA'], emoji: '🖊️' },
  { silabas: ['ME', 'NI', 'NA'], emoji: '👧' },
  { silabas: ['ME', 'NI', 'NO'], emoji: '👦' },
  { silabas: ['CO', 'RU', 'JA'], emoji: '🦉' },
  { silabas: ['GI', 'RA', 'FA'], emoji: '🦒', img: 'assets/figuras/girafa.jpg' },
  { silabas: ['PE', 'PI', 'NO'], emoji: '🥒' },
  { silabas: ['CE', 'BO', 'LA'], emoji: '🧅' },
  { silabas: ['SA', 'LA', 'DA'], emoji: '🥗' },
  { silabas: ['SA', 'CO', 'LA'], emoji: '🛍️' },
  // 4 sílabas
  { silabas: ['TE', 'LE', 'FO', 'NE'], emoji: '📞', img: 'assets/figuras/telefone.jpg' },
  { silabas: ['PI', 'RU', 'LI', 'TO'], emoji: '🍭' },
  { silabas: ['CA', 'MI', 'SE', 'TA'], emoji: '👕' },
  { silabas: ['CA', 'PA', 'CE', 'TE'], emoji: '⛑️' },
  { silabas: ['SA', 'BO', 'NE', 'TE'], emoji: '🧼' },
  { silabas: ['PA', 'TI', 'NE', 'TE'], emoji: '🛴' },
  { silabas: ['PE', 'RE', 'RE', 'CA'], emoji: '🐸' },
  { silabas: ['LI', 'MO', 'NA', 'DA'], emoji: '🍋' },
  // 5 sílabas
  { silabas: ['JA', 'BU', 'TI', 'CA', 'BA'], emoji: '🫐' },
];

/* Letras que costumam confundir quem está aprendendo a ler (espelhadas, de som ou forma parecida).
   Elas entram entre as 9 letras para escolher. */
const PARECIDAS = {
  A: ['O', 'E'], B: ['D', 'P'], C: ['G', 'O'], D: ['B', 'P', 'T'], E: ['I', 'A'], F: ['V', 'T'],
  G: ['C', 'J', 'Q'], I: ['E', 'L'], J: ['G', 'I'], L: ['I', 'T'], M: ['N', 'W'], N: ['M', 'U'],
  O: ['U', 'A', 'Q'], P: ['B', 'Q', 'D'], R: ['P', 'L'], S: ['Z', 'C'], T: ['D', 'F'], U: ['O', 'V', 'N'],
  V: ['F', 'U'], Z: ['S'],
};

// Cor de cada letra, no estilo das peças coloridas (todas com contraste bom para letra branca)
const CORES_LETRAS = {
  A: '#1f4fa8', B: '#c2185b', C: '#00796b', D: '#a15c00', E: '#6a1b9a', F: '#0277bd', G: '#8e24aa',
  H: '#283593', I: '#ad1457', J: '#c2185b', K: '#2e7d32', L: '#00695c', M: '#0277bd', N: '#c2185b',
  O: '#6a1b9a', P: '#ad1457', Q: '#8d6e00', R: '#b45309', S: '#2e7d32', T: '#01579b', U: '#7b1fa2',
  V: '#00838f', W: '#ad1457', X: '#558b2f', Y: '#7b1fa2', Z: '#4527a0',
};

// Frases faladas pela voz do aparelho se um áudio da Tia Ana não tocar
const FALAS = {
  convite: 'Oi! Vamos jogar e aprender a ler juntos?',
  explicacao: 'Olhe a figura e arraste cada letra até o lugar certo da palavra.',
  acerto: 'Muito bem!',
  erro: 'Ops! Tente outra letra.',
  mudar: 'Agora, uma nova palavra!',
  fim: 'Acabou o tempo! Parabéns por jogar!',
};
