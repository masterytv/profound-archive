
import Typesense from 'typesense';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkSchema() {
    const host = process.env.TYPESENSE_HOST;
    const apiKey = process.env.TYPESENSE_API_KEY;
    const protocol = process.env.TYPESENSE_PROTOCOL || 'http';
    const port = parseInt(process.env.TYPESENSE_PORT || '8108', 10);

    if (!host || !apiKey) {
        console.error("Missing credentials");
        process.exit(1);
    }

    const client = new Typesense.Client({
        nodes: [{ host, port, protocol }],
        apiKey,
        connectionTimeoutSeconds: 5
    });

    try {
        const collections = await client.collections().retrieve();
        console.log(JSON.stringify(collections, null, 2));
    } catch (err) {
        console.error("Error retrieving collections:", err);
    }
}

checkSchema();
