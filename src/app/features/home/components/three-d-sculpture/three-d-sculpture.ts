import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  NgZone,
  HostListener,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   BRAND PALETTE
   ═══════════════════════════════════════════════════════════ */
const BLACK  = 0x080808;
const SILVER = 0xcdcbca;
const RED    = 0xd41514;

/* ═══════════════════════════════════════════════════════════════
   CUSTOM CURVES — Procedural parametric paths for TubeGeometry
   ═══════════════════════════════════════════════════════════ */

/** Möbius-inspired trefoil — the primary chrome structure.
 *  3-lobed modulation on the radius creates organic asymmetry,
 *  while the twist parameter adds vertical undulation. */
class MobiusTrefoilCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private radius = 2.4,
    private twist  = 2,
    private lobes  = 3,
    private vAmp   = 0.65,
  ) { super(); }

  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const a = t * Math.PI * 2;
    const r = this.radius + 0.5 * Math.sin(this.lobes * a) + 0.15 * Math.cos(5 * a);
    return target.set(
      r * Math.cos(a),
      this.vAmp * Math.sin(this.twist * a) + 0.12 * Math.cos(4 * a),
      r * Math.sin(a),
    );
  }
}

/** Liquid-metal ribbon — a wide, flat, swooping curve that
 *  feels like a curved chrome panel floating in space. */
class LiquidRibbonCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private radius = 1.8,
    private amp    = 0.7,
    private freq   = 2.5,
    private yShift = 0.3,
  ) { super(); }

  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const a = t * Math.PI * 2;
    const r = this.radius + 0.3 * Math.sin(3 * a);
    return target.set(
      r * Math.cos(a) * 1.15,
      this.yShift + this.amp * Math.sin(this.freq * a) * Math.cos(a * 0.5),
      r * Math.sin(a) * 0.85,
    );
  }
}

/** Tilted elliptical ring — used for the intersecting loops. */
class OrbitRingCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private r    = 1.6,
    private tilt = 0.4,
    private lean = 0.3,
    private yOff = 0,
  ) { super(); }

  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const a = t * Math.PI * 2;
    return target.set(
      this.r * Math.cos(a),
      this.yOff + this.r * Math.sin(a) * Math.sin(this.tilt),
      this.r * Math.sin(a) * Math.cos(this.lean),
    );
  }
}

/** Asymmetric swooping arc — a secondary accent curve. */
class SwoopCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private span = 2.8,
    private rise = 1.2,
    private bend = 0.6,
  ) { super(); }

  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const a = t * Math.PI * 2;
    return target.set(
      this.span * Math.cos(a) + this.bend * Math.sin(2 * a),
      this.rise * Math.sin(a) * Math.cos(0.5 * a),
      this.span * 0.7 * Math.sin(a),
    );
  }
}

/* ═══════════════════════════════════════════════════════════════
   PARTICLE SEED — generated once, read every frame
   ═══════════════════════════════════════════════════════════ */
interface ParticleSeed {
  baseX: number; baseY: number; baseZ: number;
  scale: number;
  spdY: number; spdX: number; spdZ: number;
  phY: number;  phX: number;  phZ: number;
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */
@Component({
  selector: 'app-three-d-sculpture',
  standalone: true,
  templateUrl: './three-d-sculpture.html',
  styleUrls: ['./three-d-sculpture.scss'],
})
export class ThreeDSculptureComponent implements AfterViewInit, OnDestroy {
  @ViewChild('sculptureCanvas')    canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sculptureContainer') containerRef!: ElementRef<HTMLDivElement>;

  webGLSupported = true;

  /* ── Three core ──────────────────────────────────────────────── */
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private animId = 0;

  /* ── Sculpture ───────────────────────────────────────────────── */
  private group = new THREE.Group();
  private ring1!: THREE.Mesh;
  private ring2!: THREE.Mesh;
  private ring3!: THREE.Mesh;
  private accentRing1!: THREE.Mesh;
  private accentRing2!: THREE.Mesh;
  private accentRing3!: THREE.Mesh;
  private ribbon!: THREE.Mesh;
  private particles!: THREE.InstancedMesh;
  private seeds: ParticleSeed[] = [];

