import { NextRequest, NextResponse } from 'next/server';

// Ensure the route is always treated as dynamic, preventing static optimization issues
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[API Search] Forwarding body:", JSON.stringify(body));

    const webhookUrl = "https://n8n.awetomatic.com/webhook/4e993b0f-a3be-42ba-925d-4c5f78b3381c";
    
    // Proxy the request to N8N
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add a User-Agent to prevent some WAFs/Firewalls from blocking the server-to-server request
        "User-Agent": "NextJS-ProfoundArchive-Proxy/1.0"
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[API Search] Upstream Error (${response.status}):`, text);
      return NextResponse.json({ error: `Upstream error: ${response.status}`, details: text }, { status: response.status });
    }

    const textData = await response.text();
    // Check if the response is actually JSON before parsing
    try {
        const data = JSON.parse(textData);
        return NextResponse.json(data);
    } catch (e) {
        console.error("[API Search] JSON Parse Error. Upstream returned:", textData.substring(0, 200));
        return NextResponse.json({ error: "Invalid JSON from upstream", raw: textData.substring(0, 200) }, { status: 502 });
    }

  } catch (error) {
    console.error('[API Search] Internal Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
