"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import ContextLossWatcher from "./ContextLossWatcher";
import {
  AdditiveBlending,
  BackSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  Sphere,
  SphereGeometry,
  Vector2,
  Vector3,
  type MeshPhysicalMaterial,
  type WebGLRenderer,
} from "three";
import {
  createLiquidMetalMaterial,
  GRAPHITE,
  IMPACT_SLOTS,
  SILVER,
  type LiquidUniforms,
} from "./hero/liquidMetal";
import { createPlaceholderGeometry, SHAPE_RADIUS } from "./hero/shape";

const CAMERA_FOV = 20;
/** Diâmetro aparente da bola (raio + margem da ondulação). */
const SHAPE_DIAMETER = 2 * (SHAPE_RADIUS + 0.05);

/**
 * Enquadramento guiado pelo layout: a bola ocupa exatamente o elemento-âncora
 * do DOM (`anchorRef`, um quadrado posicionado pelo CSS da hero). A câmera é
 * afastada para o diâmetro da bola = altura da âncora e deslocada para o
 * centro dela. Assim tipografia e 3D compõem juntos em qualquer tela, e o
 * poster SVG (renderizado dentro da âncora) fica no mesmo lugar.
 */
function Framing({ anchorRef }: { anchorRef: RefObject<HTMLElement | null> }) {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const { gl } = get();

    const fit = () => {
      const { camera } = get();
      const c = gl.domElement.getBoundingClientRect();
      const a = anchor.getBoundingClientRect();
      if (!c.height || !a.height) return;
      const tanHalf = Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
      const halfH = (SHAPE_DIAMETER / 2) * (c.height / a.height);
      const pxPerUnit = c.height / (2 * halfH);
      const dx = (a.left + a.width / 2 - (c.left + c.width / 2)) / pxPerUnit;
      const dy = (a.top + a.height / 2 - (c.top + c.height / 2)) / pxPerUnit;
      camera.position.set(-dx, dy, halfH / tanHalf);
      camera.updateProjectionMatrix();
      invalidate();
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(anchor);
    ro.observe(gl.domElement);
    return () => ro.disconnect();
  }, [anchorRef, width, height, get, invalidate]);

  return null;
}

/**
 * Estúdio de produto gerado por código (sem HDRI externo), pensado para cromo
 * polido / mercúrio:
 * - ambiente QUASE PRETO (cúpula em degradê bem escuro): as áreas escuras é que
 *   dão o contraste do metal — um "céu" claro deixaria a bola com cara de pérola;
 * - softboxes com BORDAS SUAVES (falloff por cor de vértice) em posições
 *   ASSIMÉTRICAS, alguns inclinados: viram faixas de luz curvas e macias no
 *   metal. Faixas verticais simétricas viram "parênteses" — evite;
 * - nenhuma fonte enorme no topo (topo estourado em branco).
 */
