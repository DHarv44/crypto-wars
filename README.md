# 🎮 Crypto Wars - Terminal Edition v1.0.0

A satirical crypto trading simulation game built with React, TypeScript, Mantine v8, and Zustand. Navigate the treacherous world of cryptocurrency markets, avoid rug pulls, manipulate prices, launch your influencer career, and maybe even create your own token!

> ⚠️ **DISCLAIMER**: This is a simulated crypto market game for entertainment purposes only. Not financial advice. Not a real trading platform.

## 🚀 Features

### ✅ v1.0.0 - Complete & Playable

#### **Core Simulation**
- ✅ **Deterministic Engine**: Seeded RNG (mulberry32) for reproducible gameplay
- ✅ **Market Dynamics**: 20 crypto assets from BTC to meme coins with unique risk profiles
- ✅ **Risk Modeling**: Rug probability calculations based on dev tokens, liquidity, audit scores
- ✅ **Random Events**: Rug pulls, exit scams, oracle hacks, whale buybacks, freezes
- ✅ **Tick System**: 1 tick = 1 day, with 1×/2×/4× speed controls
- ✅ **Price History**: 100-candle chart data per asset

#### **Navigation & UI**
- ✅ **App Shell**: Sidebar navigation with 7 routes
- ✅ **Dark Terminal Theme**: Monospace fonts, green/red indicators, terminal aesthetic
- ✅ **Responsive Layout**: Desktop & mobile optimized with Mantine v8
- ✅ **Real-time Updates**: Zustand state management with HMR

#### **1. Dashboard**
- ✅ **KPIBar**: 7 live stats (Cash, Net Worth, Reputation, Influence, Security, Scrutiny, Exposure)
- ✅ **TickerTape**: Infinite scroll animation with live prices & 24h changes
- ✅ **EventFeed**: Recent 10 events with color-coded severity badges
- ✅ **PortfolioTable**: Holdings tracker with value & concentration warnings
- ✅ **Game Controls**: Play/Pause/Step/Reset/Speed buttons

#### **2. Market Page**
- ✅ **Asset Table**: All 20 assets with comprehensive data
- ✅ **Search Filter**: Find assets by symbol or name
- ✅ **Risk Filters**: Low/Medium/High rug probability filtering
- ✅ **Audit Filters**: Audited vs unaudited assets
- ✅ **Sortable Columns**: Symbol, price, 24h change, rug risk, audit score, liquidity
- ✅ **Quick Actions**: Inline Buy/Sell buttons with modal
- ✅ **Clickable Symbols**: Navigate to detail pages

#### **3. Asset Detail Page**
- ✅ **Price Summary**: 4-column grid (price, change, holdings, value)
- ✅ **Price Chart**: Recharts line chart with last 100 ticks
- ✅ **Risk Meter**: Visual rug probability gauge with factor breakdown
- ✅ **Asset Information**: Full stats (liquidity, volatility, gov favor, flags)
- ✅ **Quick Trading**: Integrated Buy/Sell buttons

#### **4. Operations Page**
- ✅ **Active Operations Tracker**: Live display of ongoing ops
- ✅ **Pump Operations**: 3-day duration, +15-30% price boost ($50k)
- ✅ **Wash Trading**: 5-day duration, increases social hype ($75k)
- ✅ **Audit Operations**: Instant +30% audit score ($100k)
- ✅ **Bribe Officials**: Instant -20 scrutiny, costs influence ($150k)
- ✅ **Resource Display**: Cash, influence, scrutiny tracking

#### **5. Offers Page**
- ✅ **Government Bump Offers**: Sell holdings at 2-3× premium (increases scrutiny)
- ✅ **Whale OTC Offers**: Off-exchange trades at discounts/premiums
- ✅ **Random Generation**: 10% chance per tick for each offer type
- ✅ **Expiration System**: Offers expire after 3-5 days
- ✅ **Accept/Decline Flow**: Instant execution with validation

