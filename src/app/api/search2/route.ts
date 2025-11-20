import { NextRequest, NextResponse } from 'next/server';

// This is a mock response that mimics the structure of a real Typesense API call.
// It allows us to build the frontend without a live Typesense server.
const mockTypesenseResponse = {
  found: 2, // Total number of matching documents
  hits: [
    {
      document: {
        id: '1',
        title: 'A Profound Near-Death Experience: A Doctor\'s Story',
        content: 'I left my body and saw a brilliant, loving light. It was a classic life review moment where I understood everything.',
        videoId: 'video123',
        channelName: 'Love Covered Life',
        isNde: 'clear_nde',
        viewCount: 150000,
        date: new Date('2023-01-15').getTime() / 1000,
        thumbnailUrl: 'https://i.ytimg.com/vi/example1/hqdefault.jpg',
        url: 'https://www.youtube.com/watch?v=example1',
        start_time: 125.5,
      },
    },
    {
        document: {
          id: '2',
          title: 'Journey to the Other Side and Back',
          content: 'The tunnel of light opened up before me, and I felt an overwhelming sense of peace. My life review was not a judgment, but a lesson in love.',
          videoId: 'video456',
          channelName: 'NDE Stories',
          isNde: 'clear_nde',
          viewCount: 75000,
          date: new Date('2022-11-20').getTime() / 1000,
          thumbnailUrl: 'https://i.ytimg.com/vi/example2/hqdefault.jpg',
          url: 'https://www.youtube.com/watch?v=example2',
          start_time: 302.1,
        },
      },
  ],
  facet_counts: [
    {
      field_name: 'channelName',
      counts: [
        { count: 1, value: 'Love Covered Life' },
        { count: 1, value: 'NDE Stories' },
        { count: 5, value: 'Another Channel' },
      ],
    },
    {
        field_name: 'isNde',
        counts: [
            { count: 2, value: 'clear_nde'},
            { count: 8, value: 'possible_nde'},
        ]
    }
  ],
};

export async function POST(req: NextRequest) {
  // In the future, this function will receive search parameters and query a real Typesense instance.
  // For now, it just returns the mock data.
  // const { searchTerm, filters } = await req.json();

  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

  return NextResponse.json(mockTypesenseResponse);
}
