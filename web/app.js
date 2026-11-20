'use strict';
/* BorcumBorç - çevrimdışı borç kaydı.
   Bölüm 1: saf mantık (para birimi, kod, kayıt, toplam, paylaşım metni). Node testleri bunu kullanır.
   Bölüm 2: arayüz (ekranlar, pencere bileşeni, geri tuşu, olaylar).
   Ses: sound.js, yerel köprü: native.js, açılış: intro.js. */

/* ================= 1) MANTIK ================= */
const KEY = 'borcumborc.v1';                 // kayıt verisi
const SETTINGS_KEY = 'borcumborc.settings.v1'; // ayarlar (kayıt verisinden ayrı)
const APP_VERSION = '0.2.0';
const APP_URL = 'https://github.com/erendizbedev/BorcumBor-';

// Kayıt: {id, person, amount, cur, dir:'lent'|'owe', note, date, status:'pending'|'confirmed'|'paid',
//         role:'creator'|'acceptor', payments:[{amt,date}], history:[{t,text}]}
// dir iç değeri sabit: 'lent' = Borç ver (alacaklıyım), 'owe' = Borç al (borçluyum). Ekran metni dirText ile üretilir.
// cur alanı olmayan eski kayıtlar TRY sayılır.

/* ---- Para birimleri ---- */
const CURRENCIES = {
  TRY: { sym: '₺', name: 'TL', long: 'Türk lirası', label: 'TL (₺)', digits: 2, icon: 'tl' },
  USD: { sym: '$', name: 'Dolar', long: 'dolar', label: 'Dolar ($)', digits: 2, icon: 'dolar' },
  EUR: { sym: '€', name: 'Euro', long: 'euro', label: 'Euro (€)', digits: 2, icon: 'euro' },
  XAU: { sym: 'gr', name: 'Altın', long: 'gram altın', label: 'Altın (gram)', digits: 3, icon: 'altin' }
};
const CUR_ORDER = ['TRY', 'USD', 'EUR', 'XAU'];
const isCur = (c) => CUR_ORDER.includes(c);
const curOf = (r) => (r && r.cur) || 'TRY';
const digitsOf = (cur) => (CURRENCIES[cur] || CURRENCIES.TRY).digits;

const nowISO = () => new Date().toISOString();
const newId = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Birime göre yuvarlar (TL/USD/EUR 2 hane, altın 3 hane). EPSILON, 1.005 gibi kayan nokta hatalarını düzeltir.
function roundCur(n, cur) {
  const x = Number(n);
  if (!Number.isFinite(x)) return x;
  const f = 10 ** digitsOf(cur);
  return (x < 0 ? -1 : 1) * Math.round(Math.abs(x) * f * (1 + Number.EPSILON)) / f;
}

/* ---- Biçimleme (tr-TR) ---- */
const nfCache = {};
function numFmt(n, minD, maxD) {
  const k = minD + '-' + maxD;
  return (nfCache[k] || (nfCache[k] = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: minD, maximumFractionDigits: maxD }))).format(n);
}
// Tek biçimleyici: fmt(n, cur). Negatifte gerçek eksi işareti (−). TL/USD/EUR: "₺1.234,50"; altın: "12,50 gr".
function fmt(n, cur) {
  const c = isCur(cur) ? cur : 'TRY', a = Math.abs(n), neg = n < 0 ? '−' : '';
  if (c === 'XAU') return neg + numFmt(a, 2, 3) + ' gr';
  return neg + new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(a);
}
const sign = (n, cur) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n), cur);
// Mesaj metni için: "150,50 ₺", "12,50 gr"
function fmtPlain(n, cur) {
  const c = isCur(cur) ? cur : 'TRY';
  return (n < 0 ? '−' : '') + numFmt(Math.abs(n), 2, digitsOf(c)) + ' ' + CURRENCIES[c].sym;
}
// Ekran okuyucu için: "1.250 Türk lirası", "12,5 gram altın"
function spoken(n, cur, signed) {
  const c = isCur(cur) ? cur : 'TRY';
  const pre = signed ? (n > 0 ? 'artı ' : n < 0 ? 'eksi ' : '') : (n < 0 ? 'eksi ' : '');
  return pre + numFmt(Math.abs(n), 0, digitsOf(c)) + ' ' + CURRENCIES[c].long;
}

/* ---- Tutar girişi: "12,5" ve "12.5" aynı değer ---- */
// Metni {int, dec} parçalarına ayırır. Karışık ayırıcıda sonuncusu ondalıktır (1.250,50);
// 1.250.000 gibi üç haneli gruplar bin ayırıcıdır; tek ayırıcı her zaman ondalıktır.
function splitAmount(str) {
  const s = String(str == null ? '' : str).replace(/[^0-9.,]/g, '');
  if (!/[.,]/.test(s)) return { int: s, dec: null };
  let idx;
  if (s.includes('.') && s.includes(',')) idx = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  else if (/^\d{1,3}([.,]\d{3}){2,}$/.test(s)) idx = -1;
  else idx = s.search(/[.,]/);
  if (idx < 0) return { int: s.replace(/[.,]/g, ''), dec: null };
  return { int: s.slice(0, idx).replace(/[.,]/g, ''), dec: s.slice(idx + 1).replace(/[.,]/g, '') };
}
// Yazarken: tam kısım en çok 9 hane, fazla ondalık sessizce kırpılır, ayırıcı hep virgül.
function sanitizeAmount(str, digits) {
  const p = splitAmount(str), int = p.int.slice(0, 9);
  if (p.dec == null) return int;
  return (int || '0') + ',' + p.dec.slice(0, digits);
}
function parseAmount(str) {
  const p = splitAmount(str);
  if (!p.int && !p.dec) return NaN;
  return Number((p.int || '0') + (p.dec ? '.' + p.dec : ''));
}
// Odaktan çıkınca: "1250,5" -> "1.250,50"
function formatAmountInput(str, digits) {
  const n = parseAmount(sanitizeAmount(str, digits));
  return Number.isNaN(n) ? '' : numFmt(n, 2, digits);
}

