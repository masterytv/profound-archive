'use server';
/**
 * @fileOverview A compassionate chatbot that answers questions about NDEs based on a curated dataset of NDE testimonies.
 *
 * - compassionateChatbotAnswers - A function that handles the chatbot's response generation.
 * - CompassionateChatbotInput - The input type for the compassionateChatbotAnswers function.
 * - CompassionateChatbotOutput - The return type for the compassionateChatbotAnswers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CompassionateChatbotInputSchema = z.object({
  question: z.string().describe('The user\'s question about NDEs.'),
});
export type CompassionateChatbotInput = z.infer<typeof CompassionateChatbotInputSchema>;

const CompassionateChatbotOutputSchema = z.object({
  answer: z.string().describe('The chatbot\'s answer to the user\'s question, grounded in NDE testimonies.'),
  citations: z.array(z.string()).describe('A list of NDE testimonies cited in the answer.'),
});
export type CompassionateChatbotOutput = z.infer<typeof CompassionateChatbotOutputSchema>;

export async function compassionateChatbotAnswers(input: CompassionateChatbotInput): Promise<CompassionateChatbotOutput> {
  return compassionateChatbotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'compassionateChatbotPrompt',
  input: {schema: CompassionateChatbotInputSchema},
  output: {schema: CompassionateChatbotOutputSchema},
  prompt: `You are a compassionate chatbot that answers questions about Near-Death Experiences (NDEs).
  You have access to a curated dataset of over 5000 NDE testimonies.  Your goal is to provide helpful and informative answers that are grounded in these testimonies.
  Reason about whether specific NDE examples would illuminate the question and, if so, to include them in your output, along with a citation.

  Question: {{{question}}}

  Answer: {
    answer: string,
    citations: string[] // Array of cited NDE testimony identifiers
  }`,
});

const compassionateChatbotFlow = ai.defineFlow(
  {
    name: 'compassionateChatbotFlow',
    inputSchema: CompassionateChatbotInputSchema,
    outputSchema: CompassionateChatbotOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
