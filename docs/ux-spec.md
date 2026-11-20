> **Not (v0.2):** Bu belge [`v0.2-degisiklikler.md`](v0.2-degisiklikler.md) ile birlikte okunur; çelişkide o geçerlidir (SMS yok, kurlar otomatik, yeni palet, açılış 2,5 sn).

# BorcumBorç UX Şartnamesi (yazılımcı için)

Kapsam: web/app.js, style.css, index.html. Görsel kimlik (hex değerleri, sprite) başka ajandan gelir; bu belge davranışı ve anlamı belirler. Birim: 1 dp = 1 CSS px (WebView, varsayılan yakınlaştırma). Mevcut testler (`tests/logic.test.js`) yeşil kalmalıdır.

## 0. Sözlük ve kod kuralları

- Yön eylemdir: `lent` = **Borç ver** (ben verdim, alacaklıyım), `owe` = **Borç al** (ben aldım, borçluyum). İç değerler ve kodun içindeki `dir` alanı DEĞİŞMEZ; yalnızca ekrandaki metin değişir.
- Toplam kutuları sonuçtur: "Alacağın" ve "Borcun". Yön adlarıyla karıştırılmaz.
- `dirText(r)` tek yerde tanımlanır: `lent` için "Borç ver", `owe` için "Borç al". Başka dosyada ya da satırda "Bana borçlu" / "Ben borçluyum" kalmayacak.
- Kayıt cümlesi (hero, geçmiş, onay özeti) fiil çekimli yazılır: "Borç verdin" / "Borç aldın".
- Ekranlarda `dir` rengi: `lent` = zümrüt, `owe` = mercan (bölüm 1).

## 1. Renklerin anlamsal kullanımı ve erişilebilirlik

Renk adları: orman-yeşili zemin, zümrüt, bakır-altın, mercan. CSS değişkenleri anlamsal adlandırılır: `--c-lent`, `--c-owe`, `--c-action`, `--c-focus`, `--c-bg`, `--c-surface`, `--c-text`, `--c-muted`. (`--mint/--amber/--indigo` kaldırılır.)

| Renk | Yalnızca şunlar için |
|---|---|
| Zümrüt | Alacak: "Borç ver" tutarı, "Borç ver" çipi/ikonu, `+` net, borç ver kaydının ilerleme çubuğu |
| Mercan | Borç: "Borç al" tutarı, çipi, `−` net, borç al kaydının ilerleme çubuğu; ayrıca hata kutusu ve silme düğmesi çerçevesi (uyarı ikonu + metinle) |
| Bakır-altın | Ana eylem: ekranda en fazla 1 dolu düğme; odak halkası; aktif sekme işareti; intro onay işareti. Tutar yazmak için KULLANILMAZ |
| Nötr (yüzey/soluk metin) | Durum rozetleri: Onay bekliyor (kesik çerçeve + saat ikonu), Onaylandı (onayla ikonu), Ödendi (tamam-cift, soluk) |

Kurallar:
1. Renk tek başına anlam taşımaz: her tutarda `+`/`−` işareti, yön ikonu ve metin (Borç ver/Borç al) bulunur. Zümrüt ile mercan kırmızı-yeşil renk körlüğünde karışabilir; ikisinin göreli parlaklık oranı en az 1,5:1 olmalı.
2. Hata (mercan) ile "Borç al" (mercan) karışmasın: hata her zaman çerçeveli kutu + `uyari` ikonu + `role="alert"`; "Borç al" kutusuz tutar + `borc-al` ikonudur.
3. Kontrast (AA): normal metin ≥ 4,5:1; büyük metin (≥ 24 px ya da ≥ 18,66 px kalın), ikon, girdi çerçevesi, odak halkası ≥ 3:1. Ana gövde metni hedef ≥ 7:1.
4. Bakır-altın dolu düğmede yazı beyaz değil, koyu zemin rengidir (≥ 4,5:1). Zümrüt/mercan dolu yüzey üstünde de koyu yazı.
5. Her renk çifti (ön plan/arka plan) için oranı CI'da hesaplayan küçük bir test yazılır (token tablosu üzerinden); eşiğin altı derlemeyi kırar.
6. Odak halkası: `:focus-visible`, 3 px bakır-altın, 2 px boşluk; hiçbir öğede `outline:none` tek başına bırakılmaz.
7. `meta theme-color` ve `capacitor.config.json` `backgroundColor` zemin renginin aynısı olur (açılışta beyaz/mor parlama olmasın).

## 2. Açılış (intro) ekranı

Karar: **Her soğuk başlatmada gösterilir** (arka plandan dönüşte gösterilmez). İlk kurulumda uzun (2,0 s), sonrakilerde kısa (0,9 s).
Gerekçe: kullanıcı açılış istedi; marka anı ilk açılışta tam yaşanır. Günde birçok kez açılan bir finans aracında 2 s bekletmek ergonomik değildir, bu yüzden tekrar açılışlar kısa tutulur. Her durumda dokununca geçilir.

