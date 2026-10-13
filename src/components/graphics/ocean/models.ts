import { Mesh, type BufferGeometry } from "three";

/**
 * Modelos do oceano: public/oceano/oceano.glb (3,5 KB, glTF com Draco), gerado
 * por scripts/build-ocean-models.mjs a partir do "Animated Fish Pack" de
 * Quaternius (CC0). Daqui só se usa o peixe do cardume (comprimento 1, cabeça
 * para +Z; o nado é feito no shader). Tubarões e tartaruga são os modelos
 * realistas de public/modelos/oceano/ (ver animals.ts).
 * O decodificador Draco (public/draco/, wasm) roda num Web Worker e só é
 * baixado quando o oceano monta pela primeira vez. As geometrias ficam em
 * cache: remontar a cena (vaga de contexto, perda de contexto) não baixa nem
 * decodifica de novo.
 */
export type OceanModels = { fish: BufferGeometry };

let pending: Promise<OceanModels> | null = null;

export function loadOceanModels(): Promise<OceanModels> {
  pending ??= (async () => {
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/loaders/DRACOLoader.js"),
    ]);
    const draco = new DRACOLoader().setDecoderPath("/draco/"); // wasm (padrão)
    draco.setWorkerLimit(1);
    try {
      const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync("/oceano/oceano.glb");
      const geo = (name: string) => {
        const node = gltf.scene.getObjectByName(name);
        if (!(node instanceof Mesh)) throw new Error(`oceano.glb sem a malha "${name}"`);
        const g = node.geometry as BufferGeometry;
        g.computeVertexNormals(); // normais suaves (o arquivo só traz posições)
        return g;
      };
      return { fish: geo("fish") };
    } finally {
      draco.dispose(); // encerra o worker
    }
  })().catch((e) => {
    pending = null; // tenta de novo na próxima montagem
    throw e;
  });
  return pending;
}
