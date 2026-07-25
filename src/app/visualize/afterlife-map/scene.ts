/**
 * The Afterlife Map — imperative Three.js scene.
 *
 * Kept out of React entirely: React owns the panels and controls, this class owns the
 * render loop. They talk through the small method surface at the bottom of the file.
 *
 * The central visual claim: **brightness is consensus.** A place's radius and emissive
 * strength are both functions of how many experiencers reported it, so the map reads as a
 * night sky in which the things nearly everyone saw blaze, and the rare, strange details
 * are faint motes you only resolve by travelling close to them.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Place, StratumKey } from './types';

// ─── Palette ────────────────────────────────────────────────────────────────
// WebGL colours live in JS (they are not CSS and have no design token equivalent).
export const CATEGORY_COLOR: Record<string, number> = {
  threshold: 0x6366f1,
  realm: 0xa78bfa,
  structure: 0xfbbf24,
  landscape: 0x34d399,
  boundary: 0xfb7185,
  process: 0x38bdf8,
  being: 0xf472b6,
  state: 0x2dd4bf,
};
const DISTRESS_COLOR = 0xdc2626;

/** Control points of the journey. The arc leaves the body, rises, and closes back on it. */
const SPINE: [number, number, number][] = [
  [0, -78, 6],      // 0.00  the body
  [26, -52, 26],    // 0.10  leaving
  [58, -18, 32],    // 0.22  the passage
  [64, 22, 12],     // 0.32  the light
  [30, 56, -22],    // 0.45  the realms
  [-22, 72, -36],   // 0.58  the review
  [-62, 62, -12],   // 0.70  the knowing
  [-74, 28, 22],    // 0.82  the boundary
  [-48, -22, 38],   // 0.92  the decision
  [-8, -72, 12],    // 1.00  the return
];

export interface NodeHit {
  id: string;
  x: number;
  y: number;
}

interface SceneCallbacks {
  onHover: (hit: NodeHit | null) => void;
  onSelect: (id: string | null) => void;
  /** Fired each frame with screen-space label anchors for the DOM overlay. */
  onLabels: (labels: { id: string; x: number; y: number; scale: number; visible: boolean }[]) => void;
  onProgress: (t: number) => void;
}

interface NodeRec {
  place: Place;
  group: THREE.Group;
  glow: THREE.Sprite;
  core: THREE.Mesh;
  basePos: THREE.Vector3;
  baseColor: THREE.Color;
  /** Current drawn confidence for the active stratum. */
  conf: number;
  dimmed: boolean;
}

