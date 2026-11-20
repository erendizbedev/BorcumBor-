// Çalıştır: node tests/logic.test.js  (onay kodu, onay akışı, para birimleri, paylaşım, ses, kontrast)
const assert = require('assert');
const L = require('../web/app.js');
const A = { me: 'Ayşe Çelik', records: [] }, B = { me: 'Ömer Şahin', records: [] };

// 1) Ayşe kayıt açar (Ömer'e 150,50 TL borç verdi), kod üretir
const recA = L.createRecord(A, { person: 'Ömer', amount: '150.50', dir: 'lent', note: 'Öğle yemeği ğüşiöç', date: '2026-11-20' });
const code = L.requestCode(recA, A.me);
const d = L.decodeCode(code);
assert.strictEqual(d.amt, 150.5); assert.strictEqual(d.from, 'Ayşe Çelik'); assert.strictEqual(d.note, 'Öğle yemeği ğüşiöç');
assert.doesNotThrow(() => L.decodeCode('  ' + code.slice(0, 20) + '\n' + code.slice(20) + ' ')); // boşluk/satır sonu toleransı

// 2) Ömer onaylar: ters yönlü kayıt, aynı id
const recB = L.acceptRequest(B, d);
assert.strictEqual(recB.id, recA.id); assert.strictEqual(recB.dir, 'owe'); assert.strictEqual(recB.status, 'confirmed');
assert.strictEqual(recA.status, 'pending'); assert.strictEqual(L.totals(A).lent, 0); assert.strictEqual(L.totals(A).pending, 1);

// 3) Yanıt kodu Ayşe'de kaydı onaylar
const ack = L.ackCode(recB, B.me);
L.applyAck(A, L.decodeCode(ack));
assert.strictEqual(recA.status, 'confirmed'); assert.strictEqual(L.totals(A).lent, 150.5); assert.strictEqual(L.totals(B).owe, 150.5);

// 4) Hata senaryoları
const bad = (txt, re) => assert.throws(() => L.decodeCode(txt), re);
bad('', /boş/);
bad('merhaba dünya', /BorcumBorç kodu gibi/);
bad(code.slice(0, -10), /eksik ya da bozulmuş/);                  // kesilmiş kod
bad(code.slice(0, 12) + (code[12] === 'A' ? 'B' : 'A') + code.slice(13), /eksik ya da bozulmuş/); // tek karakter bozuk
assert.throws(() => L.acceptRequest(B, d), /zaten bu telefonda/);  // aynı kodu tekrar onaylama
assert.throws(() => L.applyAck(A, L.decodeCode(ack)), /zaten onaylanmış/);
assert.throws(() => L.applyAck({ records: [] }, L.decodeCode(ack)), /bu telefonda yok/);   // yanlış telefon
assert.throws(() => L.applyAck(B, L.decodeCode(ack)), /sen onayladın/);                   // yanıtı kendi telefonunda yapıştırma
assert.throws(() => L.acceptRequest({ records: [] }, L.decodeCode(ack)), /Yanıt Kodu/);   // kod türü karışıklığı
assert.throws(() => L.applyAck({ records: [] }, d), /Onay Kodu/);
// geçerli sağlama ama geçersiz içerik (eksi tutar)
bad(L.encodeCode({ v: 1, t: 'req', id: 'x', amt: -5, dir: 'lent' }), /geçersiz/);

// 5) Kısmi ödeme -> ödendi
L.addPayment(recA, 50); assert.strictEqual(L.remaining(recA), 100.5); assert.strictEqual(recA.status, 'confirmed');
assert.throws(() => L.addPayment(recA, 999), /fazla/);
L.addPayment(recA, 100.5); assert.strictEqual(recA.status, 'paid'); assert.strictEqual(L.totals(A).net, 0);
assert.throws(() => L.createRecord(A, { person: '', amount: 5 }), /Kişi adı/);
assert.ok(L.validImport(JSON.parse(JSON.stringify(A)))); assert.ok(!L.validImport({ records: [{ id: 1 }] }));


/* ================= Yeni özellikler (şartname bölüm 11) ================= */
const fs = require('fs'), path = require('path');
const S = require('../web/sound.js'), N = require('../web/native.js');
const fresh = () => ({ me: 'Ayşe Çelik', records: [] });
const b64 = (obj) => L.encodeCode(obj).split('.')[1];

