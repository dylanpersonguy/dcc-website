"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Eye, ChevronDown } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { SEOEditor, SocialPreviewCards } from "./SEOEditor";
import { AIContentTools } from "./AIContentTools";
import { ReadabilityAnalysis } from "./ReadabilityAnalysis";
import { InternalLinkManager, InternalLinkEngine } from "./InternalLinkManager";
import { CompetitorIntelligence } from "./CompetitorIntelligence";
import { createBlogPost, updateBlogPost } from "@/lib/actions/blog";
import { countWords, calculateReadingTime } from "@/lib/blog-utils";
import {
  BLOG_CATEGORY_LABELS,
  BLOG_AUDIENCE_LABELS,
  BLOG_SEARCH_INTENT_LABELS,
  BLOG_CONTENT_TYPE_LABELS,
} from "@/lib/blog-constants";

interface PillarPost {
  id: string;
  title: string;
}

interface BlogPostEditorProps {
  post?: {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string | null;
    featuredImage: string | null;
    authorName: string;
    status: string;
    contentType: string;
    pillarPageId: string | null;
    topicClusterId: string | null;
    blogCategory: string;
    primaryKeyword: string | null;
    secondaryKeywords: string[];
    keywordEntities: string[];
    searchIntent: string;
    audienceLevel: string;
    seoTitle: string | null;
    seoDescription: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    canonicalUrl: string | null;
    noindex: boolean;
    serpCountry: string;
    serpLanguage: string;
    competitorUrls: string[];
    orphanStatus: string;
    internalLinkScore: number;
    inboundLinkCount: number;
    outboundLinkCount: number;
    lastInternalLinkAudit: Date | string | null;
    competitorGapReport: unknown;
    competitorSnapshotDate: Date | string | null;
    outgoingLinkRules: {
      id: string;
      anchorText: string;
      placementHint: string;
      relevanceScore: number;
      status: string;
      toPost: { id: string; title: string; slug: string };
    }[];
    [key: string]: unknown;
  };
  pillarPosts?: PillarPost[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function BlogPostEditor({ post, pillarPosts = [] }: BlogPostEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  // Basic fields
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [content, setContent] = useState(post?.content || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage || "");
  const [authorName, setAuthorName] = useState(post?.authorName || "DecentralChain Editorial");
  const [status, setStatus] = useState(post?.status || "DRAFT");

  // Content strategy
  const [contentType, setContentType] = useState(post?.contentType || "SUPPORTING");
  const [pillarPageId, setPillarPageId] = useState(post?.pillarPageId || "");
  const [topicClusterId, setTopicClusterId] = useState(post?.topicClusterId || "");
  const [blogCategory, setBlogCategory] = useState(post?.blogCategory || "AI_AGENTS");

  // SEO
  const [primaryKeyword, setPrimaryKeyword] = useState(post?.primaryKeyword || "");
  const [secondaryKeywords, setSecondaryKeywords] = useState(post?.secondaryKeywords?.join(", ") || "");
  const [keywordEntities, setKeywordEntities] = useState(post?.keywordEntities?.join(", ") || "");
  const [searchIntent, setSearchIntent] = useState(post?.searchIntent || "INFORMATIONAL");
  const [audienceLevel, setAudienceLevel] = useState(post?.audienceLevel || "INTERMEDIATE");
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription || "");
  const [ogTitle, setOgTitle] = useState(post?.ogTitle || "");
  const [ogDescription, setOgDescription] = useState(post?.ogDescription || "");
  const [canonicalUrl, setCanonicalUrl] = useState(post?.canonicalUrl || "");
  const [noindex, setNoindex] = useState(post?.noindex || false);

  // SERP / Competitor
  const [serpCountry, setSerpCountry] = useState(post?.serpCountry || "US");
  const [serpLanguage, setSerpLanguage] = useState(post?.serpLanguage || "en");
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(post?.competitorUrls || []);

  // Auto-slug from title
  useEffect(() => {
    if (!post) setSlug(slugify(title));
  }, [title, post]);

  // Calculated
  const wordCount = countWords(content);
  const readingTime = calculateReadingTime(content);

  async function handleSave(publishStatus: string) {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("slug", slug);
      fd.set("content", content);
      fd.set("excerpt", excerpt);
      fd.set("featuredImage", featuredImage);
      fd.set("authorName", authorName);
      fd.set("status", publishStatus);
      fd.set("contentType", contentType);
      fd.set("pillarPageId", pillarPageId);
      fd.set("topicClusterId", topicClusterId);
      fd.set("blogCategory", blogCategory);
      fd.set("primaryKeyword", primaryKeyword);
      fd.set("secondaryKeywords", secondaryKeywords);
      fd.set("keywordEntities", keywordEntities);
      fd.set("searchIntent", searchIntent);
      fd.set("audienceLevel", audienceLevel);
      fd.set("seoTitle", seoTitle);
      fd.set("seoDescription", seoDescription);
      fd.set("ogTitle", ogTitle);
      fd.set("ogDescription", ogDescription);
      fd.set("canonicalUrl", canonicalUrl);
      fd.set("noindex", noindex.toString());
      fd.set("serpCountry", serpCountry);
      fd.set("serpLanguage", serpLanguage);
      fd.set("competitorUrls", competitorUrls.join("\n"));

      if (post) {
        await updateBlogPost(post.id, fd);
      } else {
        const result = await createBlogPost(fd);
        if (result.success && result.id) {
          router.push(`/admin/blog/${result.id}/edit`);
        }
      }
    } catch (e) {
      console.error("Save failed:", e);
    }
    setSaving(false);
  }