/** Radial-gradient sprite texture, generated once and shared by every node. */
function glowTexture(): THREE.Texture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.22)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Deterministic per-id jitter so layout never shifts between loads. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export class AfterlifeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private curve: THREE.CatmullRomCurve3;
  private nodes: NodeRec[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);
  private clock = new THREE.Clock();
  private frame = 0;
  private raf = 0;
  private disposed = false;
  private hovered: string | null = null;
  private selected: string | null = null;
  private stratum: StratumKey = 'all';
  private tradition: string | null = null;
  private mode: 'overview' | 'travel' = 'overview';
  private travelT = 0;
  private reduced: boolean;
  private cb: SceneCallbacks;
  private container: HTMLElement;
  private membrane?: THREE.Mesh;
  private spineMat?: THREE.MeshBasicMaterial;
  private threadGroup = new THREE.Group();
  private threads: { line: THREE.Line; placeIds: Set<string>; mat: THREE.LineBasicMaterial }[] = [];
  private threadsOn = false;

  constructor(container: HTMLElement, places: Place[], cb: SceneCallbacks, opts: { reducedMotion: boolean; mobile: boolean; threads?: { cv: number; r: number[] }[] }) {
    this.container = container;
    this.cb = cb;
    this.reduced = opts.reducedMotion;

    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;

    this.renderer = new THREE.WebGLRenderer({ antialias: !opts.mobile, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.mobile ? 1.5 : 2));
    this.renderer.setClearColor(0x030014, 1);
    container.appendChild(this.renderer.domElement);

    this.scene.fog = new THREE.FogExp2(0x030014, 0.0032);

    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.5, 900);
    this.camera.position.set(118, 26, 152);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 420;
    this.controls.autoRotate = !opts.reducedMotion;
    this.controls.autoRotateSpeed = 0.22;

    this.curve = new THREE.CatmullRomCurve3(SPINE.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.4);

    this.buildStars(opts.mobile ? 1400 : 3600);
    this.buildSpine();
    this.buildMembrane();
    this.buildNodes(places);
    if (opts.threads?.length) this.buildThreads(places, opts.threads, opts.mobile);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.animate();
  }

  // ─── Construction ─────────────────────────────────────────────────────────

  private buildStars(count: number) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Shell distribution keeps stars behind the map rather than inside it.
      const r = 260 + Math.random() * 340;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.7;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const t = 0.5 + Math.random() * 0.5;
      col[i * 3] = t; col[i * 3 + 1] = t * (0.9 + Math.random() * 0.1); col[i * 3 + 2] = 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.scene.add(new THREE.Points(g, new THREE.PointsMaterial({
      size: 1.5, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false,
    })));
  }

  private buildSpine() {
    const geo = new THREE.TubeGeometry(this.curve, 320, 0.45, 8, false);
    this.spineMat = new THREE.MeshBasicMaterial({
      color: 0xc7d8ff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.scene.add(new THREE.Mesh(geo, this.spineMat));

    // A wider, fainter sheath so the path reads as luminous rather than wireframe.
    this.scene.add(new THREE.Mesh(
      new THREE.TubeGeometry(this.curve, 200, 3.2, 8, false),
      new THREE.MeshBasicMaterial({ color: 0x5b7cf5, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false }),
    ));
  }

  /**
   * The Rubicon: rendered as a membrane across the path at the measured position of the
   * point-of-no-return reports. Nothing is drawn beyond it, because no account describes
   * the far side — the map ends where the evidence does.
   */
  private buildMembrane() {
    const at = this.curve.getPointAt(0.82);
    const tan = this.curve.getTangentAt(0.82);
    // A faint disc plus a hard rim: the disc suggests a membrane, the rim makes it read as a
    // deliberate edge rather than a smudge.
    const geo = new THREE.RingGeometry(3, 21, 72);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfb7185, transparent: true, opacity: 0.05, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.membrane = new THREE.Mesh(geo, mat);
    this.membrane.position.copy(at);
    this.membrane.lookAt(at.clone().add(tan));
    this.scene.add(this.membrane);

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(20.5, 21, 72),
      new THREE.MeshBasicMaterial({ color: 0xfda4af, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    rim.position.copy(at);
    rim.quaternion.copy(this.membrane.quaternion);
    this.scene.add(rim);
  }

  private buildNodes(places: Place[]) {
    const tex = glowTexture();
    for (const p of places) {
      const t = Math.min(0.999, Math.max(0.001, p.position));
      const on = this.curve.getPointAt(t);
      const tan = this.curve.getTangentAt(t);
      // Build a stable frame around the spine to hang nodes off.
      const up = new THREE.Vector3(0, 1, 0);
      const side = new THREE.Vector3().crossVectors(tan, up).normalize();
      const outward = new THREE.Vector3().crossVectors(side, tan).normalize();

      const j = hash(p.id);
      const j2 = hash(p.id + '~');
      // Category decides which band the node occupies; distress pulls it into a dark lobe.
      const bandRadius = { landscape: 40, structure: 52, realm: 30, being: 22, threshold: 14, boundary: 18, process: 26, state: 10 }[p.category] ?? 24;
      const angle = j * Math.PI * 2;
      const radius = bandRadius * (0.55 + j2 * 0.75);

      const pos = on.clone()
        .add(side.clone().multiplyScalar(Math.cos(angle) * radius))
        .add(outward.clone().multiplyScalar(Math.sin(angle) * radius * 0.75));

      if (p.tone === 'distressing') {
        pos.y -= 34 + j * 26;           // the dark places sit below the arc
        pos.multiplyScalar(0.82);
      }

      const color = new THREE.Color(p.tone === 'distressing' ? DISTRESS_COLOR : (CATEGORY_COLOR[p.category] ?? 0x94a3b8));

      const group = new THREE.Group();
      group.position.copy(pos);

      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
      }));
      group.add(glow);

      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshBasicMaterial({ color: color.clone().lerp(new THREE.Color(0xffffff), 0.55) }),
      );
      group.add(core);

      this.scene.add(group);
      this.nodes.push({ place: p, group, glow, core, basePos: pos.clone(), baseColor: color, conf: 0, dimmed: false });
    }
    this.relax();
    this.applyScales();
  }

  /**
   * Journey positions cluster heavily (a great many places are reported mid-experience), so
   * the raw layout overlaps. A few passes of mutual repulsion, constrained so nodes stay near
   * their measured position on the arc, makes the map legible without moving anything far
   * enough to misrepresent where it sits in the journey.
   */
  private relax() {
    // Keep sprites from overlapping: half of each glow's drawn diameter, plus breathing room.
    const minGap = (a: NodeRec, b: NodeRec) =>
      6 + (this.glowSize(a.place.confidence.all) + this.glowSize(b.place.confidence.all)) * 0.34;
    for (let iter = 0; iter < 60; iter++) {
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const a = this.nodes[i], b = this.nodes[j];
          const d = a.group.position.distanceTo(b.group.position);
          const want = minGap(a, b);
          if (d >= want || d < 1e-4) continue;
          const push = (want - d) * 0.5 * 0.35;
          const dir = new THREE.Vector3().subVectors(b.group.position, a.group.position).normalize().multiplyScalar(push);
          b.group.position.add(dir);
          a.group.position.sub(dir);
        }
      }
      // Tether back toward the measured spine position so relaxation cannot drift a place
      // into the wrong part of the journey.
      for (const n of this.nodes) {
        const anchor = this.curve.getPointAt(Math.min(0.999, Math.max(0.001, n.place.position)));
        const off = new THREE.Vector3().subVectors(n.group.position, anchor);
        // Hug the arc: if nodes wander too far the journey stops being readable as a route.
        const maxR = 46;
        if (off.length() > maxR) n.group.position.copy(anchor).add(off.setLength(maxR));
      }
    }
    for (const n of this.nodes) n.basePos.copy(n.group.position);
  }

  /**
   * One faint line per sampled account, threaded through the places that person reported,
   * in the order they narrated them. Turned on, the map stops being an average and becomes
   * visibly woven out of individual journeys — and selecting a place lights up everyone who
   * passed through it.
   */
  private buildThreads(places: Place[], routes: { cv: number; r: number[] }[], mobile: boolean) {
    const nodePos = this.nodes.map(n => n.basePos);
    const take = mobile ? Math.min(160, routes.length) : routes.length;
    for (let i = 0; i < take; i++) {
      const route = routes[i].r.filter(idx => idx >= 0 && idx < nodePos.length);
      if (route.length < 3) continue;
      const pts = route.map(idx => nodePos[idx]);
      // A gentle spline keeps the threads reading as paths rather than scribble.
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.25);
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(Math.min(90, route.length * 9)));
      const mat = new THREE.LineBasicMaterial({
        color: routes[i].cv >= 18 ? 0x86efac : 0x7dd3fc,
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      this.threadGroup.add(line);
      this.threads.push({ line, mat, placeIds: new Set(route.map(idx => places[idx].id)) });
    }
    this.scene.add(this.threadGroup);
  }

  // ─── Data-driven sizing ───────────────────────────────────────────────────

  /** sqrt keeps a 4%-place visible instead of vanishing next to a 44%-place. */
  private glowSize(conf: number) { return 6 + Math.sqrt(conf) * 42; }

  /**
   * Radius and opacity both scale with prevalence, so the statistic is legible as light.
   */
  private applyScales() {
    for (const n of this.nodes) {
      const conf = n.place.confidence[this.stratum] ?? 0;
      n.conf = conf;
      n.glow.scale.setScalar(this.glowSize(conf));
      n.core.scale.setScalar(Math.max(0.5, 0.7 + Math.sqrt(conf) * 3.2));

      const traditionMatch = !this.tradition
        || n.place.aliases.some(a => a.traditionTags?.some(t => t.toLowerCase() === this.tradition));
      n.dimmed = !traditionMatch;

      // Rare places must stay perceptible up close, so the floor is generous; the size
      // difference, not opacity alone, carries the prevalence signal.
      const base = 0.42 + Math.sqrt(conf) * 0.55;
      (n.glow.material as THREE.SpriteMaterial).opacity = n.dimmed ? base * 0.1 : base;
      (n.core.material as THREE.MeshBasicMaterial).opacity = n.dimmed ? 0.1 : 1;
      (n.core.material as THREE.MeshBasicMaterial).transparent = true;
      n.core.visible = conf > 0.004;
      n.glow.visible = conf > 0;
    }
  }

  // ─── Interaction ──────────────────────────────────────────────────────────

  private onPointerMove = (e: PointerEvent) => {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };

  private onPointerDown = () => {
    this.cb.onSelect(this.hovered);
    this.selected = this.hovered;
  };

  private pick(): NodeRec | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // Sprites raycast reliably and always face the camera, so the hit area matches what is drawn.
    const sprites = this.nodes.filter(n => n.glow.visible && !n.dimmed).map(n => n.glow);
    const hits = this.raycaster.intersectObjects(sprites, false);
    if (!hits.length) return null;
    const s = hits[0].object as THREE.Sprite;
    return this.nodes.find(n => n.glow === s) ?? null;
  }

  // ─── Loop ─────────────────────────────────────────────────────────────────

  private animate = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();
    const t = this.clock.elapsedTime;
    this.frame++;

    if (this.mode === 'travel') {
      const p = this.curve.getPointAt(Math.min(0.999, Math.max(0.001, this.travelT)));
      const ahead = this.curve.getPointAt(Math.min(0.999, this.travelT + 0.02));
      // Ride slightly outside the spine so the path is visible rather than filling the lens.
      this.camera.position.lerp(p.clone().add(new THREE.Vector3(0, 9, 0)), 1 - Math.pow(0.001, dt));
      this.controls.target.lerp(ahead, 1 - Math.pow(0.001, dt));
    }

    if (!this.reduced) {
      for (const n of this.nodes) {
        // Slow individual breathing keeps the field alive without implying motion in the data.
        const k = 1 + Math.sin(t * 0.6 + n.basePos.x * 0.05) * 0.035;
        n.glow.scale.setScalar(this.glowSize(n.conf) * k);
        n.core.rotation.y += dt * 0.25;
      }
      if (this.membrane) (this.membrane.material as THREE.MeshBasicMaterial).opacity = 0.08 + Math.sin(t * 0.7) * 0.035;
    }

    // Picking every third frame is imperceptible and keeps the loop cheap.
    if (this.frame % 3 === 0) {
      const hit = this.pick();
      const id = hit?.place.id ?? null;
      if (id !== this.hovered) {
        this.hovered = id;
        this.renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
        if (hit) {
          const v = hit.group.position.clone().project(this.camera);
          const r = this.renderer.domElement.getBoundingClientRect();
          this.cb.onHover({ id: hit.place.id, x: ((v.x + 1) / 2) * r.width, y: ((-v.y + 1) / 2) * r.height });
        } else this.cb.onHover(null);
      }
    }

    // Highlight ring for the current selection.
    for (const n of this.nodes) {
      const isSel = n.place.id === this.selected;
      const isHov = n.place.id === this.hovered;
      const target = isSel ? 1.0 : isHov ? 0.75 : 0.0;
      const m = n.core.material as THREE.MeshBasicMaterial;
      m.color.copy(n.baseColor).lerp(new THREE.Color(0xffffff), 0.45 + target * 0.5);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    if (this.frame % 2 === 0) this.emitLabels();
  };

  private emitLabels() {
    const r = this.renderer.domElement.getBoundingClientRect();
    const cand: { id: string; x: number; y: number; scale: number; visible: boolean; prio: number }[] = [];
    const camPos = this.camera.position;
    for (const n of this.nodes) {
      if (!n.glow.visible || n.dimmed) continue;
      const dist = camPos.distanceTo(n.group.position);
      const pinned = n.place.id === this.selected || n.place.id === this.hovered;
      // Label a place when many people reported it, or when you have come close enough to it —
      // which is how the rare, strange details are meant to be discovered rather than listed.
      const worthLabelling = pinned || n.conf > 0.16 || dist < 75;
      const v = n.group.position.clone().project(this.camera);
      const onScreen = v.z < 1 && v.x > -1.02 && v.x < 1.02 && v.y > -1.02 && v.y < 1.02;
      if (!worthLabelling || !onScreen) continue;
      cand.push({
        id: n.place.id,
        x: ((v.x + 1) / 2) * r.width,
        y: ((-v.y + 1) / 2) * r.height,
        scale: Math.max(0.75, Math.min(1.3, 110 / dist)),
        visible: true,
        prio: pinned ? 1e6 : n.conf * 1000 - dist * 0.1,
      });
    }
    // Greedy de-collision: the most-reported (and pinned) labels win their space, the rest
    // drop out. Without this the mid-journey cluster is an unreadable pile of text.
    cand.sort((a, b) => b.prio - a.prio);
    const placed: typeof cand = [];
    for (const c of cand) {
      const clash = placed.some(p => Math.abs(p.x - c.x) < 88 && Math.abs(p.y - c.y) < 15);
      if (!clash) placed.push(c);
    }
    this.cb.onLabels(placed);
  }

  // ─── Public surface ───────────────────────────────────────────────────────

  setStratum(s: StratumKey) { this.stratum = s; this.applyScales(); }

  setThreads(on: boolean) { this.threadsOn = on; this.applyThreads(); }

  /** Threads through the selected place burn brighter; the rest recede. */
  private applyThreads() {
    for (const t of this.threads) {
      if (!this.threadsOn) { t.mat.opacity = 0; continue; }
      const through = this.selected ? t.placeIds.has(this.selected) : false;
      t.mat.opacity = this.selected ? (through ? 0.55 : 0.015) : 0.14;
    }
    this.threadGroup.visible = this.threadsOn;
  }

  setTradition(tr: string | null) { this.tradition = tr ? tr.toLowerCase() : null; this.applyScales(); }

  setMode(m: 'overview' | 'travel') {
    this.mode = m;
    this.controls.autoRotate = m === 'overview' && !this.reduced;
    this.controls.enablePan = m === 'overview';
  }

  setTravel(t: number) { this.travelT = Math.max(0, Math.min(1, t)); this.cb.onProgress(this.travelT); }

  setSelected(id: string | null) { this.selected = id; this.applyThreads(); }

  /** Fly the camera to a place and frame it. */
  focus(id: string) {
    const n = this.nodes.find(x => x.place.id === id);
    if (!n) return;
    this.mode = 'overview';
    this.controls.autoRotate = false;
    const dir = new THREE.Vector3().subVectors(this.camera.position, n.group.position).normalize();
    const dest = n.group.position.clone().add(dir.multiplyScalar(46));
    const from = this.camera.position.clone();
    const fromT = this.controls.target.clone();
    const start = performance.now();
    const step = () => {
      if (this.disposed) return;
      const k = Math.min(1, (performance.now() - start) / 900);
      const e = 1 - Math.pow(1 - k, 3);
      this.camera.position.lerpVectors(from, dest, e);
      this.controls.target.lerpVectors(fromT, n.group.position, e);
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }

  resetView() {
    this.mode = 'overview';
    this.controls.autoRotate = !this.reduced;
    this.camera.position.set(118, 26, 152);
    this.controls.target.set(0, 0, 0);
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.controls.dispose();
    this.scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = (m as unknown as { material?: THREE.Material | THREE.Material[] }).material;
      if (Array.isArray(mat)) mat.forEach(x => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
