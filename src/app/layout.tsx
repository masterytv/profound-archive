import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import Script from 'next/script';
import AuthConfirmationToast from '@/components/auth-confirmation-toast';
import ChatPopup from '@/components/chat-popup';
import CesFeedbackWidget from '@/components/ces-feedback-widget';
import { Suspense } from 'react';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'Project Profound: Near Death Experiences and Consciousness',
  description: 'Search and Chat with 5000+ First-Person Accounts of Near Death Experiences.',
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is required by next-themes — it adds the theme
    // class via an inline script before React hydrates, causing an intentional
    // but harmless mismatch that we explicitly suppress here.
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader />
          <main className="flex-grow">{children}</main>
          <SiteFooter />
          <ChatPopup />
          {/* CES feedback widget — Suspense required because it reads useSearchParams */}
          <Suspense fallback={null}>
            <CesFeedbackWidget />
          </Suspense>
          <Suspense fallback={null}>
            <AuthConfirmationToast />
          </Suspense>
          <Toaster />
          {/* ── Google Analytics 4 ──────────────────────────────────────── */}
          {/* afterInteractive: loads after hydration — never blocks page render */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-FLY0JWVM4X"
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-FLY0JWVM4X', { send_page_view: true });
          `}</Script>
          <Script strategy="lazyOnload" data-uid="893453eeff" src="https://project-profound.kit.com/893453eeff/index.js" />
        </ThemeProvider>
      </body>
    </html>
  );
}

