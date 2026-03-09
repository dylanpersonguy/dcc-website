import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BlogPostEditor from "@/components/blog/editor/BlogPostEditor";

export const dynamic = "force-dynamic";

interface EditBlogPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  const { id } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: {
      outgoingLinkRules: {
        include: { toPost: { select: { id: true, title: true, slug: true } } },
      },
      incomingLinkRules: {
        include: { fromPost: { select: { id: true, title: true, slug: true } } },
      },
      linkingTasks: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!post) notFound();

  // Get all published posts for pillar/topic selectors and link suggestions
  const allPosts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", id: { not: id } },
    select: { id: true, title: true, slug: true, contentType: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="max-w-7xl">
      <h1 className="text-2xl font-bold text-foreground mb-8">
        Edit: {post.title}
      </h1>
      <BlogPostEditor
        post={post}
        pillarPosts={allPosts}
      />
    </div>
  );
}
