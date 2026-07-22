"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSharedSession } from '@/lib/supabase/session';
import type { User } from '@supabase/supabase-js';
import { Bookmark, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast';

interface SaveToCollectionButtonProps {
  videoId: string;
  videoTitle: string;
  videoThumbnailUrl?: string;
  startTime: number;
  content: string;
  user?: User | null;
  /** Which domain this save belongs to — determines dashboard section. Defaults to 'nde'. */
  domain?: 'nde' | 'uap';
}

interface Collection {
  id: number;
  name: string;
  // This flag will be set on the client-side to track membership
  hasVideo: boolean;
}

export default function SaveToCollectionButton({ videoId, videoTitle, videoThumbnailUrl, startTime, content, user: initialUser, domain = 'nde' }: SaveToCollectionButtonProps) {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [supabase] = useState(() => createClient());

  // Fix: Ensure startTime is an integer because the database column 'start_time' is type int4.
  // Sending a float (e.g., 1041.6) causes a 400 Bad Request error.
  const integerStartTime = typeof startTime === 'number' ? Math.floor(startTime) : 0;

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const getUser = async () => {
      try {
        let currentUser = initialUser;
        if (!currentUser) {
          // Shared single-flight lookup: one lock acquisition for the whole page,
          // however many buttons mount. Session check is sufficient for UI gating.
          const session = await getSharedSession();
          currentUser = (session?.user ?? null) as typeof currentUser;
        }

        if (isMounted) {
          setUser(currentUser ?? null);
        }
      } catch (error) {
        // AbortError = navigator.lock contention from Strict Mode double-mount; harmless noise.
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error(`[SaveButton] Auth error for ${videoId}:`, error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    getUser();
    return () => { isMounted = false; };
  }, [supabase, videoId]);

  const fetchData = async (currentUser: User) => {
    setIsLoading(true);
    try {
      // Fetch collections scoped to this domain and this video's memberships in parallel
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('id, name')
        .eq('user_id', currentUser.id)
        .eq('domain', domain);

      // Use integerStartTime for the query
      const { data: memberships, error: membershipsError } = await supabase
        .from('favorites')
        .select('collection_id')
        .eq('user_id', currentUser.id)
        .eq('video_id', videoId)
        .eq('start_time', integerStartTime);

      if (collectionsError || membershipsError) {
        throw collectionsError || membershipsError;
      }

      const membershipSet = new Set(memberships.map((m: { collection_id: number }) => m.collection_id));

      const combinedData = collectionsData.map((c: { id: number; name: string }) => ({
        ...c,
        hasVideo: membershipSet.has(c.id),
      }));

      setCollections(combinedData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: 'Error', description: 'Could not load your collections.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // When the popover is opened, fetch fresh data
  useEffect(() => {
    if (isPopoverOpen && user) {
      fetchData(user);
    }
  }, [isPopoverOpen, user]);

  const handleToggleInCollection = async (collectionId: number, hasVideo: boolean) => {
    if (!user) return;

    // Optimistically update UI
    setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, hasVideo: !hasVideo } : c));

    if (hasVideo) {
      // Remove from collection
      const { error } = await supabase.from('favorites').delete()
        .eq('user_id', user.id)
        .eq('collection_id', collectionId)
        .eq('video_id', videoId)
        .eq('start_time', integerStartTime); // Use integer version

      if (error) {
        console.error('Error removing from collection:', error);
        toast({ title: 'Error', description: 'Failed to remove from collection.', variant: 'destructive' });
        // Revert UI on error
        setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, hasVideo: true } : c));
      } else {
        toast({ title: 'Removed from collection' });
      }
    } else {
      // Add to collection
      const { error } = await supabase.from('favorites').insert({
        user_id: user.id,
        collection_id: collectionId,
        video_id: videoId,
        video_title: videoTitle,
        video_thumbnail_url: videoThumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        start_time: integerStartTime, // Use integer version
        content: content,
        domain,
      });

      if (error) {
        console.error('Error adding to collection:', error);
        toast({ title: 'Error', description: 'Failed to add to collection.', variant: 'destructive' });
        // Revert UI on error
        setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, hasVideo: false } : c));
      } else {
        toast({ title: 'Added to collection!' });
      }
    }
  };

  const handleCreateCollection = async () => {
    if (!user || !newCollectionName.trim()) return;

    setIsCreating(true);

    // 1. Create the new collection
    const { data: newCollection, error: createError } = await supabase
      .from('collections')
      .insert({ user_id: user.id, name: newCollectionName.trim(), domain })
      .select('id, name')
      .single();

    if (createError) {
      console.error('Error creating collection:', createError);
      toast({ title: 'Error', description: 'Could not create collection.', variant: 'destructive' });
      setIsCreating(false);
      return;
    }

    // 2. Add the current video to the new collection
    await handleToggleInCollection(newCollection.id, false);

    // 3. Update UI state
    setCollections(prev => [...prev, { ...newCollection, hasVideo: true }]);
    setNewCollectionName("");
    setIsCreating(false);
  };

  const handleLoginPrompt = async () => {
    // Re-check auth before showing the prompt — handles race where initial check hadn't completed
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const freshUser = session?.user ?? null;
      if (freshUser) {
        setUser(freshUser);
        setIsPopoverOpen(true);
        return;
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
    }

    toast({
      title: "Login Required",
      description: "You must be logged in to save collections.",
      variant: "destructive",
      action: (
        <ToastAction altText="Login" onClick={() => router.push('/login')}>
          Login
        </ToastAction>
      ),
    });
  };

  // While checking auth status
  if (isLoading && !user) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Button>
    );
  }

  // If not logged in, show button that triggers toast
  if (!user) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Save to Collection"
        onClick={handleLoginPrompt}
      >
        <Bookmark className="h-5 w-5 text-gray-400" />
      </Button>
    );
  }

  // If logged in, show full functionality
  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Save to Collection">
          <Bookmark className="h-5 w-5 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-4">
          <h4 className="font-medium leading-none">Save to...</h4>
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              collections.map((collection) => (
                <div key={collection.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`collection-${collection.id}`}
                    checked={collection.hasVideo}
                    onCheckedChange={() => handleToggleInCollection(collection.id, collection.hasVideo)}
                  />
                  <label
                    htmlFor={`collection-${collection.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {collection.name}
                  </label>
                </div>
              ))
            )}
          </div>
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="New collection name..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                disabled={isCreating}
              />
              <Button onClick={handleCreateCollection} disabled={!newCollectionName.trim() || isCreating} size="sm">
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
