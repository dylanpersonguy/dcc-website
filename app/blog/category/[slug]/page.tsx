import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BlogCategory } from "@/lib/blog-types";
import {
  BLOG_POSTS_PER_PAGE,
  BLOG_CATEGORY_LABELS,
  BLOG_CATEGORY_ICONS,
} from "@/lib/blog-constants";
import {
  BLOG_CATEGORY_SEO,
  BLOG_CATEGORY_SLUG_TO_KEY,
  buildMetadata,
  canonicalUrl,
  collectionPageJsonLd,
  absoluteUrl,
} from "@/lib/blog-seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import BlogPostCard from "@/components/blog/BlogPostCard";

export const revalidate = 300;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  return Object.values(BLOG_CATEGORY_SEO).map((cat) => ({
    slug: cat.slug,
  }));
}

export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const catKey = BLOG_CATEGORY_SLUG_TO_KEY[slug];
  if (!catKey) return {};
  const seo = BLOG_CATEGORY_SEO[catKey];
  return buildMetadata({
    title: seo.title,
    description: seo.description,
    canonical: canonicalUrl(`/blog/category/${slug}`, { page: sp.page }),
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const catKey = BLOG_CATEGORY_SLUG_TO_KEY[slug];
  if (!catKey) notFound();

  const category = catKey as BlogCategory;
  const seo = BLOG_CATEGORY_SEO[catKey];
  const page = Math.max(1, parseInt(sp.page || "1", 10));

  const where = { status: "PUBLISHED" as const, blogCategory: category };

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
    name: seo.title,
    description: seo.description,
    url: absoluteUrl(`/blog/category/${slug}`),
    items: posts.map((p) => ({
      url: absoluteUrl(`/blog/${p.slug}`),
      name: p.title,
    })),
  });

  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      <JsonLd data={jsonLd} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Blog", href: "/blog" },
            { name: BLOG_CATEGORY_LABELS[category] },
          ]}
        />

        <div className="text-center mb-12">
          <span className="text-4xl mb-4 block">{BLOG_CATEGORY_ICONS[category]}</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {BLOG_CATEGORY_LABELS[category]}
          </h1>
          <p className="text-foreground/60 max-w-2xl mx-auto">
            {seo.description}
          </p>
        </div>

        {/* Category Nav */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          <Link
            href="/blog"
            className="px-4 py-2 rounded-full text-sm font-medium bg-white/[0.04] text-foreground/60 hover:bg-white/[0.08] transition-colors"
          >
            All
          </Link>
          {Object.values(BlogCategory).map((cat) => (
            <Link
              key={cat}
              href={`/blog/category/${BLOG_CATEGORY_SEO[cat]?.slug || cat.toLowerCase()}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                cat === category
                  ? "bg-primary text-background"
                  : "bg-white/[0.04] text-foreground/60 hover:bg-white/[0.08]"
              }`}
            >
              {BLOG_CATEGORY_ICONS[cat]} {BLOG_CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </div>

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
            <p className="text-foreground/40 text-lg">
              No articles in this category yet.
            </p>
            <Link
              href="/blog"
              className="text-primary mt-2 inline-block hover:underline"
            >
              View all articles
            </Link>
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
                href={`/blog/category/${slug}?page=${page - 1}`}
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
                      href={`/blog/category/${slug}?page=${p}`}
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
                href={`/blog/category/${slug}?page=${page + 1}`}
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
