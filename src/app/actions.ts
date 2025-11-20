'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { compassionateChatbotAnswers, CompassionateChatbotOutput } from '@/ai/flows/compassionate-chatbot-answers';
import { z } from 'zod';

// Action to add a video to a user's default "Favorites" collection
export async function addVideoToFavorites(videoId: string, videoTitle: string) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to favorite a video.' };
  }

  // 1. Find or create the user's default "Favorites" collection
  let { data: collection } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', 'Favorites')
    .single();

  if (!collection) {
    const { data: newCollection, error } = await supabase
      .from('collections')
      .insert({ user_id: user.id, name: 'Favorites' })
      .select('id')
      .single();
    if (error) return { error: 'Could not create favorites collection.' };
    collection = newCollection;
  }

  // 2. Insert the video into the favorites table
  const { error } = await supabase.from('favorites').insert({
    user_id: user.id,
    collection_id: collection.id,
    video_id: videoId,
    video_title: videoTitle,
  });

  if (error) {
    // Handle potential duplicate error gracefully
    if (error.code === '23505') {
        return { message: 'Already in favorites.' };
    }
    return { error: `Could not favorite video. Reason: ${error.message}` };
  }

  revalidatePath('/search'); // Refresh the search page data if needed
  return { message: 'Added to favorites!' };
}


const contactFormSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
});

export async function sendContactMessage(values: z.infer<typeof contactFormSchema>) {
  // Simulate sending a message
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('Received contact message:', values);

  // In a real application, you would send an email or save this to a database.
  
  return { success: true, message: 'Message sent successfully!' };
}

export async function getChatResponse(question: string): Promise<{ success: boolean; data?: CompassionateChatbotOutput, error?: string }> {
  if (!question) {
    return { success: false, error: 'Question cannot be empty.' };
  }

  try {
    const response = await compassionateChatbotAnswers({ question });
    return { success: true, data: response };
  } catch (error) {
    console.error('Error getting chatbot response:', error);
    return { success: false, error: 'An error occurred while communicating with the chatbot.' };
  }
}
