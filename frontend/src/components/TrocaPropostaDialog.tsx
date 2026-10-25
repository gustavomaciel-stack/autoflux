import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CamposOfertaTroca } from './TrocaOrcamentoPanel';
import type { DadosTroca } from '../services/trocasApi';

interface Props {
  dados: DadosTroca;
  gestao: boolean;
  onConfirmar: (dados: DadosTroca) => void;
  onFechar: () => void;
}

export function TrocaPropostaDialog({ dados, gestao, onConfirmar, onFechar }: Props) {
  const [rascunho, setRascunho] = useState<DadosTroca>({ ...dados });
  const dialogo = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogo.current?.focus();
    const teclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onFechar(); return; }
      if (e.key !== 'Tab') return;
      const campos = Array.from(dialogo.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)') ?? []);
      const primeiro = campos[0], ultimo = campos[campos.length - 1];
      if (!primeiro) { e.preventDefault(); return; }
      if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === dialogo.current)) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && (document.activeElement === ultimo || document.activeElement === dialogo.current)) { e.preventDefault(); primeiro.focus(); }
    };
    document.addEventListener('keydown', teclado);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', teclado); anterior?.focus(); };
  }, [onFechar]);
  function confirmar(e: FormEvent) { e.preventDefault(); onConfirmar({ ...rascunho }); }
  return createPortal(
    <div className="proposta-troca-overlay">
      <div className="orc-page proposta-troca-dialog" ref={dialogo} role="dialog" aria-modal="true" aria-labelledby="proposta-troca-title" aria-describedby="proposta-troca-help" tabIndex={-1}>
        <header><div><small>Orçamento / Veículo de troca</small><h2 id="proposta-troca-title">Dados do veículo oferecido</h2></div><button type="button" className="button secondary" aria-label="Fechar formulário da troca" onClick={onFechar}>Fechar</button></header>
        <p id="proposta-troca-help">{gestao ? 'Informe o veículo e o valor da avaliação. A avaliação será registrada em seu nome ao criar o orçamento.' : 'Informe o veículo oferecido pelo cliente. Após criar o orçamento, a oferta será encaminhada ao Compras para avaliação.'}</p>
        <form onSubmit={confirmar}>
          <CamposOfertaTroca dados={rascunho} onChange={setRascunho} avaliacaoDireta={gestao} />
          <p className="proposta-troca-note">Confirmar adiciona os dados à proposta em preenchimento. O orçamento será registrado na última etapa.</p>
          <footer><button type="button" className="button secondary" onClick={onFechar}>Cancelar alterações</button><button type="submit" className="button primary">Confirmar veículo de troca</button></footer>
        </form>
      </div>
    </div>, document.body,
  );
}
