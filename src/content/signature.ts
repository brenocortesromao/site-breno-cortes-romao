/**
 * Assinatura desenhada sobre o retrato do manifesto (animação de traço).
 *
 * PROVISÓRIA: traço genérico, só para validar a animação.
 * Para usar a definitiva: exporte a assinatura como SVG de TRAÇO (stroke, sem
 * preenchimento; um ou mais <path>), copie o `viewBox` e o atributo `d` de cada
 * path para cá, na ordem em que devem ser desenhados, e mude `provisional`
 * para false. Componente e animação não mudam.
 */
export const signature = {
  provisional: true,
  viewBox: "0 0 400 140",
  paths: [
    "M18 96 C40 40 62 24 70 46 C78 70 52 104 44 110 C60 82 96 60 104 78 C110 92 88 104 80 100 C100 96 120 72 134 70 C146 68 140 92 150 92 C164 92 172 60 186 62 C198 64 186 92 198 94 C214 96 226 58 242 56 C256 54 248 90 262 92 C280 94 300 62 318 60 C334 58 330 84 344 86 C358 88 372 70 386 64",
    "M60 118 C140 108 260 104 380 112",
  ],
};
