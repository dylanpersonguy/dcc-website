"use server";

import { prisma } from "../prisma";
import { revalidatePath } from "next/cache";
import { calculateReadingTime, countWords } from "../blog-utils";
import { generateContentHash } from "../blog-seo";
import * as ai from "../blog-ai";

/* ─── Auth helper (stub — replace with real auth) ─── */

async function getCurrentUser() {
  // TODO: integrate real auth (NextAuth, Clerk, etc.)
  // For now, return admin for development
  return { id: "admin", name: "Admin", roles: ["ADMIN"] };
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.roles?.includes("ADMIN")) throw new Error("Unauthorized");
  return user;
}

/* ─── Internal Link Audit ─── */

async function _auditInternalLinks(postId: string) {
  const inbound = await prisma.internalLinkRule.count({
    where: { toPostId: postId, status: "INSERTED" },
  });
  const outbound = await prisma.internalLinkRule.count({
    where: { fromPostId: postId, status: "INSERTED" },
  });

  const linkScore = Math.min(100, inbound * 20 + outbound * 15);
  let orphanStatus: "HEALTHY" | "AT_RISK" | "ORPHAN" = "HEALTHY";
  if (inbound === 0 && outbound === 0) orphanStatus = "ORPHAN";
  else if (inbound === 0 || outbound === 0) orphanStatus = "AT_RISK";

  await prisma.blogPost.update({
    where: { id: postId },
    data: {
      inboundLinkCount: inbound,
      outboundLinkCount: outbound,
      internalLinkScore: linkScore,
      orphanStatus,
      lastInternalLinkAudit: new Date(),
    },
  });

  return { inbound, outbound, linkScore, orphanStatus };
}

/* ─── Blog CRUD ─── */

