/**
 * Create featured image SVGs for the 5 new blog articles.
 * Embeds the DCC logo as base64 from the existing featured images.
 */
import { readFileSync, writeFileSync } from "fs";

// Extract the base64 logo from an existing SVG
const existingSvg = readFileSync("public/images/blog/decentralchain-blockchain.svg", "utf-8");
const logoMatch = existingSvg.match(/href="(data:image\/png;base64,[A-Za-z0-9+/=]+)"/);
if (!logoMatch) throw new Error("Could not extract base64 logo");
const logo = logoMatch[1];

const svgs = [
  {
    file: "what-makes-decentralchain-unique.svg",
    title: "What Makes DecentralChain Unique",
    subtitle: "Five Pillars That Set DCC Apart",
    ariaLabel: "what makes DecentralChain unique five differentiating features overview",
    gradId: "f6",
    elements: `
  <rect x="80" y="140" width="200" height="120" rx="14" fill="#0B0F14" stroke="#00E5FF" stroke-width="2"/>
  <text x="180" y="180" text-anchor="middle" fill="#00E5FF" font-family="sans-serif" font-size="15" font-weight="700">AI-Native</text>
  <text x="180" y="204" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">Natural Language</text>
  <text x="180" y="222" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">Blockchain Interaction</text>

  <rect x="320" y="140" width="200" height="120" rx="14" fill="#0B0F14" stroke="#6C63FF" stroke-width="2"/>
  <text x="420" y="180" text-anchor="middle" fill="#6C63FF" font-family="sans-serif" font-size="15" font-weight="700">Green Consensus</text>
  <text x="420" y="204" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">Carbon-Negative</text>
  <text x="420" y="222" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">Leased Proof of Stake</text>

  <rect x="560" y="140" width="200" height="120" rx="14" fill="#0B0F14" stroke="#14F195" stroke-width="2"/>
  <text x="660" y="180" text-anchor="middle" fill="#14F195" font-family="sans-serif" font-size="15" font-weight="700">RIDE Safety</text>
  <text x="660" y="204" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">Non-Turing Complete</text>
  <text x="660" y="222" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">Reentrancy-Free</text>

  <rect x="200" y="300" width="200" height="120" rx="14" fill="#0B0F14" stroke="#00E5FF" stroke-width="2"/>
  <text x="300" y="340" text-anchor="middle" fill="#00E5FF" font-family="sans-serif" font-size="15" font-weight="700">Integrated DeFi</text>
  <text x="300" y="364" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">AMM · Bridge · Staking</text>
  <text x="300" y="382" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">Single Security Model</text>

  <rect x="440" y="300" width="200" height="120" rx="14" fill="#0B0F14" stroke="#6C63FF" stroke-width="2"/>
  <text x="540" y="340" text-anchor="middle" fill="#6C63FF" font-family="sans-serif" font-size="15" font-weight="700">Cross-Chain</text>
  <text x="540" y="364" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">SOL-DCC ZK Bridge</text>
  <text x="540" y="382" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">Trustless Verification</text>

  <circle cx="840" cy="300" r="55" fill="#0B0F14" stroke="#00E5FF" stroke-width="2"/>
  <image href="${logo}" x="808" y="268" width="64" height="64"/>
`
  },
  {
    file: "decentralchain-consensus-mechanism.svg",
    title: "DecentralChain Consensus Mechanism",
    subtitle: "Leased Proof of Stake — How Blocks Are Produced",
    ariaLabel: "DecentralChain consensus mechanism Leased Proof of Stake validator diagram",
    gradId: "f7",
    elements: `
  <rect x="80" y="140" width="300" height="160" rx="14" fill="#0B0F14" stroke="#6C63FF" stroke-width="2"/>
  <text x="230" y="175" text-anchor="middle" fill="#6C63FF" font-family="sans-serif" font-size="17" font-weight="700">Token Holders</text>
  <text x="230" y="200" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Hold DCC in personal wallet</text>
  <text x="230" y="222" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Lease weight to validators</text>
  <text x="230" y="244" text-anchor="middle" fill="#6C63FF" font-family="sans-serif" font-size="12" font-weight="600">No custody transfer required</text>
  <text x="230" y="270" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Earn proportional block rewards</text>

  <line x1="400" y1="220" x2="480" y2="220" stroke="#00E5FF" stroke-width="2"/>
  <polygon points="475,212 490,220 475,228" fill="#00E5FF"/>
  <text x="440" y="210" text-anchor="middle" fill="#00E5FF" font-family="sans-serif" font-size="11">Lease</text>

  <rect x="500" y="140" width="300" height="160" rx="14" fill="#0B0F14" stroke="#00E5FF" stroke-width="2"/>
  <image href="${logo}" x="510" y="150" width="40" height="40"/>
  <text x="650" y="175" text-anchor="middle" fill="#00E5FF" font-family="sans-serif" font-size="17" font-weight="700">Validators</text>
  <text x="650" y="200" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Own stake + leased DCC</text>
  <text x="650" y="222" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Selection by total weight</text>
  <text x="650" y="244" text-anchor="middle" fill="#00E5FF" font-family="sans-serif" font-size="12" font-weight="600">Produce blocks &lt;400ms</text>
  <text x="650" y="270" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Distribute fees to leasers</text>

  <rect x="200" y="380" width="600" height="80" rx="14" fill="#0B0F14" stroke="#14F195" stroke-width="2"/>
  <text x="500" y="415" text-anchor="middle" fill="#14F195" font-family="sans-serif" font-size="16" font-weight="700">Green Consensus Layer</text>
  <text x="500" y="440" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Carbon Negative · Sub-Second Finality · Non-Custodial · Low Hardware</text>
`
  },
  {
    file: "decentralchain-transaction-speed.svg",
    title: "DecentralChain Transaction Speed",
    subtitle: "Sub-Second Finality &amp; Scalable Throughput",
    ariaLabel: "DecentralChain transaction speed sub-second finality and scalability metrics",
    gradId: "f8",
    elements: `
  <rect x="100" y="140" width="400" height="180" rx="14" fill="#0B0F14" stroke="#00E5FF" stroke-width="2"/>
  <text x="300" y="175" text-anchor="middle" fill="#00E5FF" font-family="sans-serif" font-size="20" font-weight="700">&lt; 400ms Finality</text>
  <text x="300" y="200" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="13">True Layer 1 settlement</text>

  <text x="170" y="240" text-anchor="middle" fill="#14F195" font-family="sans-serif" font-size="28" font-weight="700">0.4s</text>
  <text x="170" y="260" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">DecentralChain</text>

  <text x="300" y="240" text-anchor="middle" fill="#718096" font-family="sans-serif" font-size="28" font-weight="700">12s</text>
  <text x="300" y="260" text-anchor="middle" fill="#718096" font-family="sans-serif" font-size="11">Solana</text>

  <text x="430" y="240" text-anchor="middle" fill="#4A5568" font-family="sans-serif" font-size="28" font-weight="700">15m</text>
  <text x="430" y="260" text-anchor="middle" fill="#4A5568" font-family="sans-serif" font-size="11">Ethereum L1</text>

  <rect x="560" y="140" width="300" height="180" rx="14" fill="#0B0F14" stroke="#14F195" stroke-width="2"/>
  <text x="710" y="175" text-anchor="middle" fill="#14F195" font-family="sans-serif" font-size="17" font-weight="700">Scalability Design</text>
  <text x="710" y="204" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Compile-time gas calculation</text>
  <text x="710" y="226" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Predictable throughput</text>
  <text x="710" y="248" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">No congestion-driven spikes</text>
  <text x="710" y="270" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Consistent uptime record</text>

  <circle cx="200" cy="430" r="40" fill="#0B0F14" stroke="#00E5FF" stroke-width="2"/>
  <image href="${logo}" x="174" y="404" width="52" height="52"/>
`
  },
  {
    file: "why-decentralchain-was-created.svg",
    title: "Why DecentralChain Was Created",
    subtitle: "Solving the Problems Legacy Blockchains Left Behind",
    ariaLabel: "why DecentralChain was created solving blockchain industry problems",
    gradId: "f9",
    elements: `
  <rect x="80" y="140" width="320" height="200" rx="14" fill="#0B0F14" stroke="#FF6B6B" stroke-width="2"/>
  <text x="240" y="175" text-anchor="middle" fill="#FF6B6B" font-family="sans-serif" font-size="17" font-weight="700">Industry Problems</text>
  <text x="240" y="205" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Complex user interfaces</text>
  <text x="240" y="228" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">High energy consumption</text>
  <text x="240" y="251" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Smart contract vulnerabilities</text>
  <text x="240" y="274" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Fragmented DeFi ecosystems</text>
  <text x="240" y="297" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="12">Siloed blockchains</text>

  <line x1="420" y1="240" x2="500" y2="240" stroke="#6C63FF" stroke-width="2"/>
  <polygon points="495,232 510,240 495,248" fill="#6C63FF"/>

  <rect x="520" y="140" width="320" height="200" rx="14" fill="#0B0F14" stroke="#14F195" stroke-width="2"/>
  <text x="680" y="175" text-anchor="middle" fill="#14F195" font-family="sans-serif" font-size="17" font-weight="700">DCC Solutions</text>
  <text x="680" y="205" text-anchor="middle" fill="#14F195" font-family="sans-serif" font-size="12">AI Terminal interface</text>
  <text x="680" y="228" text-anchor="middle" fill="#14F195" font-family="sans-serif" font-size="12">Carbon-negative LPoS</text>
  <text x="680" y="251" text-anchor="middle" fill="#14F195" font-family="sans-serif" font-size="12">RIDE — reentrancy-free</text>
  <text x="680" y="274" text-anchor="middle" fill="#14F195" font-family="sans-serif" font-size="12">Vertically integrated DeFi</text>
  <text x="680" y="297" text-anchor="middle" fill="#14F195" font-family="sans-serif" font-size="12">SOL-DCC ZK bridge</text>

  <circle cx="920" cy="240" r="45" fill="#0B0F14" stroke="#00E5FF" stroke-width="2"/>
  <image href="${logo}" x="891" y="211" width="58" height="58"/>
`
  },
  {
    file: "vision-of-decentralchain.svg",
    title: "The Vision of DecentralChain",
    subtitle: "Building Accessible, Sustainable Blockchain for Everyone",
    ariaLabel: "vision of DecentralChain accessible sustainable blockchain future roadmap",
    gradId: "f10",
    elements: `
  <rect x="100" y="140" width="1000" height="3" rx="1.5" fill="url(#f10_bar)"/>

  <circle cx="200" cy="220" r="30" fill="#0B0F14" stroke="#6C63FF" stroke-width="2"/>
  <text x="200" y="225" text-anchor="middle" fill="#6C63FF" font-family="sans-serif" font-size="14" font-weight="700">1</text>
  <text x="200" y="270" text-anchor="middle" fill="white" font-family="sans-serif" font-size="13" font-weight="600">Accessibility</text>
  <text x="200" y="290" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">AI-native interface</text>
  <text x="200" y="308" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">for every user</text>

  <circle cx="400" cy="220" r="30" fill="#0B0F14" stroke="#00E5FF" stroke-width="2"/>
  <text x="400" y="225" text-anchor="middle" fill="#00E5FF" font-family="sans-serif" font-size="14" font-weight="700">2</text>
  <text x="400" y="270" text-anchor="middle" fill="white" font-family="sans-serif" font-size="13" font-weight="600">Sustainability</text>
  <text x="400" y="290" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">Carbon-negative</text>
  <text x="400" y="308" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">by design</text>

  <circle cx="600" cy="220" r="30" fill="#0B0F14" stroke="#14F195" stroke-width="2"/>
  <text x="600" y="225" text-anchor="middle" fill="#14F195" font-family="sans-serif" font-size="14" font-weight="700">3</text>
  <text x="600" y="270" text-anchor="middle" fill="white" font-family="sans-serif" font-size="13" font-weight="600">Safety</text>
  <text x="600" y="290" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">Provably correct</text>
  <text x="600" y="308" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">smart contracts</text>

  <circle cx="800" cy="220" r="30" fill="#0B0F14" stroke="#6C63FF" stroke-width="2"/>
  <text x="800" y="225" text-anchor="middle" fill="#6C63FF" font-family="sans-serif" font-size="14" font-weight="700">4</text>
  <text x="800" y="270" text-anchor="middle" fill="white" font-family="sans-serif" font-size="13" font-weight="600">Interoperability</text>
  <text x="800" y="290" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">Cross-chain ZK</text>
  <text x="800" y="308" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">bridges</text>

  <circle cx="1000" cy="220" r="30" fill="#0B0F14" stroke="#00E5FF" stroke-width="2"/>
  <text x="1000" y="225" text-anchor="middle" fill="#00E5FF" font-family="sans-serif" font-size="14" font-weight="700">5</text>
  <text x="1000" y="270" text-anchor="middle" fill="white" font-family="sans-serif" font-size="13" font-weight="600">Integration</text>
  <text x="1000" y="290" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">Full DeFi stack</text>
  <text x="1000" y="308" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="11">built in</text>

  <circle cx="600" cy="450" r="65" fill="#0B0F14" stroke="#00E5FF" stroke-width="2"/>
  <image href="${logo}" x="559" y="409" width="82" height="82"/>
`
  }
];

