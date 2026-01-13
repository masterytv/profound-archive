import { NextRequest, NextResponse } from 'next/server';
import Typesense from 'typesense';

// Use a lazy initialization or a function to get the client to avoid module-level errors
const getClient = () => {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  const protocol = process.env.TYPESENSE_PROTOCOL || 'http'; 
  const port = parseInt(process.env.TYPESENSE_PORT || '8108', 10);

  console.log(`Initialising Typesense client with: ${protocol}://${host}:${port}`);

  if (!host || !apiKey) {
    throw new Error("Missing Typesense configuration (TYPESENSE_HOST or TYPESENSE_API_KEY)");
  }

  return new Typesense.Client({
    nodes: [{
      host,
      port,
      protocol
    }],
    apiKey,
    connectionTimeoutSeconds: 10 // Increased from 5 to 10
  });
};

export async function POST(req: NextRequest) {
  try {
    const client = getClient();
    const { searchTerm, filters, sortBy, page } = await req.json();

    console.log(`Executing Typesense search for: "${searchTerm}" on page ${page}`);

    // Construct the filter_by query parameter from the active filters
    const filterConditions = Object.entries(filters || {})
      .filter(([field, values]) => Array.isArray(values) && values.length > 0)
      .map(([field, values]) => {
        const fieldValues = (values as string[]).map(v => `\`${v}\``).join(', ');
        return `${field}:=[${fieldValues}]`;
      })
      .join(' && ');

    // Map frontend sort values to Typesense sort fields
    let sortQuery = 'viewCount:desc'; 

    if (searchTerm && searchTerm !== '*') {
         sortQuery = '_text_match:desc'; 
    }

    if (sortBy) {
        if (sortBy === 'date') sortQuery = 'date:desc';
        else if (sortBy === 'viewCount') sortQuery = 'viewCount:desc';
        else if (sortBy === 'text_match' || sortBy === 'relevance') sortQuery = '_text_match:desc';
        else sortQuery = sortBy; 
    }

    const searchParameters = {
      'q': searchTerm || '*',
      'query_by': 'content,title',
      'page': page || 1, 
      'per_page': 12, 
      'facet_by': 'channelName,isNde',
      'filter_by': filterConditions,
      'sort_by': sortQuery,
      'max_facet_values': 100, 
    };

    const searchResults = await client.collections('videos').documents().search(searchParameters);
    
    return NextResponse.json(searchResults);

  } catch (error: any) {
    console.error('Typesense search error:', error);
    // Log more details if available (like ECONNREFUSED)
    if (error.code) console.error('Error Code:', error.code);
    
    return NextResponse.json(
        { message: "Search failed", error: error.message, code: error.code }, 
        { status: 500 }
    );
  }
}
