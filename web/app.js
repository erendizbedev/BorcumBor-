'use strict';
/* BorcumBorç - çevrimdışı borç kaydı. Bölüm 1: saf mantık (test edilebilir). Bölüm 2: arayüz. */

/* ================= 1) MANTIK ================= */
const KEY = 'borcumborc.v1';
const PREFIX = 'BB1';
// Kayıt: {id, person, amount, dir:'lent'|'owe', note, date, status:'pending'|'confirmed'|'paid',
//         role:'creator'|'acceptor', payments:[{amt,date}], history:[{t,text}]}
// dir kendi bakışımızdan: 'lent' = Bana borçlu (alacak), 'owe' = Ben borçluyum.

const round2 = (n) => Math.round(n * 100) / 100;
const nowISO = () => new Date().toISOString();
const newId = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// --- Kodlama: JSON -> UTF-8 -> base64url, sonuna kısa sağlama (checksum) eklenir ---
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
function checksum(s) { // djb2, 4 karakter
  let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return h.toString(36).slice(-4).padStart(4, '0');
}
const encodeCode = (obj) => { const b = toB64(obj); return `${PREFIX}.${b}.${checksum(b)}`; };

// Kodu çözer; sorun varsa Türkçe açıklamalı Error fırlatır.
function decodeCode(text) {
  const raw = String(text || '').replace(/\s+/g, '');
  if (!raw) throw new Error('Kod alanı boş. Karşı tarafın gönderdiği kodu yapıştır.');
  const parts = raw.split('.');
  if (parts[0] !== PREFIX) throw new Error('Bu bir BorcumBorç kodu gibi görünmüyor. Kodun "BB1." ile başlaması gerekir.');
  if (parts.length !== 3) throw new Error('Kod eksik ya da bozulmuş. Kodun tamamını, hiçbir karakteri atlamadan kopyaladığından emin ol.');
  if (checksum(parts[1]) !== parts[2]) throw new Error('Kod eksik ya da bozulmuş. Kodun tamamını, hiçbir karakteri atlamadan kopyaladığından emin ol.');
  let d;
  try { d = fromB64(parts[1]); } catch (e) { throw new Error('Kodun içeriği okunamadı. Karşı taraftan kodu yeniden göndermesini iste.'); }
  const okReq = d && d.t === 'req' && Number.isFinite(d.amt) && d.amt > 0 && (d.dir === 'lent' || d.dir === 'owe');
  if (!d || d.v !== 1 || typeof d.id !== 'string' || !d.id || !(okReq || d.t === 'ack')) {
    throw new Error('Kodun içeriği geçersiz ya da farklı bir sürümden. Karşı taraftan yeni kod iste.');
  }
  return d;
}

// --- Kayıt işlemleri (state = {me, records}) ---
const paidSum = (r) => round2(r.payments.reduce((s, p) => s + p.amt, 0));
const remaining = (r) => Math.max(0, round2(r.amount - paidSum(r)));

function createRecord(state, f) {
  const amount = round2(Number(f.amount));
  if (!f.person || !f.person.trim()) throw new Error('Kişi adını yaz.');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Tutar sıfırdan büyük olmalı.');
  const rec = { id: newId(), person: f.person.trim(), amount, dir: f.dir === 'owe' ? 'owe' : 'lent',
    note: (f.note || '').trim(), date: f.date || nowISO().slice(0, 10), status: 'pending', role: 'creator',
    payments: [], history: [{ t: nowISO(), text: 'Kayıt oluşturuldu, karşı tarafın onayı bekleniyor.' }] };
  state.records.unshift(rec);
  return rec;
}
// Onay Kodu: kaydı oluşturan kişinin bakışıyla yazılır.
const requestCode = (rec, me) => encodeCode({ v: 1, t: 'req', id: rec.id, from: me || '', amt: rec.amount, dir: rec.dir, note: rec.note, date: rec.date });
const ackCode = (rec, me) => encodeCode({ v: 1, t: 'ack', id: rec.id, by: me || '', at: rec.confirmedAt });