for (const svg of svgs) {
  const extraDefs = svg.gradId === "f10" ? `
    <linearGradient id="f10_bar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00E5FF"/>
      <stop offset="50%" stop-color="#6C63FF"/>
      <stop offset="100%" stop-color="#14F195"/>
    </linearGradient>` : "";

  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" aria-label="${svg.ariaLabel}">
  <defs>
    <linearGradient id="${svg.gradId}_bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F14"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="${svg.gradId}_bar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00E5FF"/>
      <stop offset="50%" stop-color="#6C63FF"/>
      <stop offset="100%" stop-color="#14F195"/>
    </linearGradient>${extraDefs}
  </defs>
  <rect width="1200" height="630" fill="url(#${svg.gradId}_bg)"/>
  <text x="600" y="58" text-anchor="middle" fill="white" font-family="sans-serif" font-size="34" font-weight="700">${svg.title}</text>
  <rect x="340" y="74" width="520" height="3" rx="1.5" fill="url(#${svg.gradId}_bar)"/>
  <text x="600" y="104" text-anchor="middle" fill="#A0AEC0" font-family="sans-serif" font-size="15">${svg.subtitle}</text>
${svg.elements}
</svg>`;

  writeFileSync(`public/images/blog/${svg.file}`, content);
  console.log(`Created: public/images/blog/${svg.file}`);
}
console.log("\nDone!");
