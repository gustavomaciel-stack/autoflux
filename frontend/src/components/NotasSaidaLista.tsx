import { useState } from 'react';
import { listarPaginaNotasSaida } from '../services/notasSaidaApi';
import { useAuth } from '../context/AuthContext';
import { NotaSaidaPanel } from './NotaSaidaPanel';
import { FiltrosNotas, PaginacaoNotas, SituacaoNota, useConsultaNotas } from './ConsultaNotasFiscais';

export function NotasSaidaLista({ ciclo, limparCiclo, verEntrada }: {
  ciclo?: number;
  limparCiclo: () => void;
  verEntrada?: (ciclo: number) => void;
}) {
  const { pode } = useAuth();
  const podeRegistrar = pode('notas.visualizar') && pode('pedidos.visualizar') && pode('pedidos.gerenciar');
  const [selecionada, setSelecionada] = useState<number>();
  const { resultado, carregando, erro, aplicar, setPagina, atualizar } = useConsultaNotas(listarPaginaNotasSaida, ciclo);
  const itens = carregando ? [] : resultado.itens;

  return <section aria-label="Notas fiscais de saída">
    <FiltrosNotas saida onAplicar={filtros => { setSelecionada(undefined); aplicar(filtros); }} />
    {ciclo && <button type="button" className="button secondary" onClick={() => { setPagina(1); limparCiclo(); }}>Mostrar todos os ciclos</button>}
    {erro && <div className="alert error page-alert" role="alert">{erro} <button type="button" onClick={atualizar}>Tentar novamente</button></div>}
    <div className="table-card table-scroll"><table>
      <thead><tr><th>Pedido / devolução</th><th>Veículo</th><th>Nosso Número</th><th>Nota de saída</th><th>Ações</th></tr></thead>
      <tbody>
        {itens.map(n => <tr key={n.id_pedido}>
          <td>{n.numero_pedido}</td>
          <td>{n.marca} {n.modelo}<small>{n.placa}</small></td>
          <td>{n.nosso_numero}</td>
          <td><SituacaoNota situacao={n.situacao === 'Cancelado' ? 'Venda cancelada' : n.numero_nota ? 'Registrada' : 'Pendente'} />{n.numero_nota && <small>NF {n.numero_nota}</small>}</td>
          <td><div className="row-actions">
            <button type="button" aria-expanded={selecionada === n.id_pedido} onClick={() => setSelecionada(selecionada === n.id_pedido ? undefined : n.id_pedido)}>{n.numero_nota ? 'Ver nota de saída' : podeRegistrar && n.situacao !== 'Cancelado' ? 'Registrar nota de saída' : 'Ver pendência'}</button>
            {verEntrada && <><span aria-hidden="true" style={{ color: '#71829b' }}>|</span><button type="button" onClick={() => verEntrada(Number(n.id_ciclo))}>Ver nota de entrada</button></>}
          </div></td>
        </tr>)}
        {!itens.length && <tr><td className="empty-state" colSpan={5}>{carregando ? 'Carregando notas fiscais…' : 'Nenhuma nota de saída encontrada.'}</td></tr>}
      </tbody>
    </table></div>
    {itens.filter(n => n.id_pedido === selecionada).map(n => <NotaSaidaPanel key={n.id_pedido} nota={n} onSalva={() => { setSelecionada(undefined); atualizar(); }} aoFechar={() => setSelecionada(undefined)} />)}
    <PaginacaoNotas resultado={resultado} carregando={carregando} onPagina={pagina => { setSelecionada(undefined); setPagina(pagina); }} />
  </section>;
}
