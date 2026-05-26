-- viz_graph_cache: Pre-computed graph data for 3D visualizations.
-- Each visualization stores its complete nodes+edges JSON here.
-- API routes do a simple SELECT; computation happens in background scripts.

CREATE TABLE IF NOT EXISTS viz_graph_cache (
  viz_id TEXT PRIMARY KEY,             -- e.g. 'nde-elements', 'uap-phenomenology'
  graph_json JSONB NOT NULL,           -- complete {nodes, edges, metadata} payload
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  row_count INTEGER,                   -- how many source rows were processed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: public read, service_role write
ALTER TABLE viz_graph_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viz_graph_cache_public_read"
  ON viz_graph_cache FOR SELECT
  USING (true);

CREATE POLICY "viz_graph_cache_service_write"
  ON viz_graph_cache FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE viz_graph_cache IS 'Pre-computed graph JSON for 3D visualization pages. Populated by scripts/viz-compute-*.ts, read by /api/viz/* routes.';
