"use client";

import { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  Link2,
  Image as ImageIcon,
  Minus,
  Eye,
  Edit3,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const TOOLBAR_ACTIONS = [
  { icon: Bold, label: "Bold", prefix: "**", suffix: "**" },
  { icon: Italic, label: "Italic", prefix: "*", suffix: "*" },
  { icon: Heading2, label: "H2", prefix: "\n## ", suffix: "\n" },
  { icon: Heading3, label: "H3", prefix: "\n### ", suffix: "\n" },
  { icon: List, label: "Bullet List", prefix: "\n- ", suffix: "\n" },
  { icon: ListOrdered, label: "Numbered List", prefix: "\n1. ", suffix: "\n" },
  { icon: Quote, label: "Blockquote", prefix: "\n> ", suffix: "\n" },
  { icon: Code2, label: "Code Block", prefix: "\n```\n", suffix: "\n```\n" },
  { icon: Link2, label: "Link", prefix: "[", suffix: "](url)" },
  { icon: ImageIcon, label: "Image", prefix: "![alt](", suffix: ")" },
  { icon: Minus, label: "Horizontal Rule", prefix: "\n---\n", suffix: "" },
] as const;

function simpleMarkdownToHtml(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");
  // HR
  html = html.replace(/^---$/gm, "<hr />");
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" class="rounded-lg max-w-full"/>');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline">$1</a>');
  // Paragraphs
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("<h") || trimmed.startsWith("<pre") || trimmed.startsWith("<blockquote") || trimmed.startsWith("<hr") || trimmed.startsWith("<ul") || trimmed.startsWith("<ol")) return trimmed;
      return `<p>${trimmed}</p>`;
    })
    .join("\n");

  return html;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertMarkdown(prefix: string, suffix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const newText = `${value.slice(0, start)}${prefix}${selected || "text"}${suffix}${value.slice(end)}`;
    onChange(newText);
    requestAnimationFrame(() => {
      ta.focus();
      const cursorPos = start + prefix.length + (selected || "text").length;
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-white/[0.06] bg-white/[0.02] flex-wrap">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => insertMarkdown(action.prefix, action.suffix)}
            className="p-1.5 rounded hover:bg-white/[0.08] text-foreground/60 hover:text-foreground transition-colors"
            title={action.label}
          >
            <action.icon className="w-4 h-4" />
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setMode(mode === "write" ? "preview" : "write")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-white/[0.06] hover:bg-white/[0.1] text-foreground/70 transition-colors"
        >
          {mode === "write" ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
          {mode === "write" ? "Preview" : "Edit"}
        </button>
      </div>

      {/* Content */}
      {mode === "write" ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[500px] p-4 bg-transparent text-foreground font-mono text-sm resize-y focus:outline-none"
          placeholder="Write your blog post in Markdown..."
        />
      ) : (
        <div
          className="prose prose-invert max-w-none p-4 min-h-[500px] text-foreground/90"
          dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(value) }}
        />
      )}
    </div>
  );
}
