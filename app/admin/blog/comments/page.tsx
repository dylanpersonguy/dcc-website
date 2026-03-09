import { prisma } from "@/lib/prisma";
import AdminCommentsClient from "@/components/blog/admin/AdminCommentsClient";

export const dynamic = "force-dynamic";

export default async function AdminCommentsPage() {
  const comments = await prisma.blogComment.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Comment Moderation
        </h1>
        <p className="text-foreground/50 mt-1 text-sm">
          Review, approve, and manage reader comments.
        </p>
      </div>

      <AdminCommentsClient initialComments={comments} />
    </div>
  );
}
