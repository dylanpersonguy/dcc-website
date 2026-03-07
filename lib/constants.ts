import {
  Zap,
  Globe,
  Layers,
  Code2,
  Coins,
  Shield,
  Wallet,
  BarChart3,
  Building2,
  Wrench,
  ArrowUpRight,
  TrendingUp,
  Users,
  Network,
  type LucideIcon,
} from "lucide-react";

export const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Ecosystem", href: "#ecosystem" },
  { label: "Investors", href: "#investors" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "Vision", href: "#vision" },
  { label: "Dashboard", href: "/terminal" },
] as const;

export interface StatItem {
  value: string;
  label: string;
  suffix?: string;
}

export const HERO_STATS: StatItem[] = [
  { value: "100000", label: "Peak TPS Capacity", suffix: "+" },
  { value: "0.4", label: "Time to Finality", suffix: "s" },
  { value: "250", label: "Ecosystem Partners", suffix: "+" },
  { value: "99.9", label: "Network Uptime", suffix: "%" },
];

export interface TrustItem {
  icon: LucideIcon;
  label: string;
}

export const TRUST_ITEMS: TrustItem[] = [
  { icon: Zap, label: "Sub-Second Finality" },
  { icon: Layers, label: "Modular Architecture" },
  { icon: Globe, label: "Global Settlement" },
  { icon: Code2, label: "Open Developer Stack" },
  { icon: Shield, label: "Audited & Verified" },
];

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const FEATURES: FeatureItem[] = [
  {
    icon: Zap,
    title: "Throughput Without Compromise",
    description:
      "100,000+ TPS with sub-second finality. Parallel execution and optimized consensus deliver the speed institutional applications demand.",
  },
  {
    icon: Layers,
    title: "Modular by Design",
    description:
      "Consensus, execution, and data availability operate as independent, composable layers — giving builders flexibility without sacrificing performance.",
  },
  {
    icon: Coins,
    title: "Native Payment Infrastructure",
    description:
      "Stablecoin settlement, merchant-facing APIs, and cross-border rails built directly into the protocol — not bolted on after the fact.",
  },
  {
    icon: Code2,
    title: "Ship Faster, Ship Better",
    description:
      "Full-featured SDKs, smart contract toolkits, and production-ready testnets let teams go from idea to mainnet in weeks, not months.",
  },
  {
    icon: Globe,
    title: "An Ecosystem, Not Just a Chain",
    description:
      "DeFi protocols, tokenization platforms, payment networks, and enterprise integrations — all building on a shared, high-performance foundation.",
  },
  {
    icon: Shield,
    title: "Institutional-Grade Security",
    description:
      "Formally verified consensus, independent third-party audits, and hardened cryptographic primitives — built for the trust requirements of serious capital.",
  },
];

export interface EcosystemItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

export const ECOSYSTEM_MODULES: EcosystemItem[] = [
  {
    icon: BarChart3,
    title: "DeFi Protocols",
    description:
      "Lending, trading, and yield — powered by high-throughput infrastructure that eliminates the bottlenecks of legacy chains.",
    color: "#00E5FF",
  },
  {
    icon: Coins,
    title: "Payments & Settlement",
    description:
      "Stablecoin-native rails for merchants, payroll, remittances, and B2B settlement — moving real money at blockchain speed.",
    color: "#14F195",
  },
  {
    icon: Layers,
    title: "Asset Tokenization",
    description:
      "Securities, real estate, commodities, and private credit — represented on-chain with built-in compliance tooling.",
    color: "#6C63FF",
  },
  {
    icon: Wallet,
    title: "Wallet Infrastructure",
    description:
      "Self-custodial and institutional-grade wallets with multi-sig, social recovery, and programmable spending controls.",
    color: "#00E5FF",
  },
  {
    icon: ArrowUpRight,
    title: "Exchange Infrastructure",
    description:
      "On-chain order books, matching engines, and deep liquidity aggregation — built for professional trading environments.",
    color: "#14F195",
  },
  {
    icon: Building2,
    title: "Enterprise Integration",
    description:
      "Permissioned subnets, regulatory-ready compliance modules, and dedicated enterprise SDKs for institutional deployment.",
    color: "#6C63FF",
  },
  {
    icon: Wrench,
    title: "Developer Platform",
    description:
      "Smart contract frameworks, faucets, explorers, indexers, and production-grade API gateways — everything to go live, fast.",
    color: "#00E5FF",
  },
];

export interface RoadmapPhase {
  phase: string;
  title: string;
  period: string;
  items: string[];
  status: "completed" | "active" | "upcoming";
}

