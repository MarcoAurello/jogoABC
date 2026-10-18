(() => {
  const $ = (id) => document.getElementById(id);

  // ---------- Configuração ----------
  const DURACAO = 120;        // segundos de cada partida (2 minutos)
  const AVISO_FINAL = 30;     // faltando 30 s, a Tia Ana avisa para correr
  const MUDAR_A_CADA = 3;     // o áudio "mudar de palavra" toca a cada 3 palavras montadas
  const RECADO_EM = 60;       // com 1 minuto de jogo toca o recado da Tia Ana (que também toca no fim)
  const OTIMO = 5;            // até 5 s por letra: ótimo
  const REGULAR = 10;         // até 10 s por letra: regular; acima disso: treinar mais
  const PALAVRAS_POR_NIVEL = 2; // a cada 2 palavras montadas, a palavra ganha mais uma sílaba
  const TELEFONE_ANA = '5581988219018'; // WhatsApp da Tia Ana: (81) 98821-9018
  const CHAVE_NOME = 'abc-ana:nome';
  const CHAVE_HIST = 'abc-ana:historico:';
  const CHAVE_PREF = 'abc-ana:pref';

  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const ler = (k, padrao) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; } catch (e) { return padrao; } };

  let nome = ler(CHAVE_NOME, '');
  const pref = ler(CHAVE_PREF, { musica: true, voz: true });

  // ---------- Telas ----------
  function mostrar(id) {
    document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === id));
    window.scrollTo(0, 0);
  }

  // ---------- Voz da Tia Ana ----------
  const AUDIOS = {
    convite: ['convite'],
    explicacao: ['explicacao-inicial'],
    acerto: ['acerto1', 'acerto2'],
    erro: ['erroletra1', 'erroletra2', 'erroletra3'],
    mudar: ['mudar-palavra'],
    corre: ['faltam-30'],      // grave este áudio: "Corre! Faltam só 30 segundos!"
    fim: ['recado-fim'],
  };
  const vez = {};
  const trechos = {};     // áudio já decodificado: { buffer, inicio, fim } (só o trecho com voz)
  let ctxVoz = null;
  let tocandoAgora = null; // { parar() }
  let carregando = null;

  // Os áudios (gravados no WhatsApp) têm ~1 s de silêncio no começo: decodificamos
  // e tocamos só o trecho com voz, para a resposta sair na hora.
  function carregarAudios() {
    if (carregando) return carregando;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return (carregando = Promise.resolve());
    ctxVoz = new AC();
    carregando = Promise.all(Object.values(AUDIOS).flat().map(async (arquivo) => {
      try {
        const dados = await (await fetch(`audios/${arquivo}.ogg`)).arrayBuffer();
        const buffer = await new Promise((ok, falha) => ctxVoz.decodeAudioData(dados, ok, falha));
        const c = buffer.getChannelData(0);
        let pico = 0;
        for (let k = 0; k < c.length; k += 4) pico = Math.max(pico, Math.abs(c[k]));
        const limiar = pico * 0.06;
        let a = 0, b = c.length - 1;
        while (a < c.length && Math.abs(c[a]) < limiar) a++;
        while (b > a && Math.abs(c[b]) < limiar) b--;
        trechos[arquivo] = { buffer, inicio: Math.max(0, a / buffer.sampleRate - 0.12), fim: Math.min(buffer.duration, b / buffer.sampleRate + 0.25) };
      } catch (e) { /* sem suporte a .ogg: cai na voz do aparelho */ }
    }));
    return carregando;
  }

  function calarAna() {
    if (tocandoAgora) { const t = tocandoAgora; tocandoAgora = null; t.parar?.(); }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    Musica.abaixar(false);
  }

  const comLimite = (promessa, ms) => Promise.race([promessa, new Promise((ok) => setTimeout(ok, ms))]);

  // O navegador só libera o som depois de um toque: liberamos no primeiro toque em qualquer lugar
  function liberarSom() {
    carregarAudios();
    if (ctxVoz && ctxVoz.state !== 'running') ctxVoz.resume().catch(() => {});
  }
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => document.addEventListener(ev, liberarSom, { capture: true, passive: true }));

  // Toca um áudio do momento; devolve uma promessa que termina quando a fala acaba.
  // Se a Tia Ana já estiver falando, ela não fala nada (nunca fica um áudio por cima do outro;
  // só a música de fundo pode tocar junto).
  async function falarAna(momento) {
    if (!pref.voz) return;
    // trava de segurança: uma fala nunca segura a vez por mais de 16 s
    if (tocandoAgora && performance.now() - tocandoAgora.inicio > 16000) calarAna();
    if (tocandoAgora) return;
    const lista = AUDIOS[momento];
    const i = (vez[momento] = ((vez[momento] ?? -1) + 1) % lista.length);
    const meu = { inicio: performance.now() };
    tocandoAgora = meu;
    carregarAudios();
    // nunca espera para sempre: se o som não liberar ou o arquivo demorar, segue em frente
    if (ctxVoz && ctxVoz.state !== 'running') await comLimite(ctxVoz.resume().catch(() => {}), 500);
    await comLimite(carregando, 6000);
    if (tocandoAgora !== meu) return;   // foi calada enquanto carregava
    const t = trechos[lista[i]];
    if (!t || !ctxVoz || ctxVoz.state !== 'running') {
      // som ainda bloqueado ou .ogg sem suporte: a voz do aparelho fala uma frase parecida
      Musica.abaixar(true);
      meu.parar = () => speechSynthesis.cancel();
      if (FALAS[momento]) await falarTexto(FALAS[momento]);   // sem frase (ex.: aviso dos 30 s): fica em silêncio
    } else {
      Musica.abaixar(true);
      await new Promise((fim) => {
        const fonte = ctxVoz.createBufferSource();
        fonte.buffer = t.buffer;
        fonte.connect(ctxVoz.destination);
        let terminou = false;
        let limite = null;
        // ao terminar (ou se o aparelho travar o som) o áudio é sempre parado, para não sobrar som tocando
        const acabar = () => { if (terminou) return; terminou = true; clearTimeout(limite); try { fonte.stop(); } catch (e) {} fim(); };
        fonte.onended = acabar;
        meu.parar = acabar;
        fonte.start(0, t.inicio, t.fim - t.inicio);
        limite = setTimeout(acabar, (t.fim - t.inicio) * 1000 + 1500);
      });
    }
    if (tocandoAgora === meu) { tocandoAgora = null; Musica.abaixar(false); }
  }

  const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
  // espera a fala atual acabar (sem cortar), para os recados importantes não se perderem
  async function esperarSilencio() {
    for (let k = 0; tocandoAgora && k < 100; k++) await esperar(100);
  }

  // Voz do aparelho (botão de ouvir a palavra): também respeita a regra de um áudio por vez
  async function falarSeLivre(texto) {
    if (!pref.voz || tocandoAgora) return;
    const meu = { parar: () => speechSynthesis.cancel() };
    tocandoAgora = meu;
    Musica.abaixar(true);
    await falarTexto(texto);
    if (tocandoAgora === meu) { tocandoAgora = null; Musica.abaixar(false); }
  }

  function falarTexto(texto) {
    return new Promise((fim) => {
      if (!('speechSynthesis' in window) || !pref.voz) return fim();
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = 'pt-BR';
      u.rate = 0.85;
      u.pitch = 1.2;
      const voz = speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith('pt-BR'));
      if (voz) u.voice = voz;
      u.onend = u.onerror = fim;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      setTimeout(fim, 8000);
    });
  }

  // ---------- Tia Ana animada ----------
  const ROTULO_ANA = { pensa: 'Tia Ana pensando', danca: 'Tia Ana dançando de alegria', triste: 'Tia Ana triste' };
  let timerAna = null;
  function anaEstado(estado, voltarEm) {
    const el = $('ana-sprite');
    el.className = `ana-sprite ${estado}`;
    el.setAttribute('aria-label', ROTULO_ANA[estado]);
    clearTimeout(timerAna);
    if (voltarEm) timerAna = setTimeout(() => anaEstado('pensa'), voltarEm);
  }

  // ---------- Botões de som ----------
  function atualizarBotoesSom() {
    $('btn-musica').setAttribute('aria-pressed', String(pref.musica));
    $('btn-som').setAttribute('aria-pressed', String(pref.voz));
    $('btn-musica').setAttribute('aria-label', pref.musica ? 'Desligar música' : 'Ligar música');
    $('btn-som').setAttribute('aria-label', pref.voz ? 'Desligar voz da Tia Ana' : 'Ligar voz da Tia Ana');
  }
  Musica.alternar(false);
  $('btn-musica').onclick = () => { pref.musica = !pref.musica; guardar(CHAVE_PREF, pref); Musica.alternar(pref.musica); atualizarBotoesSom(); };
  $('btn-som').onclick = () => { pref.voz = !pref.voz; guardar(CHAVE_PREF, pref); if (!pref.voz) calarAna(); atualizarBotoesSom(); };
  atualizarBotoesSom();
  const ligarMusica = () => { if (pref.musica) Musica.alternar(true); };

  // ---------- Nome ----------
  function telaNome() {
    $('campo-nome').value = nome;
    $('erro-nome').textContent = '';
    mostrar('tela-nome');
    $('campo-nome').focus();
  }

  $('form-nome').onsubmit = (e) => {
    e.preventDefault();
    const n = $('campo-nome').value.trim().replace(/\s+/g, ' ');
    if (n.length < 2) { $('erro-nome').textContent = 'Escreva o seu nome, por favor.'; return; }
    nome = n.toUpperCase();
    guardar(CHAVE_NOME, nome);
    telaInicio(true);
  };

  function telaInicio(tocarConvite) {
    if (!nome) return telaNome();
    $('nome-jogador').textContent = nome;
    mostrar('tela-inicio');
    if (tocarConvite) { ligarMusica(); falarAna('convite'); }
  }

  $('btn-trocar').onclick = () => { calarAna(); nome = ''; try { localStorage.removeItem(CHAVE_NOME); } catch (e) {} telaNome(); };

  // ---------- Partida ----------
  let jogo = null;

  const embaralhar = (lista) => {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  function novaPartida() {
    calarAna();
    jogo = {
      inicio: new Date(),
      tempoAtivo: 0,      // segundos já jogados
      marcoRelogio: 0,
      rodando: false,
      acabou: false,
      bloqueado: true,
      usadas: new Set(),
      palavras: [],       // registro de cada palavra para o relatório
      atual: null,
    };
    ligarMusica();
    mostrar('tela-jogo');
    proximaPalavra();
    atualizarRelogio();
    $('explicacao').hidden = false;
    $('btn-comecar').focus();
    falarAna('explicacao');
  }

  $('btn-jogar').onclick = novaPartida;
  $('btn-comecar').onclick = () => {
    calarAna();
    $('explicacao').hidden = true;
    jogo.bloqueado = false;
    jogo.atual.marco = performance.now();
    rodarRelogio(true);
  };

  function nivelAtual() {
    const feitas = jogo.palavras.filter((p) => p.completa).length;
    const maior = Math.max(...PALAVRAS.map((p) => p.silabas.length));
    return Math.min(maior, 2 + Math.floor(feitas / PALAVRAS_POR_NIVEL));
  }

  // Palavras vistas nas últimas partidas (por jogador), para não repetir sempre as mesmas
  const chaveVistas = () => `abc-ana:vistas:${nome.toLowerCase()}`;

  function escolherPalavra() {
    const nivel = nivelAtual();
    const vistas = ler(chaveVistas(), []);   // da mais antiga para a mais recente
    let opcoes = PALAVRAS.filter((p) => p.silabas.length === nivel && !jogo.usadas.has(p.silabas.join('')));
    if (!opcoes.length) opcoes = PALAVRAS.filter((p) => p.silabas.length === nivel);
    // prioridade: as que a criança nunca viu; depois as vistas há mais tempo
    const recencia = (p) => vistas.lastIndexOf(p.silabas.join(''));
    opcoes = embaralhar(opcoes).sort((a, b) => recencia(a) - recencia(b));
    const p = opcoes[Math.floor(Math.random() * Math.min(3, opcoes.length))];
    const chave = p.silabas.join('');
    jogo.usadas.add(chave);
    guardar(chaveVistas(), [...vistas.filter((v) => v !== chave), chave].slice(-PALAVRAS.length));
    return p;
  }

  // As 9 letras: as da palavra + letras parecidas que confundem + algumas outras
  function montarPecas(texto) {
    const daPalavra = [...new Set(texto)];
    const confusas = embaralhar(daPalavra.flatMap((l) => PARECIDAS[l] || []).filter((l) => !daPalavra.includes(l)));
    const pecas = [...daPalavra];
    for (const l of confusas) { if (pecas.length >= 9) break; if (!pecas.includes(l)) pecas.push(l); }
    for (const l of embaralhar([...'ABCDEFGILMNOPRSTUVJ'])) { if (pecas.length >= 9) break; if (!pecas.includes(l)) pecas.push(l); }
    return embaralhar(pecas.slice(0, 9));
  }

  // As 9 sílabas: as da palavra + sílabas parecidas (BA/DA/PA, BA/BO...) + algumas outras
  function montarSilabas(silabas) {
    const daPalavra = [...new Set(silabas)];
    const parecidas = embaralhar(daPalavra.flatMap((s) => {
      const [c, v] = [s.slice(0, -1), s.slice(-1)];
      return [...(PARECIDAS[c] || []).filter((x) => !'AEIOU'.includes(x)).map((x) => x + v),
              ...'AEIOU'.split('').filter((x) => x !== v).map((x) => c + x)];
    }).filter((s) => !daPalavra.includes(s) && !/^(Q|W)/.test(s)));
    const pecas = [...daPalavra];
    for (const s of parecidas) { if (pecas.length >= 9) break; if (!pecas.includes(s)) pecas.push(s); }
    while (pecas.length < 9) {
      const s = 'BCDFGJLMNPRSTV'[Math.floor(Math.random() * 14)] + 'AEIOU'[Math.floor(Math.random() * 5)];
      if (!pecas.includes(s)) pecas.push(s);
    }
    return embaralhar(pecas.slice(0, 9));
  }

  const corDe = (peca) => CORES_LETRAS[peca[0]];

  function proximaPalavra() {
    const p = escolherPalavra();
    const texto = p.silabas.join('');
    // uma palavra com letras, a outra com sílabas inteiras (BA · NA · NA), alternando
    const modo = jogo.palavras.length % 2 === 0 ? 'letras' : 'silabas';
    const unidades = modo === 'letras' ? [...texto] : [...p.silabas];
    const nomePeca = modo === 'letras' ? ['letra', 'letras'] : ['sílaba', 'sílabas'];
    const registro = { texto, silabas: p.silabas, modo, unidades, letras: [], erros: [], completa: false, marco: performance.now() };
    jogo.palavras.push(registro);
    jogo.atual = registro;
    // algumas peças já vêm prontas (ex.: C _ P O); no começo falta só uma
    const faltam = new Set(embaralhar(unidades.map((_, k) => k)).slice(0, quantasFaltam(unidades.length)));
    jogo.preenchidas = unidades.map((_, k) => !faltam.has(k));
    registro.faltam = faltam.size;

    $('figura').innerHTML = p.img ? `<img src="${p.img}" alt="${texto}" onerror="this.outerHTML='<span>${p.emoji}</span>'">` : `<span role="img" aria-label="${texto}">${p.emoji}</span>`;

    // casas da palavra, agrupadas por sílaba
    let i = 0;
    const casa = (u) => {
      const html = jogo.preenchidas[i]
        ? `<span class="casa cheia dada" data-i="${i}" style="background:${corDe(u)}" aria-label="${u}">${u}</span>`
        : `<button class="casa" type="button" data-i="${i}" aria-label="Espaço ${i + 1} de ${unidades.length}, vazio"></button>`;
      i++;
      return html;
    };
    $('palavra').classList.remove('completa');
    $('palavra').classList.toggle('por-silaba', modo === 'silabas');
    $('palavra').innerHTML = p.silabas.map((s) => `<div class="silaba">${modo === 'letras' ? [...s].map(casa).join('') : casa(s)}</div>`).join('');
    ajustarCasas();

    const queFaltam = unidades.filter((_, k) => !jogo.preenchidas[k]);
    const pecas = modo === 'letras' ? montarPecas(queFaltam.join('')) : montarSilabas(queFaltam);
    $('letras').classList.toggle('por-silaba', modo === 'silabas');
    $('letras').innerHTML = pecas.map((u) =>
      `<button class="peca" type="button" data-letra="${u}" style="background:${corDe(u)}" aria-label="${nomePeca[0]} ${u}">${u}</button>`).join('');

    escolhida = null;
    anaEstado('pensa');
    avisar(faltam.size < unidades.length
      ? `Complete a palavra: ${faltam.size > 1 ? 'faltam' : 'falta'} ${faltam.size} ${nomePeca[faltam.size > 1 ? 1 : 0]}.`
      : `Nova palavra com ${unidades.length} ${nomePeca[1]}.`);
  }

  // Quantas letras a criança coloca: começa com 1, depois metade, depois a palavra inteira
  // (às vezes ainda vem uma palavra pela metade, para variar)
  function quantasFaltam(n) {
    const feitas = jogo.palavras.filter((p) => p.completa).length;
    if (feitas < 2) return 1;
    if (feitas < 4) return Math.ceil(n / 2);
    return Math.random() < 0.35 ? Math.ceil(n / 2) : n;
  }

  // tamanho das casas para caber a palavra inteira na largura da tela
  function ajustarCasas() {
    const area = $('palavra');
    const silabas = jogo?.atual?.silabas.length || 2;
    const porSilaba = jogo?.atual?.modo === 'silabas';
    // numa casa de sílaba cabem 2 letras: conta como 1,6 casa de letra
    const n = porSilaba ? silabas * 1.6 : (jogo?.atual?.texto.length || 4);
    const espacos = (silabas - 1) * 14 + (porSilaba ? 0 : (n - silabas) * 4) + 8;
    const largura = Math.min(area.clientWidth || window.innerWidth - 32, 720);
    const tamanho = Math.max(30, Math.min(80, Math.floor((largura - espacos) / n)));
    area.style.setProperty('--casa', `${tamanho}px`);
  }
  window.addEventListener('resize', ajustarCasas);

  function avisar(texto) { $('aviso').textContent = texto; }

  // ---------- Relógio ----------
  let tique = null;
  function rodarRelogio(ligar) {
    if (!jogo) return;
    if (ligar && !jogo.rodando && !jogo.acabou) {
      jogo.rodando = true;
      jogo.marcoRelogio = performance.now();
      clearInterval(tique);
      tique = setInterval(atualizarRelogio, 200);
    } else if (!ligar && jogo.rodando) {
      jogo.tempoAtivo += (performance.now() - jogo.marcoRelogio) / 1000;
      jogo.rodando = false;
      clearInterval(tique);
    }
  }

  function segundosJogados() {
    return jogo.tempoAtivo + (jogo.rodando ? (performance.now() - jogo.marcoRelogio) / 1000 : 0);
  }

  function atualizarRelogio() {
    if (!jogo) return;
    const resta = Math.max(0, DURACAO - segundosJogados());
    const s = Math.ceil(resta);
    $('relogio').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    $('relogio').classList.toggle('acabando', resta <= AVISO_FINAL);
    if (resta <= AVISO_FINAL && resta > 0 && !jogo.avisou && jogo.rodando) {
      jogo.avisou = true;
      avisar('Corre! Faltam 30 segundos!');
      esperarSilencio().then(() => { if (!jogo.acabou) falarAna('corre'); });
    }
    // com 1 minuto de jogo, a Tia Ana manda o recado dela também
    if (segundosJogados() >= RECADO_EM && !jogo.recadoMeio && jogo.rodando && resta > AVISO_FINAL) {
      jogo.recadoMeio = true;
      esperarSilencio().then(() => { if (!jogo.acabou) falarAna('fim'); });
    }
    $('trilho').style.width = `${(resta / DURACAO) * 100}%`;
    $('contador').textContent = `⭐ ${jogo.palavras.filter((p) => p.completa).length}`;
    if (resta <= 0 && !jogo.acabou) fimDaPartida();
  }

  // ---------- Arrastar e soltar (dedo, mouse ou caneta) ----------
  let escolhida = null;   // letra tocada (modo tocar-e-tocar, para quem tem dificuldade de arrastar)
  let arrasto = null;

  $('letras').addEventListener('pointerdown', (e) => {
    const peca = e.target.closest('.peca');
    if (!peca || !jogo || jogo.bloqueado) return;
    e.preventDefault();
    arrasto = { peca, x0: e.clientX, y0: e.clientY, fantasma: null, id: e.pointerId };
    peca.setPointerCapture(e.pointerId);
  });

  $('letras').addEventListener('pointermove', (e) => {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const dx = e.clientX - arrasto.x0, dy = e.clientY - arrasto.y0;
    if (!arrasto.fantasma && Math.hypot(dx, dy) > 10) {
      const f = arrasto.peca.cloneNode(true);
      f.classList.add('fantasma');
      f.removeAttribute('aria-label');
      document.body.appendChild(f);
      arrasto.fantasma = f;
      arrasto.peca.classList.add('arrastando');
      marcarEscolhida(null);
    }
    if (arrasto.fantasma) {
      arrasto.fantasma.style.left = `${e.clientX}px`;
      arrasto.fantasma.style.top = `${e.clientY}px`;
      const casa = casaPerto(e.clientX, e.clientY);
      document.querySelectorAll('.casa.alvo').forEach((c) => c !== casa && c.classList.remove('alvo'));
      if (casa) casa.classList.add('alvo');
    }
  });

  function soltar(e, cancelado) {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const { peca, fantasma } = arrasto;
    arrasto = null;
    document.querySelectorAll('.casa.alvo').forEach((c) => c.classList.remove('alvo'));
    if (!fantasma) {
      // foi só um toque: escolhe a letra e depois toca no espaço
      if (!cancelado) marcarEscolhida(escolhida === peca ? null : peca);
      return;
    }
    peca.classList.remove('arrastando');
    const casa = cancelado ? null : casaPerto(e.clientX, e.clientY);
    const certo = casa ? tentar(Number(casa.dataset.i), peca.dataset.letra) : false;
    if (certo) { fantasma.remove(); return; }
    // volta para o lugar
    const r = peca.getBoundingClientRect();
    fantasma.classList.add('voltando');
    fantasma.style.left = `${r.left + r.width / 2}px`;
    fantasma.style.top = `${r.top + r.height / 2}px`;
    setTimeout(() => fantasma.remove(), 260);
  }
  $('letras').addEventListener('pointerup', (e) => soltar(e, false));
  $('letras').addEventListener('pointercancel', (e) => soltar(e, true));

  // a casa vazia mais próxima do ponto (com uma margem generosa, para mãos com pouca precisão)
  function casaPerto(x, y) {
    let melhor = null, menor = Infinity;
    document.querySelectorAll('#palavra .casa').forEach((c) => {
      if (jogo.preenchidas[Number(c.dataset.i)]) return;
      const r = c.getBoundingClientRect();
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      const limite = Math.max(r.width, r.height) * 0.95;
      if (d < limite && d < menor) { menor = d; melhor = c; }
    });
    return melhor;
  }

  function marcarEscolhida(peca) {
    document.querySelectorAll('.peca.escolhida').forEach((p) => p.classList.remove('escolhida'));
    escolhida = peca;
    if (peca) { peca.classList.add('escolhida'); avisar(`Letra ${peca.dataset.letra} escolhida. Agora toque no espaço da palavra.`); }
  }

  // teclado: Enter/Espaço na letra escolhe; na casa, coloca
  $('letras').addEventListener('click', (e) => {
    const peca = e.target.closest('.peca');
    if (peca && e.detail === 0 && jogo && !jogo.bloqueado) marcarEscolhida(escolhida === peca ? null : peca);
  });
  $('palavra').addEventListener('click', (e) => {
    const casa = e.target.closest('.casa');
    if (!casa || !escolhida || !jogo || jogo.bloqueado) return;
    const peca = escolhida;
    if (tentar(Number(casa.dataset.i), peca.dataset.letra)) marcarEscolhida(null);
    else peca.focus();
  });

  // ---------- Conferir a letra ----------
  function tentar(i, letra) {
    const p = jogo.atual;
    if (jogo.bloqueado || jogo.preenchidas[i]) return false;
    const certa = p.unidades[i];
    const casa = document.querySelector(`#palavra .casa[data-i="${i}"]`);

    if (letra !== certa) {
      p.erros.push({ esperada: certa, colocada: letra });
      casa.classList.remove('errou');
      void casa.offsetWidth;
      casa.classList.add('errou');
      anaEstado('triste', 1800);
      avisar(`${letra} não é desse espaço. Tente outra.`);
      falarAna('erro');
      return false;
    }

    const agora = performance.now();
    const tempo = (agora - p.marco) / 1000;
    p.marco = agora;
    p.letras.push({ letra, tempo, erros: p.erros.filter((e) => e.esperada === letra && !e.contada).length });
    p.erros.forEach((e) => { if (e.esperada === letra) e.contada = true; });

    jogo.preenchidas[i] = true;
    casa.textContent = letra;
    casa.style.background = corDe(letra);
    casa.classList.remove('errou');
    casa.classList.add('cheia');
    casa.setAttribute('aria-label', `Espaço ${i + 1}: ${letra}`);

    if (jogo.preenchidas.every(Boolean)) {
      palavraCompleta();
    } else {
      anaEstado('danca', 1500);
      avisar(`Muito bem! ${letra}.`);
      falarAna('acerto');
    }
    return true;
  }

  async function palavraCompleta() {
    const p = jogo.atual;
    p.completa = true;
    jogo.bloqueado = true;
    rodarRelogio(false);       // o tempo para enquanto a Tia Ana comemora
    atualizarRelogio();
    $('palavra').classList.add('completa');
    anaEstado('danca');
    avisar(`Parabéns! Você montou a palavra ${p.texto}.`);
    await Promise.all([falarAna('acerto'), esperar(1500)]);
    if (!jogo || jogo.acabou) return;
    // "mudar de palavra" só a cada 3 palavras, para não ficar repetitivo
    if (jogo.palavras.filter((x) => x.completa).length % MUDAR_A_CADA === 0) {
      await esperarSilencio();
      await falarAna('mudar');
    }
    if (!jogo || jogo.acabou) return;
    proximaPalavra();
    jogo.bloqueado = false;
    jogo.atual.marco = performance.now();
    rodarRelogio(true);
  }

  $('btn-ouvir').onclick = () => { if (jogo?.atual) falarSeLivre(jogo.atual.texto.toLowerCase()); };

  // ---------- Fim e relatório ----------
  async function fimDaPartida() {
    jogo.acabou = true;
    jogo.bloqueado = true;
    rodarRelogio(false);
    $('explicacao').hidden = true;
    document.querySelectorAll('.fantasma').forEach((f) => f.remove());
    arrasto = null;
    const r = calcularRelatorio();
    salvarHistorico(r);
    mostrarRelatorio(r);
    esperarSilencio().then(() => falarAna('fim'));
  }

  const classe = (s) => (s <= OTIMO ? 'otimo' : s <= REGULAR ? 'regular' : 'treinar');
  const NOME_CLASSE = { otimo: 'Ótimo', regular: 'Regular', treinar: 'Precisa treinar mais' };
  const COR_CLASSE = { otimo: '#2e7d32', regular: '#b45309', treinar: '#c62828' };
  const fmt = (n) => n.toFixed(1).replace('.', ',');

  function calcularRelatorio() {
    const palavras = jogo.palavras.filter((p) => p.letras.length || p.erros.length);
    const letras = palavras.flatMap((p) => p.letras);
    const erros = palavras.flatMap((p) => p.erros);
    const media = letras.length ? letras.reduce((s, l) => s + l.tempo, 0) / letras.length : 0;

    // por letra: tempo médio e erros
    const porLetra = {};
    letras.forEach((l) => { (porLetra[l.letra] ??= { letra: l.letra, tempos: [], erros: 0 }).tempos.push(l.tempo); });
    erros.forEach((e) => { (porLetra[e.esperada] ??= { letra: e.esperada, tempos: [], erros: 0 }).erros++; });
    const listaLetras = Object.values(porLetra).map((x) => ({
      letra: x.letra, erros: x.erros, vezes: x.tempos.length,
      media: x.tempos.length ? x.tempos.reduce((a, b) => a + b, 0) / x.tempos.length : 0,
    })).sort((a, b) => (b.erros - a.erros) || (b.media - a.media));

    // trocas: qual letra foi colocada no lugar de qual
    const trocas = {};
    erros.forEach((e) => { const k = `${e.colocada}→${e.esperada}`; trocas[k] = (trocas[k] || 0) + 1; });
    const listaTrocas = Object.entries(trocas).sort((a, b) => b[1] - a[1]);

    const porPalavra = palavras.map((p) => {
      const total = p.letras.reduce((s, l) => s + l.tempo, 0);
      const m = p.letras.length ? total / p.letras.length : 0;
      return { texto: p.texto, completa: p.completa, faltam: p.faltam, letras: p.letras.length, total, media: m, erros: p.erros.length, classe: classe(m) };
    });

    const primeira = letras.filter((l) => l.erros === 0).length;
    const dificuldades = [];
    listaTrocas.slice(0, 4).forEach(([k, n]) => {
      const [colocou, era] = k.split('→');
      dificuldades.push(`Colocou <b>${colocou}</b> no lugar de <b>${era}</b> (${n} ${n > 1 ? 'vezes' : 'vez'}).`);
    });
    const lentas = listaLetras.filter((l) => l.vezes && l.media > REGULAR).sort((a, b) => b.media - a.media).slice(0, 5);
    if (lentas.length) dificuldades.push(`Demorou para achar: ${lentas.map((l) => `<b>${l.letra}</b> (${fmt(l.media)} s)`).join(', ')}.`);
    porPalavra.filter((p) => p.classe === 'treinar' && p.completa).forEach((p) =>
      dificuldades.push(`Palavra <b>${p.texto}</b>: ${fmt(p.media)} s por peça, precisa treinar mais.`));
    const incompleta = porPalavra.find((p) => !p.completa);
    if (incompleta) dificuldades.push(`O tempo acabou durante a palavra <b>${incompleta.texto}</b> (${incompleta.letras} de ${incompleta.faltam} letras).`);
    if (!dificuldades.length) dificuldades.push('Nenhuma dificuldade forte nesta partida. Continue praticando!');

    return {
      nome, data: jogo.inicio, media, classe: classe(media), letras: letras.length, erros: erros.length,
      completas: porPalavra.filter((p) => p.completa).length,
      primeira: letras.length ? Math.round((primeira / letras.length) * 100) : 0,
      porPalavra, listaLetras, dificuldades, maiorSilaba: Math.max(2, ...palavras.filter((p) => p.completa).map((p) => p.silabas.length)),
    };
  }

  function chaveHistorico() { return CHAVE_HIST + nome.toLowerCase(); }
  function salvarHistorico(r) {
    if (!r.letras) return;
    const h = ler(chaveHistorico(), []);
    h.push({ data: r.data.toISOString(), media: r.media, completas: r.completas, erros: r.erros });
    guardar(chaveHistorico(), h.slice(-20));
  }

  let ultimo = null;
  function mostrarRelatorio(r) {
    ultimo = r;
    $('dica-envio').hidden = true;
    mostrar('tela-relatorio');
    $('fim-nome').textContent = nome;
    $('ana-fim').className = `ana-sprite grande ${r.classe === 'treinar' ? 'pensa' : 'danca'}`;
    $('fim-resumo').innerHTML = r.completas
      ? `Você montou <b>${r.completas}</b> ${r.completas > 1 ? 'palavras' : 'palavra'}! ⭐`
      : 'Você treinou bastante! Vamos tentar de novo?';
    $('relatorio-info').textContent = `${nome} · ${r.data.toLocaleDateString('pt-BR')} às ${r.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · partida de 2 minutos`;

    $('selo').className = `selo ${r.classe}`;
    $('selo').innerHTML = r.letras
      ? `${NOME_CLASSE[r.classe]}<small>média de ${fmt(r.media)} s por peça</small>`
      : 'Sem letras colocadas<small>a partida terminou antes da primeira letra</small>';

    $('numeros').innerHTML = [
      ['Palavras montadas', r.completas],
      ['Peças colocadas', r.letras],
      ['Erros', r.erros],
      ['Certas de primeira', `${r.primeira}%`],
    ].map(([t, v]) => `<div class="numero"><b>${v}</b>${t}</div>`).join('');

    $('dificuldades').innerHTML = r.dificuldades.map((d) => `<li>${d}</li>`).join('');

    graficoPalavras($('grafico-palavras'), r);
    graficoLetras($('grafico-letras'), r);
    const h = ler(chaveHistorico(), []);
    $('evolucao-area').hidden = h.length < 2;
    if (h.length >= 2) graficoEvolucao($('grafico-evolucao'), h);
  }

  // ---------- Gráficos (desenhados no canvas, também vão para o PDF) ----------
  function eixo(ctx, W, H, m, maxV, passo, sufixo) {
    ctx.font = '22px Andika, Verdana, sans-serif';
    ctx.fillStyle = '#5b4763';
    ctx.strokeStyle = '#eadbe3';
    ctx.lineWidth = 2;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= maxV + 0.001; v += passo) {
      const y = H - m.b - (v / maxV) * (H - m.t - m.b);
      ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(W - m.r, y); ctx.stroke();
      ctx.fillText(`${Math.round(v * 10) / 10}${sufixo}`, m.l - 10, y);
    }
  }

  function graficoPalavras(cv, r) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, m = { l: 70, r: 20, t: 30, b: 80 };
    ctx.clearRect(0, 0, W, H);
    const itens = r.porPalavra.filter((p) => p.letras);
    if (!itens.length) { semDados(ctx, W, H); return; }
    const maxV = Math.max(REGULAR + 2, Math.ceil(Math.max(...itens.map((p) => p.media)) + 1));
    eixo(ctx, W, H, m, maxV, maxV > 12 ? 4 : 2, ' s');
    // linhas de referência 2 s e 4 s
    [[OTIMO, COR_CLASSE.otimo], [REGULAR, COR_CLASSE.regular]].forEach(([v, cor]) => {
      const y = H - m.b - (v / maxV) * (H - m.t - m.b);
      ctx.setLineDash([10, 8]); ctx.strokeStyle = cor; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(W - m.r, y); ctx.stroke(); ctx.setLineDash([]);
    });
    const largura = (W - m.l - m.r) / itens.length;
    const barra = Math.min(90, largura * 0.62);
    itens.forEach((p, i) => {
      const x = m.l + largura * i + (largura - barra) / 2;
      const h = (p.media / maxV) * (H - m.t - m.b);
      ctx.fillStyle = COR_CLASSE[p.classe];
      ctx.fillRect(x, H - m.b - h, barra, h);
      ctx.fillStyle = '#2d1b33';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.font = 'bold 22px Andika, Verdana, sans-serif';
      ctx.fillText(`${fmt(p.media)}s`, x + barra / 2, H - m.b - h - 4);
      ctx.textBaseline = 'top';
      ctx.font = `bold ${itens.length > 7 ? 16 : 20}px Andika, Verdana, sans-serif`;
      ctx.fillText(p.texto + (p.completa ? '' : '…'), x + barra / 2, H - m.b + 10);
      ctx.font = '17px Andika, Verdana, sans-serif';
      ctx.fillStyle = '#5b4763';
      ctx.fillText(`${p.letras} peças · ${Math.round(p.total)}s`, x + barra / 2, H - m.b + 38);
    });
  }

  function graficoLetras(cv, r) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, m = { l: 70, r: 20, t: 40, b: 60 };
    ctx.clearRect(0, 0, W, H);
    const itens = r.listaLetras.filter((l) => l.erros || l.media > OTIMO).slice(0, 10);
    if (!itens.length) { semDados(ctx, W, H, 'Nenhuma letra com dificuldade! 🎉'); return; }
    const maxV = Math.max(REGULAR + 2, Math.ceil(Math.max(...itens.map((l) => l.media)) + 1));
    eixo(ctx, W, H, m, maxV, maxV > 12 ? 4 : 2, ' s');
    const largura = (W - m.l - m.r) / itens.length;
    const barra = Math.min(70, largura * 0.6);
    itens.forEach((l, i) => {
      const x = m.l + largura * i + (largura - barra) / 2;
      const h = (l.media / maxV) * (H - m.t - m.b);
      ctx.fillStyle = l.vezes ? COR_CLASSE[classe(l.media)] : '#9e9e9e';
      ctx.fillRect(x, H - m.b - h, barra, Math.max(h, 3));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#c62828';
      ctx.font = 'bold 22px Andika, Verdana, sans-serif';
      if (l.erros) ctx.fillText(`✗${l.erros}`, x + barra / 2, H - m.b - h - 4);
      ctx.textBaseline = 'top';
      ctx.fillStyle = CORES_LETRAS[l.letra] || '#2d1b33';
      ctx.font = 'bold 34px Andika, Verdana, sans-serif';
      ctx.fillText(l.letra, x + barra / 2, H - m.b + 10);
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#5b4763';
    ctx.font = '19px Andika, Verdana, sans-serif';
    ctx.fillText('barra = tempo médio para achar a peça · ✗ = erros naquela peça', m.l, 6);
  }

  function graficoEvolucao(cv, h) {
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, m = { l: 70, r: 30, t: 30, b: 50 };
    ctx.clearRect(0, 0, W, H);
    const maxV = Math.max(REGULAR + 2, Math.ceil(Math.max(...h.map((x) => x.media)) + 1));
    eixo(ctx, W, H, m, maxV, maxV > 12 ? 4 : 2, ' s');
    const px = (i) => m.l + (h.length === 1 ? 0 : (i / (h.length - 1)) * (W - m.l - m.r));
    const py = (v) => H - m.b - (v / maxV) * (H - m.t - m.b);
    ctx.strokeStyle = '#1f4fa8'; ctx.lineWidth = 4;
    ctx.beginPath();
    h.forEach((x, i) => (i ? ctx.lineTo(px(i), py(x.media)) : ctx.moveTo(px(i), py(x.media))));
    ctx.stroke();
    h.forEach((x, i) => {
      ctx.fillStyle = COR_CLASSE[classe(x.media)];
      ctx.beginPath(); ctx.arc(px(i), py(x.media), 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5b4763'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.font = '17px Andika, Verdana, sans-serif';
      const d = new Date(x.data);
      ctx.fillText(`${d.getDate()}/${d.getMonth() + 1}`, px(i), H - m.b + 12);
    });
  }

  function semDados(ctx, W, H, texto = 'Ainda sem dados nesta partida.') {
    ctx.fillStyle = '#5b4763';
    ctx.font = '28px Andika, Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, W / 2, H / 2);
  }

  // ---------- PDF e compartilhar ----------
  const limpar = (html) => html.replace(/<[^>]+>/g, '');

  function textoResumo(r) {
    return [
      `📋 ABC da Tia ANA - relatório de ${r.nome}`,
      `${r.data.toLocaleDateString('pt-BR')} - partida de 2 minutos`,
      `Resultado: ${NOME_CLASSE[r.classe]} (${fmt(r.media)} s por peça)`,
      `Palavras montadas: ${r.completas} · Letras: ${r.letras} · Erros: ${r.erros} · Certas de primeira: ${r.primeira}%`,
      `Palavras: ${r.porPalavra.map((p) => `${p.texto} ${fmt(p.media)}s`).join(', ') || '-'}`,
      'Dificuldades:',
      ...r.dificuldades.map((d) => `• ${limpar(d)}`),
    ].join('\n');
  }

  function gerarPDF(r) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const L = 15, Wp = 180;
    let y = 18;
    doc.setFillColor(194, 24, 91);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('ABC da Tia ANA - Relatório', L, 14);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${r.nome}  ·  ${r.data.toLocaleDateString('pt-BR')} ${r.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}  ·  partida de 2 minutos`, L, 23);
    y = 40;
    const cor = { otimo: [46, 125, 50], regular: [180, 83, 9], treinar: [198, 40, 40] }[r.classe];
    doc.setFillColor(...cor);
    doc.roundedRect(L, y, Wp, 16, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(`${NOME_CLASSE[r.classe]}: média de ${fmt(r.media)} s por peça`, L + 5, y + 10.5);
    y += 24;
    doc.setTextColor(45, 27, 51);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Palavras montadas: ${r.completas}    Peças colocadas: ${r.letras}    Erros: ${r.erros}    Certas de primeira: ${r.primeira}%`, L, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(91, 71, 99);
    doc.text(`Critério: até ${OTIMO} s por peça = ótimo · até ${REGULAR} s = regular · mais que isso = treinar mais`, L, y);
    y += 8;

    const imagem = (cv, titulo) => {
      const h = (cv.height / cv.width) * Wp;
      if (y + h + 10 > 285) { doc.addPage(); y = 18; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(31, 79, 168);
      doc.text(titulo, L, y); y += 3;
      doc.addImage(cv.toDataURL('image/png'), 'PNG', L, y, Wp, h, undefined, 'FAST');
      y += h + 8;
    };
    imagem($('grafico-palavras'), 'Tempo por peça (letra ou sílaba) em cada palavra');
    imagem($('grafico-letras'), 'Letras e sílabas com mais dificuldade');

    if (y > 250) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(31, 79, 168);
    doc.text('Principais dificuldades', L, y); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(45, 27, 51);
    r.dificuldades.forEach((d) => {
      const linhas = doc.splitTextToSize(`• ${limpar(d)}`, Wp);
      if (y + linhas.length * 5.5 > 285) { doc.addPage(); y = 18; }
      doc.text(linhas, L, y); y += linhas.length * 5.5 + 1;
    });

    y += 4;
    if (y > 250) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(31, 79, 168);
    doc.text('Palavra por palavra', L, y); y += 7;
    doc.setFontSize(10); doc.setTextColor(45, 27, 51);
    doc.text('Palavra', L, y); doc.text('Letras', L + 55, y); doc.text('Tempo total', L + 80, y); doc.text('Por letra', L + 112, y); doc.text('Erros', L + 140, y); doc.text('Resultado', L + 157, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    r.porPalavra.forEach((p) => {
      if (y > 285) { doc.addPage(); y = 18; }
      doc.text(p.texto + (p.completa ? '' : ' (incompleta)'), L, y);
      doc.text(`${p.letras}/${p.faltam}`, L + 55, y);
      doc.text(`${fmt(p.total)} s`, L + 80, y);
      doc.text(`${fmt(p.media)} s`, L + 112, y);
      doc.text(String(p.erros), L + 140, y);
      doc.text(p.letras ? NOME_CLASSE[p.classe] : '-', L + 157, y);
      y += 5.5;
    });

    const h = ler(chaveHistorico(), []);
    if (h.length >= 2) imagem($('grafico-evolucao'), 'Evolução nas últimas partidas (segundos por peça)');

    const paginas = doc.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
      doc.setPage(i);
      doc.setFontSize(9); doc.setTextColor(120, 100, 130);
      doc.text('ABC da Tia ANA  ·  © Marco Nunes - Todos os direitos reservados', L, 292);
    }
    return doc;
  }

  const nomeArquivo = (r) => `relatorio-abc-${r.nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}-${r.data.toISOString().slice(0, 10)}.pdf`;

  $('btn-pdf').onclick = () => { if (ultimo) gerarPDF(ultimo).save(nomeArquivo(ultimo)); };

  $('btn-compartilhar').onclick = async () => {
    if (!ultimo) return;
    const doc = gerarPDF(ultimo);
    const arquivo = new File([doc.output('blob')], nomeArquivo(ultimo), { type: 'application/pdf' });
    const texto = `Oi Tia Ana, segue o relatório de ${ultimo.nome}`;
    if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo], title: `Relatório de ${ultimo.nome}`, text: texto });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    // Sem compartilhar arquivos (computador): baixa o PDF e abre o WhatsApp com o resumo
    $('dica-envio').hidden = false;
    $('dica-envio').innerHTML = 'O PDF foi baixado e a conversa da Tia Ana abriu no WhatsApp. <b>Arraste o PDF para a conversa</b> (ou toque no clipe 📎) e envie.';
    doc.save(nomeArquivo(ultimo));
    window.open(`https://wa.me/${TELEFONE_ANA}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  };

  $('btn-de-novo').onclick = novaPartida;
  $('btn-sair').onclick = () => { calarAna(); telaInicio(false); };

  // ---------- Instalar como app ----------
  let pedidoInstalacao = null;
  const rodandoComoApp = () => matchMedia('(display-mode: standalone)').matches
    || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pedidoInstalacao = e;
    $('btn-instalar').hidden = false;
  });
  window.addEventListener('appinstalled', () => { pedidoInstalacao = null; $('btn-instalar').hidden = true; });
  if (!rodandoComoApp()) $('btn-instalar').hidden = false;

  $('btn-instalar').onclick = async () => {
    if (pedidoInstalacao) {
      pedidoInstalacao.prompt();
      const { outcome } = await pedidoInstalacao.userChoice;
      pedidoInstalacao = null;
      if (outcome === 'accepted') $('btn-instalar').hidden = true;
      return;
    }
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const dentroDeApp = /FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(ua);
    const passos = ios
      ? ['Abra este link no <b>Safari</b>.', 'Toque em <b>Compartilhar</b> (quadrado com a seta ⬆).', 'Escolha <b>Adicionar à Tela de Início</b>.', 'Abra pelo <b>ícone do jogo</b>.']
      : ['Abra este link no <b>Google Chrome</b> (não dentro do WhatsApp ou Instagram).', 'Toque em <b>⋮</b> no canto de cima.', 'Toque em <b>Instalar app</b> (ou <b>Adicionar à tela inicial → Instalar</b>).', 'Abra pelo <b>ícone do jogo</b> na tela do celular.'];
    if (dentroDeApp) passos.unshift('⚠ Você abriu pelo navegador de outro app, que não instala jogos. Toque em <b>⋮ → Abrir no navegador</b>.');
    $('passos-instalar').innerHTML = passos.map((p) => `<li>${p}</li>`).join('');
    mostrar('tela-instalar');
  };
  $('btn-fechar-instalar').onclick = () => telaInicio(false);

  // começa pedindo o nome; se já tem nome salvo, vai para o início
  if (nome) telaInicio(false); else telaNome();

  // atalho para testes no console
  window.__abc = { get jogo() { return jogo; }, fimDaPartida: () => jogo && fimDaPartida(), tentar: (i, l) => tentar(i, l) };
})();