- Kalıcı bayrak: `localStorage['bb.introSeen']`. Yoksa uzun sürüm, sonra yaz.
- Android 12+ sistem açılışı kaldırılamaz: sistem splash'ı aynı zemin rengi + işaret olsun; web intro bunun devamı gibi görünsün.
- Sahne (uzun): 0-600 ms zümrüt ve mercan iki halka yanlardan ortada kesişir; 600-1000 ms bakır-altın onay işareti çizilir (`stroke-dashoffset`); 1000-1500 ms "BorcumBorç" yazısı belirir; 1500-2000 ms bekler; çıkış 350 ms.
- Kısa sürüm: halkalar + işaret + yazı hazır; 250 ms açılış, 400 ms bekleme, 250 ms çıkış.
- Yalnızca `transform` ve `opacity` animasyonlanır. Çıkış: intro 350 ms solar ve %4 büyür; ana ekran mevcut `in` animasyonuyla (250 ms, 8 px yukarı) gelir.
- Atlama: tüm ekran dokunma alanıdır, `role="button"`, `aria-label="Açılışı geç"`, Enter/Boşluk da geçer. İlk 150 ms'deki dokunuşlar yok sayılır (kazara dokunma). 700. ms'de alta "Geçmek için dokun" (14 px) belirir. Android geri tuşu da intro'yu geçer (çıkış penceresi açmaz).
- Azaltılmış hareket (`prefers-reduced-motion: reduce`): animasyon yok; tamamlanmış logo + yazı statik; süre ilk 700 ms, sonra 400 ms; geçiş anlık (`opacity` hemen 0). Ses/titreşim ayarı bundan bağımsızdır.
- Arka planda `render()` ve veri yükleme intro'dan önce biter; intro ana ekranı geciktirmez. Intro açıkken `#app` ve `#nav` `inert`/`aria-hidden`. Bitince odak ana ekranın `h1`'ine (`tabindex="-1"`) gider.
- Ses: "açılış" sesi yalnızca ses açık ve `AudioContext` çalışır durumdaysa; değilse sessiz geçilir (bölüm 3).

## 3. Ses ve titreşim

Sesler dosya değil, Web Audio ile üretilir (çevrimdışı, sıfır boyut). Ses hiçbir bilgiyi tek başına taşımaz; her sesin görsel/metin karşılığı olur. Tek seferde en fazla 1 ses: olay sesi, aynı olayın dokunma sesinin yerine geçer. Aynı ses arasında en az 40 ms aralık.

| Olay | Karakter | Üretim | Süre | Göreli şiddet | Titreşim (ms) |
|---|---|---|---|---|---|
| Dokunma (düğme, çip, satır, sekme seçimi) | kuru, yumuşak tık | sinüs 1400→900 Hz | 35 | 0,5 | [10] |
| Gezinme (sekme, geri, ekran geçişi) | hafif kayma | sinüs 520→700 Hz | 60 | 0,45 | [8] |
| Başarı (kayıt oluştu, kaydedildi) | iki nota yükselen | üçgen 660 → 880 Hz | 80+120 | 0,7 | [25,40,25] |
| Onay (karşılıklı onay tamam) | sıcak üçlü arpej | sinüs 523/659/784 Hz, 90 ms arayla, son nota uzar | 380 | 0,8 | [30,50,30,50,70] |
| Hata | alçalan iki nota, yumuşak | üçgen 330 → 247 Hz, alçak geçiren 1200 Hz | 100+160 | 0,65 | [70,50,70] |
| Kopyalama | çift mikro tık | sinüs 1200 Hz x2, 50 ms arayla | 20+20 | 0,5 | [15] |
| Ödeme | madeni para çınlaması | sinüs 1760 + 2349 Hz, 60 ms arayla, uzun sönüm | 260 | 0,7 | [20,40,50] |
| Silme | alçalan süpürme | testere 480→140 Hz, alçak geçiren 800 Hz | 170 | 0,55 | [90] |
| Açılış | dört notalı yükseliş | sinüs 262/330/392/523 Hz, 110 ms arayla, son nota uzar | ≤ 800 | 0,7 | yok |
| Pencere açılışı (çıkış, silme onayı) | tek yumuşak vuruş | sinüs 440 Hz | 50 | 0,5 | [15] |

- Ayarlar > "Ses ve titreşim" kartı: (a) **Ses** anahtarı (`role="switch"`, `aria-checked`, ikon `ses-acik`/`ses-kapali`), varsayılan açık; (b) **Ses seviyesi** kaydırıcı 0-100, adım 10, varsayılan 70, uçlarda `ses-kapali`/`ses-acik`, bırakınca dokunma sesi çalar; (c) **Titreşim** anahtarı (`titresim` ikonu), varsayılan açık; (d) "Sesi dene" düğmesi (başarı sesini çalar). Satır yüksekliği ≥ 56 dp.
- Genlik = `(seviye/100)² × göreli şiddet × 0,8`. Seviye 0 ise ses yok.
- Ayarlar `localStorage['borcumborc.settings.v1']` içinde: `{sound, volume, haptic, rates, lastCur}`. Kayıt verisinden (`borcumborc.v1`) ayrı tutulur.
- Autoplay kısıtı: `AudioContext` ilk kullanıcı hareketinde (`pointerdown`/`keydown`, `capture`, `once`) oluşturulur ve `resume()` edilir. Intro'ya ilk dokunuş bu hareket sayılır. `visibilitychange` ile geri gelince durum `suspended`/`interrupted` ise `resume()`. Açılış sesi çalışmazsa hata gösterilmez.
- Titreşim: `navigator.vibrate(kalıp)` önce denenir; yoksa `@capacitor/haptics` (`Haptics.vibrate({duration})`, kalıplar sırayla). Ayar kapalıysa hiçbiri çalışmaz. Toplam süre ≤ 250 ms.
- Dokunma sesi yalnızca `click` olayında (kaydırma sırasında değil) ve yalnızca `.btn`, çip, sekme, satır, anahtar üzerinde; metin yazarken ses yok.

## 4. Mikro metinler (yön adları)