// Karşı taraf: Onay Kodu'nu kabul eder, kendi telefonunda ters yönlü kayıt açar.
function acceptRequest(state, d) {
  if (d.t !== 'req') throw new Error('Bu bir Yanıt Kodu. Onaylamak için karşı tarafın "Onay Kodu"na ihtiyacın var.');
  if (state.records.some((r) => r.id === d.id)) throw new Error('Bu kayıt zaten bu telefonda var. Onay Kodu, karşı tarafın telefonunda kullanılmalı.');
  const rec = { id: d.id, person: (d.from || '').trim() || 'Adsız kişi', amount: round2(d.amt), dir: d.dir === 'lent' ? 'owe' : 'lent',
    note: d.note || '', date: d.date || nowISO().slice(0, 10), status: 'confirmed', role: 'acceptor', confirmedAt: nowISO(),
    payments: [], history: [{ t: nowISO(), text: 'Kaydı onayladın.' }] };
  state.records.unshift(rec);
  return rec;
}
// Kaydı oluşturan taraf: Yanıt Kodu ile kaydı "Onaylandı" yapar (id ile eşleşir).
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
  amt = round2(Number(amt));
  if (rec.status === 'pending') throw new Error('Kayıt onaylanmadan ödeme eklenemez.');
  if (!Number.isFinite(amt) || amt <= 0) throw new Error('Ödeme tutarı sıfırdan büyük olmalı.');
  if (amt > remaining(rec) + 0.001) throw new Error('Ödeme, kalan borçtan fazla olamaz.');
  rec.payments.push({ amt, date: nowISO() });
  const done = remaining(rec) === 0;
  if (done) rec.status = 'paid';
  rec.history.push({ t: nowISO(), text: done ? `${fmt(amt)} ödendi, borç kapandı.` : `${fmt(amt)} kısmi ödeme eklendi.` });
  return rec;
}
// Sadece onaylı kayıtlar toplama girer.
function totals(state) {
  let lent = 0, owe = 0, pending = 0;
  state.records.forEach((r) => {
    if (r.status === 'pending') pending++;
    else if (r.dir === 'lent') lent += remaining(r); else owe += remaining(r);
  });
  return { lent: round2(lent), owe: round2(owe), net: round2(lent - owe), pending };
}
function groupByPerson(state) {
  const map = new Map();
  state.records.forEach((r) => {
    const k = r.person.toLocaleLowerCase('tr');
    if (!map.has(k)) map.set(k, { name: r.person, net: 0, recs: [] });
    const g = map.get(k); g.recs.push(r);
    if (r.status !== 'pending') g.net = round2(g.net + (r.dir === 'lent' ? 1 : -1) * remaining(r));
  });
  return [...map.values()];
}
function fmt(n) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n); }
function validImport(data) { // dışa aktarılan JSON'un şekil kontrolü
  return data && Array.isArray(data.records) && data.records.every((r) => r && typeof r.id === 'string' && r.person
    && Number.isFinite(r.amount) && ['lent', 'owe'].includes(r.dir) && ['pending', 'confirmed', 'paid'].includes(r.status) && Array.isArray(r.payments));
}

if (typeof module !== 'undefined') {
  module.exports = { encodeCode, decodeCode, createRecord, requestCode, ackCode, acceptRequest, applyAck, addPayment, totals, groupByPerson, remaining, validImport };
}