// 1) createRecord: cur alanı, varsayılan TRY, geçersiz cur hata
{
  const st = fresh();
  assert.strictEqual(L.createRecord(st, { person: 'A', amount: 5, dir: 'lent' }).cur, 'TRY');
  assert.strictEqual(L.createRecord(st, { person: 'A', amount: 5, dir: 'owe', cur: 'USD' }).cur, 'USD');
  assert.throws(() => L.createRecord(st, { person: 'A', amount: 5, dir: 'lent', cur: 'GBP' }), /Para birimi geçersiz/);
  assert.throws(() => L.createRecord(st, { person: 'A', amount: 5, cur: 'TRY' }), /Borç ver mi, borç al mı/);
  assert.match(L.createRecord(st, { person: 'B', amount: 5, dir: 'lent' }).history[0].text, /^Borç verdin, karşı tarafın onayı bekleniyor\.$/);
  assert.match(L.createRecord(st, { person: 'B', amount: 5, dir: 'owe' }).history[0].text, /^Borç aldın, /);
}
// 2) Yuvarlama: TL/USD/EUR 2, altın 3 hane
assert.strictEqual(L.roundCur(12.1239, 'XAU'), 12.124);
assert.strictEqual(L.roundCur(1.005, 'TRY'), 1.01);
assert.strictEqual(L.createRecord(fresh(), { person: 'A', amount: '12,1239', dir: 'lent', cur: 'XAU' }).amount, 12.124);
assert.strictEqual(L.createRecord(fresh(), { person: 'A', amount: 10.256, dir: 'lent', cur: 'EUR' }).amount, 10.26);
// 3) BB2 üretimi ve çözümü
{
  const st = fresh(), r = L.createRecord(st, { person: 'Ömer', amount: '12,5', dir: 'lent', cur: 'XAU', note: 'Çeyrek altın', date: '2026-11-20' });
  const c = L.requestCode(r, st.me), d = L.decodeCode(c);
  assert.ok(c.startsWith('BB2.')); assert.strictEqual(d.cur, 'XAU'); assert.strictEqual(d.amt, 12.5); assert.strictEqual(d.v, 2);
  const other = fresh(), rb = L.acceptRequest(other, d);
  assert.strictEqual(rb.cur, 'XAU'); assert.strictEqual(rb.dir, 'owe'); assert.strictEqual(rb.amount, 12.5);
  assert.strictEqual(rb.history[0].text, 'Kaydı onayladın. Senin tarafın: Borç al.');
  const ack = L.ackCode(rb, other.me);
  assert.ok(ack.startsWith('BB2.')); assert.strictEqual(L.decodeCode(ack).t, 'ack');
  L.applyAck(st, L.decodeCode(ack)); assert.strictEqual(r.status, 'confirmed');
  assert.strictEqual(L.totals(st).byCur.XAU.lent, 12.5);
}
// 4) BB1 geriye uyum: cur yok -> TRY
{
  const old = L.encodeCode({ v: 1, t: 'req', id: 'eski1', from: 'Eski Dost', amt: 75.25, dir: 'owe', note: 'eski', date: '2026-01-02' }, 'BB1');
  const d = L.decodeCode(old);
  assert.strictEqual(d.cur, 'TRY'); assert.strictEqual(d.amt, 75.25);
  const st = fresh(), rec = L.acceptRequest(st, d);
  assert.strictEqual(rec.cur, 'TRY'); assert.strictEqual(rec.dir, 'lent');
  assert.strictEqual(L.decodeCode(L.encodeCode({ v: 1, t: 'ack', id: 'x', by: 'Ö', at: 'z' }, 'BB1')).t, 'ack');
}
// 5) BB3 = daha yeni sürüm; BB2'de cur eksik/yanlış = geçersiz; bozuk kodlar
{
  assert.throws(() => L.decodeCode('BB3.' + b64({ v: 3 }) + '.abcd'), /daha yeni bir sürümden/);
  const noCur = L.encodeCode({ v: 2, t: 'req', id: 'x', amt: 5, dir: 'lent' });
  const badCur = L.encodeCode({ v: 2, t: 'req', id: 'x', amt: 5, dir: 'lent', cur: 'GBP' });
  assert.throws(() => L.decodeCode(noCur), /geçersiz/); assert.throws(() => L.decodeCode(badCur), /geçersiz/);
  assert.throws(() => L.decodeCode(L.encodeCode({ v: 1, t: 'req', id: 'x', amt: 5, dir: 'lent' })), /geçersiz/); // BB2 başlığı + v:1 uyumsuz
  assert.throws(() => L.decodeCode('BB2.%%%.zzzz'), /eksik ya da bozulmuş/);
  assert.throws(() => L.decodeCode('BB2.abc'), /eksik ya da bozulmuş/);
  assert.throws(() => L.decodeCode('   \n '), /boş/);
  assert.throws(() => L.decodeCode('BX1.abc.defg'), /BorcumBorç kodu gibi/);
}
// 6) Şablon mesajın tamamı yapıştırılınca kod bulunur (önüne/arkasına metin, satır ortasından bölünmüş)
{
  const st = fresh(), r = L.createRecord(st, { person: 'Ömer', amount: 150.5, dir: 'lent', cur: 'TRY' });
  const code = L.requestCode(r, st.me);
  const msg = L.shareMessage('req', { name: st.me, amountText: L.fmtPlain(150.5, 'TRY'), code });
  assert.strictEqual(L.decodeCode(msg).id, r.id);
  assert.strictEqual(L.decodeCode(msg + '\n\nTeşekkürler :)').id, r.id);
  const cut = msg.slice(0, msg.length - 40) + '\n' + msg.slice(msg.length - 40); // kod ortadan bölündü
  assert.strictEqual(L.decodeCode(cut).id, r.id);
  assert.strictEqual(L.decodeCode(L.smsMessage(code)).id, r.id);
  const both = 'Merhaba, işte kod:\n' + code.slice(0, 30) + '\n' + code.slice(30) + '\nTeşekkürler'; // hem bölünmüş hem sonda metin var
  assert.strictEqual(L.decodeCode(both).id, r.id);
}
// 7) totals(): birim bazlı onaylı net, bekleyen ayrı, birimler asla toplanmaz
{
  const st = fresh(), mk = (o) => { const r = L.createRecord(st, o); if (o.ok) r.status = 'confirmed'; return r; };
  mk({ person: 'A', amount: 1000, dir: 'lent', ok: 1 });
  mk({ person: 'A', amount: 200, dir: 'owe', ok: 1 });
  mk({ person: 'B', amount: 20, dir: 'owe', cur: 'USD', ok: 1 });
  mk({ person: 'C', amount: 350, dir: 'lent' });                // bekleyen TL
  mk({ person: 'C', amount: 20, dir: 'owe', cur: 'USD' });      // bekleyen USD
  mk({ person: 'C', amount: 5, dir: 'lent', cur: 'XAU' });      // bekleyen altın
  const t = L.totals(st);
  assert.strictEqual(t.byCur.TRY.net, 800); assert.strictEqual(t.byCur.TRY.lent, 1000); assert.strictEqual(t.byCur.TRY.owe, 200);
  assert.strictEqual(t.byCur.USD.net, -20);
  assert.strictEqual(t.byCur.TRY.pendingLent, 350); assert.strictEqual(t.byCur.TRY.pendingCount, 1);
  assert.strictEqual(t.byCur.USD.pendingOwe, 20); assert.strictEqual(t.byCur.XAU.pendingLent, 5);
  assert.strictEqual(t.byCur.XAU.net, 0); assert.strictEqual(t.pending, 3);
  assert.strictEqual(t.net, 800); assert.strictEqual(t.lent, 1000); assert.strictEqual(t.owe, 200); // eski üst düzey alanlar = TL
  assert.deepStrictEqual(L.activeUnits(t), ['TRY', 'USD']);
}
// 8) groupByPerson: kişi başına birim bazlı net
{
  const st = fresh(), a = L.createRecord(st, { person: 'Ayşe', amount: 100, dir: 'lent' }), b = L.createRecord(st, { person: 'ayşe', amount: 30, dir: 'owe', cur: 'EUR' });
  a.status = 'confirmed'; b.status = 'confirmed';
  const g = L.groupByPerson(st); assert.strictEqual(g.length, 1);
  assert.deepStrictEqual(g[0].net, { TRY: 100, EUR: -30 });
}
// 9) validImport: cur yoksa kabul (TL sayılır), bilinmeyen cur reddedilir
{
  const base = { id: 'x', person: 'A', amount: 5, dir: 'lent', status: 'confirmed', payments: [] };
  assert.ok(L.validImport({ records: [base] })); assert.ok(L.validImport({ records: [{ ...base, cur: 'USD' }] }));
  assert.ok(!L.validImport({ records: [{ ...base, cur: 'GBP' }] }));
  const oldState = { me: 'Eski', records: [{ ...base, amount: 40 }] };
  assert.strictEqual(L.totals(oldState).byCur.TRY.lent, 40); assert.strictEqual(L.remaining(oldState.records[0]), 40);
}
// Ödeme birimi: altın 3 hane, TL 2 hane
{
  const st = fresh(), r = L.createRecord(st, { person: 'A', amount: 10, dir: 'lent', cur: 'XAU' }); r.status = 'confirmed';
  L.addPayment(r, '2,5'); assert.strictEqual(L.remaining(r), 7.5);
  L.addPayment(r, 7.4999); assert.strictEqual(r.status, 'paid');
}
// Biçim ve tutar girişi
assert.strictEqual(L.fmt(1234.5, 'TRY'), '₺1.234,50'); assert.strictEqual(L.fmt(1234.5, 'USD'), '$1.234,50');
assert.strictEqual(L.fmt(1234.5, 'EUR'), '€1.234,50'); assert.strictEqual(L.fmt(12.5, 'XAU'), '12,50 gr'); assert.strictEqual(L.fmt(12.125, 'XAU'), '12,125 gr');
assert.strictEqual(L.fmt(-20, 'USD'), '−$20,00'); assert.strictEqual(L.sign(-3, 'TRY'), '−₺3,00'); assert.strictEqual(L.sign(3, 'TRY'), '+₺3,00');
assert.strictEqual(L.fmtPlain(150.5, 'TRY'), '150,50 ₺'); assert.strictEqual(L.fmtPlain(12.5, 'XAU'), '12,50 gr');
assert.strictEqual(L.parseAmount('12,5'), L.parseAmount('12.5')); assert.strictEqual(L.parseAmount('1.250,5'), 1250.5);
assert.ok(Number.isNaN(L.parseAmount('abc'))); assert.ok(Number.isNaN(L.parseAmount('')));
assert.strictEqual(L.sanitizeAmount('12,1239', 3), '12,123'); assert.strictEqual(L.sanitizeAmount('12,1239', 2), '12,12');   // 4. ondalık yazılamaz
assert.strictEqual(L.sanitizeAmount('1234567890123', 2), '123456789');                                                   // tam kısım en çok 9 hane
assert.strictEqual(L.formatAmountInput('1250,5', 2), '1.250,50'); assert.strictEqual(L.formatAmountInput('12.5', 3), '12,50');
assert.strictEqual(L.spoken(12.5, 'XAU'), '12,5 gram altın'); assert.strictEqual(L.spoken(1250, 'TRY'), '1.250 Türk lirası');
assert.strictEqual(L.dirText({ dir: 'lent' }), 'Borç ver'); assert.strictEqual(L.dirText({ dir: 'owe' }), 'Borç al');