| Yer | Eski | Yeni |
|---|---|---|
| Yeni kayıt, yön etiketi | "Yön" | "Ne yaptın?" (segment: **Borç ver** / **Borç al**) |
| Segment altı yardım (seçime göre) | yok | Borç ver: "Karşı tarafa para verdim." Borç al: "Karşı taraftan para aldım." |
| Yön seçilmemişken gönder | (varsayılan "Bana borçlu") | "Borç ver mi, borç al mı? Birini seç." |
| Ana liste satır alt metni, not boşken başlık | "Bana borçlu / Ben borçluyum" | "Borç ver · 12 Kasım 2026" / "Borç al · 12 Kasım 2026" |
| Satır rozeti (yön çipi, ikonlu) | yok | "Borç ver" / "Borç al" |
| Detay hero küçük başlık | "Bana borçlu" | "Borç verdin" / "Borç aldın" |
| Onay kodu hazır cümlesi | "{ad} ile {tutar} tutarındaki kaydın hazır." | "{ad} için {tutar} borç verdin. Kodu ona gönder." / "{ad} için {tutar} borç aldın. Kodu ona gönder." |
| Onayla ekranı özet, "Durum" satırı | "Sen borçlusun / Sana borçlu" | "Senin tarafın: **Borç al**" / "Senin tarafın: **Borç ver**" |
| Onayla ekranı özet cümlesi | yok | "{ad} sana {tutar} borç verdi." / "{ad} senden {tutar} borç aldı." |
| Ana net kartı | "Net durum" | "Onaylı net durum" |
| Net kartı kutuları | "Toplam alacağın / Toplam borcun" | "Alacağın" / "Borcun" |
| Geçmiş kaydı (oluşturan) | "Kayıt oluşturuldu, karşı tarafın onayı bekleniyor." | "Borç verdin, karşı tarafın onayı bekleniyor." / "Borç aldın, karşı tarafın onayı bekleniyor." |
| Geçmiş kaydı (onaylayan) | "Kaydı onayladın." | "Kaydı onayladın. Senin tarafın: Borç al." (veya Borç ver) |
| Boş durum | "İki kişi arasındaki borcu yaz…" | "Borç verdin ya da aldın mı? İkinizin onayıyla kayda geçir. İnternet gerekmez." |
| Boş durum düğmeleri | "İlk kaydını oluştur" / "Elimde bir kod var" | aynı (değişmez) |
| Kod hatası, önek | 'Kodun "BB1." ile başlaması gerekir.' | 'Bu bir BorcumBorç kodu gibi görünmüyor. Kod "BB" ile başlar. Karşı tarafın gönderdiği kodu yapıştır.' |
| Daha yeni sürüm kodu (BB3+) | yok | "Bu kod daha yeni bir sürümden. Uygulamayı güncelle ve tekrar dene." |
| Silme penceresi | `confirm()` "Bu kayıt silinsin mi?" | Başlık "Bu kayıt silinsin mi?", gövde "Silersen geri alamazsın. Karşı tarafın telefonunda kaydı silmez." Düğmeler **Vazgeç** (vurgulu) / Sil |

Testlerin eşleştirdiği ifadeler korunur: "boş", "BorcumBorç kodu gibi", "eksik ya da bozulmuş", "geçersiz", "fazla", "zaten bu telefonda", "zaten onaylanmış", "bu telefonda yok", "sen onayladın", "Yanıt Kodu", "Onay Kodu", "Kişi adı".

## 5. Para birimleri

Birimler: `TRY` ₺ "TL", `USD` $ "Dolar", `EUR` € "Euro", `XAU` "Altın" (gram, simge "gr"). Canlı kur yoktur. Her kayıt tek birimlidir ve kendi biriminde tutulur; toplamlar birim birim gösterilir.

