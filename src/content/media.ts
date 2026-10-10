import trabalhosLista from "../../public/trabalhos/trabalhos.json";
import logosLista from "../../public/logos/logos.json";

/*
 * Imagens de trabalhos e logos de empresas.
 * Para adicionar: copie o arquivo para public/trabalhos/ (ou public/logos/) e
 * preencha "arquivo" com o nome dele no JSON da mesma pasta. Em trabalhos,
 * "papel" é o papel exato e o contexto (ex.: "Direção criativa na agência X"),
 * mostrado na legenda do carrossel. Itens sem
 * arquivo aparecem como placeholder discreto.
 * Logos: prefira SVG ou PNG com fundo transparente — o site aplica a cor prata
 * pelo formato do logo (máscara), então a cor original não importa.
 */

export type Trabalho = { src?: string; project: string; year: string; role: string };
export type Logo = { src?: string; name: string };

export const trabalhos: Trabalho[] = trabalhosLista.map((t) => ({
  src: t.arquivo ? `/trabalhos/${t.arquivo}` : undefined,
  project: t.projeto,
  year: t.ano,
  role: t.papel,
}));

export const logos: Logo[] = logosLista.map((l) => ({
  src: l.arquivo ? `/logos/${l.arquivo}` : undefined,
  name: l.nome,
}));
