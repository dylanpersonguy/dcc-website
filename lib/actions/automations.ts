"use server";

import { prisma } from "../prisma";
import { revalidatePath } from "next/cache";
import { calculateReadingTime, countWords } from "../blog-utils";
import { generateContentHash } from "../blog-seo";
import type { Prisma } from "../generated/prisma/client";
import OpenAI from "openai";

const GITHUB_ORG = "Decentral-America";
const GITHUB_API = "https://api.github.com";

/* ─── Auth helper ─── */

async function requireAdmin() {
  return { id: "admin", name: "Admin", roles: ["ADMIN"] };
}

/* ─── Types ─── */

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  updated_at: string;
  pushed_at: string;
  language: string | null;
  stargazers_count: number;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
  author: { login: string; avatar_url: string } | null;
}

export interface CommitGroup {
  repo: string;
  repoUrl: string;
  commits: GitHubCommit[];
}

export interface GitHubScannerConfig {
  repos: string[];
  sinceDays: number;
  wordCountMin: number;
  wordCountMax: number;
  tone: string;
  audienceLevel: string;
  blogCategory: string;
  authorName: string;
  creditAuthors: boolean;
  customInstructions: string;
  pillarSlug: string;
}

const DEFAULT_GITHUB_SCANNER_CONFIG: GitHubScannerConfig = {
  repos: [],
  sinceDays: 30,
  wordCountMin: 900,
  wordCountMax: 1500,
  tone: "friendly",
  audienceLevel: "BEGINNER",
  blogCategory: "INDUSTRY_NEWS",
  authorName: "DecentralChain Editorial",
  creditAuthors: true,
  customInstructions: "",
  pillarSlug: "decentralchain-news-and-updates",
};

/* ─── Automation CRUD ─── */

