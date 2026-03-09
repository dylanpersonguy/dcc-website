import type { SEOScoreResult } from "./blog-types";

/* Minimal BlogPost shape needed for SEO scoring (avoids server-only Prisma import) */
interface BlogPostForSEO {
  title?: string | null;
  content?: string | null;
  excerpt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  primaryKeyword?: string | null;
}

/* ─── Pure Helpers ─── */

export function calculateReadingTime(content: string): number {
  return Math.max(1, Math.round(countWords(content) / 200));
}

export function countWords(content: string): number {
  return content
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/* ─── SEO Score ─── */

export function calculateSEOScore(post: BlogPostForSEO): SEOScoreResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const content = post.content || "";
  const title = post.seoTitle || post.title || "";
  const description = post.seoDescription || "";
  const keyword = (post.primaryKeyword || "").toLowerCase();
  const words = countWords(content);

  // Title score
  let titleScore = 0;
  if (title.length > 0) {
    titleScore = title.length <= 60 ? 100 : 60;
    if (keyword && title.toLowerCase().includes(keyword)) titleScore = Math.min(100, titleScore + 20);
    else if (keyword) { issues.push("Primary keyword missing from title"); titleScore = Math.max(0, titleScore - 20); }
  } else {
    issues.push("SEO title is missing");
  }

  // Description score
  let descriptionScore = 0;
  if (description.length > 0) {
    if (description.length >= 120 && description.length <= 155) descriptionScore = 100;
    else if (description.length > 155) { descriptionScore = 50; issues.push("Meta description too long (>155 chars)"); }
    else { descriptionScore = 60; suggestions.push("Meta description could be longer (120-155 chars ideal)"); }
  } else {
    issues.push("Meta description is missing");
  }

  // Keyword density
  let keywordDensityScore = 0;
  if (keyword && words > 0) {
    const lowerContent = content.toLowerCase();
    const keywordCount = lowerContent.split(keyword).length - 1;
    const density = (keywordCount / words) * 100;
    if (density >= 0.5 && density <= 2.5) keywordDensityScore = 100;
    else if (density > 2.5) { keywordDensityScore = 40; issues.push("Keyword stuffing detected (>2.5% density)"); }
    else { keywordDensityScore = 50; suggestions.push("Increase keyword usage (aim for 0.5-2.5% density)"); }
  }

  // Readability (avg sentence length)
  let readabilityScore = 0;
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 0) {
    const avgLen = words / sentences.length;
    if (avgLen >= 10 && avgLen <= 20) readabilityScore = 100;
    else if (avgLen < 10) { readabilityScore = 70; suggestions.push("Sentences may be too short"); }
    else { readabilityScore = 60; issues.push("Sentences are too long (avg >20 words)"); }
  }

  // Internal links
  let internalLinksScore = 0;
  const mdLinks = (content.match(/\[([^\]]+)\]\(\/[^)]+\)/g) || []).length;
  const htmlLinks = (content.match(/<a\s[^>]*href=["']\/[^"']*["']/gi) || []).length;
  const linkCount = mdLinks + htmlLinks;
  if (linkCount >= 3) internalLinksScore = 100;
  else if (linkCount >= 1) { internalLinksScore = 60; suggestions.push("Add more internal links (3+ recommended)"); }
  else { internalLinksScore = 0; issues.push("No internal links found"); }

  // Heading structure
  let headingScore = 0;
  const h2Count = (content.match(/^##\s/gm) || []).length;
  const h3Count = (content.match(/^###\s/gm) || []).length;
  if (h2Count >= 2 && h3Count >= 1) headingScore = 100;
  else {
    if (h2Count < 2) suggestions.push("Add at least 2 H2 headings");
    if (h3Count < 1) suggestions.push("Add at least 1 H3 heading");
    headingScore = Math.min(100, h2Count * 30 + h3Count * 20);
  }

  // Word count checks
  if (words < 300) issues.push("Content too thin (<300 words)");
  else if (words < 800) suggestions.push("Content may be short for ranking (<800 words)");

  if (!post.excerpt) suggestions.push("Add an excerpt for better social sharing");

  const scores = [titleScore, descriptionScore, keywordDensityScore, readabilityScore, internalLinksScore, headingScore];
  const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  return {
    overall,
    titleScore,
    descriptionScore,
    keywordDensity: keywordDensityScore,
    readability: readabilityScore,
    internalLinks: internalLinksScore,
    headingStructure: headingScore,
    issues,
    suggestions,
  };
}

/* ─── Readability Analysis ─── */

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

export function analyzeReadability(content: string) {
  const sentences = content
    .replace(/[#*_`>\-|]/g, "")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const words = content.split(/\s+/).filter((w) => w.length > 0);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const totalWords = words.length || 1;
  const totalSentences = sentences.length || 1;

  const avgSentenceLength = totalWords / totalSentences;
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / totalWords;
  const avgSyllablesPerWord = totalSyllables / totalWords;

  // Flesch Reading Ease
  const flesch = Math.round(
    206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord
  );
  const score = Math.max(0, Math.min(100, flesch));

  // Grade level
  let gradeLevel = "College Graduate";
  if (score >= 90) gradeLevel = "5th Grade";
  else if (score >= 80) gradeLevel = "6th Grade";
  else if (score >= 70) gradeLevel = "7th Grade";
  else if (score >= 60) gradeLevel = "8th-9th Grade";
  else if (score >= 50) gradeLevel = "10th-12th Grade";
  else if (score >= 30) gradeLevel = "College";

  // Passive voice (heuristic)
  const passiveRegex = /\b(was|were|is|are|been|being|be)\s+\w+ed\b/gi;
  const passiveCount = (content.match(passiveRegex) || []).length;

  const suggestions: string[] = [];
  if (avgSentenceLength > 25) suggestions.push("Shorten sentences — aim for 15-20 words average");
  if (score < 50) suggestions.push("Simplify vocabulary and sentence structure");
  if (passiveCount > 5) suggestions.push("Reduce passive voice usage");
  if (avgWordLength > 5.5) suggestions.push("Use simpler, shorter words where possible");

  return {
    score,
    gradeLevel,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
    passiveVoiceCount: passiveCount,
    suggestions,
  };
}

/* ─── Internal Link Audit (server-only — imported from actions/blog.ts) ─── */
// Moved to lib/actions/blog.ts to avoid bundling Prisma in client components
