'use strict';
/* BorcumBorç - ses ve titreşim.
   Sesler dosya değil, Web Audio ile üretilir (çevrimdışı, sıfır boyut): sıcak marimba/kalimba tınısı,
   do majör pentatonik gam, kısa yankı. Kullanım: BBSound.play('success')  ->  ses + titreşim birlikte, ayarlara göre.
   Bölümler: 1 ses ailesi, 2 olay tablosu, 3 zarf/zincir sabitleri, ardından createSound (motor). */
(function (root) {
  /* ====================================================================================
     1) SES AİLESİ
     Tek tını (yumuşak marimba/kalimba), tek gam (do majör pentatonik: do, re, mi, sol, la).
     Hiçbir olay gam dışı nota çalmaz; bu yüzden üst üste binen sesler bile uyumlu kalır.
     Ana notalar 300-900 Hz bandında; tüm ses zinciri 2,4 kHz üstünü keser (tiz, sert enerji yok).
     ==================================================================================== */
  const HZ = { // eşit tamperaman frekansları (Hz)
    C4: 261.63, E4: 329.63, G4: 392.0, A4: 440.0,
    C5: 523.25, D5: 587.33, E5: 659.26, G5: 783.99, A5: 880.0, C6: 1046.5
  };

  // Harmonik genlikleri (indeks 0 = DC). 'soft': sinüs + zayıf 2. ve 4. harmonik (marimba çubuğu gibi yuvarlak, tahta tını).
  // 'glass': sinüs + hafif 2. ve 3. harmonik (cam çan: biraz daha parlak, yine yumuşak).
  const WAVES = { soft: [0, 1, 0.16, 0.03, 0.06], glass: [0, 1, 0.30, 0.08, 0.02] };

  /* ====================================================================================
     2) OLAY TABLOSU
     rel   : göreli şiddet (son genlik = (seviye/100)^2 x rel x 0,8)
     wet   : yankı (reverb) gönderim oranı; sık duyulan sesler kuru, ödül sesleri daha ferah
     lp    : sesin oturduğu süzgeç frekansı (Hz); saldırıda daha parlak başlayıp buna iner
     vib   : titreşim kalıbı (ms: aç, kapa, aç...)
     notes : { type, f0, f1 (isteğe bağlı kayma), at (sn), dur (sn), g (nota seviyesi, varsayılan 1) }
     Tasarım kuralı: sık tekrarlanan sesler (tap, nav) en kısa, en alçak ve en kısık olanlardır;
     uzun ve zengin sesler yalnızca anlamlı olaylarda (başarı, onay, ödeme, açılış) çalar.
     ==================================================================================== */
  const SOUND_EVENTS = {
    // Dokunma: kısacık, alçak "tahta tık"; yankısız (en sık duyulan ses, yormamalı)
    tap:     { rel: 0.55, wet: 0.06, lp: 1500, vib: [10],                 notes: [{ type: 'soft', f0: HZ.E4, at: 0, dur: 0.10 }] },
    // Gezinme: dokunmadan bir tık yukarıda, aynı kısalıkta
    nav:     { rel: 0.52, wet: 0.08, lp: 1700, vib: [8],                  notes: [{ type: 'soft', f0: HZ.G4, at: 0, dur: 0.11 }] },
    // Menü açma: sol -> re (yukarı beşli), hafif havadar
    menu:    { rel: 0.36, wet: 0.22, lp: 1800, vib: [8],                  notes: [{ type: 'soft', f0: HZ.G4, at: 0, dur: 0.12, g: 0.8 }, { type: 'soft', f0: HZ.D5, at: 0.055, dur: 0.20 }] },
    // Başarı: do -> sol, kısa ve tatmin edici yükseliş
    success: { rel: 0.44, wet: 0.26, lp: 1800, vib: [25, 40, 25],         notes: [{ type: 'soft', f0: HZ.C5, at: 0, dur: 0.20, g: 0.85 }, { type: 'soft', f0: HZ.G5, at: 0.075, dur: 0.50 }] },
    // Onay: do-mi-sol arpeji; son nota uzar ve çınlar
    confirm: { rel: 0.40, wet: 0.30, lp: 1900, vib: [30, 50, 30, 50, 70], notes: [{ type: 'soft', f0: HZ.C5, at: 0, dur: 0.20, g: 0.8 }, { type: 'soft', f0: HZ.E5, at: 0.085, dur: 0.22, g: 0.9 }, { type: 'soft', f0: HZ.G5, at: 0.17, dur: 0.75 }] },
    // Hata: sert değil; alçak, nazik, inen iki nota (sol -> mi), daha koyu süzgeç
    error:   { rel: 0.50, wet: 0.14, lp: 1100, vib: [70, 50, 70],         notes: [{ type: 'soft', f0: HZ.G4, at: 0, dur: 0.20 }, { type: 'soft', f0: HZ.E4, at: 0.13, dur: 0.36, g: 0.9 }] },
    // Kopyalama: iki kısacık nota, "hazır" duygusu
    copy:    { rel: 0.34, wet: 0.10, lp: 1900, vib: [15],                 notes: [{ type: 'soft', f0: HZ.E5, at: 0, dur: 0.07, g: 0.8 }, { type: 'soft', f0: HZ.G5, at: 0.055, dur: 0.12 }] },
    // Ödeme: cam çan, mi -> la; değerli, temiz, biraz daha uzun yankı
    pay:     { rel: 0.40, wet: 0.34, lp: 2000, vib: [20, 40, 50],         notes: [{ type: 'glass', f0: HZ.E5, at: 0, dur: 0.28, g: 0.85 }, { type: 'glass', f0: HZ.A5, at: 0.09, dur: 0.65 }] },
    // Silme: tek, alçalan yumuşak nota (sol -> do); yankısız, karanlık süzgeç
    del:     { rel: 0.70, wet: 0.05, lp: 900,  vib: [90],                 notes: [{ type: 'soft', f0: HZ.G4, f1: HZ.C4, at: 0, dur: 0.22 }] },
    // Açılış: yükselen do-mi-sol akoru (iki B'nin buluştuğu ~0,9 sn'de başlar) + parıltı halkasında kısa cam parıltısı
    intro:   { rel: 0.55, wet: 0.42, lp: 1900, vib: null,                 notes: [
      { type: 'soft', f0: HZ.C5, at: 0.88, dur: 1.5, g: 0.75 },
      { type: 'soft', f0: HZ.E5, at: 1.00, dur: 1.4, g: 0.65 },
      { type: 'soft', f0: HZ.G5, at: 1.12, dur: 1.3, g: 0.60 },
      { type: 'glass', f0: HZ.C6, at: 1.30, dur: 0.70, g: 0.30 }] },
    // Pencere/iletişim kutusu: tek yumuşak la
    dialog:  { rel: 0.55, wet: 0.14, lp: 1600, vib: [15],                 notes: [{ type: 'soft', f0: HZ.A4, at: 0, dur: 0.13 }] }
  };

  /* ====================================================================================
     3) ZARF, ZİNCİR VE YANKI SABİTLERİ
     ==================================================================================== */
  const ATTACK_S = 0.007;       // 7 ms'de yükselir: tık/patlama yok
  const KNOCK_AT = 0.07;        // marimba "vuruş" bölümü: ilk 70 ms'de seviye %45'e düşer, sonra uzun sönüm
  const KNOCK_LEVEL = 0.45;
  const MASTER_GAIN = 0.8;      // ana seviye (sınırlayıcıdan önce)
  const MASTER_LP_HZ = 2200;    // son süzgeç: 2,4 kHz üstü kesilir
  const REVERB_SECONDS = 1.1;   // kısa oda yankısı
  const REVERB_WET = 0.55;      // yankı dönüş seviyesi (olay başına 'wet' ile çarpılır)
  const MIN_GAP_MS = 40;        // aynı sesin tekrarı arasındaki en az süre
  const CUT_TAU_S = 0.012;      // yeni ses eskisini bu zaman sabitiyle yumuşakça keser

  // Genlik = (seviye/100)^2 x göreli şiddet x 0,8. Seviye 0 ise ses yok.
  function amplitude(level, rel) {
    const l = Math.max(0, Math.min(100, Number(level) || 0)) / 100;
    return l * l * rel * 0.8;
  }

  // Yankı için sentezlenmiş dürtü yanıtı: üstel sönen, zamanla kararan (alçak geçiren) gürültü.
  // Rastgelelik sabit tohumludur: her cihazda aynı oda sesi.
  function makeImpulse(ctx, seconds) {
    const rate = ctx.sampleRate || 44100, len = Math.floor(rate * seconds), pre = Math.floor(rate * 0.012);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let seed = 1234567 + ch * 7919, lp = 0;
      for (let i = pre; i < len; i++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const noise = seed / 2147483648 - 1;
        const t = (i - pre) / rate;
        lp += (noise - lp) * Math.max(0.06, 0.55 - t * 0.5);          // karardıkça daha yumuşak
        d[i] = lp * Math.exp(-6.2 * t / seconds) * Math.min(1, t * 120); // 8 ms'lik giriş: dürtüde tık yok
      }
    }
    return buf;
  }

  // env: test için dışarıdan verilebilir {AudioContext, navigator, plugins, now}
  function createSound(env) {
    env = env || {};
    let cfg = { sound: true, volume: 70, haptic: true }; // app.js kendi ayar nesnesini verir (aynı nesne)
    let ctx = null, active = null, pendingTap = null; // active = { bus, name, until }
    const last = {};
    const clock = env.now || (() => Date.now());

    const Ctor = () => env.AudioContext || (root.AudioContext || root.webkitAudioContext);
    const nav = () => env.navigator || root.navigator;
    const plugins = () => env.plugins || (root.Capacitor && root.Capacitor.Plugins) || {};

    function setConfig(c) { cfg = c; }

    // AudioContext ilk kullanıcı hareketinde (ya da yerel uygulamada hemen) açılır.
    function ensureCtx() {
      if (ctx) return ctx;
      try { const C = Ctor(); if (C) ctx = new C(); } catch (e) { ctx = null; }
      return ctx;
    }
    function resume() {
      if (!ctx) return;
      if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
        try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* sessiz geç */ }
      }
    }
    function unlock() { ensureCtx(); resume(); }
    const running = () => !!ctx && ctx.state === 'running';

    // Titreşim: önce Capacitor Haptics (varsa), yoksa navigator.vibrate. Ayar kapalıysa hiçbiri.
    function vibrate(pattern) {
      if (!cfg.haptic || !pattern || !pattern.length) return;
      try {
        const H = plugins().Haptics;
        if (H && typeof H.vibrate === 'function') {
          let delay = 0;
          pattern.forEach((ms, i) => {
            if (i % 2 === 0) { // çift sıradakiler "aç", tek sıradakiler "bekle"
              const go = () => { try { Promise.resolve(H.vibrate({ duration: ms })).catch(() => {}); } catch (e) { /* yoksay */ } };
              if (delay === 0) go(); else setTimeout(go, delay);
            }
            delay += ms;
          });
          return;
        }
        const n = nav();
        // Kullanıcı henüz dokunmadıysa tarayıcı vibrate'i engeller ve konsola uyarı yazar; hiç denemeyelim.
        if (n && typeof n.vibrate === 'function' && (!n.userActivation || n.userActivation.hasBeenActive)) n.vibrate(pattern);
      } catch (e) { /* titreşim yoksa sessizce geç */ }
    }

    // Harmonik dalgalar bağlam başına bir kez üretilir; PeriodicWave desteklenmiyorsa sade sinüse düşer.
    const waves = {};
    function wave(name) {
      if (!WAVES[name] || !ctx || typeof ctx.createPeriodicWave !== 'function') return null;
      if (!waves[name]) {
        try {
          const re = new Float32Array(WAVES[name].length), im = Float32Array.from(WAVES[name]);
          waves[name] = ctx.createPeriodicWave(re, im);
        } catch (e) { waves[name] = null; }
      }
      return waves[name];
    }

    // Ortak ses zinciri (bağlam başına bir kez): [olay veri yolları] -> ana kazanç -> 2,4 kHz süzgeç -> yumuşak sınırlayıcı -> çıkış.
    // Yankı kolu: gönderim -> ConvolverNode -> yankı dönüşü -> ana kazanç. Desteklenmeyen düğüm varsa o parça atlanır (ses yine çalar).
    let graph = null;
    function buildGraph() {
      if (graph) return graph;
      const g = { input: null, reverb: null };
      try {
        const master = ctx.createGain(); master.gain.value = MASTER_GAIN;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = MASTER_LP_HZ;
        if (lp.Q) lp.Q.value = 0.5;
        master.connect(lp);
        let out = lp;
        if (typeof ctx.createDynamicsCompressor === 'function') { // ani tepeleri yumuşatan hafif sınırlayıcı
          const c = ctx.createDynamicsCompressor();
          c.threshold.value = -12; c.knee.value = 14; c.ratio.value = 4; c.attack.value = 0.004; c.release.value = 0.18;
          lp.connect(c); out = c;
        }
        out.connect(ctx.destination);
        g.input = master;
        if (typeof ctx.createConvolver === 'function' && typeof ctx.createBuffer === 'function') {
          const conv = ctx.createConvolver(); conv.buffer = makeImpulse(ctx, REVERB_SECONDS);
          const ret = ctx.createGain(); ret.gain.value = REVERB_WET;
          conv.connect(ret); ret.connect(master);
          g.reverb = conv;
        }
      } catch (e) { g.input = null; g.reverb = null; }
      graph = g;
      return g;
    }

    // Tek notayı çalar: sinüs+harmonik osilatör, 7 ms'lik saldırı, "vuruş" sonrası uzun sönüm.
    function voice(n, start, amp, bus) {
      const o = ctx.createOscillator(), g = ctx.createGain(), end = start + n.dur, peak = amp * (n.g || 1);
      const w = wave(n.type);
      if (w) o.setPeriodicWave(w); else o.type = 'sine';
      o.frequency.setValueAtTime(n.f0, start);
      if (n.f1) o.frequency.exponentialRampToValueAtTime(n.f1, end);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(peak, start + ATTACK_S);                                  // yumuşak başlangıç
      if (n.dur > KNOCK_AT * 2) g.gain.exponentialRampToValueAtTime(peak * KNOCK_LEVEL, start + KNOCK_AT); // vuruş
      g.gain.exponentialRampToValueAtTime(0.0001, end);                                        // uzun sönüm
      o.connect(g); g.connect(bus);
      o.start(start); o.stop(end + 0.03);
      return o;
    }

    // Bir olayı çalar: tek seferde en fazla 1 ses (yenisi eskisini yumuşakça keser; yankı kuyruğu doğal biter).
    function play(name) {
      const ev = SOUND_EVENTS[name];
      if (!ev) return;
      if (name !== 'tap' && name !== 'nav') pendingTap = null; // olay sesi, dokunma sesinin yerine geçer
      const now = clock();
      if (last[name] != null && now - last[name] < MIN_GAP_MS) return;
      last[name] = now;
      vibrate(ev.vib);
      if (!cfg.sound || !(cfg.volume > 0) || !ctx) return;
      if (name === 'intro' && !running()) return; // açılış sesi yalnızca bağlam zaten çalışıyorsa
      // Açılış akoru sürerken ufak arayüz sesleri onu bölmez
      if (active && active.name === 'intro' && now < active.until && (name === 'tap' || name === 'nav' || name === 'menu' || name === 'dialog')) return;
      resume();
      const amp = amplitude(cfg.volume, ev.rel);
      if (!(amp > 0)) return;
      const t0 = ctx.currentTime + 0.005;
      if (active) { try { active.bus.gain.setTargetAtTime(0, ctx.currentTime, CUT_TAU_S); } catch (e) { /* yoksay */ } }
      const bus = ctx.createGain();
      bus.gain.value = 1;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass';
      const lp = ev.lp || 1800;
      f.frequency.value = Math.min(MASTER_LP_HZ, lp * 1.5); // saldırıda parlak, gövdede yumuşak
      if (typeof f.frequency.exponentialRampToValueAtTime === 'function') {
        f.frequency.setValueAtTime(Math.min(MASTER_LP_HZ, lp * 1.5), t0);
        f.frequency.exponentialRampToValueAtTime(lp, t0 + 0.2);
      }
      const g = buildGraph();
      bus.connect(f);
      f.connect(g.input || ctx.destination);
      if (g.reverb && ev.wet > 0) { const send = ctx.createGain(); send.gain.value = ev.wet; f.connect(send); send.connect(g.reverb); }
      let lastNote = 0;
      let lastOsc = null;
      ev.notes.forEach((n) => { lastOsc = voice(n, t0 + n.at, amp, bus); lastNote = Math.max(lastNote, n.at + n.dur); });
      active = { bus, name, until: now + lastNote * 1000 };
      if (lastOsc) lastOsc.onended = () => { try { bus.disconnect(); f.disconnect(); } catch (e) { /* yoksay */ } };
    }

    // Dokunma sesi: aynı dokunuşta bir olay sesi istenirse (play/claim) dokunma sesi iptal olur.
    function scheduleTap(name) {
      pendingTap = name || 'tap';
      setTimeout(() => { if (pendingTap) { const n = pendingTap; pendingTap = null; play(n); } }, 0);
    }
    function claim() { pendingTap = null; }

    // Tarayıcıda hareket sonrası, uygulamada hemen bağlam kur; geri dönünce donmuşsa uyandır.
    function init() {
      if (!root.document) return;
      const once = { capture: true, once: true };
      root.document.addEventListener('pointerdown', unlock, once);
      root.document.addEventListener('keydown', unlock, once);
      root.document.addEventListener('visibilitychange', () => { if (!root.document.hidden) resume(); });
      if (root.Capacitor && root.Capacitor.isNativePlatform && root.Capacitor.isNativePlatform()) { ensureCtx(); resume(); }
    }

    return { play, scheduleTap, claim, vibrate, setConfig, unlock, init, running, _state: () => (ctx ? ctx.state : 'none') };
  }

  const api = { createSound, amplitude, SOUND_EVENTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.BBSound = createSound(); root.BBSound.init(); }
})(typeof window !== 'undefined' ? window : globalThis);
