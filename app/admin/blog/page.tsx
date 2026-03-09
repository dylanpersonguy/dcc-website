import { prisma } from "@/lib/prisma";
import AdminBlogList from "@/components/blog/admin/AdminBlogList";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const posts = await prisma.blogPost.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featuredImage: true,
      authorName: true,
      status: true,
      publishedDate: true,
      wordCount: true,
      readingTime: true,
      views: true,
      blogCategory: true,
      contentType: true,
      primaryKeyword: true,
      orphanStatus: true,
      cannibalizationRisk: true,
      _count: { select: { comments: true } },
    },
  });

  const published = posts.filter((p) => p.status === "PUBLISHED");
  const drafts = posts.filter((p) => p.status === "DRAFT");
  const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
  const totalComments = posts.reduce((sum, p) => sum + p._count.comments, 0);

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blog Posts</h1>
          <p className="text-foreground/50 mt-1 text-sm">
            Create, edit, and manage blog posts.
          </p>
        </div>
      </div>

      <AdminBlogList
        initialPosts={posts}
        stats={{
          total: posts.length,
          published: published.length,
          drafts: drafts.length,
          totalViews,
          totalComments,
        }}
      />
    </div>
  );
}