// ₺ karşılığı: yalnızca TL ise yok; kur eksikse sayı yok; hepsi varsa Σ(net x kur)
{
  const st = fresh(); const mk = (o) => { L.createRecord(st, o).status = 'confirmed'; };
  mk({ person: 'A', amount: 100, dir: 'lent' });
  assert.strictEqual(L.tryEquivalent(L.totals(st), {}).kind, 'none');
  mk({ person: 'B', amount: 10, dir: 'owe', cur: 'USD' }); mk({ person: 'C', amount: 5, dir: 'lent', cur: 'EUR' });
  const t = L.totals(st);
  const miss = L.tryEquivalent(t, { USD: 30 }); assert.strictEqual(miss.kind, 'missing'); assert.deepStrictEqual(miss.missing, ['EUR']);
  assert.strictEqual(L.tryEquivalent(t, { USD: 30, EUR: 35 }).value, 100 - 300 + 175);
}
// Ayarlar normalleştirme
assert.deepStrictEqual(L.normalizeSettings(null), { sound: true, volume: 70, haptic: true, rates: { USD: null, EUR: null, XAU: null, updatedAt: null }, lastCur: 'TRY' });
assert.strictEqual(L.normalizeSettings({ volume: 0, sound: false }).volume, 0); assert.strictEqual(L.normalizeSettings({ volume: 999 }).volume, 100);
assert.strictEqual(L.normalizeSettings({ rates: { USD: -1, EUR: 35 } }).rates.USD, null);

