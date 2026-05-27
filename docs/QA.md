# QA Matrisi — İş İmparatorluğu v3.0

Internal testing track öncesi cihaz kontrol listesi.

## Cihaz profilleri

| Profil | RAM | Android | Not |
|--------|-----|---------|-----|
| Düşük | 2 GB | 8–10 | Scroll / tap gecikmesi |
| Orta | 4 GB | 11–13 | Ana hedef kitle |
| Yüksek | 6+ GB | 14+ | POST_NOTIFICATIONS, billing |

## Fonksiyonel akışlar

- [ ] **İlk açılış:** Onboarding dil + ülke → earn ekranı
- [ ] **Save migrate:** v1 yedek → v10 yükleme, para/işletme korunur
- [ ] **Offline kazanç:** Uygulama kapat → 5+ dk sonra popup, reklam/topla
- [ ] **Comeback / daily reward:** Seri kaybı + spin wheel
- [ ] **Golden event:** ~2 dk ilk, ~3 dk aralık, reklam claim
- [ ] **Dil değişimi:** Ayarlar → EN; HUD + modal + shop çevrilir, state korunur
- [ ] **RTL:** Arapça seç → `dir=rtl`, nav/shop scroll bozulmaz
- [ ] **IAP sandbox:** remove_ads, season_premium, restore purchases
- [ ] **Reklam:** Banner + interstitial; removeAds satın alınca kapanır
- [ ] **Bildirim izni:** Android 13+ POST_NOTIFICATIONS akışı
- [ ] **Leaderboard:** Supabase env doluysa skor gönderimi

## Regresyon (v2.9 korunacaklar)

- [ ] Earn layout: tap üstte
- [ ] Kilitli işletme kartları görünür
- [ ] Skyline v2 (gece/gündüz, bina tıklama)
- [ ] Franchise toast + failure reason
- [ ] Baron lifestyle sekmesi

## Crash-free hedef

- Signed AAB → Play Console internal track
- 7 gün Crashlytics / local crash log (`ii_crash_log`) sıfır kritik hata

## Otomasyon

```cmd
npm run build
node scripts/test-boot.mjs http://localhost:4173
```

Preview sunucusu: `npm run preview` ardından smoke test.
