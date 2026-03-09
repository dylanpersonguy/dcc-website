import BlogPostEditor from "@/components/blog/editor/BlogPostEditor";

export const dynamic = "force-dynamic";

export default function NewBlogPostPage() {
  return (
    <div className="max-w-7xl">
      <h1 className="text-2xl font-bold text-foreground mb-8">
        New Blog Post
      </h1>
      <BlogPostEditor />
    </div>
  );
}
