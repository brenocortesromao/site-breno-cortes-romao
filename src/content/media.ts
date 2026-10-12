import logosLista from "../../public/logos/logos.json";

/*
 * Logos de empresas.
 * Para adicionar: copie o arquivo para public/logos/ e preencha "arquivo" com
 * o nome dele no logos.json da mesma pasta. Itens sem arquivo aparecem como
 * placeholder discreto.
 * Prefira SVG ou PNG com fundo transparente — o site aplica a cor prata
 * pelo formato do logo (máscara), então a cor original não importa.
 * Imagens de trabalhos: ver src/content/works.ts (lidas da pasta no build).
 */

export type Logo = { src?: string; name: string };

export const logos: Logo[] = logosLista.map((l) => ({
  src: l.arquivo ? `/logos/${l.arquivo}` : undefined,
  name: l.nome,
}));
