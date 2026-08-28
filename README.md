# İş İmparatorluğu v3.0 — Global Release

Idle tycoon clicker — işletme kur, borsada spekülasyon yap, IPO ile imparatorluğunu büyüt.

## Geliştirme (Web)

```cmd
cd "oyun yapma"
npm.cmd install
npm.cmd run dev
```

Tarayıcı: http://localhost:5173

## 🍉 Meyve Birleştir (reklamsız mini oyun)

Suika tipi "düşür ve birleştir" oyunu — **reklam yok, satın alma yok, internet gerekmiyor.**

| | |
|---|---|
| Sayfa | `merge.html` |
| Kaynak | `src/merge-main.ts`, `src/merge/` |
| Dev | `npm run dev` → http://localhost:5173/merge.html |
| Prod | build sonrası `dist/merge.html` (ör. `/oyun-yapma/merge.html`) |

- 11 meyve zinciri: Kiraz → Çilek → Üzüm → Mandalina → Portakal → Elma → Armut → Şeftali → Ananas → Kavun → **Karpuz**
- Kendi yazdığımız daire fiziği (`src/merge/physics.ts`) — harici motor yok
- Sürükle-bırak (dokunmatik + fare) ve klavye (← → boşluk) kontrolü
- Zincirleme birleşmelerde combo çarpanı (×5'e kadar), çarpma ezilmesi, meyve suyu sıçraması, göz kırpma
- Ekranda sadece skor, tahta ve iki düğme var; açılış/devam kartı ve oyun sonu kartı tahtanın üstünde
- Skor, rekor ve yarım kalan oyun `localStorage`'da saklanır (sayfayı kapatsan da kaldığın yerden devam)
- Ses efektleri WebAudio ile üretilir, tek tuşla kapatılır; ana uygulamanın AdMob/IAP kodundan tamamen ayrıktır
- Tek dosya sürüm: `node scripts/build-merge-standalone.mjs cikti.html` (CSS+JS gömülü, ağ isteği yok)

Test:

```cmd
npm run build
npx vite preview
node scripts/test-merge.mjs http://localhost:4173/merge.html
```

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
