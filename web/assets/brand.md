# BorcumBorç Marka Rehberi

## Fikir
İki yarım halka, ortada buluşuyor. Yeşil yarım halka alacağı ve güveni (zümrüt), bakır-altın yarım halka verilen/ödenen değeri (altın) anlatır. İki yarım birbirinden hafifçe kaymış ama ortak merkezde (krem baklava, "mühür") birleşiyor: iki taraf, tek ortak kayıt. Onay işareti klişesi kullanılmaz; onay fikri biçimin kendisindedir. Animasyonda tam daire önce çizilir, sonra ikiye ayrılıp kayarak yerine oturur.

## Renkler (koyu tema; açık tema yoktur)
Kaynak: `web/tokens.css`. Uygulama bileşenlerinde ham hex yerine `var(--c-...)` kullanılır.

| Değişken | Hex | Rol |
|---|---|---|
| `--c-bg` | #0A1412 | uygulama zemini (mürekkep-orman) |
| `--c-surface` | #11221E | kart |
| `--c-surface-2` | #17302A | yükseltilmiş kart, girdi alanı |
| `--c-surface-3` | #1F3D35 | basılı / seçili durum |
| `--c-line` | #24443B | süs çizgisi |
| `--c-line-strong` | #4F8A76 | girdi ve bileşen kenarı |
| `--c-text` | #F6EFE3 | ana metin (krem) |
| `--c-muted` | #9FB3A9 | yardımcı metin |
| `--c-emerald` | #3FCB8B | alacak, "borç verdim", güven, onaylandı |
| `--c-emerald-soft` | #7BE0B0 | koyu zümrüt zemin (hero) üstündeki zümrüt metin |
| `--c-emerald-deep` | #17604A | zümrüt dolgu zemini |
| `--c-coral` | #F78E70 | "borç aldım", dikkat, silme, hata |
| `--c-coral-deep` | #A63F28 | mercan dolgu zemini |
| `--c-gold` | #E4B068 | bekliyor, uyarı, altın birimi |
| `--c-info` | #8CC3D1 | bilgi |
| `--c-copper-1/2/3` | #F0C47E / #D99A52 / #BE7637 | ana eylem gradyanı (`--grad-copper`) |
| `--c-on-accent` | #1C0F04 | bakır gradyan üstündeki metin |
| `--c-on-emerald` | #06150E | zümrüt dolgu üstündeki metin |
| `--c-on-coral` | #1E0A04 | mercan dolgu üstündeki metin |

Anlamsal roller: zümrüt = alacak/olumlu/onaylı; mercan = borç/olumsuz/silme; altın = bekleyen onay ve uyarı; bakır-altın gradyan = tek birincil eylem düğmesi (ekranda en fazla bir tane). Tek başına renge güvenmeyin: tutarın yanında işaret (+/−) ve ikon bulunur.

Eski adlar (`--bg`, `--surface`, `--mint`, `--amber`, `--danger`, `--indigo`...) tokens.css içinde yeni renklere eşlenmiştir; yeni kodda `--c-*` kullanın.

### WCAG kontrast (hesaplanmış, göreli parlaklık oranı)
AA şartı: normal metin 4.5:1, bileşen sınırı 3:1.

| Metin \ Zemin | bg | surface | surface-2 | surface-3 |
|---|---|---|---|---|
| krem metin #F6EFE3 | 16.38 | 14.45 | 12.31 | 10.34 |
| sönük #9FB3A9 | 8.46 | 7.47 | 6.36 | 5.34 |
| zümrüt #3FCB8B | 9.03 | 7.96 | 6.78 | 5.70 |
| zümrüt-soft #7BE0B0 | 11.71 | 10.33 | 8.80 | 7.39 |
| mercan #F78E70 | 8.08 | 7.12 | 6.07 | 5.10 |
| altın #E4B068 | 9.55 | 8.42 | 7.17 | 6.03 |
| bilgi #8CC3D1 | 9.67 | 8.53 | 7.26 | 6.10 |

Dolgu ve özel zeminler:
- Koyu mürekkep #1C0F04, bakır gradyan durakları üstünde: #F0C47E 11.53, #D99A52 7.77, #BE7637 5.21 (en düşük 5.21).
- #06150E zümrüt #3FCB8B üstünde 9.03; #1E0A04 mercan #F78E70 üstünde 8.23.
- Krem metin, mercan dolgu #A63F28 üstünde 5.46; zümrüt dolgu #17604A üstünde 6.54.
- Rozet/çip (renk %14 saydam, surface üstünde): zümrüt 6.03, mercan 5.65, altın 6.38, bilgi 6.35. surface-2 üstünde en düşük 4.83 (mercan).
- Bakiye kartı `--grad-hero` en açık durağı #174A39: krem 8.86, sönük 4.58, zümrüt-soft 6.33, altın 5.16. Mercan bu zeminde 4.37 verir, AA geçmez; hero içinde mercan METİN kullanmayın (krem kullanın).
- `--c-line-strong` #4F8A76: surface üstünde 4.11, surface-2 üstünde 3.50, bg üstünde 4.66 (bileşen sınırı için 3:1 sağlanır).
- `--c-line` yalnızca süstür, tek başına bilgi taşımaz.

