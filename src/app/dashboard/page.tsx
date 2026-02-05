"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Loader2, Search, Folder, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Define types for the data we'll fetch
interface Favorite {
  id: number;
  video_id: string;
  video_title: string;
  video_thumbnail_url: string;
  start_time?: number; // Added start_time
}

interface SavedSearch {
  id: number;
  search_term: string;
  search_type?: string;
  sort_by?: string;
  sort_direction?: string;
  similarity_threshold?: number;
}

interface Collection {
  id: number;
  name: string;
  // We will populate this on the client side
  favorites?: Favorite[];
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const currentUser = session.user;
      setUser(currentUser);

      // Fetch all data in parallel
      const [savedSearchesData, collectionsData] = await Promise.all([
        // Fetch Saved Searches
        supabase
          .from('saved_searches')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false }),
        // Fetch Collections
        supabase
          .from('collections')
          .select('id, name')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
      ]);

      if (collectionsData.data) {
        // Now, for each collection, fetch its favorite videos
        const collectionsWithFavorites = await Promise.all(
          collectionsData.data.map(async (collection) => {
            const { data: favorites } = await supabase
              .from('favorites')
              .select('*')
              .eq('collection_id', collection.id)
              .order('created_at', { ascending: false })
              .limit(20); // Limit to 20 videos per collection on the dashboard
            return { ...collection, favorites: favorites || [] };
          })
        );
        setCollections(collectionsWithFavorites);
      }

      setSavedSearches(savedSearchesData.data || []);
      setLoading(false);
    };

    checkUserAndFetchData();
  }, [router, supabase]);

  const handleDeleteCollection = async (collectionId: number) => {
    if (!user) return;

    // 1. Delete the collection from Supabase
    // Note: Due to foreign key constraints (ON DELETE CASCADE), this should also delete the favorites in that collection.
    // If you haven't set up CASCADE delete, you'd need to delete favorites first.
    // Assuming standard setup, deleting parent deletes children or errors.
    // Let's try deleting the collection directly.
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId)
      .eq('user_id', user.id); // Security check

    if (error) {
      console.error("Error deleting collection:", error);
      toast({
        title: "Error",
        description: "Could not delete the collection. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // 2. Update local state
    setCollections((prev) => prev.filter((col) => col.id !== collectionId));
    toast({
      title: "Collection deleted",
      description: "The collection has been successfully removed.",
    });
  };

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

        <div className="space-y-12">
          {/* Collections Section */}
          <div>
            <h2 className="text-2xl font-semibold border-b pb-2 mb-4 flex items-center gap-2">
              <Folder /> My Collections
            </h2>
            {collections.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {collections.map(col => (
                  <AccordionItem value={`item-${col.id}`} key={col.id}>
                    <div className="flex items-center justify-between w-full pr-4">
                      <AccordionTrigger className="text-lg font-medium hover:no-underline flex-1">
                        {col.name} ({col.favorites?.length || 0})
                      </AccordionTrigger>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => e.stopPropagation()} // Prevent accordion toggle
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the collection "{col.name}" and all saved items within it. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCollection(col.id);
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <AccordionContent>
                      {col.favorites && col.favorites.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-4">
                          {col.favorites.map(fav => {
                            const videoUrl = `https://www.youtube.com/watch?v=${fav.video_id}${fav.start_time ? `&t=${fav.start_time}s` : ''}`;
                            return (
                              <Link href={videoUrl} key={fav.id} target="_blank" className="group">
                                <div className="aspect-video bg-gray-200 rounded-md overflow-hidden relative">
                                  <img src={fav.video_thumbnail_url || `https://i.ytimg.com/vi/${fav.video_id}/hqdefault.jpg`} alt={fav.video_title || ''} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                  {fav.start_time && fav.start_time > 0 && (
                                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                                      timestamped
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm font-medium mt-2 truncate group-hover:text-primary">{fav.video_title || fav.video_id}</p>
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm py-4">This collection is empty.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-muted-foreground">You haven't created any collections yet.</p>
                <p className="text-sm text-gray-400 mt-2">Use the bookmark icon on a video in the search results to create one.</p>
              </div>
            )}
          </div>

          {/* Saved Searches Section */}
          <div>
            <h2 className="text-2xl font-semibold border-b pb-2 mb-4 flex items-center gap-2">
              <Search /> Saved Searches
            </h2>
            {savedSearches.length > 0 ? (
              <div className="space-y-2">
                {savedSearches.map(search => (
                  <Link
                    href={`/search3?q=${encodeURIComponent(search.search_term)}&type=${search.search_type || 'keyword'}&sort=${search.sort_by || 'viewCount'}&dir=${search.sort_direction || 'desc'}&sim=${search.similarity_threshold || 0.50}`}
                    key={search.id}
                    className="block p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-mono text-sm text-primary">"{search.search_term}"</p>
                      <span className="text-xs text-muted-foreground uppercase bg-gray-200 px-2 py-1 rounded">
                        {search.search_type === 'semantic' ? 'Semantic' : 'Keyword'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-muted-foreground">You haven't saved any searches yet.</p>
                <p className="text-sm text-gray-400 mt-2">Click the bookmark icon next to the search button to save a query.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
