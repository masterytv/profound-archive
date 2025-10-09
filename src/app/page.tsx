import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
      <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-foreground mb-4">
        Archive of the Extraordinary
      </h1>
      <p className="max-w-2xl text-muted-foreground md:text-xl mb-8">
        Search and Chat with 5000+ First-Person Accounts of Near Death Experiences
      </p>
      <div className="flex gap-4">
        <Button asChild size="lg">
          <Link href="/search">Search</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/chat">Chat</Link>
        </Button>
      </div>
    </div>
  );
}
