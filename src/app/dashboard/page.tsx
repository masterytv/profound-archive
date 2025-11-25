"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    };

    checkUser();
  }, [router, supabase.auth]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-2 mb-8">
            <h1 className="text-3xl md:text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
                Welcome back, {user.user_metadata?.full_name || user.email}!
            </p>
        </div>

        <div className="space-y-10">
            {/* Collections Section */}
            <div>
                <h2 className="text-2xl font-semibold border-b pb-2 mb-4">My Collections</h2>
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">Your saved video collections will appear here.</p>
                    <p className="text-sm text-gray-400 mt-2">(Feature coming soon)</p>
                </div>
            </div>

            {/* Saved Searches Section */}
            <div>
                <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Saved Searches</h2>
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">Your saved search queries will appear here.</p>
                     <p className="text-sm text-gray-400 mt-2">(Feature coming soon)</p>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return null; // Should be redirected, but as a fallback, render nothing.
}
