import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import '../pages/OrcamentosPage.css';

export interface PaginaNotas<T> {
  itens: T[];
  total: number;
  pagina: number;
  paginas: number;
}

export function useConsultaNotas<T>(
  consultar: (params: URLSearchParams, signal: AbortSignal) => Promise<PaginaNotas<T>>,
  ciclo?: number,
  ativa = true,
) {
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [pagina, setPagina] = useState(1);
  const [revisao, setRevisao] = useState(0);
  const [resultado, setResultado] = useState<PaginaNotas<T>>({ itens: [], total: 0, pagina: 1, paginas: 1 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!ativa) return;
    const controle = new AbortController();
    const params = new URLSearchParams({ ...filtros, pagina: String(pagina) });
    if (ciclo !== undefined) params.set('ciclo', String(ciclo));
    setCarregando(true);
    setErro('');
    consultar(params, controle.signal)
      .then(dados => { if (!controle.signal.aborted) setResultado(dados); })
      .catch(e => {
        if (controle.signal.aborted) return;
        setErro(e instanceof Error ? e.message : 'Não foi possível consultar as notas fiscais.');
        setResultado({ itens: [], total: 0, pagina: 1, paginas: 1 });
      })
      .finally(() => { if (!controle.signal.aborted) setCarregando(false); });
    return () => controle.abort();
  }, [consultar, filtros, pagina, ciclo, ativa, revisao]);

  function aplicar(novos: Record<string, string>) {
    setPagina(1);
    setFiltros(novos);
  }

  return { resultado, carregando, erro, aplicar, setPagina, atualizar: () => setRevisao(n => n + 1) };
}

const situacoesEntrada = ['Disponível', 'Reservado', 'Em manutenção', 'Em preparação', 'Separado para venda', 'Vendido', 'Devolvido', 'Devolvido ao cliente'];
const situacoesSaida = ['Pendente', 'Registrada', 'Venda cancelada', 'Devolução'];

export function FiltrosNotas({ saida = false, onAplicar }: {
  saida?: boolean;
  onAplicar: (filtros: Record<string, string>) => void;
}) {
  const espera = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(espera.current), []);

  function pesquisar(evento: ChangeEvent<HTMLFormElement>) {
    window.clearTimeout(espera.current);
    const dados = new FormData(evento.currentTarget);
    const filtros: Record<string, string> = {};
    for (const [campo, valor] of dados) {
      if (typeof valor === 'string' && valor.trim()) filtros[campo] = valor.trim();
    }
    if (evento.target instanceof HTMLInputElement && evento.target.name === 'busca') {
      espera.current = window.setTimeout(() => onAplicar(filtros), 300);
    } else {
      onAplicar(filtros);
    }
  }

  return <form onChange={pesquisar} onSubmit={evento => evento.preventDefault()}>
    <div className="orc-filters">
      <label className="field">Buscar<input type="search" name="busca" maxLength={150} placeholder={saida ? 'Nota, pedido, veículo, placa ou nosso número' : 'Nota, série, origem, veículo, placa ou nosso número'} /></label>
      <label className="field">Situação<select name="situacao"><option value="">Todas</option>{(saida ? situacoesSaida : situacoesEntrada).map(s => <option key={s}>{s}</option>)}</select></label>
      <div style={{ gridColumn: '1 / -1', display: 'grid', gap: '16px', width: '100%', maxWidth: '24rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 10rem), 1fr))' }}>
        <label className="field">Emissão de<input type="date" name="inicio" /></label>
        <label className="field">Emissão até<input type="date" name="fim" /></label>
      </div>
    </div>
  </form>;
}

export function PaginacaoNotas({ resultado, carregando, onPagina }: {
  resultado: PaginaNotas<unknown>;
  carregando: boolean;
  onPagina: (pagina: number) => void;
}) {
  const { pagina, paginas, total } = resultado;
  return <nav className="orc-pagination" aria-label="Páginas das notas fiscais">
    <span role="status">{carregando ? 'Consultando notas…' : `Página ${pagina} de ${paginas} · ${total} registro(s) · 20 por página`}</span>
    <div>
      <button data-ui-nav="back" type="button" className="button secondary" disabled={carregando || pagina <= 1} onClick={() => onPagina(pagina - 1)}>Anterior</button>
      <button data-ui-nav="next" type="button" className="button secondary" disabled={carregando || pagina >= paginas} onClick={() => onPagina(pagina + 1)}>Próxima</button>
    </div>
  </nav>;
}

export function SituacaoNota({ situacao }: { situacao: string }) {
  let cor = 'info';
  if (['Disponível', 'Registrada'].includes(situacao)) cor = 'success';
  else if (['Em manutenção', 'Em preparação', 'Pendente'].includes(situacao)) cor = 'warning';
  else if (['Devolvido', 'Devolvido ao cliente', 'Venda cancelada'].includes(situacao)) cor = 'danger';
  return <span className={`orc-status orc-status-${cor}`}>{situacao}</span>;
}
