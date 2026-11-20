# BorcumBorç Marka Rehberi (v0.3: Mürekkep + Limon + Mor)

> Geçerli renk değerlerinin tek kaynağı `web/tokens.css` dosyasıdır. Bu belge kararları ve gerekçeleri anlatır; `tests/logic.test.js` kontrast eşiklerini her çalıştırmada denetler.

## Fikir
BorcumBorç = BB. İşaret, iki B harfinden kurulu bir monogramdır: solda normal, sağda aynalı iki B, karınları ortada birbirine geçer. Geçtikleri yerde limon bir bağ doğar: iki taraf, tek ortak ve onaylı kayıt. Karşılıklı onay fikri harflerin kendi biçimindedir; ayrıca tik, el sıkışma ya da halka gibi bir ek öğe gerekmez. Hatlar kalın, yuvarlak köşeli ve simetriktir; bankacılık soğukluğu yerine dost canlısı, sağlam bir his verir. Mor değer ve güveni, limon enerjiyi ve olumlu sonucu anlatır.

## Renkler (koyu tema; açık tema yoktur)
Uygulama bileşenlerinde ham hex yerine `var(--c-...)` kullanılır.

### Yüzeyler ve metin
| Değişken | Hex | Rol |
|---|---|---|
| `--c-bg` | #0B0B14 | uygulama zemini (mürekkep); ikon ve açılış zemini de budur |
| `--c-surface` | #14141F | kart |
| `--c-surface-2` | #1C1C2B | yükseltilmiş kart, girdi alanı |
| `--c-surface-3` | #26263A | basılı / seçili durum |
| `--c-line` | #2E2E45 | süs çizgisi (tek başına bilgi taşımaz) |
| `--c-line-strong` | #74749A | girdi, çip ve düğme kenarı (>= 3:1) |
| `--c-text` | #F5F5FA | ana metin |
| `--c-muted` | #A3A3BC | yardımcı metin |
| `--c-hero-bg` | #241A66 | bakiye kartı orta tonu (kontrast referansı) |

### Marka ve anlam renkleri
| Değişken | Hex | Rol |
|---|---|---|
| `--c-violet` / `--c-copper-2` | #7C5CFF / #7048F0 | marka moru; ikon, çerçeve, parlama (metin dışı) |
| `--c-copper-1`, `--c-copper-3` | #7852FF, #6444E6 | mor gradyan durakları (üstünde beyaz) |
| `--c-violet-soft` | #B7A4FF | koyu zeminde mor metin veya ikon |
| `--c-on-accent` | #FFFFFF | mor gradyan üstündeki metin |
| `--c-lime` / `--c-emerald` | #C6F432 | alacak, "borç verdim", onay, onaylandı |
| `--c-emerald-soft` | #DEFA80 | limon, koyu veya mor zemin üstünde |
| `--c-emerald-deep` | #4A6A00 | limon dolgu zemini |
| `--c-on-emerald` | #10140A | limon dolgu üstündeki metin |
| `--c-pink` / `--c-coral` | #FF5C7A | borç, "borç aldım", silme, hata |
| `--c-coral-deep` | #B3243F | mercan dolgu zemini |
| `--c-on-coral` | #2A0711 | mercan dolgu üstündeki metin |
| `--c-gold` | #FFB84D | bekliyor, uyarı, altın birimi (kehribar) |
| `--c-info` | #3DD9EB | bilgi (turkuaz) |

Not: Eski adlar korunmuştur (`--c-emerald` = limon, `--c-copper-*` = mor, `--grad-copper` = `--grad-primary`, `--bg`, `--mint`, `--indigo`...). Yeni kodda anlamsal adlar (`--c-lime`, `--c-violet`, `--c-pink`, `--grad-primary`, `--grad-lime`) tercih edilir.

