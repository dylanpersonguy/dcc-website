import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  buildMetadata,
  canonicalUrl,
  blogPostingJsonLd,
  breadcrumbJsonLd,
  faqPageJsonLd,
  absoluteUrl,
  SITE_NAME,
  BASE_URL,
} from "@/lib/blog-seo";
import { BLOG_CATEGORY_LABELS } from "@/lib/blog-constants";
import { renderMarkdown, extractFAQs } from "@/lib/markdown";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { ShareButtons } from "@/components/seo/ShareButtons";
import TableOfContents from "@/components/blog/TableOfContents";
import RelatedPosts from "@/components/blog/RelatedPosts";
import BlogCommentForm from "@/components/blog/BlogCommentForm";
import BlogCommentList from "@/components/blog/BlogCommentList";
import ViewTracker from "@/components/blog/ViewTracker";
import type { BlogCategory } from "@/lib/blog-types";

export const revalidate = 300;

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { views: "desc" },
      take: 100,
      select: { slug: true },
    });
    return posts.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: {
      title: true,
      seoTitle: true,
      seoDescription: true,
      excerpt: true,
      featuredImage: true,
      ogTitle: true,
      ogDescription: true,
      canonicalUrl: true,
      noindex: true,
      publishedDate: true,
      lastUpdated: true,
      updatedAt: true,
      authorName: true,
      blogCategory: true,
      primaryKeyword: true,
      secondaryKeywords: true,
    },
  });

  if (!post) return {};

  return buildMetadata({
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || "",
    canonical: post.canonicalUrl || canonicalUrl(`/blog/${slug}`),
    noindex: post.noindex,
    ogType: "article",
    ogImage: post.featuredImage || undefined,
    publishedTime: post.publishedDate?.toISOString(),
    modifiedTime: (post.lastUpdated || post.updatedAt)?.toISOString(),
    authors: [post.authorName],
    section: post.blogCategory,
    tags: [post.primaryKeyword, ...post.secondaryKeywords].filter(Boolean) as string[],
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  // Check redirect first
  const redirect = await prisma.redirect.findUnique({
    where: { fromPath: `/blog/${slug}`, isActive: true },
  });
  if (redirect) {
    const { redirect: nextRedirect } = await import("next/navigation");
    nextRedirect(redirect.toPath);
  }

  const post = await prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      comments: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!post) notFound();

  // Related posts (same category, excluding current)
  const relatedPosts = await prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      blogCategory: post.blogCategory,
      id: { not: post.id },
    },
    orderBy: { publishedDate: "desc" },
    take: 3,
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
  });

  const html = renderMarkdown(post.content);
  const faqs = extractFAQs(post.content);
  const url = absoluteUrl(`/blog/${post.slug}`);

  const breadcrumbItems = [
    { name: "Home", url: BASE_URL },
    { name: "Blog", url: absoluteUrl("/blog") },
    {
      name: BLOG_CATEGORY_LABELS[post.blogCategory as BlogCategory],
      url: absoluteUrl(
        `/blog/category/${post.blogCategory.toLowerCase().replace(/_/g, "-")}`
      ),
    },
    { name: post.title, url },
  ];

  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      <JsonLd data={blogPostingJsonLd(post)} />
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      {faqs.length > 0 && <JsonLd data={faqPageJsonLd(faqs)} />}

      <ViewTracker postId={post.id} />

      <article className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Blog", href: "/blog" },
            {
              name: BLOG_CATEGORY_LABELS[post.blogCategory as BlogCategory],
              href: `/blog/category/${post.blogCategory
                .toLowerCase()
                .replace(/_/g, "-")}`,
            },
            { name: post.title },
          ]}
        />

        {/* Post Header */}
        <header className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm rounded-full mb-4">
            {BLOG_CATEGORY_LABELS[post.blogCategory as BlogCategory]}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="post-excerpt text-lg text-foreground/60 mb-6">
              {post.excerpt}
            </p>
          )}
          <div className="flex items-center justify-center gap-4 text-sm text-foreground/50">
            <span>{post.authorName}</span>
            <span>·</span>
            {post.publishedDate && (
              <>
                <time dateTime={post.publishedDate.toISOString()}>
                  {post.publishedDate.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <span>·</span>
              </>
            )}
            <span>{post.readingTime} min read</span>
            <span>·</span>
            <span>{post.views.toLocaleString()} views</span>
          </div>
        </header>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="max-w-4xl mx-auto mb-12">
            {post.featuredImage.endsWith(".svg") ? (
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full rounded-2xl"
              />
            ) : (
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full rounded-2xl"
                loading="eager"
              />
            )}
          </div>
        )}

        {/* Content + Sidebar */}
        <div className="max-w-6xl mx-auto flex gap-8">
          {/* TOC Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-28">
              <TableOfContents content={post.content} />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0 max-w-3xl">
            <div
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {/* Tags */}
            {post.secondaryKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-white/[0.06]">
                {[post.primaryKeyword, ...post.secondaryKeywords]
                  .filter(Boolean)
                  .map((kw) => (
                    <span
                      key={kw}
                      className="px-3 py-1 bg-white/[0.04] text-foreground/50 text-sm rounded-full"
                    >
                      {kw}
                    </span>
                  ))}
              </div>
            )}

            {/* Share Buttons */}
            <div className="mt-8 pt-8 border-t border-white/[0.06]">
              <ShareButtons
                url={url}
                title={post.seoTitle || post.title}
              />
            </div>

            {/* Comments */}
            <section className="mt-12 pt-8 border-t border-white/[0.06]">
              <h2 className="text-xl font-bold text-foreground mb-6">
                Comments ({post.comments.length})
              </h2>
              <BlogCommentForm postId={post.id} />
              <div className="mt-8">
                <BlogCommentList comments={post.comments} />
              </div>
            </section>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 pt-12 border-t border-white/[0.06]">
            <RelatedPosts
              posts={relatedPosts.map((p) => ({
                ...p,
                commentCount: p._count.comments,
              }))}
            />
          </section>
        )}
      </article>
    </main>
  );
}
