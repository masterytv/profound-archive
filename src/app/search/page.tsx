'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sampleSearchResults } from '@/lib/placeholder-data';
import { Badge } from '@/components/ui/badge';

export default function SearchPage() {
  const [results] = useState(sampleSearchResults);

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4 sm:px-6 lg:px-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Search Engine for the Soul</CardTitle>
          <CardDescription>Find specific moments in more than 5000 NDE YouTube videos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="keyword">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="keyword">Keyword Match</TabsTrigger>
              <TabsTrigger value="concept">Concept Match</TabsTrigger>
            </TabsList>
            <TabsContent value="keyword">
              <div className="flex gap-4">
                <Input placeholder="e.g., 'tunnel of light' or 'life review'" className="flex-grow" />
                <Button>Search</Button>
              </div>
            </TabsContent>
            <TabsContent value="concept">
              <div className="flex gap-4">
                <Input placeholder="e.g., 'feelings of unconditional love' or 'meeting deceased relatives'" className="flex-grow" />
                <Button>Search</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-by">Sort by</Label>
            <Select defaultValue="similarity">
              <SelectTrigger id="sort-by" className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="similarity">Similarity</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="relevance">Relevance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-direction">Direction</Label>
            <Select defaultValue="desc">
              <SelectTrigger id="sort-direction" className="w-[120px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardFooter>
      </Card>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Results</h2>
        {results.map((result) => (
          <Card key={result.id}>
            <CardHeader>
              <CardTitle>{result.account}</CardTitle>
              <CardDescription>Date: {result.date}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">"{result.snippet}"</p>
              <div className="flex flex-wrap gap-2">
                {result.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline">View Full Account</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
