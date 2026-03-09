import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { BLOG_CATEGORY_LABELS } from "@/lib/blog-constants";
import type { BlogCategory } from "@/lib/blog-types";

export const runtime = "nodejs";
export const revalidate = 3600;

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface OGImageProps {
  params: Promise<{ slug: string }>;
}

export default async function OGImage({ params }: OGImageProps) {
  const { slug } = await params;

  const post = await prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      title: true,
      excerpt: true,
      authorName: true,
      blogCategory: true,
      readingTime: true,
    },
  });

  const title = post?.title || "DecentralChain Blog";
  const excerpt = post?.excerpt || "";
  const author = post?.authorName || "DecentralChain";
  const category = post
    ? BLOG_CATEGORY_LABELS[post.blogCategory as BlogCategory]
    : "Blog";
  const readingTime = post?.readingTime || 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          background: "linear-gradient(135deg, #0A0F1C 0%, #111827 50%, #0D1117 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top: Category badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              padding: "6px 16px",
              background: "rgba(0, 229, 255, 0.15)",
              borderRadius: "20px",
              color: "#00E5FF",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            {category}
          </div>
          {readingTime > 0 && (
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "16px" }}>
              {readingTime} min read
            </div>
          )}
        </div>

        {/* Middle: Title + Excerpt */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div
            style={{
              fontSize: title.length > 60 ? "36px" : "48px",
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.2,
              marginBottom: "16px",
              maxWidth: "900px",
            }}
          >
            {title.length > 80 ? title.slice(0, 77) + "..." : title}
          </div>
          {excerpt && (
            <div
              style={{
                fontSize: "20px",
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.4,
                maxWidth: "800px",
              }}
            >
              {excerpt.length > 120 ? excerpt.slice(0, 117) + "..." : excerpt}
            </div>
          )}
        </div>

        {/* Bottom: Author + Branding */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #00E5FF, #6C63FF)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFF",
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              {author.charAt(0)}
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "18px" }}>
              {author}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #00E5FF, #14F195)",
              }}
            />
            <div
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#FFFFFF",
              }}
            >
              DecentralChain
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
