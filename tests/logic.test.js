// Çalıştır: node tests/logic.test.js  (onay kodu + onay akışı mantığı)
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
console.log('TÜM TESTLER GEÇTİ');
