import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import './OrientacaoFluxo.css';

export function OrientacaoFluxo({ children, rotulo = 'Orientação desta etapa' }: { children: ReactNode; rotulo?: string }) {
  const id = useId();
  const [mouse, setMouse] = useState(false);
  const [teclado, setTeclado] = useState(false);
  const [fixada, setFixada] = useState(false);
  const aberta = mouse || teclado || fixada;
  const texto = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!aberta || !texto.current) return;
    const painel = texto.current;
    function alinhar() {
      painel.style.removeProperty('--orientacao-deslocamento');
      const caixa = painel.getBoundingClientRect();
      const limite = document.documentElement.clientWidth - 12;
      painel.style.setProperty('--orientacao-deslocamento', Math.min(0, limite - caixa.right) + 'px');
    }
    alinhar();
    window.addEventListener('resize', alinhar);
    return () => window.removeEventListener('resize', alinhar);
  }, [aberta]);

  return <span className="orientacao-fluxo" onPointerEnter={e => { if (e.pointerType === 'mouse') setMouse(true); }} onPointerLeave={() => setMouse(false)}>
    <button type="button" aria-label={rotulo} aria-controls={id} aria-expanded={aberta}
      onFocus={e => setTeclado(e.currentTarget.matches(':focus-visible'))}
      onBlur={() => { setTeclado(false); setFixada(false); }}
      onClick={() => setFixada(v => !v)}
      onKeyDown={e => { if (e.key === 'Escape' && aberta) {
        e.stopPropagation();
        setMouse(false); setTeclado(false); setFixada(false);
      } }}>!</button>
    <span ref={texto} id={id} className="orientacao-fluxo-texto" hidden={!aberta}>{children}</span>
  </span>;
}
