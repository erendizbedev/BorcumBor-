'use strict';
/* BorcumBorç - açılış (intro) ekranı.
   Her soğuk başlatmada aynı sürede gösterilir: logo en az 2,5 sn ekranda kalır (dokunarak geçilemez),
   ardından 0,35 sn çıkış. Android geri tuşu (Intro.skip(true)) beklemeden geçer.
   Görünüm intro.css'te, logo animasyonu assets/mark-animated.svg içindedir; burada yalnızca zamanlama ve durum vardır.
   Genel API (değişmez): BBIntro.start({ onDone, sound, reduced }), BBIntro.skip(force), BBIntro.active(). */
(function (root) {
  const D = root.document;

  const HOLD_MS = 2500; // logo en az bu kadar görünür (dokunuş bu süre dolmadan yok sayılır)
  const EXIT_MS = 350;  // çıkış geçişi; azaltılmış harekette anlık

  let el = null, isActive = false, startedAt = 0, timer = 0, exitMs = 0, onDone = null, bound = false;

  const active = () => isActive;

  // Bitir: çıkış geçişini oynat, sonra gizle ve geri çağır.
  function finish() {
    if (!isActive) return;
    isActive = false;
    clearTimeout(timer);
    const end = () => { el.hidden = true; el.classList.remove('leaving'); if (onDone) onDone(); };
    if (exitMs > 0) { el.classList.add('leaving'); setTimeout(end, exitMs); } else end();
  }

  // Dokunma ile geçiş: logo süresi dolmadan dokunuş yok sayılır. Geri tuşu bunu atlar (force).
  function skip(force) {
    if (!isActive) return;
    if (!force && Date.now() - startedAt < HOLD_MS) return;
    finish();
  }

  // Tıklama ve klavye dinleyicileri yalnızca bir kez bağlanır.
  function bind() {
    if (bound) return;
    bound = true;
    el.addEventListener('click', () => skip(false));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(false); } });
  }

  function start(o) {
    o = o || {};
    el = D.getElementById('intro');
    if (!el) { if (o.onDone) o.onDone(); return; }
    onDone = o.onDone || null;
    const still = !!o.reduced; // azaltılmış hareket: hazır görünüm, anlık çıkış
    isActive = true; startedAt = Date.now();
    el.hidden = false;
    el.classList.remove('leaving');
    el.classList.add('long'); // her açılışta tam sürüm
    el.classList.toggle('still', still);
    // Animasyonlu işaret yalnızca hareket serbestse; aksi halde son durumdaki hazır işaret
    const mark = el.querySelector('img');
    if (mark) mark.src = still ? 'assets/mark.svg' : 'assets/mark-animated.svg';
    exitMs = still ? 0 : EXIT_MS;
    timer = setTimeout(finish, HOLD_MS);
    bind();
    try { el.focus({ preventScroll: true }); } catch (e) { /* odak verilemezse sorun değil */ }
    if (o.sound) o.sound();
  }

  root.BBIntro = { start, skip, active };
})(window);
