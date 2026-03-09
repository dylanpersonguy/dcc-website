"use server";

import { prisma } from "../prisma";
import { calculateSEOScore } from "../blog-utils";
import { validatePostForPublish } from "../blog-seo";

/* ─── Site Audit ─── */

export interface SiteAuditResult {
  totalIndexablePages: number;
  noindexPages: number;
  orphanPosts: number;
  thinPosts: number;
  missingTitles: number;
  missingDescriptions: number;
  missingImages: number;
  duplicateKeywords: { keyword: string; posts: { id: string; title: string }[] }[];
  avgSeoScore: number;
  postScores: { id: string; title: string; slug: string; score: number }[];
}

export async function runSiteAudit(): Promise<SiteAuditResult> {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      excerpt: true,
      seoTitle: true,
      seoDescription: true,
      primaryKeyword: true,
      secondaryKeywords: true,
      keywordEntities: true,
      featuredImage: true,
      wordCount: true,
      noindex: true,
      orphanStatus: true,
      internalLinks: true,
      externalLinks: true,
      inboundLinkCount: true,
      outboundLinkCount: true,
      searchIntent: true,
      audienceLevel: true,
      contentType: true,
    },
  });

  const indexable = posts.filter((p) => !p.noindex);
  const noindexPages = posts.filter((p) => p.noindex).length;
  const orphanPosts = posts.filter((p) => p.orphanStatus === "ORPHAN").length;
  const thinPosts = posts.filter((p) => p.wordCount < 300).length;
  const missingTitles = posts.filter((p) => !p.seoTitle).length;
  const missingDescriptions = posts.filter((p) => !p.seoDescription).length;
  const missingImages = posts.filter((p) => !p.featuredImage).length;

  // Duplicate keywords
  const keywordMap = new Map<string, { id: string; title: string }[]>();
  for (const p of posts) {
    if (!p.primaryKeyword) continue;
    const kw = p.primaryKeyword.toLowerCase();
    if (!keywordMap.has(kw)) keywordMap.set(kw, []);
    keywordMap.get(kw)!.push({ id: p.id, title: p.title });
  }
  const duplicateKeywords = Array.from(keywordMap.entries())
    .filter(([, posts]) => posts.length > 1)
    .map(([keyword, posts]) => ({ keyword, posts }));

  // SEO scores
  const postScores = posts.map((p) => {
    const score = calculateSEOScore(p as never);
    return { id: p.id, title: p.title, slug: p.slug, score: score.overall };
  });
  postScores.sort((a, b) => a.score - b.score);
  const avgSeoScore = postScores.length
    ? Math.round(postScores.reduce((s, p) => s + p.score, 0) / postScores.length)
    : 0;

  return {
    totalIndexablePages: indexable.length,
    noindexPages,
    orphanPosts,
    thinPosts,
    missingTitles,
    missingDescriptions,
    missingImages,
    duplicateKeywords,
    avgSeoScore,
    postScores,
  };
}

/* ─── Quality Gate ─── */

export async function runQualityGate(postId: string) {
  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Post not found");

  const gate = validatePostForPublish(post);

  // Check keyword cannibalization
  if (post.primaryKeyword) {
    const duplicates = await prisma.blogPost.findMany({
      where: {
        primaryKeyword: { equals: post.primaryKeyword, mode: "insensitive" },
        status: "PUBLISHED",
        id: { not: postId },
      },
      select: { id: true, title: true },
    });
    if (duplicates.length > 0) {
      gate.warnings.push(
        `Keyword cannibalization: "${post.primaryKeyword}" also used by: ${duplicates.map((d) => d.title).join(", ")}`
      );
    }
  }

  return gate;
}

/* ─── Sitemap Health ─── */

export async function getSitemapHealth() {
  const [publishedPosts, drafts, noindexCount, redirectCount] =
    await Promise.all([
      prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
      prisma.blogPost.count({ where: { status: "DRAFT" } }),
      prisma.blogPost.count({ where: { noindex: true } }),
      prisma.redirect.count({ where: { isActive: true } }),
    ]);

  const categories = 6; // All blog categories

  return {
    publishedPosts,
    drafts,
    noindexPosts: noindexCount,
    categories,
    activeRedirects: redirectCount,
    totalSitemapUrls: publishedPosts + categories,
  };
}
