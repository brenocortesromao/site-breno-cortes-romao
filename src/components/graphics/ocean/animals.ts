import {
  AnimationMixer,
  Box3,
  CatmullRomCurve3,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SkinnedMesh,
  SphereGeometry,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Bone,
  type IUniform,
  type Object3D,
  type PerspectiveCamera,
} from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { OCEAN_COMMON } from "./shaders";

/*
 * Animais realistas do oceano (public/modelos/oceano/, Meshopt + WebP):
 * - tubarao.glb: "Realistic Shark" por MotionStreamStudios (CC BY 4.0), com
 *   esqueleto e as animações de nado ("swimming") e de volta ("circling");
 * - tartaruga.glb: "Sea Turtle" por Eloi (CC BY 4.0), nado em loop.
 * Créditos no rodapé (src/content/oceanCredits.ts).
 *
 * Cada animal é um clone (SkeletonUtils) com o próprio AnimationMixer, em
 * velocidade e fase diferentes; geometria, textura e material são os mesmos
 * para todos os clones. O material usa a linguagem do oceano (as mesmas
 * funções de água de shaders.ts): textura dessaturada ~70%, luz de cima,
 * cáusticas no dorso, contorno prateado (fresnel) vindo de cima, névoa da
 * água e corte na linha d'água.
 * Os modelos vêm sem olhos: duas esferas pretas e brilhantes presas aos ossos
 * dos olhos (L_Eye/R_Eye, filhos de Head).
 */

type Source = { root: Group; clips: AnimationClip[]; eyes: Mesh[] };
type Sources = { shark: Source; turtle: Source };

let pending: Promise<Sources> | null = null;

/** Normaliza o modelo: cabeça para +Z, Y para cima, centro na origem, comprimento 1. */
function normalize(scene: Group, headName: RegExp): Group {
  scene.updateMatrixWorld(true);
  const box = new Box3();
  scene.traverse((o) => {
    if (o instanceof SkinnedMesh) {
      o.computeBoundingBox();
      box.union(o.boundingBox!.clone().applyMatrix4(o.matrixWorld));
    }
  });
  const center = box.getCenter(new Vector3());
  let head: Object3D | undefined;
  scene.traverse((o) => {
    if (!head && headName.test(o.name)) head = o;
  });
  const fwd = head ? head.getWorldPosition(new Vector3()).sub(center).setY(0).normalize() : new Vector3(0, 0, 1);
  const size = box.getSize(new Vector3());
  const offset = new Group();
  offset.position.copy(center).negate();
  offset.add(scene);
  const norm = new Group();
  norm.rotation.y = -Math.atan2(fwd.x, fwd.z);
  norm.scale.setScalar(1 / Math.max(size.x, size.z, 1e-4));
  norm.add(offset);
  norm.updateMatrixWorld(true);
  return norm;
}

export function loadOceanAnimals(): Promise<Sources> {
  pending ??= (async () => {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/libs/meshopt_decoder.module.js"),
    ]);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [shark, turtle] = await Promise.all([
      loader.loadAsync("/modelos/oceano/tubarao.glb"),
      loader.loadAsync("/modelos/oceano/tartaruga.glb"),
    ]);
    const sharkRoot = normalize(shark.scene, /^Head/);
    // olhos: esferas nas órbitas, presas aos ossos dos olhos (raio ~1,1% do corpo)
    const eyeGeo = new SphereGeometry(1, 16, 12);
    const eyes: Mesh[] = [];
    const ws = new Vector3();
    sharkRoot.traverse((o) => {
      // o GLTFLoader limpa os nomes ("L_Eye.7_04" vira "L_Eye7_04"); fora as pontas (_end)
      if (!(o as Bone).isBone || !/^[LR]_Eye/.test(o.name) || /end/i.test(o.name)) return;
      const eye = new Mesh(eyeGeo);
      o.getWorldScale(ws);
      eye.scale.setScalar(0.009 / ws.x);
      // o osso fica no centro da órbita (dentro da pele): a esfera vai ~1% do
      // corpo para fora, para a superfície da cabeça
      const at = o.getWorldPosition(new Vector3());
      at.x += Math.sign(at.x) * 0.01;
      eye.position.copy(o.worldToLocal(at));
      o.add(eye);
      eyes.push(eye);
    });
    return {
      shark: { root: sharkRoot, clips: shark.animations, eyes },
      turtle: { root: normalize(turtle.scene, /^Head/), clips: turtle.animations, eyes: [] },
    };
  })().catch((e) => {
    pending = null; // tenta de novo na próxima montagem
    throw e;
  });
  return pending;
}

