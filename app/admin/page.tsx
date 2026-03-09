import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [totalPosts, publishedPosts, draftPosts, totalComments, pendingComments, recentPosts] =
    await Promise.all([
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
      prisma.blogPost.count({ where: { status: "DRAFT" } }),
      prisma.blogComment.count(),
      prisma.blogComment.count({ where: { status: "PENDING" } }),
      prisma.blogPost.findMany({
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          updatedAt: true,
          views: true,
          blogCategory: true,
        },
      }),
    ]);

  const totalViews = await prisma.blogPost.aggregate({ _sum: { views: true } });

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-foreground/50 mt-1 text-sm">
          A snapshot of your DecentralChain content and activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Posts" value={totalPosts} icon="📝" />
        <StatCard label="Published" value={publishedPosts} icon="✅" accent="text-accent" />
        <StatCard label="Drafts" value={draftPosts} icon="📄" accent="text-yellow-400" />
        <StatCard label="Total Views" value={(totalViews._sum.views ?? 0).toLocaleString()} icon="👁️" />
        <StatCard label="Comments" value={totalComments} icon="💬" />
        <StatCard label="Pending Review" value={pendingComments} icon="⏳" accent={pendingComments > 0 ? "text-yellow-400" : undefined} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          href="/admin/blog/new"
          className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/15 transition-colors group"
        >
          <span className="text-2xl">✍️</span>
          <div>
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Create New Post
            </p>
            <p className="text-xs text-foreground/40">Write and publish a blog article</p>
          </div>
        </Link>
        <Link
          href="/admin/blog/comments"
          className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] transition-colors group"
        >
          <span className="text-2xl">💬</span>
          <div>
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Moderate Comments
            </p>
            <p className="text-xs text-foreground/40">
              {pendingComments > 0 ? `${pendingComments} pending review` : "All caught up"}
            </p>
          </div>
        </Link>
        <Link
          href="/admin/blog/seo"
          className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] transition-colors group"
        >
          <span className="text-2xl">🔍</span>
          <div>
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              SEO Dashboard
            </p>
            <p className="text-xs text-foreground/40">Monitor search health and scores</p>
          </div>
        </Link>
      </div>

      {/* Recent Posts */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recently Updated Posts</h2>
          <Link href="/admin/blog" className="text-xs text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {recentPosts.map((post) => (
            <Link
              key={post.id}
              href={`/admin/blog/${post.id}/edit`}
              className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{post.title}</p>
                <p className="text-xs text-foreground/40 mt-0.5">
                  Updated {new Date(post.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  post.status === "PUBLISHED"
                    ? "bg-accent/10 text-accent"
                    : "bg-yellow-400/10 text-yellow-400"
                }`}
              >
                {post.status}
              </span>
              <span className="text-xs text-foreground/30">{post.views.toLocaleString()} views</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: string;
  accent?: string;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-foreground/40 text-xs font-medium">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}
