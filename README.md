# İş İmparatorluğu v2.0 — İmparatorluk Çağı

Idle tycoon clicker oyunu — işletme kur, borsada spekülasyon yap, IPO ile büyü.

## Geliştirme (Web)

```cmd
cd "oyun yapma"
npm.cmd install
npm.cmd run dev
```

Tarayıcı: http://localhost:5173

## Android APK (Play Store)

### Gereksinimler

- Node.js 18+
- JDK 17
- Android Studio

### Adımlar

1. `.env.example` dosyasını `.env` olarak kopyala ve AdMob birim ID'lerini gir.
2. `npm.cmd run cap:sync` — web build + Android sync
3. `npm.cmd run cap:android` — Android Studio açılır
4. Android Studio: Build → Generate Signed Bundle / APK

## v2.0 Özellikler (İmparatorluk Çağı)

- **Alt navigasyon:** Kazan | Mağaza | Etkinlik | Profil
- **Sezon Yolu:** 30 kademeli İmparatorluk Yolu, haftalık XP track
- **Prestij Ağacı:** Harcanabilir hisse puanı ile 12 kalıcı bonus
- **Yönetici 2.0:** Otomatik satın alma, offline +50% bonus
- **Gece/Gündüz bonusu:** Gündüz tıklama +10%, gece pasif +15%
- **Borsa 2.0:** 3 hisse, sparkline grafik, piyasa olayları
- **10 işletme kademesi** (Uydu İnternet, Merkez Bankası)
- **Kayıt v4** — v3 otomatik migrasyon

## Önceki Özellikler

- 8+ işletme, combo, sinerji, Ar-Ge, yönetici, haftalık etkinlik
- AdMob: ödüllü video, interstitial, banner
- Günlük hedef, IPO, başarımlar, tutorial

## Gizlilik

`public/privacy.html` — Play Store listing için bu URL'yi kullan.