  const tabs = [
    { id: "content", label: "Content" },
    { id: "seo", label: "SEO" },
    { id: "ai", label: "AI Tools" },
    { id: "linking", label: "Linking" },
  ];

  const inputClass = "w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-foreground text-sm focus:outline-none focus:border-primary/50";
  const labelClass = "text-sm font-medium text-foreground/80 block mb-1";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {post ? "Edit Post" : "New Post"}
          </h1>
          <p className="text-xs text-foreground/50">
            {wordCount} words · {readingTime} min read
          </p>
        </div>
        <div className="flex gap-2">
          {post && (
            <a
              href={`/blog/${slug}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] text-foreground/70 text-sm hover:bg-white/[0.1]"
            >
              <Eye className="w-4 h-4" /> Preview
            </a>
          )}
          <button
            onClick={() => handleSave("DRAFT")}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.06] text-foreground text-sm hover:bg-white/[0.1] disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button
            onClick={() => handleSave("PUBLISHED")}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/80 disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-foreground/50 hover:text-foreground/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Tab */}
      {activeTab === "content" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Title */}
            <div>
              <label className={labelClass}>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`${inputClass} text-lg font-medium`}
                placeholder="Article title..."
              />
            </div>

            {/* Slug */}
            <div>
              <label className={labelClass}>Slug</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground/40">/blog/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className={inputClass}
                  placeholder="url-slug"
                />
              </div>
            </div>

            {/* Content Editor */}
            <div>
              <label className={labelClass}>Content</label>
              <RichTextEditor value={content} onChange={setContent} />
            </div>

            {/* Excerpt */}
            <div>
              <label className={labelClass}>Excerpt</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Brief summary for cards and social sharing..."
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status */}
            <div>
              <label className={labelClass}>Status</label>
              <div className="relative">
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className={labelClass}>Category</label>
              <div className="relative">
                <select value={blogCategory} onChange={(e) => setBlogCategory(e.target.value)} className={selectClass}>
                  {Object.entries(BLOG_CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
              </div>
            </div>

            {/* Content Type */}
            <div>
              <label className={labelClass}>Content Type</label>
              <div className="relative">
                <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={selectClass}>
                  {Object.entries(BLOG_CONTENT_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
              </div>
            </div>

            {/* Pillar Page */}
            {contentType === "SUPPORTING" && pillarPosts.length > 0 && (
              <div>
                <label className={labelClass}>Pillar Page</label>
                <div className="relative">
                  <select value={pillarPageId} onChange={(e) => setPillarPageId(e.target.value)} className={selectClass}>
                    <option value="">None</option>
                    {pillarPosts.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Topic Cluster */}
            <div>
              <label className={labelClass}>Topic Cluster ID</label>
              <input type="text" value={topicClusterId} onChange={(e) => setTopicClusterId(e.target.value)} className={inputClass} placeholder="e.g. ai-trading-bots" />
            </div>

            {/* Featured Image */}
            <div>
              <label className={labelClass}>Featured Image URL</label>
              <input type="text" value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} className={inputClass} placeholder="https://..." />
              {featuredImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featuredImage} alt="Preview" className="mt-2 rounded-lg w-full h-32 object-cover" />
              )}
            </div>

            {/* Author */}
            <div>
              <label className={labelClass}>Author</label>
              <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} className={inputClass} />
            </div>

            {/* Keyword Fields */}
            <div>
              <label className={labelClass}>Primary Keyword</label>
              <input type="text" value={primaryKeyword} onChange={(e) => setPrimaryKeyword(e.target.value)} className={inputClass} placeholder="main target keyword" />
            </div>
            <div>
              <label className={labelClass}>Secondary Keywords</label>
              <input type="text" value={secondaryKeywords} onChange={(e) => setSecondaryKeywords(e.target.value)} className={inputClass} placeholder="keyword1, keyword2, ..." />
            </div>
            <div>
              <label className={labelClass}>Key Entities</label>
              <input type="text" value={keywordEntities} onChange={(e) => setKeywordEntities(e.target.value)} className={inputClass} placeholder="entity1, entity2, ..." />
            </div>

            {/* Intent & Audience */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Search Intent</label>
                <div className="relative">
                  <select value={searchIntent} onChange={(e) => setSearchIntent(e.target.value)} className={selectClass}>
                    {Object.entries(BLOG_SEARCH_INTENT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Audience</label>
                <div className="relative">
                  <select value={audienceLevel} onChange={(e) => setAudienceLevel(e.target.value)} className={selectClass}>
                    {Object.entries(BLOG_AUDIENCE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* SERP Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Country</label>
                <input type="text" value={serpCountry} onChange={(e) => setSerpCountry(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Language</label>
                <input type="text" value={serpLanguage} onChange={(e) => setSerpLanguage(e.target.value)} className={inputClass} />
              </div>
            </div>

            {/* Readability */}
            <ReadabilityAnalysis content={content} />
          </div>
        </div>
      )}

      {/* SEO Tab */}
      {activeTab === "seo" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SEOEditor
            seoTitle={seoTitle}
            seoDescription={seoDescription}
            slug={slug}
            primaryKeyword={primaryKeyword}
            excerpt={excerpt}
            content={content}
            noindex={noindex}
            onSeoTitleChange={setSeoTitle}
            onSeoDescriptionChange={setSeoDescription}
            onNoindexChange={setNoindex}
          />
          <div className="space-y-6">
            {/* OG Fields */}
            <div>
              <label className={labelClass}>OG Title</label>
              <input type="text" value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} className={inputClass} placeholder="Open Graph title (defaults to SEO title)" />
            </div>
            <div>
              <label className={labelClass}>OG Description</label>
              <textarea value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="Open Graph description" />
            </div>
            <div>
              <label className={labelClass}>Canonical URL</label>
              <input type="text" value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} className={inputClass} placeholder="Leave empty for auto-canonical" />
            </div>

            {/* Social Previews */}
            <SocialPreviewCards
              title={ogTitle || seoTitle || title}
              description={ogDescription || seoDescription || excerpt}
              image={featuredImage || undefined}
            />
          </div>
        </div>
      )}

      {/* AI Tools Tab */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          <AIContentTools
            postId={post?.id}
            title={title}
            primaryKeyword={primaryKeyword}
            audienceLevel={audienceLevel}
            secondaryKeywords={secondaryKeywords.split(",").map((k) => k.trim()).filter(Boolean)}
            onContentChange={setContent}
            onContentAppend={(text) => setContent((prev) => prev + "\n\n" + text)}
          />
          <CompetitorIntelligence
            postId={post?.id}
            competitorUrls={competitorUrls}
            existingReport={typeof post?.competitorGapReport === 'string' ? post.competitorGapReport : null}
            snapshotDate={post?.competitorSnapshotDate ? String(post.competitorSnapshotDate) : null}
            onUrlsChange={setCompetitorUrls}
          />
        </div>
      )}

      {/* Linking Tab */}
      {activeTab === "linking" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {post ? (
              <InternalLinkManager
                postId={post.id}
                rules={post.outgoingLinkRules || []}
              />
            ) : (
              <p className="text-sm text-foreground/50">Save the post first to manage internal links.</p>
            )}
          </div>
          <div>
            {post && (
              <InternalLinkEngine
                orphanStatus={post.orphanStatus}
                linkScore={post.internalLinkScore}
                inboundCount={post.inboundLinkCount}
                outboundCount={post.outboundLinkCount}
                lastAudit={post.lastInternalLinkAudit ? String(post.lastInternalLinkAudit) : null}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
