import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BlogCategory } from "@/lib/blog-types";
import { BLOG_POSTS_PER_PAGE, BLOG_CATEGORY_LABELS, BLOG_CATEGORY_ICONS } from "@/lib/blog-constants";
import {
  buildMetadata,
  canonicalUrl,
  collectionPageJsonLd,
  webSiteJsonLd,
  absoluteUrl,
  SITE_NAME,
} from "@/lib/blog-seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import BlogPostCard from "@/components/blog/BlogPostCard";

export const revalidate = 300;

interface BlogPageProps {
  searchParams: Promise<{ category?: string; page?: string; search?: string }>;
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const params = await searchParams;
  const hasFilters = !!(params.category || params.search);
  return buildMetadata({
    title: `Blog | ${SITE_NAME}`,
    description:
      "Explore the latest insights on AI agents, trading bots, blockchain automation, and Web3 technology from the DecentralChain team.",
    canonical: canonicalUrl("/blog", params),
    noindex: hasFilters,
  });
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const category = params.category?.toUpperCase() as BlogCategory | undefined;
  const search = params.search?.trim();

  const where: Record<string, unknown> = { status: "PUBLISHED" };
  if (category && Object.values(BlogCategory).includes(category)) {
    where.blogCategory = category;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { excerpt: { contains: search, mode: "insensitive" } },
      { primaryKeyword: { contains: search, mode: "insensitive" } },
    ];
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedDate: "desc" },
      skip: (page - 1) * BLOG_POSTS_PER_PAGE,
      take: BLOG_POSTS_PER_PAGE,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        authorName: true,
        publishedDate: true,
        readingTime: true,
        blogCategory: true,
        _count: { select: { comments: { where: { status: "APPROVED" } } } },
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  const totalPages = Math.ceil(total / BLOG_POSTS_PER_PAGE);

  const jsonLd = collectionPageJsonLd({
    name: `Blog | ${SITE_NAME}`,
    description:
      "Explore the latest insights on AI agents, trading bots, and blockchain automation.",
    url: absoluteUrl("/blog"),
    items: posts.map((p) => ({
      url: absoluteUrl(`/blog/${p.slug}`),
      name: p.title,
    })),
  });

  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      <JsonLd data={webSiteJsonLd()} />
      <JsonLd data={jsonLd} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Blog", href: "/blog" },
          ]}
        />

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            DecentralChain Blog
          </h1>
          <p className="text-foreground/60 max-w-2xl mx-auto">
            Insights on AI agents, trading bots, blockchain automation, and Web3
            technology.
          </p>
        </div>

        {/* Search */}
        <form
          action="/blog"
          method="GET"
          className="max-w-lg mx-auto mb-8 flex gap-2"
        >
          {category && (
            <input type="hidden" name="category" value={category} />
          )}
          <input
            type="search"
            name="search"
            defaultValue={search || ""}
            placeholder="Search articles..."
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-primary/10 text-primary rounded-lg font-medium hover:bg-primary/20 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          <Link
            href="/blog"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !category
                ? "bg-primary text-background"
                : "bg-white/[0.04] text-foreground/60 hover:bg-white/[0.08]"
            }`}
          >
            All
          </Link>
          {Object.values(BlogCategory).map((cat) => (
            <Link
              key={cat}
              href={`/blog?category=${cat.toLowerCase()}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                category === cat
                  ? "bg-primary text-background"
                  : "bg-white/[0.04] text-foreground/60 hover:bg-white/[0.08]"
              }`}
            >
              {BLOG_CATEGORY_ICONS[cat]} {BLOG_CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </div>

        {/* Active Filters */}
        {search && (
          <div className="text-center mb-6">
            <span className="text-foreground/50 text-sm">
              Showing results for &quot;{search}&quot;
            </span>
            <Link
              href={category ? `/blog?category=${category.toLowerCase()}` : "/blog"}
              className="ml-2 text-primary text-sm hover:underline"
            >
              Clear search
            </Link>
          </div>
        )}

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <BlogPostCard
                key={post.id}
                post={{
                  ...post,
                  commentCount: post._count.comments,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-foreground/40 text-lg">No articles found.</p>
            {(search || category) && (
              <Link
                href="/blog"
                className="text-primary mt-2 inline-block hover:underline"
              >
                View all articles
              </Link>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav
            className="flex justify-center items-center gap-2 mt-12"
            aria-label="Pagination"
          >
            {page > 1 && (
              <Link
                href={`/blog?${new URLSearchParams({
                  ...(category ? { category: category.toLowerCase() } : {}),
                  ...(search ? { search } : {}),
                  page: String(page - 1),
                }).toString()}`}
                rel="prev"
                className="px-4 py-2 bg-white/[0.04] rounded-lg text-foreground/60 hover:bg-white/[0.08] transition-colors"
              >
                ← Previous
              </Link>
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - page) <= 2
              )
              .map((p, i, arr) => {
                const prev = arr[i - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <span key={p} className="flex items-center gap-2">
                    {showEllipsis && (
                      <span className="text-foreground/30">…</span>
                    )}
                    <Link
                      href={`/blog?${new URLSearchParams({
                        ...(category ? { category: category.toLowerCase() } : {}),
                        ...(search ? { search } : {}),
                        page: String(p),
                      }).toString()}`}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        p === page
                          ? "bg-primary text-background"
                          : "bg-white/[0.04] text-foreground/60 hover:bg-white/[0.08]"
                      }`}
                    >
                      {p}
                    </Link>
                  </span>
                );
              })}

            {page < totalPages && (
              <Link
                href={`/blog?${new URLSearchParams({
                  ...(category ? { category: category.toLowerCase() } : {}),
                  ...(search ? { search } : {}),
                  page: String(page + 1),
                }).toString()}`}
                rel="next"
                className="px-4 py-2 bg-white/[0.04] rounded-lg text-foreground/60 hover:bg-white/[0.08] transition-colors"
              >
                Next →
              </Link>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
