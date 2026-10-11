import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix3,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Points,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
  type PerspectiveCamera,
  type WebGLRenderer,
} from "three";
import { branchCoral, fanCoral, moundCoral, seeded } from "./coral";
import { turtleGeometry } from "./turtle";
import type { OceanModels } from "./models";
import {
  BACKDROP_FRAG,
  BACKDROP_VERT,
  BED_LEVEL,
  SILHOUETTE_FRAG,
  SILHOUETTE_VERT,
  SNOW_FRAG,
  SNOW_VERT,
} from "./shaders";

/**
 * O oceano inteiro em three.js "puro" (o componente React só monta, chama
 * update() a cada quadro e descarta). Mundo: superfície em y = 0, fundo em
 * y ≈ BED_LEVEL, câmera olhando para -Z. O recife fica à frente (z -30 a -90),
 * onde a câmera chega no fim do scroll.
 *
 * CÂMERA (progresso da seção 0→1, ver KEYS): alto-mar visto de cima → desce
 * até a superfície → fica um instante NA linha d'água (metade acima, metade
 * abaixo) → mergulha olhando um pouco para cima (raios, superfície vista de
 * baixo) → avança e desce até o recife, olhando levemente para baixo.
 */

// [progresso, y, z, inclinação (rad)]
const KEYS: [number, number, number, number][] = [
  [0.0, 8.0, 14, -0.3],
  [0.26, 1.9, 6, -0.12],
  [0.36, 0.05, 2.5, -0.02],
  [0.43, 0.0, 2.0, -0.01], // pausa na linha d'água
  [0.52, -1.8, 0, 0.17],
  [0.75, -6.5, -10, 0.02],
  [1.0, -10.5, -22, -0.17],
];

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function cameraAt(p: number): [number, number, number] {
  for (let i = 1; i < KEYS.length; i++) {
    const a = KEYS[i - 1];
    const b = KEYS[i];
    if (p <= b[0]) {
      const t = smooth(clamp01((p - a[0]) / (b[0] - a[0])));
      return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
    }
  }
  const k = KEYS[KEYS.length - 1];
  return [k[1], k[2], k[3]];
}

/** Mesmo relevo do fundo usado no shader (os corais pousam nele). */
const bedH = (x: number, z: number) =>
  BED_LEVEL + 1.3 * Math.sin(x * 0.08 + 1.0) * Math.sin(z * 0.06) + 0.5 * Math.sin(x * 0.21 + z * 0.17);

/** Região do cardume (centro e tamanho): à frente da câmera no fim da descida. */
const BOX = { x0: 0, y0: -6.6, z0: -31, w: 22, h: 4.5, d: 10 };

// tartarugas: [x0, y0, z0, rumo x, rumo z, velocidade, meio trajeto, comprimento]
// a 1ª aparece no meio do mergulho; as outras perto do recife
const TURTLES: [number, number, number, number, number, number, number, number][] = [
  [-1, -5.2, -18, 0.75, -0.66, 0.55, 26, 1.7],
  [3, -9.2, -33, -0.62, -0.78, 0.45, 30, 1.4],
  [-6, -12, -45, 0.8, 0.6, 0.4, 32, 1.2],
];

type Boids = { pos: Float32Array; vel: Float32Array; size: Float32Array; goal: Vector3; next: number; rand: () => number };

const Z = new Vector3(0, 0, 1);
const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpP = new Vector3();
const tmpD = new Vector3();
const tmpS = new Vector3();

export class OceanWorld {
  readonly root = new Group();
  private readonly shared = { uTime: { value: 0 }, uCamPos: { value: new Vector3() } };
  private readonly back: ShaderMaterial;
  private readonly backGeo = new PlaneGeometry(2, 2);
  private readonly under = new Group();
  private readonly geos: BufferGeometry[] = [];
  private readonly mats: ShaderMaterial[] = [];
  private readonly defines: Record<string, string>;
  private snow: ShaderMaterial;
  private fish: InstancedMesh | null = null;
  private sharks: InstancedMesh | null = null;
  private boids: Boids | null = null;
  private turtles: InstancedMesh;
  /** Início (tempo) da passagem do tubarão perto da câmera; -1 = parado. */
  private passStart = -1;
  private passArmed = true;
  private time = 0;
  private prog = -1;
  private tilt = new Vector2();

