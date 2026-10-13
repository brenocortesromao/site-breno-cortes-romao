import type { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Carregamento dos glTF das cenas 3D (urso, tubarão, tartaruga), com pré-carga.
 * - `prefetchGltf(url)`: baixa os bytes uma vez (cache em memória, por URL).
 *   As cenas chamam isto quando a seção ANTERIOR aparece (ver lib/preload.ts),
 *   então, quando a cena monta, o arquivo já está aqui.
 * - `loadGltf(url)`: interpreta os bytes em cache (cada chamada devolve objetos
 *   novos, então remontar a cena depois de um dispose funciona).
 * - Meshopt decodificado em Web Workers (fora da thread principal); as
 *   texturas já vêm como ImageBitmap (o GLTFLoader decodifica fora da thread).
 */

let loader: Promise<GLTFLoader> | null = null;
const bytes = new Map<string, Promise<ArrayBuffer>>();

function getLoader() {
  loader ??= (async () => {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/libs/meshopt_decoder.module.js"),
    ]);
    MeshoptDecoder.useWorkers(2);
    return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  })().catch((e) => {
    loader = null;
    throw e;
  });
  return loader;
}

export function prefetchGltf(url: string): Promise<ArrayBuffer> {
  let p = bytes.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .catch((e) => {
        bytes.delete(url); // tenta de novo na próxima chamada
        throw e;
      });
    bytes.set(url, p);
    // o loader (e os workers do Meshopt) também ficam prontos antes
    getLoader().catch(() => undefined);
  }
  return p;
}

export async function loadGltf(url: string): Promise<GLTF> {
  const [l, data] = await Promise.all([getLoader(), prefetchGltf(url)]);
  return l.parseAsync(data, url.slice(0, url.lastIndexOf("/") + 1));
}
