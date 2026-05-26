import { NextResponse } from 'next/server';

/**
 * GET /api/viz/countries
 * 
 * Server-side proxy for world-atlas TopoJSON → GeoJSON conversion.
 * Fetches from jsdelivr CDN on the server (no browser CSP restrictions)
 * and converts TopoJSON to GeoJSON for the globe visualization.
 */

export const revalidate = 86400; // Cache for 24 hours — this data never changes

// ─── TopoJSON → GeoJSON converter ──────────────────────────────────────────

function topoToGeo(topology: any, objectName: string) {
  const obj = topology.objects[objectName];
  if (!obj) return { type: 'FeatureCollection', features: [] };

  const { arcs: topoArcs, transform } = topology;

  const decodeArc = (arcIdx: number) => {
    const reverse = arcIdx < 0;
    const idx = reverse ? ~arcIdx : arcIdx;
    const arc = topoArcs[idx];
    const coords: [number, number][] = [];
    let x = 0, y = 0;
    for (const [dx, dy] of arc) {
      x += dx;
      y += dy;
      coords.push([
        transform ? x * transform.scale[0] + transform.translate[0] : x,
        transform ? y * transform.scale[1] + transform.translate[1] : y,
      ]);
    }
    if (reverse) coords.reverse();
    return coords;
  };

  const decodeRing = (ring: number[]) => {
    const coords: [number, number][] = [];
    for (const arcIdx of ring) {
      const arcCoords = decodeArc(arcIdx);
      coords.push(...(coords.length ? arcCoords.slice(1) : arcCoords));
    }
    return coords;
  };

  const features = (obj.type === 'GeometryCollection' ? obj.geometries : [obj]).map(
    (geom: any) => {
      let coordinates;
      if (geom.type === 'Polygon') {
        coordinates = geom.arcs.map(decodeRing);
      } else if (geom.type === 'MultiPolygon') {
        coordinates = geom.arcs.map((polygon: any) => polygon.map(decodeRing));
      } else {
        coordinates = [];
      }
      return {
        type: 'Feature',
        properties: geom.properties || {},
        geometry: { type: geom.type, coordinates },
      };
    },
  );

  return { type: 'FeatureCollection', features };
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
      { next: { revalidate: 86400 } },
    );

    if (!res.ok) {
      throw new Error(`world-atlas fetch failed: ${res.status}`);
    }

    const topo = await res.json();
    const geoJson = topoToGeo(topo, 'countries');

    return NextResponse.json(geoJson, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (err) {
    console.error('[viz/countries] Error:', err);
    // Return empty FeatureCollection as graceful fallback
    return NextResponse.json(
      { type: 'FeatureCollection', features: [] },
      { status: 200 },
    );
  }
}
