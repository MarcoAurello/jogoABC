// Guarda os arquivos do jogo para funcionar offline.
// Ao mudar qualquer arquivo, aumente a VERSAO (e o ?v= no index.html) para os aparelhos baixarem a nova.
const VERSAO = 'abc-tia-ana-v9';

const ARQUIVOS = [
  './',
  './index.html',
  './style.css?v=9',
  './dados.js?v=9',
  './musica.js?v=9',
  './jogo.js?v=9',
  './vendor/jspdf.umd.min.js',
  './manifest.json',
  './assets/ana/ana_livro.jpg',
  './assets/ana/ana_danca.png',
  './assets/ana/ana_triste.png',
  './assets/ana/ana_pensa.png',
  ...['bola', 'vaca', 'pato', 'gato', 'sapo', 'mala', 'dado', 'foca', 'moto', 'bolo', 'cama', 'lobo', 'gelo', 'casa', 'pera', 'rato', 'bota', 'suco', 'galo', 'fogo', 'vela', 'tatu', 'sopa', 'rosa', 'coco', 'caju', 'roda', 'rede', 'fita', 'bule', 'banana', 'cavalo', 'macaco', 'boneca', 'sapato', 'batata', 'tomate', 'pipoca', 'camelo', 'menina', 'menino', 'coruja', 'girafa', 'pepino', 'cebola', 'panela', 'bigode', 'tapete', 'tucano', 'jabuti', 'camisa', 'gaveta'].map((f) => `./assets/fotos/${f}.jpg`),
  ...['convite', 'explicacao-inicial', 'acerto1', 'acerto2', 'erroletra1', 'erroletra2', 'erroletra3', 'mudar-palavra', 'faltam-30', 'recado-fim']
    .map((a) => `./audios/${a}.wav`),
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

// Apaga caches de versões antigas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Fonte do Google: guarda na primeira vez para usar offline depois
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(VERSAO + '-fontes').then(async (cache) => {
        const salvo = await cache.match(e.request);
        if (salvo) return salvo;
        const resposta = await fetch(e.request);
        cache.put(e.request, resposta.clone());
        return resposta;
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // Áudios: vêm do cache (o navegador pede pedaços do arquivo e isso não combina com rede primeiro)
  if (url.pathname.includes('/audios/')) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
    return;
  }

  // Demais arquivos: sempre confere com o servidor e só usa o cache sem internet
  const pedido = e.request.mode === 'navigate' ? e.request : new Request(e.request, { cache: 'no-cache' });
  e.respondWith(
    fetch(pedido)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(e.request, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
