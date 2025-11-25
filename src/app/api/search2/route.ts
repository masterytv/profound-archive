import { NextRequest, NextResponse } from 'next/server';
import Typesense from 'typesense';

// Use a lazy initialization or a function to get the client to avoid module-level errors
const getClient = () => {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;

  if (!host || !apiKey) {
    throw new Error("Missing Typesense configuration (TYPESENSE_HOST or TYPESENSE_API_KEY)");
  }

  // Determine protocol based on host/port or env
  const protocol = process.env.TYPESENSE_PROTOCOL || 'http'; 
  const port = parseInt(process.env.TYPESENSE_PORT || '8108', 10);

  return new Typesense.Client({
    nodes: [{
      host,
      port,
      protocol
    }],
    apiKey,
    connectionTimeoutSeconds: 5
  });
};

export async function POST(req: NextRequest) {
  try {
    const client = getClient();
    const { searchTerm, filters, sortBy, page } = await req.json();

    // Construct the filter_by query parameter from the active filters
    const filterConditions = Object.entries(filters || {})
      .filter(([field, values]) => Array.isArray(values) && values.length > 0)
      .map(([field, values]) => {
        const fieldValues = (values as string[]).map(v => `\`${v}\``).join(', ');
        return `${field}:=[${fieldValues}]`;
      })
      .join(' && ');

    // Map frontend sort values to Typesense sort fields
    // Typesense reserved sort field for relevance is "_text_match" (with underscore)
    // If search is wildcard (*), sorting by text match is invalid/undefined usually, so default to viewCount or date.
    
    let sortQuery = 'viewCount:desc'; // Safe default for wildcard

    if (searchTerm && searchTerm !== '*') {
         sortQuery = '_text_match:desc'; // Default for actual text queries
    }

    if (sortBy) {
        if (sortBy === 'date') sortQuery = 'date:desc';
        else if (sortBy === 'viewCount') sortQuery = 'viewCount:desc';
        else if (sortBy === 'text_match' || sortBy === 'relevance') sortQuery = '_text_match:desc';
        else sortQuery = sortBy; // Allow full strings
    }

    const searchParameters = {
      'q': searchTerm || '*',
      'query_by': 'content,title',
      'page': page || 1, 
      'per_page': 12, 
      'facet_by': 'channelName,isNde',
      'filter_by': filterConditions,
      'sort_by': sortQuery,
      'max_facet_values': 100, // Fetch up to 100 facet values per field
    };

    const searchResults = await client.collections('videos').documents().search(searchParameters);
    
    return NextResponse.json(searchResults);

  } catch (error: any) {
    console.error('Typesense search error:', error);
    return NextResponse.json(
        { message: "Search failed", error: error.message }, 
        { status: 500 }
    );
  }
}
