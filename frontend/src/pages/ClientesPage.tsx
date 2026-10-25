import { formatarCnpj, normalizarCnpj } from "../services/cnpj";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { ClienteModal } from '../components/ClienteModal';
import { useAuth } from '../context/AuthContext';
import { podeGerenciarClientes } from '../services/clientesAcesso';
import { alterarSituacaoCliente, listarCadastroClientes } from '../services/clientesApi';
import type { Cliente } from '../types/Cliente';

function normalizar(valor: string) { return valor.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
function documento(cliente: Cliente) {
  const valor = cliente.cpf || cliente.cnpj || '';
  return cliente.tipo_pessoa === 'PF' ? valor.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4') : formatarCnpj(valor);
}
export function ClientesPage() {
  const { usuario, pode } = useAuth();
  const permitido = podeGerenciarClientes(usuario);
  const [clientes,setClientes] = useState<Cliente[]>([]);
  const [busca,setBusca] = useState('');
  const [tipo,setTipo] = useState('');
  const [cidade,setCidade] = useState('');
  const [situacao,setSituacao] = useState('');
  const [carregando,setCarregando] = useState(false);
  const [erro,setErro] = useState('');
  const [sucesso,setSucesso] = useState('');
  const [modal,setModal] = useState(false);
  const [edicao,setEdicao] = useState<Cliente|null>(null);
  const [alterando,setAlterando] = useState<number|null>(null);
  const carregar = useCallback(async () => {
    if (!permitido) return;
    setCarregando(true); setErro('');
    try { setClientes(await listarCadastroClientes()); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar os clientes.'); }
    finally { setCarregando(false); }
  },[permitido]);
  useEffect(() => { void carregar(); },[carregar]);
  const cidades = useMemo(() => [...new Set(clientes.map(c => c.cidade).filter((c): c is string => Boolean(c)))].sort((a,b) => a.localeCompare(b,'pt-BR')), [clientes]);
  const filtrados = useMemo(() => clientes.filter(c => {
    if (tipo && c.tipo_pessoa !== tipo) return false;
    if (cidade && c.cidade !== cidade) return false;
    if (situacao !== '' && Number(c.ativo) !== Number(situacao)) return false;
    const termo = normalizar(busca);
    if (!termo) return true;
    if (c.cnpj && /^[a-z0-9.\/\-\s]+$/i.test(busca) && normalizarCnpj(busca) && normalizarCnpj(c.cnpj).includes(normalizarCnpj(busca))) return true;
    return [c.nome_razao_social,c.nome_fantasia,c.email,c.telefone,c.cpf,c.cnpj,documento(c)].some(valor => valor && normalizar(valor).includes(termo))
      || (/^[\d\s()./+-]+$/.test(termo) && [c.cpf,c.cnpj,c.telefone].some(valor => valor?.replace(/\D/g,'').includes(termo.replace(/\D/g,''))));
  }),[clientes,busca,tipo,cidade,situacao]);
  async function alternar(c: Cliente) {
    const novo = Number(c.ativo) !== 1;
    if (!window.confirm(`Deseja ${novo ? 'reativar' : 'inativar'} ${c.nome_razao_social}?`)) return;
    setAlterando(c.id_cliente); setErro(''); setSucesso('');
    try { const salvo = await alterarSituacaoCliente(c.id_cliente,novo); setClientes(atual => atual.map(item => item.id_cliente === salvo.id_cliente ? salvo : item)); setSucesso(novo ? 'Cliente reativado.' : 'Cliente inativado. O histórico foi preservado.'); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível alterar a situação.'); }
    finally { setAlterando(null); }
  }
  function salvo(c: Cliente) {
    setClientes(atual => [...atual.filter(item => item.id_cliente !== c.id_cliente),c].sort((a,b) => a.nome_razao_social.localeCompare(b.nome_razao_social,'pt-BR')));
    setSucesso(edicao ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.'); setErro('');
  }
  return <Layout>
    <div className="breadcrumb"><span>Cadastros</span><span>/</span><strong>Clientes</strong></div>
    {!permitido ? <div className="alert error" role="alert">Seu perfil não possui acesso ao cadastro de clientes.</div> : <>
      <div className="page-toolbar"><label className="search-box"><span aria-hidden="true">⌕</span><input type="search" aria-label="Buscar clientes" placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail" value={busca} onChange={e => setBusca(e.target.value)} /></label>
        <button className="button primary" type="button" disabled={!pode('clientes.cadastrar') || carregando || alterando !== null} onClick={() => { setEdicao(null); setModal(true); setSucesso(''); }}>+ Novo cliente</button>
      </div>
      <div className="clientes-filtros">
        <label className="field"><span>Tipo de pessoa</span><select value={tipo} onChange={e => setTipo(e.target.value)}><option value="">Todos</option><option value="PF">Pessoa física</option><option value="PJ">Pessoa jurídica</option></select></label>
        <label className="field"><span>Cidade</span><select value={cidade} onChange={e => setCidade(e.target.value)}><option value="">Todas</option>{cidades.map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="field"><span>Situação</span><select value={situacao} onChange={e => setSituacao(e.target.value)}><option value="">Todas</option><option value="1">Ativo</option><option value="0">Inativo</option></select></label>
        <button className="button secondary" type="button" disabled={carregando || alterando !== null} onClick={() => void carregar()}>Atualizar</button>
      </div>
      {erro && <div className="alert error" role="alert">{erro}</div>}{sucesso && <div className="alert success" role="status">{sucesso}</div>}
      <section className="table-card" aria-label="Lista de clientes"><div className="table-scroll"><table><thead><tr><th>Nome / Razão social</th><th>CPF / CNPJ</th><th>Tipo</th><th>Contato</th><th>Cidade / UF</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
        {carregando ? <tr><td colSpan={7} className="empty-state">Carregando clientes...</td></tr> : !filtrados.length ? <tr><td colSpan={7} className="empty-state">Nenhum cliente encontrado.</td></tr> : filtrados.map(c => <tr key={c.id_cliente}>
          <td><strong>{c.nome_razao_social}</strong>{c.nome_fantasia && <small>{c.nome_fantasia}</small>}</td><td>{documento(c)}</td><td>{c.tipo_pessoa === 'PF' ? 'Pessoa física' : 'Pessoa jurídica'}</td><td>{c.telefone}<small>{c.email}</small></td><td>{[c.cidade,c.estado].filter(Boolean).join(' / ') || '—'}</td>
          <td><span className={`status ${Number(c.ativo) === 1 ? 'active' : 'inactive'}`}>{Number(c.ativo) === 1 ? 'Ativo' : 'Inativo'}</span></td>
          <td><div className="row-actions"><button type="button" disabled={!pode('clientes.editar') || alterando !== null} onClick={() => { setEdicao(c); setModal(true); setSucesso(''); }}>Editar</button><button type="button" disabled={!pode('clientes.editar') || alterando !== null} onClick={() => void alternar(c)}>{alterando === c.id_cliente ? 'Salvando...' : Number(c.ativo) === 1 ? 'Inativar' : 'Reativar'}</button></div></td>
        </tr>)}
      </tbody></table></div></section>
      {modal && <ClienteModal cliente={edicao} aoFechar={() => setModal(false)} aoSalvar={salvo} />}
    </>}
  </Layout>;
}