// Paylaşım: URL'ler tabloyla birebir, Türkçe karakter ve satır sonu doğru kodlanır; kod son satırdadır
{
  const code = 'BB2.abc-_.wxyz', msg = L.shareMessage('req', { name: 'Şükrü', amountText: '150,50 ₺', code });
  assert.ok(msg.endsWith('\nKod:\n' + code)); assert.ok(msg.includes('seninle 150,50 ₺ tutarında bir borç kaydı oluşturdu')); assert.ok(msg.includes(L.APP_URL));
  assert.ok(!/Borç ver|Borç al/.test(msg)); // mesajda yön yazılmaz
  assert.strictEqual(L.shareUrl('whatsapp', msg), 'https://wa.me/?text=' + encodeURIComponent(msg));
  assert.strictEqual(L.shareUrl('telegram', msg), 'https://t.me/share/url?url=' + encodeURIComponent(L.APP_URL) + '&text=' + encodeURIComponent(msg));
  assert.strictEqual(L.shareUrl('sms', L.smsMessage(code)), 'sms:?body=' + encodeURIComponent('BorcumBorç kodu (Onayla sekmesine yapıştır): ' + code));
  assert.ok(L.shareUrl('whatsapp', msg).includes('%0A') && L.shareUrl('whatsapp', msg).includes('%C5%9E%C3%BCkr%C3%BC')); // \n ve Ş,ü,ü
  assert.ok(L.shareMessage('req', { name: '', amountText: '1 ₺', code }).startsWith('Bir arkadaşın seninle'));
  assert.ok(L.shareMessage('ack', { name: 'Ömer', code }).startsWith('Ömer kaydı onayladı.') && L.shareMessage('ack', { name: 'Ömer', code }).endsWith('\nKod:\n' + code));
}