  /* ── Red light references for hover ──────────────────────────── */
  private redLights: THREE.PointLight[] = [];

  /* ── Disposal arrays ─────────────────────────────────────────── */
  private mats:  THREE.Material[] = [];
  private geos:  THREE.BufferGeometry[] = [];
  private envTex: THREE.Texture | null = null;
  private pmrem:  THREE.PMREMGenerator | null = null;

  /* ── Interaction ─────────────────────────────────────────────── */
  private mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  private prefersReduced = false;
  private isMobile  = false;
  private isTablet  = false;
  private dprCap    = 2;

  /* ── Hover glow ──────────────────────────────────────────────── */
  private readonly GLO = 0.12;   // base emissive
  private readonly GLH = 0.48;   // hover emissive
  private gloC = this.GLO;
  private gloT = this.GLO;

  /* ── Hover light boost ───────────────────────────────────────── */
  private readonly RL_BASE = 1.2;
  private readonly RL_HOVER = 2.2;
  private rlC = this.RL_BASE;
  private rlT = this.RL_BASE;

  /* ── Scroll state ────────────────────────────────────────────── */
  private sX = 0; private sRotY = 0; private sScale = 1;
  private stInstance: ScrollTrigger | null = null;

  /* ── Misc ─────────────────────────────────────────────────────── */
  private resizeTmr = 0;

  constructor(
    private zone: NgZone,
    @Inject(PLATFORM_ID) private pid: object,
  ) {}