export async function createBlogPost(formData: FormData) {
  await requireAdmin();

  const content = (formData.get("content") as string) || "";
  const status = (formData.get("status") as string) || "DRAFT";
  const secondaryKeywords = (formData.get("secondaryKeywords") as string || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const keywordEntities = (formData.get("keywordEntities") as string || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const competitorUrls = (formData.get("competitorUrls") as string || "")
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  const post = await prisma.blogPost.create({
    data: {
      title: (formData.get("title") as string) || "Untitled",
      slug: (formData.get("slug") as string) || "",
      content,
      excerpt: (formData.get("excerpt") as string) || null,
      featuredImage: (formData.get("featuredImage") as string) || null,
      authorName: (formData.get("authorName") as string) || "DecentralChain Editorial",
      status: status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      publishedDate: status === "PUBLISHED" ? new Date() : null,
      wordCount: countWords(content),
      readingTime: calculateReadingTime(content),
      contentType: (formData.get("contentType") as "PILLAR" | "SUPPORTING") || "SUPPORTING",
      pillarPageId: (formData.get("pillarPageId") as string) || null,
      topicClusterId: (formData.get("topicClusterId") as string) || null,
      blogCategory: (formData.get("blogCategory") as string as "AI_AGENTS" | "TRADING_BOTS" | "AUTOMATION" | "TUTORIALS" | "INDUSTRY_NEWS" | "WEB3") || "AI_AGENTS",
      primaryKeyword: (formData.get("primaryKeyword") as string) || null,
      secondaryKeywords,
      keywordEntities,
      searchIntent: (formData.get("searchIntent") as "INFORMATIONAL" | "COMMERCIAL" | "NAVIGATIONAL") || "INFORMATIONAL",
      audienceLevel: (formData.get("audienceLevel") as "BEGINNER" | "INTERMEDIATE" | "ADVANCED") || "INTERMEDIATE",
      seoTitle: (formData.get("seoTitle") as string) || null,
      seoDescription: (formData.get("seoDescription") as string) || null,
      ogTitle: (formData.get("ogTitle") as string) || null,
      ogDescription: (formData.get("ogDescription") as string) || null,
      canonicalUrl: (formData.get("canonicalUrl") as string) || null,
      noindex: formData.get("noindex") === "true",
      serpCountry: (formData.get("serpCountry") as string) || "US",
      serpLanguage: (formData.get("serpLanguage") as string) || "en",
      competitorUrls,
      contentHash: generateContentHash(content),
    },
  });

  revalidatePath("/blog");
  revalidatePath("/admin/blog");
  return { success: true, id: post.id, slug: post.slug };
}

export async function updateBlogPost(postId: string, formData: FormData) {
  await requireAdmin();

  const content = (formData.get("content") as string) || "";
  const status = (formData.get("status") as string) || "DRAFT";
  const secondaryKeywords = (formData.get("secondaryKeywords") as string || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const keywordEntities = (formData.get("keywordEntities") as string || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const competitorUrls = (formData.get("competitorUrls") as string || "")
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  const existing = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!existing) throw new Error("Post not found");

  // Keyword cannibalization check
  const primaryKeyword = (formData.get("primaryKeyword") as string) || null;
  let cannibalizationRisk = existing.cannibalizationRisk;
  if (primaryKeyword) {
    const duplicate = await prisma.blogPost.findFirst({
      where: {
        primaryKeyword: { equals: primaryKeyword, mode: "insensitive" },
        status: "PUBLISHED",
        id: { not: postId },
      },
    });
    if (duplicate) cannibalizationRisk = "HIGH";
  }

  // Content hash for honest lastUpdated
  const newHash = generateContentHash(content);
  const contentChanged = newHash !== existing.contentHash;

  await prisma.blogPost.update({
    where: { id: postId },
    data: {
      title: (formData.get("title") as string) || existing.title,
      slug: (formData.get("slug") as string) || existing.slug,
      content,
      excerpt: (formData.get("excerpt") as string) || null,
      featuredImage: (formData.get("featuredImage") as string) || null,
      authorName: (formData.get("authorName") as string) || existing.authorName,
      status: status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      publishedDate:
        status === "PUBLISHED" && !existing.publishedDate
          ? new Date()
          : existing.publishedDate,
      lastUpdated: contentChanged ? new Date() : existing.lastUpdated,
      wordCount: countWords(content),
      readingTime: calculateReadingTime(content),
      contentType: (formData.get("contentType") as "PILLAR" | "SUPPORTING") || existing.contentType,
      pillarPageId: (formData.get("pillarPageId") as string) || null,
      topicClusterId: (formData.get("topicClusterId") as string) || null,
      blogCategory: (formData.get("blogCategory") as string as "AI_AGENTS" | "TRADING_BOTS" | "AUTOMATION" | "TUTORIALS" | "INDUSTRY_NEWS" | "WEB3") || existing.blogCategory,
      primaryKeyword,
      secondaryKeywords,
      keywordEntities,
      searchIntent: (formData.get("searchIntent") as "INFORMATIONAL" | "COMMERCIAL" | "NAVIGATIONAL") || existing.searchIntent,
      audienceLevel: (formData.get("audienceLevel") as "BEGINNER" | "INTERMEDIATE" | "ADVANCED") || existing.audienceLevel,
      seoTitle: (formData.get("seoTitle") as string) || null,
      seoDescription: (formData.get("seoDescription") as string) || null,
      ogTitle: (formData.get("ogTitle") as string) || null,
      ogDescription: (formData.get("ogDescription") as string) || null,
      canonicalUrl: (formData.get("canonicalUrl") as string) || null,
      noindex: formData.get("noindex") === "true",
      serpCountry: (formData.get("serpCountry") as string) || "US",
      serpLanguage: (formData.get("serpLanguage") as string) || "en",
      competitorUrls,
      contentHash: newHash,
      cannibalizationRisk,
    },
  });

  revalidatePath("/blog");
  revalidatePath(`/blog/${existing.slug}`);
  revalidatePath("/admin/blog");
  return { success: true };
}

export async function deleteBlogPost(postId: string) {
  await requireAdmin();

  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Post not found");

  // Auto-create redirect for published posts
  if (post.status === "PUBLISHED") {
    await prisma.redirect.upsert({
      where: { fromPath: `/blog/${post.slug}` },
      update: { toPath: "/blog", reason: "Post deleted", isActive: true },
      create: {
        fromPath: `/blog/${post.slug}`,
        toPath: "/blog",
        statusCode: 301,
        reason: "Post deleted",
        isActive: true,
      },
    });
  }

  await prisma.blogPost.delete({ where: { id: postId } });

  revalidatePath("/blog");
  revalidatePath("/admin/blog");
  return { success: true };
}

export async function incrementPostViews(postId: string) {
  await prisma.blogPost.update({
    where: { id: postId },
    data: { views: { increment: 1 } },
  });
}

/* ─── Comment Management ─── */

export async function submitComment(postId: string, formData: FormData) {
  // Honeypot spam check
  const honeypot = (formData.get("website") as string) || "";
  if (honeypot) return { success: false, error: "Invalid submission" };

  const authorName = (formData.get("authorName") as string || "").trim();
  const authorEmail = (formData.get("authorEmail") as string || "").trim() || null;
  const content = (formData.get("content") as string || "").trim();

  if (!authorName || authorName.length > 100) return { success: false, error: "Name is required (max 100 chars)" };
  if (!content || content.length > 5000) return { success: false, error: "Comment is required (max 5000 chars)" };

  const post = await prisma.blogPost.findUnique({ where: { id: postId }, select: { title: true } });
  if (!post) return { success: false, error: "Post not found" };

  await prisma.blogComment.create({
    data: {
      postId,
      postTitle: post.title,
      authorName,
      authorEmail,
      content,
      status: "PENDING",
    },
  });

  return { success: true };
}

export async function moderateComment(commentId: string, action: "APPROVED" | "REJECTED") {
  await requireAdmin();
  await prisma.blogComment.update({
    where: { id: commentId },
    data: { status: action, isRead: true },
  });
  revalidatePath("/admin/blog/comments");
  return { success: true };
}

export async function deleteComment(commentId: string) {
  await requireAdmin();
  await prisma.blogComment.delete({ where: { id: commentId } });
  revalidatePath("/admin/blog/comments");
  return { success: true };
}

export async function markCommentRead(commentId: string) {
  await requireAdmin();
  await prisma.blogComment.update({
    where: { id: commentId },
    data: { isRead: true },
  });
  return { success: true };
}

/* ─── AI Actions ─── */

export async function generateOutlineAction(
  title: string,
  primaryKeyword: string,
  audienceLevel: string
) {
  await requireAdmin();
  const outline = await ai.generateOutline(title, primaryKeyword, audienceLevel);
  return { success: true, outline };
}

export async function generateArticleAction(
  outline: string,
  primaryKeyword: string,
  secondaryKeywords: string[]
) {
  await requireAdmin();
  const article = await ai.generateArticle(outline, primaryKeyword, secondaryKeywords);
  return { success: true, article };
}

export async function analyzeSEOAction(postId: string) {
  await requireAdmin();
  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Post not found");

  const result = await ai.analyzeSEO({
    title: post.title,
    content: post.content,
    primaryKeyword: post.primaryKeyword || "",
    seoTitle: post.seoTitle || undefined,
    seoDescription: post.seoDescription || undefined,
    excerpt: post.excerpt || undefined,
    wordCount: post.wordCount,
  });
  return { success: true, analysis: result };
}

export async function suggestInternalLinksAction(postId: string) {
  await requireAdmin();
  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Post not found");

  const otherPosts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", id: { not: postId } },
    select: { id: true, title: true, slug: true, excerpt: true, primaryKeyword: true },
    take: 50,
  });

  const result = await ai.suggestInternalLinks(post.title, post.content, otherPosts);

  // Parse and create link rules
  try {
    const suggestions = JSON.parse(result);
    if (Array.isArray(suggestions)) {
      for (const s of suggestions) {
        const targetExists = otherPosts.some((p) => p.id === s.targetPostId);
        if (!targetExists) continue;

        await prisma.internalLinkRule.upsert({
          where: {
            id: `${postId}-${s.targetPostId}`,
          },
          update: {
            anchorText: s.anchorText || "",
            placementHint: s.placement === "intro" ? "INTRO" : s.placement === "conclusion" ? "CONCLUSION" : "MID",
            relevanceScore: Math.min(100, Math.max(0, s.relevanceScore || 50)),
          },
          create: {
            fromPostId: postId,
            toPostId: s.targetPostId,
            anchorText: s.anchorText || "",
            placementHint: s.placement === "intro" ? "INTRO" : s.placement === "conclusion" ? "CONCLUSION" : "MID",
            relevanceScore: Math.min(100, Math.max(0, s.relevanceScore || 50)),
            status: "SUGGESTED",
          },
        });
      }
    }
  } catch {
    // AI response wasn't valid JSON — return raw
  }

  await _auditInternalLinks(postId);
  return { success: true, raw: result };
}

export async function fixContentAction(postId: string, fixType: "readability" | "grammar" | "seo" | "tone" | "structure") {
  await requireAdmin();
  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Post not found");

  const fixed = await ai.fixContent(post.content, fixType);
  return { success: true, content: fixed };
}

export async function analyzeCompetitorGapsAction(postId: string) {
  await requireAdmin();
  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error("Post not found");

  const result = await ai.analyzeCompetitorGaps(
    post.title,
    post.primaryKeyword || "",
    post.competitorUrls
  );

  // Try to save parsed report
  try {
    const report = JSON.parse(result);
    await prisma.blogPost.update({
      where: { id: postId },
      data: {
        competitorGapReport: report,
        competitorSnapshotDate: new Date(),
      },
    });
  } catch {
    // Save raw if parsing fails
  }

  return { success: true, report: result };
}

/* ─── Link & Task Management ─── */

export async function updateLinkingTaskStatus(
  taskId: string,
  status: "OPEN" | "IN_PROGRESS" | "DONE"
) {
  await requireAdmin();
  await prisma.linkingTask.update({ where: { id: taskId }, data: { status } });
  return { success: true };
}

export async function updateLinkRuleStatus(
  ruleId: string,
  status: "APPROVED" | "REJECTED" | "INSERTED"
) {
  await requireAdmin();
  await prisma.internalLinkRule.update({ where: { id: ruleId }, data: { status } });
  return { success: true };
}

export async function createRedirect(formData: FormData) {
  await requireAdmin();
  const fromPath = (formData.get("fromPath") as string) || "";
  const toPath = (formData.get("toPath") as string) || "";
  const statusCode = parseInt((formData.get("statusCode") as string) || "301", 10);
  const reason = (formData.get("reason") as string) || null;

  await prisma.redirect.create({
    data: { fromPath, toPath, statusCode, reason, isActive: true },
  });
  return { success: true };
}
