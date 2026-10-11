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

type Fish = { off: Vector3; f: number; ph: number; s: number };

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
  private school: Fish[] = [];
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
  }

  private silhouette(swim?: [number, number, number], tint = 0.03) {
    const m = new ShaderMaterial({
      vertexShader: SILHOUETTE_VERT,
      fragmentShader: SILHOUETTE_FRAG,
      defines: swim ? { ...this.defines, SWIM: "" } : this.defines,
      uniforms: {
        ...this.shared,
        uTint: { value: new Vector3(tint, tint * 1.08, tint * 1.15) },
        uSwim: { value: new Vector3(...(swim ?? [0, 0, 0])) },
      },
    });
    this.mats.push(m);
    return m;
  }

  private buildReef() {
    const rand = seeded(7);
    const types: [BufferGeometry, number, [number, number], number][] = [
      // geometria, quantidade, escala, tom
      [branchCoral(11, this.light), this.light ? 10 : 22, [1.1, 2.6], 0.034],
      [fanCoral(23, this.light), this.light ? 8 : 16, [1.6, 3.4], 0.03],
      [moundCoral(31, this.light), this.light ? 12 : 26, [0.8, 2.3], 0.04],
    ];
    types.forEach(([geo, count, [s0, s1], tint], ti) => {
      this.geos.push(geo);
      const mesh = new InstancedMesh(geo, this.silhouette(undefined, tint), count);
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
    for (let i = 0; i < n; i++) {
      phase[i] = rand() * Math.PI * 2;
      // cardume: elipsoide achatado, mais denso no meio
      const r = Math.cbrt(rand());
      const a = rand() * Math.PI * 2;
      const b = Math.acos(rand() * 2 - 1);
      this.school.push({
        off: new Vector3(Math.sin(b) * Math.cos(a) * 4.2 * r, Math.cos(b) * 1.1 * r, Math.sin(b) * Math.sin(a) * 2.0 * r),
        f: 0.6 + rand() * 0.6,
        ph: rand() * Math.PI * 2,
        s: 0.34 + rand() * 0.14,
      });
    }
    fishGeo.setAttribute("aPhase", new InstancedBufferAttribute(phase, 1));
    this.fish = new InstancedMesh(fishGeo, this.silhouette([0.1, 11, 9], 0.05), n);
    this.fish.frustumCulled = false;

    const sharkGeo = m.shark.clone();
    sharkGeo.setAttribute("aPhase", new InstancedBufferAttribute(new Float32Array([0, 2.1]), 1));
    this.sharks = new InstancedMesh(sharkGeo, this.silhouette([0.07, 2.2, 5], 0.022), this.light ? 1 : 2);
    this.sharks.frustumCulled = false;
    this.geos.push(fishGeo, sharkGeo);
    this.under.add(this.fish, this.sharks);
  }

  private animateLife(t: number) {
    if (this.fish) {
      // o cardume dá voltas largas à frente do recife: passa pela tela,
      // some na névoa ao fundo e volta
      const w = 0.12;
      const cx = 10 * Math.cos(t * w);
      const cy = -7.4 + 0.7 * Math.sin(t * 0.21);
      const cz = -35 + 5 * Math.sin(t * w);
      const head = tmpD.set(-Math.sin(t * w) * 10, (0.7 * 0.21 * Math.cos(t * 0.21)) / w, Math.cos(t * w) * 5).normalize();
      const hx = head.x;
      const hy = head.y;
      const hz = head.z;
      // eixo lateral do cardume (perpendicular ao rumo, no plano horizontal)
      const lx = -hz;
      const lz = hx;
      this.school.forEach((f, i) => {
        const o = f.off;
        const wob = Math.sin(t * f.f + f.ph);
        // o elipsoide se alonga no rumo; uma onda leve percorre o cardume
        tmpP.set(
          cx + hx * o.x + lx * o.z + 0.25 * wob,
          cy + o.y + 0.3 * Math.sin(t * 0.9 + o.x * 0.6),
          cz + hz * o.x + lz * o.z + 0.25 * Math.cos(t * f.f * 1.3 + f.ph),
        );
        const dir = tmpS.set(hx + 0.14 * wob, hy + 0.06 * Math.sin(t * f.f * 1.7 + f.ph), hz + 0.14 * Math.cos(t * f.f + f.ph)).normalize();
        tmpQ.setFromUnitVectors(Z, dir);
        const s = f.s;
        tmpM.compose(tmpP, tmpQ, tmpS.set(s, s, s));
        this.fish!.setMatrixAt(i, tmpM);
      });
      this.fish.instanceMatrix.needsUpdate = true;
    }
    if (this.sharks) {
      // dois tubarões cruzando devagar, longe, em sentidos opostos
      const paths: [number, number, number, number, number][] = [
        // x(t), y, z, rumo, comprimento
        // (as fases deixam um deles em cena logo nos primeiros segundos)
        [-30 + ((t * 0.95 + 47) % 60), -8.6 + 0.5 * Math.sin(t * 0.11), -42, 1, 4.6],
        [40 - ((t * 0.75 + 78) % 80), -12 + 0.4 * Math.sin(t * 0.09 + 1), -54, -1, 4.0],
      ];
      for (let i = 0; i < this.sharks.count; i++) {
        const [x, y, z, dir, len] = paths[i];
        tmpQ.setFromUnitVectors(Z, tmpD.set(dir, 0.02 * Math.sin(t * 0.2 + i), 0.1 * Math.sin(t * 0.17 + i * 2)).normalize());
        tmpM.compose(tmpP.set(x, y, z), tmpQ, tmpS.set(len, len, len));
        this.sharks.setMatrixAt(i, tmpM);
      }
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

    // acima da superfície nada embaixo aparece: nem desenha
    this.under.visible = camera.position.y < 1.2;
    if (this.under.visible) this.animateLife(t);
  }

  dispose() {
    this.backGeo.dispose();
    this.back.dispose();
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
  }
}
