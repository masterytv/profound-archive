"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSharedSession } from '@/lib/supabase/session';
import type { User } from '@supabase/supabase-js';
import { Loader2, Search, Folder, Trash2, ChevronRight, LayoutDashboard, Cpu, Radio } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Favorite {
  id: number;
  video_id: string;
  video_title: string;
  video_thumbnail_url: string;
  start_time?: number;
  domain?: string;
}

interface SavedSearch {
  id: number;
  search_term: string;
  search_type?: string;
  sort_by?: string;
  sort_direction?: string;
  similarity_threshold?: number;
  domain?: string;
}

interface Collection {
  id: number;
  name: string;
  favorites?: Favorite[];
}

type Domain = 'nde' | 'uap';

// ─── Domain Config ──────────────────────────────────────────────────────────

const DOMAIN_CONFIG: Record<Domain, {
  title: string;
  icon: typeof Cpu;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  accentHover: string;
  tabActiveBg: string;
  tabActiveText: string;
  searchRoute: string;
  videoRoute: (videoId: string) => string;
  emptyCollectionMsg: string;
  emptySearchMsg: string;
  emptyCollectionHint: string;
  emptySearchHint: string;
}> = {
  nde: {
    title: 'Near-Death Experiences',
    icon: Cpu,
    accentBg: 'bg-blue-50 dark:bg-blue-900/30',
    accentText: 'text-blue-600 dark:text-blue-400',
    accentBorder: 'border-blue-200/60 dark:border-blue-800/40',
    accentHover: 'hover:bg-blue-50/50 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:border-blue-700',
    tabActiveBg: 'data-[state=active]:bg-blue-600',
    tabActiveText: 'data-[state=active]:text-white',
    searchRoute: '/search3',
    videoRoute: (id) => `/video/${id}`,
    emptyCollectionMsg: "You haven't created any NDE collections yet.",
    emptySearchMsg: "You haven't saved any NDE searches yet.",
    emptyCollectionHint: "Use the bookmark icon on a video in search results to create one.",
    emptySearchHint: "Click the bookmark icon next to the search button to save a query.",
  },
  uap: {
    title: 'UAP Encounters',
    icon: Radio,
    accentBg: 'bg-green-50 dark:bg-green-900/30',
    accentText: 'text-green-600 dark:text-green-400',
    accentBorder: 'border-green-200/60 dark:border-green-800/40',
    accentHover: 'hover:bg-green-50/50 hover:border-green-200 dark:hover:bg-green-900/20 dark:hover:border-green-700',
    tabActiveBg: 'data-[state=active]:bg-green-600',
    tabActiveText: 'data-[state=active]:text-white',
    searchRoute: '/uap/search',
    videoRoute: (id) => `/uap/video/${id}`,
    emptyCollectionMsg: "You haven't created any UAP collections yet.",
    emptySearchMsg: "You haven't saved any UAP searches yet.",
    emptyCollectionHint: "Save UAP videos while browsing encounters or research.",
    emptySearchHint: "Search UAP transcripts and bookmark your queries.",
  },
};

// ─── Domain Section Component ───────────────────────────────────────────────

