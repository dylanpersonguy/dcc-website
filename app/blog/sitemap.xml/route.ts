import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BASE_URL, BLOG_CATEGORY_SEO } from "@/lib/blog-seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", noindex: false },
    select: {
      slug: true,
      publishedDate: true,
      lastUpdated: true,
      updatedAt: true,
    },
    orderBy: { publishedDate: "desc" },
  });

  const urls: { loc: string; lastmod?: string; changefreq: string; priority: string }[] = [];

  // Blog index
  urls.push({
    loc: `${BASE_URL}/blog`,
    lastmod: new Date().toISOString().split("T")[0],
    changefreq: "daily",
    priority: "0.8",
  });

  // Category pages
  for (const cat of Object.values(BLOG_CATEGORY_SEO)) {
    urls.push({
      loc: `${BASE_URL}/blog/category/${cat.slug}`,
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "weekly",
      priority: "0.7",
    });
  }

  // Individual posts
  for (const post of posts) {
    const lastmod = (post.lastUpdated || post.publishedDate || post.updatedAt)
      ?.toISOString()
      .split("T")[0];
    urls.push({
      loc: `${BASE_URL}/blog/${post.slug}`,
      lastmod,
      changefreq: "monthly",
      priority: "0.6",
    });
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${
          u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""
        }\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    ),
    "</urlset>",
  ].join("\n");

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