- Veri: kayda `cur` alanı. Alanı olmayan eski kayıt `TRY` sayılır (göç gerekmez; okurken `r.cur || 'TRY'`). `validImport` eksik `cur`'u kabul eder, bilinmeyen `cur`'u reddeder.
- Yuvarlama: TRY/USD/EUR 2 hane, XAU 3 hane. `round2` yerine `roundCur(n, cur)`; `remaining`, `paidSum`, `addPayment` birime göre yuvarlar.
- Biçim: tr-TR. TL/USD/EUR `Intl.NumberFormat('tr-TR',{style:'currency',currency})` ("₺1.234,50", "$1.234,50", "€1.234,50"). Altın: sayı en az 2, en fazla 3 ondalık + dar boşluk + "gr" ("12,50 gr", "12,125 gr"). Negatif: gerçek eksi işareti `−`.
- `fmt(n, cur)` tek biçimleyicidir; `fmt(n)` çağrıları `fmt(n, r.cur)` olur. `sign(n, cur)` aynı şekilde.
- Tutar girişi: `type="text" inputmode="decimal"` (type=number kullanılmaz; Türkçe klavyede virgül sorunu). Hem `,` hem `.` ondalık ayırıcı kabul edilir; tek ayırıcı ondalıktır; bin ayırıcı yazılmaz; tam kısım en çok 9 hane; fazla ondalık sessizce kırpılır. Odaktan çıkınca tr-TR biçimine döner (ör. "1250,5" -> "1.250,50"). Birim değişince hane sayısı yeniden uygulanır. Etiket: "Tutar", yanında birim simgesi (₺, $, €, gr) girdinin içinde sabit.
- Birim seçici: "Para birimi" `fieldset` + `legend`, 4 eşit çip (grid 4 sütun, 8 dp aralık, her biri ≥ 48 dp yükseklik, 360 dp ekranda ≈ 73 dp genişlik); çip = ikon (`tl/dolar/euro/altin`) + kısa ad ("TL", "Dolar", "Euro", "Altın"); seçili çip bakır-altın çerçeve + dolgu. Varsayılan: son kullanılan birim (`lastCur`), yoksa TL. Sıra sabit: TL, Dolar, Euro, Altın.
- Ayarlar > **Kurlar (isteğe bağlı)**: üç satır: "1 $ = [____] ₺", "1 € = [____] ₺", "1 gr altın = [____] ₺"; girdiler `inputmode="decimal"`, USD/EUR 4, altın 2 ondalık; boş = girilmedi; her satırda 48 dp "Temizle". "Kaydet" tek düğme; kayıtta "Son güncelleme: {tarih}" yazılır. Altında sabit uyarı: "Bu kurlar senin girdiğin değerlerdir, canlı değildir." Kur 7 günden eskiyse `uyari` ikonlu "Kurlar 7 günden eski." Kurlar kodlara girmez, karşı tarafa gitmez; yedeğe `settings.rates` olarak eklenir.
- "₺ karşılığı" hesabı yalnızca onaylı net üzerindendir: `Σ(net_birim × kur_birim)`, TL için kur 1. Kullanılan her TL dışı birimin kuru girilmişse satır görünür: "≈ ₺X (elle girilen kura göre)" (`kur` ikonu, soluk metin). Bir kur eksikse sayı GÖSTERİLMEZ (kısmi toplam yanıltır): "₺ karşılığı için Euro kuru gerekli · Kur gir" (Ayarlar'a bağlantı). Yalnızca TL kullanılıyorsa satır hiç görünmez.

### Onay kodu: BB2 (BB1 geriye uyumlu)

- Yeni biçim: `BB2.<base64url>.<4 karakter sağlama>`; sağlama BB1 ile aynı (djb2). Yük: `{v:2, t:'req', id, from, amt, cur, dir, note, date}`; yanıt: `{v:2, t:'ack', id, by, at}`.
- `requestCode` ve `ackCode` HER ZAMAN BB2 üretir. `decodeCode` hem `BB1` (v:1, `cur` yok = TRY, döndürülen nesneye `cur:'TRY'` eklenir) hem `BB2` (v:2, `cur` ∈ {TRY,USD,EUR,XAU} zorunlu) kabul eder. `BB` + rakam olup 1/2 dışındaysa "daha yeni sürüm" hatası.
- `acceptRequest` kayda `cur: d.cur` yazar. `applyAck` birim kontrolü yapmaz (id eşleşir).
- Eski sürüm uygulama BB2'yi okuyamaz ("BorcumBorç kodu gibi görünmüyor" der); bu bilinen ve kabul edilen sınırdır. Onay kodu ekranındaki yardım metnine dokunulmaz.
- Yapıştırma toleransı: kodun yanına mesaj da yapıştırılırsa kod bulunur. Önce özgün metinde `/BB[0-9]\.[A-Za-z0-9_-]+\.[A-Za-z0-9]{4}/` aranır; bulunamaz ya da sağlama tutmazsa, mevcut davranış (tüm boşlukları silip çözme) denenir. Paylaşım şablonunda kod en son satırdadır.

## 6. Ekranlar

Genel yerleşim: birincil eylem ekranın alt yarısında; form ekranlarında gönder düğmesi `position:sticky` ile alt çubuğun 8 dp üstünde sabit. Alt gezinme sırası: Ana, Yeni (ikon bakır-altın dolu yuvarlak içinde), Onayla, Ayarlar.

### 6.1 Ana ekran
1. Üst: marka işareti + "Merhaba, {ad}" (ya da "BorcumBorç").
2. **Net kartı** "Onaylı net durum" (hata düzeltmesi): net yalnızca onaylı kayıtlardan; bekleyenler ayrı satırda.
3. Tek birim kullanılıyorsa: büyük net (36 px) + iki kutu "Alacağın" / "Borcun".
4. Birden çok birim varsa: birim başına bir satır (≥ 56 dp): [birim ikonu] [birim adı] ....... [net, 24 px, işaret + renk + yön ikonu]; satır altı 14 px "Alacak X · Borç Y". Hareketsiz/sıfır birimler gizli; en çok 4 satır; sabit sıra.
5. Kartın altında ayraç + "≈ ₺ karşılığı" satırı (bölüm 5 kuralları).
6. Onaylı kayıt hiç yoksa ama bekleyen varsa net yerine "Henüz onaylı kayıt yok" (16 px) yazılır; "₺0,00" gösterilmez. Onaylı kayıt var ve net 0 ise "₺0,00 · Hesap denk".
7. Kartın dışında, nötr zeminli ayrı satır: `saat` ikonu + "Onay bekleyen · N kayıt" + alt satır birim birim "Alacak ₺350,00 · Borç $20,00". Net'e katılmaz. (Dokununca bir şey yapmaz.)
8. `totals()` birim bazlı olur: `{byCur:{TRY:{lent,owe,net,pendingLent,pendingOwe,pendingCount}, …}, pending}`; mevcut test uyumu için üst düzeyde `lent/owe/net` = TRY alanları korunur.
9. Kişi grubu: `groupByPerson` birim başına net tutar (`net:{TRY:…, USD:…}`); başlıkta en çok 2 birim, fazlası "+1". Birimler asla toplanmaz.
10. Satır: sol `borc-ver`/`borc-al` ikonu, başlık not, alt "Borç ver · tarih", sağda tutar (kendi birimi, `+`/`−`, renk) ve durum rozeti (ikonlu). Satır ≥ 60 dp, tüm satır dokunma alanı, `role="link"`.
11. Ekran okuyucu: net kartı tek cümlelik `aria-label`: "Onaylı net durum: Türk lirası artı 1.200, dolar eksi 20. Onay bekleyen 2 kayıt."
12. Boş durum: `cuzdan` çizimi, başlık, iki düğme (bakır-altın dolu: ilk kayıt; hayalet: elimde kod var).

### 6.2 Yeni kayıt
1. Sıra: Ne yaptın? (Borç ver / Borç al), Kişi adı, Para birimi, Tutar, Not, Tarih. Gönder: "Kaydet ve kod üret" (bakır-altın, sticky).
2. Yön segmenti: iki büyük düğme (≥ 56 dp), ikonlu (`borc-ver` zümrüt, `borc-al` mercan); varsayılan SEÇİLİ DEĞİL (yanlış yön finansal hatadır; 1 dokunuş bedeli kabul).
3. Kişi adı: `type="text" autocapitalize="words" autocomplete="off" enterkeyhint="next"`; Tutar: `inputmode="decimal" enterkeyhint="next"`; Not: `enterkeyhint="done"`; Tarih: `type="date"` (sistem seçici), `takvim` ikonu.
4. Not için `not`, tarih için `takvim` ikonu yalnızca etiket yanında (süs, `aria-hidden`).
5. Adın boşsa uyarı kutusu (`uyari` ikonu): "Adın boş. Karşı taraf seni tanısın diye Ayarlar'dan ad soyadını yaz."
6. Hata: alan altında satır içi mesaj + `aria-invalid="true"` + `aria-describedby`; ilk hatalı alana odak. Mesajlar ne olduğunu ve ne yapılacağını söyler ("Tutar sıfırdan büyük olmalı.").
7. Başarıda: "başarı" sesi/titreşimi, Onay Kodu ekranı.
8. Form doluyken geri tuşu: "Yazdıkların silinecek. Çıkılsın mı?" penceresi (Vazgeç vurgulu / Çık).

### 6.3 Onay Kodu hazır / kod paylaşımı (aynı bileşen Yanıt Kodu ve detaydaki kodlar için de kullanılır)
1. Üst: `geri`, başlık "Onay Kodu hazır". Altında kayıt cümlesi (bölüm 4).
2. Kod kutusu: tek tek seçilebilir, tek dokunuşla tümünü seçer, ≥ 14 px tek aralıklı yazı, `kod` ikonu.
3. **Kodu kopyala**: tam genişlik, 56 dp, bakır-altın dolu, `kopyala` ikonu. Kopyalayınca etiket 2 s "Kopyalandı" olur (ikon `tamam-cift`), kopyalama sesi.
4. Altında "Kodu gönder" başlığı ve ikon çubuğu (v0.2: yuvarlak 56 dp ikon, altında etiket): **WhatsApp** (`whatsapp`), **Telegram** (`telegram`), **E-posta** (`eposta`), **Diğer** (`paylas`). Düğmeler hayalet stil, marka renkleri kullanılmaz.
5. Altta ikincil dokunma hedefleri: "Yanıt Kodu'nu yapıştır" (hayalet), "Ana ekrana dön" (metin düğmesi).
6. Bekleme durumu `saat` ikonlu nötr rozet.
7. Paylaşım ayrıntıları bölüm 7'dedir.

### 6.4 Onayla (kod yapıştır)
1. Tek çok satırlı alan "Kod": `autocapitalize="none" autocorrect="off" spellcheck="false"`, yer tutucu "BB2.…", min 120 dp. Yanında 48 dp **Panodan yapıştır** düğmesi (`navigator.clipboard.readText`, izin/hata olursa "Panoya erişilemedi. Alana uzun basıp yapıştır.").
2. "Kodu kontrol et" (bakır-altın, sticky). Gönderince kod türü otomatik anlaşılır (mevcut davranış).
3. Onay Kodu çözülünce özet kartı: Kişi, Tutar (birimiyle), "Senin tarafın: Borç al/Borç ver" (yön ikonu + renk), Not, Tarih; üstte özet cümlesi (bölüm 4). Bilgi notu: "Bilgiler doğruysa onayla. Yanlışsa onaylama ve karşı tarafa söyle."
4. Düğmeler: **Onaylıyorum** (bakır-altın, `onayla` ikonu, alt bölgede) / **Vazgeç** (hayalet). Aralarında 8 dp.
5. Onay sonrası: `el-sikisma` çizimi, "Onayladın", Yanıt Kodu bileşeni (6.3), onay sesi/titreşimi.
6. Yanıt Kodu uygulanınca: "Kayıt onaylandı" toast + detaya geçiş, onay sesi.
7. Hata metni türleri korunur (bölüm 4 sonundaki ifadeler).

### 6.5 Kayıt detayı
1. Üst: `geri`, kişi adı, durum rozeti. Hero: "Borç verdin/Borç aldın", tutar (birimiyle), ilerleme çubuğu (yön rengi), "Kalan X · ödenen Y".
2. Bilgi kartı: Not (`not`), Tarih (`takvim`), Birim.
3. Bekliyor: Onay Kodu bileşeni (6.3) + "Yanıt Kodu'nu yapıştır".
4. Onaylı: "Ödeme ekle" kartı (`cuzdan`), girdi `inputmode="decimal"`, birim kaydın biriminde sabit simge; "Kısmi ödeme ekle" (hayalet), "Ödendi olarak işaretle" (bakır-altın, `tamam-cift`).
5. Onaylayan taraf: "Yanıt Kodu'nu yeniden gönder" kartı (6.3 bileşeni).
6. Geçmiş: `saat` ikonlu zaman çizelgesi.
7. **Kaydı sil**: en altta, mercan çerçeveli, `cop` ikonu; ortak pencere (bölüm 8). Ödeme eklenince ödeme sesi, ödendiyse ek olarak onay titreşimi yok (ödeme kalıbı yeterli).

### 6.6 Ayarlar
1. Sıra: Ad soyad, Ses ve titreşim, Kurlar, Verilerin, Bluetooth.
2. Ad soyad: `autocapitalize="words"`, "Kaydet" (bakır-altın).
3. Ses ve titreşim: bölüm 3'teki dört öğe.
4. Kurlar: bölüm 5'teki üç satır + uyarı + Kaydet.
5. Verilerin: "JSON olarak dışa aktar" (`disa-aktar`), "JSON içe aktar" (`ice-aktar`); not metni.
6. Bluetooth kartı: `bluetooth` ikonu, "Yakında" rozeti, bilgi metni (`bilgi`).
7. Her kart başlığı 16 px kalın; kartlar arası 16 dp.
8. Ayar değişince toast yerine anahtarın kendisi anında durumu gösterir (toast yalnızca kaydet düğmeleri için).
9. Sürüm numarası sayfa altında soluk metin (isteğe bağlı).

## 7. Kod paylaşımı

Kural: her paylaşım düğmesi önce MESAJIN TAMAMINI panoya kopyalar (dokunma = kullanıcı hareketi, izin sorunu yok), sonra uygulamayı açar.

Mesaj şablonu (Onay Kodu; kod HER ZAMAN son satırdadır):
```
{ad} seninle {tutar} tutarında bir borç kaydı oluşturdu. BorcumBorç uygulamasında alttaki "Onayla" sekmesine dokun, kodu yapıştır, bilgileri kontrol edip "Onaylıyorum"a bas. Uygulaman yoksa: https://github.com/erendizbedev/BorcumBor-
Kod:
{KOD}
```
Yanıt Kodu şablonu:
```
{ad} kaydı onayladı. BorcumBorç uygulamasında "Onayla" sekmesine dokunup alttaki kodu yapıştırırsan kayıt onaylanmış olur.
Kod:
{KOD}
```
`{ad}` boşsa "Bir arkadaşın"; `{tutar}` birimiyle ("150,50 ₺", "12,50 gr"). Mesajda yön yazılmaz (karşı tarafın yönü ters olduğu için yanlış anlaşılır); yön onay ekranında görünür. SMS için kısa şablon: `BorcumBorç kodu (Onayla sekmesine yapıştır): {KOD}`. SMS'te Türkçe karakterler mesajı UCS-2 yapar (70 karakter/parça); kod 200-350 karakter olabileceğinden birkaç parça gider, bu normaldir; ekranda dipnot: "SMS birkaç parça olarak gidebilir."

URL şemaları (hepsinde değer `encodeURIComponent`, satır sonu `%0A`):

| Uygulama | Biçim | Gerekçe |
|---|---|---|
| WhatsApp | `https://wa.me/?text=<mesaj>` | Resmî "click to chat" biçimi; numara yoksa kişi seçtirir. |
| Telegram | `https://t.me/share/url?url=<APP_URL>&text=<mesaj>` | Telegram belgesinde `url` ZORUNLU, `text` isteğe bağlı; istemci url'yi ilk satıra koyar, metni altına ekler. Bu yüzden `url` boş bırakılmaz; `APP_URL` = depo adresi (sabit). Telegram'da mesaj "APP_URL\n{mesaj}" görünür; bu kabul edilir. |
| Diğer | `Share.share({title, text, dialogTitle})` (`@capacitor/share`), yoksa `navigator.share`, o da yoksa kopyala | Sistem paylaşım menüsü; Bluetooth, e-posta, Signal vb. |

Açma: `window.open(url, '_blank')` (Capacitor, izinli olmayan adresleri sistem uygulamasına yönlendirir). Cihazda doğrulanır (kabul ölçütü 36).

Başarısızlık / yedek akış:
1. Düğmeye basınca mesaj kopyalanır, toast "Mesaj kopyalandı".
2. 1,5 s içinde sayfa gizlenmediyse (`visibilitychange` yok): düğme grubunun altında `role="status"` kutu: "{WhatsApp} açılmadı. Mesajı kopyaladım; uygulamayı kendin aç ve yapıştır." + "Tekrar dene" düğmesi (48 dp).
3. Kopyalama da başarısızsa: kod kutusu seçili hale gelir ve "Kodu uzun basıp kopyalayabilirsin" yazılır.
4. `Share.share` kullanıcı vazgeçti ise (iptal) hata gösterilmez.
5. Hata sesi yalnızca gerçek hatalarda çalar; açılmadı uyarısı hata sesi çalmaz.

## 8. Android geri tuşu

`@capacitor/app` `backButton` dinleyicisi; öncelik sırası:
1. Intro açıksa: intro'yu geç.
2. Pencere (dialog) açıksa: kapat (çıkış penceresinde = "Kal"; silme penceresinde = "Vazgeç"). Sonraki adım çalışmaz.
3. Detay ekranı: bir önceki ekran (`history.back()`; geçmiş yoksa Ana).
4. Yeni/Onayla/Ayarlar sekmeleri ve "kod hazır" ekranı: Ana ekrana (`location.replace('#/')`; geçmiş yığını şişmesin). Form doluysa 6.2 madde 8.
5. Ana ekran: **çıkış penceresi**.

Çıkış penceresi: alt sayfa (bottom sheet, başparmak bölgesi), arkası karartılı.
- Başlık: "Uygulamadan çıkmak istiyor musun?" Gövde: "Kayıtların bu telefonda güvende kalır."
- Düğmeler dikey, 8 dp aralık, her biri ≥ 56 dp: üstte **Kal** (bakır-altın dolu, ilk odak, güvenli eylem), altında **Çık** (hayalet/çerçeveli, `cikis` ikonu, nötr; mercan değil, tehlikeli değil). `Çık` -> `App.exitApp()`.
- Aynı bileşen silme (Vazgeç vurgulu / Sil mercan çerçeveli) ve form kaybı için kullanılır; `window.confirm` kaldırılır.
- Erişilebilirlik: `role="dialog"` `aria-modal="true"` `aria-labelledby` (başlık) `aria-describedby` (gövde). Açılınca arka plan (`#app`, `#nav`) `inert` + `aria-hidden`; odak "Kal"a gider, Tab pencere içinde döner (odak tuzağı), Esc ve karartıya dokunma = Kal, kapanınca odak önceki öğeye döner. Açılış duyurusu başlık okunarak olur. Azaltılmış harekette 0 ms.
- Açılırken "pencere" sesi + [15] titreşim; Çık'a basınca ses yok.

## 9. Ekran-ikon eşleme (sprite adları)

| Ekran / yer | İkonlar |
|---|---|
| Alt gezinme | `ana-sayfa`, `yeni`, `onayla`, `ayarlar` |
| Ana: üst/boş durum | `cuzdan`; net kartı: `cuzdan`, `kur` (₺ karşılığı satırı), `bilgi` |
| Ana: birim satırları | `tl`, `dolar`, `euro`, `altin` |
| Ana: liste satırı, rozet | `borc-ver`, `borc-al`; rozet: `saat` (bekliyor), `onayla` (onaylandı), `tamam-cift` (ödendi) |
| Ana: bekleyen satırı | `saat` |
| Yeni kayıt | `borc-ver`, `borc-al`, `tl/dolar/euro/altin` (çipler), `takvim`, `not`, `uyari` (ad boş) |
| Onay kodu hazır | `kod`, `kopyala`, `tamam-cift` (kopyalandı), `whatsapp`, `telegram`, `eposta`, `paylas`, `saat`, `geri` |
| Onayla | `kod`, `kopyala` (Panodan yapıştır için), `borc-ver`/`borc-al` (özet), `onayla`, `el-sikisma` (onay sonrası) |
| Detay | `geri`, `borc-ver`/`borc-al`, `takvim`, `not`, `cuzdan` (ödeme), `tamam-cift`, `saat` (geçmiş), `cop` |
| Ayarlar | `ses-acik`/`ses-kapali`, `titresim`, `kur`, `tl/dolar/euro/altin`, `disa-aktar`, `ice-aktar`, `bluetooth`, `bilgi` |
| Çıkış penceresi | `cikis` (Çık), silme penceresinde `cop` |
| Toast / hata kutusu | başarı: `tamam-cift`; hata: `uyari`; kopya: `kopyala` |
| Açılış | sprite değil: marka işareti (`assets/mark.svg`) |

İkon kuralları: dekoratif ikon `aria-hidden="true"`; yalnızca ikonlu düğme `aria-label` taşır. İkon 24 px, çizgi kalınlığı sprite'a göre sabit; dokunma alanı ≥ 48 dp. İkon tek başına anlam taşımaz (yanında metin).

## 10. Genel ergonomi kuralları

1. Dokunma hedefi ≥ 48 × 48 dp; komşu hedefler arası ≥ 8 dp. Satır içi bağlantılar (ör. "Ayarlar") ayrı 48 dp düğmeye dönüşür.
2. Başparmak bölgesi: sık eylemler (Kaydet, Onayla, Kopyala, Kal) ekranın alt yarısında; yıkıcı eylemler (Sil) ekranın altında ama ana eylemden ≥ 24 dp uzakta ve çerçeveli.
3. Tek elle kullanım: üst köşelere zorunlu eylem konmaz (geri düğmesi dışında; geri tuşu zaten donanımdadır). Klavye açıkken gönder düğmesi görünür kalır (`visualViewport` ile sticky).
4. Metin: gövde ≥ 16 px; yardımcı/not ≥ 14 px; rozet ve alt gezinme etiketi ≥ 12 px kalın; hiçbir metin 12 px altına inmez. Yazı boyutu `rem` ile; sistem yazı tipi 200% büyütülünce yatay kaydırma ve kesilme olmaz (`min-height`, sabit `height` yok).
5. Klavye: tutar `inputmode="decimal"`; ad/not `text`; kod alanı düzeltmesiz; tarih `date`; `enterkeyhint` ile Sonraki/Bitti.
6. Odak: `:focus-visible` halkası (bölüm 1); rota değişince odak yeni ekranın `h1`'ine taşınır; `#app`'teki `aria-live="polite"` KALDIRILIR (her çizimde tüm ekranı okutur); yerine yalnızca `#toast` (`role="status"`) ve hata kutusu (`role="alert"`) canlı bölgedir.
7. Ekran okuyucu: tutarlar birimi söyleyecek şekilde `aria-label` alır ("12,5 gram altın", "1.250 Türk lirası"). Segment ve çipler `radiogroup`/`radio` semantiği taşır. Anahtarlar `role="switch"`.
8. Hata dili: "ne oldu + ne yapmalı", ikinci tekil kişi, suçlamasız, teknik terimsiz, tek cümle (ör. "Kod eksik ya da bozulmuş. Kodun tamamını kopyala."). Hata kodu, `Error`, `undefined` gibi metin kullanıcıya gösterilmez.
9. Yıkıcı eylem (silme) geri alınamaz uyarısıyla ortak pencerede onaylanır; güvenli seçenek vurgulu ve ilk odaktadır.
10. Boş durumlar bir sonraki adımı gösteren düğme içerir.
11. Metin Türkçe büyük/küçük harf kurallarına uyar (`toLocaleUpperCase('tr')`); sesli okunacak her metin tam Türkçedir.

## 11. Kabul ölçütleri (test edilebilir)

Mantık (`node tests/logic.test.js` genişletilir):
1. `createRecord` `cur` alır; `cur` yoksa `TRY`; geçersiz `cur` hata verir.
2. TRY/USD/EUR tutar 2, XAU 3 haneye yuvarlanır (`12,1239` gr -> `12,124`).
3. `requestCode`/`ackCode` çıktısı `BB2.` ile başlar; `decodeCode` bunu `cur` ile geri verir.
4. Eski bir BB1 kodu (v:1, `cur` yok) çözülür ve `cur === 'TRY'` olur; `acceptRequest` bununla TRY kayıt açar.
5. `BB3.…` kodu "daha yeni bir sürümden" hatası verir; `BB2` kodunda `cur` eksik/yanlışsa "geçersiz" hatası.
6. Kodun önüne/arkasına metin eklenmiş (şablon mesajın tamamı) yapıştırma çözülür; kod satır ortasından bölünmüşse de çözülür.
7. `totals()` onaylı net'i birim bazında verir; bekleyen kayıt net'e girmez, `pendingCount` ve `pendingLent/Owe` doğrudur; karışık birimler asla toplanmaz.
8. `groupByPerson` kişi başına birim bazlı net verir.
9. `cur` alanı olmayan eski yedek `validImport`'tan geçer; bilinmeyen `cur` geçmez.
10. Mevcut test dosyasındaki tüm iddialar değişmeden geçer (BB1 test verisi dahil).
11. Renk kontrast testi: tüm ön plan/arka plan çiftleri metin ≥ 4,5:1, ikon/çerçeve/odak ≥ 3:1.

Ana ekran:
12. 1 onaylı + 1 bekleyen kayıtta net kartı onaylıyı gösterir, "Onay bekleyen · 1 kayıt" ayrı satırdadır; yalnızca bekleyen varsa "₺0,00" görünmez, "Henüz onaylı kayıt yok" görünür.
13. TL + Dolar kayıtlı kullanıcıda iki birim satırı vardır; toplam tek sayıda birleşmez.
14. Kur girilmişse "≈ ₺X (elle girilen kura göre)" doğru hesaplanır; bir kur eksikse sayı yok, "Kur gir" bağlantısı var; yalnızca TL varsa satır yok.
15. Hiçbir ekranda "Bana borçlu" / "Ben borçluyum" metni kalmaz (`grep` boş).
16. Tutarlar `+`/`−`, ikon ve metinle de ayırt edilir (gri tonlamada okunur).

Formlar:
17. Yeni kayıtta yön varsayılan seçili değildir; seçmeden gönderince "Borç ver mi, borç al mı? Birini seç." çıkar.
18. 4 birim çipi 360 dp genişlikte tek satırda sığar, her biri ≥ 48 dp yüksek ve ≥ 72 dp geniş.
19. Tutar alanı `inputmode="decimal"`, "12,5" ve "12.5" aynı değeri verir; XAU'da 4. ondalık yazılamaz.
20. Hata mesajı alanın altında görünür, ilk hatalı alana odak gider, `aria-invalid` doğrudur.

Açılış:
21. Soğuk başlatmada intro görünür; uygulama arka plandan öne gelince görünmez.
22. İlk açılışta ≈ 2,0 s, sonrakilerde ≈ 0,9 s sürer; dokununca (150 ms sonra) hemen geçer; geri tuşu da geçer.
23. `prefers-reduced-motion: reduce` iken hiçbir CSS animasyonu çalışmaz, geçiş anlıktır.
24. Intro açıkken `#app` odaklanamaz; bitince odak ana `h1`'dedir.

Ses ve titreşim:
25. Ses kapalıyken hiçbir ses, titreşim kapalıyken hiçbir titreşim çalışmaz; ikisi bağımsızdır.
26. Her olay tablodaki sesi ve titreşim kalıbını verir; aynı anda 1'den fazla ses çalmaz.
27. Uygulama açıldıktan sonra ilk dokunuşta ses çalar (autoplay kısıtı aşılır); `AudioContext` donarsa geri gelince `resume()` olur.
28. Ses seviyesi 0'da sessizdir; ayarlar yeniden açılışta korunur.

Geri tuşu ve pencere:
29. Ana ekranda geri çıkış penceresini açar; "Kal" kapatır, "Çık" uygulamayı kapatır.
30. Pencere açıkken geri önce pencereyi kapatır; detaydan geri önceki ekrana, sekmelerden Ana'ya götürür.
31. Pencerede `role="dialog"`, `aria-modal="true"`, `aria-labelledby/describedby` var; odak "Kal"da başlar, pencere içinde döner, kapanınca eski yere döner; Esc kapatır.
32. `window.confirm` kodda kalmadı.

Paylaşım:
33. "Kodu kopyala" yanında WhatsApp, Telegram, E-posta, Diğer ikonları vardır, her biri ≥ 56 dp.
34. Üretilen URL'ler tabloyla birebir aynıdır (`wa.me/?text=`, `t.me/share/url?url=…&text=`, `mailto:?subject=…&body=…`); mesaj doğru kodlanır (Türkçe karakter, satır sonu).
35. Mesajda kod son satırdadır ve şablon metnini içerir; yapıştırınca çözülür (madde 6).
36. Gerçek Android cihazda her üç düğme ilgili uygulamayı açar ve mesaj dolu gelir; uygulama yoksa yedek kutu ("açılmadı…") görünür ve mesaj panodadır.
37. `Share.share` iptalinde hata çıkmaz.

Erişilebilirlik:
38. Tüm ikonlu düğmelerin `aria-label`'ı var; dekoratif ikonlar `aria-hidden`.
39. `#app`'te `aria-live` yok; TalkBack ile rota değişince yalnızca yeni başlık okunur.
40. Tüm etkileşimli öğeler ≥ 48 dp ve komşuları ≥ 8 dp uzakta; gövde yazısı ≥ 16 px.
41. Sistem yazı boyutu en büyükken hiçbir ekranda metin kesilmez, yatay kaydırma çıkmaz.
42. Odak halkası klavye/TalkBack gezintisinde her öğede görünür.