/* ---- Kodlama: JSON -> UTF-8 -> base64url, sonuna kısa sağlama (checksum) eklenir ---- */
function toB64(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64(str) {
  let b = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  const bin = atob(b);
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}
function checksum(s) { // djb2, 4 karakter (BB1 ile BB2 aynı)
  let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return h.toString(36).slice(-4).padStart(4, '0');
}
// Yeni kodlar her zaman BB2. prefix parametresi yalnızca eski biçimi (BB1) üretmek isteyen testler içindir.
const encodeCode = (obj, prefix) => { const b = toB64(obj); return `${prefix || 'BB2'}.${b}.${checksum(b)}`; };

const ERR_BROKEN = 'Kod eksik ya da bozulmuş. Kodun tamamını, hiçbir karakteri atlamadan kopyaladığından emin ol.';
const ERR_INVALID = 'Kodun içeriği geçersiz ya da farklı bir sürümden. Karşı taraftan yeni kod iste.';
const ERR_NOT_CODE = 'Bu bir BorcumBorç kodu gibi görünmüyor. Kod "BB" ile başlar. Karşı tarafın gönderdiği kodu yapıştır.';
const ERR_NEWER = 'Bu kod daha yeni bir sürümden. Uygulamayı güncelle ve tekrar dene.';

// Boşluksuz tek bir kod dizisini çözer: BB1 (cur yok = TRY) ve BB2 (cur zorunlu).
function decodeStrict(raw) {
  const parts = raw.split('.');
  const m = /^BB(\d+)$/.exec(parts[0]);
  if (!m) throw new Error(ERR_NOT_CODE);
  const ver = Number(m[1]);
  if (ver >= 3) throw new Error(ERR_NEWER);
  if (ver < 1) throw new Error(ERR_NOT_CODE);
  if (parts.length !== 3) throw new Error(ERR_BROKEN);
  if (checksum(parts[1]) !== parts[2]) throw new Error(ERR_BROKEN);
  let d;
  try { d = fromB64(parts[1]); } catch (e) { throw new Error('Kodun içeriği okunamadı. Karşı taraftan kodu yeniden göndermesini iste.'); }
  const okReq = d && d.t === 'req' && Number.isFinite(d.amt) && d.amt > 0 && (d.dir === 'lent' || d.dir === 'owe') && (ver === 1 || isCur(d.cur));
  if (!d || d.v !== ver || typeof d.id !== 'string' || !d.id || !(okReq || d.t === 'ack')) throw new Error(ERR_INVALID);
  if (ver === 1 && d.t === 'req') d.cur = 'TRY';
  return d;
}

// Kodu çözer; sorun varsa Türkçe açıklamalı Error fırlatır. Kodun yanına mesaj da yapıştırılmış olabilir:
// 1) metinde kod biçimi aranır, 2) ilk "BBn." işaretinden sona kadar boşluksuz denenir, 3) tüm boşluklar silinip denenir.
function decodeCode(text) {
  const src = String(text || '');
  if (!src.trim()) throw new Error('Kod alanı boş. Karşı tarafın gönderdiği kodu yapıştır.');
  const tries = [];
  const found = src.match(/BB[0-9]\.[A-Za-z0-9_-]+\.[A-Za-z0-9]{4}/);
  if (found) tries.push(found[0]);
  const at = src.search(/BB[0-9]\./);
  if (at >= 0) { // kod satır ortasından bölünmüş olabilir: boşlukları sil, sondaki fazladan metni at
    const compact = src.slice(at).replace(/\s+/g, ''), head = compact.match(/^BB[0-9]\.[A-Za-z0-9_-]+\.[A-Za-z0-9]{4}/);
    tries.push(head ? head[0] : compact);
  }
  tries.push(src.replace(/\s+/g, ''));
  let best = null;
  for (let i = 0; i < tries.length; i++) {
    try { return decodeStrict(tries[i]); } catch (e) {
      // Kullanıcıya en açıklayıcı hatayı göster: işaretten sonrası, yoksa tüm metin
      if (best === null || (at >= 0 && i === tries.length - 2) || (at < 0 && i === tries.length - 1)) best = e;
    }
  }
  throw best;
}

/* ---- Kayıt işlemleri (state = {me, records}) ---- */
const paidSum = (r) => roundCur(r.payments.reduce((s, p) => s + p.amt, 0), curOf(r));
const remaining = (r) => Math.max(0, roundCur(r.amount - paidSum(r), curOf(r)));
// Ekranda yön adı yalnızca burada üretilir.
const dirText = (r) => (r.dir === 'lent' ? 'Borç ver' : 'Borç al');
const dirVerb = (r) => (r.dir === 'lent' ? 'Borç verdin' : 'Borç aldın');

function createRecord(state, f) {
  if (!f.person || !f.person.trim()) throw new Error('Kişi adını yaz.');
  if (f.dir !== 'lent' && f.dir !== 'owe') throw new Error('Borç ver mi, borç al mı? Birini seç.');
  const cur = f.cur === undefined || f.cur === null || f.cur === '' ? 'TRY' : f.cur;
  if (!isCur(cur)) throw new Error('Para birimi geçersiz. TL, Dolar, Euro ya da Altın seç.');
  const raw = typeof f.amount === 'string' ? parseAmount(f.amount) : Number(f.amount);
  const amount = roundCur(raw, cur);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Tutar sıfırdan büyük olmalı.');
  const rec = { id: newId(), person: f.person.trim(), amount, cur, dir: f.dir,
    note: (f.note || '').trim(), date: f.date || nowISO().slice(0, 10), status: 'pending', role: 'creator',
    payments: [], history: [{ t: nowISO(), text: `${dirVerb({ dir: f.dir })}, karşı tarafın onayı bekleniyor.` }] };
  state.records.unshift(rec);
  return rec;
}
// Onay Kodu: kaydı oluşturan kişinin bakışıyla yazılır. Her zaman BB2.
const requestCode = (rec, me) => encodeCode({ v: 2, t: 'req', id: rec.id, from: me || '', amt: rec.amount, cur: curOf(rec), dir: rec.dir, note: rec.note, date: rec.date });
const ackCode = (rec, me) => encodeCode({ v: 2, t: 'ack', id: rec.id, by: me || '', at: rec.confirmedAt });

// Karşı taraf: Onay Kodu'nu kabul eder, kendi telefonunda ters yönlü kayıt açar.
function acceptRequest(state, d) {
  if (d.t !== 'req') throw new Error('Bu bir Yanıt Kodu. Onaylamak için karşı tarafın "Onay Kodu"na ihtiyacın var.');
  if (state.records.some((r) => r.id === d.id)) throw new Error('Bu kayıt zaten bu telefonda var. Onay Kodu, karşı tarafın telefonunda kullanılmalı.');
  const cur = d.cur || 'TRY', dir = d.dir === 'lent' ? 'owe' : 'lent';
  const rec = { id: d.id, person: (d.from || '').trim() || 'Adsız kişi', amount: roundCur(d.amt, cur), cur, dir,
    note: d.note || '', date: d.date || nowISO().slice(0, 10), status: 'confirmed', role: 'acceptor', confirmedAt: nowISO(),
    payments: [], history: [{ t: nowISO(), text: `Kaydı onayladın. Senin tarafın: ${dirText({ dir })}.` }] };
  state.records.unshift(rec);
  return rec;
}
// Kaydı oluşturan taraf: Yanıt Kodu ile kaydı "Onaylandı" yapar (id ile eşleşir; birim kontrolü gerekmez).
function applyAck(state, d) {
  if (d.t !== 'ack') throw new Error('Bu bir Onay Kodu. Yanıt Kodu, onaylayan kişinin ürettiği koddur.');
  const rec = state.records.find((r) => r.id === d.id);
  if (!rec) throw new Error('Bu Yanıt Kodu\'na ait kayıt bu telefonda yok. Kodu, kaydı oluşturan telefonda yapıştırmalısın.');
  if (rec.role === 'acceptor') throw new Error('Bu kaydı sen onayladın. Yanıt Kodu\'nu kaydı oluşturan kişiye göndermelisin.');
  if (rec.status !== 'pending') throw new Error('Bu kayıt zaten onaylanmış.');
  rec.status = 'confirmed'; rec.confirmedAt = d.at || nowISO();
  rec.history.push({ t: nowISO(), text: `${d.by || rec.person} kaydı onayladı.` });
  return rec;
}
// Ödeme ekle (kısmi olabilir). Kalan 0 olunca "Ödendi".
function addPayment(rec, amt) {
  const cur = curOf(rec);
  amt = roundCur(typeof amt === 'string' ? parseAmount(amt) : Number(amt), cur);
  if (rec.status === 'pending') throw new Error('Kayıt onaylanmadan ödeme eklenemez.');
  if (!Number.isFinite(amt) || amt <= 0) throw new Error('Ödeme tutarı sıfırdan büyük olmalı.');
  if (amt > remaining(rec) + 0.5 / 10 ** digitsOf(cur)) throw new Error('Ödeme, kalan borçtan fazla olamaz.');
  rec.payments.push({ amt, date: nowISO() });
  const done = remaining(rec) === 0;
  if (done) rec.status = 'paid';
  rec.history.push({ t: nowISO(), text: done ? `${fmt(amt, cur)} ödendi, borç kapandı.` : `${fmt(amt, cur)} kısmi ödeme eklendi.` });
  return rec;
}

/* ---- Toplamlar: birim birim, asla birbirine eklenmez ---- */
// Yalnızca onaylı kayıtlar net'e girer. Bekleyenler pending* alanlarında ayrı tutulur.
// Eski testlerle uyum için üst düzeyde lent/owe/net = TL alanlarıdır.
function totals(state) {
  const byCur = {}; let pending = 0;
  const slot = (c) => byCur[c] || (byCur[c] = { lent: 0, owe: 0, net: 0, pendingLent: 0, pendingOwe: 0, pendingCount: 0 });
  state.records.forEach((r) => {
    const c = curOf(r), t = slot(c);
    if (r.status === 'pending') {
      pending++; t.pendingCount++;
      if (r.dir === 'lent') t.pendingLent += r.amount; else t.pendingOwe += r.amount;
    } else if (r.dir === 'lent') t.lent += remaining(r); else t.owe += remaining(r);
  });
  Object.keys(byCur).forEach((c) => {
    const t = byCur[c];
    ['lent', 'owe', 'pendingLent', 'pendingOwe'].forEach((k) => { t[k] = roundCur(t[k], c); });
    t.net = roundCur(t.lent - t.owe, c);
  });
  const T = byCur.TRY || { lent: 0, owe: 0, net: 0 };
  return { byCur, pending, lent: T.lent, owe: T.owe, net: T.net };
}
// Hareketli (alacağı ya da borcu sıfır olmayan) birimler, sabit sırayla
const activeUnits = (t) => CUR_ORDER.filter((c) => t.byCur[c] && (t.byCur[c].lent || t.byCur[c].owe));

// Kişi başına birim bazlı net: {name, net:{TRY:..., USD:...}, recs}
function groupByPerson(state) {
  const map = new Map();
  state.records.forEach((r) => {
    const k = r.person.toLocaleLowerCase('tr'), c = curOf(r);
    if (!map.has(k)) map.set(k, { name: r.person, net: {}, recs: [] });
    const g = map.get(k); g.recs.push(r);
    if (g.net[c] === undefined) g.net[c] = 0;
    if (r.status !== 'pending') g.net[c] = roundCur(g.net[c] + (r.dir === 'lent' ? 1 : -1) * remaining(r), c);
  });
  return [...map.values()];
}

// "≈ ₺ karşılığı": yalnızca onaylı net üzerinden, elle girilen kurla. Bir kur eksikse sayı VERİLMEZ.
// Sonuç: {kind:'none'} (yalnızca TL) | {kind:'missing', missing:[...]} | {kind:'ok', value}
function tryEquivalent(t, rates) {
  const used = CUR_ORDER.filter((c) => c !== 'TRY' && t.byCur[c] && (t.byCur[c].lent || t.byCur[c].owe));
  if (!used.length) return { kind: 'none' };
  const missing = used.filter((c) => !(rates && rates[c] > 0));
  if (missing.length) return { kind: 'missing', missing };
  let sum = t.byCur.TRY ? t.byCur.TRY.net : 0;
  used.forEach((c) => { sum += t.byCur[c].net * rates[c]; });
  return { kind: 'ok', value: roundCur(sum, 'TRY') };
}

/* ---- Paylaşım metinleri ve bağlantıları (şartname bölüm 7) ---- */
function shareMessage(kind, o) {
  const name = (o.name || '').trim() || 'Bir arkadaşın';
  if (kind === 'ack') {
    return `${name} kaydı onayladı. BorcumBorç uygulamasında "Onayla" sekmesine dokunup alttaki kodu yapıştırırsan kayıt onaylanmış olur.\nKod:\n${o.code}`;
  }
  return `${name} seninle ${o.amountText} tutarında bir borç kaydı oluşturdu. BorcumBorç uygulamasında alttaki "Onayla" sekmesine dokun, kodu yapıştır, bilgileri kontrol edip "Onaylıyorum"a bas. Uygulaman yoksa: ${APP_URL}\nKod:\n${o.code}`;
}
const smsMessage = (code) => `BorcumBorç kodu (Onayla sekmesine yapıştır): ${code}`;
// app: 'whatsapp' | 'telegram' | 'sms'. Değerler encodeURIComponent ile kodlanır (satır sonu %0A).
function shareUrl(app, message) {
  const e = encodeURIComponent;
  if (app === 'whatsapp') return `https://wa.me/?text=${e(message)}`;
  if (app === 'telegram') return `https://t.me/share/url?url=${e(APP_URL)}&text=${e(message)}`;
  if (app === 'sms') return `sms:?body=${e(message)}`;
  return '';
}

/* ---- Ayarlar ---- */
function normalizeSettings(s) {
  const d = { sound: true, volume: 70, haptic: true, rates: { USD: null, EUR: null, XAU: null, updatedAt: null }, lastCur: 'TRY' };
  if (!s || typeof s !== 'object') return d;
  if (typeof s.sound === 'boolean') d.sound = s.sound;
  if (typeof s.haptic === 'boolean') d.haptic = s.haptic;
  if (Number.isFinite(s.volume)) d.volume = Math.max(0, Math.min(100, Math.round(s.volume)));
  if (isCur(s.lastCur)) d.lastCur = s.lastCur;
  if (s.rates && typeof s.rates === 'object') {
    ['USD', 'EUR', 'XAU'].forEach((c) => { if (Number.isFinite(s.rates[c]) && s.rates[c] > 0) d.rates[c] = s.rates[c]; });
    if (typeof s.rates.updatedAt === 'string') d.rates.updatedAt = s.rates.updatedAt;
  }
  return d;
}

// Dışa aktarılan JSON'un şekil kontrolü. cur yoksa kabul (TL sayılır), bilinmeyen cur reddedilir.
function validImport(data) {
  return !!data && Array.isArray(data.records) && data.records.every((r) => r && typeof r.id === 'string' && r.person
    && Number.isFinite(r.amount) && ['lent', 'owe'].includes(r.dir) && ['pending', 'confirmed', 'paid'].includes(r.status)
    && Array.isArray(r.payments) && (r.cur === undefined || isCur(r.cur)));
}

if (typeof module !== 'undefined') {
  module.exports = { encodeCode, decodeCode, createRecord, requestCode, ackCode, acceptRequest, applyAck, addPayment, totals, groupByPerson,
    remaining, validImport, CURRENCIES, CUR_ORDER, roundCur, fmt, sign, fmtPlain, spoken, parseAmount, sanitizeAmount, formatAmountInput,
    activeUnits, tryEquivalent, shareMessage, smsMessage, shareUrl, normalizeSettings, dirText, dirVerb, APP_URL };
}

/* ================= 2) ARAYÜZ ================= */
if (typeof document !== 'undefined') (function ui() {
  const Snd = window.BBSound, Nat = window.BBNative, Intro = window.BBIntro;
  const $app = document.getElementById('app'), $nav = document.getElementById('nav');

  /* ---- Durum ve ayarlar ---- */
  let state = { me: '', records: [] };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (validImport(s)) state = { me: s.me || '', records: s.records }; } catch (e) { /* bozuk veri: boş başla */ }
  let settings;
  try { settings = normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY))); } catch (e) { settings = normalizeSettings(null); }
  Snd.setConfig(settings); // ses motoru aynı nesneyi okur: ayar değişince anında geçerli olur

  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast('Kayıt bu telefona yazılamadı. Depolama dolu olabilir.', 'uyari'); } };
  const save = () => store(KEY, state);
  const saveSettings = () => store(SETTINGS_KEY, settings);

  /* ---- Küçük yardımcılar ---- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toDate = (iso) => new Date(/^\d{4}-\d\d-\d\d$/.test(iso) ? iso + 'T12:00:00' : iso);
  const fdate = (iso) => toDate(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const ftime = (iso) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const ic = (name, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="assets/icons.svg#${name}"/></svg>`;
  const STATUS = { pending: ['Onay bekliyor', 'saat'], confirmed: ['Onaylandı', 'onayla'], paid: ['Ödendi', 'tamam-cift'] };
  const badge = (s) => `<span class="badge ${s}">${ic(STATUS[s][1])}${STATUS[s][0]}</span>`;
  const cls = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : 'zero');
  // Tutar: görünen metin (işaret + renk) ve ekran okuyucu için birimli metin
  const amt = (n, cur, extra) => `<span class="amt ${cls(n)} ${extra || ''}"><span aria-hidden="true">${esc(sign(n, cur))}</span><span class="sr-only">${esc(spoken(n, cur, true))}</span></span>`;
  const dirIc = (r, c) => ic(r.dir === 'lent' ? 'borc-ver' : 'borc-al', c);
  const backBtn = `<button class="back" type="button" data-act="back" aria-label="Geri">${ic('geri')}</button>`;
  const errBox = (m) => `<div class="error" role="alert">${ic('uyari')}<span>${esc(m)}</span></div>`;
  const curChip = (c) => `<span class="cur-chip">${ic(CURRENCIES[c].icon)}</span>`;

  function toast(msg, icon) {
    const t = document.getElementById('toast');
    t.innerHTML = ic(icon || 'tamam-cift') + '<span></span>';
    t.lastChild.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---- Ana ekran ---- */
  const unitList = (t, key) => CUR_ORDER.filter((c) => t.byCur[c] && t.byCur[c][key] > 0).map((c) => fmt(t.byCur[c][key], c));

  function netCard(t) {
    const act = activeUnits(t), hasConfirmed = state.records.some((r) => r.status !== 'pending');
    // Ekran okuyucu: tek cümlelik özet ("Türk lirası artı 1.200, dolar eksi 20")
    const word = (c) => { const n = t.byCur[c].net; return `${CURRENCIES[c].long} ${n < 0 ? 'eksi' : 'artı'} ${numFmt(Math.abs(n), 0, digitsOf(c))}`; };
    const label = 'Onaylı net durum: ' + (hasConfirmed ? (act.length ? act.map(word).join(', ') : 'hesap denk') : 'henüz onaylı kayıt yok')
      + '.' + (t.pending ? ` Onay bekleyen ${t.pending} kayıt.` : '');
    let h = `<section class="card net" role="group" aria-label="${esc(label)}"><div class="net-title">${ic('cuzdan')}<span>Onaylı net durum</span></div>`;
    if (!hasConfirmed) {
      h += '<p class="net-none">Henüz onaylı kayıt yok</p>';
    } else if (act.length <= 1) {
      const c = act[0] || 'TRY', u = t.byCur[c] || { lent: 0, owe: 0, net: 0 };
      h += `<div class="net-big">${u.net === 0 ? `<span class="amt zero"><span aria-hidden="true">${esc(fmt(0, c))}</span></span><span class="denk">Hesap denk</span>`
        : `${ic(u.net > 0 ? 'borc-ver' : 'borc-al', 'dirmark ' + cls(u.net))}${amt(u.net, c)}`}</div>
        <div class="split"><div><b class="${cls(u.lent)}">${esc(sign(u.lent, c))}</b><span>Alacağın</span></div><div><b class="${cls(-u.owe)}">${esc(sign(-u.owe, c))}</b><span>Borcun</span></div></div>`;
    } else {
      h += '<ul class="units">' + act.map((c) => {
        const u = t.byCur[c];
        return `<li class="unit">${curChip(c)}<b class="un">${CURRENCIES[c].name}</b>
          <div class="unit-net">${ic(u.net >= 0 ? 'borc-ver' : 'borc-al', 'dirmark ' + cls(u.net))}${amt(u.net, c, 'mid')}</div>
          <span class="sub">Alacak ${esc(fmt(u.lent, c))} · Borç ${esc(fmt(u.owe, c))}</span></li>`;
      }).join('') + '</ul>';
    }
    // ₺ karşılığı
    if (hasConfirmed) {
      const eq = tryEquivalent(t, settings.rates);
      if (eq.kind === 'ok') h += `<div class="eq">${ic('kur')}<span>≈ ${esc(fmt(eq.value, 'TRY'))} (elle girilen kura göre)</span></div>`;
      else if (eq.kind === 'missing') {
        const names = eq.missing.map((c) => CURRENCIES[c].name);
        const who = names.length === 1 ? names[0] + ' kuru' : names.slice(0, -1).join(', ') + ' ve ' + names[names.length - 1] + ' kurları';
        h += `<div class="eq">${ic('kur')}<span>₺ karşılığı için ${who} gerekli</span><a class="inline-btn" href="#/settings">Kur gir</a></div>`;
      }
    }
    return h + '</section>';
  }

  function pendingRow(t) {
    if (!t.pending) return '';
    const l = unitList(t, 'pendingLent'), o = unitList(t, 'pendingOwe');
    const sub = [l.length ? 'Alacak ' + l.join(', ') : '', o.length ? 'Borç ' + o.join(', ') : ''].filter(Boolean).join(' · ');
    return `<div class="pend">${ic('saat')}<div><b>Onay bekleyen · ${t.pending} kayıt</b><span>${esc(sub)}</span></div></div>`;
  }

  function groupNet(g) {
    const units = CUR_ORDER.filter((c) => g.net[c] !== undefined && g.net[c] !== 0);
    if (!units.length) return `<span class="amt zero"><span aria-hidden="true">${esc(fmt(0, CUR_ORDER.find((c) => g.net[c] !== undefined)))}</span></span>`;
    let h = units.slice(0, 2).map((c) => amt(g.net[c], c)).join('');
    if (units.length > 2) h += `<span class="more">+${units.length - 2}</span>`;
    return h;
  }

  function home() {
    const t = totals(state), groups = groupByPerson(state);
    const hello = state.me ? `Merhaba, ${esc(state.me.split(' ')[0])}` : 'BorcumBorç';
    let h = `<div class="view"><div class="top"><img src="assets/mark.svg" alt="" width="32" height="36"><h1>${hello}</h1></div>`;
    if (!state.records.length) {
      return h + `<div class="card empty">
        <div class="empty-art" aria-hidden="true">${ic('cuzdan')}</div>
        <h2>Henüz kayıt yok</h2>
        <p class="note">Borç verdin ya da aldın mı? İkinizin onayıyla kayda geçir. İnternet gerekmez.</p>
        <a class="btn" href="#/new">${ic('yeni')}İlk kaydını oluştur</a><a class="btn ghost" href="#/confirm">${ic('kod')}Elimde bir kod var</a></div></div>`;
    }
    h += netCard(t) + pendingRow(t);
    groups.forEach((g) => {
      h += `<section class="card"><div class="group-head"><div class="avatar" aria-hidden="true">${esc(g.name.charAt(0).toLocaleUpperCase('tr'))}</div><h2 class="gname">${esc(g.name)}</h2><div class="gnet">${groupNet(g)}</div></div>`;
      g.recs.forEach((r) => {
        const c = curOf(r), v = remaining(r) || r.amount;
        h += `<div class="row" data-go="#/r/${r.id}" role="link" tabindex="0"><span class="dir-ic ${r.dir}">${dirIc(r)}</span>
          <div class="grow"><div class="t">${esc(r.note || dirText(r))}</div><div class="s">${dirText(r)} · ${fdate(r.date)}</div></div>
          <div class="rcol">${amt(r.dir === 'lent' ? v : -v, c)}${badge(r.status)}</div></div>`;
      });
      h += '</section>';
    });
    return h + '</div>';
  }

  /* ---- Kod paylaşım bileşeni (Onay Kodu, Yanıt Kodu ve detaydaki kodlar için ortak) ---- */
  let currentShare = null; // {kind, code, name, amountText}: ekrandaki kod paneli
  const SHARE_APPS = [['whatsapp', 'WhatsApp', 'whatsapp'], ['telegram', 'Telegram', 'telegram'], ['sms', 'SMS', 'sms'], ['other', 'Diğer', 'paylas']];
  function codePanel(kind, code, rec, ghost) {
    currentShare = { kind, code, name: state.me, amountText: fmtPlain(rec.amount, curOf(rec)) };
    return `<div class="codepanel">
      <div class="code" id="codeText" data-act="selcode" tabindex="0" aria-label="Kod">${ic('kod')}<span>${esc(code)}</span></div>
      <button class="btn${ghost ? ' ghost' : ''}" type="button" data-act="copy" id="copyBtn">${ic('kopyala')}<span>Kodu kopyala</span></button>
      <h3 class="sh">Kodu gönder</h3>
      <div class="share-grid">${SHARE_APPS.map(([id, name, icon]) => `<button class="btn ghost share" type="button" data-act="share" data-app="${id}">${ic(icon)}<span>${name}</span></button>`).join('')}</div>
      <p class="note small">SMS birkaç parça olarak gidebilir.</p>
      <div id="shareStatus" role="status"></div></div>`;
  }
  function selectCode() { const el = document.getElementById('codeText'); if (el) { const r = document.createRange(); r.selectNodeContents(el.querySelector('span')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } }
  const setStatus = (html) => { const el = document.getElementById('shareStatus'); if (el) el.innerHTML = html; };

  async function doCopy() {
    Snd.claim();
    const btn = document.getElementById('copyBtn');
    const ok = await Nat.copyText(currentShare.code);
    if (ok) {
      Snd.play('copy'); toast('Kod kopyalandı', 'kopyala');
      btn.innerHTML = ic('tamam-cift') + '<span>Kopyalandı</span>';
      clearTimeout(doCopy.t); doCopy.t = setTimeout(() => { if (document.body.contains(btn)) btn.innerHTML = ic('kopyala') + '<span>Kodu kopyala</span>'; }, 2000);
    } else { selectCode(); setStatus(`<div class="statusbox">${ic('bilgi')}<p>Kodu uzun basıp kopyalayabilirsin.</p></div>`); Snd.play('error'); }
  }

  // Paylaşım: önce mesajın tamamı panoya, sonra uygulama açılır. Açılmazsa yedek kutu çıkar.
  async function shareVia(app) {
    Snd.claim();
    const s = currentShare, full = shareMessage(s.kind, { name: s.name, amountText: s.amountText, code: s.code });
    const text = app === 'sms' ? smsMessage(s.code) : full;
    const appName = (SHARE_APPS.find((a) => a[0] === app) || [])[1];
    setStatus('');
    const copied = await Nat.copyText(text);
    if (copied) toast('Mesaj kopyalandı', 'kopyala'); else selectCode();
    const copyNote = copied ? 'Mesajı kopyaladım; uygulamayı kendin aç ve yapıştır.' : 'Kodu uzun basıp kopyalayabilirsin.';
    if (app === 'other') {
      const r = await Nat.share({ title: 'BorcumBorç', text: full, dialogTitle: 'Kodu gönder' });
      if (r === 'unsupported' || r === 'failed') setStatus(`<div class="statusbox">${ic('bilgi')}<p>Paylaşım menüsü açılmadı. ${copyNote}</p></div>`);
      return; // 'cancelled' ve 'shared': ek bir şey gösterme
    }
    let opened = false;
    const mark = () => { opened = true; };
    const onVis = () => { if (document.hidden) mark(); };
    window.addEventListener('blur', mark); window.addEventListener('pagehide', mark); document.addEventListener('visibilitychange', onVis);
    Nat.openUrl(shareUrl(app, text));
    setTimeout(() => {
      window.removeEventListener('blur', mark); window.removeEventListener('pagehide', mark); document.removeEventListener('visibilitychange', onVis);
      if (!opened) setStatus(`<div class="statusbox">${ic('bilgi')}<p>${appName} açılmadı. ${copyNote}</p><button class="btn ghost small" type="button" data-act="share" data-app="${app}">Tekrar dene</button></div>`);
    }, 1500);
  }

  /* ---- Yeni kayıt ---- */
  const dirHelp = { lent: 'Karşı tarafa para verdim.', owe: 'Karşı taraftan para aldım.' };
  function newRecord(created) {
    if (created) { // kayıt sonrası: Onay Kodu hazır ekranı
      const c = curOf(created);
      return `<div class="view"><div class="top">${backBtn}<h1>Onay Kodu hazır</h1></div>
        <p class="lead">${esc(created.person)} için ${esc(fmt(created.amount, c))} ${created.dir === 'lent' ? 'borç verdin' : 'borç aldın'}. Kodu ona gönder.</p>
        <div>${badge('pending')}</div>
        ${codePanel('req', requestCode(created, state.me), created)}
        <a class="btn ghost" href="#/confirm">Yanıt Kodu'nu yapıştır</a><a class="btn text" href="#/">Ana ekrana dön</a></div>`;
    }
    const today = new Date().toISOString().slice(0, 10), sel = settings.lastCur, cm = CURRENCIES[sel];
    return `<div class="view"><div class="top"><h1>Yeni kayıt</h1></div>
      ${state.me ? '' : `<div class="notice">${ic('uyari')}<div><p>Adın boş. Karşı taraf seni tanısın diye Ayarlar'dan ad soyadını yaz.</p><a class="btn ghost small" href="#/settings">Ayarlar'ı aç</a></div></div>`}
      <form class="form" data-form="new" autocomplete="off" novalidate>
        <fieldset class="field"><legend>Ne yaptın?</legend>
          <div class="seg" role="radiogroup" aria-describedby="err-dir dirHelp">
            <input class="vh" type="radio" name="dir" id="dir-lent" value="lent"><label class="dirbtn lent" for="dir-lent">${ic('borc-ver')}<span>Borç ver</span></label>
            <input class="vh" type="radio" name="dir" id="dir-owe" value="owe"><label class="dirbtn owe" for="dir-owe">${ic('borc-al')}<span>Borç al</span></label>
          </div>
          <p class="note" id="dirHelp"></p><div class="field-err" id="err-dir" hidden></div></fieldset>
        <div class="field"><label for="person">Kişi adı</label><input id="person" name="person" type="text" autocapitalize="words" autocomplete="off" enterkeyhint="next" maxlength="40" placeholder="Örn. Ayşe" aria-describedby="err-person"><div class="field-err" id="err-person" hidden></div></div>
        <fieldset class="field"><legend>Para birimi</legend>
          <div class="chips" role="radiogroup">${CUR_ORDER.map((c) => `<input class="vh" type="radio" name="cur" id="cur-${c}" value="${c}"${c === sel ? ' checked' : ''}><label class="chip" for="cur-${c}">${ic(CURRENCIES[c].icon)}<span>${CURRENCIES[c].name}</span></label>`).join('')}</div></fieldset>
        <div class="field"><label for="amount">Tutar<span class="sr-only" id="amtUnit">, ${cm.long}</span></label>
          <div class="amt-wrap"><span class="sym" id="amtSym" aria-hidden="true">${cm.sym}</span><input id="amount" name="amount" type="text" inputmode="decimal" enterkeyhint="next" autocomplete="off" placeholder="0,00" data-amount aria-describedby="err-amount"></div>
          <div class="field-err" id="err-amount" hidden></div></div>
        <div class="field"><label for="note">${ic('not')}Not <span class="opt">(isteğe bağlı)</span></label><input id="note" name="note" type="text" enterkeyhint="done" maxlength="80" placeholder="Örn. Akşam yemeği"></div>
        <div class="field"><label for="date">${ic('takvim')}Tarih</label><input id="date" name="date" type="date" value="${today}" aria-describedby="err-date"><div class="field-err" id="err-date" hidden></div></div>
        <div id="msg"></div>
        <div class="sticky-act"><button class="btn" type="submit">Kaydet ve kod üret</button></div></form></div>`;
  }

  /* ---- Onayla (kod yapıştır) ---- */
  function confirmView(pending, ackDone, rec) {
    let body;
    if (ackDone) {
      body = `<div class="card done"><div class="done-art" aria-hidden="true">${ic('el-sikisma')}</div><h2>Onayladın</h2>
        <p class="note">Kayıt bu telefona eklendi. Şimdi bu Yanıt Kodu'nu karşı tarafa gönder; o yapıştırınca kayıt onaylanmış olur.</p></div>
        ${codePanel('ack', ackDone, rec)}<a class="btn text" href="#/">Ana ekrana dön</a>`;
    } else if (pending) {
      const d = pending, c = d.cur || 'TRY', mine = d.dir === 'lent' ? 'owe' : 'lent', who = d.from || 'Adsız kişi';
      body = `<p class="lead">${esc(who)} ${d.dir === 'lent' ? `sana ${esc(fmt(d.amt, c))} borç verdi.` : `senden ${esc(fmt(d.amt, c))} borç aldı.`}</p>
        <section class="card summary"><dl><dt>Kişi</dt><dd>${esc(who)}</dd>
        <dt>Tutar</dt><dd><span class="sr-only">${esc(spoken(d.amt, c))}</span><span aria-hidden="true">${esc(fmt(d.amt, c))}</span></dd>
        <dt>Senin tarafın</dt><dd class="side ${mine}">${ic(mine === 'lent' ? 'borc-ver' : 'borc-al')}${dirText({ dir: mine })}</dd>
        <dt>Not</dt><dd>${esc(d.note || '-')}</dd><dt>Tarih</dt><dd>${esc(d.date ? fdate(d.date) : '-')}</dd></dl></section>
        <p class="note">Bilgiler doğruysa onayla. Yanlışsa onaylama ve karşı tarafa söyle.</p>
        <div class="actions"><button class="btn" type="button" data-act="accept">${ic('onayla')}Onaylıyorum</button><button class="btn ghost" type="button" data-act="cancel">Vazgeç</button></div>`;
    } else {
      body = `<form class="form" data-form="code" novalidate><div class="field"><div class="label-row"><label for="code">Kod</label>
        <button class="btn ghost small" type="button" data-act="paste">${ic('kopyala')}Panodan yapıştır</button></div>
        <textarea id="code" name="code" placeholder="BB2.…" spellcheck="false" autocapitalize="none" autocorrect="off" autocomplete="off"></textarea></div>
        <p class="note">Karşı tarafın gönderdiği Onay Kodu'nu ya da senin kaydına gelen Yanıt Kodu'nu yapıştır.</p>
        <div id="msg"></div><div class="sticky-act"><button class="btn" type="submit">Kodu kontrol et</button></div></form>`;
    }
    return `<div class="view"><div class="top"><h1>Onayla</h1></div>${body}</div>`;
  }

  /* ---- Kayıt detayı ---- */
  function detail(id) {
    const r = state.records.find((x) => x.id === id);
    if (!r) return `<div class="view"><div class="top">${backBtn}<h1>Kayıt bulunamadı</h1></div><p class="note">Bu kayıt bu telefonda yok. Ana ekrana dönüp listeden seç.</p><a class="btn ghost" href="#/">Ana ekrana dön</a></div>`;
    const c = curOf(r), rem = remaining(r), pct = Math.min(100, Math.round((paidSum(r) / r.amount) * 100));
    let h = `<div class="view"><div class="top">${backBtn}<h1>${esc(r.person)}</h1>${badge(r.status)}</div>
      <section class="card hero ${r.dir}"><div class="hero-label">${dirIc(r)}<span>${dirVerb(r)}</span></div>
        <div class="big"><span class="sr-only">${esc(spoken(r.amount, c))}</span><span aria-hidden="true">${esc(fmt(r.amount, c))}</span></div>
        <div class="bar" role="progressbar" aria-label="Ödenen oran" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
        <p class="hero-sub">Kalan ${esc(fmt(rem, c))} · ödenen ${esc(fmt(paidSum(r), c))}</p></section>
      <section class="card summary"><dl><dt>${ic('not')}Not</dt><dd>${esc(r.note || '-')}</dd><dt>${ic('takvim')}Tarih</dt><dd>${fdate(r.date)}</dd><dt>${ic(CURRENCIES[c].icon)}Birim</dt><dd>${CURRENCIES[c].label}</dd></dl></section>`;
    if (r.status === 'pending') {
      h += `<section class="card"><h2 class="ch">Onay bekliyor</h2><p class="note">Onay Kodu'nu karşı tarafa gönder, gelen Yanıt Kodu'nu Onayla ekranına yapıştır.</p>${codePanel('req', requestCode(r, state.me), r)}</section>
        <a class="btn ghost" href="#/confirm">Yanıt Kodu'nu yapıştır</a>`;
    } else if (r.status === 'confirmed') {
      h += `<form class="card" data-form="pay" data-id="${r.id}" novalidate><h2 class="ch">${ic('cuzdan')}Ödeme ekle</h2>
        <div class="field"><label for="payamt" class="sr-only">Ödeme tutarı, ${CURRENCIES[c].long}</label><div class="amt-wrap"><span class="sym" aria-hidden="true">${CURRENCIES[c].sym}</span>
        <input id="payamt" name="amt" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-amount data-cur="${c}" placeholder="Kısmi ödeme tutarı"></div></div>
        <div id="msg"></div><button class="btn ghost" type="submit">${ic('yeni')}Kısmi ödeme ekle</button></form>
        <button class="btn" type="button" data-act="payall" data-id="${r.id}">${ic('tamam-cift')}Ödendi olarak işaretle</button>`;
      if (r.role === 'acceptor') h += `<section class="card"><h2 class="ch">Yanıt Kodu'nu yeniden gönder</h2>${codePanel('ack', ackCode(r, state.me), r, true)}</section>`;
    }
    h += `<section class="card"><h2 class="ch">${ic('saat')}Geçmiş</h2><ul class="hist">${[...r.history].reverse().map((x) => `<li>${esc(x.text)}<small>${ftime(x.t)}</small></li>`).join('')}</ul></section>
      <button class="btn danger del" type="button" data-act="del" data-id="${r.id}">${ic('cop')}Kaydı sil</button></div>`;
    return h;
  }

  /* ---- Ayarlar ---- */
  const rateNum = (c) => (settings.rates[c] ? numFmt(settings.rates[c], 2, c === 'XAU' ? 2 : 4) : '');
  const RATE_ROWS = [['USD', '1 $ ='], ['EUR', '1 € ='], ['XAU', '1 gr altın =']];
  const sw = (id, on, labelId, act) => `<button class="switch" type="button" role="switch" id="${id}" aria-checked="${on}" aria-labelledby="${labelId}" data-act="${act}"><span class="knob"></span></button>`;
  function ratesStale() {
    const u = settings.rates.updatedAt;
    return !!u && CUR_ORDER.some((c) => c !== 'TRY' && settings.rates[c]) && Date.now() - Date.parse(u) > 7 * 864e5;
  }
  function settingsView() {
    return `<div class="view"><div class="top"><h1>Ayarlar</h1></div>
      <form class="card" data-form="me" novalidate><h2 class="ch">Ad soyad</h2><div class="field"><label for="me" class="note-l">Kodun içinde karşı tarafa görünür</label>
        <input id="me" name="me" type="text" autocapitalize="words" autocomplete="off" maxlength="40" value="${esc(state.me)}" placeholder="Örn. Fatih Yılmaz"></div>
        <button class="btn" type="submit">Kaydet</button></form>

      <section class="card" aria-labelledby="h-snd"><h2 class="ch" id="h-snd">Ses ve titreşim</h2>
        <div class="set-row"><span class="ico" id="soundIco">${ic(settings.sound ? 'ses-acik' : 'ses-kapali')}</span><span class="lbl" id="lbl-sound">Ses<small>Dokunma ve tepki sesleri</small></span>${sw('swSound', settings.sound, 'lbl-sound', 'sw-sound')}</div>
        <div class="set-row vol"><span class="lbl" id="lbl-vol">Ses seviyesi <output id="volOut">${settings.volume}</output></span>
          <div class="vol-line">${ic('ses-kapali')}<input type="range" id="vol" min="0" max="100" step="10" value="${settings.volume}" aria-labelledby="lbl-vol" style="--v:${settings.volume}%">${ic('ses-acik')}</div></div>
        <div class="set-row"><span class="ico">${ic('titresim')}</span><span class="lbl" id="lbl-haptic">Titreşim<small>Dokununca hafif titreşim</small></span>${sw('swHaptic', settings.haptic, 'lbl-haptic', 'sw-haptic')}</div>
        <button class="btn ghost" type="button" data-act="test-sound">${ic('ses-acik')}Sesi dene</button></section>

      <form class="card" data-form="rates" novalidate><h2 class="ch">${ic('kur')}Kurlar (isteğe bağlı)</h2>
        <p class="note">Dolar, euro ve altın kayıtlarının ₺ karşılığını ana ekranda görmek için elle yaz.</p>
        ${RATE_ROWS.map(([c, lab]) => `<div class="rate"><label for="rate-${c}">${lab}</label><div class="rate-in"><div class="amt-wrap"><input id="rate-${c}" name="${c}" type="text" inputmode="decimal" autocomplete="off" data-amount data-digits="${c === 'XAU' ? 2 : 4}" value="${rateNum(c)}" placeholder="0,00" aria-describedby="err-rate-${c}"><span class="sym r" aria-hidden="true">₺</span></div>
          <button class="btn ghost small" type="button" data-act="rate-clear" data-cur="${c}" aria-label="${CURRENCIES[c].name} kurunu temizle">Temizle</button></div><div class="field-err" id="err-rate-${c}" hidden></div></div>`).join('')}
        ${settings.rates.updatedAt ? `<p class="note" id="rateUpd">Son güncelleme: ${fdate(settings.rates.updatedAt)}</p>` : ''}
        ${ratesStale() ? `<div class="notice slim">${ic('uyari')}<p>Kurlar 7 günden eski.</p></div>` : ''}
        <p class="note warn">Bu kurlar senin girdiğin değerlerdir, canlı değildir.</p>
        <button class="btn ghost" type="submit">Kaydet</button></form>

      <section class="card"><h2 class="ch">Verilerin</h2><p class="note">Tüm kayıtlar yalnızca bu cihazda tutulur. Yedek almak için dışa aktar.</p>
        <div class="actions"><button class="btn ghost" type="button" data-act="export">${ic('disa-aktar')}JSON olarak dışa aktar</button>
        <button class="btn ghost" type="button" data-act="import">${ic('ice-aktar')}JSON içe aktar</button></div><input type="file" id="file" accept="application/json,.json" hidden></section>

      <section class="card"><h2 class="ch">${ic('bluetooth')}Bluetooth ile eşleşme <span class="badge soon">Yakında</span></h2>
        <p class="note info">${ic('bilgi')}<span>Bir sonraki sürümde iki telefon yakınken kod paylaşmadan, Bluetooth ile otomatik eşleşip onaylayabilecek.</span></p></section>
      <p class="version">BorcumBorç sürüm ${APP_VERSION}</p></div>`;
  }

  /* ---- Pencere (alt sayfa) bileşeni: çıkış, silme, form kaybı ---- */
  let dlg = null, skipPop = 0, lockCount = 0;
  const isNativeBack = () => !!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App);
  // Arka planı etkileşime kapat / aç (iç içe çağrılara dayanıklı)
  function lock(on) {
    lockCount = Math.max(0, lockCount + (on ? 1 : -1));
    [$app, $nav].forEach((el) => { if (lockCount > 0) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); } else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); } });
  }
  // o: {title, body, buttons:[{id,label,kind,icon}]}; ilk düğme güvenli seçenektir (Esc, karartı ve geri tuşu onu seçer).
  function openSheet(o) {
    if (dlg) return Promise.resolve(o.buttons[0].id);
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'sheet-wrap';
      wrap.innerHTML = `<div class="scrim" data-sheet="scrim"></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="dlgT" aria-describedby="dlgB"><div class="grab" aria-hidden="true"></div>
        <h2 id="dlgT">${esc(o.title)}</h2><p id="dlgB">${esc(o.body)}</p>
        <div class="sheet-btns">${o.buttons.map((b) => `<button type="button" class="btn ${b.kind || ''}" data-sheet="${b.id}">${b.icon ? ic(b.icon) : ''}${esc(b.label)}</button>`).join('')}</div></div>`;
      dlg = { el: wrap, prev: document.activeElement, resolve, safe: o.buttons[0].id };
      document.body.appendChild(wrap);
      lock(true);
      if (!isNativeBack()) history.pushState({ bbDlg: 1 }, ''); // tarayıcıda geri tuşu pencereyi kapatsın
      Snd.play('dialog');
      wrap.querySelector('button').focus();
    });
  }
  function closeSheet(value, popped) {
    if (!dlg) return;
    const d = dlg; dlg = null;
    d.el.remove(); lock(false);
    if (!popped && !isNativeBack() && history.state && history.state.bbDlg) { skipPop++; history.back(); }
    if (d.prev && d.prev.focus && document.body.contains(d.prev)) d.prev.focus({ preventScroll: true });
    d.resolve(value === undefined ? d.safe : value);
  }
  async function askExit() {
    const r = await openSheet({ title: 'Uygulamadan çıkmak istiyor musun?', body: 'Kayıtların bu telefonda güvende kalır.',
      buttons: [{ id: 'stay', label: 'Kal', kind: '' }, { id: 'exit', label: 'Çık', kind: 'ghost', icon: 'cikis' }] });
    if (r === 'exit') Nat.exitApp();
  }
  const askDelete = () => openSheet({ title: 'Bu kayıt silinsin mi?', body: 'Silersen geri alamazsın. Karşı tarafın telefonunda kaydı silmez.',
    buttons: [{ id: 'cancel', label: 'Vazgeç', kind: '' }, { id: 'delete', label: 'Sil', kind: 'danger', icon: 'cop' }] });
  async function askLeaveForm() {
    const r = await openSheet({ title: 'Yazdıkların silinecek. Çıkılsın mı?', body: 'Kayıt henüz oluşturulmadı. Çıkarsan forma yazdıkların kaybolur.',
      buttons: [{ id: 'cancel', label: 'Vazgeç', kind: '' }, { id: 'leave', label: 'Çık', kind: 'ghost', icon: 'cikis' }] });
    if (r === 'leave') location.replace('#/');
  }
  // Pencere içinde klavye: Esc = güvenli seçenek, Tab pencere içinde döner (odak tuzağı)
  document.addEventListener('keydown', (e) => {
    if (!dlg) return;
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(dlg.safe); return; }
    if (e.key !== 'Tab') return;
    const f = [...dlg.el.querySelectorAll('button')], first = f[0], last = f[f.length - 1];
    if (!dlg.el.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sheet]');
    if (b && dlg) closeSheet(b.dataset.sheet === 'scrim' ? dlg.safe : b.dataset.sheet);
  });

  /* ---- Yönlendirme ---- */
  let ctx = {}; // geçici ekran durumu (üretilen kod, çözülen kod)
  const route = () => {
    const hash = location.hash || '#/', m = hash.match(/^#\/r\/(.+)$/);
    return { page: m ? 'detail' : hash.slice(2) || 'home', id: m && m[1] };
  };
  function focusHeading() {
    const h = $app.querySelector('h1');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
  function render() {
    const { page, id } = route();
    const views = { home, new: () => newRecord(ctx.created), confirm: () => confirmView(ctx.pending, ctx.ack, ctx.rec), settings: settingsView, detail: () => detail(id) };
    $app.innerHTML = (views[page] || home)();
    const cur = page === 'detail' ? 'home' : (views[page] ? page : 'home');
    document.querySelectorAll('#nav a').forEach((a) => { const on = a.dataset.nav === cur; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (page === 'new' && !ctx.created) updateDirHelp();
    window.scrollTo(0, 0);
    if (!Intro.active() && !dlg) focusHeading();
  }
  window.addEventListener('hashchange', () => { ctx = {}; render(); });

  /* ---- Geri tuşu (şartname bölüm 8) ---- */
  function formDirty() {
    const f = $app.querySelector('form[data-form="new"]');
    if (!f) return false;
    const fd = new FormData(f);
    return !!(fd.get('dir') || (fd.get('person') || '').trim() || (fd.get('amount') || '').trim() || (fd.get('note') || '').trim());
  }
  // Android donanım geri tuşu: öncelik sırası intro > pencere > detay > sekmeler > ana ekran (çıkış penceresi)
  function onHardwareBack() {
    Snd.play('nav');
    if (Intro.active()) { Intro.skip(true); return; }
    if (dlg) { closeSheet(dlg.safe); return; }
    const { page } = route();
    if (page === 'detail') { if (history.length > 1) history.back(); else location.replace('#/'); return; }
    if (page !== 'home') { if (page === 'new' && !ctx.created && formDirty()) { askLeaveForm(); return; } location.replace('#/'); return; }
    askExit();
  }
  // Tarayıcıda: geri düğmesi (popstate) benzer davranır. Ana ekranın altına bir koruma kaydı koyarız.
  if (!Nat.onBackButton(onHardwareBack)) {
    history.replaceState({ bbGuard: 1 }, '');
    history.pushState({}, '');
    window.addEventListener('popstate', () => {
      if (skipPop > 0) { skipPop--; return; }
      if (Intro.active()) { Intro.skip(true); return; }
      if (dlg) { closeSheet(dlg.safe, true); return; }
      if (history.state && history.state.bbGuard) { history.pushState({}, ''); askExit(); } // koruma kaydına inildi: yeniden ileri it ve sor
    });
  }

  /* ---- Tutar girdisi: yazarken temizle, odaktan çıkınca tr-TR biçimi ---- */
  const amountDigits = (inp) => (inp.dataset.digits ? Number(inp.dataset.digits) : digitsOf(inp.dataset.cur || (inp.form && inp.form.querySelector('[name=cur]:checked') || {}).value || 'TRY'));
  document.addEventListener('input', (e) => {
    const inp = e.target;
    if (inp.matches && inp.matches('input[data-amount]')) {
      const v = sanitizeAmount(inp.value, amountDigits(inp));
      if (v !== inp.value) inp.value = v;
      if (inp.name) clearFieldError(inp.name);
    } else if (inp.matches && inp.matches('input[type=text],input[type=date]') && inp.name) {
      clearFieldError(inp.name); // düzeltmeye başlayınca o alanın hatası kalkar
    } else if (inp.id === 'vol') {
      inp.style.setProperty('--v', inp.value + '%'); document.getElementById('volOut').textContent = inp.value;
    }
  });
  document.addEventListener('focusin', (e) => {
    const inp = e.target;
    if (inp.matches && inp.matches('input[data-amount]')) inp.value = sanitizeAmount(inp.value, amountDigits(inp)); // "1.250,50" -> "1250,50"
    if (inp.matches && inp.matches('input[type=text],input[type=date],textarea')) document.body.classList.add('kb'); // klavye açık: alt çubuğu gizle
  });
  document.addEventListener('focusout', (e) => {
    const inp = e.target;
    if (inp.matches && inp.matches('input[data-amount]')) inp.value = formatAmountInput(inp.value, amountDigits(inp));
    setTimeout(() => { if (!document.activeElement || !document.activeElement.matches('input[type=text],input[type=date],textarea')) document.body.classList.remove('kb'); }, 50);
  });
  function updateDirHelp() {
    const f = $app.querySelector('form[data-form="new"]'); if (!f) return;
    const d = f.querySelector('[name=dir]:checked'), el = document.getElementById('dirHelp');
    if (el) el.textContent = d ? dirHelp[d.value] : '';
  }
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'dir') { updateDirHelp(); clearFieldError('dir'); }
    else if (t.name === 'cur') { // birim değişince simge, ekran okuyucu etiketi ve hane sayısı yenilenir
      const c = CURRENCIES[t.value], inp = document.getElementById('amount');
      document.getElementById('amtSym').textContent = c.sym; document.getElementById('amtUnit').textContent = ', ' + c.long;
      inp.value = sanitizeAmount(inp.value, c.digits); if (document.activeElement !== inp && inp.value) inp.value = formatAmountInput(inp.value, c.digits);
    } else if (t.id === 'vol') {
      settings.volume = Number(t.value); saveSettings(); Snd.play('tap'); // bırakınca dokunma sesi çalar
      t.setAttribute('aria-valuetext', `yüzde ${t.value}`);
    } else if (t.id === 'file' && t.files[0]) importFile(t.files[0], t);
  });

  /* ---- Satır içi alan hataları ---- */
  function clearFieldError(name) {
    ['err-', 'err-rate-'].forEach((pre) => { const el = document.getElementById(pre + name); if (el) { el.hidden = true; el.innerHTML = ''; } });
    const inp = document.querySelector(`[name=${name}]`); if (inp) inp.removeAttribute('aria-invalid');
    const g = name === 'dir' && document.querySelector('.seg'); if (g) g.removeAttribute('aria-invalid');
  }
  // errs: [[alanAdı, mesaj], ...]; ilk hatalı alana odak gider
  function showFieldErrors(form, errs, prefix) {
    form.querySelectorAll('.field-err').forEach((el) => { el.hidden = true; el.innerHTML = ''; });
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    errs.forEach(([name, msg]) => {
      const el = document.getElementById((prefix || 'err-') + name); if (!el) return;
      el.innerHTML = `${ic('uyari')}<span>${esc(msg)}</span>`; el.hidden = false; el.setAttribute('role', 'alert');
      const target = name === 'dir' ? form.querySelector('.seg') : form.querySelector(`[name=${name}]`);
      if (target) target.setAttribute('aria-invalid', 'true');
    });
    if (errs.length) {
      const [name] = errs[0], first = name === 'dir' ? form.querySelector('[name=dir]') : form.querySelector(`[name=${name}]`);
      if (first) first.focus();
      Snd.play('error');
    }
  }
  const fail = (e, form) => { const box = (form || $app).querySelector('#msg'); Snd.play('error'); if (box) box.innerHTML = errBox(e.message); else toast(e.message, 'uyari'); };

  /* ---- Dışa / içe aktarma ---- */
  function importFile(file, input) {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        if (!validImport(data)) throw new Error('geçersiz');
        // Aynı id varsa içe aktarılan kayıt kazanır, diğer kayıtlar korunur
        state.records = [...data.records, ...state.records.filter((r) => !data.records.some((x) => x.id === r.id))];
        if (data.me && !state.me) state.me = data.me;
        if (data.settings && data.settings.rates) { settings.rates = normalizeSettings({ rates: data.settings.rates }).rates; saveSettings(); }
        save(); render(); Snd.play('success'); toast(`${data.records.length} kayıt içe aktarıldı`);
      } catch (er) { Snd.play('error'); toast('Bu dosya geçerli bir BorcumBorç yedeği değil', 'uyari'); }
      input.value = '';
    };
    rd.readAsText(file);
  }

  /* ---- Tıklamalar ---- */
  // Dokunma sesi: yalnızca düğme, çip, sekme, satır, anahtar (kaydırmada değil, yazarken değil)
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.btn, .chip, .dirbtn, .switch, .row, .back, #nav a, .inline-btn');
    if (t) Snd.scheduleTap(t.matches('#nav a, .back') ? 'nav' : 'tap');
  });
  document.addEventListener('click', async (e) => {
    const nav = e.target.closest('#nav a'); // aynı sekmeye tekrar basınca ekranı sıfırla
    if (nav && nav.getAttribute('href') === (location.hash || '#/')) { ctx = {}; render(); }
    const go = e.target.closest('[data-go]'); if (go) { location.hash = go.dataset.go; return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const id = b.dataset.id, act = b.dataset.act;
    if (act === 'back') history.length > 1 ? history.back() : (location.hash = '#/');
    else if (act === 'copy') doCopy();
    else if (act === 'share') shareVia(b.dataset.app);
    else if (act === 'selcode') selectCode();
    else if (act === 'cancel') { ctx = {}; render(); }
    else if (act === 'paste') {
      try { const txt = await Nat.readText(); const ta = document.getElementById('code'); if (ta) { ta.value = txt; ta.focus(); } }
      catch (er) { const box = $app.querySelector('#msg'); if (box) box.innerHTML = errBox('Panoya erişilemedi. Alana uzun basıp yapıştır.'); Snd.play('error'); }
    } else if (act === 'accept') {
      try { const rec = acceptRequest(state, ctx.pending); save(); ctx = { ack: ackCode(rec, state.me), rec }; render(); Snd.play('confirm'); } catch (er) { toast(er.message, 'uyari'); Snd.play('error'); }
    } else if (act === 'payall') {
      const r = state.records.find((x) => x.id === id);
      if (r) { addPayment(r, remaining(r)); save(); render(); Snd.play('pay'); toast('Ödendi olarak işaretlendi'); }
    } else if (act === 'del') {
      Snd.claim();
      if (await askDelete() === 'delete') { state.records = state.records.filter((x) => x.id !== id); save(); Snd.play('del'); toast('Kayıt silindi'); location.hash = '#/'; }
    } else if (act === 'export') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify({ ...state, settings: { rates: settings.rates } }, null, 2)], { type: 'application/json' }));
      a.download = `borcumborc-yedek-${new Date().toISOString().slice(0, 10)}.json`; a.click(); toast('Yedek indirildi');
    } else if (act === 'import') document.getElementById('file').click();
    else if (act === 'sw-sound' || act === 'sw-haptic') { // anahtar kendi durumunu gösterir, toast yok
      const key = act === 'sw-sound' ? 'sound' : 'haptic';
      settings[key] = !settings[key]; saveSettings(); b.setAttribute('aria-checked', String(settings[key]));
      if (key === 'sound') document.querySelector('#soundIco use').setAttribute('href', `assets/icons.svg#${settings.sound ? 'ses-acik' : 'ses-kapali'}`);
    } else if (act === 'test-sound') { Snd.claim(); Snd.play('success'); }
    else if (act === 'rate-clear') { const inp = document.getElementById('rate-' + b.dataset.cur); inp.value = ''; inp.focus(); }
  });
  document.addEventListener('keydown', (e) => {
    const g = e.target.dataset && e.target.dataset.go;
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.hash = g; }
  });

  /* ---- Formlar ---- */
  document.addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target, fd = new FormData(f), kind = f.dataset.form;
    try {
      if (kind === 'new') submitNew(f, fd);
      else if (kind === 'me') { state.me = fd.get('me').trim(); save(); Snd.play('success'); toast('Kaydedildi'); }
      else if (kind === 'code') {
        const d = decodeCode(fd.get('code'));
        if (d.t === 'req') { ctx = { pending: d }; render(); }
        else { const rec = applyAck(state, d); save(); Snd.play('confirm'); toast('Kayıt onaylandı'); location.hash = '#/r/' + rec.id; }
      } else if (kind === 'pay') {
        const r = state.records.find((x) => x.id === f.dataset.id), v = parseAmount(fd.get('amt'));
        if (Number.isNaN(v)) throw new Error('Ödeme tutarını rakamla yaz. Örnek: 12,50');
        const before = r.status; addPayment(r, v); save(); render(); Snd.play('pay'); toast(before !== r.status ? 'Ödendi, borç kapandı' : 'Ödeme eklendi');
      } else if (kind === 'rates') submitRates(f, fd);
    } catch (er) { fail(er, f); }
  });
  function submitNew(f, fd) {
    const dir = fd.get('dir'), cur = fd.get('cur') || 'TRY', person = (fd.get('person') || '').trim(), date = fd.get('date');
    const v = parseAmount(fd.get('amount')), errs = [];
    if (!dir) errs.push(['dir', 'Borç ver mi, borç al mı? Birini seç.']);
    if (!person) errs.push(['person', 'Kişi adını yaz.']);
    if (Number.isNaN(v)) errs.push(['amount', 'Tutarı rakamla yaz. Örnek: 12,50']);
    else if (!(roundCur(v, cur) > 0)) errs.push(['amount', 'Tutar sıfırdan büyük olmalı.']);
    if (!date) errs.push(['date', 'Tarih seç.']);
    if (errs.length) { showFieldErrors(f, errs); return; }
    const rec = createRecord(state, { person, dir, cur, amount: v, note: fd.get('note'), date });
    settings.lastCur = cur; saveSettings(); save();
    ctx = { created: rec }; render(); Snd.play('success');
  }
  function submitRates(f, fd) {
    const errs = [], next = { updatedAt: nowISO() };
    ['USD', 'EUR', 'XAU'].forEach((c) => {
      const raw = String(fd.get(c) || '').trim();
      if (!raw) { next[c] = null; return; }
      const v = parseAmount(raw);
      if (!(v > 0)) errs.push([c, 'Kur sıfırdan büyük bir sayı olmalı. Örnek: 32,50']); else next[c] = v;
    });
    if (errs.length) { showFieldErrors(f, errs, 'err-rate-'); return; }
    settings.rates = next; saveSettings(); Snd.play('success'); toast('Kurlar kaydedildi');
    render();
  }

  /* ---- Klavye açıkken alt çubuğu gizle (WebView küçülünce çubuk klavyeyi kovalamasın) ---- */
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => {
    document.body.classList.toggle('kb', window.innerHeight - window.visualViewport.height > 150 || !!document.activeElement.matches('input[type=text],input[type=date],textarea'));
  });

  /* ---- Açılış ---- */
  render(); // veri ve ilk ekran intro'dan önce hazır; intro ana ekranı geciktirmez
  lock(true);
  let firstTime = true;
  try { firstTime = !localStorage.getItem('bb.introSeen'); localStorage.setItem('bb.introSeen', '1'); } catch (e) { /* depolama yoksa uzun sürüm */ }
  Intro.start({
    firstTime, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    sound: () => Snd.play('intro'),
    onDone: () => {
      lock(false);
      const v = $app.querySelector('.view'); // ana ekran mevcut "in" animasyonuyla gelir
      if (v) { v.style.animation = 'none'; void v.offsetWidth; v.style.animation = ''; }
      focusHeading();
    }
  });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
