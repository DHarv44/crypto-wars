# Crypto Wars - Modular Slice Design

A modular slice design for Crypto Wars. Cross-slice communication goes through `src/engine/api.ts`.

---

## 0) Directory Layout

```
crypto-wars/
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ .eslintrc.cjs
├─ .prettierrc
├─ Dockerfile
├─ README.md
├─ public/
└─ src/
   ├─ main.tsx
   ├─ App.tsx
   ├─ routes.tsx
   ├─ theme/
   │  └─ mantineTheme.ts
   ├─ engine/
   │  ├─ rng.ts
   │  ├─ types.ts
   │  ├─ pricing.ts
   │  ├─ risk.ts
   │  ├─ events.ts
   │  ├─ offers.ts
   │  ├─ tick.ts
   │  ├─ api.ts
   │  └─ assets.seed.json
   ├─ stores/
   │  ├─ rootStore.ts
   │  ├─ engineSlice.ts
   │  ├─ marketSlice.ts
   │  └─ playerSlice.ts
   ├─ features/
   │  ├─ trading/
   │  │  ├─ tradingSlice.ts
   │  │  ├─ BuySellModal.tsx
   │  │  └─ LPModal.tsx
   │  ├─ ops/
   │  │  ├─ opsSlice.ts
   │  │  └─ OpsPanel.tsx
   │  ├─ offers/
   │  │  ├─ offersSlice.ts
   │  │  ├─ OffersDrawer.tsx
   │  │  └─ OffersPage.tsx
   │  ├─ events/
   │  │  ├─ eventsSlice.ts
   │  │  ├─ EventFeed.tsx
   │  │  └─ ReplayModal.tsx
   │  ├─ influencer/
   │  │  ├─ influencerSlice.ts
   │  │  ├─ InfluencerPage.tsx
   │  │  ├─ InfluencerPanel.tsx
   │  │  └─ LaunchTokenModal.tsx
   │  ├─ reports/
   │  │  ├─ reportsSlice.ts
   │  │  ├─ ReportsPage.tsx
   │  │  └─ EndScreen.tsx
   │  ├─ ui/
   │  │  ├─ uiSlice.ts
   │  │  ├─ ToastHost.tsx
   │  │  └─ ConfirmDialog.tsx
   │  └─ persistence/
   │     ├─ persistSlice.ts
   │     └─ SaveLoadDrawer.tsx
   ├─ components/
   │  ├─ KPIBar.tsx
   │  ├─ TickerTape.tsx
   │  ├─ PortfolioTable.tsx
   │  ├─ RiskMeter.tsx
   │  ├─ CandlesChart.tsx
   │  └─ ActionsPanel.tsx
   ├─ pages/
   │  ├─ Dashboard.tsx
   │  ├─ Market.tsx
   │  ├─ AssetDetail.tsx
   │  ├─ Ops.tsx
   │  ├─ Offers.tsx
   │  ├─ Influencer.tsx
   │  └─ Reports.tsx
   ├─ utils/
   │  └─ format.ts
   └─ tests/
      ├─ engine.spec.ts
      ├─ market.spec.ts
      ├─ player.spec.ts
      ├─ trading.spec.ts
      ├─ ops.spec.ts
      ├─ offers.spec.ts
      ├─ influencer.spec.ts
      ├─ reports.spec.ts
      └─ ui.smoke.spec.tsx
```

---

## 1) Engine Slice (simulation loop)

**Files:** `engine/*`, `stores/engineSlice.ts`

**State:** `tick`, `status: 'idle'|'running'|'paused'`, `seed`, `speed`(1|2|4), `devMode`

**Actions:** `init(seed?)`, `play()`, `pause()`, `step()`, `reset()`, `setSpeed(s)`

**Selectors:** `getTick`, `isRunning`

**Notes:** Tick drives pricing + events. Seeded RNG via `rng.ts` (deterministic).

---

## 2) Market Slice (catalog + prices)

**Files:** `stores/marketSlice.ts`, `engine/assets.seed.json`

**State:** `assets: Record<id,Asset>`, `list: string[]`, `filters`

**Asset:**

```typescript
type Asset = {
  id: string; 
  symbol: string; 
  name: string;
  basePrice: number; 
  price: number;
  liquidityUSD: number; 
  devTokensPct: number; 
  auditScore: number; 
  socialHype: number;
  baseVolatility: number; 
  govFavorScore: number;
  flagged: boolean; 
  rugged: boolean; 
  isPlayerToken?: boolean;
};
```

**Actions:** `loadSeed()`, `applyTick()`, `setFilter(f)`, `getAsset(id)`

**Selectors:** `filteredAssets`, `topMovers`, `rugRiskRanked`

