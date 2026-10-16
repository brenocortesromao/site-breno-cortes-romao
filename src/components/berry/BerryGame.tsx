"use client";

import { useEffect, useRef, useState } from "react";
import { rawRaf } from "@/lib/siteFreeze";
import { isMobileUI } from "@/lib/mobile";
import type { BerryConfig } from "./copy";

/**
 * Jogo do Berry, o urso astronauta (easter egg). Canvas 2D puro, sem WebGL (nÃ£o
 * ocupa vaga no orÃ§amento de contextos de lib/quality.ts). Porte do protÃ³tipo
 * aprovado: mesma fÃ­sica, visual, obstÃ¡culos e animaÃ§Ã£o articulada do urso.
 * O mundo Ã© desenhado numa altura virtual de 440 (largura mÃ­nima 440) e
 * escalado para a tela cheia, entÃ£o a jogabilidade Ã© a mesma em qualquer tela.
 * Meta: 2.000 km (a pontuaÃ§Ã£o conta os km); o planeta cresce com o progresso.
 * LaÃ§o de quadros pelo `rawRaf` (o resto do site estÃ¡ congelado, ver siteFreeze).
 */

type Screen = "onboarding" | "play" | "arrive" | "paused" | "over" | "won";
type Ending = { phase: "approach" | "walk" | "plant" | "wave"; ship: number; tp: number; done?: boolean };
type Obstacle = {
  k: string;
  x: number;
  w: number;
  h: number;
  y?: number;
  a?: number;
  seed?: number;
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };
type Dust = { x: number; y: number; vx: number; vy: number; life: number; r: number };

const GOAL = 2000;
const VH = 440;
const VMIN_W = 440;
const G = 2400;
const JUMP = -860;
const DH = 104;
const SPR = { w: 177, h: 260, nozzle: [8, 176] };
const PARTS = ["head", "arm", "torso", "legL", "legR"] as const;
const HI_KEY = "urso-hi";

const pad = (n: number) => String(Math.floor(n)).padStart(5, "0");

