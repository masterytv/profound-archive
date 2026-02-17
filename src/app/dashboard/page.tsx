"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Loader2, Search, Folder, Trash2, ChevronRight, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
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

interface Favorite {
  id: number;
  video_id: string;
  video_title: string;
  video_thumbnail_url: string;
  start_time?: number;
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

      const [savedSearchesData, collectionsData] = await Promise.all([
        supabase
          .from('saved_searches')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('collections')
          .select('id, name')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
      ]);

      if (collectionsData.data) {
        const collectionsWithFavorites = await Promise.all(
          collectionsData.data.map(async (collection) => {
            const { data: favorites } = await supabase
              .from('favorites')
              .select('*')
              .eq('collection_id', collection.id)
              .order('created_at', { ascending: false })
              .limit(20);
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

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId)
      .eq('user_id', user.id);

    if (error) {
      console.error("Error deleting collection:", error);
      toast({
        title: "Error",
        description: "Could not delete the collection. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setCollections((prev) => prev.filter((col) => col.id !== collectionId));
    toast({
      title: "Collection deleted",
      description: "The collection has been successfully removed.",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      {/* Header */}
      <div className="border-b border-slate-200" style={{ background: "linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)" }}>
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-6">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 font-medium">Dashboard</span>
          </nav>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1
                className="text-3xl md:text-4xl font-bold text-slate-900 mb-1"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
              >
                Dashboard
              </h1>
              <p className="text-slate-500">
                Welcome back, {user.user_metadata?.full_name || user.email}!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Collections Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Folder className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">My Collections</h2>
            <span className="text-xs text-slate-400 ml-auto">{collections.length} collections</span>
          </div>

          {collections.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {collections.map(col => (
                <AccordionItem value={`item-${col.id}`} key={col.id} className="border-slate-200/60">
                  <div className="flex items-center justify-between w-full pr-2">
                    <AccordionTrigger className="text-sm font-medium text-slate-800 hover:no-underline flex-1">
                      {col.name}
                      <span className="text-xs text-slate-400 ml-2 font-normal">({col.favorites?.length || 0})</span>
                    </AccordionTrigger>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-red-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the collection &quot;{col.name}&quot; and all saved items within it.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()} className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCollection(col.id);
                            }}
                            className="bg-red-600 text-white hover:bg-red-700 rounded-xl"
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
                          const videoUrl = `/video/${fav.video_id}${fav.start_time ? `?t=${fav.start_time}` : ''}`;
                          return (
                            <Link href={videoUrl} key={fav.id} className="group">
                              <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden relative">
                                <Image
                                  src={fav.video_thumbnail_url || `https://i.ytimg.com/vi/${fav.video_id}/hqdefault.jpg`}
                                  alt={fav.video_title || ''}
                                  fill
                                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                  className="object-cover transition-transform group-hover:scale-105"
                                />
                                {fav.start_time && fav.start_time > 0 && (
                                  <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                                    timestamped
                                  </div>
                                )}
                              </div>
                              <p className="text-xs font-medium text-slate-700 mt-2 truncate group-hover:text-blue-600 transition-colors">
                                {fav.video_title || fav.video_id}
                              </p>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm py-4">This collection is empty.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="bg-slate-50 rounded-xl p-8 text-center">
              <p className="text-slate-500 text-sm">You haven&apos;t created any collections yet.</p>
              <p className="text-xs text-slate-400 mt-1">Use the bookmark icon on a video in search results to create one.</p>
            </div>
          )}
        </div>

        {/* Saved Searches Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Search className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Saved Searches</h2>
            <span className="text-xs text-slate-400 ml-auto">{savedSearches.length} searches</span>
          </div>

          {savedSearches.length > 0 ? (
            <div className="space-y-2">
              {savedSearches.map(search => (
                <Link
                  href={`/search3?q=${encodeURIComponent(search.search_term)}&type=${search.search_type || 'keyword'}&sort=${search.sort_by || 'viewCount'}&dir=${search.sort_direction || 'desc'}&sim=${search.similarity_threshold || 0.50}`}
                  key={search.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-blue-50/50 hover:border-blue-200 border border-transparent transition-all"
                >
                  <p className="font-mono text-sm text-blue-600">&quot;{search.search_term}&quot;</p>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 bg-slate-200/70 px-2 py-0.5 rounded-full">
                    {search.search_type === 'semantic' ? 'Concept' : 'Keyword'}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-8 text-center">
              <p className="text-slate-500 text-sm">You haven&apos;t saved any searches yet.</p>
              <p className="text-xs text-slate-400 mt-1">Click the bookmark icon next to the search button to save a query.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
