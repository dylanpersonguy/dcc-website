import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Clock } from "lucide-react";
import { BLOG_CATEGORY_LABELS, BLOG_CATEGORY_ICONS } from "@/lib/blog-constants";

interface BlogPostCardProps {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  authorName: string;
  publishedDate: Date | null;
  readingTime: number;
  blogCategory: string;
  commentCount?: number;
}

export default function BlogPostCard({ post }: { post: BlogPostCardProps }) {
  const categoryLabel =
    BLOG_CATEGORY_LABELS[post.blogCategory as keyof typeof BLOG_CATEGORY_LABELS] || post.blogCategory;
  const categoryIcon =
    BLOG_CATEGORY_ICONS[post.blogCategory as keyof typeof BLOG_CATEGORY_ICONS] || "📄";

  const isSvg = post.featuredImage?.endsWith(".svg");
  const date = post.publishedDate
    ? new Date(post.publishedDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-primary/30 hover:shadow-[0_0_30px_rgba(0,229,255,0.05)] transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-video bg-white/[0.03] overflow-hidden">
        {post.featuredImage ? (
          isSvg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {categoryIcon}
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-medium text-white">
          {categoryIcon} {categoryLabel}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="text-sm text-foreground/60 line-clamp-2">{post.excerpt}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-foreground/40">
          <span>{post.authorName}</span>
          {date && (
            <>
              <span>·</span>
              <span>{date}</span>
            </>
          )}
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {post.readingTime} min
          </span>
          {post.commentCount && post.commentCount > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" /> {post.commentCount}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
