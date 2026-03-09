import type { Metadata } from "next";
import type { BlogPost } from "./generated/prisma/client";

/* ─── Configuration ─── */

export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://decentralchain.io";
export const SITE_NAME = "DecentralChain";
export const SITE_TAGLINE =
  "The Infrastructure Layer for Digital Economies";
export const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`;
export const TWITTER_HANDLE = "@decentralchain";

export const BLOG_CATEGORY_SEO: Record<
  string,
  { title: string; description: string; slug: string }
> = {
  AI_AGENTS: {
    title: "AI Agents | DecentralChain Blog",
    description:
      "Explore autonomous AI agents, on-chain automation, and intelligent trading bots built on DecentralChain.",
    slug: "ai-agents",
  },
  TRADING_BOTS: {
    title: "Trading Bots | DecentralChain Blog",
    description:
      "Learn about algorithmic trading strategies, bot development, and DeFi trading automation on DecentralChain.",
    slug: "trading-bots",
  },
  AUTOMATION: {
    title: "Automation | DecentralChain Blog",
    description:
      "Discover blockchain automation tools, smart contract workflows, and decentralized task execution.",
    slug: "automation",
  },
  TUTORIALS: {
    title: "Tutorials | DecentralChain Blog",
    description:
      "Step-by-step guides for building on DecentralChain — from wallet setup to advanced smart contracts.",
    slug: "tutorials",
  },
  INDUSTRY_NEWS: {
    title: "Industry News | DecentralChain Blog",
    description:
      "Stay up to date with the latest blockchain industry developments, partnerships, and ecosystem updates.",
    slug: "industry-news",
  },
  WEB3: {
    title: "Web3 | DecentralChain Blog",
    description:
      "Deep dives into Web3 technology, decentralized finance, tokenization, and the future of digital economies.",
    slug: "web3",
  },
};

export const BLOG_CATEGORY_SLUG_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(BLOG_CATEGORY_SEO).map(([key, v]) => [v.slug, key])
);

/* ─── URL Helpers ─── */

export function canonicalUrl(
  path: string,
  params?: Record<string, string | undefined>
): string {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (!v) continue;
      if (k === "page" && v === "1") continue;
      if (["category", "page"].includes(k)) url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/* ─── Metadata Builder ─── */

interface MetadataOpts {
  title: string;
  description: string;
  canonical?: string;
  noindex?: boolean;
  ogType?: "website" | "article";
  ogImage?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  section?: string;
  tags?: string[];
}

export function buildMetadata(opts: MetadataOpts): Metadata {
  const meta: Metadata = {
    title: opts.title,
    description: opts.description,
    alternates: opts.canonical ? { canonical: opts.canonical } : undefined,
    robots: opts.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: opts.title,
      description: opts.description,
      type: (opts.ogType || "website") as "website",
      siteName: SITE_NAME,
      images: opts.ogImage ? [{ url: opts.ogImage }] : undefined,
      ...(opts.ogType === "article"
        ? {
            publishedTime: opts.publishedTime,
            modifiedTime: opts.modifiedTime,
            authors: opts.authors,
            section: opts.section,
            tags: opts.tags,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      creator: TWITTER_HANDLE,
    },
  };
  return meta;
}

/* ─── JSON-LD Builders ─── */

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    sameAs: [`https://twitter.com/decaborachain`],
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/blog?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function blogPostingJsonLd(post: BlogPost) {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || "",
    url,
    image: post.featuredImage || DEFAULT_OG_IMAGE,
    author: { "@type": "Person", name: post.authorName },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/logo.png` },
    },
    datePublished: post.publishedDate?.toISOString(),
    dateModified: (post.lastUpdated || post.updatedAt)?.toISOString(),
    wordCount: post.wordCount,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords]
      .filter(Boolean)
      .join(", "),
    articleSection: post.blogCategory,
    isAccessibleForFree: true,
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".post-excerpt", "h2"],
    },
    ...(post.keywordEntities.length > 0
      ? {
          about: post.keywordEntities.map((e) => ({
            "@type": "Thing",
            name: e,
          })),
        }
      : {}),
    copyrightHolder: { "@type": "Organization", name: SITE_NAME },
  };
}

export function collectionPageJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  items: { url: string; name: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: opts.items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: item.url,
        name: item.name,
      })),
    },
  };
}

export function faqPageJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/* ─── Content Hash ─── */

export function generateContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const chr = content.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/* ─── Publish Quality Gate ─── */

export function validatePostForPublish(post: Partial<BlogPost>): {
  pass: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const title = post.seoTitle || post.title || "";
  const description = post.seoDescription || "";
  const content = post.content || "";

  // Required checks
  if (!title) errors.push("SEO title is required");
  else if (title.length > 60) errors.push("SEO title exceeds 60 characters");

  if (!description) errors.push("Meta description is required");
  else if (description.length < 70 || description.length > 160)
    errors.push("Meta description should be 70-160 characters");

  if (!post.excerpt) errors.push("Excerpt is required");

  // Heading structure
  const h2s = (content.match(/^##\s/gm) || []).length;
  if (h2s < 1) errors.push("Content needs at least 1 H2 heading");

  // Internal links
  const mdLinks = (content.match(/\[([^\]]+)\]\(\/[^)]+\)/g) || []).length;
  const htmlLinks = (content.match(/<a\s[^>]*href=["']\/[^"']*["']/gi) || []).length;
  if (mdLinks + htmlLinks < 1) errors.push("At least 1 internal link required");

  // Keyword in title
  if (post.primaryKeyword && !title.toLowerCase().includes(post.primaryKeyword.toLowerCase()))
    warnings.push("Primary keyword not found in title");

  // Word count
  const words = content.split(/\s+/).filter((w) => w.length > 0).length;
  if (words < 300) errors.push("Content too thin (minimum 300 words)");
  else if (words < 800) warnings.push("Content may be too short for ranking (<800 words)");

  // Warnings
  if (!post.featuredImage) warnings.push("No featured image set");

  return { pass: errors.length === 0, errors, warnings };
}

/* ─── XML Sitemap Helpers ─── */

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSitemapXml(
  urls: {
    loc: string;
    lastmod?: string;
    changefreq?: string;
    priority?: number;
  }[]
): string {
  const entries = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${
          u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""
        }${
          u.changefreq
            ? `\n    <changefreq>${u.changefreq}</changefreq>`
            : ""
        }${
          u.priority !== undefined
            ? `\n    <priority>${u.priority}</priority>`
            : ""
        }\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

export function buildSitemapIndexXml(
  sitemaps: { loc: string; lastmod?: string }[]
): string {
  const entries = sitemaps
    .map(
      (s) =>
        `  <sitemap>\n    <loc>${escapeXml(s.loc)}</loc>${
          s.lastmod ? `\n    <lastmod>${s.lastmod}</lastmod>` : ""
        }\n  </sitemap>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`;
}