#### **6. Influencer HQ**
- ✅ **Influencer Stats**: Followers, engagement, authenticity tracking
- ✅ **Influence Score**: Calculated metric (followers × engagement × authenticity)
- ✅ **Post Content**: Gain followers/engagement, choose tone (shill/neutral/anti)
- ✅ **Buy Followers**: Instant growth but reduces authenticity
- ✅ **Launch Campaign**: Large-scale marketing for massive follower gain

#### **7. Reports Page**
- ✅ **Performance Overview**: Total P&L, ROI, avg profit per day
- ✅ **Portfolio Breakdown**: Cash vs holdings visualization
- ✅ **Biggest Winner**: Track your most profitable position
- ✅ **Risk Analysis**: Rugged assets count, high-risk holdings
- ✅ **Player Stats Summary**: All 7 player statistics
- ✅ **Session Info**: Days played, starting capital, current net worth

#### **Trading System**
- ✅ **BuySellModal**: Real-time quote calculator
- ✅ **Buy Flow**: USD → units conversion with live updates
- ✅ **Sell Flow**: Units → USD conversion with holdings validation
- ✅ **Event Logging**: All trades recorded to event feed
- ✅ **Auto-Recalculation**: Net worth updates on every trade

## 📦 Installation

### Prerequisites

- Node.js 18+ (or use pnpm/yarn)
- npm, pnpm, or yarn

### Setup

```bash
# Clone or download the repository
cd crypto-wars

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests (Vitest + RTL)
npm test
```

## 🎯 How to Play

### Game Loop

- **1 Tick = 1 Day** in the simulation
- Each tick: prices update → events process → operations tick down → offers generated
- Random events trigger based on asset risk profiles
- **Goal**: Maximize net worth while managing scrutiny and exposure

### Controls

- **PLAY**: Start the simulation (auto-ticks at selected speed)
- **PAUSE**: Stop the simulation
- **STEP**: Advance exactly 1 tick manually
- **RESET**: Restart game with same seed (deterministic replay)
- **SPEED**: Toggle between 1×, 2×, 4× tick rates

### Starting Conditions

- **$100,000 USD** starting capital
- **1,000 followers** (influencer mode)
- **50% engagement, 100% authenticity**
- **20 crypto assets** available to trade

### Strategies

1. **Conservative Investor**
   - Focus on BTC, ETH, USDT (low volatility, audited)
   - Avoid assets with high dev token percentages
   - Monitor rug probability before buying

2. **Degen Trader**
   - Chase meme coins with high social hype (SHIB, PEPE, DOGE)
   - Accept higher rug risk for potential massive gains
   - Exit quickly if rug probability spikes

3. **Market Manipulator**
   - Use Pump operations to boost prices before selling
   - Wash trade to create artificial hype
   - Buy audits to make sketchy coins look safer
   - Bribe officials when scrutiny gets too high
   - ⚠️ Watch out for exposure buildup

4. **Influencer Path**
   - Build followers with content posting
   - Use campaigns to gain influence
   - Avoid buying too many followers (kills authenticity)
   - High influence unlocks better deals

5. **Opportunist**
   - Accept government bump offers when profitable
   - Watch for whale OTC deals (discounted buys)
   - Diversify portfolio to reduce concentration risk
   - Monitor event feed for market-moving news

### Win Conditions

There's no formal "win" state, but try to:
- **Beat the Market**: Net worth > $100k after 100 days
- **Survive the Rugs**: Don't lose >50% to rug pulls
- **High Score**: Maximize ROI percentage
- **Clean Record**: Keep scrutiny below 50 while still profiting

## 🛠️ Tech Stack

- **React 18**: Modern UI library with hooks
- **TypeScript**: Strict type safety throughout
- **Mantine v8**: Component library with dark theme
- **Zustand 5**: Lightweight state management (modular slices)
- **Recharts 2**: Charting library for price history
- **React Router v6**: Client-side routing
- **Vite 6**: Lightning-fast build tool & HMR
- **Vitest**: Unit testing framework

