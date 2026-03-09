/* ─── Server-Side Markdown to HTML Renderer ───
 * Secure: XSS prevention, blocks javascript:/data:/vbscript: URIs,
 * nofollow on external links, entity escaping.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:")
  ) {
    return false;
  }
  return true;
}

function isInternalUrl(url: string): boolean {
  return url.startsWith("/") || url.startsWith("#");
}

function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  );
}

export function renderMarkdown(markdown: string): string {
  const escaped = escapeHtml(markdown);
  let html = escaped;

  // Preserve inline SVG blocks (restore < and > within <svg> tags)
  html = html.replace(
    /&lt;svg[\s\S]*?&lt;\/svg&gt;/gi,
    (match) => match.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'")
  );

  // Code blocks
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_, lang, code) =>
      `<pre class="bg-white/[0.04] rounded-xl p-4 overflow-x-auto text-sm my-4"><code class="language-${lang || "text"}">${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="px-1.5 py-0.5 rounded bg-white/[0.06] text-primary text-sm">$1</code>'
  );

  // Headings with IDs for TOC anchoring
  html = html.replace(/^### (.+)$/gm, (_, text) => {
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `<h3 id="${id}" class="text-lg font-semibold text-foreground mt-8 mb-3">${text}</h3>`;
  });
  html = html.replace(/^## (.+)$/gm, (_, text) => {
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `<h2 id="${id}" class="text-xl font-bold text-foreground mt-10 mb-4">${text}</h2>`;
  });
  html = html.replace(/^# (.+)$/gm, (_, text) => {
    return `<h1 class="text-2xl font-bold text-foreground mt-10 mb-4">${text}</h1>`;
  });

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Images (sanitized)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    if (!isSafeImageUrl(src)) return escapeHtml(alt);
    return `<img src="${src}" alt="${alt}" class="rounded-xl max-w-full my-4" loading="lazy" />`;
  });

  // Links (internal vs external)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
    if (!isSafeUrl(href)) return text; // block unsafe URIs
    if (isInternalUrl(href)) {
      return `<a href="${href}" class="text-primary hover:underline">${text}</a>`;
    }
    return `<a href="${href}" rel="nofollow noopener" target="_blank" class="text-primary hover:underline">${text}</a>`;
  });

  // HTML anchor tags (from existing content)
  html = html.replace(
    /&lt;a\s+href=&quot;([^&]+)&quot;([^&]*)&gt;([\s\S]*?)&lt;\/a&gt;/gi,
    (_, href, attrs, text) => {
      const decodedHref = href;
      if (!isSafeUrl(decodedHref)) return text;
      if (isInternalUrl(decodedHref)) {
        return `<a href="${decodedHref}" class="text-primary hover:underline">${text}</a>`;
      }
      return `<a href="${decodedHref}" rel="nofollow noopener" target="_blank" class="text-primary hover:underline">${text}</a>`;
    }
  );

  // Blockquotes
  html = html.replace(
    /^&gt; (.+)$/gm,
    '<blockquote class="border-l-4 border-primary/30 pl-4 my-4 text-foreground/70 italic">$1</blockquote>'
  );

  // Unordered lists
  html = html.replace(
    /^[\-\*] (.+)$/gm,
    '<li class="text-foreground/80">$1</li>'
  );
  html = html.replace(
    /(<li class="text-foreground\/80">[\s\S]*?<\/li>\n?)+/g,
    '<ul class="list-disc list-inside space-y-1 my-4">$&</ul>'
  );

  // Ordered lists
  html = html.replace(
    /^\d+\. (.+)$/gm,
    '<li class="text-foreground/80">$1</li>'
  );

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="border-white/[0.06] my-8" />');

  // Tables
  html = html.replace(
    /(\|.+\|\n)+/g,
    (tableBlock) => {
      const rows = tableBlock.trim().split("\n");
      if (rows.length < 2) return tableBlock;

      let tableHtml = '<div class="overflow-x-auto my-4"><table class="w-full text-sm border-collapse">';

      rows.forEach((row, i) => {
        // Skip separator row
        if (/^\|[\s\-:]+\|$/.test(row.trim())) return;

        const cells = row
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());

        const tag = i === 0 ? "th" : "td";
        const cellClass =
          i === 0
            ? "px-3 py-2 text-left font-medium text-foreground/80 bg-white/[0.04] border-b border-white/[0.06]"
            : "px-3 py-2 text-foreground/60 border-b border-white/[0.04]";

        tableHtml += `<tr>${cells.map((c) => `<${tag} class="${cellClass}">${c}</${tag}>`).join("")}</tr>`;
      });

      tableHtml += "</table></div>";
      return tableHtml;
    }
  );

  // Paragraphs — wrap remaining text blocks
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<li") ||
        trimmed.startsWith("<div") ||
        trimmed.startsWith("<table") ||
        trimmed.startsWith("<svg") ||
        trimmed.startsWith("<img")
      ) {
        return trimmed;
      }
      return `<p class="text-foreground/80 leading-relaxed my-3">${trimmed}</p>`;
    })
    .join("\n");

  return html;
}

/* ─── FAQ Extractor ─── */

export function extractFAQs(content: string): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];
  const faqSection = content.match(/## FAQ[\s\S]*$/im);
  if (!faqSection) return faqs;

  const faqContent = faqSection[0];
  const qaPairs = faqContent.match(/\*\*Q:\s*(.+?)\*\*\s*([\s\S]*?)(?=\*\*Q:|$)/gi);
  if (!qaPairs) return faqs;

  for (const qa of qaPairs) {
    const qMatch = qa.match(/\*\*Q:\s*(.+?)\*\*/i);
    if (!qMatch) continue;
    const question = qMatch[1].trim();
    const answer = qa
      .replace(/\*\*Q:\s*.+?\*\*/i, "")
      .trim()
      .replace(/^\*\*A:\s*\*\*\s*/i, "")
      .trim();
    if (question && answer) faqs.push({ question, answer });
  }

  return faqs;
}
