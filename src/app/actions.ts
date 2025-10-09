'use server';

import { compassionateChatbotAnswers, CompassionateChatbotOutput } from '@/ai/flows/compassionate-chatbot-answers';
import { z } from 'zod';

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