export const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    phase: "Phase 1",
    title: "Foundation",
    period: "Q1 — Q2 2025",
    items: [
      "Core protocol architecture finalized",
      "Consensus engine implemented & benchmarked",
      "Closed alpha testnet launched",
      "First independent security audit completed",
    ],
    status: "completed",
  },
  {
    phase: "Phase 2",
    title: "Network Launch",
    period: "Q3 — Q4 2025",
    items: [
      "Mainnet beta live with public validators",
      "Developer SDK & CLI tools shipped",
      "Cross-chain bridge infrastructure deployed",
      "Initial ecosystem partnerships signed",
    ],
    status: "completed",
  },
  {
    phase: "Phase 3",
    title: "Builder Expansion",
    period: "Q1 — Q2 2026",
    items: [
      "$10M ecosystem grant program opened",
      "Global hackathon series launched",
      "Production smart contract tooling released",
      "Developer documentation portal live",
    ],
    status: "active",
  },
  {
    phase: "Phase 4",
    title: "Ecosystem Acceleration",
    period: "Q3 — Q4 2026",
    items: [
      "First DeFi protocols deployed to mainnet",
      "Payment gateway integrations with merchants",
      "Institutional custody & compliance pilots",
      "Cross-chain interoperability framework",
    ],
    status: "upcoming",
  },
  {
    phase: "Phase 5",
    title: "Commercial Adoption",
    period: "Q1 — Q2 2027",
    items: [
      "Live merchant payment network operational",
      "Real-world asset tokenization platform",
      "Enterprise deployment & SLA framework",
      "Regulatory alignment across key markets",
    ],
    status: "upcoming",
  },
  {
    phase: "Phase 6",
    title: "Global Scale",
    period: "Q3 2027+",
    items: [
      "Multi-region validator expansion",
      "Full governance decentralization",
      "Layer 2 rollup ecosystem support",
      "Strategic global partnership network",
    ],
    status: "upcoming",
  },
];

export interface InvestorThesisItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const INVESTOR_THESIS: InvestorThesisItem[] = [
  {
    icon: TrendingUp,
    title: "Ground-Floor Infrastructure",
    description:
      "Layer 1 protocols capture value from every application built on top. DecentralChain offers exposure to an entire emerging ecosystem — not just a single product.",
  },
  {
    icon: Network,
    title: "Compounding Network Effects",
    description:
      "More developers attract more users. More users drive more transactions. More transactions generate more fees. The flywheel is structural, not speculative.",
  },
  {
    icon: Layers,
    title: "Multi-Vertical Platform",
    description:
      "DeFi, payments, tokenization, enterprise software — DecentralChain isn't optimized for one use case. It's a platform layer designed to expand into every vertical.",
  },
  {
    icon: Users,
    title: "Demand-Side Durability",
    description:
      "Revenue comes from real transaction volume — merchant settlement, asset issuance, protocol fees — not from token speculation. That creates a defensible economic model.",
  },
];

export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What exactly is DecentralChain?",
    answer:
      "DecentralChain is a Layer 1 blockchain protocol purpose-built for high throughput, real-world commerce, and institutional-grade security. It uses a modular architecture to deliver 100,000+ TPS while supporting DeFi, payments, tokenization, and enterprise applications.",
  },
  {
    question: "How is DecentralChain different from existing blockchains?",
    answer:
      "Most chains trade off speed for decentralization, or generalize at the cost of performance. DecentralChain separates consensus, execution, and data availability into independent layers — enabling purpose-specific optimization without sacrificing the properties that matter.",
  },
  {
    question: "Was DecentralChain built independently?",
    answer:
      "Yes. The protocol, consensus engine, networking stack, and developer tooling were designed and engineered from the ground up. DecentralChain is original infrastructure — not derived from an existing codebase.",
  },
  {
    question: "What does the investment opportunity look like?",
    answer:
      "DecentralChain is a foundation-layer asset. As the ecosystem scales — more apps, more users, more transaction volume — value accrues to the protocol through fees, staking, and the expanding economic activity of the network.",
  },
  {
    question: "How do teams start building on DecentralChain?",
    answer:
      "The developer portal provides full SDKs, smart contract tooling, funded testnets, and API documentation. Grant programs and accelerator partnerships are available to help teams launch production-ready applications.",
  },
  {
    question: "What real-world use cases are live or in development?",
    answer:
      "Current ecosystem focus areas include stablecoin payment rails, real estate tokenization, decentralized identity, supply chain provenance, and institutional custody infrastructure. The modular architecture supports rapid development of new verticals.",
  },
];

export const NETWORK_VALUE_LAYERS = [
  {
    label: "Global Reach & Governance",
    description: "Decentralized governance, multi-region validators, regulatory alignment",
    width: "100%",
  },
  {
    label: "Commerce & Enterprise Adoption",
    description: "Merchant networks, institutional deployments, cross-border settlement",
    width: "85%",
  },
  {
    label: "Application & Protocol Layer",
    description: "DeFi, tokenization, exchanges, identity, wallets",
    width: "70%",
  },
  {
    label: "Developer & Community Layer",
    description: "SDKs, grants, hackathons, open-source contributions",
    width: "55%",
  },
  {
    label: "Core Protocol Infrastructure",
    description: "Consensus engine, modular execution, data availability",
    width: "40%",
  },
];
