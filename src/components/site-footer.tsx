import Link from 'next/link';
import { Button } from './ui/button';

export default function SiteFooter() {
  return (
    <footer className="bg-[#242D3F] text-gray-300">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <Link href="#" className="transition-colors hover:text-white">
            Privacy Policy
          </Link>
          <Link href="#" className="transition-colors hover:text-white">
            Terms of Service
          </Link>
        </div>
        <Button variant="ghost" className="hover:bg-white/10 hover:text-white" asChild>
          <Link href="/about#contact-form">Feedback</Link>
        </Button>
      </div>
    </footer>
  );
}
