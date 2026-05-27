/**
 * Event domain facade — GameState'ten kademeli taşınacak.
 * v3.0: iskelet; golden event zamanlaması şu an HUD EventDirector üzerinden.
 */
export function scheduleGoldenEventWindow(expiresAtMs: number): { expiresAtMs: number } {
  return { expiresAtMs }
}