function DomainSection({
  domain,
  collections,
  savedSearches,
  onDeleteCollection,
}: {
  domain: Domain;
  collections: Collection[];
  savedSearches: SavedSearch[];
  onDeleteCollection: (id: number) => void;
}) {
  const config = DOMAIN_CONFIG[domain];
  const Icon = config.icon;

  return (
    <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
      {/* Section Header */}
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-border/40`}>
        <div className={`w-9 h-9 rounded-xl ${config.accentBg} flex items-center justify-center`}>
          <Icon className={`w-4.5 h-4.5 ${config.accentText}`} />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{config.title}</h2>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="collections" className="w-full">
        <div className="px-6 pt-4">
          <TabsList className="grid w-full max-w-xs grid-cols-2 bg-muted/50">
            <TabsTrigger
              value="collections"
              className={`text-sm ${config.tabActiveBg} ${config.tabActiveText}`}
            >
              Collections
              <span className="ml-1.5 text-xs opacity-70">({collections.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="searches"
              className={`text-sm ${config.tabActiveBg} ${config.tabActiveText}`}
            >
              Saved Searches
              <span className="ml-1.5 text-xs opacity-70">({savedSearches.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Collections Tab */}
        <TabsContent value="collections" className="px-6 pb-6 pt-2">
          {collections.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {collections.map(col => (
                <AccordionItem value={`item-${col.id}`} key={col.id} className="border-border/40">
                  <div className="flex items-center justify-between w-full pr-2">
                    <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline flex-1">
                      {col.name}
                      <span className="text-xs text-muted-foreground ml-2 font-normal">({col.favorites?.length || 0})</span>
                    </AccordionTrigger>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
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
                              onDeleteCollection(col.id);
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
                          const videoUrl = `${config.videoRoute(fav.video_id)}${fav.start_time ? `?t=${fav.start_time}` : ''}`;
                          return (
                            <Link href={videoUrl} key={fav.id} className="group">
                              <div className="aspect-video bg-muted rounded-xl overflow-hidden relative">
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
                              <p className={`text-xs font-medium text-foreground mt-2 truncate group-hover:${config.accentText.split(' ')[0].replace('text-', 'text-')} transition-colors`}>
                                {fav.video_title || fav.video_id}
                              </p>
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
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <Folder className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{config.emptyCollectionMsg}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{config.emptyCollectionHint}</p>
            </div>
          )}
        </TabsContent>

        {/* Saved Searches Tab */}
        <TabsContent value="searches" className="px-6 pb-6 pt-2">
          {savedSearches.length > 0 ? (
            <div className="space-y-2">
              {savedSearches.map(search => (
                <Link
                  href={`${config.searchRoute}?q=${encodeURIComponent(search.search_term)}&${domain === 'nde' ? `type=${search.search_type || 'keyword'}&sort=${search.sort_by || 'viewCount'}&dir=${search.sort_direction || 'desc'}&sim=${search.similarity_threshold || 0.50}` : `mode=${search.search_type || 'keyword'}`}`}
                  key={search.id}
                  className={`flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-transparent transition-all cursor-pointer ${config.accentHover}`}
                >
                  <p className={`font-mono text-sm ${config.accentText}`}>&quot;{search.search_term}&quot;</p>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {search.search_type === 'semantic' ? 'Concept' : 'Keyword'}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{config.emptySearchMsg}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{config.emptySearchHint}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Main Dashboard Page ────────────────────────────────────────────────────

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ndeSearches, setNdeSearches] = useState<SavedSearch[]>([]);
  const [uapSearches, setUapSearches] = useState<SavedSearch[]>([]);
  const [ndeCollections, setNdeCollections] = useState<Collection[]>([]);
  const [uapCollections, setUapCollections] = useState<Collection[]>([]);

  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      try {
        // Bounded, single-flight session lookup (8s stall guard). The old
        // direct getSession() call could hang forever if the auth client was
        // wedged, and this page's spinner had no other way to clear.
        const session = await getSharedSession();

        if (!session) {
          router.push('/login');
          return;
        }

        const currentUser = session.user;
        setUser(currentUser);

        // Fetch saved searches split by domain
        const [ndeSearchData, uapSearchData, collectionsData] = await Promise.all([
          supabase
            .from('saved_searches')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('domain', 'nde')
            .order('created_at', { ascending: false }),
          supabase
            .from('saved_searches')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('domain', 'uap')
            .order('created_at', { ascending: false }),
          supabase
            .from('collections')
            .select('id, name')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
        ]);

        // Fetch favorites for each collection, then split by domain
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

          // Split collections: a collection belongs to the domain its favorites are tagged with
          // If a collection has mixed or no favorites, show it in NDE (legacy default)
          const nde: Collection[] = [];
          const uap: Collection[] = [];

          collectionsWithFavorites.forEach(col => {
            const hasFavs = col.favorites && col.favorites.length > 0;
            if (hasFavs) {
              // Check the domain of the first favorite to determine collection domain
              const firstDomain = col.favorites[0]?.domain;
              if (firstDomain === 'uap') {
                uap.push(col);
              } else {
                nde.push(col);
              }
            } else {
              // Empty collections default to NDE
              nde.push(col);
            }
          });

          setNdeCollections(nde);
          setUapCollections(uap);
        }

        setNdeSearches(ndeSearchData.data || []);
        setUapSearches(uapSearchData.data || []);
      } catch (err) {
        // AbortError from Supabase auth locks
        console.warn("[dashboard] Auth check failed:", err);
        router.push('/login');
      } finally {
        // Always clear the spinner — a hang anywhere above must never strand
        // the page on the loader (the redirect paths render null instead).
        setLoading(false);
      }
    };

    checkUserAndFetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleDeleteCollection = async (collectionId: number, domain: Domain) => {
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

    if (domain === 'nde') {
      setNdeCollections((prev) => prev.filter((col) => col.id !== collectionId));
    } else {
      setUapCollections((prev) => prev.filter((col) => col.id !== collectionId));
    }

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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/60 bg-gradient-to-br from-muted/50 to-background">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">Dashboard</span>
          </nav>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1
                className="text-3xl md:text-4xl font-bold text-foreground mb-1"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
              >
                Dashboard
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {user.user_metadata?.full_name || user.email}!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {/* NDE Section */}
        <DomainSection
          domain="nde"
          collections={ndeCollections}
          savedSearches={ndeSearches}
          onDeleteCollection={(id) => handleDeleteCollection(id, 'nde')}
        />

        {/* UAP Section */}
        <DomainSection
          domain="uap"
          collections={uapCollections}
          savedSearches={uapSearches}
          onDeleteCollection={(id) => handleDeleteCollection(id, 'uap')}
        />
      </div>
    </div>
  );
}