**UI:** Market table (with sparklines), AssetDetail (candlesticks, RiskMeter)

---

## 3) Player Slice (profile + portfolio)

**Files:** `stores/playerSlice.ts`

**State:** `cashUSD`, `netWorthUSD`, `reputation`, `influence`, `security`, `scrutiny`, `exposure`, `holdings: Record<assetId, number>`, `lpPositions`

**Actions:** `recalcNetWorth(prices)`, `gainCash(v)`, `spendCash(v)`, `adjustStat(k,Δ)`

**Selectors:** `kpis`, `portfolioTable`, `concentrationByAsset`

**UI:** KPIBar, PortfolioTable

---

## 4) Trading Slice (buy/sell/LP)

**Files:** `features/trading/*`

**State:** modal state, last quotes

**Actions (via engine/api):**
- `BUY { assetId, usd }`
- `SELL { assetId, units }`
- `PROVIDE_LP { assetId, usd }`
- `WITHDRAW_LP { assetId, percent }`

**Selectors:** `canAfford`, `positionSize`

**UI:** BuySellModal, LPModal, quick actions on Market/AssetDetail

---

## 5) Ops Slice (pump/wash/audit/bribe)

**Files:** `features/ops/*`

**State:** `activeOps[]` (type, assetId, budget, startedTick, duration)

**Actions (engine/api):**
- `PUMP { assetId, budget }` (short up-drift + exposure)
- `WASH { assetId, budget, duration }` (fake volume + detection)
- `AUDIT { assetId, usd }` (auditScore↑, decay over time)
- `BRIBE { recipient: 'minister'|'auditor'|'exchange', usd }` (scrutiny↓ or unlocks)

**Selectors:** `currentOps`, `opsImpactPreview`

**UI:** OpsPanel with timers and effect previews

---

## 6) Offers Slice (gov + whale OTC)

**Files:** `features/offers/*`, `engine/offers.ts`

**State:** `pendingOffers: Offer[]`, `history: Offer[]`

**Actions:** `rollGovOffer()`, `rollWhaleOTC()`, `accept(id)`, `decline(id)`

**Selectors:** `hasGovOffer`, `bestOffer`

**UI:** OffersDrawer, OffersPage

---

## 7) Events Slice (feed + replays)

**Files:** `features/events/*`

**State:** `feed: GameEvent[]`, `replays: Replay[]`

**Actions:** `push(event)`, `clear()`, `recordReplay(causalChain)`

**Selectors:** `recent(n)`, `byType(type)`

**UI:** EventFeed, ReplayModal, toasts via ui slice

---

## 8) Influencer Slice (late-game path)

**Files:** `features/influencer/*`

**State:**

```typescript
type InfluencerSlice = {
  followers: number; 
  engagement: number; 
  authenticity: number; 
  cloutTier: number;
  pendingCampaigns: Campaign[]; 
  sponsoredIncomeUSD: number; 
  lastViralTick?: number;
};
```

**Selectors:**

```typescript
influenceScore = clamp(Math.log10(followers+1) * engagement * (0.5+authenticity), 0, 10)
cloutTier = Math.floor(influenceScore)
```

**Actions (engine/api):**
- `POST_CONTENT { tone: 'shill'|'neutral'|'anti', budgetUSD, targetAssetId? }`
- `BUY_FOLLOWERS { usd }` (followers↑ authenticity↓)
- `START_CAMPAIGN { campaignId, budgetUSD }`
- `COLLAB { whaleId, budgetUSD }`
- `LAUNCH_TOKEN { params }` → creates Asset with isPlayerToken=true
- `RUG_OWN_TOKEN { assetId, variant?: 'full'|'partial' }` (late game gated)

**UI:**
- InfluencerPage (profile, composer minigame, campaigns, token launch)
- InfluencerPanel (KPIBar widget)
- LaunchTokenModal

**Token Launch Gating & Consequences:**
- Requires cloutTier ≥ 3. Dev reserve (20–60%) sets rug risk; initial liquidity and optional audit.
- Rug own token (cloutTier ≥ 6, time-gated): huge payout; scrutiny +40..80, reputation −50..100, blacklisted=true, high freeze chance.

---

## 9) Reports Slice (end screens & analytics)

**Files:** `features/reports/*`

**State:** `finalReport | null`, `runStats`

**Actions:** `compileOnWin()`, `compileOnLoss(reason)`

**Selectors:** `roiByAsset`, `causeOfDeath`

**UI:** ReportsPage, EndScreen (net worth line, portfolio pie, event replay)

---

## 10) UI Slice (routing, toasts, dialogs, theme)

**Files:** `features/ui/*`

**State:** `toasts[]`, `dialogs`, `theme`

