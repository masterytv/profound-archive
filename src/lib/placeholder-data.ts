export type SearchResult = {
  id: string;
  account: string;
  date: string;
  snippet: string;
  tags: string[];
};

export const sampleSearchResults: SearchResult[] = [
  {
    id: 'nde-1',
    account: 'Jane D.',
    date: '2022-03-15',
    snippet: 'I felt an overwhelming sense of peace and love. There was a brilliant light that enveloped me, and I knew that everything was going to be okay. The colors were more vivid than anything I have ever seen.',
    tags: ['peace', 'light', 'love', 'colors'],
  },
  {
    id: 'nde-2',
    account: 'John S.',
    date: '2021-11-20',
    snippet: 'My life flashed before my eyes, not as a judgment, but as a review. I saw how my actions affected others, both good and bad. It was a profound learning experience.',
    tags: ['life review', 'learning', 'actions'],
  },
  {
    id: 'nde-3',
    account: 'Maria G.',
    date: '2023-01-05',
    snippet: 'I was greeted by my grandmother who had passed away years ago. She looked vibrant and healthy. We communicated without words, just pure thought and understanding.',
    tags: ['deceased relatives', 'telepathy', 'greeting'],
  },
    {
    id: 'nde-4',
    account: 'Anonymous',
    date: '2020-07-30',
    snippet: 'There was no concept of time or space. I was pure consciousness, connected to everything in the universe. It was a feeling of complete unity and belonging.',
    tags: ['timelessness', 'unity', 'consciousness'],
  },
];
