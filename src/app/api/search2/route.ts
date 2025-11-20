import { NextRequest, NextResponse } from 'next/server';
import Typesense from 'typesense';

// Initialize the Typesense client.
// This uses environment variables that are available on your hosting server.
const client = new Typesense.Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST!,
    port: 8108,
    protocol: 'http'
  }],
  apiKey: process.env.TYPESENSE_API_KEY!,
  connectionTimeoutSeconds: 5
});

export async function POST(req: NextRequest) {
  try {
    const { searchTerm, filters, sortBy } = await req.json();

    // Construct the filter_by query parameter from the active filters
    const filterConditions = Object.entries(filters || {})
      .filter(([field, values]) => Array.isArray(values) && values.length > 0)
      .map(([field, values]) => {
        const fieldValues = (values as string[]).map(v => `\`${v}\``).join(', ');
        return `${field}:=[${fieldValues}]`;
      })
      .join(' && ');

    const searchParameters = {
      'q': searchTerm,
      'query_by': 'content,title',
      'page': 1, // Add pagination later if needed
      'per_page': 50, // Return up to 50 results
      'facet_by': 'channelName,isNde',
      'filter_by': filterConditions,
      'sort_by': sortBy || 'viewCount:desc', // Default sort
    };

    const searchResults = await client.collections('videos').documents().search(searchParameters);
    
    return NextResponse.json(searchResults);

  } catch (error: any) {
    console.error('Typesense search error:', error);
    return NextResponse.json({ message: "Search failed", error: error.message }, { status: 500 });
  }
}
