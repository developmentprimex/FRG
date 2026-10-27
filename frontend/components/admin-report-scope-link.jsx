"use client";

import Link, { useLinkStatus } from "next/link";

export function AdminReportScopeLink({ href, children, compact = false }) {
  return <Link href={href} className={`admin-report-scope-link${compact ? " admin-report-scope-link--compact" : ""}`}>
    <ScopeLinkContent>{children}</ScopeLinkContent>
  </Link>;
}

function ScopeLinkContent({ children }) {
  const { pending } = useLinkStatus();
  return <span data-pending={pending} aria-busy={pending}>
    {children}
    {pending && <span className="admin-report-scope-link__spinner" aria-hidden="true" />}
  </span>;
}
