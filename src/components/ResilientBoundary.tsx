"use client";

import { Component, Fragment, type ReactNode } from "react";

type Props = {
  /** Nome da cena nos avisos do console (ex.: "montanhas"). */
  name?: string;
  /** Chamado só quando as novas tentativas se esgotam (fallback definitivo). */
  onGiveUp: () => void;
  maxRetries?: number;
  /** Recebe `onLost`: passe-o à cena para avisar perda de contexto WebGL. */
  children: (onLost: () => void) => ReactNode;
};

/**
 * Envolve uma cena WebGL. Em erro de render (ex.: falha ao criar o contexto)
 * ou em `webglcontextlost` (avisado pela cena via `onLost`), desmonta e
 * remonta a cena após uma pausa curta, em vez de cair no fallback de vez.
 * Só chama `onGiveUp` se falhar de novo depois de `maxRetries` tentativas.
 */
export default class ResilientBoundary extends Component<Props, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };
  private timer: ReturnType<typeof setTimeout> | undefined;
  private alive = false;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidMount() {
    this.alive = true;
  }

  componentDidCatch(error: unknown) {
    this.retry(error);
  }

  componentWillUnmount() {
    this.alive = false;
    clearTimeout(this.timer);
  }

  /** Sem argumento = perda de contexto avisada pela cena. */
  retry = (reason?: unknown) => {
    if (!this.alive) return;
    const why = reason instanceof Error ? `${reason.name}: ${reason.message}` : reason ? String(reason) : "webglcontextlost";
    const scene = this.props.name ?? "cena WebGL";
    if (this.state.attempt >= (this.props.maxRetries ?? 2)) {
      console.warn(`[${scene}] desisti do WebGL e usei o fallback. Motivo: ${why}`);
      this.props.onGiveUp();
      return;
    }
    console.warn(`[${scene}] falhou (tentativa ${this.state.attempt + 1}), remontando. Motivo: ${why}`);
    this.setState({ failed: true });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.alive) this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }));
    }, 800);
  };

  private onLost = () => this.retry();

  render() {
    return this.state.failed ? null : <Fragment key={this.state.attempt}>{this.props.children(this.onLost)}</Fragment>;
  }
}
