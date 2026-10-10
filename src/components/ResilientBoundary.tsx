"use client";

import { Component, Fragment, type ReactNode } from "react";

type Props = {
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

  componentDidCatch() {
    this.retry();
  }

  componentWillUnmount() {
    this.alive = false;
    clearTimeout(this.timer);
  }

  retry = () => {
    if (!this.alive) return;
    if (this.state.attempt >= (this.props.maxRetries ?? 2)) {
      this.props.onGiveUp();
      return;
    }
    this.setState({ failed: true });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.alive) this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }));
    }, 800);
  };

  render() {
    return this.state.failed ? null : <Fragment key={this.state.attempt}>{this.props.children(this.retry)}</Fragment>;
  }
}
