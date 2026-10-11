import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
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
import { bearGeometry, seeded, spruceGeometry } from "./models";
import {
  BACKDROP_FRAG,
  BACKDROP_VERT,
  BEAR_FRAG,
  BEAR_VERT,
  GROUND_FRAG,
  GROUND_VERT,
  SNOW_FRAG,
  SNOW_VERT,
  TREE_FRAG,
  TREE_VERT,
} from "./shaders";

/**
 * A floresta inteira em three.js "puro" (o componente React só monta, chama
 * update() a cada quadro e descarta). Mundo: chão em y ≈ 0, câmera na altura
 * dos olhos olhando para -Z, avançando devagar por uma trilha entre os abetos
 * com o progresso da seção (0 → 1: z de 2 a -24).
 * - Abetos: duas InstancedMesh (perto = detalhada, longe = simples); a cada
 *   ~0,2 s cada árvore vai para uma das duas conforme a distância (LOD), e as
 *   que ficaram atrás da câmera não são desenhadas.
 * - Camadas distantes: no quadro de fundo (shaders.ts).
 * - Urso: atravessa uma clareira ao fundo (z = BEAR.z) quando a descida passa
 *   de ~30%: anda, para, vira a cabeça para a câmera e segue (por TEMPO, não
 *   por scroll, para a caminhada ser natural). Rearma ao voltar ao início.
 */

/** Relevo suave do chão (o mesmo para árvores e urso pousarem). */
export const groundH = (x: number, z: number) =>
  0.5 * Math.sin(x * 0.05 + 0.6) * Math.sin(z * 0.04) + 0.25 * Math.sin(x * 0.13 + z * 0.09);

const CAM = { z0: 2, z1: -24, eye: 1.75 };
const LOD_NEAR = 24;

/** Passagem do urso (tempos em s a partir do disparo). */
const BEAR = {
  z: -46,
  x0: -12,
  stopX: -1.2,
  x1: 19,
  speed: 1.45, // m/s
  stride: 1.55, // m por ciclo de passada
  scale: 1.35,
  // parado: desacelera, vira a cabeça, segura, volta, retoma
  stop: 4.2,
  ramp: 1.1, // s para parar / retomar
};

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpP = new Vector3();
const tmpS = new Vector3();
const Y = new Vector3(0, 1, 0);

type Tree = { x: number; z: number; m: Float32Array };

export class ForestWorld {
  readonly root = new Group();
  private readonly shared = { uTime: { value: 0 }, uCamPos: { value: new Vector3() } };
  private readonly defines: Record<string, string>;
  private readonly geos: BufferGeometry[] = [];
  private readonly mats: ShaderMaterial[] = [];
  private readonly back: ShaderMaterial;
  private readonly snow: ShaderMaterial;
  private readonly near: InstancedMesh;
  private readonly far: InstancedMesh;
  private readonly trees: Tree[] = [];
  private readonly bear: Mesh;
  private readonly bearMat: ShaderMaterial;
  private time = 0;
  private prog = -1;
  private tilt = new Vector2();
  private lodAt = -1;
  private lodZ = Infinity;
  /** Disparo da passagem do urso (tempo); -1 = ainda não. */
  private bearStart = -1;
  private bearArmed = true;
  private walkPhase = 0;

  constructor(private readonly light: boolean) {
    this.defines = light ? { LIGHT: "" } : {};
    this.back = this.material(BACKDROP_VERT, BACKDROP_FRAG, {
      uRes: { value: new Vector2(1, 1) },
      uCamRot: { value: new Matrix3() },
      uTan: { value: 0.4 },
    });
    this.back.depthTest = false;
    this.back.depthWrite = false;
    const bgGeo = new PlaneGeometry(2, 2);
    this.geos.push(bgGeo);
    const bg = new Mesh(bgGeo, this.back);
    bg.frustumCulled = false;
    bg.renderOrder = -1;

    // chão: plano grande, mais denso perto da trilha
    const groundGeo = new PlaneGeometry(260, 300, light ? 40 : 90, light ? 50 : 110);
    groundGeo.rotateX(-Math.PI / 2);
    groundGeo.translate(0, 0, -120);
    const gp = groundGeo.getAttribute("position");
    for (let i = 0; i < gp.count; i++) gp.setY(i, groundH(gp.getX(i), gp.getZ(i)));
    this.geos.push(groundGeo);
    const ground = new Mesh(groundGeo, this.material(GROUND_VERT, GROUND_FRAG));
    ground.frustumCulled = false;

    // abetos
    this.plantTrees();
    const treeMat = this.material(TREE_VERT, TREE_FRAG);
    treeMat.side = DoubleSide;
    const nearGeo = spruceGeometry("near");
    const farGeo = spruceGeometry("far");
    this.geos.push(nearGeo, farGeo);
    this.near = new InstancedMesh(nearGeo, treeMat, this.trees.length);
    this.far = new InstancedMesh(farGeo, treeMat, this.trees.length);
    this.near.frustumCulled = false;
    this.far.frustumCulled = false;
    this.near.count = 0;
    this.far.count = 0;

    // urso
    const bearGeo = bearGeometry(light);
    this.geos.push(bearGeo);
    this.bearMat = this.material(BEAR_VERT, BEAR_FRAG, {
      uWalk: { value: 0 },
      uStride: { value: 0 },
      uHead: { value: 0 },
    });
    this.bear = new Mesh(bearGeo, this.bearMat);
    this.bear.frustumCulled = false;
    this.bear.visible = false;

    this.snow = this.buildSnow();
    this.root.add(bg, ground, this.near, this.far, this.bear);
  }

