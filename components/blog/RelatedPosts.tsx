import BlogPostCard from "./BlogPostCard";

interface RelatedPost {
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

export default function RelatedPosts({ posts }: { posts: RelatedPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Related Articles</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <BlogPostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
