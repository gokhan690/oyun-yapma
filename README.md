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
- Kendi yazdığımız daire fiziği (`src/merge/physics.ts`) — harici motor yok: açısal hız +
  temas sürtünmesi (meyveler gerçekten yuvarlanır), momentum koruyan birleşmeler,
  boyuta bağlı esneklik, darbe olayları (ses + ezilme)
- Işık dünya uzayında sabit: parlama meyve dönerken yerinde kalır; temas gölgesi
  meyve zemine yaklaştıkça koyulaşır
- **Yardımcılar:** 💣 bomba (bir meyveyi patlatır) ve 🔄 takas (eldeki meyveyle sıradakini
  değiştirir); skorla yeni hak kazanılır
- **Zen modu:** tehlike çizgisi yok, oyun bitmez (rekor tablosuna yazılmaz)
- Sprite önbelleği + statik zemin + süpür-ve-ele çarpışma taraması ile telefonda akıcı
- Sürükle-bırak (dokunmatik + fare) ve klavye (← → boşluk) kontrolü
- Zincirleme birleşmelerde combo çarpanı (×5'e kadar), çarpma ezilmesi, meyve suyu sıçraması, göz kırpma
- Ekranda sadece skor, tahta ve iki düğme var; açılış/devam kartı ve oyun sonu kartı tahtanın üstünde
- Skor, rekor ve yarım kalan oyun `localStorage`'da saklanır (sayfayı kapatsan da kaldığın yerden devam)
- Ses efektleri WebAudio ile üretilir, tek tuşla kapatılır; ana uygulamanın AdMob/IAP kodundan tamamen ayrıktır
- Açılış kartında meyve sıralaması (kiraz → karpuz) ve kaldığın oyuna devam seçeneği
- Tek dosya sürüm: `node scripts/build-merge-standalone.mjs cikti.html` (CSS+JS gömülü, ağ isteği yok)

### Telefona kurma

| Yöntem | Nasıl | Not |
|--------|-------|-----|
| **Ana ekrana ekle (önerilen)** | Sayfayı telefonda aç → Android/Chrome: menü → "Uygulamayı yükle"; iPhone/Safari: Paylaş → "Ana Ekrana Ekle" | Tam ekran açılır, ikon gelir, servis çalışanı sayesinde ilk açılıştan sonra **çevrimdışı** oynanır |
| **Tek dosya** | `node scripts/build-merge-standalone.mjs meyve-birlestir.html` → dosyayı telefona at, tarayıcıyla aç | Sunucu gerekmez; `file://` üzerinde de çalışır |
| **APK** | `npm run cap:android` → Android Studio → Build | Capacitor projesi zaten kurulu |

PWA parçaları: `public/merge.webmanifest`, `public/merge-sw.js` (yalnız oyunun kendi
dosyalarını önbelleğe alır, ana uygulamaya dokunmaz), `public/merge-icon*.png`
(`node scripts/gen-merge-icons.mjs` ile SVG'den üretilir).

`file://` üzerinde ve "site verilerini engelle" açıkken `localStorage` istisna
fırlatır; tüm depolama erişimi `src/merge/storage.ts` üzerinden korumalı yapılır,
erişim yoksa skorlar oturum boyunca bellekte tutulur.

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
