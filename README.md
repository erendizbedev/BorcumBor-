<p align="center">
  <img src="web/assets/logo.svg" alt="BorcumBorç" width="320">
</p>

# BorcumBorç

İki kişi arasındaki borcu **internetsiz** ve **karşılıklı onayla** kaydeden sade bir borç defteri.

Kayıt, yalnızca karşı taraf onayladığında geçerli sayılır. Veriler telefonunda durur, bir sunucuya gönderilmez.

## Ne yapar?

- Borç ve alacak kaydı tutar (kişi, tutar, tarih, not).
- Her kayıt için bir **Onay Kodu** üretir. Karşı taraf bu kodu kendi telefonunda onaylar ve bir **Yanıt Kodu** döndürür. Yanıt Kodu girilince kayıt "Onaylandı" olur.
- Kısmi ödemeleri ve "Ödendi" durumunu izler.
- Toplam alacak ve borç durumunu ana ekranda gösterir.
- Dolar, euro ve altın kurunu internetten otomatik alır; ₺ karşılığını gösterir.
- Verileri JSON olarak dışa ve içe aktarır.
- İnternet olmadan çalışır.

## Durum

Bu sürüm bir **prototiptir**.

| Özellik | Durum |
| --- | --- |
| Borç kaydı, liste, ödeme takibi | Hazır |
| Kod ile karşılıklı onay | Hazır |
| Çevrimdışı çalışma | Hazır |
| Bluetooth ile telefonlar arası eşleşme | Sonraki sürüm |
| Mağaza imzalı (release) APK | Sonraki sürüm |

## APK indirme

Her `main` dalı güncellemesinde GitHub Actions bir Android APK derler ve **Releases** sayfasındaki `son-surum` sürümüne `BorcumBorc.apk` olarak koyar.

1. Telefonda bu deponun **Releases** sayfasını aç.
2. `BorcumBorc.apk` dosyasını indir.
3. Dosyayı açıp kurulum iznini ver.

Not: Bu APK "debug" imzalıdır. Kurulumda bilinmeyen kaynak uyarısı çıkabilir.

## Web sürümü

`web/` klasörü uygulamanın tamamıdır ve tarayıcıda da çalışır. GitHub Pages için **Actions → Web sayfası (GitHub Pages) → Run workflow** çalıştırılır. Özel depolarda Pages için ücretli GitHub planı gerekir.

## Yapı

```
web/          Uygulama (HTML, CSS, JS, yazı tipleri, logo)
resources/    Uygulama ikonu ve açılış ekranı kaynakları
.github/      APK ve Pages derleme akışları
```

Android paketleme Capacitor ile yapılır. `android/` klasörü derleme sırasında üretilir ve depoya konmaz.

## Tasarım

Gece laciverti koyu tema, periwinkle ana eylem, nane (alacak) ve gül (borç) vurgusu, Plus Jakarta Sans yazı tipi. Son değişiklikler: [`docs/v0.2-degisiklikler.md`](docs/v0.2-degisiklikler.md). Ayrıntılar: [`web/assets/brand.md`](web/assets/brand.md).
