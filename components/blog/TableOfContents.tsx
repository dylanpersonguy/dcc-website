"use client";

interface Heading {
  level: 2 | 3;
  text: string;
  id: string;
}

function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    const h3Match = line.match(/^### (.+)$/);
    if (h2Match) {
      const text = h2Match[1].trim();
      headings.push({ level: 2, text, id: text.toLowerCase().replace(/[^a-z0-9]+/g, "-") });
    } else if (h3Match) {
      const text = h3Match[1].trim();
      headings.push({ level: 3, text, id: text.toLowerCase().replace(/[^a-z0-9]+/g, "-") });
    }
  }
  return headings;
}

export default function TableOfContents({ content }: { content: string }) {
  const headings = extractHeadings(content);
  if (headings.length < 2) return null;

  return (
    <nav className="sticky top-24 space-y-1">
      <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-3">
        On this page
      </p>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className={`block text-sm transition-colors hover:text-primary ${
            h.level === 3 ? "pl-4 text-foreground/40" : "text-foreground/60"
          }`}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}
