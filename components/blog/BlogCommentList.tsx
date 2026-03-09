import type { BlogComment } from "@/lib/blog-types";

function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function BlogCommentList({ comments }: { comments: BlogComment[] }) {
  if (comments.length === 0) {
    return (
      <p className="text-sm text-foreground/40">No comments yet. Be the first!</p>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        Comments ({comments.length})
      </h3>
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2"
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">{comment.authorName}</span>
            <span className="text-foreground/30">·</span>
            <span className="text-foreground/40 text-xs">
              {timeAgo(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm text-foreground/70 whitespace-pre-line">
            {comment.content}
          </p>
        </div>
      ))}
    </div>
  );
}
