-- Migration: Enable RLS and add policies for collections and favorites
-- Run this in the Supabase SQL Editor

-- === 1. COLLECTIONS TABLE ===
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own collections
DROP POLICY IF EXISTS "Allow individual read access on collections" ON public.collections;
CREATE POLICY "Allow individual read access on collections"
ON public.collections FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own collections
DROP POLICY IF EXISTS "Allow individual insert access on collections" ON public.collections;
CREATE POLICY "Allow individual insert access on collections"
ON public.collections FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own collections
DROP POLICY IF EXISTS "Allow individual update access on collections" ON public.collections;
CREATE POLICY "Allow individual update access on collections"
ON public.collections FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own collections
DROP POLICY IF EXISTS "Allow individual delete access on collections" ON public.collections;
CREATE POLICY "Allow individual delete access on collections"
ON public.collections FOR DELETE
USING (auth.uid() = user_id);


-- === 2. FAVORITES TABLE ===
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own favorites
DROP POLICY IF EXISTS "Allow individual read access on favorites" ON public.favorites;
CREATE POLICY "Allow individual read access on favorites"
ON public.favorites FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own favorites
DROP POLICY IF EXISTS "Allow individual insert access on favorites" ON public.favorites;
CREATE POLICY "Allow individual insert access on favorites"
ON public.favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own favorites
DROP POLICY IF EXISTS "Allow individual delete access on favorites" ON public.favorites;
CREATE POLICY "Allow individual delete access on favorites"
ON public.favorites FOR DELETE
USING (auth.uid() = user_id);
