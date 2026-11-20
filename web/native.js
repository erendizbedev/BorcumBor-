'use strict';
/* BorcumBorç - yerel (Capacitor) köprüsü: geri tuşu, paylaşım, pano, dış bağlantı.
   Capacitor yoksa (tarayıcı) her işlev makul bir yedeğe düşer. Hiçbiri hata fırlatmaz. */
(function (root) {
  function createNative(env) {
    env = env || root;
    const plugins = () => (env.Capacitor && env.Capacitor.Plugins) || {};

    // --- Android geri tuşu ---
    // Dinleyici kaydedilebildiyse true döner; tarayıcıda (App eklentisi yok) false.
    function onBackButton(handler) {
      const App = plugins().App;
      if (App && typeof App.addListener === 'function') {
        try { App.addListener('backButton', handler); return true; } catch (e) { return false; }
      }
      return false;
    }
    function exitApp() {
      const App = plugins().App;
      if (App && typeof App.exitApp === 'function') { App.exitApp(); return; }
      try { env.close(); } catch (e) { /* tarayıcı sekmesi kapatılamayabilir */ }
    }

    // --- Paylaşım ("Diğer"): Capacitor Share, yoksa navigator.share. ---
    // Sonuç: 'shared' | 'cancelled' | 'unsupported' | 'failed'. Kullanıcı vazgeçerse hata sayılmaz.
    const isCancel = (e) => !!e && (e.name === 'AbortError' || /cancel/i.test(String(e.message || e)));
    async function share(opts) {
      const S = plugins().Share;
      try {
        if (S && typeof S.share === 'function') { await S.share(opts); return 'shared'; }
        if (env.navigator && typeof env.navigator.share === 'function') {
          await env.navigator.share({ title: opts.title, text: opts.text });
          return 'shared';
        }
      } catch (e) { return isCancel(e) ? 'cancelled' : 'failed'; }
      return 'unsupported';
    }

    // --- Dış uygulama açma (WhatsApp, Telegram, SMS) ---
    function openUrl(url) { try { return env.open(url, '_blank'); } catch (e) { return null; } }

    // --- Pano ---
    async function copyText(text) {
      try { await env.navigator.clipboard.writeText(text); return true; } catch (e) { /* eski WebView: yedek yol */ }
      try {
        const d = env.document, ta = d.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0';
        d.body.appendChild(ta); ta.select();
        const ok = d.execCommand('copy'); ta.remove();
        return !!ok;
      } catch (e) { return false; }
    }
    async function readText() { return env.navigator.clipboard.readText(); }

    return { onBackButton, exitApp, share, openUrl, copyText, readText, isCancel };
  }

  const api = { createNative };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') root.BBNative = createNative(root);
})(typeof window !== 'undefined' ? window : globalThis);
