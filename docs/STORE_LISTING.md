# Play Store Listing — İş İmparatorluğu v3.0

## Uygulama adı

**İş İmparatorluğu** (EN: Business Empire)

## Kısa açıklama (80 karakter)

Idle tycoon: işletme kur, borsa oyna, IPO ile imparatorluğunu büyüt!

## Tam açıklama (özet)

Tıkla, işletme satın al, pasif gelir kazan. Borsada spekülasyon yap, bankadan kredi çek, hanedanını kur. 10 dil, lifestyle, sezon yolu ve golden eventlerle BitLife temposunda idle imparatorluk simülasyonu.

### Öne çıkanlar

- 10+ işletme kademesi, franchise, sinerji
- Borsa, mevduat, IPO / prestij
- Baron profili, hanedan, yaşam tarzı
- Günlük ödül, haftalık hedef, şans sandığı
- 10 dil (TR, EN, ES, DE, FR, PT, RU, JA, ZH, AR)

## Ekran görüntüleri (6–8 adet öneri)

1. **Kazan** — tap alanı + skyline + combo
2. **İşletmeler** — tier band + satın alma
3. **Lifestyle** — konut, araç, refah
4. **Baron** — profil + hanedan
5. **Borsa** — hisse + sparkline
6. **IPO** — birleşme önizleme modal
7. **Etkinlikler** — sezon yolu / günlük görev
8. **Ayarlar** — dil + tema

## İçerik derecelendirmesi

Form notları: illegal işletme / underground temaları simülasyon amaçlı; gerçek para kumarı yok. IAP ve reklam var.

## Data Safety (Google Play)

| Veri | Toplanır | Amaç |
|------|----------|------|
| Reklam ID | Evet (AdMob) | Reklam |
| Satın alma | Evet (Play Billing) | IAP |
| Skor / takma ad | Opsiyonel (Supabase) | Leaderboard |
| Oyun kaydı | Cihazda (localStorage) | İlerleme |

Gizlilik URL: `privacy.html` (hosting domain ile birlikte)

## Internal track

1. `npm run cap:sync`
2. Android Studio → Generate Signed Bundle (AAB)
3. Play Console → Internal testing → 1 hafta QA