## Tipografi
- Ana yazı: Plus Jakarta Sans (400, 600, 700), `--font-sans`.
- Tutar ve büyük rakamlar, logo yazısı: Bricolage Grotesque (600, 700, 800), `--font-num`. Rakamlarda `font-variant-numeric:tabular-nums` kullanın (listede basamaklar hizalı kalır).
- Dosyalar `web/fonts/` içinde (latin + latin-ext woff2), uygulama internetsiz çalışır. @font-face tanımları `tokens.css` içindedir.
- Türkçe karakterler (ç ğ ı İ ö ş ü) iki fontta da latin/latin-ext dosyalarıyla tam desteklenir. ₺ (U+20BA) iki fontun latin-ext dosyalarında VAR; tarayıcı `unicode-range` ile otomatik seçer. Bricolage'ın latin-ext dosyasında tnum özelliği yoktur ama ₺ tek glif olduğundan sorun çıkarmaz.
- Ölçek: 11, 12, 14, 16, 18, 22, 28, 36, 44 px (`--fs-*`).

## Logo kuralları
- Dosyalar: `logo.svg` (yatay, yazı eğriye çevrilmiştir, font gerekmez), `mark.svg` (yalnızca işaret), `favicon.svg` (sadeleştirilmiş: daha kalın çizgi, ortada baklava yok), `mark-animated.svg` (açılış ekranı, tek sefer ~2 sn, `prefers-reduced-motion` altında son hâli gösterir), `icon-192.png`, `icon-512.png`, `resources/icon.png` (1024, tam kenara taşan, işaret merkez %62 içinde), `resources/splash.png` (2732, içerik merkez 1200 içinde).
- Yalnızca #0A1412, #11221E veya bu ailenin çok koyu radyal zeminlerinde kullanın.
- Çevresinde işaret yüksekliğinin en az yarısı kadar boşluk bırakın.
- İşareti döndürmeyin, eğmeyin, renklerini değiştirmeyin, gölge/parlama eklemeyin. Yarım halkaların kayma yönü sabittir (yeşil yukarı, bakır aşağı).
- İşaret 24 px'ten küçük kullanılmaz; küçükte `favicon.svg`.
- Yazıda "Borcum" krem (#F6EFE3), "Borç" bakır gradyan; Türkçe ç korunur.
- Başka bir markayı veya logoyu andıran öğe eklenmez.

## İkon kullanımı
- Tek sprite: `assets/icons.svg`. Kullanım: `<svg class="ic" aria-hidden="true"><use href="assets/icons.svg#ana-sayfa"/></svg>`. Önizleme: `assets/icons-preview.html` (bir http sunucusundan açın; file:// ile Chrome harici `<use>` yüklemez).
- Çizgi ikonlar: 24x24 ızgara, 1.75 px çizgi, yuvarlak uç ve birleşim, `currentColor`. Boyutu CSS ile verin (20 ve 24 px standarttır; 20 px'te okunur), çizgi kalınlığını değiştirmeyin.
- Renk: etkin ikon `--c-text` veya `--c-emerald`, pasif `--c-muted`, vurgulu eylem `--c-copper-2`, silme ve hata `--c-coral`, bekliyor `--c-gold`. Dokunma alanı en az 48 px.
- Kimlikler: ana-sayfa, yeni, onayla, ayarlar, cuzdan, borc-ver, borc-al, el-sikisma, kod, kopyala, paylas, whatsapp, telegram, sms, takvim, not, cop, geri, cikis, ses-acik, ses-kapali, titresim, bilgi, uyari, saat, tamam-cift, tl, dolar, euro, altin, kur, disa-aktar, ice-aktar, bluetooth.
- Para birimi rozetleri (dolgulu): `tl-rozet`, `dolar-rozet`, `euro-rozet`, `altin-rozet`. Disk `currentColor` ile boyanır, glif şeffaf kesiktir; zeminin rengi görünür.
- whatsapp, telegram, sms ikonları marka logosu değil, genel "mesaj gönder" biçimleridir (yuvarlak balon + yukarı ok, kağıt uçak, noktalı balon) ve tek renk paletle kullanılır; marka renkleri kullanılmaz.
- Tamam-çift = onaylandı, saat = bekliyor, onayla = kalkan + onay (karşılıklı onay eylemi).
