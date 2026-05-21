# Changelog — İş İmparatorluğu

GitHub commit / release notu olarak kopyalayabilirsin.

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