**Actions:** `toast(msg, kind)`, `open(id,payload)`, `close(id)`

**Selectors:** `isOpen(id)`

**UI:** ToastHost, ConfirmDialog, Mantine v8 theme tokens

---

## 11) Persistence Slice (save/load)

**Files:** `features/persistence/*`

**State:** `slots: SaveMeta[]`

**Actions:** `save(slot)`, `load(slot)`, `delete(slot)` (localStorage)

**UI:** SaveLoadDrawer

---

## 12) Pricing, Risk & Events (engine formulas)

### Price update (pre-event):

```
σ = baseVolatility * (0.8 + socialHype*0.6) * (1 + noise[-0.1..0.1])
Δ ~ Normal(0, σ) via Box–Muller
price = max(0.0001, price * (1 + Δ))
```

### Rug probability (per tick):

```
liquidityFactor = clamp(liquidityUSD / 1_000_000, 0, 1)
rugProb = clamp(
  0.015
  + (devTokensPct/100)*0.012
  - auditScore*0.010
  + (0.30 - liquidityFactor)*0.04
  + socialHype*0.01,
  0.002, 0.45
)
```

### Events (per tick):

- **Small Rug:** if roll < rugProb → price *= U(0.01..0.2); liquidity *= U(0.05..0.4); rugged=true
- **Exit-Scam:** ~0.000055/day if devTokensPct>35 → drain liquidity; scrutiny↑
- **Oracle Hack:** ~0.00003/day global → ±(100–400%) spike for 1–3 ticks
- **Whale Buyback:** ~0.00005/day if liquidity>200k → price *= U(2..4)
- **Gov Bump:** p = 0.002 * (1 + influence*0.25) * concentrationFactor; offer buys 20–60% of player units at 2–3× or grants fiat; scrutiny↑
- **Freeze:** chance = clamp(base + exposure*0.005 + scrutiny*0.01 − security*0.02, 0, 0.9); locks 10–40% centralized holdings for 3–10 ticks

---

## 13) Pages / Routes

### Dashboard (/)
- KPIBar (Cash, NetWorth, Rep, Influence, Security, Scrutiny)
- TickerTape (live symbols + % change)
- Portfolio snapshot
- EventFeed (with toasts)
- Speed controls (1×/2×/4×, Pause/Play/Step)

### Market (/market)
- Table: Ticker, Price, %24h, RugProb, Audit, Liquidity, Sparkline, Quick Buy/Sell
- Filters: risk, liquidity, audited
- Sorting & dense mode

### AssetDetail (/asset/:id)
- CandlesChart, order panel
- RiskMeter (rugProb, audit, dev%)
- Event history, LP actions

### Ops (/ops)
- Pump/Wash/Audit/Bribe actions with timers and projections

### Offers (/offers)
- Drawer + page listing pending offers; accept/decline → consequences

### Influencer (/influencer)
- Profile (followers, engagement, authenticity, cloutTier)
- ContentComposer (tone, budget, target asset)
- Campaigns list
- LaunchToken (modal)
- InfluencerPanel widget linkage

### Reports (/reports)
- EndScreen with net worth timeline, portfolio pie, cause-of-death, replay

---

## 14) Tests (Vitest + RTL)

- **engine.spec.ts:** tick increments, seed determinism, price floor
- **market.spec.ts:** rug flag & liquidity slash; audit lowers risk
- **player.spec.ts:** net worth calc; spend/gain bounds; stat clamps
- **trading.spec.ts:** buy/sell/LP math correctness
- **ops.spec.ts:** pump/wash exposure; audit decay
- **offers.spec.ts:** gov bump gating; accept raises scrutiny
- **influencer.spec.ts:** post follower delta; buyFollowers authenticity↓; launch token fields; rugOwnToken consequences
- **reports.spec.ts:** win/lose summaries; replay chain integrity
- **ui.smoke.spec.tsx:** routes render; charts mount without errors

---

## 15) Checklists (Claude must maintain)

- [ ] Setup: init, deps, theme, config
- [ ] Engine: rng, pricing, risk, events, offers, tick, api, seed
- [ ] Stores: root, engine, market, player
- [ ] Market: table, filters, sparklines, AssetDetail candles
- [ ] Trading: modals, LP, actions wired
- [ ] Ops: panel + timers
- [ ] Offers: drawer + page + actions
- [ ] Events: feed + toasts + replays
- [ ] Influencer: page, panel, composer, token launch, rug action
- [ ] Reports: end screen + charts
- [ ] UI: ToastHost, ConfirmDialog, speed controls
- [ ] Persistence: save/load drawer
- [ ] Tests: unit/integration/smoke passing
- [ ] Build & Docs: Dockerfile, README complete