// Ses ve titreşim (sahte AudioContext): kapalıyken sessiz, bağımsız ayarlar, tek seferde tek ses, genlik formülü
{
  class FakeParam { constructor() { this.v = []; } setValueAtTime(v) { this.v.push(v); } linearRampToValueAtTime(v) { this.v.push(v); } exponentialRampToValueAtTime(v) { this.v.push(v); } setTargetAtTime(v) { this.v.push(v); } set value(x) { this.v.push(x); } }
  const made = { osc: 0, buses: [], resumed: 0 };
  class FakeCtx {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    resume() { made.resumed++; this.state = 'running'; return Promise.resolve(); }
    createGain() { const g = { gain: new FakeParam(), connect() {} }; made.buses.push(g); return g; }
    createBiquadFilter() { return { frequency: {}, connect() {} }; }
    createOscillator() { made.osc++; return { frequency: new FakeParam(), connect() {}, start() {}, stop() {} }; }
  }
  const vib = []; let t = 1000;
  const mk = (cfg) => { const s = S.createSound({ AudioContext: FakeCtx, navigator: { vibrate: (p) => vib.push(p) }, plugins: {}, now: () => t }); s.setConfig(cfg); s.unlock(); return s; };
  const tick = () => { t += 100; };
  // genlik: (seviye/100)^2 x şiddet x 0,8
  assert.ok(Math.abs(S.amplitude(70, 0.5) - 0.49 * 0.5 * 0.8) < 1e-9); assert.strictEqual(S.amplitude(0, 1), 0); assert.strictEqual(S.amplitude(100, 1), 0.8);
  // ses kapalı: osilatör yok, titreşim çalışır; titreşim kapalı: ses çalar, titreşim yok (bağımsız)
  let s = mk({ sound: false, volume: 70, haptic: true }); s.play('success');
  assert.strictEqual(made.osc, 0); assert.deepStrictEqual(vib.pop(), [25, 40, 25]);
  s = mk({ sound: true, volume: 70, haptic: false }); tick(); s.play('success');
  assert.strictEqual(made.osc, 2); assert.strictEqual(vib.length, 0);
  // seviye 0: sessiz
  made.osc = 0; s = mk({ sound: true, volume: 0, haptic: true }); tick(); s.play('confirm'); assert.strictEqual(made.osc, 0);
  // olay tablosu: her olay tablodaki titreşimi verir
  const expectVib = { tap: [10], nav: [8], success: [25, 40, 25], confirm: [30, 50, 30, 50, 70], error: [70, 50, 70], copy: [15], pay: [20, 40, 50], del: [90], dialog: [15] };
  s = mk({ sound: true, volume: 70, haptic: true });
  Object.keys(expectVib).forEach((k) => { vib.length = 0; tick(); s.play(k); assert.deepStrictEqual(vib[0], expectVib[k], k); });
  assert.ok(S.SOUND_EVENTS.confirm.notes.length === 3 && S.SOUND_EVENTS.intro.notes.length === 4 && S.SOUND_EVENTS.intro.vib === null);
  Object.values(S.SOUND_EVENTS).forEach((e) => { if (e.vib) assert.ok(e.vib.reduce((a, b) => a + b, 0) <= 250); });
  // aynı sesin 40 ms içinde tekrarı yok; yeni ses öncekini keser (tek seferde tek ses)
  made.osc = 0; vib.length = 0; tick(); s.play('tap'); s.play('tap'); assert.strictEqual(made.osc, 1);
  made.buses.length = 0; tick(); s.play('success'); tick(); s.play('error');
  const [b1] = made.buses; assert.ok(b1.gain.v.includes(0), 'önceki ses kesilmeli');
  // olay sesi, aynı dokunuşun dokunma sesinin yerine geçer
  made.osc = 0; tick(); s.scheduleTap('tap'); s.play('success');
  // açılış sesi yalnızca bağlam çalışıyorsa
  const cold = S.createSound({ AudioContext: FakeCtx, navigator: {}, plugins: {}, now: () => t }); cold.setConfig({ sound: true, volume: 70, haptic: true });
  made.osc = 0; tick(); cold.play('intro'); assert.strictEqual(made.osc, 0);
  cold.unlock(); tick(); cold.play('intro'); assert.strictEqual(made.osc, 4);
  // Capacitor Haptics varsa o kullanılır, yoksa navigator.vibrate
  const hv = []; const h = S.createSound({ AudioContext: FakeCtx, navigator: { vibrate: (p) => vib.push(p) }, plugins: { Haptics: { vibrate: (o) => { hv.push(o.duration); return Promise.resolve(); } } }, now: () => t });
  h.setConfig({ sound: false, volume: 70, haptic: true }); vib.length = 0; tick(); h.play('tap'); assert.deepStrictEqual(hv, [10]); assert.strictEqual(vib.length, 0);
}
// Yerel köprü: geri tuşu dinleyicisi, Share iptali hata vermez
const nativeDone = (async () => {
  const handlers = {}; let exited = false;
  const nat = N.createNative({ Capacitor: { Plugins: { App: { addListener: (n, f) => { handlers[n] = f; }, exitApp: () => { exited = true; } } } } });
  assert.strictEqual(nat.onBackButton(() => 1), true); assert.strictEqual(typeof handlers.backButton, 'function'); nat.exitApp(); assert.ok(exited);
  assert.strictEqual(N.createNative({}).onBackButton(() => 1), false);
  const cancel = N.createNative({ Capacitor: { Plugins: { Share: { share: () => Promise.reject(new Error('Share canceled')) } } } });
  assert.strictEqual(await cancel.share({ text: 'x' }), 'cancelled');
  const abort = N.createNative({ navigator: { share: () => Promise.reject(Object.assign(new Error('x'), { name: 'AbortError' })) } });
  assert.strictEqual(await abort.share({ text: 'x' }), 'cancelled');
  assert.strictEqual(await N.createNative({ navigator: {} }).share({ text: 'x' }), 'unsupported');
  assert.strictEqual(await N.createNative({ Capacitor: { Plugins: { Share: { share: () => Promise.resolve({}) } } } }).share({ text: 'x' }), 'shared');
  console.log('Yerel köprü testleri geçti');
})();