  private material(vertexShader: string, fragmentShader: string, extra: Record<string, { value: unknown }> = {}) {
    const m = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      defines: this.defines,
      uniforms: { ...this.shared, ...extra },
    });
    this.mats.push(m);
    return m;
  }

  /**
   * Abetos em volta de uma trilha irregular (a câmera passa por ela) e de uma
   * clareira ao fundo, onde o urso atravessa. Altura 9 a 21 m.
   */
  private plantTrees() {
    const rand = seeded(17);
    const n = this.light ? 260 : 620;
    let tries = 0;
    while (this.trees.length < n && tries++ < n * 20) {
      const x = (rand() - 0.5) * 110;
      const z = 10 - Math.pow(rand(), 0.8) * 150;
      const H = 9 + Math.pow(rand(), 1.4) * 12;
      const R = H * (0.13 + rand() * 0.05);
      // trilha: livre perto do eixo da câmera até a clareira (contando o raio
      // da copa, para nenhum galho passar na frente da câmera)
      const clear = 3 + 0.9 * Math.sin(z * 0.21) + 0.5 * Math.sin(z * 0.53 + 1) + R * 0.85;
      if (z > -60 && Math.abs(x) < clear) continue;
      // clareira do urso: quase sem árvores
      if (z < BEAR.z + 4 && z > BEAR.z - 4 && rand() < 0.9) continue;
      tmpQ.setFromAxisAngle(Y, rand() * Math.PI * 2);
      tmpM.compose(tmpP.set(x, groundH(x, z) - 0.2, z), tmpQ, tmpS.set(R, H, R));
      this.trees.push({ x, z, m: new Float32Array(tmpM.elements) });
    }
  }

  private buildSnow() {
    const n = this.light ? 350 : 1100;
    const rand = seeded(5);
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand();
      pos[i * 3 + 1] = rand();
      pos[i * 3 + 2] = rand();
      size[i] = 0.5 + Math.pow(rand(), 2) * 2;
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("aSize", new BufferAttribute(size, 1));
    this.geos.push(geo);
    const mat = this.material(SNOW_VERT, SNOW_FRAG, { uBox: { value: 22 }, uPx: { value: 10 } });
    mat.transparent = true;
    mat.depthWrite = false;
    mat.blending = AdditiveBlending;
    const pts = new Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 2;
    this.root.add(pts);
    return mat;
  }

  /** LOD: árvore perto → malha detalhada; longe → simples; atrás → nenhuma. */
  private updateLod(cam: Vector3) {
    const a = this.near.instanceMatrix.array as Float32Array;
    const b = this.far.instanceMatrix.array as Float32Array;
    let nn = 0;
    let nf = 0;
    for (const t of this.trees) {
      if (t.z > cam.z + 3) continue;
      const d = Math.hypot(t.x - cam.x, t.z - cam.z);
      if (d < LOD_NEAR && !this.light) a.set(t.m, nn++ * 16);
      else b.set(t.m, nf++ * 16);
    }
    this.near.count = nn;
    this.far.count = nf;
    this.near.instanceMatrix.needsUpdate = true;
    this.far.instanceMatrix.needsUpdate = true;
  }

  /**
   * Urso: posição ao longo da clareira e estado (passada, cabeça) em função do
   * tempo desde o disparo. Fases: anda até stopX → para (desacelera, vira a
   * cabeça para a câmera, segura, volta) → anda até sair.
   */
  private animateBear(u: number, dt: number, still: boolean) {
    const v = BEAR.speed;
    const ramp = BEAR.ramp;
    // anda em velocidade constante, desacelera linearmente até parar em stopX
    const cruise = (BEAR.stopX - BEAR.x0 - (v * ramp) / 2) / v;
    const arrive = cruise + ramp;
    const leave = arrive + BEAR.stop;
    let x: number;
    let stride = 1;
    let head = 0;
    if (still) {
      // quadro parado (reduced motion): parado na clareira, olhando para a câmera
      x = BEAR.stopX;
      stride = 0;
      head = 1.15;
    } else if (u < cruise) {
      x = BEAR.x0 + v * u;
    } else if (u < arrive) {
      const s = u - cruise;
      x = BEAR.x0 + v * cruise + v * (s - (s * s) / (2 * ramp));
      stride = 1 - s / ramp;
    } else if (u < leave) {
      const s = u - arrive;
      x = BEAR.stopX;
      stride = 0;
      // vira (0,3 a 1,2 s), segura, volta (2,8 a 3,7 s)
      head = 1.15 * (smooth(clamp01((s - 0.3) / 0.9)) - smooth(clamp01((s - 2.8) / 0.9)));
    } else {
      // retoma acelerando e segue até sair da clareira
      const s = u - leave;
      x = BEAR.stopX + (s < ramp ? (v * s * s) / (2 * ramp) : (v * ramp) / 2 + v * (s - ramp));
      stride = Math.min(1, s / ramp);
      if (x > BEAR.x1) {
        this.bear.visible = false;
        return;
      }
    }
    this.bear.visible = true;
    // a passada acompanha o deslocamento (sem patinar)
    if (!still) this.walkPhase += ((v * stride * dt) / BEAR.stride) * Math.PI * 2;
    const z = BEAR.z;
    this.bear.position.set(x, groundH(x, z) - 0.04, z);
    this.bear.rotation.set(0, Math.PI / 2, 0); // anda para +X
    this.bear.scale.setScalar(BEAR.scale);
    const u_ = this.bearMat.uniforms;
    u_.uWalk.value = this.walkPhase;
    u_.uStride.value = stride;
    u_.uHead.value = head;
  }

  update(gl: WebGLRenderer, camera: PerspectiveCamera, progress: number, pointer: { x: number; y: number }, dt: number, still: boolean) {
    if (!still) this.time += dt;
    const t = this.time + 20;
    const target = clamp01(progress);
    this.prog = this.prog < 0 || still ? target : this.prog + (target - this.prog) * (1 - Math.exp(-dt * 4));
    const k = 1 - Math.exp(-dt * 2);
    this.tilt.x += (pointer.x - this.tilt.x) * k;
    this.tilt.y += (pointer.y - this.tilt.y) * k;

    // câmera: avança devagar pela trilha, com um leve passo e deriva
    const z = CAM.z0 + (CAM.z1 - CAM.z0) * this.prog;
    const x = 0.5 * Math.sin(z * 0.07) + this.tilt.x * 0.45;
    const bob = still ? 0 : 0.035 * Math.sin(t * 0.9);
    camera.position.set(x, groundH(x, z) + CAM.eye + bob, z);
    camera.rotation.set(
      0.11 - this.tilt.y * 0.025,
      -this.tilt.x * 0.05 + (still ? 0 : 0.025 * Math.sin(t * 0.06)) - 0.04 * Math.sin(z * 0.07),
      0,
      "YXZ",
    );
    camera.updateMatrixWorld();

    this.shared.uTime.value = t;
    this.shared.uCamPos.value.copy(camera.position);
    const u = this.back.uniforms;
    gl.getDrawingBufferSize(u.uRes.value);
    (u.uCamRot.value as Matrix3).setFromMatrix4(camera.matrixWorld);
    u.uTan.value = Math.tan((camera.fov * Math.PI) / 360);
    this.snow.uniforms.uPx.value = u.uRes.value.y * 0.012;

    // LOD a cada ~0,2 s ou quando a câmera andou
    if (this.lodAt < 0 || t - this.lodAt > 0.2 || Math.abs(camera.position.z - this.lodZ) > 0.5) {
      this.lodAt = t;
      this.lodZ = camera.position.z;
      this.updateLod(camera.position);
    }

    // urso: dispara ao passar de ~30% da seção; rearma perto do início
    if (still) this.animateBear(0, 0, true);
    else {
      if (this.bearArmed && this.prog > 0.3) {
        this.bearArmed = false;
        this.bearStart = t;
        this.walkPhase = 0;
      } else if (this.prog < 0.12 && this.bearStart >= 0) {
        this.bearArmed = true;
        this.bearStart = -1;
      }
      if (this.bearStart >= 0) this.animateBear(t - this.bearStart, dt, false);
      else this.bear.visible = false;
    }
  }

  dispose() {
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
    this.near.dispose();
    this.far.dispose();
  }
}
