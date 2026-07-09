/**
 * Batched inserts for pgvector embedding rows.
 *
 * Why batching: single-row inserts pay one statement + one WAL flush + one
 * HNSW index touch per row (~600ms/row observed). Sustained across the
 * pipelines, that drained the Supabase disk-IO budget and wedged the
 * database on 2026-07-06. Batches amortize that overhead ~25x.
 *
 * Batch size: PostgREST requests run under the AUTHENTICATOR login role's
 * statement_timeout=8s unless the impersonated role overrides it. Batches of
 * 25 needed ~10-15s on a cold HNSW index and timed out constantly (measured
 * 2026-07-09: 32 batch timeouts). Two-part fix: service_role now carries
 * statement_timeout=60s (ALTER ROLE, 2026-07-09), and batches of 10 fit
 * under even the 8s window if that override is ever lost. If a batch still
 * fails, it retries row-by-row so one bad row can't sink the others.
 */

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 250;
const ROW_RETRY_DELAY_MS = 100;

export async function insertEmbeddingRows(
    supabase: any,
    table: string,
    rows: Record<string, unknown>[],
): Promise<number> {
    let inserted = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from(table).insert(batch);

        if (error) {
            const msg = (error.message || '').replace(/\s+/g, ' ').slice(0, 200);
            console.warn(`[Embed-Insert] Batch insert into ${table} failed (${msg}); retrying rows individually`);

            for (let j = 0; j < batch.length; j++) {
                const { error: rowError } = await supabase.from(table).insert(batch[j]);
                if (rowError) {
                    const rowMsg = (rowError.message || '').replace(/\s+/g, ' ').slice(0, 200);
                    throw new Error(`Failed to insert row ${i + j} into ${table}: ${rowMsg}`);
                }
                inserted++;
                if (j < batch.length - 1) await new Promise(r => setTimeout(r, ROW_RETRY_DELAY_MS));
            }
        } else {
            inserted += batch.length;
        }

        if (i + BATCH_SIZE < rows.length) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }

    return inserted;
}