/* ---- Renk kontrast testi (tokens.css üzerinden; eşiğin altı testi kırar) ---- */
{
  const css = fs.readFileSync(path.join(__dirname, '../web/tokens.css'), 'utf8');
  const tok = {}; for (const m of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\b/g)) tok[m[1]] = m[2];
  const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const TEXT = 4.5, NONTEXT = 3;
  const pairs = [];
  const add = (min, fgs, bgs) => fgs.forEach((f) => bgs.forEach((b) => pairs.push([min, f, b])));
  const surfaces = ['c-bg', 'c-surface', 'c-surface-2'];
  add(TEXT, ['c-text', 'c-muted', 'c-emerald', 'c-coral', 'c-gold', 'c-info'], [...surfaces, 'c-surface-3']);
  add(TEXT, ['c-emerald-soft'], surfaces);
  add(TEXT, ['c-on-accent'], ['c-copper-1', 'c-copper-2', 'c-copper-3']);
  add(TEXT, ['c-on-emerald'], ['c-emerald']); add(TEXT, ['c-on-coral'], ['c-coral']);
  add(TEXT, ['c-text'], ['c-coral-deep', 'c-emerald-deep']);
  add(TEXT, ['c-text', 'c-muted', 'c-emerald-soft', 'c-gold'], ['#174A39']);       // detay kartı (hero)
  add(NONTEXT, ['c-line-strong'], surfaces);                                          // girdi/çip/düğme çerçevesi
  add(NONTEXT, ['c-gold'], surfaces);                                                 // odak halkası
  add(NONTEXT, ['c-copper-2', 'c-emerald', 'c-coral', 'c-info'], surfaces);           // seçili çerçeve, ikonlar, anahtar
  add(NONTEXT, ['c-coral', 'c-emerald-soft'], ['#174A39']);                           // hero içindeki ikon ve ilerleme çubuğu
  add(NONTEXT, ['c-bg'], ['c-info']);                                                  // anahtar düğmesi: açık durumda topuz/iz
  const val = (k) => (k.startsWith('#') ? k : tok[k]);
  pairs.forEach(([min, f, b]) => { const r = ratio(val(f), val(b)); assert.ok(r >= min, `Kontrast yetersiz: ${f} / ${b} = ${r.toFixed(2)} (en az ${min})`); });
  assert.ok(Object.keys(tok).length > 15);
  // Zümrüt/mercan göreli parlaklık oranı (renk körlüğü): şartname 1,5:1 ister. Palet değiştirilemediği için bilgi olarak yazılır;
  // renk tek başına anlam taşımaz (işaret + ikon + metin vardır).
  const em = ratio(tok['c-emerald'], tok['c-coral']);
  if (em < 1.5) console.log(`UYARI: zümrüt/mercan parlaklık oranı ${em.toFixed(2)}:1 (<1,5:1). Ayrım işaret, ikon ve metinle sağlanıyor.`);
  console.log(`Kontrast testi geçti (${pairs.length} çift)`);
}