function buildStudioEnvironment(renderer: WebGLRenderer) {
  const room = new Scene();

  const dome = new SphereGeometry(30, 64, 32);
  const pos = dome.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 30; // -1 (chão) … 1 (topo)
    const v = t > 0 ? 0.07 + 0.2 * Math.pow(t, 1.4) : 0.07 - 0.05 * Math.min(-t / 0.4, 1);
    colors.set([v, v, v * 1.04], i * 3);
  }
  dome.setAttribute("color", new Float32BufferAttribute(colors, 3));
  room.add(new Mesh(dome, new MeshBasicMaterial({ vertexColors: true, side: BackSide })));

  /** Softbox com borda macia: intensidade cai suavemente do centro às bordas. */
  const softbox = (
    w: number,
    h: number,
    position: [number, number, number],
    intensity: number,
    tilt = 0,
  ) => {
    const geo = new PlaneGeometry(w, h, 32, 12);
    const p = geo.getAttribute("position");
    const c = new Float32Array(p.count * 3);
    const smooth = (e0: number, e1: number, x: number) => {
      const k = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
      return k * k * (3 - 2 * k);
    };
    for (let i = 0; i < p.count; i++) {
      const u = Math.abs(p.getX(i)) / (w / 2);
      const v = Math.abs(p.getY(i)) / (h / 2);
      // queda longa (do centro até a borda): o reflexo vira degradê, não "janela"
      const f = intensity * smooth(1, 0.05, u) * smooth(1, 0.05, v);
      c.set([f, f, f * 1.03], i * 3);
    }
    geo.setAttribute("color", new Float32BufferAttribute(c, 3));
    // aditivo: a luz SOMA ao ambiente (bordas pretas do degradê não criam contorno)
    const mesh = new Mesh(
      geo,
      new MeshBasicMaterial({
        vertexColors: true,
        side: 2,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    mesh.position.set(...position);
    mesh.lookAt(new Vector3(0, 0, 0));
    mesh.rotateZ(tilt);
    room.add(mesh);
  };

  // Fontes fortes nas LATERAIS e ATRÁS: os reflexos vão para perto das bordas da
  // bola. O centro (que reflete o que está atrás da câmera) recebe só um fill
  // difuso — formas fortes no centro viram "olhos"/"rosto".
  softbox(20, 9, [-12, 9, 3], 3.6, -0.3); // principal: faixa macia na borda superior esquerda
  softbox(14, 10, [13, 1, -4], 2.6, 0.5); // contraluz à direita, inclinado: prata na borda
  softbox(40, 1.4, [0, -1, -12], 2.4); // fio de horizonte atrás: linha fina perto da borda
  softbox(16, 6, [0, 14, 0], 1.0); // teto discreto: topo prateado, sem estourar
  softbox(26, 16, [0, 2, 14], 0.4); // fill frontal muito difuso: centro prata-grafite, sem forma
  softbox(24, 24, [0, -12, 2], 0.3); // rebatimento do chão

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(room, 0.012);
  pmrem.dispose();

  room.traverse((obj) => {
    if (obj instanceof Mesh) {
      obj.geometry.dispose();
      (obj.material as MeshBasicMaterial).dispose();
    }
  });

  return target;
}

function Environment({ onCompiled, onReady }: { onCompiled: () => void; onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);

  useEffect(() => {
    const { scene, camera } = get();
    const target = buildStudioEnvironment(gl);
    scene.environment = target.texture;
    scene.environmentIntensity = 1;

    // Shaders compilados em paralelo (KHR_parallel_shader_compile) ANTES do
    // primeiro quadro: compilar no primeiro render travava a thread principal
    // ~1,5 s no mobile. Até lá o canvas não renderiza (frameloop "never") e o
    // pôster SVG cobre a bola. Depois, espera o primeiro quadro com o ambiente
    // aplicado antes de revelar o canvas.
    let alive = true;
    let raf1 = 0;
    let raf2 = 0;
    gl.compileAsync(scene, camera)
      .catch(() => undefined) // sem a extensão/erro: compila no primeiro render, como antes
      .then(() => {
        if (!alive) return;
        onCompiled();
        raf1 = requestAnimationFrame(() => {
          get().invalidate(); // reduced motion (frameloop "demand"): primeiro quadro
          raf2 = requestAnimationFrame(onReady);
        });
      });

    return () => {
      alive = false;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      scene.environment = null;
      target.dispose();
    };
  }, [gl, get, onCompiled, onReady]);

  return null;
}

type Pointer = { x: number; y: number };
/**
 * Estado compartilhado da interação: hover (0→1, suavizado), "tremida" dos
 * reflexos no impacto e `lock` (arrastando ou girando por inércia: o rig não
 * desloca a bola, que só gira em torno do próprio centro).
 */
type Fx = { hover: number; kick: number; lock: boolean };
const IDENTITY = new Quaternion();
const TMP_Q = new Quaternion();
const TMP_STEP = new Quaternion();

/**
 * Mouse com atraso suave (lerp exponencial, independente do FPS): desloca e
 * inclina o conjunto dentro de limites curtos e escreve a posição suavizada em
 * `pointerRef` para o shader usar.
 */
function Rig({
  children,
  interactive,
  animate,
  pointerRef,
  fxRef,
  scrollRef,
}: {
  children: ReactNode;
  interactive: boolean;
  animate: boolean;
  /** Toque: o progresso da transição hero → Mensagem guia o "ponteiro" (sem mouse). */
  scrollRef?: RefObject<number>;
  pointerRef: RefObject<Pointer>;
  fxRef: RefObject<Fx>;
}) {
  const group = useRef<Group>(null);
  const target = useRef<Pointer>({ x: 0, y: 0 });

  useEffect(() => {
    if (!interactive) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || fxRef.current.lock) return; // arrasto/inércia: sem translação
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [interactive, fxRef]);

  useFrame(({ scene, clock }, dt) => {
    const g = group.current;
    if (!g || !animate) return;

    // toque: a bola percorre a frase da Mensagem conforme o scroll (zero no
    // início da hero: a primeira tela não muda)
    if (scrollRef) {
      const s = Math.min(Math.max(scrollRef.current ?? 0, 0), 1);
      target.current.x = Math.sin(Math.PI * s) * 0.85;
      target.current.y = -Math.sin(2 * Math.PI * s) * 0.35;
    }
    const p = pointerRef.current;
    const k = 1 - Math.exp(-dt * 2.2); // atraso perceptível, sem "elástico"
    p.x += (target.current.x - p.x) * k;
    p.y += (target.current.y - p.y) * k;

    // deslocamento curto: cabe no respiro entre a bola e as frases da hero.
    // Com o cursor SOBRE a bola, ela gira e se inclina mais na direção dele
    // (fx.hover sobe e desce com inércia, sem trancos).
    const fx = fxRef.current;
    const h = fx.hover;
    g.position.x = p.x * 0.1;
    g.position.y = -p.y * 0.08;
    g.rotation.y = p.x * (0.14 + 0.32 * h);
    g.rotation.x = p.y * (0.09 + 0.22 * h);

    // Os reflexos "varrem" a superfície conforme o mouse e um leve drift no tempo;
    // no impacto, vibram de leve (fx.kick decai em ~0,6 s).
    fx.kick *= Math.exp(-dt * 5);
    const t = clock.elapsedTime;
    const drift = Math.sin(t * 0.2) * 0.08;
    scene.environmentRotation.y = p.x * 0.45 + drift + Math.sin(t * 38) * 0.035 * fx.kick;
    scene.environmentRotation.x = p.y * 0.2 + Math.cos(t * 31) * 0.02 * fx.kick;
  });

  return <group ref={group}>{children}</group>;
}

/**
 * Protagonista da hero: a bola de metal líquido. Respira o tempo todo (escala e
 * amplitude da ondulação oscilam devagar), reage ao mouse via `pointerRef` e
 * aplica a transição de scroll. O urso da Etapa 4 nasce desta mesma malha
 * animando os uniforms de forma (uMorph/uFeature*) — ver hero/liquidMetal.ts.
 */
function LiquidShape({
  light,
  animate,
  interactive,
  pointerRef,
  progress,
  fxRef,
}: {
  light: boolean;
  animate: boolean;
  interactive: boolean;
  pointerRef: RefObject<Pointer>;
  progress: RefObject<number>;
  fxRef: RefObject<Fx>;
}) {
  const geometry = useMemo(() => createPlaceholderGeometry({ light }), [light]);
  const material = useMemo(() => createLiquidMetalMaterial({ light }), [light]);
  const recede = useRef<Group>(null);
  const breath = useRef<Group>(null);
  /** Giro por arrasto/arremesso: só rotação em torno do centro da bola. */
  const spin = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  /**
   * w: velocidade angular (rad/s, eixo no mundo) da inércia; live: velocidade
   * durante o arrasto; axis: eixo atual; s/sv: mola da deformação do giro.
   */
  const spinState = useRef({ w: new Vector3(), live: 0, dragging: false, s: 0, sv: 0, axis: new Vector3(0, 1, 0) });
  const baseAmp = useRef<number | null>(null);
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);
  const hovering = useRef(false);

  // "Soquinho": raycast próprio (o canvas fica sob as frases e não recebe
  // eventos) contra a esfera da bola em coordenadas de mundo. O ponto vira uma
  // direção no espaço do objeto e ocupa um slot do ring buffer de impactos.
  useEffect(() => {
    const ray = new Raycaster();
    const ndc = new Vector2();
    const center = new Vector3();
    const scale = new Vector3();
    const sphere = new Sphere();
    const hit = new Vector3();
    let slot = 0;
    const st = spinState.current;
    const qStep = new Quaternion();
    const axis = new Vector3();
    const edge = new Vector3();
    const vel = new Vector3();
    /** Pressão em andamento sobre a bola (vira arrasto depois de 6 px). */
    let press: { id: number; x: number; y: number } | null = null;
    let last = { x: 0, y: 0 };
    /** Amostras de rotação do arrasto (para a velocidade do arremesso). */
    let samples: { t: number; x: number; y: number }[] = [];

    const pick = (cx: number, cy: number) => {
      const m = mesh.current;
      if (!m || (progress.current ?? 0) > 0.35) return null; // só com a bola em destaque
      const { camera, gl } = get();
      const r = gl.domElement.getBoundingClientRect();
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      m.getWorldPosition(center);
      m.getWorldScale(scale);
      sphere.set(center, SHAPE_RADIUS * scale.x);
      if (!ray.ray.intersectSphere(sphere, hit)) return null;
      return m.worldToLocal(hit).normalize();
    };

    // cursor: pequeno círculo que segue o mouse sobre a bola e pulsa no clique.
    // Fica no body: a hero é fixada pelo GSAP e um position:fixed dentro dela
    // ficaria deslocado.
    const cursor = document.createElement("div");
    cursor.setAttribute("aria-hidden", "true");
    Object.assign(cursor.style, {
      position: "fixed",
      left: "0",
      top: "0",
      zIndex: "60",
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 0.25s ease",
    });
    const ring = document.createElement("div");
    Object.assign(ring.style, {
      width: "18px",
      height: "18px",
      margin: "-9px 0 0 -9px",
      borderRadius: "999px",
      border: "1px solid var(--fg)",
      background: "color-mix(in srgb, var(--fg) 12%, transparent)",
    });
    cursor.appendChild(ring);
    document.body.appendChild(cursor);
    const host = get().gl.domElement.closest("section");

    const setHover = (on: boolean) => {
      if (on === hovering.current) return;
      hovering.current = on;
      cursor.style.opacity = on ? "1" : "0";
      if (host) host.style.cursor = on ? "none" : "";
    };
    // "grab" / "grabbing" no cursor-círculo: segurando, ele encolhe e preenche
    const setGrabbing = (on: boolean) => {
      ring.style.transition = "transform 0.2s ease, background 0.2s ease";
      ring.style.transform = on ? "scale(0.7)" : "";
      ring.style.background = on
        ? "color-mix(in srgb, var(--fg) 55%, transparent)"
        : "color-mix(in srgb, var(--fg) 12%, transparent)";
    };

    /** Raio da bola na tela, em px (para o arrasto girar 1:1 com o dedo/mouse). */
    const radiusPx = () => {
      const m = mesh.current;
      if (!m) return 200;
      const { camera, gl } = get();
      m.getWorldPosition(center);
      m.getWorldScale(scale);
      edge.set(center.x + SHAPE_RADIUS * scale.x, center.y, center.z).project(camera);
      center.project(camera);
      return Math.max(40, (Math.abs(edge.x - center.x) / 2) * gl.domElement.getBoundingClientRect().width);
    };

    /** Velocidade angular dos últimos ~100 ms do gesto (rad/s, vetor no mundo). */
    const recentVelocity = (out: Vector3) => {
      const now = performance.now();
      samples = samples.filter((s) => now - s.t <= 100);
      if (samples.length < 2) return out.set(0, 0, 0);
      const span = Math.max((now - samples[0].t) / 1000, 0.016);
      let x = 0;
      let y = 0;
      for (const s of samples) {
        x += s.x;
        y += s.y;
      }
      return out.set(x / span, y / span, 0);
    };

    /** Gira pelo arrasto: deslocamento em px vira arco na superfície (eixo ⟂ ao gesto). */
    const rotateBy = (dx: number, dy: number) => {
      const g = spin.current;
      const len = Math.hypot(dx, dy);
      if (!g || len === 0) return;
      const angle = len / radiusPx();
      axis.set(dy / len, dx / len, 0);
      qStep.setFromAxisAngle(axis, angle);
      g.quaternion.premultiply(qStep);
      samples.push({ t: performance.now(), x: axis.x * angle, y: axis.y * angle });
      st.axis.copy(axis);
      st.live = recentVelocity(vel).length();
      if (!animate) invalidate();
    };

    const punch = (cx: number, cy: number) => {
      const dir = pick(cx, cy);
      const m = mesh.current;
      if (!dir || !m) return;
      const u = (m.material as MeshPhysicalMaterial).userData.uniforms as LiquidUniforms;
      ring.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.9)", opacity: 0.4 }, { transform: "scale(1)" }],
        { duration: 380, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      );
      if (!animate) {
        // reduced motion: sem ondas, só um brilho suave no ponto tocado
        u.uGlowDir.value.copy(dir);
        u.uGlow.value = 1;
        invalidate();
        return;
      }
      u.uImpactDir.value[slot].copy(dir);
      u.uImpactStart.value[slot] = u.uClock.value;
      u.uImpactForce.value[slot] = 0.85 + Math.random() * 0.3;
      slot = (slot + 1) % IMPACT_SLOTS;
      fxRef.current.kick = 1;
    };

    // Pressionar sobre a bola: se mover mais de 6 px, é ARRASTO (gira 1:1 e,
    // ao soltar, arremessa com a velocidade do gesto); se soltar antes, é o
    // SOQUINHO. Mouse e toque seguem o mesmo caminho; no toque, só começa se o
    // dedo pousar na bola (o alvo circular da hero tem touch-action: none).
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !pick(e.clientX, e.clientY)) return;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY };
      last = { x: e.clientX, y: e.clientY };
      samples = [];
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        if (!st.dragging) setHover(!!pick(e.clientX, e.clientY));
      }
      if (!press || e.pointerId !== press.id) return;
      if (!st.dragging) {
        if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < 6) return;
        st.dragging = true;
        fxRef.current.lock = true;
        st.w.set(0, 0, 0);
        setGrabbing(true);
      }
      rotateBy(e.clientX - last.x, e.clientY - last.y);
      last = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      if (st.dragging) {
        // arremesso: continua com a velocidade do gesto (reduced motion: para)
        if (animate) recentVelocity(st.w);
        else st.w.set(0, 0, 0);
        st.dragging = false;
        setGrabbing(false);
        if (e.pointerType === "mouse") setHover(!!pick(e.clientX, e.clientY));
      } else {
        punch(e.clientX, e.clientY);
      }
      press = null;
    };
    const onCancel = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      st.dragging = false;
      setGrabbing(false);
      press = null;
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onCancel, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      if (host) host.style.cursor = "";
      cursor.remove();
    };
  }, [get, invalidate, animate, progress, fxRef]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ scene }, delta) => {
    const dt = Math.min(delta, 0.05);
    const m = mesh.current;
    const g = recede.current;
    const b = breath.current;
    if (!m || !g || !b) return;
    const mat = m.material as MeshPhysicalMaterial;
    const u = mat.userData.uniforms as LiquidUniforms;
    baseAmp.current ??= u.uAmp.value;

    // relógio dos impactos (independe da respiração) e hover com inércia
    u.uClock.value += dt;
    const fx = fxRef.current;
    fx.hover += ((hovering.current ? 1 : 0) - fx.hover) * (1 - Math.exp(-dt * 3));
    if (u.uGlow.value > 0) {
      u.uGlow.value = Math.max(0, u.uGlow.value - dt * 0.9);
      invalidate(); // reduced motion (frameloop "demand"): anima só o brilho
    }

    // Giro: inércia com atrito suave; parado, a orientação volta aos poucos à
    // original (o urso da Etapa 4 depende dela). Só rotação, nunca translação.
    const st = spinState.current;
    const sg = spin.current;
    if (sg) {
      const speed = st.w.length();
      if (!st.dragging && speed > 0.0005) {
        st.axis.copy(st.w).divideScalar(speed);
        sg.quaternion.premultiply(TMP_STEP.setFromAxisAngle(st.axis, speed * dt));
        st.w.multiplyScalar(Math.exp(-dt * 1.1));
        if (st.w.length() < 0.05) st.w.set(0, 0, 0);
      }
      if (!st.dragging && speed < 0.4) sg.quaternion.slerp(IDENTITY, 1 - Math.exp(-dt * 0.7));
      fx.lock = st.dragging || speed > 0.4;
      if (st.dragging) st.live *= Math.exp(-dt * 6); // dedo parado = sem velocidade

      // deformação líquida ∝ velocidade angular, em mola amortecida (balanço ao frear)
      if (animate) {
        const live = st.dragging ? st.live : speed;
        const target = Math.min(live / 9, 1);
        st.sv += ((target - st.s) * 60 - st.sv * 9) * dt;
        st.s += st.sv * dt;
        // eixo no espaço do objeto (a malha gira junto com o grupo)
        if (live > 0.05) u.uSpinAxis.value.copy(st.axis).applyQuaternion(TMP_Q.copy(sg.quaternion).invert());
        u.uSpin.value = Math.abs(st.s) < 0.0005 && Math.abs(st.sv) < 0.001 ? 0 : st.s;
      }
    }

    if (animate) {
      u.uTime.value += dt;
      // respiração: ciclo lento (~11 s) de volume e de intensidade da ondulação
      const t = u.uTime.value;
      b.scale.setScalar(1 + Math.sin(t * 0.55) * 0.018);
      u.uAmp.value = baseAmp.current * (0.8 + 0.2 * Math.sin(t * 0.3 + 1.2));
    }

    const p = pointerRef.current;
    u.uPointerDir.value.set(p.x, -p.y, 0.9).normalize();
    u.uPointerStrength.value = interactive ? Math.min(Math.hypot(p.x, p.y), 1) * 0.09 : 0;

    // Transição para o manifesto: a forma recua, perde brilho e escurece para grafite.
    const s = Math.min(Math.max(progress.current ?? 0, 0), 1);
    const e = s * s * (3 - 2 * s);
    g.scale.setScalar(1 - 0.36 * e);
    g.position.set(0, 0.25 * e, -2.4 * e);
    mat.color.lerpColors(SILVER, GRAPHITE, e);
    scene.environmentIntensity = 1 - 0.78 * e;
  });

  return (
    <group ref={recede}>
      <group ref={breath}>
        <group ref={spin}>
          <mesh ref={mesh} geometry={geometry} material={material} />
        </group>
      </group>
    </group>
  );
}