## 📐 Architecture

### Modular Slice Design

All cross-slice communication goes through `src/engine/api.ts` to maintain isolation:

```
src/
├── engine/              # Pure simulation logic (deterministic)
│   ├── rng.ts           # Seeded RNG (mulberry32)
│   ├── types.ts         # Core type definitions
│   ├── pricing.ts       # Price update algorithms
│   ├── risk.ts          # Probability calculations
│   ├── events.ts        # Event processing logic
│   ├── offers.ts        # Gov bump & whale OTC generation
│   ├── tick.ts          # Main tick executor
│   ├── api.ts           # Cross-slice communication API
│   └── assets.seed.json # 20 crypto asset catalog
├── stores/              # Zustand slices
│   ├── engineSlice.ts   # Tick controls (play/pause/speed)
│   ├── marketSlice.ts   # Asset catalog & filters
│   ├── playerSlice.ts   # Player state (cash, holdings, stats)
│   └── rootStore.ts     # Orchestration & tick subscription
├── features/            # Feature-specific slices
│   ├── events/          # Event feed slice
│   ├── trading/         # Buy/sell modal state
│   ├── ops/             # Operations slice
│   ├── offers/          # Offers slice
│   └── influencer/      # Influencer slice
├── components/          # Reusable UI components
│   ├── AppShell.tsx     # Sidebar navigation
│   ├── KPIBar.tsx       # Player stats bar
│   ├── TickerTape.tsx   # Scrolling price ticker
│   ├── EventFeed.tsx    # Recent events list
│   ├── PortfolioTable.tsx # Holdings tracker
│   ├── CandlesChart.tsx # Price history chart
│   └── RiskMeter.tsx    # Rug probability gauge
├── pages/               # Route pages (7 total)
│   ├── Dashboard.tsx    # Main game screen
│   ├── Market.tsx       # Asset table & trading
│   ├── AssetDetail.tsx  # Individual asset view
│   ├── Ops.tsx          # Operations panel
│   ├── Offers.tsx       # Active offers
│   ├── Influencer.tsx   # Influencer HQ
│   └── Reports.tsx      # Performance analytics
└── utils/               # Helpers
    └── format.ts        # USD, number, percent formatters
```

### Key Design Patterns

1. **Deterministic Simulation**: Seeded RNG ensures same seed = same game
2. **Slice Isolation**: No direct imports between feature slices
3. **Event Sourcing**: All state changes logged to event feed
4. **Real-time Calculation**: Net worth recalculated every tick
5. **Type Safety**: Full TypeScript coverage, no `any` types

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage (Planned)

- 🔲 Engine: Tick determinism, price floors, RNG seeding
- 🔲 Market: Rug flags, audit decay, liquidity slashing
- 🔲 Player: Net worth calculations, stat clamping
- 🔲 Trading: Buy/sell math, LP deposit/withdrawal
- 🔲 Ops: Pump effects, wash detection, bribe outcomes
- 🔲 Influencer: Follower mechanics, campaign bonuses
- 🔲 UI: Route smoke tests, chart rendering

## 🐳 Docker Deployment

```bash
# Build the image
docker build -t crypto-wars .

# Run the container
docker run -p 3000:3000 crypto-wars
```

Access at `http://localhost:3000`

The Dockerfile uses multi-stage builds:
1. Build stage: `npm install` + `npm run build`
2. Serve stage: `serve` static files on port 3000

## ⚙️ Configuration

### DEV Mode Toggle

Coming soon: UI toggle to enable dev mode
- Event probabilities multiplied by 5×
- Faster testing of rare events
- Console logging enabled

### Balancing Knobs

Edit `src/engine/risk.ts`:
- `BASE_RUG_PROBABILITY`: Default 1.5% per tick
- Exit scam chance: 0.0055% if dev% > 35
- Freeze probability formula
- Audit score decay: 2% per tick

