<div align="center">

# 🌿 DecentralChain — Official Website

**The AI Blockchain Built for a Sustainable Future**

*AI-Powered · Eco-Friendly · Born in Central America*

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-14F195?style=flat-square)](LICENSE)

[Live Site](https://decentralchain.io) · [Explorer](https://explorer.decentralchain.io) · [DEX](https://decentral.exchange) · [Docs](https://docs.decentralchain.io)

</div>

---

## Overview

The official landing page for **DecentralChain** — the first Layer 1 blockchain that fuses artificial intelligence with eco-friendly consensus, built in Central America for the world.

This site communicates the three core pillars of the DecentralChain protocol:

- 🤖 **The AI Blockchain** — On-chain ML inference, AI-optimized transaction routing, and automated smart contract auditing built into the protocol layer.
- 🌱 **Eco-Friendly Blockchain** — Leased Proof-of-Stake (LPoS) consensus that is thousands of times more energy-efficient than Proof-of-Work, operating as a carbon-negative network.
- 🌎 **The Blockchain of Central America** — Designed and built by Blockchain Costa Rica, purpose-built for emerging markets with cross-border payments, multilingual support, and regional fintech integration.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | React framework with App Router & Turbopack |
| [React 19](https://react.dev/) | UI library |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first styling |
| [Framer Motion](https://www.framer.com/motion/) | Animations & transitions |
| [Lucide React](https://lucide.dev/) | Icon library |
| [TypeScript 5](https://www.typescriptlang.org/) | Type safety |

## Features

- **🌐 Internationalization (i18n)** — Full multi-language support for English, Spanish, and Chinese with React Context-based locale switching.
- **🌙 Dark / Light Mode** — Theme toggle with localStorage persistence and flash-free hydration via pre-render script.
- **📡 Live Blockchain Data** — Real-time block height and transaction metrics pulled from the [DecentralChain mainnet node](https://mainnet-node.decentralchain.io) with 10-second polling.
- **⚡ Performance Optimized** — Static generation, Turbopack dev server, optimized fonts, and lazy-loaded animations.
- **📱 Fully Responsive** — Mobile-first design across all 20+ sections and components.
- **🎨 Premium Visuals** — Animated gradient backgrounds, glassmorphism cards, and smooth scroll-triggered animations.

## Project Structure

```
├── app/
│   ├── globals.css          # Global styles & theme variables
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Landing page composition
│   └── providers.tsx        # Theme + i18n context providers
├── components/
│   ├── Hero.tsx             # Hero section with live blockchain data
│   ├── About.tsx            # Three-pillar overview
│   ├── WhyDecentralChain.tsx # Feature grid (6 pillars)
│   ├── Architecture.tsx     # Protocol stack visualization
│   ├── Ecosystem.tsx        # Ecosystem modules (7 apps)
│   ├── EcosystemFlywheel.tsx # Growth flywheel diagram
│   ├── InvestorThesis.tsx   # Investment case
│   ├── Roadmap.tsx          # 6-phase execution timeline
│   ├── Vision.tsx           # Long-term vision
│   ├── ResourceHub.tsx      # DEX, Explorer, GitHub, API links + video
│   ├── FAQ.tsx              # 6 FAQ items
│   ├── CTASection.tsx       # Call to action
│   └── ...                  # Navbar, Footer, shared components
├── hooks/
│   └── useBlockchainData.ts # Live mainnet data hook
├── lib/
│   ├── blockchain.ts        # Mainnet node API service
│   ├── constants.ts         # Icon mappings & config
│   ├── theme.tsx            # Theme context & toggle
│   └── i18n/
│       ├── index.tsx        # i18n provider & useI18n hook
│       ├── en.ts            # English translations
│       ├── es.ts            # Spanish translations
│       └── zh.ts            # Chinese translations
└── public/                  # Static assets
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.18
- **npm** ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/dylanpersonguy/dcc-website.git
cd dcc-website

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Build

```bash
# Production build
npm run build

# Start production server
npm start
```

## Environment

No environment variables are required. The site connects to the public DecentralChain mainnet node at `https://mainnet-node.decentralchain.io`.

## Links

| Resource | URL |
|----------|-----|
| 🌐 Website | [decentralchain.io](https://decentralchain.io) |
| 📊 Explorer | [explorer.decentralchain.io](https://explorer.decentralchain.io) |
| 💱 DEX | [decentral.exchange](https://decentral.exchange) |
| 📖 Docs | [docs.decentralchain.io](https://docs.decentralchain.io) |
| 🔗 Node API | [mainnet-node.decentralchain.io](https://mainnet-node.decentralchain.io) |

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**DecentralChain** — The AI-powered, eco-friendly blockchain of Central America.

Built with 💚 in Costa Rica

</div>