export type HeroSceneProps = {
  /** Hero visível na tela? Fora dela o render é pausado. */
  active: boolean;
  /** Usuário prefere menos movimento: render estático, sem reação ao mouse. */
  reducedMotion: boolean;
  /** Dispositivo de toque: menos polígonos, 1 oitava de ruído, DPR menor e sem mouse. */
  coarse: boolean;
  /** Teto de DPR do nível de qualidade (lib/quality). */
  maxDpr: number;
  /** Progresso 0→1 da transição hero → manifesto (escrito pelo ScrollTrigger). */
  progress: RefObject<number>;
  /** Elemento do DOM que define posição e tamanho da bola (ver Framing). */
  anchorRef: RefObject<HTMLElement | null>;
  onReady: () => void;
  /** Perda do contexto WebGL (o pai remonta a cena). */
  onContextLost?: () => void;
};

export default function HeroScene({
  active,
  reducedMotion,
  coarse,
  maxDpr,
  progress,
  anchorRef,
  onReady,
  onContextLost,
}: HeroSceneProps) {
  const animate = !reducedMotion;
  const interactive = animate && !coarse;
  /** Toque (sem mouse): o ponteiro vem do scroll. */
  const scrollDriven = animate && coarse;
  const pointer = useRef<Pointer>({ x: 0, y: 0 });
  const fx = useRef<Fx>({ hover: 0, kick: 0, lock: false });
  /** Shaders prontos (compileAsync): antes disso, nenhum quadro é desenhado. */
  const [compiled, setCompiled] = useState(false);
  const handleCompiled = useCallback(() => setCompiled(true), []);

  return (
    <Canvas
      aria-hidden="true"
      className="!pointer-events-none"
      frameloop={!compiled ? "never" : reducedMotion ? "demand" : active ? "always" : "never"}
      dpr={[1, Math.min(coarse ? 1.5 : 2, maxDpr)]}
      camera={{ position: [0, 0, 20], fov: CAMERA_FOV }}
      gl={{ antialias: true, alpha: true, powerPreference: "default" }}
    >
      <ContextLossWatcher onLost={onContextLost} />
      <Framing anchorRef={anchorRef} />
      <Environment onCompiled={handleCompiled} onReady={onReady} />
      <Rig interactive={interactive} animate={animate} pointerRef={pointer} fxRef={fx} scrollRef={scrollDriven ? progress : undefined}>
        <LiquidShape
          light={coarse}
          animate={animate}
          interactive={interactive || scrollDriven}
          pointerRef={pointer}
          progress={progress}
          fxRef={fx}
        />
      </Rig>
    </Canvas>
  );
}
