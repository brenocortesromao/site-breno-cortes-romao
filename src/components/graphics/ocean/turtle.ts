import { BufferAttribute, IcosahedronGeometry, Matrix4, Quaternion, Vector3, type BufferGeometry } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Tartaruga marinha low-poly procedural (sem modelo externo), para ser vista
 * como silhueta: casco achatado em gota, cabeça, duas nadadeiras dianteiras
 * longas em forma de asa e duas traseiras curtas. Comprimento ~1, cabeça
 * para +Z (mesma convenção do glb do tubarão e do peixe).
 * Atributo `aFlap` (por vértice): x = peso da nadadeira (0 no casco, cresce
 * para a ponta), y = 1 dianteira / 0 traseira. O shader (FLAP em
 * shaders.ts) usa isso para bater as nadadeiras; nada de esqueleto.
 */
function part(detail: number, scale: [number, number, number], pos: [number, number, number], yaw = 0, roll = 0) {
  let g: BufferGeometry = new IcosahedronGeometry(1, detail);
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  g = mergeVertices(g);
  g.applyMatrix4(
    new Matrix4().compose(
      new Vector3(...pos),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), roll)),
      new Vector3(...scale),
    ),
  );
  return g;
}

function flap(g: BufferGeometry, hingeX: number, reach: number, front: boolean) {
  const p = g.getAttribute("position");
  const a = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    a[i * 2] = Math.min(1, Math.max(0, (Math.abs(p.getX(i)) - hingeX) / reach));
    a[i * 2 + 1] = front ? 1 : 0;
  }
  g.setAttribute("aFlap", new BufferAttribute(a, 2));
  return g;
}

export function turtleGeometry(light: boolean) {
  const d = light ? 1 : 2;
  const parts: BufferGeometry[] = [];
  // casco: gota achatada, mais larga à frente, levemente abaulada em cima
  const shell = part(d, [0.36, 0.13, 0.46], [0, 0, 0]);
  {
    const p = shell.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      const y = p.getY(i);
      p.setX(i, p.getX(i) * (1 + z * 0.35)); // afina para trás
      p.setY(i, y > 0 ? y * 1.25 : y * 0.6); // dorso alto, ventre reto
    }
  }
  parts.push(flap(shell, 10, 1, false));
  parts.push(flap(part(1, [0.085, 0.07, 0.12], [0, 0.01, 0.53]), 10, 1, false)); // cabeça
  for (const s of [-1, 1]) {
    // dianteiras: longas e finas, varridas para trás (asa)
    parts.push(flap(part(1, [0.36, 0.022, 0.085], [s * 0.42, -0.02, 0.2], s * 0.55), 0.26, 0.5, true));
    // traseiras: curtas
    parts.push(flap(part(1, [0.13, 0.018, 0.07], [s * 0.24, -0.03, -0.42], -s * 0.6), 0.16, 0.22, false));
  }
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  g.computeVertexNormals();
  return g;
}
