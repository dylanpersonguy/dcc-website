import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const post = await prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      title: true,
      content: true,
      authorName: true,
      publishedDate: true,
      blogCategory: true,
      primaryKeyword: true,
      excerpt: true,
    },
  });

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Strip markdown formatting for clean LLM consumption
  const cleanContent = post.content
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .replace(/`[^`]+`/g, "") // remove inline code
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "") // remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // keep link text
    .replace(/^#{1,6}\s+/gm, "") // remove heading markup
    .replace(/\*\*(.+?)\*\*/g, "$1") // remove bold
    .replace(/\*(.+?)\*/g, "$1") // remove italic
    .replace(/^[\-\*]\s+/gm, "• ") // normalize lists
    .replace(/^>\s+/gm, "") // remove blockquotes
    .replace(/\n{3,}/g, "\n\n") // compress whitespace
    .trim();

  const text = [
    `# ${post.title}`,
    `By ${post.authorName} | ${post.publishedDate?.toISOString().split("T")[0] || "Draft"}`,
    `Category: ${post.blogCategory}`,
    post.primaryKeyword ? `Keywords: ${post.primaryKeyword}` : null,
    "",
    post.excerpt ? `> ${post.excerpt}` : null,
    "",
    cleanContent,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