  /* ═══════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════ */

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.pid)) return;
    try {
      const c = document.createElement('canvas');
      this.webGLSupported = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch { this.webGLSupported = false; }
    if (!this.webGLSupported) return;

    this.prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.classify();

    this.zone.runOutsideAngular(() => {
      this.initRenderer();
      this.initScene();
      this.buildSculpture();
      this.initLights();
      this.initScroll();
      this.tick();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    clearTimeout(this.resizeTmr);
    this.stInstance?.kill();
    ScrollTrigger.getAll().forEach(s => s.kill());
    this.dispose();
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDERER
     ═══════════════════════════════════════════════════════════ */

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: !this.isMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.dprCap));
    this.renderer.setClearColor(BLACK, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.syncSize();
  }

  /* ═══════════════════════════════════════════════════════════════
     SCENE + PROCEDURAL STUDIO ENVIRONMENT
     ═══════════════════════════════════════════════════════════ */

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BLACK);
    this.scene.fog = new THREE.FogExp2(BLACK, 0.035);

    this.camera = new THREE.PerspectiveCamera(38, this.aspect(), 0.1, 100);
    this.camera.position.set(0, 0.3, 7.5);

    // Build a procedural studio cubemap for chrome reflections
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmrem.compileEquirectangularShader();

    const env = this.buildEnvScene();
    this.envTex = this.pmrem.fromScene(env, 0.04).texture;
    env.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach(x => x.dispose());
        else (mat as THREE.Material).dispose();
      }
    });
    this.scene.environment = this.envTex;
  }

  /** Procedural studio — large luminous panels surrounding the origin.
   *  Produces convincing chrome reflections with warm key, silver fill,
   *  red accents, and a dark floor. */
  private buildEnvScene(): THREE.Scene {
    const s = new THREE.Scene();
    s.background = new THREE.Color(0x010101);

    const P = (c: number, w: number, h: number, pos: [number, number, number], rot?: [number, number, number]) => {
      const g = new THREE.PlaneGeometry(w, h);
      const m = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(...pos);
      if (rot) mesh.rotation.set(...rot);
      else mesh.lookAt(0, 0, 0);
      s.add(mesh);
    };

    // Key — large warm softbox, upper right
    P(0xfff8f0, 14, 14, [6, 6, 6]);
    // Fill — silver, upper left
    P(SILVER,   12, 12, [-7, 3, -4]);
    // Rim — subtle back-light
    P(0xcccccc, 8, 8,   [0, 2, -8]);
    // Red accent panels
    P(RED,      5, 5,   [-4, -3, 5]);
    P(RED,      3, 3,   [5, 4, -3]);
    P(0x3a0505, 4, 4,   [3, -4, -5]);
    // Dark floor
    P(0x050505, 30, 30, [0, -7, 0], [-Math.PI / 2, 0, 0]);
    // Dark ceiling
    P(0x030303, 30, 30, [0, 8, 0], [Math.PI / 2, 0, 0]);

    return s;
  }

  /* ═══════════════════════════════════════════════════════════════
     SCULPTURE — 9 procedural elements
     ═══════════════════════════════════════════════════════════ */

  private buildSculpture(): void {
    const q = this.isMobile ? 0.45 : this.isTablet ? 0.7 : 1;

    /* ── Shared materials ────────────────────────────────────── */

    const chrome = new THREE.MeshPhysicalMaterial({
      color: SILVER,
      metalness: 1.0,
      roughness: 0.06,
      clearcoat: 0.5,
      clearcoatRoughness: 0.04,
      reflectivity: 1.0,
      envMapIntensity: 1.35,
    });

    const darkChrome = new THREE.MeshPhysicalMaterial({
      color: 0x141414,
      metalness: 1.0,
      roughness: 0.12,
      clearcoat: 0.35,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.1,
    });

    const mirrorBlack = new THREE.MeshPhysicalMaterial({
      color: 0x050505,
      metalness: 1.0,
      roughness: 0.03,
      clearcoat: 0.7,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.6,
    });

    const redMetal = new THREE.MeshPhysicalMaterial({
      color: RED,
      metalness: 0.92,
      roughness: 0.18,
      clearcoat: 0.5,
      clearcoatRoughness: 0.04,
      emissive: new THREE.Color(RED),
      emissiveIntensity: this.GLO,
      envMapIntensity: 0.9,
    });

    const redGlow = new THREE.MeshPhysicalMaterial({
      color: RED,
      metalness: 0.85,
      roughness: 0.25,
      emissive: new THREE.Color(RED),
      emissiveIntensity: this.GLO * 1.4,
      clearcoat: 0.3,
      envMapIntensity: 0.7,
    });

    this.mats.push(chrome, darkChrome, mirrorBlack, redMetal, redGlow);

    /* ── 1. Main Möbius trefoil — polished chrome hero piece ── */
    const g1 = new THREE.TubeGeometry(
      new MobiusTrefoilCurve(2.4, 2, 3, 0.65),
      Math.floor(240 * q), 0.2, Math.floor(18 * q), true,
    );
    this.group.add(new THREE.Mesh(g1, chrome));
    this.geos.push(g1);

    /* ── 2. Liquid-metal ribbon — mirror-black curved panel ── */
    const g2 = new THREE.TubeGeometry(
      new LiquidRibbonCurve(1.8, 0.7, 2.5, 0.3),
      Math.floor(180 * q), 0.14, Math.floor(14 * q), true,
    );
    this.ribbon = new THREE.Mesh(g2, mirrorBlack);
    this.ribbon.rotation.set(0.4, 0.8, -0.15);
    this.group.add(this.ribbon);
    this.geos.push(g2);

    /* ── 3. Interconnected loop 1 — dark chrome ─────────────── */
    const g3 = new THREE.TubeGeometry(
      new OrbitRingCurve(1.85, 1.1, 0.55),
      Math.floor(130 * q), 0.1, Math.floor(12 * q), true,
    );
    this.ring1 = new THREE.Mesh(g3, darkChrome);
    this.ring1.rotation.set(0.65, 0.25, 0.15);
    this.group.add(this.ring1);
    this.geos.push(g3);

    /* ── 4. Interconnected loop 2 — dark chrome ─────────────── */
    const g4 = new THREE.TubeGeometry(
      new OrbitRingCurve(1.5, 0.75, -0.45, 0.2),
      Math.floor(130 * q), 0.08, Math.floor(10 * q), true,
    );
    this.ring2 = new THREE.Mesh(g4, darkChrome);
    this.ring2.rotation.set(-0.35, 0.95, 0.45);
    this.group.add(this.ring2);
    this.geos.push(g4);

    /* ── 5. Interconnected loop 3 — chrome, counter-angle ──── */
    const g5 = new THREE.TubeGeometry(
      new OrbitRingCurve(1.2, 0.5, 0.8, -0.15),
      Math.floor(110 * q), 0.065, Math.floor(8 * q), true,
    );
    this.ring3 = new THREE.Mesh(g5, chrome);
    this.ring3.rotation.set(1.1, -0.4, 0.7);
    this.group.add(this.ring3);
    this.geos.push(g5);

    /* ── 6. Central toroidal knot — deep reflective core ──── */
    const g6 = new THREE.TorusKnotGeometry(
      0.85, 0.16, Math.floor(140 * q), Math.floor(20 * q), 2, 3,
    );
    this.group.add(new THREE.Mesh(g6, mirrorBlack));
    this.geos.push(g6);

    /* ── 7. Red accent ring — wide sweeping orbit ──────────── */
    const g7 = new THREE.TubeGeometry(
      new SwoopCurve(2.8, 1.2, 0.6),
      Math.floor(160 * q), 0.055, Math.floor(8 * q), true,
    );
    this.accentRing1 = new THREE.Mesh(g7, redMetal);
    this.accentRing1.rotation.set(0.2, -0.55, 0.1);
    this.group.add(this.accentRing1);
    this.geos.push(g7);

    /* ── 8. Red accent torus — thin illuminated ring ───────── */
    const g8 = new THREE.TorusGeometry(
      2.05, 0.028, Math.floor(8 * q), Math.floor(90 * q),
    );
    this.accentRing2 = new THREE.Mesh(g8, redGlow);
    this.accentRing2.rotation.set(1.25, 0.5, -0.2);
    this.group.add(this.accentRing2);
    this.geos.push(g8);

    /* ── 9. Red micro-ring — subtle edge accent ────────────── */
    const g9 = new THREE.TorusGeometry(
      1.4, 0.018, Math.floor(6 * q), Math.floor(60 * q),
    );
    this.accentRing3 = new THREE.Mesh(g9, redGlow);
    this.accentRing3.rotation.set(-0.6, 1.2, 0.3);
    this.group.add(this.accentRing3);
    this.geos.push(g9);

    /* ── 10. Floating chrome particles (instanced) ─────────── */
    const n = this.isMobile ? 35 : this.isTablet ? 70 : 140;
    const pg = new THREE.SphereGeometry(0.022, 6, 6);
    const pm = new THREE.MeshStandardMaterial({
      color: SILVER, metalness: 1.0, roughness: 0.15,
      emissive: new THREE.Color(SILVER), emissiveIntensity: 0.04,
    });
    this.particles = new THREE.InstancedMesh(pg, pm, n);
    const d = new THREE.Object3D();

    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 2.8 + Math.random() * 2.2;
      const sc    = 0.4 + Math.random() * 1.1;
      const bx = r * Math.sin(phi) * Math.cos(theta);
      const by = r * Math.sin(phi) * Math.sin(theta);
      const bz = r * Math.cos(phi);

      d.position.set(bx, by, bz);
      d.scale.setScalar(sc);
      d.updateMatrix();
      this.particles.setMatrixAt(i, d.matrix);

      this.seeds.push({
        baseX: bx, baseY: by, baseZ: bz, scale: sc,
        spdY: 0.3 + Math.random() * 0.7,
        spdX: 0.2 + Math.random() * 0.5,
        spdZ: 0.15 + Math.random() * 0.4,
        phY: Math.random() * Math.PI * 2,
        phX: Math.random() * Math.PI * 2,
        phZ: Math.random() * Math.PI * 2,
      });
    }
    this.particles.instanceMatrix.needsUpdate = true;
    this.group.add(this.particles);
    this.geos.push(pg);
    this.mats.push(pm);

    this.scene.add(this.group);
  }

  /* ═══════════════════════════════════════════════════════════════
     LIGHTING — professional studio rig
     ═══════════════════════════════════════════════════════════ */

  private initLights(): void {
    // Very subtle ambient
    this.scene.add(new THREE.AmbientLight(0x0c0c0c, 0.3));

    // Key — large warm directional, upper right
    const key = new THREE.DirectionalLight(0xfff5ee, 2.0);
    key.position.set(5, 6, 5);
    this.scene.add(key);

    // Fill — silver, left side
    const fill = new THREE.DirectionalLight(SILVER, 0.7);
    fill.position.set(-5, 2.5, -3);
    this.scene.add(fill);

    // Rim — silver backlight for edge definition
    const rim = new THREE.DirectionalLight(0xdedede, 1.0);
    rim.position.set(0, 1, -7);
    this.scene.add(rim);

    // Top accent — subtle downward
    const top = new THREE.DirectionalLight(0xffffff, 0.35);
    top.position.set(0, 8, 0);
    this.scene.add(top);

    // Red accent point lights (stored for hover modulation)
    const r1 = new THREE.PointLight(RED, this.RL_BASE, 16);
    r1.position.set(-3.5, -2, 3.5);
    this.scene.add(r1);
    this.redLights.push(r1);

    const r2 = new THREE.PointLight(RED, this.RL_BASE * 0.5, 12);
    r2.position.set(2.5, 3.5, -2.5);
    this.scene.add(r2);
    this.redLights.push(r2);

    const r3 = new THREE.PointLight(RED, this.RL_BASE * 0.3, 10);
    r3.position.set(0, -3, -4);
    this.scene.add(r3);
    this.redLights.push(r3);
  }

  /* ═══════════════════════════════════════════════════════════════
     GSAP SCROLLTRIGGER
     ═══════════════════════════════════════════════════════════ */

  private initScroll(): void {
    if (this.prefersReduced) return;
    const heroEl = document.getElementById('hero');
    if (!heroEl) return;

    this.stInstance = ScrollTrigger.create({
      trigger: heroEl,
      start: 'top top',
      end: 'bottom top',
      scrub: 1.5,
      onUpdate: (self) => {
        const p = self.progress;
        this.sX     = p * 3.0;
        this.sRotY  = p * 0.8;
        this.sScale = 1 - p * 0.18;
      },
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER LOOP
     ═══════════════════════════════════════════════════════════ */

  private tick = (): void => {
    this.animId = requestAnimationFrame(this.tick);
    const t  = this.clock.getElapsedTime();
    const sp = this.prefersReduced ? 0 : 1;

    /* ── Mouse interpolation ─────────────────────────────────── */
    this.mouse.x += (this.mouse.tx - this.mouse.x) * 0.045;
    this.mouse.y += (this.mouse.ty - this.mouse.y) * 0.045;

    /* ── Idle rotation + float ───────────────────────────────── */
    this.group.rotation.y += 0.0015 * sp;
    this.group.position.y  = Math.sin(t * 0.45) * 0.09 * sp;

    /* ── Mouse parallax ──────────────────────────────────────── */
    this.group.rotation.x = this.mouse.y *  0.12 * sp;
    this.group.rotation.z = this.mouse.x * -0.04 * sp;
    this.camera.position.x = this.mouse.x * 0.25;
    this.camera.position.y = 0.3 + this.mouse.y * 0.18;

    /* ── Independent ring rotations ──────────────────────────── */
    if (this.ring1)       this.ring1.rotation.z       +=  0.0028 * sp;
    if (this.ring2)       this.ring2.rotation.x       -= 0.0018 * sp;
    if (this.ring3)       this.ring3.rotation.y       +=  0.0022 * sp;
    if (this.ribbon)      this.ribbon.rotation.y      +=  0.0012 * sp;
    if (this.accentRing1) this.accentRing1.rotation.y +=  0.0035 * sp;
    if (this.accentRing2) this.accentRing2.rotation.z -=  0.002  * sp;
    if (this.accentRing3) this.accentRing3.rotation.x +=  0.0015 * sp;

    /* ── Particle drift ──────────────────────────────────────── */
    if (this.particles && sp > 0) {
      const d = new THREE.Object3D();
      for (let i = 0, len = this.seeds.length; i < len; i++) {
        const s = this.seeds[i];
        d.position.set(
          s.baseX + Math.cos(t * s.spdX + s.phX) * 0.05,
          s.baseY + Math.sin(t * s.spdY + s.phY) * 0.07,
          s.baseZ + Math.sin(t * s.spdZ + s.phZ) * 0.04,
        );
        d.scale.setScalar(s.scale);
        d.updateMatrix();
        this.particles.setMatrixAt(i, d.matrix);
      }
      this.particles.instanceMatrix.needsUpdate = true;
    }

    /* ── Hover glow interpolation ────────────────────────────── */
    this.gloC += (this.gloT - this.gloC) * 0.055;
    const rm1 = this.accentRing1?.material as THREE.MeshPhysicalMaterial | undefined;
    const rm2 = this.accentRing2?.material as THREE.MeshPhysicalMaterial | undefined;
    const rm3 = this.accentRing3?.material as THREE.MeshPhysicalMaterial | undefined;
    if (rm1) rm1.emissiveIntensity = this.gloC;
    if (rm2) rm2.emissiveIntensity = this.gloC * 1.3;
    if (rm3) rm3.emissiveIntensity = this.gloC * 1.1;

    /* ── Hover red-light boost ───────────────────────────────── */
    this.rlC += (this.rlT - this.rlC) * 0.055;
    for (let i = 0; i < this.redLights.length; i++) {
      const base = i === 0 ? 1 : i === 1 ? 0.5 : 0.3;
      this.redLights[i].intensity = this.rlC * base;
    }

    /* ── Scroll-driven transforms ────────────────────────────── */
    this.group.position.x = this.sX;
    this.group.rotation.y += this.sRotY * 0.016;
    this.group.scale.setScalar(this.sScale);

    this.camera.lookAt(
      this.group.position.x * 0.35,
      this.group.position.y,
      0,
    );
    this.renderer.render(this.scene, this.camera);
  };

  /* ═══════════════════════════════════════════════════════════════
     EVENTS — template-bound + HostListener
     ═══════════════════════════════════════════════════════════ */

  onMouseMove(e: MouseEvent): void {
    if (!this.containerRef) return;
    const r = this.containerRef.nativeElement.getBoundingClientRect();
    this.mouse.tx =  ((e.clientX - r.left) / r.width  - 0.5) * 2;
    this.mouse.ty = -((e.clientY - r.top)  / r.height - 0.5) * 2;
  }

  onMouseEnter(): void {
    this.gloT = this.GLH;
    this.rlT  = this.RL_HOVER;
  }

  onMouseLeave(): void {
    this.mouse.tx = 0;
    this.mouse.ty = 0;
    this.gloT = this.GLO;
    this.rlT  = this.RL_BASE;
  }

  @HostListener('window:resize')
  onResize(): void {
    clearTimeout(this.resizeTmr);
    this.resizeTmr = window.setTimeout(() => this.syncSize(), 120) as unknown as number;
  }

  /* ═══════════════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════════ */

  private syncSize(): void {
    if (!this.renderer || !this.containerRef) return;
    this.classify();
    const el = this.containerRef.nativeElement;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.dprCap));
  }

  private classify(): void {
    const w = innerWidth;
    this.isMobile = w < 768;
    this.isTablet = w >= 768 && w < 1024;
    this.dprCap   = this.isMobile ? 1.5 : 2;
  }

  private aspect(): number {
    if (this.containerRef) {
      const el = this.containerRef.nativeElement;
      return (el.clientWidth / el.clientHeight) || 16 / 9;
    }
    return 16 / 9;
  }

  /* ═══════════════════════════════════════════════════════════════
     CLEANUP — complete GPU resource disposal
     ═══════════════════════════════════════════════════════════ */

  private dispose(): void {
    this.geos.forEach(g => g.dispose());
    this.mats.forEach(m => m.dispose());
    this.envTex?.dispose();
    this.pmrem?.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
  }
}
