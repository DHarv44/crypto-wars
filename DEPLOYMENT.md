# Crypto Wars - Deployment Guide

## 🚀 Quick Start (Development)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Navigate to http://localhost:5173
```

---

## 📦 Production Build

### Local Build

```bash
# Build for production
npm run build

# Output: dist/ directory
# - index.html (0.48 KB)
# - assets/index-[hash].css (202 KB → 29 KB gzipped)
# - assets/index-[hash].js (850 KB → 251 KB gzipped)

# Preview production build locally
npm run preview
# Navigate to http://localhost:4173
```

### Build Optimization

The bundle includes:
- React 18 + React Router v6
- Mantine v8 (component library)
- Recharts (charting)
- Zustand (state management)
- Tabler Icons

**Bundle size is expected** due to Recharts. For optimization:

1. **Code splitting** (future):
   ```typescript
   // Lazy load charts
   const CandlesChart = lazy(() => import('./components/CandlesChart'));
   ```

2. **Manual chunks** (future):
   ```typescript
   // vite.config.ts
   build: {
     rollupOptions: {
       output: {
         manualChunks: {
           'recharts': ['recharts'],
           'mantine': ['@mantine/core', '@mantine/hooks', '@mantine/notifications'],
         }
       }
     }
   }
   ```

---

## 🐳 Docker Deployment

### Build Docker Image

```bash
# Build multi-stage production image
docker build -t crypto-wars .

# Image uses:
# - Stage 1: node:18-alpine (build)
# - Stage 2: node:18-alpine (serve with 'serve')
```

### Run Container

```bash
# Run container
docker run -p 3000:3000 crypto-wars

# Navigate to http://localhost:3000
```

### Docker Compose (Optional)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  crypto-wars:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

Run:
```bash
docker-compose up -d
```

---

## ☁️ Cloud Deployment Options

### 1. Vercel (Recommended - Zero Config)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

**Vercel auto-detects Vite** and configures build settings.

### 2. Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build settings (netlify.toml)
[build]
  command = "npm run build"
  publish = "dist"

# Deploy
netlify deploy --prod
```

### 3. AWS S3 + CloudFront

```bash
# Build
npm run build

# Sync to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

**S3 Bucket Policy** (public read):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### 4. GitHub Pages

```bash
# Build
npm run build

# Deploy (using gh-pages package)
npm i -g gh-pages
gh-pages -d dist
```

**Note**: Update `vite.config.ts` for GitHub Pages:
```typescript
export default defineConfig({
  base: '/crypto-wars/', // repo name
  // ... rest of config
});
```

### 5. Railway.app

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

Railway auto-detects Node.js and runs `npm run build`.

---

## 🔧 Environment Variables

### Development (.env.local)

```bash
# Currently no env vars needed
# Future: API keys, feature flags, etc.

# Example:
# VITE_DEV_MODE=true
# VITE_EVENT_MULTIPLIER=5
```

### Production (.env.production)

```bash
# Production settings
VITE_DEV_MODE=false
```

**Access in code**:
```typescript
const devMode = import.meta.env.VITE_DEV_MODE === 'true';
```

---

## 📊 Performance Monitoring

### Build Analysis

```bash
# Analyze bundle size
npm run build -- --mode analyze

# Or use vite-bundle-visualizer
npm i -D vite-bundle-visualizer

# vite.config.ts
import { visualizer } from 'vite-bundle-visualizer';

plugins: [
  react(),
  visualizer({ open: true })
]
```

### Runtime Monitoring (Future)

Add performance monitoring:
```typescript
// main.tsx
if ('performance' in window) {
  const perfData = performance.getEntriesByType('navigation')[0];
  console.log('Page load time:', perfData.loadEventEnd - perfData.fetchStart);
}
```

---

## 🔒 Security Considerations

### Content Security Policy (CSP)

Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
    font-src 'self';
  ">
```

### HTTPS

**Always deploy with HTTPS** (Vercel/Netlify handle this automatically).

For custom servers:
```bash
# Use Let's Encrypt + Certbot
certbot --nginx -d yourdomain.com
```

---

## 🧪 Testing Before Deployment

### Pre-Deployment Checklist

```bash
# 1. Type check
npm run build  # TypeScript errors will fail build

# 2. Run tests (when implemented)
npm test

# 3. Lint code
npm run lint

# 4. Build successfully
npm run build

# 5. Preview locally
npm run preview

# 6. Test all routes manually
# - Dashboard: http://localhost:4173
# - Market: http://localhost:4173/market
# - AssetDetail: http://localhost:4173/asset/btc
# - (Others are placeholders)

# 7. Test gameplay flow
# - Start simulation
# - Browse market
# - Execute trade
# - Check portfolio
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - run: npm ci
      - run: npm run build

      # Deploy to Vercel
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 📱 PWA Support (Future)

To make installable:

1. **Add manifest.json**:
```json
{
  "name": "Crypto Wars",
  "short_name": "CryptoWars",
  "description": "Satirical crypto trading simulator",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#00ff00",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

2. **Add service worker** (vite-plugin-pwa):
```bash
npm i -D vite-plugin-pwa

# vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

plugins: [
  VitePWA({
    registerType: 'autoUpdate',
    manifest: { /* ... */ }
  })
]
```

---

## 🐛 Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

### Large Bundle Warning

**Expected behavior** - Recharts is 200KB+. To suppress:
```typescript
// vite.config.ts
build: {
  chunkSizeWarningLimit: 1000, // 1MB
}
```

### Chart Not Rendering

Check `index.html` has `<div id="root"></div>` and charts have:
```typescript
<ResponsiveContainer width="100%" height={300}>
  {/* chart content */}
</ResponsiveContainer>
```

### Route 404 on Refresh

For SPA routing, configure server:

**Netlify** (`netlify.toml`):
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Vercel** (`vercel.json`):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

---

## 📈 Scaling Considerations

### Current State
- **Static SPA** - No backend needed
- **Client-side state** - Zustand in memory
- **No persistence** - Refresh = reset (for now)

### Future Enhancements
1. **Backend API** (if needed for leaderboards):
   - Node.js + Express
   - Database: PostgreSQL/MongoDB
   - API: RESTful or GraphQL

2. **Real-time** (multiplayer mode):
   - WebSocket server
   - Redis for pub/sub
   - Shared game rooms

3. **Persistence** (already planned):
   - localStorage (current plan)
   - Backend DB (future)
   - IndexedDB (offline support)

---

## 🎯 Production Checklist

Before going live:

- [ ] Update package.json version
- [ ] Set production env vars
- [ ] Enable error tracking (Sentry)
- [ ] Add analytics (Google Analytics / Plausible)
- [ ] Test on mobile devices
- [ ] Check accessibility (WAVE tool)
- [ ] Verify SEO meta tags
- [ ] Add robots.txt
- [ ] Configure CDN (if applicable)
- [ ] Set up monitoring (UptimeRobot)
- [ ] Document API endpoints (if any)
- [ ] Backup deployment config

---

## 🔗 Resources

- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Mantine Documentation](https://mantine.dev/)
- [Recharts Documentation](https://recharts.org/)
- [Zustand Best Practices](https://github.com/pmndrs/zustand)
- [React Router Deployment](https://reactrouter.com/en/main/guides/deployment)

---

**Current Status**: Ready for deployment to any static hosting platform!

**Recommended**: Start with Vercel for instant deployment, then migrate to AWS/custom if needed.