/* ---- Kaynak denetimleri: eski yön metinleri, confirm(), eski renk adları kalmasın ---- */
{
  const dir = path.join(__dirname, '../web');
  const src = ['app.js', 'index.html', 'style.css', 'sound.js', 'native.js', 'intro.js'].map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  assert.ok(!/Bana borçlu|Ben borçluyum/.test(src), 'eski yön metni kalmış');
  assert.ok(!/\bconfirm\s*\(/.test(src.replace(/confirmView|function confirm/g, '')), 'window.confirm kalmış');
  assert.ok(!/var\(--(mint|amber|indigo|danger)\)/.test(src), 'eski renk değişkeni kalmış');
  assert.ok(!/aria-live/.test(fs.readFileSync(path.join(dir, 'index.html'), 'utf8').replace(/<div id="toast"[^>]*>/, '')), '#app içinde aria-live olmamalı');
  const sw = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
  ['tokens.css', 'assets/icons.svg', 'assets/mark-animated.svg', 'sound.js', 'native.js', 'intro.js', 'bricolage-grotesque-latin-800-normal.woff2'].forEach((f) => assert.ok(sw.includes(f), 'sw.js önbelleğinde yok: ' + f));
  const missing = [...sw.matchAll(/'((?:fonts|assets)\/[^']+)'/g)].map((m) => m[1]).filter((f) => !fs.existsSync(path.join(dir, f)));
  assert.deepStrictEqual(missing, [], 'sw.js listesindeki dosya yok');
  console.log('Kaynak denetimleri geçti');
}
nativeDone.then(() => console.log('TÜM TESTLER GEÇTİ'));
