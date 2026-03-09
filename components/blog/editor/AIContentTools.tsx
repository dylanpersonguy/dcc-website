"use client";

import { useState } from "react";
import { BookOpen, Wand2, Zap, Search, Wrench } from "lucide-react";
import {
  generateOutlineAction,
  generateArticleAction,
  fixContentAction,
  analyzeSEOAction,
} from "@/lib/actions/blog";

interface AIContentToolsProps {
  postId?: string;
  title: string;
  primaryKeyword: string;
  audienceLevel: string;
  secondaryKeywords: string[];
  onContentChange: (content: string) => void;
  onContentAppend: (content: string) => void;
}

export function AIContentTools({
  postId,
  title,
  primaryKeyword,
  audienceLevel,
  secondaryKeywords,
  onContentChange,
  onContentAppend,
}: AIContentToolsProps) {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [outline, setOutline] = useState("");
  const [article, setArticle] = useState("");
  const [fixPreview, setFixPreview] = useState("");
  const [seoAnalysis, setSeoAnalysis] = useState("");

  const toggle = (panel: string) =>
    setActivePanel((prev) => (prev === panel ? null : panel));

  async function handleGenerateOutline() {
    if (!title || !primaryKeyword) return;
    setLoading(true);
    try {
      const res = await generateOutlineAction(title, primaryKeyword, audienceLevel);
      if (res.success) setOutline(res.outline);
    } catch (e) {
      setOutline(`Error: ${e instanceof Error ? e.message : "Failed"}`);
    }
    setLoading(false);
  }

  async function handleGenerateArticle() {
    if (!outline) return;
    setLoading(true);
    try {
      const res = await generateArticleAction(outline, primaryKeyword, secondaryKeywords);
      if (res.success) setArticle(res.article);
    } catch (e) {
      setArticle(`Error: ${e instanceof Error ? e.message : "Failed"}`);
    }
    setLoading(false);
  }

  async function handleFix(type: "readability" | "grammar" | "seo" | "tone" | "structure") {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await fixContentAction(postId, type);
      if (res.success) setFixPreview(res.content);
    } catch (e) {
      setFixPreview(`Error: ${e instanceof Error ? e.message : "Failed"}`);
    }
    setLoading(false);
  }

  async function handleSeoAnalysis() {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await analyzeSEOAction(postId);
      if (res.success) setSeoAnalysis(res.analysis);
    } catch (e) {
      setSeoAnalysis(`Error: ${e instanceof Error ? e.message : "Failed"}`);
    }
    setLoading(false);
  }

  const panelBtn =
    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors";
  const activeBtn = "bg-primary/20 text-primary";
  const inactiveBtn = "bg-white/[0.04] text-foreground/60 hover:bg-white/[0.08]";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${panelBtn} ${activePanel === "outline" ? activeBtn : inactiveBtn}`} onClick={() => toggle("outline")}>
          <BookOpen className="w-4 h-4" /> Outline
        </button>
        <button type="button" className={`${panelBtn} ${activePanel === "article" ? activeBtn : inactiveBtn}`} onClick={() => toggle("article")}>
          <Wand2 className="w-4 h-4" /> Article
        </button>
        <button type="button" className={`${panelBtn} ${activePanel === "fix" ? activeBtn : inactiveBtn}`} onClick={() => toggle("fix")}>
          <Wrench className="w-4 h-4" /> Auto-Fix
        </button>
        <button type="button" className={`${panelBtn} ${activePanel === "seoai" ? activeBtn : inactiveBtn}`} onClick={() => toggle("seoai")}>
          <Search className="w-4 h-4" /> AI SEO
        </button>
      </div>

      {/* Outline Generator */}
      {activePanel === "outline" && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">AI Outline Generator</p>
            <button
              type="button"
              onClick={handleGenerateOutline}
              disabled={loading || !title}
              className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs hover:bg-primary/30 disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Outline"}
            </button>
          </div>
          {outline && (
            <>
              <pre className="text-xs text-foreground/70 bg-white/[0.03] p-3 rounded-lg overflow-auto max-h-64 whitespace-pre-wrap">
                {outline}
              </pre>
              <button
                type="button"
                onClick={() => onContentChange(outline)}
                className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30"
              >
                Use This Outline
              </button>
            </>
          )}
        </div>
      )}

      {/* Article Generator */}
      {activePanel === "article" && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">AI Article Generator</p>
            <button
              type="button"
              onClick={handleGenerateArticle}
              disabled={loading || !outline}
              className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs hover:bg-primary/30 disabled:opacity-50"
            >
              {loading ? "Writing..." : "Generate Article"}
            </button>
          </div>
          {!outline && (
            <p className="text-xs text-foreground/50">Generate an outline first to use as a base.</p>
          )}
          {article && (
            <>
              <pre className="text-xs text-foreground/70 bg-white/[0.03] p-3 rounded-lg overflow-auto max-h-80 whitespace-pre-wrap">
                {article}
              </pre>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onContentChange(article)}
                  className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30"
                >
                  Use This Article
                </button>
                <button
                  type="button"
                  onClick={() => onContentAppend(article)}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30"
                >
                  Append to Content
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Auto Fix */}
      {activePanel === "fix" && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
          <p className="text-sm font-medium text-foreground">LLM Auto-Fix</p>
          <div className="flex flex-wrap gap-2">
            {(["readability", "grammar", "seo", "tone", "structure"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleFix(t)}
                disabled={loading || !postId}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-foreground/70 text-xs hover:bg-white/[0.1] disabled:opacity-50 capitalize"
              >
                {loading ? <Zap className="w-3 h-3 animate-spin inline" /> : null} {t}
              </button>
            ))}
          </div>
          {fixPreview && (
            <>
              <pre className="text-xs text-foreground/70 bg-white/[0.03] p-3 rounded-lg overflow-auto max-h-80 whitespace-pre-wrap">
                {fixPreview}
              </pre>
              <button
                type="button"
                onClick={() => { onContentChange(fixPreview); setFixPreview(""); }}
                className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30"
              >
                Apply Changes
              </button>
            </>
          )}
        </div>
      )}

      {/* AI SEO */}
      {activePanel === "seoai" && (
        <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">AI SEO Analysis</p>
            <button
              type="button"
              onClick={handleSeoAnalysis}
              disabled={loading || !postId}
              className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs hover:bg-primary/30 disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Run Analysis"}
            </button>
          </div>
          {seoAnalysis && (
            <pre className="text-xs text-foreground/70 bg-white/[0.03] p-3 rounded-lg overflow-auto max-h-80 whitespace-pre-wrap">
              {seoAnalysis}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
