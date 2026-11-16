import { Fragment, useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { consultarHistoricoCliente, listarClientes, type OperacaoCliente } from '../services/clientesApi';
import { formatarGerencial as fmt } from '../services/gerencialApi';
import type { Cliente } from '../types/Cliente';
import './Gerencial.css';
import './OrcamentosPage.css';
import './HistoricoClientesPage.css';

const chaveCliente = 'autoflux_historico_cliente';
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const documento = (texto: string) => texto.replace(/[^a-z0-9]/gi, '').toLowerCase();

export function HistoricoClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState(() => Number(sessionStorage.getItem(chaveCliente)));
  const [busca, setBusca] = useState('');
  const [operacoes, setOperacoes] = useState<OperacaoCliente[]>([]);
  const [detalhe, setDetalhe] = useState<number>();
  const [carregandoClientes, setCarregandoClientes] = useState(true);
  const [carregando, setCarregando] = useState(Boolean(clienteId));
  const [erroClientes, setErroClientes] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    sessionStorage.removeItem(chaveCliente);
    let ativo = true;
    listarClientes().then(dados => { if (ativo) setClientes(dados); })
      .catch(e => { if (ativo) setErroClientes(e.message); })
      .finally(() => { if (ativo) setCarregandoClientes(false); });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!clienteId) return;
    let ativo = true;
    consultarHistoricoCliente(clienteId)
      .then(dados => { if (ativo) setOperacoes(dados); })
      .catch(e => { if (ativo) setErro(e.message); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [clienteId]);

  function selecionar(id: number) {
    if (id !== clienteId) {
      setClienteId(id);
      setDetalhe(undefined);
      setOperacoes([]);
      setErro('');
      setCarregando(true);
    }
    setBusca('');
  }

  const termo = normalizar(busca);
  const doc = documento(termo);
  const encontrados = termo.length < 2 ? [] : clientes.filter(c =>
    normalizar([c.nome_razao_social, c.nome_fantasia].join(' ')).includes(termo)
    || (doc.length >= 2 && documento(c.cpf || c.cnpj || '').includes(doc))).slice(0, 8);
  const cliente = clientes.find(c => Number(c.id_cliente) === clienteId);

  return <Layout><main className="ger-page">
    <header className="ger-hero"><div><p>Vendas / Histórico de clientes</p><h1>Histórico de clientes</h1>
      <p>Consulte as vendas concluídas e os veículos entregues em troca.</p></div></header>

    <section className="ger-filtros">
      <label>Buscar cliente<input type="search" value={busca} onChange={e => setBusca(e.target.value)}
        placeholder="Nome, CPF ou CNPJ" autoComplete="off" /></label>
      {erroClientes && <p role="alert" className="ger-erro">{erroClientes}</p>}
      {termo.length >= 2 && !carregandoClientes && !erroClientes &&
        (encontrados.length ? <ul className="hc-clientes">{encontrados.map(c => <li key={c.id_cliente}>
          <button type="button" onClick={() => selecionar(Number(c.id_cliente))}>
            {c.nome_razao_social}<small>{c.cpf || c.cnpj}</small>
          </button></li>)}</ul> : <p role="status">Nenhum cliente encontrado.</p>)}
    </section>

    {carregando && <p role="status">Carregando histórico…</p>}
    {erro && <p role="alert" className="ger-erro">{erro}</p>}
    {cliente && !carregando && !erro && <>
      <div className="ger-section-heading"><h2>{cliente.nome_razao_social}</h2></div>
      <div className="ger-metricas">
        <div className="ger-metrica"><span>Compras concluídas</span><strong>{operacoes.length}</strong></div>
        <div className="ger-metrica"><span>Veículos entregues em troca</span><strong>{operacoes.reduce((n, o) => n + o.trocas.length, 0)}</strong></div>
        <div className="ger-metrica"><span>Última compra</span><strong>{operacoes[0]?.data_venda ? fmt(operacoes[0].data_venda.slice(0, 10), 'date') : '—'}</strong></div>
      </div>
      <section className="ger-card"><div className="ger-section-heading"><h2>Vendas realizadas</h2></div>
        {operacoes.length ? <div className="ger-table-scroll"><table className="ger-table">
          <thead><tr><th>Veículo</th><th>Pedido</th><th>Data</th><th>Valor</th><th>Ação</th></tr></thead>
          <tbody>{operacoes.map(o => {
            const aberto = detalhe === o.id_pedido;
            return <Fragment key={o.id_pedido}>
              <tr><td>{o.marca} {o.modelo}<small className="hc-placa">{o.placa}</small></td>
                <td>{o.numero_pedido}</td>
                <td>{fmt(o.data_venda.slice(0, 10), 'date')}</td><td>{fmt(o.valor, 'money')}</td>
                <td><button className="ger-link" type="button" aria-expanded={aberto}
                  onClick={() => setDetalhe(aberto ? undefined : o.id_pedido)}>{aberto ? 'Ocultar detalhes' : 'Ver detalhes'}</button></td>
              </tr>
              {aberto && <tr className="hc-detalhe"><td colSpan={5}>
                <p>Venda concluída em {fmt(o.data_venda, 'date')}</p>
                {o.trocas.length > 0 && <><h3>Veículos recebidos em troca</h3>
                  <ul>{o.trocas.map((t, i) => <li key={i}>{[t.marca, t.modelo].filter(Boolean).join(' ')}{t.placa && ' · ' + t.placa}{t.valor != null && ' · ' + fmt(t.valor, 'money')}</li>)}</ul></>}
              </td></tr>}
            </Fragment>;
          })}</tbody>
        </table></div> : <div className="ger-vazio">Nenhuma venda concluída registrada para este cliente.</div>}
      </section>
    </>}
    {!clienteId && !termo && <div className="ger-card ger-vazio">Busque e selecione um cliente para ver as vendas.</div>}
  </main></Layout>;
}
