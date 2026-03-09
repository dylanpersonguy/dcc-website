import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await openai.chat.completions.create(
      {
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      },
      { signal: controller.signal }
    );
    return res.choices[0]?.message?.content?.trim() || "";
  } finally {
    clearTimeout(timeout);
  }
}

/* ─── Outline Generator ─── */

export async function generateOutline(
  title: string,
  primaryKeyword: string,
  audienceLevel: string
): Promise<string> {
  return callOpenAI(
    `You are an expert SEO content strategist for a blockchain/DeFi technology blog. Create SEO-optimized content outlines.`,
    `Create a detailed markdown outline for an article titled "${title}".
Primary keyword: "${primaryKeyword}"
Audience level: ${audienceLevel}

Requirements:
- 4-6 H2 sections with H3 subsections
- Key points for each section
- Include a CTA section at the end
- Suggest word counts per section (total 1500-2500 words)
- Natural keyword placement opportunities
- Include an FAQ section with 3-5 questions

Return only the markdown outline.`,
    2048
  );
}

/* ─── Article Generator ─── */

export async function generateArticle(
  outline: string,
  primaryKeyword: string,
  secondaryKeywords: string[]
): Promise<string> {
  return callOpenAI(
    `You are an expert blockchain/DeFi content writer. Write comprehensive, SEO-optimized articles in markdown format. Use a professional but approachable tone for an AI/automation-savvy audience.`,
    `Write a complete 1500-2500 word markdown article based on this outline:

${outline}

Primary keyword: "${primaryKeyword}" (use naturally 5-8 times)
Secondary keywords: ${secondaryKeywords.join(", ")}

Requirements:
- Write in markdown with proper H2/H3 headings
- Natural keyword placement throughout
- Professional but approachable tone
- Include actionable insights and specific examples
- End with a clear CTA
- No fluff — every paragraph should add value

Return only the markdown article.`,
    4096
  );
}

/* ─── AI SEO Analysis ─── */

export async function analyzeSEO(blogData: {
  title: string;
  content: string;
  primaryKeyword: string;
  seoTitle?: string;
  seoDescription?: string;
  excerpt?: string;
  wordCount: number;
}): Promise<string> {
  return callOpenAI(
    `You are an SEO expert specializing in tech/blockchain content. Analyze blog posts and provide actionable SEO recommendations. Return valid JSON only.`,
    `Analyze this blog post for SEO:

Title: ${blogData.title}
SEO Title: ${blogData.seoTitle || "Not set"}
Meta Description: ${blogData.seoDescription || "Not set"}
Primary Keyword: ${blogData.primaryKeyword}
Word Count: ${blogData.wordCount}
Excerpt: ${blogData.excerpt || "Not set"}

Content (first 2000 chars):
${blogData.content.slice(0, 2000)}

Return JSON with this structure:
{
  "score": 0-100,
  "titleAnalysis": "...",
  "descriptionAnalysis": "...",
  "keywordUsage": "...",
  "contentStructure": "...",
  "suggestedSeoTitle": "max 60 chars",
  "suggestedMetaDescription": "max 155 chars",
  "improvements": ["..."],
  "strengths": ["..."]
}`,
    2048
  );
}

/* ─── Internal Link Suggestions ─── */

export async function suggestInternalLinks(
  postTitle: string,
  postContent: string,
  otherPosts: { id: string; title: string; slug: string; excerpt: string | null; primaryKeyword: string | null }[]
): Promise<string> {
  const postList = otherPosts
    .map((p) => `- ID: ${p.id} | Title: ${p.title} | Keyword: ${p.primaryKeyword || "none"}`)
    .join("\n");

  return callOpenAI(
    `You are an internal linking strategist for a blockchain technology blog. Suggest relevant internal links. Return valid JSON only.`,
    `Suggest 3-8 internal link connections for this blog post:

Current Post: "${postTitle}"
Content (first 1500 chars): ${postContent.slice(0, 1500)}

Available posts to link to:
${postList}

Return JSON array:
[{
  "targetPostId": "id from list",
  "targetPostTitle": "title",
  "anchorText": "suggested anchor text",
  "placement": "intro" | "mid" | "conclusion",
  "relevanceScore": 0-100,
  "reason": "why this link is relevant"
}]`,
    2048
  );
}

/* ─── Content Fix ─── */

export async function fixContent(
  content: string,
  fixType: "readability" | "grammar" | "seo" | "tone" | "structure"
): Promise<string> {
  const instructions: Record<string, string> = {
    readability:
      "Improve readability: use shorter sentences, simpler vocabulary, break up long paragraphs. Target a Flesch score of 60+.",
    grammar: "Fix all grammar, spelling, and punctuation errors. Maintain the same style and tone.",
    seo: "Optimize for SEO: improve keyword placement, add transition words, enhance heading hierarchy, ensure proper keyword density.",
    tone: "Adjust tone to be professional but approachable — suitable for a tech-savvy blockchain audience. Remove overly casual or overly formal language.",
    structure:
      "Improve content structure: better heading hierarchy, logical flow, clear paragraphs, proper use of lists and formatting.",
  };

  return callOpenAI(
    `You are a professional content editor specializing in blockchain/DeFi articles. Apply the requested fix type and return only the improved markdown.`,
    `${instructions[fixType]}

Content to fix:
${content}

Return only the improved markdown. Do not add any commentary.`,
    4096
  );
}

/* ─── Competitor Gap Analysis ─── */

export async function analyzeCompetitorGaps(
  title: string,
  primaryKeyword: string,
  competitorUrls: string[]
): Promise<string> {
  return callOpenAI(
    `You are a competitive content analyst. Analyze content gaps and opportunities. Return valid JSON.`,
    `Analyze content gaps for our blog post:
Title: "${title}"
Primary Keyword: "${primaryKeyword}"
Competitor URLs to consider: ${competitorUrls.join(", ")}

Based on common knowledge about what top-ranking content covers for this keyword, provide a gap analysis as JSON:
{
  "topicsWeShoudCover": ["..."],
  "uniqueAngles": ["..."],
  "missingKeywords": ["..."],
  "contentFormatSuggestions": ["..."],
  "estimatedWordCount": number,
  "difficulty": "low" | "medium" | "high",
  "summary": "..."
}`,
    2048
  );
}
