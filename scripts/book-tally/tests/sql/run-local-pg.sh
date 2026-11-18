#!/usr/bin/env bash
# Applies the book-tally migration + rollback + behaviour test to a THROWAWAY local
# Postgres cluster (never the real database). Needs a Postgres server binary dir.
# Usage: PGBIN=/usr/lib/postgresql/16/bin PGRUN=<writable dir> scripts/book-tally/tests/sql/run-local-pg.sh
# Run as a non-root user (or via runuser -u postgres) if postgres refuses root.
set -euo pipefail
PGBIN=${PGBIN:?set PGBIN}; PGRUN=${PGRUN:?set PGRUN (scratch dir)}; PORT=${PGPORT:-54329}
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
mkdir -p "$PGRUN"
[ -d "$PGRUN/data" ] || "$PGBIN/initdb" -D "$PGRUN/data" -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$PGRUN/data" -o "-p $PORT -k $PGRUN -c listen_addresses=''" -l "$PGRUN/log" -w start >/dev/null
trap '"$PGBIN/pg_ctl" -D "$PGRUN/data" -m fast stop >/dev/null' EXIT
P="psql -h $PGRUN -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$P -c "DROP DATABASE IF EXISTS bt_test" -c "CREATE DATABASE bt_test"
P="$P -d bt_test"
$P <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
CREATE TABLE public.nde_vids("videoId" text PRIMARY KEY);
CREATE TABLE public.nde_questions(id integer PRIMARY KEY);
CREATE TABLE public.experiencer_profiles(id bigint PRIMARY KEY);
CREATE TABLE public.nde_analysis(video_id text PRIMARY KEY, experience_type text);
INSERT INTO nde_vids VALUES ('v1'),('v2'),('v3'),('v4');
INSERT INTO nde_questions VALUES (1),(2),(3),(4),(5);
INSERT INTO experiencer_profiles VALUES (10),(11),(12);
INSERT INTO nde_analysis VALUES ('v1','nde'),('v2','nde'),('v3','nde'),('v4','nde'),('v5','nde'),('v6','nde'),('v7','nde'),('u1','nde'),('u2','nde'),('s1','ste');
SQL
$P -f "$ROOT/supabase/migrations/20261118_001_book_tally.sql"
$P -f "$ROOT/supabase/rollbacks/20261118_001_book_tally_rollback.sql"
$P -f "$ROOT/supabase/migrations/20261118_001_book_tally.sql"
$P -t -f "$HERE/behavior.sql"
# 002 (codebook coding): apply, roll back (001 must survive), re-apply, then its behaviour test.
$P -f "$ROOT/supabase/migrations/20261118_002_book_tally_codebook.sql"
$P -f "$ROOT/supabase/rollbacks/20261118_002_book_tally_codebook_rollback.sql"
$P -c "DO \$\$ BEGIN IF to_regclass('public.bt_runs') IS NULL OR to_regclass('public.bt_coded_answers') IS NOT NULL THEN RAISE EXCEPTION 'rollback 002 removed the wrong objects'; END IF; END \$\$"
$P -f "$ROOT/supabase/migrations/20261118_002_book_tally_codebook.sql"
$P -t -f "$HERE/codebook-behavior.sql"
