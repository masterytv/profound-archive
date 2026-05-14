"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Star, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast';

interface FavoriteButtonProps {
  videoId: string;
  videoTitle: string;
  videoThumbnailUrl?: string;
  user?: User | null;
  /** Which domain this favorite belongs to. Defaults to 'nde'. */
  domain?: 'nde' | 'uap';
}

export default function FavoriteButton({ videoId, videoTitle, videoThumbnailUrl, user: initialUser, domain = 'nde' }: FavoriteButtonProps) {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase] = useState(() => createClient());
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const checkUserAndFavoriteStatus = async () => {
      try {
        let currentUser = initialUser;
        if (!currentUser) {
          // Use getSession() instead of getUser() to avoid navigator.lock contention
          // when many buttons mount simultaneously. Session check is sufficient for UI gating.
          const { data: { session } } = await supabase.auth.getSession();
          currentUser = session?.user ?? null;
        }

        if (!isMounted) return;
        setUser(currentUser ?? null);

        if (currentUser) {
          const { data: collection } = await supabase
            .from('collections')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('name', 'Favorites')
            .eq('domain', domain)
            .single();

          if (collection && isMounted) {
            const { data: favorite } = await supabase
              .from('favorites')
              .select('id')
              .eq('collection_id', collection.id)
              .eq('video_id', videoId)
              .single();

            if (isMounted) setIsFavorited(!!favorite);
          }
        }
      } catch (error) {
        // AbortError = navigator.lock contention from Strict Mode double-mount; harmless noise.
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error(`[FavoriteButton] Error for ${videoId}:`, error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    checkUserAndFavoriteStatus();
    return () => { isMounted = false; };
  }, [supabase, videoId]);

  const toggleFavorite = async () => {
    // Re-check auth if user is null — handles race where initial mount check hadn't completed
    let currentUser = user;
    if (!currentUser) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        currentUser = session?.user ?? null;
        if (currentUser) setUser(currentUser);
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
      }
    }

    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "You must be logged in to save favorites.",
        variant: "destructive",
        action: (
          <ToastAction altText="Login" onClick={() => router.push('/login')}>
            Login
          </ToastAction>
        ),
      });
      return;
    }

    setIsLoading(true);

    // 1. Get or create the default 'Favorites' collection
    let { data: collection } = await supabase
      .from('collections')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('name', 'Favorites')
      .eq('domain', domain)
      .single();

    if (!collection) {
      const { data: newCollection, error } = await supabase
        .from('collections')
        .insert({ user_id: currentUser.id, name: 'Favorites', domain })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating collection:', error);
        toast({ title: 'Error', description: 'Could not create a favorites collection.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      collection = newCollection;
    }

    if (!collection) {
      setIsLoading(false);
      return;
    }

    // 2. Add or remove from favorites
    if (isFavorited) {
      // Remove from favorites
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('collection_id', collection.id)
        .eq('video_id', videoId);

      if (error) {
        console.error('Error removing favorite:', error);
        toast({ title: 'Error', description: 'Could not remove from favorites.', variant: 'destructive' });
      } else {
        setIsFavorited(false);
        toast({ title: 'Removed from Favorites' });
      }
    } else {
      // Add to favorites
      const { error } = await supabase.from('favorites').insert({
        user_id: currentUser.id,
        collection_id: collection.id,
        video_id: videoId,
        video_title: videoTitle,
        video_thumbnail_url: videoThumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        domain,
      });

      if (error) {
        console.error('Error adding favorite:', error);
        toast({ title: 'Error', description: 'Could not add to favorites.', variant: 'destructive' });
      } else {
        setIsFavorited(true);
        toast({ title: 'Added to Favorites!' });
      }
    }

    setIsLoading(false);
  };

  // Render the button even if user is null (so they can click and be prompted)
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFavorite}
      disabled={isLoading}
      aria-label="Toggle Favorite"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Star
          className={`h-5 w-5 ${isFavorited ? 'text-yellow-500 fill-yellow-400' : 'text-gray-400'
            }`}
        />
      )}
    </Button>
  );
}