export default function BerryGame({ copy, locale, whatsappHref }: BerryConfig) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hiEl = useRef<HTMLElement>(null);
  const scEl = useRef<HTMLElement>(null);
  const kmEl = useRef<HTMLElement>(null);
  const fillEl = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [step, setStep] = useState(0);
  const api = useRef({
    press: () => {},
    next: () => {},
    skip: () => {},
    restart: () => {},
    resume: () => {},
  });

  useEffect(() => {
    const cv = canvas.current;
    const host = root.current;
    const raf = rawRaf;
    if (!cv || !host || !raf) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nf = new Intl.NumberFormat(locale);

    let alive = true;
    let W = VMIN_W;
    let H = VH;
    let S = 1;
    let DPR = 1;
    let GROUND = 0;
    let narrow = false;
    let ending: Ending | null = null;
    let bearX = 0;

    let hi = 0;
    try {
      hi = +(localStorage.getItem(HI_KEY) ?? 0) || 0;
    } catch {
      /* sem armazenamento */
    }
    if (hiEl.current) hiEl.current.textContent = pad(hi);

    const resize = () => {
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      DPR = Math.min(isMobileUI() ? 1.5 : 2, window.devicePixelRatio || 1);
      S = Math.min(r.height / VH, r.width / VMIN_W);
      narrow = r.width <= 640;
      W = r.width / S;
      H = r.height / S;
      cv.width = Math.round(r.width * DPR);
      cv.height = Math.round(r.height * DPR);
      ctx.setTransform(DPR * S, 0, 0, DPR * S, 0, 0);
      GROUND = Math.round(H * (H <= 500 ? 0.78 : 0.72));
      if (!ending) bearX = W * 0.16;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // ---------------------------------------------------------- mundo
    const stars = [...Array(140)].map(() => ({ x: Math.random(), y: Math.random() * 0.74, z: Math.random() * 0.9 + 0.1 }));
    const craters = [...Array(9)].map((_, i) => ({ x: i / 9 + Math.random() * 0.05, r: 18 + Math.random() * 44, band: i % 2 }));
    const pebbles = [...Array(14)].map(() => ({ x: Math.random(), y: Math.random(), r: 1.5 + Math.random() * 2.5 }));
    const ridgeSeed = [...Array(8)].map(() => Math.random() * 6.28);
    const specks = [...Array(60)].map(() => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.4 }));

    let sc: Screen = "onboarding";
    let stepN = 0;
    let t = 0;
    let score = 0;
    let speed = 380;
    let dist = 0;
    let obs: Obstacle[] = [];
    let nextGap = 0;
    let flash = 0;
    let parts: Particle[] = [];
    let dust: Dust[] = [];
    let lastStep = 0;
    let lockUntil = 0;
    let lastKm = -1;
    const bear = { y: 0, vy: 0, on: true, run: 0, land: 0 };

    const go = (s: Screen) => {
      sc = s;
      setScreen(s);
    };

    const progress = () => Math.min(1, score / GOAL);
    const updateBar = () => {
      const left = Math.max(0, Math.ceil(GOAL - score));
      if (left !== lastKm) {
        lastKm = left;
        if (kmEl.current) kmEl.current.textContent = `${nf.format(left)} ${copy.km}`;
      }
      if (fillEl.current) fillEl.current.style.transform = `scaleX(${progress()})`;
    };

    const reset = () => {
      ending = null;
      bearX = W * 0.16;
      obs = [];
      parts = [];
      dust = [];
      score = 0;
      dist = 0;
      speed = 380;
      nextGap = 420;
      bear.y = 0;
      bear.vy = 0;
      bear.on = true;
      flash = 0;
      if (scEl.current) scEl.current.textContent = pad(0);
      updateBar();
    };
    reset();

    const emit = (power: number) => {
      const k = DH / SPR.h;
      const bx = bearX;
      const nx = bx + SPR.nozzle[0] * k + 2;
      const ny = GROUND + bear.y - (SPR.h - SPR.nozzle[1]) * k;
      parts.push({
        x: nx + (Math.random() - 0.5) * 6,
        y: ny,
        vx: -15 - Math.random() * 45 * power,
        vy: 160 + Math.random() * 200 * power,
        life: 0.14 + Math.random() * 0.16 * power,
        max: 0.4 * power,
        r: 3 + Math.random() * 4 * power,
      });
    };
    const stepDust = (fx: number) => {
      for (let i = 0; i < 4; i++)
        dust.push({
          x: fx + (Math.random() - 0.5) * 8,
          y: GROUND - 2,
          vx: -60 - Math.random() * 60,
          vy: -20 - Math.random() * 40,
          life: 0.35 + Math.random() * 0.2,
          r: 2 + Math.random() * 2.5,
        });
    };

    const jump = () => {
      if (sc === "play" && bear.on) {
        bear.vy = JUMP;
        bear.on = false;
        for (let i = 0; i < 22; i++) emit(1.6);
      }
    };
    const begin = () => {
      reset();
      go("play");
    };
    const saveHi = () => {
      if (score > hi) {
        hi = Math.floor(score);
        try {
          localStorage.setItem(HI_KEY, String(hi));
        } catch {
          /* sem armazenamento */
        }
        if (hiEl.current) hiEl.current.textContent = pad(hi);
      }
    };
    const gameOver = () => {
      flash = reduced ? 0 : 0.25;
      lockUntil = performance.now() + 600;
      saveHi();
      go("over");
    };
    // fim da chegada: aparece a tela de vitÃ³ria (no topo), a cena continua embaixo
    const win = () => {
      if (ending) ending.phase = "wave";
      flash = 0;
      lockUntil = performance.now() + 600;
      saveHi();
      go("won");
    };

    api.current = {
      press: () => {
        if (sc === "onboarding") api.current.next();
        else if (sc === "play") jump();
        else if (sc === "paused") api.current.resume();
        else if (sc === "arrive") return;
        else if (performance.now() >= lockUntil) api.current.restart();
      },
      next: () => {
        if (stepN >= 2) begin();
        else {
          stepN++;
          setStep(stepN);
        }
      },
      skip: () => begin(),
      restart: () => {
        if (performance.now() >= lockUntil) begin();
      },
      resume: () => {
        last = performance.now();
        go("play");
      },
    };

    // ---------------------------------------------------------- entrada
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.code !== "ArrowUp" && e.code !== "KeyW") return;
      const a = document.activeElement;
      if (e.code === "Space" && a instanceof HTMLElement && a.closest("button, a")) return; // o botÃ£o trata
      e.preventDefault();
      if (e.repeat && sc !== "play") return;
      api.current.press();
    };
    const onPointer = (e: PointerEvent) => {
      if ((e.target as Element).closest("button, a")) return;
      e.preventDefault();
      if (sc === "over" || sc === "won") return; // sÃ³ pelos botÃµes ou pelo espaÃ§o
      api.current.press();
    };
    const onVisibility = () => {
      if (document.hidden && sc === "play") go("paused");
      last = performance.now();
    };
    window.addEventListener("keydown", onKey, true);
    host.addEventListener("pointerdown", onPointer);
    document.addEventListener("visibilitychange", onVisibility);

    const spawn = () => {
      const level = Math.min(1, (speed - 380) / 520);
      const X = W + 40;
      const fly = (k: string, w: number, h: number, lo: number, hi2: number) =>
        obs.push({ k, x: X + 10, y: GROUND - (Math.random() < 0.5 ? lo : hi2), w, h, a: Math.random() * 6 });
      const pool = ["rock", "rock", "flag", "crystal"];
      if (score > 150) pool.push("alien", "dish");
      if (score > 300) pool.push("robot");
      if (score > 350) pool.push("sat");
      if (score > 500) pool.push("ufo", "drone");
      if (score > 700) pool.push("car");
      const k = pool[Math.floor(Math.random() * pool.length)];
      if (k === "rock") {
        const s = Math.random();
        obs.push({ k, x: X, w: 26 + s * 30, h: 20 + s * 26, seed: Math.random() });
      } else if (k === "flag") {
        obs.push({ k, x: X, w: 18, h: 44 + Math.random() * 18 });
        if (Math.random() < 0.25 + level * 0.3) obs.push({ k: "rock", x: X + 40 + Math.random() * 30, w: 24, h: 22, seed: Math.random() });
      } else if (k === "crystal") obs.push({ k, x: X, w: 34, h: 30 + Math.random() * 16, a: Math.random() * 6, seed: Math.random() });
      else if (k === "alien") obs.push({ k, x: X, w: 30, h: 36, a: Math.random() * 6 });
      else if (k === "dish") obs.push({ k, x: X, w: 36, h: 40, a: Math.random() * 6 });
      else if (k === "robot") obs.push({ k, x: X, w: 30, h: 48, a: Math.random() * 6 });
      else if (k === "sat") fly("sat", 46, 20, 54, 124);
      else if (k === "ufo") fly("ufo", 56, 22, 56, 126);
      else if (k === "drone") fly("drone", 40, 18, 58, 128);
      else if (k === "car") fly("car", 64, 20, 56, 124);
      const minGap = speed * 0.62;
      const maxGap = speed * 1.35;
      nextGap = minGap + Math.random() * (maxGap - minGap);
    };

    // ---------------------------------------------------------- laÃ§o
    let last = performance.now();
    const loop = (now: number) => {
      if (!alive) return;
      raf(loop);
      const dt = Math.min(0.034, (now - last) / 1000);
      last = now;
      t += dt;
      if (sc === "play") {
        speed = Math.min(900, speed + 12 * dt);
        const dx = speed * dt;
        dist += dx;
        score += dx * 0.05;
        nextGap -= dx;
        if (nextGap <= 0 && score < GOAL - 200) spawn(); // nos Ãºltimos 200 km, sem obstÃ¡culos novos
        for (const o of obs) {
          o.x -= dx;
          o.a = (o.a || 0) + dt * (o.k === "alien" ? 7 : o.k === "robot" ? 5 : 1.6);
        }
        if (!bear.on && bear.vy < 200) {
          emit(1);
          emit(1);
        }
        for (const q of parts) {
          q.x += q.vx * dt - dx * 0.2;
          q.y += q.vy * dt;
          q.life -= dt;
        }
        parts = parts.filter((q) => q.life > 0);
        obs = obs.filter((o) => o.x + o.w > -40);
        bear.vy += G * dt;
        bear.y += bear.vy * dt;
        if (bear.y >= 0) {
          if (!bear.on) {
            bear.land = 0.14;
            stepDust(bearX + 30);
            stepDust(bearX + 50);
          }
          bear.y = 0;
          bear.vy = 0;
          bear.on = true;
        }
        if (bear.land > 0) bear.land -= dt;
        for (const q of dust) {
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          q.vy += 60 * dt;
          q.life -= dt;
        }
        dust = dust.filter((q) => q.life > 0);
        bear.run += dt * (6 + speed / 70);
        // colisÃ£o (caixa tolerante)
        const bx = bearX;
        const bw = (DH * SPR.w) / SPR.h;
        const bh = DH - 12;
        const by = GROUND + bear.y - bh;
        for (const o of obs) {
          const fl = o.k === "sat" || o.k === "ufo" || o.k === "drone" || o.k === "car";
          const oy = fl ? (o.y as number) : GROUND - o.h;
          const ins = fl ? 6 : 5;
          if (bx + 12 < o.x + o.w - ins && bx + bw - 10 > o.x + ins && by + 8 < oy + o.h - 2 && by + bh > oy + ins) {
            gameOver();
            break;
          }
        }
        if (sc === "play") {
          if (scEl.current) scEl.current.textContent = pad(score);
          updateBar();
          if (score >= GOAL && sc === "play") {
            ending = { phase: "approach", ship: W + 80, tp: 0 };
            go("arrive");
          }
        }
      } else if (sc === "arrive" && ending) {
        // chegada: sem colisÃ£o; foguete entra, o Berry desacelera, caminha, planta a bandeira e acena
        const e = ending;
        e.tp += dt;
        bear.vy += G * dt;
        bear.y += bear.vy * dt;
        if (bear.y >= 0) {
          bear.y = 0;
          bear.vy = 0;
          bear.on = true;
        }
        for (const q of parts) {
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          q.life -= dt;
        }
        parts = parts.filter((q) => q.life > 0);
        for (const q of dust) {
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          q.vy += 60 * dt;
          q.life -= dt;
        }
        dust = dust.filter((q) => q.life > 0);
        const dw = (DH * SPR.w) / SPR.h;
        const flagX = () => e.ship - 72;
        const target = () => flagX() - dw - 4;
        if (e.phase === "approach") {
          speed = Math.max(240, speed - 260 * dt);
          const dx = speed * dt;
          dist += dx;
          e.ship -= dx;
          for (const o of obs) o.x -= dx;
          bear.run += dt * (6 + speed / 70);
          if (e.ship <= W * 0.7) {
            e.phase = "walk";
            e.tp = 0;
          }
        } else if (e.phase === "walk") {
          bearX = Math.min(target(), bearX + 230 * dt);
          bear.run += dt * 11;
          if (bearX >= target() - 0.5 && bear.on) {
            e.phase = "plant";
            e.tp = 0;
          }
        } else if (e.phase === "plant") {
          if (e.tp > 1.3) {
            e.phase = "wave";
            e.tp = 0;
          }
        } else if (e.phase === "wave") {
          if (e.tp > 1.6 && !e.done) {
            e.done = true;
            win();
          }
        }
      } else if (sc === "onboarding") bear.run += dt * 6;
      if (flash > 0) flash -= dt;
      try {
        draw();
      } catch (e) {
        console.warn(e);
      }
    };

    // ---------------------------------------------------------- desenho
    const IMG: Partial<Record<(typeof PARTS)[number], ImageBitmap>> = {};
    for (const k of PARTS) {
      fetch(`/berry/berry-${k}.png`)
        .then((r) => r.blob())
        .then((b) => createImageBitmap(b))
        .then((bm) => {
          if (alive) IMG[k] = bm;
        })
        .catch((e) => console.warn("sprite", k, e));
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#050505");
      g.addColorStop(1, "#101010");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const scroll = dist || t * 60;
      for (const s of stars) {
        const x = (((s.x * W - scroll * 0.04 * s.z) % W) + W) % W;
        ctx.globalAlpha = 0.25 + 0.6 * s.z * (0.75 + 0.25 * Math.sin(t * 2 + s.x * 40));
        ctx.fillStyle = "#f2f2f0";
        ctx.fillRect(x, s.y * H, s.z * 1.6, s.z * 1.6);
      }
      ctx.globalAlpha = 1;
      // planeta com anÃ©is: cresce e se aproxima com o progresso
      const prog = sc === "onboarding" ? 0 : progress();
      drawPlanet(W * (0.84 - 0.2 * prog), H * (0.3 - 0.02 * prog), Math.min(W, H) * (0.13 + 0.2 * prog));
      drawRidge(scroll * 0.18, GROUND, 0.55, "#141414", "#2a2a29", 1);
      drawRidge(scroll * 0.42, GROUND, 0.32, "#0f0f0f", "#323231", 2);
      const gg = ctx.createLinearGradient(0, GROUND, 0, H);
      gg.addColorStop(0, "#1a1a19");
      gg.addColorStop(1, "#0a0a0a");
      ctx.fillStyle = gg;
      ctx.fillRect(0, GROUND, W, H - GROUND);
      for (const q of specks) {
        const x = (((q.x * W - scroll) % W) + W) % W;
        ctx.fillStyle = "#2c2c2b";
        ctx.beginPath();
        ctx.arc(x, GROUND + 6 + q.y * (H - GROUND - 10), q.r, 0, 7);
        ctx.fill();
      }
      for (const c of craters) {
        const sp = c.band ? 1.15 : 0.85;
        const x = ((((c.x * W * 2 - scroll * sp) % (W * 2)) + W * 2) % (W * 2)) - W * 0.3;
        const y = GROUND + (c.band ? (H - GROUND) * 0.62 : (H - GROUND) * 0.25);
        const rx = c.r * (c.band ? 1 : 0.6);
        const ry = rx * 0.22;
        ctx.fillStyle = "#070707";
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, 7);
        ctx.fill();
        ctx.fillStyle = "#121212";
        ctx.beginPath();
        ctx.ellipse(x + rx * 0.12, y + ry * 0.15, rx * 0.82, ry * 0.7, 0, 0, 7);
        ctx.fill();
        ctx.strokeStyle = "#4a4a48";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, Math.PI * 0.05, Math.PI * 0.95);
        ctx.stroke();
        ctx.strokeStyle = "#262625";
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
      }
      ctx.strokeStyle = "#5a5a58";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 6) {
        const wx = x + scroll;
        const b = Math.max(0, Math.sin(wx * 0.021) * Math.sin(wx * 0.0053)) * 2.2;
        if (x) ctx.lineTo(x, GROUND + 0.5 - b);
        else ctx.moveTo(x, GROUND + 0.5 - b);
      }
      ctx.stroke();
      for (const q of pebbles) {
        const x = ((((q.x * W * 1.5 - scroll) % (W * 1.5)) + W * 1.5) % (W * 1.5)) - W * 0.2;
        ctx.fillStyle = "#3a3a38";
        ctx.beginPath();
        ctx.ellipse(x, GROUND + 2 + q.y * 4, q.r * 1.4, q.r, 0, 0, 7);
        ctx.fill();
        ctx.fillStyle = "#6a6a67";
        ctx.beginPath();
        ctx.ellipse(x - q.r * 0.3, GROUND + 1 + q.y * 4, q.r * 0.6, q.r * 0.35, 0, 0, 7);
        ctx.fill();
      }
      for (const o of obs) OBS[o.k]?.(o);
      drawFlame();
      if (ending) {
        drawShip(ending.ship);
        drawFlag2(ending);
      }
      if (sc === "onboarding") drawIntroBerry();
      else if (ending && ending.phase === "wave") drawIntroBerry(bearX + (DH * SPR.w) / SPR.h / 2, GROUND, DH, true);
      else drawBear(bearX, GROUND + bear.y);
      if (ending && ending.phase === "wave") drawSparkles(ending.ship - 72, GROUND - 70);
      if (flash > 0) {
        ctx.fillStyle = `rgba(242,242,240,${flash * 0.6})`;
        ctx.fillRect(0, 0, W, H);
      }
    };

    const drawPlanet = (x: number, y: number, r: number) => {
      ctx.save();
      const pg = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
      pg.addColorStop(0, "#9b9b98");
      pg.addColorStop(0.6, "#3a3a38");
      pg.addColorStop(1, "#141414");
      ctx.strokeStyle = "rgba(200,200,196,.35)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.9, r * 0.42, -0.32, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.9, r * 0.42, -0.32, 0, Math.PI);
      ctx.stroke();
      ctx.strokeStyle = "rgba(200,200,196,.18)";
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.6, r * 0.33, -0.32, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
    };
    const drawRidge = (off: number, base: number, hf: number, fill: string, edge: string, seedOff: number) => {
      const amp = H * 0.09 * hf * 2;
      const yAt = (x: number) => {
        const wx = (x + off) * 0.004;
        let y = 0;
        for (let i = 0; i < 4; i++) y += Math.sin(wx * (i + 1) * 1.7 + ridgeSeed[i + seedOff]) / (i + 1.4);
        return base - amp * (0.55 + 0.3 * y);
      };
      ctx.beginPath();
      ctx.moveTo(0, base);
      for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, yAt(x));
      ctx.lineTo(W, base);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W + 8; x += 8) {
        if (x) ctx.lineTo(x, yAt(x));
        else ctx.moveTo(x, yAt(x));
      }
      ctx.stroke();
    };
    const drawRock = (o: Obstacle) => {
      const x = o.x;
      const y = GROUND;
      const w = o.w;
      const h = o.h;
      const s = o.seed as number;
      ctx.fillStyle = "#cfcfcb";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w * 0.12, y - h * 0.55);
      ctx.lineTo(x + w * (0.3 + s * 0.1), y - h);
      ctx.lineTo(x + w * 0.62, y - h * (0.82 + s * 0.15));
      ctx.lineTo(x + w * 0.9, y - h * 0.5);
      ctx.lineTo(x + w, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8e8e8b";
      ctx.beginPath();
      ctx.moveTo(x + w * 0.62, y - h * (0.82 + s * 0.15));
      ctx.lineTo(x + w * 0.9, y - h * 0.5);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w * 0.55, y);
      ctx.closePath();
      ctx.fill();
    };
    const drawFlag = (o: Obstacle) => {
      const x = o.x + 6;
      const y = GROUND;
      const h = o.h;
      ctx.strokeStyle = "#cfcfcb";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - h);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y - h + 4);
      ctx.lineTo(x - 8, y - h - 6);
      ctx.moveTo(x, y - h + 4);
      ctx.lineTo(x + 8, y - h - 6);
      ctx.stroke();
      ctx.fillStyle = "#f2f2f0";
      ctx.beginPath();
      ctx.arc(x, y - h + 4, 3, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#7a7a77";
      ctx.fillRect(x - 7, y - 5, 14, 5);
    };
    const drawSat = (o: Obstacle) => {
      ctx.save();
      ctx.translate(o.x + o.w / 2, (o.y as number) + o.h / 2);
      ctx.rotate(Math.sin(o.a as number) * 0.25);
      ctx.fillStyle = "#cfcfcb";
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = "#5b5b59";
      ctx.fillRect(-23, -4, 13, 8);
      ctx.fillRect(10, -4, 13, 8);
      ctx.strokeStyle = "#cfcfcb";
      ctx.lineWidth = 1;
      ctx.strokeRect(-23, -4, 13, 8);
      ctx.strokeRect(10, -4, 13, 8);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(0, -13);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -14, 2, 0, 7);
      ctx.fill();
      ctx.restore();
    };
    const drawCrystal = (o: Obstacle) => {
      const x = o.x;
      const y = GROUND;
      const h = o.h;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + (o.a as number));
      ctx.save();
      const gl = ctx.createRadialGradient(x + o.w / 2, y - h * 0.4, 2, x + o.w / 2, y - h * 0.4, h);
      gl.addColorStop(0, `rgba(220,236,240,${0.18 + 0.12 * pulse})`);
      gl.addColorStop(1, "rgba(220,236,240,0)");
      ctx.fillStyle = gl;
      ctx.fillRect(x - h * 0.5, y - h * 1.4, o.w + h, h * 1.4);
      const sh = [
        [0.15, 0.55, -0.25],
        [0.45, 1, 0],
        [0.75, 0.7, 0.28],
      ];
      for (const [cx, ch, lean] of sh) {
        const bx = x + o.w * cx;
        const hh = h * ch;
        ctx.fillStyle = "#d9e3e5";
        ctx.beginPath();
        ctx.moveTo(bx - 6, y);
        ctx.lineTo(bx - 4 + lean * hh * 0.4, y - hh * 0.8);
        ctx.lineTo(bx + lean * hh * 0.5, y - hh);
        ctx.lineTo(bx + 4 + lean * hh * 0.4, y - hh * 0.8);
        ctx.lineTo(bx + 6, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#8fa0a4";
        ctx.beginPath();
        ctx.moveTo(bx, y);
        ctx.lineTo(bx + lean * hh * 0.5, y - hh);
        ctx.lineTo(bx + 4 + lean * hh * 0.4, y - hh * 0.8);
        ctx.lineTo(bx + 6, y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };
    const drawDish = (o: Obstacle) => {
      const x = o.x + o.w / 2;
      const y = GROUND;
      const sw = Math.sin((o.a as number) * 0.8) * 0.25;
      ctx.save();
      ctx.strokeStyle = "#9c9c99";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 22);
      ctx.stroke();
      ctx.fillStyle = "#7a7a77";
      ctx.fillRect(x - 9, y - 4, 18, 4);
      ctx.translate(x, y - 24);
      ctx.rotate(-0.5 + sw);
      ctx.fillStyle = "#cfcfcb";
      ctx.beginPath();
      ctx.ellipse(0, 0, 17, 7, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "#cfcfcb";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-10, -3);
      ctx.lineTo(0, -14);
      ctx.lineTo(10, -3);
      ctx.stroke();
      ctx.fillStyle = Math.floor(t * 4) % 2 ? "#f2f2f0" : "#5b5b59";
      ctx.beginPath();
      ctx.arc(0, -15, 2, 0, 7);
      ctx.fill();
      ctx.restore();
    };
    const drawRobot = (o: Obstacle) => {
      const x = o.x;
      const y = GROUND;
      const w = o.w;
      const step = Math.sin(o.a as number) * 2;
      ctx.save();
      ctx.fillStyle = "#3a3a38";
      ctx.fillRect(x + 2, y - 8, w - 4, 8);
      ctx.fillStyle = "#5b5b59";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x + 6 + (i * (w - 12)) / 3, y - 4, 2.4, 0, 7);
        ctx.fill();
      }
      ctx.fillStyle = "#bdbdb9";
      ctx.fillRect(x + 4, y - 30 + step * 0.3, w - 8, 22);
      ctx.fillStyle = "#2a2a29";
      ctx.fillRect(x + 8, y - 25 + step * 0.3, w - 16, 8);
      ctx.fillStyle = "#f2f2f0";
      for (let i = 0; i < 3; i++) ctx.fillRect(x + 10 + i * 4, y - 22 + step * 0.3, 2, 2);
      ctx.fillStyle = "#cfcfcb";
      ctx.beginPath();
      ctx.arc(x + w / 2, y - 34 + step * 0.3, 9, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x + w / 2 - 9, y - 34 + step * 0.3, 18, 4);
      const ex = x + w / 2 + Math.sin(t * 2.4 + (o.a as number)) * 5;
      ctx.fillStyle = "#ff5a3c";
      ctx.beginPath();
      ctx.arc(ex, y - 37 + step * 0.3, 2, 0, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(255,90,60,.18)";
      ctx.beginPath();
      ctx.arc(ex, y - 37 + step * 0.3, 5, 0, 7);
      ctx.fill();
      ctx.strokeStyle = "#9c9c99";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y - 43);
      ctx.lineTo(x + w / 2, y - 49);
      ctx.stroke();
      ctx.strokeStyle = "#bdbdb9";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 26);
      ctx.lineTo(x - 2, y - 18 - step);
      ctx.moveTo(x + w - 4, y - 26);
      ctx.lineTo(x + w + 2, y - 18 + step);
      ctx.stroke();
      ctx.restore();
    };
    const drawDrone = (o: Obstacle) => {
      const x = o.x + o.w / 2;
      const y = (o.y as number) + o.h / 2 + Math.sin((o.a as number) * 3) * 2;
      ctx.save();
      const sweep = Math.sin(t * 1.8 + (o.a as number)) * 0.35;
      ctx.fillStyle = "rgba(242,242,240,.07)";
      ctx.beginPath();
      ctx.moveTo(x - 3, y + 4);
      ctx.lineTo(x + 3, y + 4);
      ctx.lineTo(x + 18 + sweep * 60, GROUND);
      ctx.lineTo(x - 18 + sweep * 60, GROUND);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#9c9c99";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 4);
      ctx.lineTo(x + 18, y - 4);
      ctx.stroke();
      const sp = Math.abs(Math.sin(t * 40));
      ctx.strokeStyle = "#cfcfcb";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 18 - 8 * sp, y - 7);
      ctx.lineTo(x - 18 + 8 * sp, y - 7);
      ctx.moveTo(x + 18 - 8 * sp, y - 7);
      ctx.lineTo(x + 18 + 8 * sp, y - 7);
      ctx.stroke();
      ctx.fillStyle = "#cfcfcb";
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 6, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#2a2a29";
      ctx.beginPath();
      ctx.arc(x + 3, y + 1, 3, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#f2f2f0";
      ctx.beginPath();
      ctx.arc(x + 3, y + 1, 1.2, 0, 7);
      ctx.fill();
      ctx.restore();
    };
    const drawCar = (o: Obstacle) => {
      const x = o.x;
      const y = (o.y as number) + Math.sin((o.a as number) * 2) * 2;
      const w = o.w;
      ctx.save();
      const glow = ctx.createLinearGradient(0, y + 14, 0, y + 30);
      glow.addColorStop(0, "rgba(255,179,71,.45)");
      glow.addColorStop(1, "rgba(255,179,71,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x + 8, y + 14, w - 16, 16);
      ctx.fillStyle = "#cfcfcb";
      ctx.beginPath();
      ctx.moveTo(x, y + 12);
      ctx.lineTo(x + 8, y + 5);
      ctx.lineTo(x + w - 14, y + 5);
      ctx.lineTo(x + w, y + 11);
      ctx.lineTo(x + w - 4, y + 16);
      ctx.lineTo(x + 4, y + 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#2a2a29";
      ctx.beginPath();
      ctx.moveTo(x + 18, y + 5);
      ctx.lineTo(x + 24, y - 2);
      ctx.lineTo(x + 40, y - 2);
      ctx.lineTo(x + 46, y + 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.fillRect(x + 26, y - 1, 8, 2);
      ctx.fillStyle = "#ffb347";
      ctx.fillRect(x + 6, y + 14, w - 12, 2);
      ctx.fillStyle = "#f2f2f0";
      ctx.fillRect(x + w - 5, y + 9, 4, 2);
      ctx.fillStyle = "#ff5a3c";
      ctx.fillRect(x + 1, y + 10, 3, 2);
      ctx.restore();
    };
    const drawFlame = () => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const q of parts) {
        const k = Math.max(0, q.life / q.max);
        const r = q.r * (0.5 + k);
        const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r);
        g.addColorStop(0, `rgba(255,246,224,${0.9 * k})`);
        g.addColorStop(0.45, `rgba(255,179,71,${0.7 * k})`);
        g.addColorStop(1, "rgba(255,106,43,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(q.x, q.y, r, 0, 7);
        ctx.fill();
      }
      ctx.restore();
    };
    const drawAlien = (o: Obstacle) => {
      const hop = Math.max(0, Math.sin(o.a as number)) * 7;
      const x = o.x;
      const y = GROUND - hop;
      const w = o.w;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, GROUND + 2, w * 0.45 * (1 - hop / 20), 3, 0, 0, 7);
      ctx.fill();
      ctx.strokeStyle = "#9c9c99";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 9, y - 8);
      ctx.lineTo(x + 6, y - 1);
      ctx.moveTo(x + w - 9, y - 8);
      ctx.lineTo(x + w - 6, y - 1);
      ctx.stroke();
      ctx.fillStyle = "#cfcfcb";
      ctx.beginPath();
      ctx.moveTo(x + 2, y - 7);
      ctx.quadraticCurveTo(x + 1, y - 30, x + w / 2, y - 30);
      ctx.quadraticCurveTo(x + w - 1, y - 30, x + w - 2, y - 7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#cfcfcb";
      ctx.lineWidth = 2;
      const wob = Math.sin((o.a as number) * 0.6) * 2;
      ctx.beginPath();
      ctx.moveTo(x + 10, y - 28);
      ctx.lineTo(x + 7 + wob, y - 37);
      ctx.moveTo(x + w - 10, y - 28);
      ctx.lineTo(x + w - 7 + wob, y - 37);
      ctx.stroke();
      for (const ex of [x + 7 + wob, x + w - 7 + wob]) {
        ctx.fillStyle = "#f2f2f0";
        ctx.beginPath();
        ctx.arc(ex, y - 38, 4, 0, 7);
        ctx.fill();
        ctx.fillStyle = "#070707";
        ctx.beginPath();
        ctx.arc(ex - 1, y - 38, 1.8, 0, 7);
        ctx.fill();
      }
      ctx.strokeStyle = "#070707";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x + w / 2, y - 16, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.fillStyle = "#9c9c99";
      ctx.beginPath();
      ctx.arc(x + 8, y - 14, 1.6, 0, 7);
      ctx.arc(x + w - 8, y - 20, 1.3, 0, 7);
      ctx.fill();
      ctx.restore();
    };
    const drawUfo = (o: Obstacle) => {
      const x = o.x + o.w / 2;
      const y = (o.y as number) + o.h / 2 + Math.sin((o.a as number) * 2) * 3;
      ctx.save();
      ctx.fillStyle = "rgba(242,242,240,.06)";
      ctx.beginPath();
      ctx.moveTo(x - 10, y + 6);
      ctx.lineTo(x + 10, y + 6);
      ctx.lineTo(x + 20, GROUND);
      ctx.lineTo(x - 20, GROUND);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#6a6a67";
      ctx.beginPath();
      ctx.ellipse(x, y - 5, 11, 9, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#cfcfcb";
      ctx.beginPath();
      ctx.arc(x, y - 9, 2.5, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#cfcfcb";
      ctx.beginPath();
      ctx.ellipse(x, y, 28, 7, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#8e8e8b";
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 20, 3.2, 0, 0, 7);
      ctx.fill();
      for (let i = -2; i <= 2; i++) {
        const on = (Math.floor((o.a as number) * 4) + i + 5) % 3 === 0;
        ctx.fillStyle = on ? "#f2f2f0" : "#3a3a38";
        ctx.beginPath();
        ctx.arc(x + i * 10, y + 1, 1.8, 0, 7);
        ctx.fill();
      }
      ctx.restore();
    };
    const OBS: Record<string, (o: Obstacle) => void> = {
      rock: drawRock,
      flag: drawFlag,
      alien: drawAlien,
      ufo: drawUfo,
      sat: drawSat,
      crystal: drawCrystal,
      dish: drawDish,
      robot: drawRobot,
      drone: drawDrone,
      car: drawCar,
    };

    const drawBear = (x: number, y: number) => {
      const { head, torso, legL, legR, arm } = IMG;
      if (!head || !torso || !legL || !legR || !arm) return;
      const k = DH / SPR.h;
      const dw = SPR.w * k;
      const air = !bear.on;
      const ph = bear.run;
      // poeira dos passos
      if (!air && sc === "play") {
        const s = Math.sign(Math.sin(ph));
        if (s !== lastStep) {
          lastStep = s;
          stepDust(x + dw * (s > 0 ? 0.62 : 0.36));
        }
      }
      ctx.save();
      ctx.fillStyle = "#3a3a38";
      for (const q of dust) {
        ctx.globalAlpha = Math.max(0, q.life * 1.6);
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r * (1.4 - q.life), 0, 7);
        ctx.fill();
      }
      ctx.restore();
      // sombra
      const lift = Math.min(1, -bear.y / 150);
      ctx.fillStyle = `rgba(0,0,0,${0.5 - 0.3 * lift})`;
      ctx.beginPath();
      ctx.ellipse(x + dw * 0.5, GROUND + 2, dw * 0.36 * (1 - 0.4 * lift), 3.2, 0, 0, 7);
      ctx.fill();
      // pose
      let lL: number;
      let lR: number;
      let liftL = 0;
      let liftR = 0;
      let bob: number;
      let lean: number;
      let hBob: number;
      let hRot: number;
      let sx = 1;
      let sy = 1;
      if (air) {
        lL = -0.55;
        lR = 0.42;
        bob = 0;
        lean = -0.05;
        hBob = -1.5;
        hRot = -0.06;
        if (bear.vy < 0) {
          sy = 1.05;
          sx = 0.96;
        }
      } else {
        const s = Math.sin(ph);
        lL = s * 0.42;
        lR = -s * 0.42;
        liftL = Math.max(0, -Math.cos(ph)) * 7;
        liftR = Math.max(0, Math.cos(ph)) * 7;
        bob = -Math.abs(Math.cos(ph)) * 3.5;
        lean = 0.06;
        hBob = -Math.abs(Math.cos(ph - 0.6)) * 2.2;
        hRot = Math.sin(ph) * 0.05;
      }
      if (bear.land > 0) {
        const q = bear.land / 0.14;
        sy = 1 - 0.1 * q;
        sx = 1 + 0.08 * q;
      }
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.translate(x + dw / 2, y);
      ctx.scale(k * sx, k * sy);
      ctx.rotate(lean * 0.5);
      const O = (img: ImageBitmap, px: number, py: number, rot: number, dx: number, dy: number) => {
        ctx.save();
        ctx.translate(px - SPR.w / 2 + dx, py - SPR.h + dy);
        ctx.rotate(rot);
        ctx.drawImage(img, -px, -py);
        ctx.restore();
      };
      O(legR, 118, 198, lR, 0, bob * 0.4 - liftR);
      O(legL, 60, 198, lL, 0, bob * 0.4 - liftL);
      ctx.save();
      ctx.translate(0, bob);
      ctx.rotate(lean * 0.5);
      O(torso, 88, 200, 0, 0, 0);
      O(head, 78, 112, hRot, 0, hBob);
      ctx.restore();
      ctx.restore();
    };

    // ---------------------------------------------------------- chegada ao foguete
    const BIMG: { b?: ImageBitmap } = {};
    fetch("/berry/berry-flag-b.png")
      .then((r) => r.blob())
      .then((b) => createImageBitmap(b))
      .then((bm) => {
        if (alive) BIMG.b = bm;
      })
      .catch(() => {});

    // foguete retrÃ´ (desenho original): cÃ¡psula, vigia, aletas, escada, pernas de pouso
    const drawShip = (x: number) => {
      const y = GROUND;
      const w = 58;
      const h = 132;
      const cx = x;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.beginPath();
      ctx.ellipse(cx, y + 2, w * 0.75, 4, 0, 0, 7);
      ctx.fill();
      ctx.strokeStyle = "#8e8e8b";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 18, y - 30);
      ctx.lineTo(cx - 34, y);
      ctx.moveTo(cx + 18, y - 30);
      ctx.lineTo(cx + 34, y);
      ctx.moveTo(cx, y - 26);
      ctx.lineTo(cx, y);
      ctx.stroke();
      ctx.fillStyle = "#6a6a67";
      ctx.fillRect(cx - 40, y - 3, 12, 3);
      ctx.fillRect(cx + 28, y - 3, 12, 3);
      // aletas
      ctx.fillStyle = "#9c9c99";
      ctx.beginPath();
      ctx.moveTo(cx - w / 2 + 2, y - 58);
      ctx.lineTo(cx - w / 2 - 14, y - 26);
      ctx.lineTo(cx - w / 2 + 4, y - 30);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + w / 2 - 2, y - 58);
      ctx.lineTo(cx + w / 2 + 14, y - 26);
      ctx.lineTo(cx + w / 2 - 4, y - 30);
      ctx.closePath();
      ctx.fill();
      // corpo
      const bg = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
      bg.addColorStop(0, "#bdbdb9");
      bg.addColorStop(0.45, "#f2f2f0");
      bg.addColorStop(1, "#9c9c99");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, y - 30);
      ctx.lineTo(cx - w / 2, y - h * 0.62);
      ctx.quadraticCurveTo(cx - w / 2, y - h, cx, y - h - 14);
      ctx.quadraticCurveTo(cx + w / 2, y - h, cx + w / 2, y - h * 0.62);
      ctx.lineTo(cx + w / 2, y - 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#5b5b59";
      ctx.fillRect(cx - w / 2, y - 34, w, 5);
      ctx.fillRect(cx - w / 2, y - h * 0.62, w, 3);
      // vigia
      ctx.fillStyle = "#cfcfcb";
      ctx.beginPath();
      ctx.arc(cx, y - h * 0.72, 11, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#141414";
      ctx.beginPath();
      ctx.arc(cx, y - h * 0.72, 8, 0, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(214,170,84,.55)";
      ctx.beginPath();
      ctx.arc(cx, y - h * 0.72, 8, Math.PI * 1.05, Math.PI * 1.6);
      ctx.lineTo(cx, y - h * 0.72);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.6)";
      ctx.beginPath();
      ctx.arc(cx - 3, y - h * 0.72 - 3, 2, 0, 7);
      ctx.fill();
      // porta + escada
      ctx.strokeStyle = "#8e8e8b";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(cx - 9, y - h * 0.5, 18, 26);
      ctx.strokeStyle = "#bdbdb9";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 24, y - h * 0.36);
      ctx.lineTo(cx - 30, y);
      ctx.moveTo(cx - 17, y - h * 0.36);
      ctx.lineTo(cx - 23, y);
      for (let i = 1; i < 6; i++) {
        const yy = y - h * 0.36 + (i * (h * 0.36)) / 6;
        const off = i * (6 / 6);
        ctx.moveTo(cx - 24 - off, yy);
        ctx.lineTo(cx - 17 - off, yy);
      }
      ctx.stroke();
      // luz da ponta piscando + brilho do motor
      ctx.fillStyle = Math.floor(t * 2) % 2 ? "#f2f2f0" : "#5b5b59";
      ctx.beginPath();
      ctx.arc(cx, y - h - 15, 2.2, 0, 7);
      ctx.fill();
      const eg = ctx.createRadialGradient(cx, y - 24, 1, cx, y - 24, 16);
      eg.addColorStop(0, "rgba(255,179,71,.5)");
      eg.addColorStop(1, "rgba(255,179,71,0)");
      ctx.fillStyle = eg;
      ctx.fillRect(cx - 16, y - 40, 32, 32);
      ctx.restore();
    };
    const drawFlag2 = (e: Ending) => {
      if (e.phase === "approach" || e.phase === "walk") return;
      const fx = e.ship - 72;
      const f = e.phase === "plant" ? Math.min(1, e.tp / 0.6) : 1;
      const c = e.phase === "plant" ? Math.max(0, Math.min(1, (e.tp - 0.6) / 0.6)) : 1;
      const ph = 58 * f;
      const top = GROUND - ph;
      ctx.save();
      ctx.strokeStyle = "#cfcfcb";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(fx, GROUND);
      ctx.lineTo(fx, top);
      ctx.stroke();
      ctx.fillStyle = "#f2f2f0";
      ctx.beginPath();
      ctx.arc(fx, top, 2.5, 0, 7);
      ctx.fill();
      if (c > 0) {
        const fw = 40 * c;
        const fh = 28;
        ctx.fillStyle = "#f2f2f0";
        ctx.beginPath();
        ctx.moveTo(fx, top + 3);
        for (let i = 0; i <= 10; i++) {
          const xx = fx + (fw * i) / 10;
          ctx.lineTo(xx, top + 3 + Math.sin(t * 5 + i * 0.8) * 1.6 * (i / 10));
        }
        for (let i = 10; i >= 0; i--) {
          const xx = fx + (fw * i) / 10;
          ctx.lineTo(xx, top + 3 + fh + Math.sin(t * 5 + i * 0.8) * 1.6 * (i / 10));
        }
        ctx.closePath();
        ctx.fill();
        if (BIMG.b && c > 0.6) {
          ctx.globalAlpha = (c - 0.6) / 0.4;
          ctx.drawImage(BIMG.b, fx + fw / 2 - 13, top + 4, 26, 26);
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    };
    const drawSparkles = (x: number, y: number) => {
      ctx.save();
      ctx.strokeStyle = "#f2f2f0";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + t * 0.4;
        const r = 46 + 18 * Math.sin(i * 2.1);
        const sx = x + Math.cos(a) * r;
        const sy = y - 10 + Math.sin(a) * r * 0.6;
        const k = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7);
        const L = 2 + 4 * k;
        ctx.globalAlpha = 0.3 + 0.7 * k;
        ctx.beginPath();
        ctx.moveTo(sx - L, sy);
        ctx.lineTo(sx + L, sy);
        ctx.moveTo(sx, sy - L);
        ctx.lineTo(sx, sy + L);
        ctx.stroke();
      }
      ctx.restore();
    };
    // Berry de frente (introduÃ§Ã£o) e, no fim, acenando com o braÃ§o levantado
    const drawIntroBerry = (fx?: number, fy?: number, fh?: number, inGame?: boolean) => {
      const { head, torso, legL, legR, arm } = IMG;
      if (!head || !torso || !legL || !legR || !arm) return;
      let nar = narrow;
      let h = nar ? Math.min(H * 0.32, DH * 1.2) : Math.min(H * 0.55, DH * 1.7);
      let cx = nar ? W * 0.5 : W * 0.22;
      let y = nar ? H * 0.43 : GROUND - 4;
      if (inGame) {
        nar = false;
        h = fh as number;
        cx = fx as number;
        y = fy as number;
      }
      const k = h / SPR.h;
      const bob = Math.sin(t * 2.4) * 2;
      if (!nar) {
        ctx.fillStyle = "rgba(0,0,0,.5)";
        ctx.beginPath();
        ctx.ellipse(cx, GROUND + 2, SPR.w * k * 0.4, 4, 0, 0, 7);
        ctx.fill();
      }
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.translate(cx, y);
      ctx.scale(k, k);
      const O = (img: ImageBitmap, px: number, py: number, rot: number, dy: number) => {
        ctx.save();
        ctx.translate(px - SPR.w / 2, py - SPR.h + dy);
        ctx.rotate(rot);
        ctx.drawImage(img, -px, -py);
        ctx.restore();
      };
      O(legR, 118, 198, 0, 0);
      O(legL, 60, 198, 0, 0);
      O(torso, 88, 200, 0, bob * 0.5);
      O(arm, 130, 164, Math.sin(t * 7) * 0.22, bob * 0.5);
      O(head, 78, 112, Math.sin(t * 1.6) * 0.05, bob);
      ctx.restore();
    };

    raf(loop);
    return () => {
      alive = false;
      ro.disconnect();
      window.removeEventListener("keydown", onKey, true);
      host.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const bm of Object.values(IMG)) bm?.close();
      BIMG.b?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- o motor Ã© montado uma vez
  }, []);

  // foco: botÃ£o principal da tela; durante o jogo, a prÃ³pria Ã¡rea (sem botÃ£o ativo)
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const primary = host.querySelector<HTMLElement>("[data-primary]");
    const id = window.setTimeout(
      () => (primary ?? host).focus({ preventScroll: true }),
      screen === "over" || screen === "won" ? 620 : 30,
    );
    return () => window.clearTimeout(id);
  }, [screen, step]);

  const ob = [
    [copy.o1Title, copy.o1Text],
    [copy.o2Title, copy.o2Text],
    [copy.o3Title, copy.o3Text],
  ][step];
  const btn =
    "rounded-full border border-[#3a3a38] px-[18px] py-[13px] font-mono text-xs uppercase tracking-[0.18em] text-[#f2f2f0] transition-colors hover:border-[#8d8d8a] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[3px] focus-visible:outline-[#f2f2f0]";
  const btnPrimary = `${btn} !border-[#f2f2f0] !bg-[#f2f2f0] !text-[#070707]`;
  const overlay =
    "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3.5 bg-[rgba(7,7,7,0.55)] p-6 text-center";
  // introduÃ§Ã£o: texto Ã  direita, Berry de frente Ã  esquerda; no celular, texto embaixo
  const intro =
    "absolute inset-0 z-10 flex flex-col items-start justify-center gap-3.5 bg-[linear-gradient(90deg,rgba(7,7,7,0)_28%,rgba(7,7,7,0.88)_55%)] py-6 pl-[max(24px,40%)] pr-8 text-left max-[640px]:items-center max-[640px]:justify-end max-[640px]:bg-[linear-gradient(180deg,rgba(7,7,7,0)_38%,rgba(7,7,7,0.9)_62%)] max-[640px]:px-5 max-[640px]:pb-[max(22px,env(safe-area-inset-bottom))] max-[640px]:pt-5 max-[640px]:text-center";
  // vitÃ³ria: no topo, a cena do Berry, da bandeira e do foguete segue visÃ­vel embaixo
  const win =
    "absolute inset-0 z-10 flex flex-col items-center justify-start gap-3.5 bg-[linear-gradient(180deg,rgba(7,7,7,0.88)_0%,rgba(7,7,7,0.55)_45%,rgba(7,7,7,0)_70%)] px-6 pb-6 pt-[max(76px,calc(env(safe-area-inset-top)+68px))] text-center";
  const h2 = "m-0 max-w-[22ch] text-balance text-[clamp(22px,3.2vw,36px)] font-light leading-[1.08] tracking-[-0.03em]";
  const h2Intro = "m-0 max-w-[22ch] text-balance text-[clamp(20px,2.6vw,30px)] font-light leading-[1.08] tracking-[-0.03em]";
  const h2Win = "m-0 max-w-[30ch] text-balance text-[clamp(18px,2.2vw,26px)] font-light leading-[1.08] tracking-[-0.03em]";
  const sub = "m-0 max-w-[40ch] font-mono text-[11px] uppercase leading-relaxed tracking-[0.28em] text-[#8d8d8a]";

  return (
    <div
      ref={root}
      tabIndex={-1}
      className="relative h-full w-full touch-none select-none overflow-hidden bg-[#070707] text-[#f2f2f0] outline-none [-webkit-tap-highlight-color:transparent]"
      aria-label={copy.gameLabel}
    >
      <canvas ref={canvas} className="block h-full w-full" aria-hidden="true" />

      {/* topo: progresso atÃ© o planeta (esquerda) e recorde/pontos (direita); o X do diÃ¡logo fica no canto direito */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex items-start justify-between gap-3 pl-[max(20px,env(safe-area-inset-left))] pr-[max(72px,calc(env(safe-area-inset-right)+64px))] pt-[max(20px,calc(env(safe-area-inset-top)+8px))]">
        <div
          className={`flex flex-col gap-1.5 font-mono text-[11px] tracking-[0.22em] text-[#8d8d8a] tabular-nums ${screen === "onboarding" ? "invisible" : ""}`}
        >
          <span>{copy.bar}</span>
          <div className="relative h-0.5 w-[min(220px,36vw)] bg-[#232322]">
            <div ref={fillEl} className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-[#f2f2f0]" />
            <span className="absolute -right-1 -top-[3px] h-2 w-2 rounded-full bg-[#8d8d8a]" />
          </div>
          <b ref={kmEl} className="font-normal text-[#f2f2f0]" />
        </div>
        <div className="shrink-0 text-right font-mono text-[11px] leading-[1.7] tracking-[0.14em] text-[#8d8d8a] tabular-nums md:text-[13px]">
          <span>{copy.best}</span> <b ref={hiEl} className="font-normal text-[#f2f2f0]">00000</b>
          <br />
          <span>{copy.score}</span> <b ref={scEl} className="font-normal text-[#f2f2f0]">00000</b>
        </div>
      </div>

      {screen === "onboarding" && (
        <div className={intro} role="group" aria-live="polite">
          <p className={sub}>{step + 1} / 3</p>
          <h2 className={h2Intro}>{ob[0]}</h2>
          <div className="max-w-[46ch] text-balance text-[15px] leading-normal text-[#8d8d8a]">{ob[1]}</div>
          <div className="mt-1.5 flex flex-wrap justify-start gap-2.5 max-[640px]:justify-center">
            <button type="button" className={`${btn} !border-transparent !text-[#8d8d8a]`} onClick={() => api.current.skip()}>
              {copy.skip}
            </button>
            <button type="button" data-primary className={btnPrimary} onClick={() => api.current.next()}>
              {step === 2 ? copy.start : copy.next}
            </button>
          </div>
        </div>
      )}

      {screen === "paused" && (
        <div className={overlay}>
          <button type="button" data-primary className={btnPrimary} onClick={() => api.current.resume()}>
            {copy.resume}
          </button>
        </div>
      )}

      {(screen === "over" || screen === "won") && (
        <div className={screen === "won" ? win : overlay} role="group" aria-live="polite">
          <p className={sub}>{screen === "won" ? copy.winLabel : copy.overLabel}</p>
          <h2 className={screen === "won" ? h2Win : h2}>{screen === "won" ? copy.winText : copy.overText}</h2>
          <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">
            <button type="button" data-primary className={btn} onClick={() => api.current.restart()}>
              {copy.again}
            </button>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={`${btnPrimary} no-underline`}>
              {copy.talk}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
