/* eslint-disable @typescript-eslint/no-explicit-any */

export function JsonLd({ data }: { data: any | any[] }) {
  const json = JSON.stringify(data, null, 0).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
