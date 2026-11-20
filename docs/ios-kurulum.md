# iOS kurulum paketi

BorcumBorç aynı web kodundan (`web/`) Capacitor ile iOS uygulaması üretir. Android'deki APK'nın iOS karşılığı `.ipa` dosyasıdır. Apple kuralları gereği bir iPhone'a kurulabilen `.ipa`, ücretli bir Apple Developer hesabıyla imzalanmak zorundadır.

## Hazır olanlar

| Parça | Durum |
| --- | --- |
| Capacitor iOS bağımlılığı (`@capacitor/ios`) | Eklendi |
| iOS derleme akışı (`.github/workflows/ios.yml`) | Hazır |
| İkon ve açılış ekranı üretimi (iOS) | Akışa dahil |
| Safari ana ekrana ekleme meta etiketleri | Eklendi |
| İmzasız simülatör derlemesi | Akış her çalıştığında yapılır |
| İmzalı `.ipa` | Apple hesabı bilgileri girilince otomatik üretilir |

## 1. Üyelik olmadan: Safari ile kurulum

1. iPhone'da Safari ile uygulamanın web adresini aç.
2. Paylaş düğmesine dokun, **Ana Ekrana Ekle**'yi seç.
3. Uygulama ana ekranda tam ekran ve internetsiz açılır.

Bu mağaza uygulaması değil, web sürümüdür. Titreşim bu yolla çalışmaz.

## 2. Üyelikle: imzalı `.ipa` (TestFlight / App Store)

Gerekenler: Apple Developer Program üyeliği (yıllık 99 USD).

1. developer.apple.com > Certificates, Identifiers & Profiles:
   - Identifier: `com.borcumboc.app` (App ID) oluştur.
   - **Apple Distribution** sertifikası oluştur, `.p12` olarak dışa aktar (parola belirle).
   - Bu App ID için **App Store** türünde Provisioning Profile oluştur, `.mobileprovision` olarak indir.
2. Dosyaları base64'e çevir (Mac/Linux): `base64 -i dosya.p12 | pbcopy` (ya da `base64 dosya.p12`).
3. GitHub deposunda Settings > Secrets and variables > Actions > New repository secret ile şu 4 anahtarı ekle:

| Anahtar | İçerik |
| --- | --- |
| `IOS_TEAM_ID` | Apple geliştirici takım kimliği (10 karakter) |
| `IOS_CERT_P12_BASE64` | `.p12` dosyasının base64 hâli |
| `IOS_CERT_PASSWORD` | `.p12` parolası |
| `IOS_PROFILE_BASE64` | `.mobileprovision` dosyasının base64 hâli |

4. Actions > **iOS derleme** > Run workflow. İş bitince `BorcumBorc-ios-ipa` artifact'ı indirilir.
5. `.ipa` dosyasını App Store Connect'e (Transporter uygulaması ile) yükle, TestFlight'tan test kullanıcılarına dağıt.

Not: İmzalı `.ipa` adımları gerçek bir Apple hesabıyla henüz denenmedi; ilk çalıştırmada imza ayarlarında düzeltme gerekebilir.
