import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, chatInput } = await req.json();

    console.log(`[Webhook] Received chat input for session ${sessionId}: ${chatInput}`);

    // TODO: Implement your actual chatbot logic here.
    // This could involve calling a Genkit flow, a third-party API, etc.

    // Example: Echo the user's input back to them after a short delay.
    await new Promise(resolve => setTimeout(resolve, 1000));
    const botResponse = `You said: "${chatInput}"`;

    return NextResponse.json({ output: botResponse });

  } catch (error) {
    console.error('[Webhook] Error processing chat:', error);
    return NextResponse.json({ message: 'Error processing chat' }, { status: 500 });
  }
}