  constructor(private readonly light: boolean) {
    this.defines = light ? { LIGHT: "" } : {};
    this.back = new ShaderMaterial({
      vertexShader: BACKDROP_VERT,
      fragmentShader: BACKDROP_FRAG,
      defines: this.defines,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        ...this.shared,
        uRes: { value: new Vector2(1, 1) },
        uCamRot: { value: new Matrix3() },
        uTan: { value: 0.4 },
      },
    });
    const bg = new Mesh(this.backGeo, this.back);
    bg.frustumCulled = false;
    bg.renderOrder = -1;
    this.root.add(bg, this.under);

    this.buildReef();
    this.snow = this.buildSnow();
    this.turtles = this.buildTurtles();
  }

  /**
   * Material de silhueta: tom, luz de contorno prateada (0 = sem) e fator da
   * névoa (1 = normal; os animais usam menos névoa para se destacarem).
   */
  private silhouette(o: { tint: number; rim: number; fog: number; swim?: [number, number, number]; flap?: boolean }) {
    const defines: Record<string, string> = { ...this.defines };
    if (o.swim) defines.SWIM = "";
    if (o.flap) defines.FLAP = "";
    const m = new ShaderMaterial({
      vertexShader: SILHOUETTE_VERT,
      fragmentShader: SILHOUETTE_FRAG,
      defines,
      uniforms: {
        ...this.shared,
        uTint: { value: new Vector3(o.tint, o.tint * 1.08, o.tint * 1.15) },
        uSwim: { value: new Vector3(...(o.swim ?? [0, 0, 0])) },
        uLook: { value: new Vector2(o.rim, o.fog) },
      },
    });
    this.mats.push(m);
    return m;
  }

  private buildReef() {
    const rand = seeded(7);
    const types: [BufferGeometry, number, [number, number], number][] = [
      // geometria, quantidade, escala, tom
      [branchCoral(11, this.light), this.light ? 10 : 22, [1.1, 2.6], 0.06],
      [fanCoral(23, this.light), this.light ? 8 : 16, [1.6, 3.4], 0.055],
      [moundCoral(31, this.light), this.light ? 12 : 26, [0.8, 2.3], 0.07],
    ];
    types.forEach(([geo, count, [s0, s1], tint], ti) => {
      this.geos.push(geo);
      const mesh = new InstancedMesh(geo, this.silhouette({ tint, rim: 0.4, fog: 0.85 }), count);
      for (let i = 0; i < count; i++) {
        const side = rand() < 0.5 ? -1 : 1;
        const x = side * Math.pow(rand(), 1.25) * 42;
        const z = -27 - Math.pow(rand(), 1.4) * 50;
        const s = s0 + (s1 - s0) * rand();
        // leques quase de frente para a câmera (silhueta inteira)
        const yaw = ti === 1 ? (rand() - 0.5) * 1.2 : rand() * Math.PI * 2;
        tmpQ.setFromAxisAngle(tmpD.set(0, 1, 0), yaw);
        const sx = ti === 2 ? s * (0.8 + rand() * 0.6) : s;
        tmpM.compose(tmpP.set(x, bedH(x, z), z), tmpQ, tmpS.set(sx, s, ti === 2 ? s * (0.8 + rand() * 0.6) : s));
        mesh.setMatrixAt(i, tmpM);
      }
      mesh.frustumCulled = false;
      this.under.add(mesh);
    });
  }

  private buildTurtles() {
    const n = this.light ? 1 : TURTLES.length;
    const geo = turtleGeometry(this.light);
    geo.setAttribute("aPhase", new InstancedBufferAttribute(new Float32Array([0, 2.3, 4.1].slice(0, n)), 1));
    this.geos.push(geo);
    const mesh = new InstancedMesh(geo, this.silhouette({ tint: 0.065, rim: 1.1, fog: 0.55, flap: true }), n);
    mesh.frustumCulled = false;
    this.under.add(mesh);
    return mesh;
  }

  private buildSnow() {
    const n = this.light ? 320 : 900;
    const rand = seeded(5);
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand();
      pos[i * 3 + 1] = rand();
      pos[i * 3 + 2] = rand();
      size[i] = 0.5 + Math.pow(rand(), 2) * 2.2;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new BufferAttribute(size, 1));
    this.geos.push(geo);
    const mat = new ShaderMaterial({
      vertexShader: SNOW_VERT,
      fragmentShader: SNOW_FRAG,
      defines: this.defines,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { ...this.shared, uBox: { value: 26 }, uPx: { value: 10 } },
    });
    this.mats.push(mat);
    const pts = new Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 2;
    this.under.add(pts);
    return mat;
  }

  /** Recebe o tubarão e o peixe do glb (assim que o Draco termina). */
  setModels(m: OceanModels) {
    if (this.fish) return;
    const rand = seeded(13);
    const n = this.light ? 45 : 130;
    const fishGeo = m.fish.clone();
    const phase = new Float32Array(n);
    const size = new Float32Array(n);
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      phase[i] = rand() * Math.PI * 2;
      size[i] = 0.34 + rand() * 0.14;
      pos[i * 3] = BOX.x0 + (rand() - 0.5) * 6;
      pos[i * 3 + 1] = BOX.y0 + (rand() - 0.5) * 2;
      pos[i * 3 + 2] = BOX.z0 + (rand() - 0.5) * 4;
      vel[i * 3] = 1.6 + rand() * 0.3;
      vel[i * 3 + 1] = (rand() - 0.5) * 0.2;
      vel[i * 3 + 2] = (rand() - 0.5) * 0.4;
    }
    this.boids = { pos, vel, size, goal: new Vector3(BOX.x0 + 6, BOX.y0, BOX.z0), next: 0, rand };
    // pré-aquece: o cardume já aparece organizado (inclusive no quadro parado)
    for (let k = 0; k < 90; k++) this.stepBoids(1 / 30, k / 30);
    fishGeo.setAttribute("aPhase", new InstancedBufferAttribute(phase, 1));
    this.fish = new InstancedMesh(fishGeo, this.silhouette({ tint: 0.075, rim: 1.2, fog: 0.55, swim: [0.1, 11, 9] }), n);
    this.fish.frustumCulled = false;

    // tubarões ao longe (1 ou 2) + 1 que passa perto da câmera (ver passStart)
    const far = this.light ? 1 : 2;
    const sharkGeo = m.shark.clone();
    sharkGeo.setAttribute("aPhase", new InstancedBufferAttribute(new Float32Array([0, 2.1, 4.4].slice(0, far + 1)), 1));
    this.sharks = new InstancedMesh(sharkGeo, this.silhouette({ tint: 0.045, rim: 1.0, fog: 0.55, swim: [0.07, 2.2, 5] }), far + 1);
    this.sharks.frustumCulled = false;
    this.geos.push(fishGeo, sharkGeo);
    this.under.add(this.fish, this.sharks);
    this.writeFish();
  }

  /**
   * Cardume com boids simples (separação, alinhamento, coesão) seguindo um
   * alvo que muda de lugar a cada 7 a 13 s: o cardume vira de direção de vez
   * em quando, sem rota fixa. Vizinhos por força bruta, mas N <= 130.
   */
  private stepBoids(dt: number, t: number) {
    const b = this.boids!;
    if (t >= b.next) {
      b.goal.set(BOX.x0 + (b.rand() - 0.5) * BOX.w, BOX.y0 + (b.rand() - 0.5) * BOX.h, BOX.z0 + (b.rand() - 0.5) * BOX.d);
      b.next = t + 7 + b.rand() * 6;
    }
    const { pos, vel } = b;
    const n = pos.length / 3;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      const px = pos[i3];
      const py = pos[i3 + 1];
      const pz = pos[i3 + 2];
      let sx = 0, sy = 0, sz = 0, ax = 0, ay = 0, az = 0, cx = 0, cy = 0, cz = 0, cnt = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const j3 = j * 3;
        const dx = pos[j3] - px;
        const dy = pos[j3 + 1] - py;
        const dz = pos[j3 + 2] - pz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > 4) continue;
        ax += vel[j3];
        ay += vel[j3 + 1];
        az += vel[j3 + 2];
        cx += dx;
        cy += dy;
        cz += dz;
        cnt++;
        if (d2 < 0.3) {
          const k = 1 / (d2 + 0.02);
          sx -= dx * k;
          sy -= dy * k;
          sz -= dz * k;
        }
      }
      let fx = sx * 0.05;
      let fy = sy * 0.05;
      let fz = sz * 0.05;
      if (cnt) {
        fx += (ax / cnt - vel[i3]) * 0.9 + (cx / cnt) * 0.6;
        fy += (ay / cnt - vel[i3 + 1]) * 0.9 + (cy / cnt) * 0.6;
        fz += (az / cnt - vel[i3 + 2]) * 0.9 + (cz / cnt) * 0.6;
      }
      // alvo (rumo do cardume); vertical mais contida
      const gx = b.goal.x - px;
      const gy = b.goal.y - py;
      const gz = b.goal.z - pz;
      const gl = Math.hypot(gx, gy, gz) || 1;
      fx += (gx / gl) * 0.8;
      fy += (gy / gl) * 0.4;
      fz += (gz / gl) * 0.8;
      let vx = vel[i3] + fx * dt;
      let vy = (vel[i3 + 1] + fy * dt) * 0.98;
      let vz = vel[i3 + 2] + fz * dt;
      const sp = Math.hypot(vx, vy, vz) || 1;
      const lim = Math.min(2.3, Math.max(1.1, sp)) / sp;
      vx *= lim;
      vy *= lim;
      vz *= lim;
      vel[i3] = vx;
      vel[i3 + 1] = vy;
      vel[i3 + 2] = vz;
    }
    for (let i = 0; i < pos.length; i++) pos[i] += vel[i] * dt;
  }

  private writeFish() {
    const b = this.boids;
    if (!b || !this.fish) return;
    for (let i = 0; i < b.size.length; i++) {
      const i3 = i * 3;
      tmpQ.setFromUnitVectors(Z, tmpD.set(b.vel[i3], b.vel[i3 + 1], b.vel[i3 + 2]).normalize());
      const s = b.size[i];
      tmpM.compose(tmpP.set(b.pos[i3], b.pos[i3 + 1], b.pos[i3 + 2]), tmpQ, tmpS.set(s, s, s));
      this.fish.setMatrixAt(i, tmpM);
    }
    this.fish.instanceMatrix.needsUpdate = true;
  }

  private animateLife(t: number, dt: number, cam: Vector3, still: boolean) {
    if (this.boids && dt > 0) {
      this.stepBoids(dt, t);
      this.writeFish();
    }
    // tartarugas: diagonal lenta, subindo e descendo devagar (o corpo inclina
    // junto com a subida); encolhem até sumir nas pontas do trajeto (longe)
    for (let i = 0; i < this.turtles.count; i++) {
      const [x0, y0, z0, dx, dz, speed, range, len] = TURTLES[i];
      const span = range * 2;
      const s = ((((t * speed + i * 17) % span) + span) % span) - range;
      const w = 0.16 + i * 0.03;
      const y = y0 + 1.1 * Math.sin(t * w + i * 2);
      const vy = (1.1 * w * Math.cos(t * w + i * 2)) / speed;
      tmpQ.setFromUnitVectors(Z, tmpD.set(dx, vy, dz).normalize());
      const k = len * Math.min(1, (range - Math.abs(s)) / 4);
      tmpM.compose(tmpP.set(x0 + dx * s, y, z0 + dz * s), tmpQ, tmpS.set(k, k, k));
      this.turtles.setMatrixAt(i, tmpM);
    }
    this.turtles.instanceMatrix.needsUpdate = true;

    if (this.sharks) {
      // ao longe, cruzando devagar em sentidos opostos
      // (as fases deixam um deles em cena logo nos primeiros segundos)
      const paths: [number, number, number, number, number][] = [
        [-30 + ((t * 0.95 + 47) % 60), -8.6 + 0.5 * Math.sin(t * 0.11), -42, 1, 4.6],
        [40 - ((t * 0.75 + 78) % 80), -12 + 0.4 * Math.sin(t * 0.09 + 1), -54, -1, 4.0],
      ];
      const far = this.sharks.count - 1;
      for (let i = 0; i < far; i++) {
        const [x, y, z, dir, len] = paths[i];
        tmpQ.setFromUnitVectors(Z, tmpD.set(dir, 0.02 * Math.sin(t * 0.2 + i), 0.1 * Math.sin(t * 0.17 + i * 2)).normalize());
        tmpM.compose(tmpP.set(x, y, z), tmpQ, tmpS.set(len, len, len));
        this.sharks.setMatrixAt(i, tmpM);
      }
      // o que passa PERTO: disparado uma vez quando a descida passa de ~60%
      // (de novo se a pessoa voltar para cima e descer outra vez); atravessa
      // a tela em ~11 s, a ~9 unidades da câmera e um pouco abaixo dela
      const u = still ? 0.55 : this.passStart < 0 ? -1 : (t - this.passStart) / 11;
      if (u >= 0 && u <= 1) {
        tmpQ.setFromUnitVectors(Z, tmpD.set(1, 0.04, -0.12).normalize());
        tmpM.compose(tmpP.set(cam.x - 17 + 34 * u, cam.y - 1.7 + 0.25 * Math.sin(t * 0.4), cam.z - 9 - 1.2 * u), tmpQ, tmpS.set(4.8, 4.8, 4.8));
      } else tmpM.makeScale(0, 0, 0);
      this.sharks.setMatrixAt(far, tmpM);
      this.sharks.instanceMatrix.needsUpdate = true;
    }
  }

  update(gl: WebGLRenderer, camera: PerspectiveCamera, progress: number, pointer: { x: number; y: number }, dt: number, still: boolean) {
    if (!still) this.time += dt;
    const t = this.time + 30; // começa com o cardume e um tubarão em cena
    // progresso suavizado (o scroll pode pular)
    const target = clamp01(progress);
    this.prog = this.prog < 0 || still ? target : this.prog + (target - this.prog) * (1 - Math.exp(-dt * 5));
    const [y, z, pitch] = cameraAt(this.prog);
    const k = 1 - Math.exp(-dt * 2);
    this.tilt.x += (pointer.x - this.tilt.x) * k;
    this.tilt.y += (pointer.y - this.tilt.y) * k;
    // acima d'água a câmera balança com o mar; abaixo, deriva lenta
    const sway = still ? 0 : y > 0.3 ? 0.07 * Math.sin(t * 0.7) : 0.12 * Math.sin(t * 0.23);
    camera.position.set(this.tilt.x * 0.35 + (still ? 0 : 0.3 * Math.sin(t * 0.05)), y + sway, z);
    camera.rotation.set(pitch - this.tilt.y * 0.03, -this.tilt.x * 0.05 + (still ? 0 : 0.03 * Math.sin(t * 0.07)), 0, "YXZ");
    camera.updateMatrixWorld();

    this.shared.uTime.value = t;
    this.shared.uCamPos.value.copy(camera.position);
    const u = this.back.uniforms;
    gl.getDrawingBufferSize(u.uRes.value);
    (u.uCamRot.value as Matrix3).setFromMatrix4(camera.matrixWorld);
    u.uTan.value = Math.tan((camera.fov * Math.PI) / 360);
    this.snow.uniforms.uPx.value = u.uRes.value.y * 0.011;

    // passagem do tubarão perto: dispara ao passar de 60% da descida; rearma
    // ao voltar acima da linha d'água
    if (this.passArmed && this.prog > 0.6) {
      this.passArmed = false;
      this.passStart = t;
    } else if (this.prog < 0.4) this.passArmed = true;

    // acima da superfície nada embaixo aparece: nem desenha
    this.under.visible = camera.position.y < 1.2;
    if (this.under.visible) this.animateLife(t, still ? 0 : dt, camera.position, still);
  }

  dispose() {
    this.backGeo.dispose();
    this.back.dispose();
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
  }
}