/* ================= 2) ARAYÜZ ================= */
if (typeof document !== 'undefined') (function ui() {
  const $app = document.getElementById('app');
  let state = { me: '', records: [] };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (validImport(s)) state = { me: s.me || '', records: s.records }; } catch (e) { /* bozuk veri: boş başla */ }
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fdate = (iso) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const ftime = (iso) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const STATUS = { pending: 'Onay bekliyor', confirmed: 'Onaylandı', paid: 'Ödendi' };
  const badge = (s) => `<span class="badge ${s}">${STATUS[s]}</span>`;
  const dirText = (r) => (r.dir === 'lent' ? 'Bana borçlu' : 'Ben borçluyum');
  const sign = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
  const cls = (n) => (n >= 0 ? 'pos' : 'neg');
  const backBtn = '<button class="back" data-act="back" aria-label="Geri"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>';
  const codeBox = (code) => `<div class="code" id="codeText">${esc(code)}</div><button class="btn mint" data-act="copy" data-code="${esc(code)}">Kodu kopyala</button>`;
  const errBox = (m) => `<div class="error" role="alert">${esc(m)}</div>`;

  function toast(msg) {
    const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); } catch (e) { // eski WebView için yedek yol
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* yoksay */ } ta.remove();
    }
    toast('Kopyalandı');
  }

  /* ---- Ekranlar ---- */
  function home() {
    const t = totals(state), groups = groupByPerson(state);
    const hello = state.me ? `Merhaba, ${esc(state.me.split(' ')[0])}` : 'BorcumBorç';
    let h = `<div class="view"><div class="top"><img src="assets/mark.svg" alt="" onerror="this.remove()"><h1>${hello}</h1></div>`;
    if (!state.records.length) {
      return h + `<div class="card empty">
        <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="#1C2146"/><circle cx="44" cy="58" r="22" fill="#5B5BF0"/><circle cx="78" cy="62" r="22" fill="#2DD4A7" opacity=".9"/><path d="M36 58h16M70 62h16M78 54v16" stroke="#0F1226" stroke-width="5" stroke-linecap="round"/></svg>
        <h2>Henüz kayıt yok</h2>
        <p class="note">İki kişi arasındaki borcu yaz, karşı taraf kodla onaylasın. İnternet gerekmez; kayıt, ikinizin onayıyla geçerli olur.</p>
        <a class="btn" href="#/new">İlk kaydını oluştur</a><a class="btn ghost" href="#/confirm">Elimde bir kod var</a></div></div>`;
    }
    h += `<div class="card hero"><small>Net durum</small><div class="big">${sign(t.net)}</div>
      <div class="split"><div><b>${fmt(t.lent)}</b><span>Toplam alacağın</span></div><div><b>${fmt(t.owe)}</b><span>Toplam borcun</span></div></div></div>`;
    if (t.pending) h += `<div class="notice">${t.pending} kayıt karşı tarafın onayını bekliyor</div>`;
    groups.forEach((g) => {
      h += `<div class="card"><div class="group-head"><div class="avatar">${esc(g.name.charAt(0).toLocaleUpperCase('tr'))}</div><b>${esc(g.name)}</b><span class="amt ${cls(g.net)}">${sign(g.net)}</span></div>`;
      g.recs.forEach((r) => {
        h += `<div class="row" data-go="#/r/${r.id}" role="link" tabindex="0"><div class="grow"><div class="t">${esc(r.note || dirText(r))}</div><div class="s">${dirText(r)} · ${fdate(r.date)}</div></div>
          <div style="text-align:right"><div class="a ${r.dir === 'lent' ? 'pos' : 'neg'}">${fmt(remaining(r) || r.amount)}</div>${badge(r.status)}</div></div>`;
      });
      h += '</div>';
    });
    return h + '</div>';
  }

  function newRecord(created) {
    if (created) { // kayıt sonrası: Onay Kodu ekranı
      return `<div class="view"><div class="top">${backBtn}<h1>Onay Kodu hazır</h1></div><div class="card">
        <p class="note" style="margin-bottom:12px">${esc(created.person)} ile ${fmt(created.amount)} tutarındaki kaydın hazır. Bu kodu ona gönder; o "Onayla" ekranına yapıştırınca sana bir Yanıt Kodu üretecek.</p>
        ${codeBox(requestCode(created, state.me))}</div>
        <a class="btn ghost" href="#/confirm">Yanıt Kodu'nu yapıştır</a><a class="btn ghost" href="#/">Ana ekrana dön</a></div>`;
    }
    const today = new Date().toISOString().slice(0, 10);
    return `<div class="view"><div class="top"><h1>Yeni kayıt</h1></div>
      ${state.me ? '' : '<div class="notice">Adın boş. Karşı taraf seni tanısın diye <a href="#/settings" style="text-decoration:underline">Ayarlar</a>\'dan ad soyadını yaz.</div>'}
      <form class="card" data-form="new" autocomplete="off">
        <div class="field"><label>Yön</label><div class="seg"><input type="radio" name="dir" id="d1" value="lent" checked><label for="d1">Bana borçlu</label><input type="radio" name="dir" id="d2" value="owe"><label for="d2">Ben borçluyum</label></div></div>
        <div class="field"><label for="person">Kişi adı</label><input id="person" name="person" required maxlength="40" placeholder="Örn. Ayşe"></div>
        <div class="field"><label for="amount">Tutar (₺)</label><input id="amount" name="amount" type="number" inputmode="decimal" step="0.01" min="0.01" required placeholder="0,00"></div>
        <div class="field"><label for="note">Not</label><input id="note" name="note" maxlength="80" placeholder="Örn. Akşam yemeği"></div>
        <div class="field"><label for="date">Tarih</label><input id="date" name="date" type="date" value="${today}" required></div>
        <div id="msg"></div><button class="btn" type="submit">Kaydet ve kod üret</button></form></div>`;
  }

  // Onayla ekranı: tek alan, kod türünü kendisi anlar (Onay Kodu veya Yanıt Kodu)
  function confirmView(pending, ackDone) {
    let body;
    if (ackDone) {
      body = `<div class="card"><h2>Onayladın</h2><p class="note" style="margin-bottom:12px">Kayıt bu telefona eklendi. Şimdi bu Yanıt Kodu'nu karşı tarafa gönder; o yapıştırınca kayıt onaylanmış olur.</p>${codeBox(ackDone)}</div><a class="btn ghost" href="#/">Ana ekrana dön</a>`;
    } else if (pending) {
      const d = pending, mine = d.dir === 'lent' ? 'owe' : 'lent';
      body = `<div class="card summary"><h2>Kayıt özeti</h2><dl><dt>Kişi</dt><dd>${esc(d.from || 'Adsız kişi')}</dd>
        <dt>Tutar</dt><dd>${fmt(d.amt)}</dd><dt>Durum</dt><dd>${mine === 'owe' ? 'Sen borçlusun' : 'Sana borçlu'}</dd>
        <dt>Not</dt><dd>${esc(d.note || '-')}</dd><dt>Tarih</dt><dd>${esc(d.date ? fdate(d.date) : '-')}</dd></dl></div>
        <p class="note">Bilgiler doğruysa onayla. Yanlışsa onaylama ve karşı tarafa söyle.</p>
        <button class="btn mint" data-act="accept">Onaylıyorum</button><button class="btn ghost" data-act="cancel">Vazgeç</button>`;
    } else {
      body = `<form class="card" data-form="code"><label for="code">Kod</label>
        <textarea id="code" name="code" placeholder="BB1.…" spellcheck="false" autocapitalize="off"></textarea>
        <p class="note" style="margin:8px 0 14px">Karşı tarafın gönderdiği Onay Kodu'nu ya da senin kaydına gelen Yanıt Kodu'nu yapıştır.</p>
        <div id="msg"></div><button class="btn" type="submit">Kodu kontrol et</button></form>`;
    }
    return `<div class="view"><div class="top"><h1>Onayla</h1></div>${body}</div>`;
  }

  function detail(id) {
    const r = state.records.find((x) => x.id === id);
    if (!r) return `<div class="view"><div class="top">${backBtn}<h1>Kayıt bulunamadı</h1></div></div>`;
    const rem = remaining(r), pct = Math.min(100, Math.round((paidSum(r) / r.amount) * 100));
    let h = `<div class="view"><div class="top">${backBtn}<h1>${esc(r.person)}</h1>${badge(r.status)}</div>
      <div class="card hero"><small>${dirText(r)}</small><div class="big">${fmt(r.amount)}</div>
        <div class="bar"><i style="width:${pct}%"></i></div><small>Kalan ${fmt(rem)} · ödenen ${fmt(paidSum(r))}</small></div>
      <div class="card summary"><dl><dt>Not</dt><dd>${esc(r.note || '-')}</dd><dt>Tarih</dt><dd>${fdate(r.date)}</dd></dl></div>`;
    if (r.status === 'pending') {
      h += `<div class="card"><h2>Onay bekliyor</h2><p class="note" style="margin-bottom:12px">Onay Kodu'nu karşı tarafa gönder, gelen Yanıt Kodu'nu Onayla ekranına yapıştır.</p>${codeBox(requestCode(r, state.me))}</div><a class="btn ghost" href="#/confirm">Yanıt Kodu'nu yapıştır</a>`;
    } else if (r.status === 'confirmed') {
      h += `<form class="card" data-form="pay" data-id="${r.id}"><h2>Ödeme ekle</h2><div class="field"><input name="amt" type="number" inputmode="decimal" step="0.01" min="0.01" max="${rem}" placeholder="Kısmi ödeme tutarı (₺)"></div>
        <div id="msg"></div><button class="btn ghost" type="submit">Kısmi ödeme ekle</button></form>
        <button class="btn mint" data-act="payall" data-id="${r.id}">Ödendi olarak işaretle</button>`;
      if (r.role === 'acceptor') h += `<div class="card"><h2>Yanıt Kodu'nu yeniden gönder</h2>${codeBox(ackCode(r, state.me))}</div>`;
    }
    h += `<div class="card"><h2>Geçmiş</h2><ul class="hist">${[...r.history].reverse().map((x) => `<li>${esc(x.text)}<small>${ftime(x.t)}</small></li>`).join('')}</ul></div>
      <button class="btn danger" data-act="del" data-id="${r.id}">Kaydı sil</button></div>`;
    return h;
  }

  function settings() {
    return `<div class="view"><div class="top"><h1>Ayarlar</h1></div>
      <form class="card" data-form="me"><div class="field"><label for="me">Ad soyad (kodun içinde görünür)</label><input id="me" name="me" maxlength="40" value="${esc(state.me)}" placeholder="Örn. Fatih Yılmaz"></div>
        <button class="btn" type="submit">Kaydet</button></form>
      <div class="card"><h2>Verilerin</h2><p class="note" style="margin-bottom:12px">Tüm kayıtlar yalnızca bu cihazda tutulur. Yedek almak için dışa aktar.</p>
        <button class="btn ghost" data-act="export" style="margin-bottom:10px">JSON olarak dışa aktar</button>
        <button class="btn ghost" data-act="import">JSON içe aktar</button><input type="file" id="file" accept="application/json,.json" hidden></div>
      <div class="card"><h2>Bluetooth ile eşleşme</h2><p><span class="badge pending">Yakında</span></p><p class="note" style="margin-top:8px">Bir sonraki sürümde iki telefon yakınken kod paylaşmadan, Bluetooth ile otomatik eşleşip onaylayabilecek.</p></div></div>`;
  }

  /* ---- Yönlendirme ---- */
  let ctx = {}; // geçici ekran durumu (üretilen kod, çözülen kod)
  function render() {
    const hash = location.hash || '#/', m = hash.match(/^#\/r\/(.+)$/);
    const page = m ? 'detail' : hash.slice(2) || 'home';
    const views = { home, new: () => newRecord(ctx.created), confirm: () => confirmView(ctx.pending, ctx.ack), settings, detail: () => detail(m && m[1]) };
    $app.innerHTML = (views[page] || home)();
    document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === (page === 'detail' ? 'home' : page)));
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', () => { ctx = {}; render(); });

  /* ---- Olaylar (tek yerden yönetilir) ---- */
  const fail = (e, form) => { const box = (form || $app).querySelector('#msg'); if (box) box.innerHTML = errBox(e.message); else toast(e.message); };
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('#nav a'); // aynı sekmeye tekrar basınca ekranı sıfırla
    if (nav && nav.getAttribute('href') === (location.hash || '#/')) { ctx = {}; render(); }
    const go = e.target.closest('[data-go]'); if (go) { location.hash = go.dataset.go; return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const id = b.dataset.id, act = b.dataset.act;
    if (act === 'back') history.length > 1 ? history.back() : (location.hash = '#/');
    else if (act === 'copy') copy(b.dataset.code);
    else if (act === 'cancel') { ctx = {}; render(); }
    else if (act === 'accept') {
      try { const rec = acceptRequest(state, ctx.pending); save(); ctx = { ack: ackCode(rec, state.me) }; render(); } catch (er) { toast(er.message); }
    } else if (act === 'payall') {
      const r = state.records.find((x) => x.id === id);
      if (r) { addPayment(r, remaining(r)); save(); render(); toast('Ödendi olarak işaretlendi'); }
    } else if (act === 'del') {
      if (confirm('Bu kayıt silinsin mi? Bu işlem geri alınamaz.')) { state.records = state.records.filter((x) => x.id !== id); save(); location.hash = '#/'; }
    } else if (act === 'export') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
      a.download = `borcumborc-yedek-${new Date().toISOString().slice(0, 10)}.json`; a.click(); toast('Yedek indirildi');
    } else if (act === 'import') document.getElementById('file').click();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset && e.target.dataset.go) location.hash = e.target.dataset.go; });
  document.addEventListener('change', (e) => {
    if (e.target.id !== 'file' || !e.target.files[0]) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        if (!validImport(data)) throw new Error();
        // Aynı id varsa içe aktarılan kayıt kazanır, diğer kayıtlar korunur
        state.records = [...data.records, ...state.records.filter((r) => !data.records.some((x) => x.id === r.id))];
        if (data.me && !state.me) state.me = data.me;
        save(); render(); toast(`${data.records.length} kayıt içe aktarıldı`);
      } catch (er) { toast('Bu dosya geçerli bir BorcumBorç yedeği değil'); }
    };
    rd.readAsText(e.target.files[0]);
  });
  document.addEventListener('submit', (e) => {
    e.preventDefault(); const f = e.target, fd = new FormData(f), kind = f.dataset.form;
    try {
      if (kind === 'new') { ctx = { created: createRecord(state, Object.fromEntries(fd)) }; save(); render(); }
      else if (kind === 'me') { state.me = fd.get('me').trim(); save(); toast('Kaydedildi'); }
      else if (kind === 'code') {
        const d = decodeCode(fd.get('code'));
        if (d.t === 'req') { ctx = { pending: d }; render(); }
        else { const rec = applyAck(state, d); save(); toast('Kayıt onaylandı'); location.hash = '#/r/' + rec.id; }
      } else if (kind === 'pay') {
        const r = state.records.find((x) => x.id === f.dataset.id); addPayment(r, fd.get('amt')); save(); render(); toast('Ödeme eklendi');
      }
    } catch (er) { fail(er, f); }
  });

  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
