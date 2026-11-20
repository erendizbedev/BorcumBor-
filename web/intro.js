'use strict';
/* BorcumBorç - açılış (intro) ekranı (UX şartnamesi bölüm 2).
   Her soğuk başlatmada gösterilir: ilk kurulumda uzun (2 sn), sonrakilerde kısa (0,9 sn).
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

  // Dokunma ile geçiş: ilk 150 ms kazara dokunuş sayılır. Geri tuşu bunu atlar (force).
  function skip(force) {
    if (!isActive) return;
    if (!force && Date.now() - startedAt < 150) return;
    finish();
  }

  function start(o) {
    el = D.getElementById('intro');
    if (!el) { if (o.onDone) o.onDone(); return; }
    onDone = o.onDone || null;
    const long = !!o.firstTime, still = !!o.reduced;
    isActive = true; startedAt = Date.now();
    el.hidden = false;
    el.classList.add(long ? 'long' : 'short');
    if (still) el.classList.add('still');
    // Uzun sürümde çizim animasyonu, diğerlerinde hazır işaret
    el.querySelector('img').src = long && !still ? 'assets/mark-animated.svg' : 'assets/mark.svg';
    // Süreler: uzun 2000+350, kısa 650+250 (toplam 0,9 sn); azaltılmış harekette 700 / 400 ms ve anlık çıkış
    const hold = still ? (long ? 700 : 400) : (long ? 2000 : 650);
    exitMs = still ? 0 : (long ? 350 : 250);
    timer = setTimeout(finish, hold);
    el.addEventListener('click', () => skip(false));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skip(false); } });
    try { el.focus({ preventScroll: true }); } catch (e) { /* odak verilemezse sorun değil */ }
    if (o.sound) o.sound();
  }

  root.BBIntro = { start, skip, active };
})(window);
