# İş İmparatorluğu v3.0 — Global Release

Idle tycoon clicker — işletme kur, borsada spekülasyon yap, IPO ile imparatorluğunu büyüt.

## Geliştirme (Web)

```cmd
cd "oyun yapma"
npm.cmd install
npm.cmd run dev
```

Tarayıcı: http://localhost:5173

## Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyala:

| Değişken | Açıklama |
|----------|----------|
| `VITE_ADMOB_*` | AdMob birim ID'leri (prod) |
| `VITE_SUPABASE_URL` | Leaderboard (opsiyonel) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_APP_ID` | Capacitor app id |

## Android APK / AAB (Play Store)

### Gereksinimler

- Node.js 18+
- JDK 17
- Android Studio

### Adımlar

1. `.env` dosyasını doldur
2. `npm.cmd run cap:sync` — web build + native plugin sync
3. `npm.cmd run cap:android` — Android Studio
4. Build → Generate Signed Bundle / APK
5. Internal testing track — bkz. `docs/QA.md`, `docs/STORE_LISTING.md`

## v3.0 Özellikler

- **10 dil:** TR, EN, ES, DE, FR, PT, RU, JA, ZH, AR (lazy yükleme)
- **Prod monetizasyon:** AdMob prod, IAP (remove ads, season, VIP), restore
- **Global UX:** Modal/HUD/shop i18n, tier band çevirileri, locale-aware saat
- **Performans:** Code-split bundle (~530 KB JS), ayrı locale chunk'ları
- **Golden event:** ~2 dk ilk, ~3 dk aralık
- **Lifestyle + onboarding:** Konut, araç, refah; ilk açılış dil/ülke
- **Backend:** Supabase leaderboard (env ile), RLS politikaları
- **Crash log:** Local `ii_crash_log` (Crashlytics'e geçiş hazır)

## Önceki özellikler

- Baron profili, hanedan, franchise, borsa 2.0, sezon yolu, prestij ağacı
- AdMob ödüllü video, interstitial, banner
- Kayıt v10 migrasyon

## Gizlilik

`public/privacy.html` — Play Store listing için bu URL'yi kullan.

## QA

Cihaz test matrisi: [docs/QA.md](docs/QA.md)

Store listing rehberi: [docs/STORE_LISTING.md](docs/STORE_LISTING.md)
