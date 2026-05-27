# GameState kademeli modülerleştirme

v3.0 sonrası yeni domain mantığı doğrudan `GameState.ts`'e eklenmemeli; aşağıdaki modüllere taşınmalıdır.

| Modül | Sorumluluk |
|-------|------------|
| `EventController.ts` | Golden event, günlük görev tick, comeback |
| `MarketController.ts` | Borsa, banka, IPO önizleme |
| `DynastyController.ts` | Hanedan, varis, ölüm |

`GameState` ince facade olarak kalır; tek seferde büyük split yapılmaz (save regression riski).

## EventController

Şu an HUD `EventDirector` kullanıyor. Gelecek adım: `GameState` içindeki event alanlarını bu modüle delegate etmek.