// ------------------------------------------------------------------ materiais
type Shared = Record<string, IUniform>;

/** Pele dos animais: textura dessaturada com a luz, as cáusticas, o contorno e a névoa do oceano. */
function skinMaterial(shared: Shared, light: boolean, look: { bright: number; rim: number; dorsal: number; fog: number }) {
  const m = new MeshBasicMaterial({ side: DoubleSide });
  m.defines = light ? { LIGHT: "" } : {};
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, shared, {
      uBright: { value: look.bright },
      uRim: { value: look.rim },
      uDorsal: { value: look.dorsal },
      uFogA: { value: look.fog },
    });
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vOW;\nvarying vec3 vON;")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vOW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #ifdef USE_SKINNING
          vON = normalize(mat3(modelMatrix) * objectNormal);
        #else
          vON = normalize(mat3(modelMatrix) * normal);
        #endif`,
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        ${OCEAN_COMMON}
        uniform float uBright;
        uniform float uRim;
        uniform float uDorsal;
        uniform float uFogA;
        varying vec3 vOW;
        varying vec3 vON;`,
      )
      .replace(
        "#include <opaque_fragment>",
        `vec3 v = vOW - uCamPos;
        float d = length(v);
        vec3 rd = v / d;
        if (splitSide(rd) > 0.0) discard; // acima da linha d'água: não aparece
        vec3 n = normalize(vON) * (gl_FrontFacing ? 1.0 : -1.0);
        float k = depthLight(vOW.y);
        float top = max(n.y, 0.0);
        // textura em espaço de tela e dessaturada ~70% (paleta do site)
        vec3 tex = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
        vec3 alb = mix(tex, vec3(dot(tex, vec3(0.299, 0.587, 0.114))), 0.7);
        vec3 c = alb * uBright * (0.3 + 0.7 * top) * k;
        c += vec3(0.3, 0.31, 0.32) * caustic(vOW.xz * 0.45) * top * k;
        float fres = pow(1.0 - abs(dot(n, -rd)), 2.5);
        c += vec3(0.62, 0.66, 0.7) * fres * smoothstep(-0.35, 0.7, n.y) * uRim * k;
        c += vec3(0.749, 0.769, 0.784) * (fres * smoothstep(0.05, 0.85, n.y) + 0.12 * pow(top, 3.0)) * uDorsal * k;
        gl_FragColor = vec4(expose(mix(c, waterCol(rd), fogF(d * uFogA))), 1.0);`,
      )
      // a cor já sai pronta para a tela, como nos outros shaders do oceano
      .replace("#include <tonemapping_fragment>", "")
      .replace("#include <colorspace_fragment>", "")
      .replace("#include <fog_fragment>", "");
  };
  return m;
}

/** Olhos: pretos, com um brilho especular pequeno (luz de cima) e a névoa da água. */
function eyeMaterial(shared: Shared, light: boolean, fog: number) {
  return new ShaderMaterial({
    defines: light ? { LIGHT: "" } : {},
    uniforms: { ...shared, uFogA: { value: fog } },
    vertexShader: /* glsl */ `
      varying vec3 vOW;
      varying vec3 vON;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vOW = w.xyz;
        vON = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      ${OCEAN_COMMON}
      uniform float uFogA;
      varying vec3 vOW;
      varying vec3 vON;
      void main() {
        vec3 v = vOW - uCamPos;
        float d = length(v);
        vec3 rd = v / d;
        if (splitSide(rd) > 0.0) discard;
        vec3 n = normalize(vON);
        vec3 r = reflect(rd, n);
        float k = depthLight(vOW.y);
        float s = pow(max(dot(r, SUN), 0.0), 60.0) * 0.9 + pow(max(r.y, 0.0), 24.0) * 0.18;
        vec3 c = vec3(0.012) + vec3(0.92, 0.95, 1.0) * s * k;
        gl_FragColor = vec4(expose(mix(c, waterCol(rd), fogF(d * uFogA))), 1.0);
      }`,
  });
}

// ------------------------------------------------------------------ cena
type Path =
  /** Volta fechada no mundo (velocidade em unidades/s). */
  | { kind: "loop"; curve: CatmullRomCurve3; speed: number; phase: number; bob: number }
  /** Travessia relativa à câmera, repetida a cada `every` s (sentido alterna). */
  | { kind: "pass"; curve: CatmullRomCurve3; every: number; dur: number; offset: number }
  /** Volta lenta relativa à câmera (tartaruga no celular). */
  | { kind: "orbit"; dist: number; rx: number; rz: number; w: number; y: number };

type Animal = {
  holder: Group;
  mixer: AnimationMixer;
  swim: AnimationAction;
  circle: AnimationAction | null;
  path: Path;
  len: number;
  /** Fim da volta ("circling") em curso, em s; -1 = nadando. */
  circlingUntil: number;
};

const tmpA = new Vector3();
const tmpB = new Vector3();
const tmpC = new Vector3();
const fwd = new Vector3();
const right = new Vector3();
const up = new Vector3();

export class OceanAnimals {
  readonly group = new Group();
  private animals: Animal[] = [];
  private mats: (MeshBasicMaterial | ShaderMaterial)[] = [];
  private nextCircle = 14;

  constructor(
    src: Sources,
    shared: Shared,
    private readonly opts: { mobile: boolean; light: boolean; few: boolean },
  ) {
    const { mobile, light, few } = opts;
    const sharkMat = skinMaterial(shared, light, { bright: 0.42, rim: mobile ? 2.6 : 1.7, dorsal: mobile ? 0.75 : 0.55, fog: 0.385 });
    const turtleMat = skinMaterial(shared, light, { bright: 0.5, rim: mobile ? 2.2 : 1.8, dorsal: 0.35, fog: 0.47 });
    const eyeMat = eyeMaterial(shared, light, 0.385);
    this.mats.push(sharkMat, turtleMat, eyeMat);

    // tubarões: desktop 3 (2 voltas ao longe + 1 travessia perto); celular 2
    // (travessia grande no terço central a cada ~6,5 s + 1 volta); "low": 1
    const sx = mobile ? 0.45 : 1; // voltas mais estreitas na tela em pé
    const loopA = new CatmullRomCurve3(
      [new Vector3(-26 * sx, -9, -40), new Vector3(-8 * sx, -8.4, -33), new Vector3(14 * sx, -9.2, -36), new Vector3(26 * sx, -9.8, -46), new Vector3(6 * sx, -10.4, -56), new Vector3(-18 * sx, -9.6, -52)],
      true,
      "catmullrom",
      0.5,
    );
    const loopB = new CatmullRomCurve3(
      [new Vector3(24 * sx, -12, -50), new Vector3(4 * sx, -12.6, -44), new Vector3(-20 * sx, -11.6, -48), new Vector3(-26 * sx, -12.2, -60), new Vector3(0, -12.8, -66), new Vector3(20 * sx, -12.4, -62)],
      true,
      "catmullrom",
      0.5,
    );
    // travessia (espaço da câmera: x lateral, y, z à frente = negativo)
    const passD = 9; // celular: o tubarão ocupa ~60% da largura da tela
    const passX = mobile ? 7 : 17;
    const pass = new CatmullRomCurve3([
      new Vector3(-passX, -0.2, -passD),
      new Vector3(-passX / 3, 0.15, -passD + 0.8),
      new Vector3(passX / 3, -0.1, -passD - 0.6),
      new Vector3(passX, 0.1, -passD),
    ]);
    const passPath: Path = mobile ? { kind: "pass", curve: pass, every: 6.5, dur: 5.6, offset: 1 } : { kind: "pass", curve: pass, every: 30, dur: 11, offset: 4 };
    const sharks: [Path, number, number][] = few
      ? [[mobile ? passPath : { kind: "loop", curve: loopA, speed: 2.2, phase: 0.2, bob: 0.4 }, 4.6, 1]]
      : mobile
        ? [
            [passPath, 4.8, 1.25],
            [{ kind: "loop", curve: loopA, speed: 1.8, phase: 0.35, bob: 0.4 }, 4.2, 0.9],
          ]
        : [
            [{ kind: "loop", curve: loopA, speed: 2.2, phase: 0.1, bob: 0.4 }, 4.6, 1],
            [{ kind: "loop", curve: loopB, speed: 1.7, phase: 0.6, bob: 0.3 }, 4.0, 0.8],
            [passPath, 4.8, 1.15],
          ];
    const sw = src.shark.clips.find((c) => /swim/i.test(c.name)) ?? src.shark.clips[0];
    const ci = src.shark.clips.find((c) => /circl/i.test(c.name)) ?? null;
    sharks.forEach(([path, len, pace], i) => {
      this.add(src.shark, sharkMat, eyeMat, path, len, sw, few ? null : ci, pace, i * 0.37);
    });

    // tartaruga: desktop numa volta lenta no mundo; celular, sempre à frente da câmera
    const tc = src.turtle.clips[0];
    const turtlePath: Path = mobile
      ? { kind: "orbit", dist: 7.2, rx: 0.8, rz: 0.9, w: 0.11, y: -0.9 }
      : {
          kind: "loop",
          curve: new CatmullRomCurve3(
            Array.from({ length: 8 }, (_, k) => {
              const a = (k / 8) * Math.PI * 2;
              return new Vector3(1 + 8 * 0.8 * Math.cos(a) + 4 * 0.6 * Math.sin(a), -6, -19 - 8 * 0.6 * Math.cos(a) + 4 * 0.8 * Math.sin(a));
            }),
            true,
            "catmullrom",
            0.5,
          ),
          speed: 0.55,
          phase: 0.62,
          bob: 1.1,
        };
    this.add(src.turtle, turtleMat, null, turtlePath, mobile ? 1.6 : 1.9, tc, null, 0.8, 0.5);
  }

  private add(src: Source, mat: MeshBasicMaterial, eyeMat: ShaderMaterial | null, path: Path, len: number, swimClip: AnimationClip, circleClip: AnimationClip | null, pace: number, phase: number) {
    const model = skeletonClone(src.root);
    model.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      o.material = src.eyes.length && !(o instanceof SkinnedMesh) && eyeMat ? eyeMat : mat;
      o.frustumCulled = false; // a caixa do modelo parado não acompanha a pose animada
    });
    const holder = new Group();
    holder.add(model);
    holder.scale.setScalar(len);
    const mixer = new AnimationMixer(model);
    const swim = mixer.clipAction(swimClip);
    swim.timeScale = pace;
    swim.time = phase * swimClip.duration;
    swim.play();
    const circle = circleClip ? mixer.clipAction(circleClip) : null;
    if (circle) circle.timeScale = pace;
    this.animals.push({ holder, mixer, swim, circle, path, len, circlingUntil: -1 });
    this.group.add(holder);
  }

  update(t: number, dt: number, camera: PerspectiveCamera, still: boolean) {
    fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const toWorld = (local: Vector3, out: Vector3) =>
      out.copy(camera.position).addScaledVector(right, local.x).addScaledVector(up, local.y).addScaledVector(fwd, -local.z);
    const dirToWorld = (local: Vector3, out: Vector3) =>
      out.set(0, 0, 0).addScaledVector(right, local.x).addScaledVector(up, local.y).addScaledVector(fwd, -local.z);

    // de vez em quando (~20 s) um tubarão que está dando voltas faz o "circling"
    if (!still && t > this.nextCircle) {
      this.nextCircle = t + 18 + Math.random() * 6;
      const free = this.animals.filter((a) => a.circle && a.path.kind === "loop" && a.circlingUntil < 0);
      const a = free[Math.floor(Math.random() * free.length)];
      if (a?.circle) {
        a.circle.reset().play();
        a.swim.crossFadeTo(a.circle, 1.2, false);
        a.circlingUntil = t + a.circle.getClip().duration / a.circle.timeScale;
      }
    }

    for (const a of this.animals) {
      if (a.circle && a.circlingUntil >= 0 && t > a.circlingUntil) {
        a.swim.reset().play();
        a.circle.crossFadeTo(a.swim, 1.2, false);
        a.circlingUntil = -1;
      }
      if (!still) a.mixer.update(dt);
      const slow = a.circlingUntil >= 0 ? 0.45 : 1;
      const p = a.path;
      let visible = true;
      // posição (tmpA) e rumo (tmpB) no mundo
      if (p.kind === "loop") {
        const L = p.curve.getLength();
        const u = (((p.phase + (t * p.speed * a.swim.timeScale * slow) / L) % 1) + 1) % 1;
        p.curve.getPointAt(u, tmpA);
        p.curve.getTangentAt(u, tmpB);
        tmpA.y += p.bob * Math.sin(t * 0.16 + p.phase * 6);
        p.curve.getTangentAt((u + 0.01) % 1, tmpC);
      } else if (p.kind === "pass") {
        const k = Math.floor((t + p.offset) / p.every);
        const u = still ? 0.5 : ((t + p.offset) % p.every) / p.dur;
        visible = u <= 1;
        if (visible) {
          const flip = k % 2 === 1 ? -1 : 1; // alterna o sentido
          p.curve.getPointAt(u, tmpA);
          p.curve.getTangentAt(u, tmpB);
          p.curve.getTangentAt(Math.min(1, u + 0.02), tmpC);
          tmpA.x *= flip;
          tmpB.x *= flip;
          tmpC.x *= flip;
          toWorld(tmpA.clone(), tmpA);
          dirToWorld(tmpB.clone(), tmpB);
          dirToWorld(tmpC.clone(), tmpC);
        }
      } else {
        const ang = t * p.w;
        tmpA.set(p.rx * Math.sin(ang), p.y + 0.35 * Math.sin(ang * 1.7), -(p.dist + p.rz * Math.cos(ang)));
        tmpB.set(p.rx * Math.cos(ang), 0.35 * 1.7 * Math.cos(ang * 1.7), p.rz * Math.sin(ang));
        tmpC.set(p.rx * Math.cos(ang + 0.1), 0.35 * 1.7 * Math.cos((ang + 0.1) * 1.7), p.rz * Math.sin(ang + 0.1));
        toWorld(tmpA.clone(), tmpA);
        dirToWorld(tmpB.clone(), tmpB);
        dirToWorld(tmpC.clone(), tmpC);
      }
      a.holder.visible = visible;
      if (!visible) continue;
      a.holder.position.copy(tmpA);
      tmpB.normalize();
      // corpo na direção do movimento, com leve inclinação nas curvas
      a.holder.lookAt(tmpA.clone().add(tmpB));
      const turn = tmpB.clone().cross(tmpC.normalize()).y;
      a.holder.rotateZ(Math.max(-0.35, Math.min(0.35, -turn * 18)));
    }
  }

  dispose() {
    this.animals.forEach((a) => a.mixer.stopAllAction());
    this.mats.forEach((m) => m.dispose());
  }
}