### Gradyanlar ve yüzeyler
- `--grad-primary` (mor, #7A56FF -> #7852FF -> #6444E6): tek birincil eylem; üstünde `--c-on-accent`.
- `--grad-lime`: limon dolgu; üstünde `--c-on-emerald`.
- `--grad-hero`: bakiye kartı; üstünde `--c-text`, `--c-muted`, `--c-emerald-soft`, `--c-gold` okunur.
- `--grad-glow`, `--grad-glow-lime`: sayfa ve kart köşesi için yumuşak renkli parlama. `--grad-surface`, `--grad-scrim`: yüzey ve örtü.
- Cam yüzey: `background:var(--c-glass); border:1px solid var(--c-glass-line); backdrop-filter:blur(var(--blur-glass))`.
- Saydam rozet zeminleri: `--c-emerald-bg`, `--c-coral-bg`, `--c-gold-bg`, `--c-info-bg`, `--c-violet-bg`.

### Ölçekler
- Yarıçap: 8 / 14 / 18 / 24 / 32 px ve tam yuvarlak (`--r-xs..--r-xl`, `--r-pill`). Kart: `--r-card` 24 px. Düğme: `--r-pill`.
- Aralık: 4 px tabanı (`--sp-1..--sp-10`); bento ızgara aralığı `--bento-gap` 12 px. Dokunma hedefi en az `--tap-min` 48 px.
- Gölge: `--shadow-1..3` sade; renkli parlama yalnızca `--shadow-glow-violet` ve `--shadow-glow-lime`. Odak halkası `--focus-ring` (limon).
- Hareket: yalnızca transform ve opacity, 90 / 160 / 240 / 420 ms; `prefers-reduced-motion` altında süreler sıfırlanır.

### WCAG kontrast (hesaplanmış, göreli parlaklık oranı)
AA şartı: normal metin 4.5:1, bileşen sınırı ve ikon 3:1. Aşağıdaki tablo `tokens.css` değerlerinden betikle üretilmiştir; **59 çiftin 59'u geçer**.

Özet (en düşük değerler):
- Ana metin, sönük metin, limon, mercan, kehribar ve turkuaz; dört yüzeyin hepsinde 4.5:1 üstü (en düşük: mercan `surface-3` üstünde).
- Beyaz, mor gradyan durakları üstünde en az 4.72:1 (`#7852FF`). Not: marka moru `#7C5CFF` üstünde beyaz 4.35:1 verir ve AA geçmez; bu yüzden düğme gradyanı biraz koyulaştırılmış duraklarla kurulmuştur, `#7C5CFF` yalnızca metin dışı kullanılır.
- Koyu `#10140A` limon üstünde 14.55:1; `#2A0711` mercan üstünde 6.21:1.
- Bakiye kartı `--grad-hero` en açık durağı `#322486`: sönük metin 4.92:1.
- Mercan bakiye kartı orta tonunda (#241A66) 4.99:1.

Tüm çiftler:

| Ön | Zemin | Oran | Eşik | Sonuç |
|---|---|---|---|---|
| `c-text` | `c-bg` | 18.02 | 4.5 | geçer |
| `c-text` | `c-surface` | 16.81 | 4.5 | geçer |
| `c-text` | `c-surface-2` | 15.45 | 4.5 | geçer |
| `c-text` | `c-surface-3` | 13.60 | 4.5 | geçer |
| `c-muted` | `c-bg` | 7.95 | 4.5 | geçer |
| `c-muted` | `c-surface` | 7.41 | 4.5 | geçer |
| `c-muted` | `c-surface-2` | 6.82 | 4.5 | geçer |
| `c-muted` | `c-surface-3` | 6.00 | 4.5 | geçer |
| `c-emerald` | `c-bg` | 15.28 | 4.5 | geçer |
| `c-emerald` | `c-surface` | 14.26 | 4.5 | geçer |
| `c-emerald` | `c-surface-2` | 13.11 | 4.5 | geçer |
| `c-emerald` | `c-surface-3` | 11.53 | 4.5 | geçer |
| `c-coral` | `c-bg` | 6.59 | 4.5 | geçer |
| `c-coral` | `c-surface` | 6.14 | 4.5 | geçer |
| `c-coral` | `c-surface-2` | 5.65 | 4.5 | geçer |
| `c-coral` | `c-surface-3` | 4.97 | 4.5 | geçer |
| `c-gold` | `c-bg` | 11.39 | 4.5 | geçer |
| `c-gold` | `c-surface` | 10.63 | 4.5 | geçer |
| `c-gold` | `c-surface-2` | 9.77 | 4.5 | geçer |
| `c-gold` | `c-surface-3` | 8.60 | 4.5 | geçer |
| `c-info` | `c-bg` | 11.49 | 4.5 | geçer |
| `c-info` | `c-surface` | 10.72 | 4.5 | geçer |
| `c-info` | `c-surface-2` | 9.86 | 4.5 | geçer |
| `c-info` | `c-surface-3` | 8.67 | 4.5 | geçer |
| `c-violet-soft` | `c-bg` | 9.11 | 4.5 | geçer |
| `c-violet-soft` | `c-surface` | 8.50 | 4.5 | geçer |
| `c-violet-soft` | `c-surface-2` | 7.81 | 4.5 | geçer |
| `c-violet-soft` | `c-surface-3` | 6.87 | 4.5 | geçer |
| `c-on-accent` | `c-copper-1` | 4.72 | 4.5 | geçer |
| `c-on-accent` | `c-copper-2` | 5.42 | 4.5 | geçer |
| `c-on-accent` | `c-copper-3` | 5.98 | 4.5 | geçer |
| `c-on-accent` | `#7A56FF` | 4.56 | 4.5 | geçer |
| `c-on-emerald` | `c-emerald` | 14.55 | 4.5 | geçer |
| `c-on-coral` | `c-coral` | 6.21 | 4.5 | geçer |
| `c-text` | `c-coral-deep` | 5.96 | 4.5 | geçer |
| `c-text` | `c-emerald-deep` | 5.76 | 4.5 | geçer |
| `c-text` | `c-hero-bg` | 13.66 | 4.5 | geçer |
| `c-text` | `#322486` | 11.16 | 4.5 | geçer |
| `c-muted` | `c-hero-bg` | 6.02 | 4.5 | geçer |
| `c-muted` | `#322486` | 4.92 | 4.5 | geçer |
| `c-emerald-soft` | `c-hero-bg` | 12.79 | 4.5 | geçer |
| `c-emerald-soft` | `#322486` | 10.44 | 4.5 | geçer |
| `c-gold` | `c-hero-bg` | 8.64 | 4.5 | geçer |
| `c-gold` | `#322486` | 7.05 | 4.5 | geçer |
| `c-line-strong` | `c-bg` | 4.39 | 3 | geçer |
| `c-line-strong` | `c-surface` | 4.09 | 3 | geçer |
| `c-line-strong` | `c-surface-2` | 3.76 | 3 | geçer |
| `c-violet` | `c-bg` | 4.51 | 3 | geçer |
| `c-violet` | `c-surface` | 4.20 | 3 | geçer |
| `c-violet` | `c-surface-2` | 3.86 | 3 | geçer |
| `c-copper-2` | `c-bg` | 3.61 | 3 | geçer |
| `c-copper-2` | `c-surface` | 3.37 | 3 | geçer |
| `c-copper-2` | `c-surface-2` | 3.10 | 3 | geçer |
| `c-gold` | `c-bg` | 11.39 | 3 | geçer |
| `c-gold` | `c-surface` | 10.63 | 3 | geçer |
| `c-gold` | `c-surface-2` | 9.77 | 3 | geçer |
| `c-coral` | `c-hero-bg` | 4.99 | 3 | geçer |
| `c-emerald-soft` | `c-hero-bg` | 12.79 | 3 | geçer |
| `c-bg` | `c-info` | 11.49 | 3 | geçer |

Test notu: `tests/logic.test.js` bakiye kartı için eski `#174A39` değerini sabit olarak kullanır; yeni kart zemini `--c-hero-bg` (#241A66) olduğundan bu değer güncellenmelidir (sönük metin eski değerde 4.11:1 verir).

## Tipografi
- Ana yazı: Plus Jakarta Sans (400, 600, 700), `--font-sans`.
- Tutar, büyük rakamlar ve logo yazısı: Bricolage Grotesque (600, 700, 800), `--font-num`. Rakamlarda `font-variant-numeric:tabular-nums` kullanın.
- Yazı tipleri `web/fonts/` içinde (latin + latin-ext woff2); uygulama internetsiz çalışır. @font-face tanımları `tokens.css` başındadır.
- Türkçe karakterler ve ₺ (U+20BA) iki fontta da latin-ext dosyalarıyla desteklenir.
- Ölçek: 11, 12, 14, 16, 18, 22, 28, 36, 44 px (`--fs-*`).

## Logo kuralları
### Anlam
- İki B = iki taraf (BorcumBorç). Aynalı yerleşim = eşitlik; kimse "üstte" değildir.
- Karınların kesiştiği limon alanlar = karşılıklı onay. Üstteki küçük alan "teklif", alttaki büyük alan "kabul" gibi okunabilir; ikisi birlikte tek bağdır.
- Mor = güven, değer. Limon = enerji, olumlu sonuç. Koyu mürekkep zemin = sakin, güvenli ortam.

### Dosyalar
- `logo.svg`: yatay, işaret + yazı (yazı eğriye çevrilmiştir, font gerekmez). `mark.svg`: yalnızca işaret. `favicon.svg`: yuvarlak köşeli koyu zeminde, kalınlaştırılmış çizgili sürüm. `mark-animated.svg`: animasyonlu sürüm, ayrı yönetilir.
- Uygulama ikonları: `icon-180.png` (iOS), `icon-192.png`, `icon-512.png` ve `resources/icon.png` (1024), `resources/splash.png` (2732).

### Yapı (256 x 256 tuval; ayrıntı ve koordinatlar `/tmp/logo-bb/uygulanan-yapi.txt` özetindedir)
- Tek bir B yolu çizilir (kendi çizimimiz, yazı tipinden değil): gövde + küçük üst karın + büyük alt karın, çizgi 26 birim, yuvarlak uç ve köşe, yükseklik 172.
- Sol B: gövde x = 30, üst y = 42. Sağ B: aynı yol yatayda aynalı, gövde x = 226.
- Her iki B mor gradyan (#A68CFF sol-üst -> #6444E6 sağ-alt). B'lerin kesişen çizgi alanları limon gradyanla (#E4FB8E -> #A6D41C) boyanır.
- Küçük boyutta (favicon) çizgi 34 birime kalınlaştırılır.

### Renkler
- Mor: #A68CFF -> #6444E6. Limon: #E4FB8E -> #A6D41C. Zemin: #0B0B14. Yazıda "Borcum" #F5F5FA, "Borç" limon gradyan (#E4FB8E -> #C6F432 -> #A6D41C).

### Güvenli alan ve boyut
- İşaretin çevresinde, işaret yüksekliğinin en az yarısı kadar boşluk bırakın. Android maskeli ikonda işaret, tuvalin ortasında ve %66'lık güvenli daire içindedir (işaret genişliği tuvalin yaklaşık %48'i).
- En küçük kullanım: işaret 24 px, favicon 16 px (favicon.svg kullanın). 48 px'te "BB" ve limon bağ net okunur.
- Yalnızca `--c-bg` (#0B0B14) ya da bu rengin çok koyu radyal zeminlerinde kullanın.

### Yapılmayacaklar
- İşareti döndürmeyin, eğmeyin, renklerini değiştirmeyin, tek renge boyamayın (monokrom gerekirse beyaz #F5F5FA tam işaret), gölge eklemeyin, harfleri ayırmayın.
- Başka bir markayı veya logoyu andıran öğe eklenmez.

### Uygulama ikonu ve açılış ekranı
- `resources/icon.png` 1024x1024, `icon-512.png`, `icon-192.png`, `icon-180.png`: #0B0B14 zemin, ortada işaret, çok hafif mor parlama (`#7C5CFF` %30 saydam radyal).
- `resources/splash.png` 2732x2732: aynı kompozisyon, işaret büyütülmüş ve merkezde.
- Zemin renkleri tek değerdir: `#0B0B14` (`manifest.webmanifest`, `capacitor.config.json`, `.github/workflows/android.yml`).

## İkon kullanımı
- Tek sprite: `assets/icons.svg`. Kullanım: `<svg class="ic" aria-hidden="true"><use href="assets/icons.svg#ana-sayfa"/></svg>`. Önizleme: `assets/icons-preview.html`. Tüm kimlikler `assets/icon-ids.txt` içindedir.
- Çizgi ikonlar: 24x24 ızgara, 2,25 px çizgi, yuvarlak uç ve birleşim, `currentColor`, güvenli alan 2,5 px. Boyutu CSS ile verin (20 ve 24 px standart).
- Renk: etkin ikon `--c-text`, pasif `--c-muted`, vurgu `--c-violet-soft`, alacak/onay `--c-lime`, borç/silme/hata `--c-coral`, bekliyor `--c-gold`, bilgi `--c-info`.
- Kimlikler (45): ana-sayfa, yeni, onayla, ayarlar, cuzdan, borc-ver, borc-al, el-sikisma, kod, kopyala, paylas, whatsapp, telegram, eposta, takvim, not, cop, geri, cikis, ses-acik, ses-kapali, titresim, bilgi, uyari, saat, tamam-cift, tl, dolar, euro, altin, kur, disa-aktar, ice-aktar, bluetooth; v0.3 ile eklenenler: izgara (3x3 dolu nokta), kisiler, gecmis, hakkinda, kapat, alacak (gelen ok), borc (giden ok); rozetler: tl-rozet, dolar-rozet, euro-rozet, altin-rozet.
- `izgara` dolgu ikondur (`fill:currentColor`), diğerleri çizgidir.
- Para birimi rozetleri (dolgulu): disk `currentColor` ile boyanır, glif şeffaf kesiktir; zeminin rengi görünür.
- whatsapp, telegram, eposta ikonları marka logosu değil, genel "mesaj gönder" biçimleridir.
- Anlamlar: tamam-cift = onaylandı, saat = bekliyor, onayla = kalkan + onay, alacak = gelen, borc = giden.
