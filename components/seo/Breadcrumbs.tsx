import Link from "next/link";
import { JsonLd } from "./JsonLd";
import { breadcrumbJsonLd, absoluteUrl } from "@/lib/blog-seo";

interface BreadcrumbItem {
  name: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const jsonItems = items.map((item) => ({
    name: item.name,
    url: absoluteUrl(item.href || ""),
  }));

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(jsonItems)} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex items-center gap-1.5 flex-wrap">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-dim">/</span>}
              {item.href && i < items.length - 1 ? (
                <Link
                  href={item.href}
                  className="hover:text-primary transition-colors"
                >
                  {item.name}
                </Link>
              ) : (
                <span className="text-foreground/70">{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
