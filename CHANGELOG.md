# Changelog — İş İmparatorluğu

GitHub commit / release notu olarak kopyalayabilirsin.

---

## [2.3.0] — 2026-05-21

### Özet (commit mesajı)
```
feat: v2.3 illegal heat, profil chip ve içerik genişletme
```

### GitHub Release / PR özeti

**Başlık:** v2.3.0 — Illegal radar, profil chip ve içerik genişletme

#### Illegal heat sistemi
- Illegal işletmeler radar (heat) biriktirir; heat arttıkça baskın şansı yükselir
- Kazan ekranında radar göstergesi (session panel)
- Mağaza hub: yasal/illegal gelir ayrımı + radar durumu
- Illegal kartlarda dinamik baskın risk badge

#### Profil & miras
- Header'da profil chip (isim + yaş)
- Miras kodu export/import (ayarlar)

#### İçerik
- 6 yeni işletme: kafe, mobil app, enerji (yasal) + bahis, piramit, offshore (illegal)
- Erken aç butonu (forced unlock)
- Yeni yükseltmeler: kafe_x2, mobil_app_x2, enerji_x2, click_x10
- Yeni başarımlar: galaksiyum, kafe, illegal, earn_100m

#### Etkinlik paneli
- Hero kartlar: günlük hedef, haftalık etkinlik, sezon yolu
- Radar uyarı banner'ı

#### Deploy
- Render static site base path fix (VITE_BASE)

---

## [2.2.0] — 2026-05-21

### Özet (commit mesajı)
```
feat(ui): v2.2 responsive kabuk, Kazan ve Mağaza genişletme + yeni görseller
```

### GitHub Release / PR özeti

**Başlık:** v2.2.0 — Responsive kabuk, Kazan yenileme ve Mağaza genişletme

#### Responsive kabuk
- CSS değişkenleri: `--nav-h`, `--ad-h`, `--app-max-w`, `--app-chrome-bottom`, safe-area
- `#app` fluid max-width; breakpoint'ler (<360px, ≥520px, landscape)
- Alt navigasyon SVG ikonlar, aktif pill, 48px dokunma alanı
- `100dvh` tutarlılığı (events panel)

#### Kazan ekranı
- Session paneli: tıklama geliri, combo çarpanı, pasif gelir/sn
- Progress strip v2: rütbe halkası (conic-gradient), sonraki işletme önizlemesi
- 10+ combo'da tap-wrap kenar pulse animasyonu
- Skyline tier siluetleri (işletme ikonları)
- Parçacık glow + kritik burst iyileştirmesi
- Quick-ads kart stili (2x / sandık açıklamalı)
- Yeni mascot.svg

#### Mağaza genişletme
- Shop hub şeridi: gelir/sn, işletme sayısı, sıradaki unlock, günlük hedef %
- İşletme: gelir dağılımı bar, genişletilmiş sinerji, kilitli kart ETA
- Yönetim: gelire göre sıralama, eksik yönetici özeti, gelir/sn chip
- Yükselt: kategori filtreleri + satın alınanlar collapsed bölüm
- Ar-Ge: 2 kolon ağaç grid, para/prestij renk kodu
- Görev: günlük özet + seri, hazır ödüller üstte
- Başarım: kategori filtre, grid/liste toggle, sticky detay banner
- Borsa: 3 alt-sekme (Hisse / Prestij Ağacı / IPO)

#### Görseller
- 11 işletme SVG (64×64, tier renkleri) + galaksiyum.svg
- favicon.svg + icon-512.svg (altın İİ / bina silueti)
- Nav ikonları: earn, shop, events, profile

---

## [2.1.1] — 2026-05-21

### Özet (commit mesajı)
```
fix(ui): alt menü titremesi giderildi, rütbe sistemi ve ilerleme şeridi eklendi
```

### GitHub Release / PR özeti

**Başlık:** v2.1.1 — Alt menü fix + Rütbe sistemi

#### Düzeltmeler
- Ard arda tıklamada alt sekmelerin küçülüp büyümesi giderildi (shake animasyonu artık sadece tıklama alanında)
- Alt navigasyon `body` üzerinde sabit yükseklik (58px) — layout kayması yok
- Combo metni sabit genişlikte; para/gelir statları titremiyor
- Reklam banner'ı alt menünün üstüne sabitlendi

#### Yeni özellikler
- **10 kademeli rütbe sistemi** (Çırak → Galaktik Baron) — `PlayerRank.ts`
- Kazan ekranında ilerleme şeridi: sonraki rütbe + sonraki işletme unlock
- Rütbe atlama toast bildirimi
- Profil istatistiklerinde rütbe gösterimi

#### Teknik
- `HUD.ts`: debounce UI sync (180ms), `renderProgressStrip()`, `checkRankUp()`
- `styles.css`: `.tap-wrap.shake`, `.player-progress-strip`, sabit `.bottom-nav`

---

## [2.1.0] — 2026-05-21

### Özet (commit mesajı)
```
feat(shop): mağaza UI yenileme, ekonomi yavaşlatma, scroll ve başarım fix
```

### GitHub Release / PR özeti

**Başlık:** v2.1.0 — Mağaza, ekonomi ve scroll iyileştirmesi

#### Mağaza UI
- Tüm sekmelerde `shop-card` tasarımı (Yönetim, Yükselt, Ar-Ge, Görev, Başarım, Borsa)
- Sekme bazlı hero banner ve section header
- Başarım detay banner + tıklanabilir hücreler
- İşletme: milestone dot'lar, kilitli kart progress bar

#### Ekonomi (daha uzun oyun)
- Maliyet çarpanı 1.20 → 1.22, gelirler düşürüldü
- IPO eşiği 2M → 25M, günlük hedef 100K
- Sezon XP yavaşlatıldı

#### Scroll & bug fix
- `shop-chrome` + `shop-body` layout (sticky offset sorunu)
- Yatay pill sekmeler: snap, fade, scroll düzeltmesi
- Başarım sekmesinde üst bar kaybolma bug'ı giderildi

#### Dosyalar
- `ShopPanel.ts`, `styles.css`, `HUD.ts`, `Economy.ts`, `Prestige.ts`, `DailyGoal.ts`, `SeasonPass.ts`, `GameState.ts`

---

## Şablon (sonraki güncellemeler için)

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Özet (commit mesajı)
\`\`\`
<type>(<alan>): kısa açıklama
\`\`\`

### GitHub Release / PR özeti

**Başlık:** vX.Y.Z — ...

#### Düzeltmeler
- ...

#### Yeni özellikler
- ...

#### Teknik
- ...
```

**Commit type:** `feat` | `fix` | `ui` | `balance` | `docs` | `ci`
