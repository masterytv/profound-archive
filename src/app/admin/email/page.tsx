// src/app/admin/email/page.tsx
// Admin CRM dashboard at /admin/email
// Protected — only admins can access (checked in layout or middleware).

import type { Metadata } from "next";
import { EmailCrmClient } from "./EmailCrmClient";

export const metadata: Metadata = {
  title: "Email CRM — Admin | Project Profound",
  robots: "noindex",
};

export default function AdminEmailPage() {
  return <EmailCrmClient />;
}
