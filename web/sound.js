'use strict';
/* BorcumBorç - ses ve titreşim (UX şartnamesi bölüm 3).
   Sesler dosya değil, Web Audio ile üretilir (çevrimdışı, sıfır boyut).
   Kullanım: BBSound.play('success')  ->  ses + titreşim birlikte, ayarlara göre. */
(function (root) {
  // ---- Olay tablosu: her nota {type, f0, f1 (isteğe bağlı), at (sn), dur (sn)} ----
  // rel = göreli şiddet, lp = alçak geçiren süzgeç (Hz), vib = titreşim kalıbı (ms: aç, kapa, aç...)
  const SOUND_EVENTS = {
    tap:     { rel: 0.5,  vib: [10],                  notes: [{ type: 'sine', f0: 1400, f1: 900, at: 0, dur: 0.035 }] },
    nav:     { rel: 0.45, vib: [8],                   notes: [{ type: 'sine', f0: 520, f1: 700, at: 0, dur: 0.06 }] },
    success: { rel: 0.7,  vib: [25, 40, 25],          notes: [{ type: 'triangle', f0: 660, at: 0, dur: 0.08 }, { type: 'triangle', f0: 880, at: 0.08, dur: 0.12 }] },
    confirm: { rel: 0.8,  vib: [30, 50, 30, 50, 70],  notes: [{ type: 'sine', f0: 523, at: 0, dur: 0.09 }, { type: 'sine', f0: 659, at: 0.09, dur: 0.09 }, { type: 'sine', f0: 784, at: 0.18, dur: 0.2 }] },
    error:   { rel: 0.65, vib: [70, 50, 70], lp: 1200, notes: [{ type: 'triangle', f0: 330, at: 0, dur: 0.1 }, { type: 'triangle', f0: 247, at: 0.1, dur: 0.16 }] },
    copy:    { rel: 0.5,  vib: [15],                  notes: [{ type: 'sine', f0: 1200, at: 0, dur: 0.02 }, { type: 'sine', f0: 1200, at: 0.05, dur: 0.02 }] },
    pay:     { rel: 0.7,  vib: [20, 40, 50],          notes: [{ type: 'sine', f0: 1760, at: 0, dur: 0.26 }, { type: 'sine', f0: 2349, at: 0.06, dur: 0.2 }] },
    del:     { rel: 0.55, vib: [90], lp: 800,         notes: [{ type: 'sawtooth', f0: 480, f1: 140, at: 0, dur: 0.17 }] },
    intro:   { rel: 0.7,  vib: null,                  notes: [{ type: 'sine', f0: 262, at: 0, dur: 0.11 }, { type: 'sine', f0: 330, at: 0.11, dur: 0.11 }, { type: 'sine', f0: 392, at: 0.22, dur: 0.11 }, { type: 'sine', f0: 523, at: 0.33, dur: 0.45 }] },
    dialog:  { rel: 0.5,  vib: [15],                  notes: [{ type: 'sine', f0: 440, at: 0, dur: 0.05 }] }
  };
  const MIN_GAP_MS = 40; // aynı sesin tekrarı arasındaki en az süre

  // Genlik = (seviye/100)^2 x göreli şiddet x 0,8. Seviye 0 ise ses yok.
  function amplitude(level, rel) {
    const l = Math.max(0, Math.min(100, Number(level) || 0)) / 100;
    return l * l * rel * 0.8;
  }

  // env: test için dışarıdan verilebilir {AudioContext, navigator, plugins, now}
  function createSound(env) {
    env = env || {};
    let cfg = { sound: true, volume: 70, haptic: true }; // app.js kendi ayar nesnesini verir (aynı nesne)
    let ctx = null, active = null, pendingTap = null;
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

    // Bir olayı çalar: tek seferde en fazla 1 ses (yenisi eskisini keser).
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
      resume();
      const amp = amplitude(cfg.volume, ev.rel);
      if (!(amp > 0)) return;
      const t0 = ctx.currentTime + 0.005;
      // eski sesi kısa sönümle kes
      if (active) { try { active.gain.setTargetAtTime(0, ctx.currentTime, 0.006); } catch (e) { /* yoksay */ } }
      const bus = ctx.createGain();
      bus.gain.value = 1;
      if (ev.lp) {
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = ev.lp;
        bus.connect(f); f.connect(ctx.destination);
      } else bus.connect(ctx.destination);
      active = bus;
      ev.notes.forEach((n) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), s = t0 + n.at, e = s + n.dur;
        o.type = n.type;
        o.frequency.setValueAtTime(n.f0, s);
        if (n.f1) o.frequency.exponentialRampToValueAtTime(n.f1, e);
        g.gain.setValueAtTime(0.0001, s);
        g.gain.linearRampToValueAtTime(amp, s + 0.004);   // yumuşak başlangıç (tık sesi olmasın)
        g.gain.exponentialRampToValueAtTime(0.0001, e);   // sönüm
        o.connect(g); g.connect(bus);
        o.start(s); o.stop(e + 0.02);
      });
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
