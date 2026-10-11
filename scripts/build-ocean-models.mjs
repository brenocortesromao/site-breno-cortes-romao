// Gera public/oceano/oceano.glb (tubarão + peixe do cardume, glTF com Draco)
// a partir dos OBJ CC0 em assets-src/oceano/ ("Animated Fish Pack" de
// Quaternius, CC0 1.0: ver LICENSE-Quaternius.txt).
// Uso: node scripts/build-ocean-models.mjs
//
// O que faz: lê só posições e faces (triangula em leque), centraliza, deixa o
// comprimento = 1 com a cabeça para +Z, solda vértices iguais e comprime com
// Draco. Sem normais nem materiais: a cena calcula normais suaves ao carregar
// e desenha tudo como silhueta. O nado é animado no vertex shader (sem
// esqueleto), por isso as animações do FBX original não são usadas.
import { readFileSync } from "node:fs";
import { Document, NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression, KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { weld, draco } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";

const SRC = "assets-src/oceano";
const OUT = "public/oceano/oceano.glb";

function parseObj(path) {
  const v = [];
  const tris = [];
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const p = line.trim().split(/\s+/);
    if (p[0] === "v") v.push([+p[1], +p[2], +p[3]]);
    else if (p[0] === "f") {
      const idx = p.slice(1).map((s) => parseInt(s.split("/")[0], 10) - 1);
      for (let i = 1; i < idx.length - 1; i++) tris.push(idx[0], idx[i], idx[i + 1]);
    }
  }
  // normaliza: centro na origem, comprimento (Z) = 1; a cauda dos modelos fica
  // em -Z (onde a nadadeira é mais alta), então a cabeça já aponta para +Z
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const q of v)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], q[k]);
      max[k] = Math.max(max[k], q[k]);
    }
  const c = min.map((m, k) => (m + max[k]) / 2);
  const s = 1 / (max[2] - min[2]);
  const pos = new Float32Array(v.length * 3);
  v.forEach((q, i) => q.forEach((x, k) => (pos[i * 3 + k] = (x - c[k]) * s)));
  return { pos, idx: new Uint16Array(tris) };
}

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene("oceano");
for (const name of ["shark", "fish"]) {
  const { pos, idx } = parseObj(`${SRC}/${name}.obj`);
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(pos).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType("SCALAR").setArray(idx).setBuffer(buffer));
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
}

const io = new NodeIO()
  .registerExtensions(KHRONOS_EXTENSIONS)
  .registerDependencies({ "draco3d.encoder": await draco3d.createEncoderModule() });
doc.createExtension(KHRDracoMeshCompression).setRequired(true);
await doc.transform(weld(), draco({ method: "edgebreaker", quantizePosition: 12 }));
await io.write(OUT, doc);

const bytes = readFileSync(OUT).length;
console.log(`${OUT}: ${(bytes / 1024).toFixed(1)} KB`);