export async function getAutomations() {
  await requireAdmin();
  return prisma.automation.findMany({
    orderBy: { createdAt: "desc" },
    include: { runs: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
}

export async function getAutomation(id: string) {
  await requireAdmin();
  return prisma.automation.findUnique({
    where: { id },
    include: { runs: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
}

export async function createAutomation(
  name: string,
  type: string,
  config: Record<string, unknown>
) {
  await requireAdmin();
  const automation = await prisma.automation.create({
    data: { name, type, config: config as Prisma.InputJsonValue },
  });
  revalidatePath("/admin/automations");
  return automation;
}

export async function updateAutomationConfig(
  id: string,
  config: Record<string, unknown>
) {
  await requireAdmin();
  const automation = await prisma.automation.update({
    where: { id },
    data: { config: config as Prisma.InputJsonValue },
  });
  revalidatePath("/admin/automations");
  return automation;
}

export async function updateAutomationName(id: string, name: string) {
  await requireAdmin();
  const automation = await prisma.automation.update({
    where: { id },
    data: { name },
  });
  revalidatePath("/admin/automations");
  return automation;
}

export async function toggleAutomation(id: string, enabled: boolean) {
  await requireAdmin();
  const automation = await prisma.automation.update({
    where: { id },
    data: { enabled },
  });
  revalidatePath("/admin/automations");
  return automation;
}

export async function deleteAutomation(id: string) {
  await requireAdmin();
  await prisma.automation.delete({ where: { id } });
  revalidatePath("/admin/automations");
}

/* ─── GitHub API helpers ─── */

function githubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "DecentralChain-Admin",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

export async function fetchGitHubRepos(): Promise<{
  success: boolean;
  repos?: GitHubRepo[];
  error?: string;
}> {
  await requireAdmin();
  try {
    const res = await fetch(
      `${GITHUB_API}/orgs/${GITHUB_ORG}/repos?per_page=100&sort=pushed&direction=desc`,
      { headers: githubHeaders(), next: { revalidate: 0 } }
    );
    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `GitHub API error ${res.status}: ${text}`,
      };
    }
    const data: GitHubRepo[] = await res.json();
    return { success: true, repos: data };
  } catch (err) {
    return {
      success: false,
      error: `Failed to fetch repos: ${(err as Error).message}`,
    };
  }
}

export async function fetchRepoCommits(
  repoNames: string[],
  since?: string
): Promise<{
  success: boolean;
  commitGroups?: CommitGroup[];
  error?: string;
}> {
  await requireAdmin();
  const sinceDate =
    since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const groups: CommitGroup[] = [];
    for (const repo of repoNames) {
      const res = await fetch(
        `${GITHUB_API}/repos/${GITHUB_ORG}/${encodeURIComponent(repo)}/commits?since=${sinceDate}&per_page=50`,
        { headers: githubHeaders(), next: { revalidate: 0 } }
      );
      if (!res.ok) continue;
      const commits: GitHubCommit[] = await res.json();
      if (commits.length > 0) {
        groups.push({
          repo,
          repoUrl: `https://github.com/${GITHUB_ORG}/${repo}`,
          commits,
        });
      }
    }
    return { success: true, commitGroups: groups };
  } catch (err) {
    return {
      success: false,
      error: `Failed to fetch commits: ${(err as Error).message}`,
    };
  }
}

/* ─── Run GitHub Scanner automation ─── */

const TONE_MAP: Record<string, string> = {
  friendly:
    "Friendly, conversational tone - write as if explaining to a smart friend who is NOT a programmer.",
  professional:
    "Professional and authoritative tone suitable for an industry audience.",
  casual:
    "Very casual and fun tone - like a tech blog written by a friend.",
  formal:
    "Formal, precise language suitable for enterprise or institutional readers.",
};

export async function runGitHubScanner(
  automationId: string,
  commitGroups: CommitGroup[]
): Promise<{
  success: boolean;
  postId?: string;
  slug?: string;
  error?: string;
}> {
  await requireAdmin();

  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
  });
  if (!automation) return { success: false, error: "Automation not found" };

  const config = automation.config as unknown as GitHubScannerConfig;

  // Create a run record
  const run = await prisma.automationRun.create({
    data: { automationId, status: "running" },
  });

  try {
    const commitSummary = commitGroups
      .map((g) => {
        const commitList = g.commits
          .slice(0, 15)
          .map(
            (c) =>
              `  - ${c.commit.message.split("\n")[0]} (by ${c.commit.author.name}, ${new Date(c.commit.author.date).toLocaleDateString()})`
          )
          .join("\n");
        return `Repository: ${g.repo} (${g.repoUrl})\n${commitList}`;
      })
      .join("\n\n");

    const totalCommits = commitGroups.reduce(
      (sum, g) => sum + g.commits.length,
      0
    );
    const repoNames = commitGroups.map((g) => g.repo);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const toneInstruction = TONE_MAP[config.tone] || TONE_MAP.friendly;
    const creditLine = config.creditAuthors
      ? `- Mention the developers/programmers who made the commits by name and credit their contributions (e.g. "Josue, the lead developer, implemented...")`
      : `- Do not mention individual developer names.`;
    const customBlock = config.customInstructions
      ? `\nAdditional instructions from the user:\n${config.customInstructions}\n`
      : "";

    const systemPrompt = `You are a friendly writer for the DecentralChain blockchain project blog.
You write in plain, simple language that anyone can understand - no technical jargon, no developer-speak.
If you must reference a technical concept, explain it in one simple sentence so a non-technical reader can follow along.
Never mention "Waves" or "WAVES" anywhere. The project is called DecentralChain, the token is DCC.
Never use em dashes or en dashes in the content. Use hyphens (-) or commas instead.
Write in markdown format with proper H2/H3 headings.`;

    const userPrompt = `Write a blog post about recent development activity in the DecentralChain ecosystem.

Here is a summary of recent commits across ${repoNames.length} repositories (${totalCommits} total commits):

${commitSummary}

Requirements:
- Title should be specific to the changes (e.g. "DecentralChain SDK Updates: [specific changes]")
- ${config.wordCountMin}-${config.wordCountMax} words
- ${toneInstruction}
- Avoid technical jargon entirely. Instead of "refactored the serialization layer", say "improved how data is organized behind the scenes"
- Group changes by repository and explain what they mean in plain language
${creditLine}
- Explain why each change matters for everyday users, not just developers
- Use short paragraphs and simple sentences for easy reading
- End with a forward-looking conclusion
- Use markdown headings (##, ###)
- Do NOT mention "Waves" or "WAVES" anywhere
${customBlock}
Return the article in this exact format:
TITLE: [article title]
SLUG: [kebab-case-slug]
SEO_TITLE: [max 60 chars]
SEO_DESCRIPTION: [max 155 chars]
EXCERPT: [1-2 sentence summary]
PRIMARY_KEYWORD: [3-6 word keyword phrase]
---
[full markdown article body]`;

    const res = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.7,
    });

    const raw = res.choices[0]?.message?.content?.trim() || "";
    if (!raw) throw new Error("AI returned empty response");

    const dividerIndex = raw.indexOf("---");
    if (dividerIndex === -1) throw new Error("AI response missing --- divider");

    const metaBlock = raw.slice(0, dividerIndex);
    const content = raw.slice(dividerIndex + 3).trim();

    const title =
      metaBlock.match(/TITLE:\s*(.+)/)?.[1]?.trim() ||
      "DecentralChain Development Update";
    const slug =
      metaBlock.match(/SLUG:\s*(.+)/)?.[1]?.trim() ||
      `decentralchain-dev-update-${Date.now()}`;
    const seoTitle =
      metaBlock.match(/SEO_TITLE:\s*(.+)/)?.[1]?.trim() ||
      title.slice(0, 60);
    const seoDescription =
      metaBlock.match(/SEO_DESCRIPTION:\s*(.+)/)?.[1]?.trim() || "";
    const excerpt =
      metaBlock.match(/EXCERPT:\s*(.+)/)?.[1]?.trim() || "";
    const primaryKeyword =
      metaBlock.match(/PRIMARY_KEYWORD:\s*(.+)/)?.[1]?.trim() ||
      "DecentralChain development updates";

    const existingSlug = await prisma.blogPost.findUnique({
      where: { slug },
    });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const pillar = config.pillarSlug
      ? await prisma.blogPost.findUnique({
          where: { slug: config.pillarSlug },
        })
      : null;

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug: finalSlug,
        content,
        excerpt,
        authorName: config.authorName || "DecentralChain Editorial",
        status: "DRAFT",
        wordCount: countWords(content),
        readingTime: calculateReadingTime(content),
        contentType: "SUPPORTING",
        pillarPageId: pillar?.id || null,
        blogCategory: config.blogCategory as
          | "INDUSTRY_NEWS"
          | "AI_AGENTS"
          | "TRADING_BOTS"
          | "AUTOMATION"
          | "TUTORIALS"
          | "WEB3",
        primaryKeyword,
        seoTitle,
        seoDescription,
        searchIntent: "INFORMATIONAL",
        audienceLevel: config.audienceLevel as
          | "BEGINNER"
          | "INTERMEDIATE"
          | "ADVANCED",
        contentHash: generateContentHash(content),
      },
    });

    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        message: `Created: ${title}`,
        resultPostId: post.id,
        resultSlug: post.slug,
      },
    });
    await prisma.automation.update({
      where: { id: automationId },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: "success",
        lastRunMessage: `Created: ${title}`,
        runCount: { increment: 1 },
      },
    });

    revalidatePath("/blog");
    revalidatePath("/admin/blog");
    revalidatePath("/admin/automations");

    return { success: true, postId: post.id, slug: post.slug };
  } catch (err) {
    const msg = (err as Error).message;
    await prisma.automationRun.update({
      where: { id: run.id },
      data: { status: "error", message: msg },
    });
    await prisma.automation.update({
      where: { id: automationId },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: "error",
        lastRunMessage: msg,
      },
    });
    return { success: false, error: `Generation failed: ${msg}` };
  }
}
