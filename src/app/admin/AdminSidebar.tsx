"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  LogOut,
  Users,
  Shield,
  MessageSquare,
  LayoutDashboard,
  Upload,
  Radar,
  List,
  ListVideo,
  Mail,
  BarChart3,
  TrendingUp,
  FileText,
  UserCheck,
  Radio,
  Scan,
  Tv,
  UserCircle,
  ArrowLeft,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  iconColor?: string;
  indent?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// ─── NDE Admin Nav ──────────────────────────────────────────────────────────

const NDE_NAV: NavSection[] = [
  {
    title: "Content",
    items: [
      { label: "Blog", href: "/admin/blog", icon: FileText, iconColor: "text-orange-500" },
      { label: "Experiencers", href: "/experiencer", icon: UserCheck, iconColor: "text-violet-500" },
    ],
  },
  {
    title: "Video Pipeline",
    items: [
      { label: "Video Intake", href: "/admin/intake", icon: Upload },
      { label: "Channel Scanner", href: "/admin/scanner", icon: Radar },
      { label: "Queue Inspector", href: "/admin/scanner/queue", icon: ListVideo, indent: true },
      { label: "Pending Queue", href: "/admin/scanner/pending", icon: ListVideo, indent: true },
    ],
  },
  {
    title: "Engagement",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Email CRM", href: "/admin/email", icon: Mail, iconColor: "text-purple-500" },
      { label: "Email Templates", href: "/admin/email/templates", icon: Mail, indent: true },
      { label: "CES Feedback", href: "/admin/ces", icon: BarChart3, iconColor: "text-blue-500" },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Analytics", href: "/admin/analytics", icon: TrendingUp, iconColor: "text-emerald-500" },
    ],
  },
  {
    title: "UAP",
    items: [
      { label: "UAP Admin →", href: "/admin/uap", icon: Radio, iconColor: "text-green-500" },
    ],
  },
];

// ─── UAP Admin Nav (Copy-Modify of NDE) ─────────────────────────────────────

const UAP_NAV: NavSection[] = [
  {
    title: "Content",
    items: [
      { label: "Blog", href: "/admin/uap/blog", icon: FileText, iconColor: "text-green-500" },
      { label: "Questions", href: "/admin/uap/questions", icon: List, iconColor: "text-green-500" },
      { label: "Contactees", href: "/admin/uap/contactees", icon: UserCircle, iconColor: "text-green-500" },
    ],
  },
  {
    title: "Video Pipeline",
    items: [
      { label: "Classifier", href: "/admin/uap/classifier", icon: Scan },
      { label: "Video Intake", href: "/admin/uap/intake", icon: Upload },
      { label: "Channel Scanner", href: "/admin/uap/scanner", icon: Radar },
      { label: "Queue Inspector", href: "/admin/uap/scanner/queue", icon: ListVideo, indent: true },
      { label: "Pending Queue", href: "/admin/uap/scanner/pending", icon: ListVideo, indent: true },
    ],
  },
  {
    title: "Discovery",
    items: [
      { label: "Channels", href: "/admin/uap/channels", icon: Tv, iconColor: "text-green-500" },
    ],
  },
];

// ─── Sidebar Component ──────────────────────────────────────────────────────

export default function AdminSidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const isUap = pathname.startsWith("/admin/uap");

  const nav = isUap ? UAP_NAV : NDE_NAV;
  const overviewHref = isUap ? "/admin/uap" : "/admin";
  const overviewLabel = isUap ? "UAP Dashboard" : "Overview";
  const accentColor = isUap ? "text-green-600" : "text-blue-600";
  const accentBg = isUap ? "bg-green-50" : "bg-blue-50";
  const domainLabel = isUap ? "UAP Admin" : "Admin";

  return (
    <aside className="w-64 bg-white dark:bg-white/5 border-r border-slate-200/60 dark:border-white/10 hidden md:flex md:flex-col">
      <div className="p-5 flex-1 flex flex-col">
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className={`w-9 h-9 rounded-xl ${accentBg} flex items-center justify-center`}>
            {isUap ? (
              <Radio className={`w-4.5 h-4.5 ${accentColor}`} />
            ) : (
              <Shield className={`w-4.5 h-4.5 ${accentColor}`} />
            )}
          </div>
          <span
            className="text-lg font-bold text-slate-900 dark:text-white"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            {domainLabel}
          </span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-0.5">
          {/* Overview — always first, ungrouped */}
          <Link
            href={overviewHref}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
              pathname === overviewHref
                ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            {overviewLabel}
          </Link>

          {/* Chatbot Editor — NDE only, super_admin only */}
          {!isUap && role === "super_admin" && (
            <Link
              href="/admin/chatbot"
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                pathname === "/admin/chatbot"
                  ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              Chatbot Editor
            </Link>
          )}

          {/* Sections */}
          {nav.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 px-3 pt-5 pb-1.5">
                {section.title}
              </p>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 ${
                      item.indent ? "pl-9 pr-3 py-2" : "px-3 py-2.5"
                    } text-sm font-medium rounded-xl transition-all ${
                      isActive
                        ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white"
                        : `${item.indent ? "text-slate-500 dark:text-slate-400" : "text-slate-600 dark:text-slate-300"} hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white`
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${item.iconColor || ""}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Links */}
        <div className="border-t border-slate-200/60 dark:border-white/10 pt-4 space-y-0.5">
          {/* Cross-domain link */}
          {isUap ? (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              NDE Admin
            </Link>
          ) : null}
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
            Exit Admin
          </Link>
        </div>
      </div>
    </aside>
  );
}
