import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { consultarParametros, salvarParametros, nomesImpostos, impostosPadrao, totalImpostos, type ImpostosConfig, type DadosParametros } from '../services/parametrosComerciaisApi';
import './ParametrosComerciaisPage.css';

function data(valor: string | null) {
  if (!valor) return '—';
  const [dia,hora] = valor.split(' ');
  return `${dia.split('-').reverse().join('/')} ${hora ?? ''}`;
}
function percentual(valor: string) { return `${Number(valor).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}%`; }

export function ParametrosComerciaisPage() {
  const { pode } = useAuth();
  const autorizado = pode('perfis.administrar');
  const [dados,setDados] = useState<DadosParametros>({vigente:null,historico:[]});
  const [padrao,setPadrao] = useState('');
  const [minimo,setMinimo] = useState('');
  const [impostos,setImpostos] = useState<ImpostosConfig>(impostosPadrao);
  const imposto=totalImpostos(impostos);
  const [anterior,setAnterior] = useState<number|null>(null);
  const [editando,setEditando] = useState(false);
  const [carregando,setCarregando] = useState(true);
  const [salvando,setSalvando] = useState(false);
  const [erro,setErro] = useState('');
  const [sucesso,setSucesso] = useState('');
  const carregar = useCallback(async () => {
    if (!autorizado) { setCarregando(false); return; }
    setCarregando(true); setErro('');
    try { setDados(await consultarParametros()); }
    catch(e) { setErro(e instanceof Error ? e.message : 'Não foi possível consultar os parâmetros.'); }
    finally { setCarregando(false); }
  },[autorizado]);
  useEffect(() => { void carregar(); },[carregar]);
  function editar() {
    setPadrao(dados.vigente?.percentual_padrao ?? ''); setMinimo(dados.vigente?.percentual_minimo ?? '');
    setImpostos(dados.vigente?.impostos ?? impostosPadrao()); setAnterior(dados.vigente?.id_parametro ?? null); setEditando(true); setErro(''); setSucesso('');
  }
  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (salvando) return; setSalvando(true); setErro('');
    try { setDados(await salvarParametros(padrao,minimo,anterior,impostos)); setEditando(false); setSucesso('Parâmetros salvos. A versão anterior foi preservada.'); }
    catch(e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar os parâmetros.'); }
    finally { setSalvando(false); }
  }
  return <Layout>
    <div className="breadcrumb"><span>Configurações</span><span>/</span><strong>Parâmetros comerciais</strong></div>
    {!autorizado ? <div className="alert error">Acesso exclusivo de Gestão/Diretoria.</div> : <>
      <div className="page-toolbar parametros-toolbar"><div><h1>Parâmetros comerciais</h1><p>Defina os percentuais para as próximas negociações.</p></div>
        <button type="button" className="button secondary" disabled={carregando || salvando} onClick={() => { setEditando(false); void carregar(); }}>Atualizar</button>
      </div>
      {erro && <div className="alert error" role="alert">{erro}</div>}{sucesso && <div className="alert success" role="status">{sucesso}</div>}
      {carregando ? <p>Carregando parâmetros...</p> : <section className="parametros-card">
        <h2>Condição vigente</h2>
        {editando ? <form onSubmit={salvar}>
          <fieldset className="parametros-campos" disabled={salvando}>
            <label className="field"><span>Comissão revenda (%) *</span><input type="number" min="0" max="100" step="0.01" value={padrao} onChange={e => setPadrao(e.target.value)} required /><small>Acréscimo utilizado para sugerir o preço.</small></label>
            <label className="field"><span>Margem mínima (%) *</span><input type="number" min="0" max="100" step="0.01" value={minimo} onChange={e => setMinimo(e.target.value)} required /><small>Limite para identificar negociações que exigem aprovação.</small></label>
          
          </fieldset>
          <fieldset disabled={salvando} className="parametros-tributos"><legend>Impostos estimados da venda</legend>
            <p>A base indica a parcela do valor total da venda sobre a qual incide a alíquota. Estimativa para veículos próprios; consignados aguardam definição.</p>
            {!dados.vigente?.impostos&&<p role="status">A versão anterior possui apenas uma taxa total. Confira os valores individuais sugeridos antes de salvar.</p>}
            <div className="table-scroll"><table><thead><tr><th>Imposto</th><th>Base da venda (%)</th><th>Alíquota (%)</th><th>Taxa efetiva</th></tr></thead><tbody>{nomesImpostos.map(nome=><tr key={nome}><th scope="row">{nome}</th>{(['base','aliquota'] as const).map(campo=><td key={campo}><input aria-label={`${nome}: ${campo==='base'?'base da venda':'alíquota'} (%)`} type="number" min="0" max="100" step="0.01" required value={impostos[nome][campo]} onChange={e=>setImpostos(atual=>({...atual,[nome]:{...atual[nome],[campo]:e.target.value}}))}/></td>)}<td>{(Number(impostos[nome].base)*Number(impostos[nome].aliquota)/100).toLocaleString('pt-BR',{maximumFractionDigits:4})}%</td></tr>)}</tbody></table></div>
            <p><strong>Total estimado no orçamento: {percentual(String(imposto))}</strong></p><small>O total é arredondado para duas casas decimais. Estimativa gerencial sujeita à validação contábil.</small>
          </fieldset>
          <p>A nova versão passa a vigorar na confirmação. Data, hora e usuário são registrados automaticamente.</p>
          <div className="parametros-acoes"><button className="button secondary" type="button" disabled={salvando} onClick={() => { setEditando(false); setErro(''); }}>Cancelar</button><button className="button primary" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar parâmetros'}</button></div>
        </form> : <>
          {dados.vigente ? <dl className="parametros-resumo"><div><dt>Comissão revenda</dt><dd>{percentual(dados.vigente.percentual_padrao)}</dd></div><div><dt>Impostos estimados</dt><dd>{percentual(dados.vigente.percentual_imposto_estimado)}</dd></div><div><dt>Margem mínima</dt><dd>{percentual(dados.vigente.percentual_minimo)}</dd></div><div><dt>Início da vigência</dt><dd>{data(dados.vigente.inicio_vigencia)}</dd></div><div><dt>Usuário responsável</dt><dd>{dados.vigente.usuario_responsavel}</dd></div></dl> : <p>Nenhum parâmetro cadastrado. Informe os percentuais antes de iniciar os orçamentos.</p>}
          {dados.vigente?.impostos&&<DetalhesImpostos impostos={dados.vigente.impostos}/>}
          <button type="button" className="button primary" disabled={Boolean(erro)} onClick={editar}>{dados.vigente ? 'Editar parâmetros' : 'Cadastrar parâmetros'}</button>
        </>}
      </section>}
      <p>Os orçamentos deverão preservar a versão usada em sua elaboração. A comissão do vendedor é configurada em <a href="#usuarios">Cadastros → Usuários</a>, selecionando o perfil Vendedor.</p>
      <h2>Histórico de versões</h2>
      <section className="table-card"><div className="table-scroll"><table><thead><tr><th>Versão</th><th>Comissão revenda</th><th>Margem mínima</th><th>Impostos estimados</th><th>Início da vigência</th><th>Fim da vigência</th><th>Usuário</th><th>Situação</th></tr></thead><tbody>
        {dados.historico.length ? dados.historico.map(p => <tr key={p.id_parametro}><td>#{p.id_parametro}</td><td>{percentual(p.percentual_padrao)}</td><td>{percentual(p.percentual_minimo)}</td><td>{percentual(p.percentual_imposto_estimado)}{p.impostos&&<DetalhesImpostos impostos={p.impostos}/>}</td><td>{data(p.inicio_vigencia)}</td><td>{data(p.fim_vigencia)}</td><td>{p.usuario_responsavel}</td><td><span className={`status ${p.ativo ? 'active' : 'inactive'}`}>{p.ativo ? 'Vigente' : 'Encerrado'}</span></td></tr>) : <tr><td colSpan={8} className="empty-state">Nenhuma versão cadastrada.</td></tr>}
      </tbody></table></div></section>
    </>}
  </Layout>;
}

function DetalhesImpostos({impostos}:{impostos:ImpostosConfig}){return <details><summary>Ver composição dos impostos</summary><dl>{nomesImpostos.map(nome=><div key={nome}><dt>{nome}</dt><dd>Base {percentual(impostos[nome].base)} × alíquota {percentual(impostos[nome].aliquota)} = {(Number(impostos[nome].base)*Number(impostos[nome].aliquota)/100).toLocaleString('pt-BR',{maximumFractionDigits:4})}% da venda</dd></div>)}</dl></details>;}
