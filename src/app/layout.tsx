import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Project Profound: Near Death Experiences and Consciousness',
  description: 'Search and Chat with 5000+ First-Person Accounts of Near Death Experiences',
  icons: {
    // Modern SVG icon for most browsers
    icon: '/favicon.svg',
    // Traditional ICO for fallback compatibility
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen bg-background">
        <SiteHeader />
        <main className="flex-grow">{children}</main>
        <SiteFooter />
        <Toaster />
        <Script async data-uid="893453eeff" src="https://project-profound.kit.com/893453eeff/index.js" />
      </body>
    </html>
  );
}
