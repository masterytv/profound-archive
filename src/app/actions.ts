'use server';

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
