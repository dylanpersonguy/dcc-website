import AdminSEOClient from "@/components/blog/admin/AdminSEOClient";

export const dynamic = "force-dynamic";

export default function AdminSEOPage() {
  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          SEO Dashboard
        </h1>
        <p className="text-foreground/50 mt-1 text-sm">
          Monitor site health, SEO scores, and sitemap status.
        </p>
      </div>

      <AdminSEOClient />
    </div>
  );
}