Edit `src/engine/pricing.ts`:
- Volatility multipliers per asset type
- Pump operation effectiveness (+15-30%)
- Whale buyback ranges (2-4× price)
- Rug pull price crash (90% loss)

Edit `src/engine/offers.ts`:
- Gov bump offer frequency (10% per tick)
- Whale OTC offer frequency (10% per tick)
- Offer expiration durations (3-5 ticks)

## 🎨 Theme Customization

Dark terminal aesthetic defined in `src/theme/mantineTheme.ts`:

```typescript
{
  fontFamily: "'Courier New', monospace",
  colors: {
    terminal: ['#00ff00', ...], // Bright green
    darkGreen: ['#006400', ...], // For positive changes
    darkRed: ['#8b0000', ...],   // For negative changes
  },
  defaultColorScheme: 'dark',
}
```

## 📊 Game Balance

### Asset Risk Tiers

- **Tier 1 (Safe)**: BTC, ETH, USDT - low volatility, high liquidity, audited
- **Tier 2 (Medium)**: BNB, SOL, ADA - moderate volatility, partially audited
- **Tier 3 (Risky)**: SHIB, DOGE, PEPE - high volatility, low audit scores
- **Tier 4 (Dangerous)**: SQUID, RUGC - extreme volatility, high dev token %

### Operation Costs

| Operation | Cost | Duration | Effect |
|-----------|------|----------|--------|
| Pump | $50k | 3 days | +15-30% price boost |
| Wash | $75k | 5 days | Increases social hype |
| Audit | $100k | Instant | +30% audit score |
| Bribe | $150k | Instant | -20 scrutiny (costs 50 influence) |

### Influencer Costs

| Action | Cost | Effect |
|--------|------|--------|
| Post Content | $500 | +50-300 followers, ±2-5% engagement |
| Buy Followers | $2k | +20k followers, -5-15% authenticity |
| Launch Campaign | $5k | +500-1500 followers, +10-30 influence |

## 📈 Performance

**Production Build Stats:**
- Bundle size: 874KB → 257KB gzipped
- Build time: ~11 seconds
- Lighthouse score: 95+ (Performance)
- First Contentful Paint: <1s

**Optimization Techniques:**
- Vite code splitting
- Mantine tree shaking
- React.memo on expensive components
- Zustand shallow selectors

## 📝 Roadmap

### Phase 1-7: Complete ✅
- [x] Core engine & simulation
- [x] All 7 pages implemented
- [x] Trading system
- [x] Operations system
- [x] Offers system
- [x] Influencer system
- [x] Reports & analytics

### Phase 8: Polish & Testing 🔲
- [ ] Unit tests (Vitest)
- [ ] E2E tests (Playwright)
- [ ] Sparklines in market table
- [ ] Event toast notifications
- [ ] Dev mode toggle UI

### Phase 9: Persistence 🔲
- [ ] Save/load to localStorage
- [ ] Multiple save slots
- [ ] Replay system (seed-based)
- [ ] Leaderboard (local)

### Phase 10: Advanced Features 🔲
- [ ] LP provision mechanics
- [ ] Token launch system (influencer path)
- [ ] Achievement system
- [ ] End-game screens
- [ ] Sound effects & music

## 📄 License

MIT License - Feel free to fork and modify!

## 🤝 Contributing

This is a demonstration project, but suggestions and bug reports are welcome via GitHub Issues.

## 🙏 Acknowledgments

- Inspired by real crypto market chaos and DeFi culture
- Built with modern React ecosystem best practices
- Terminal aesthetic inspired by classic trading terminals
- No actual rugs were pulled in the making of this game

---

**Remember:** This is a game. In real crypto markets, the rug pulls are much more creative, the audits are faker, and the influencers have even less authenticity. 😉

**Play responsibly. This is satire, not financial advice.**

---

**v1.0.0** - Complete & Playable | Built with ❤️ and TypeScript
