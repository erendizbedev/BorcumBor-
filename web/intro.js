'use strict';
/* BorcumBorç - açılış (intro) ekranı (UX şartnamesi bölüm 2).
   Her soğuk başlatmada aynı sürede gösterilir: logo en az 2,5 sn ekranda kalır (dokunarak geçilemez).
   Yalnızca transform ve opacity animasyonlanır; asıl animasyon CSS'te ve mark-animated.svg içindedir. */
(function (root) {
  const D = root.document;
  let el = null, isActive = false, startedAt = 0, timer = 0, exitMs = 0, onDone = null;

  const active = () => isActive;

  // Bitir: çıkış animasyonunu oynat, sonra gizle ve geri çağır.
  function finish() {
    if (!isActive) return;
    isActive = false;
    clearTimeout(timer);
    const end = () => { el.hidden = true; el.classList.remove('leaving'); if (onDone) onDone(); };
    if (exitMs > 0) { el.classList.add('leaving'); setTimeout(end, exitMs); } else end();
  }

  const MIN_MS = 2500; // logo en az bu kadar görünür
  // Dokunma ile geçiş: logo süresi dolmadan dokunuş yok sayılır. Geri tuşu bunu atlar (force).
  function skip(force) {
    if (!isActive) return;
    if (!force && Date.now() - startedAt < MIN_MS) return;
    finish();
  }

  function start(o) {
    el = D.getElementById('intro');
    if (!el) { if (o.onDone) o.onDone(); return; }
    onDone = o.onDone || null;
    const long = true, still = !!o.reduced; // her açılışta tam sürüm
    isActive = true; startedAt = Date.now();
    el.hidden = false;
    el.classList.add(long ? 'long' : 'short');
    if (still) el.classList.add('still');
    // Uzun sürümde çizim animasyonu, diğerlerinde hazır işaret
    el.querySelector('img').src = long && !still ? 'assets/mark-animated.svg' : 'assets/mark.svg';
    // Süre: 2500 ms logo + 350 ms çıkış. Azaltılmış harekette de logo 2500 ms durur, çıkış anlıktır.
    const hold = MIN_MS;
    exitMs = still ? 0 : 350;
    timer = setTimeout(finish, hold);
    el.addEventListener('click', () => skip(false));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(false); } });
    try { el.focus({ preventScroll: true }); } catch (e) { /* odak verilemezse sorun değil */ }
    if (o.sound) o.sound();
  }

  root.BBIntro = { start, skip, active };
})(window);
