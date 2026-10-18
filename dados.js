/* Palavras do jogo: só sílabas simples de consoante + vogal (sem SS, Ç, RR, NH, LH, CH...),
   com no máximo 6 letras e uma foto bem clara de cada objeto (assets/fotos).
   O jogo começa pelas de 2 sílabas e passa para as de 3.
   O emoji só aparece se a foto não carregar. */
const PALAVRAS = [
  // 2 sílabas
  { silabas: ['BO', 'LA'], emoji: '⚽', img: 'assets/fotos/bola.jpg' },
  { silabas: ['VA', 'CA'], emoji: '🐄', img: 'assets/fotos/vaca.jpg' },
  { silabas: ['PA', 'TO'], emoji: '🦆', img: 'assets/fotos/pato.jpg' },
  { silabas: ['GA', 'TO'], emoji: '🐱', img: 'assets/fotos/gato.jpg' },
  { silabas: ['SA', 'PO'], emoji: '🐸', img: 'assets/fotos/sapo.jpg' },
  { silabas: ['MA', 'LA'], emoji: '🧳', img: 'assets/fotos/mala.jpg' },
  { silabas: ['DA', 'DO'], emoji: '🎲', img: 'assets/fotos/dado.jpg' },
  { silabas: ['FO', 'CA'], emoji: '🦭', img: 'assets/fotos/foca.jpg' },
  { silabas: ['MO', 'TO'], emoji: '🏍️', img: 'assets/fotos/moto.jpg' },
  { silabas: ['BO', 'LO'], emoji: '🎂', img: 'assets/fotos/bolo.jpg' },
  { silabas: ['CA', 'MA'], emoji: '🛏️', img: 'assets/fotos/cama.jpg' },
  { silabas: ['LO', 'BO'], emoji: '🐺', img: 'assets/fotos/lobo.jpg' },
  { silabas: ['GE', 'LO'], emoji: '🧊', img: 'assets/fotos/gelo.jpg' },
  { silabas: ['CA', 'SA'], emoji: '🏠', img: 'assets/fotos/casa.jpg' },
  { silabas: ['PE', 'RA'], emoji: '🍐', img: 'assets/fotos/pera.jpg' },
  { silabas: ['RA', 'TO'], emoji: '🐭', img: 'assets/fotos/rato.jpg' },
  { silabas: ['BO', 'TA'], emoji: '👢', img: 'assets/fotos/bota.jpg' },
  { silabas: ['SU', 'CO'], emoji: '🧃', img: 'assets/fotos/suco.jpg' },
  { silabas: ['GA', 'LO'], emoji: '🐓', img: 'assets/fotos/galo.jpg' },
  { silabas: ['FO', 'GO'], emoji: '🔥', img: 'assets/fotos/fogo.jpg' },
  // 3 sílabas
  { silabas: ['BA', 'NA', 'NA'], emoji: '🍌', img: 'assets/fotos/banana.jpg' },
  { silabas: ['CA', 'VA', 'LO'], emoji: '🐎', img: 'assets/fotos/cavalo.jpg' },
  { silabas: ['MA', 'CA', 'CO'], emoji: '🐒', img: 'assets/fotos/macaco.jpg' },
  { silabas: ['BO', 'NE', 'CA'], emoji: '🪆', img: 'assets/fotos/boneca.jpg' },
  { silabas: ['SA', 'PA', 'TO'], emoji: '👟', img: 'assets/fotos/sapato.jpg' },
  { silabas: ['BA', 'TA', 'TA'], emoji: '🥔', img: 'assets/fotos/batata.jpg' },
  { silabas: ['TO', 'MA', 'TE'], emoji: '🍅', img: 'assets/fotos/tomate.jpg' },
  { silabas: ['PI', 'PO', 'CA'], emoji: '🍿', img: 'assets/fotos/pipoca.jpg' },
  { silabas: ['CA', 'ME', 'LO'], emoji: '🐫', img: 'assets/fotos/camelo.jpg' },
  { silabas: ['ME', 'NI', 'NA'], emoji: '👧', img: 'assets/fotos/menina.jpg' },
  { silabas: ['ME', 'NI', 'NO'], emoji: '👦', img: 'assets/fotos/menino.jpg' },
  { silabas: ['CO', 'RU', 'JA'], emoji: '🦉', img: 'assets/fotos/coruja.jpg' },
  { silabas: ['GI', 'RA', 'FA'], emoji: '🦒', img: 'assets/fotos/girafa.jpg' },
  { silabas: ['PE', 'PI', 'NO'], emoji: '🥒', img: 'assets/fotos/pepino.jpg' },
  { silabas: ['CE', 'BO', 'LA'], emoji: '🧅', img: 'assets/fotos/cebola.jpg' },
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
