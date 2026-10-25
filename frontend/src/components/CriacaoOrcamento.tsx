import { calcularProposta } from '../services/orcamentosApi';
import { useCallback, useMemo, useRef, useState, type FormEvent, type InvalidEvent } from 'react';
import type { UsuarioAutenticado } from '../services/authApi';
import type { BaseOrcamento, DespesaPosVenda, OpcoesOrcamento } from '../services/orcamentosApi';
import type { DadosTroca } from '../services/trocasApi';
import { ofertaVazia } from '../services/trocasApi';
import { DespesasOrcamento, totalPosVenda } from './DespesasOrcamento';
import { TrocaPropostaDialog } from './TrocaPropostaDialog';
import './CriacaoOrcamento.css';

const moeda = (v: string | number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const percentual = (v: string | number) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
const normalizar = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
interface Props {
  opcoes: OpcoesOrcamento | null; usuario: UsuarioAutenticado | null; base: BaseOrcamento | null;
  ciclo: string; cliente: string; validade: string; valor: string; observacoes: string;
  selecionadas: number[]; posVenda: DespesaPosVenda[]; temTroca: boolean; troca: DadosTroca;
  salvando: boolean; calculando: boolean; vendedor: string; permiteTroca: boolean;
  basePreco: number; sugerido: number; custo: number; negociado: number; resultado: number; margem: number; abaixo: boolean; saldo: number;
  onCiclo: (id: string) => void; onCliente: (id: string) => void; onValor: (valor: string) => void; onObservacoes: (texto: string) => void;
  onDespesas: (ids: number[], itens: DespesaPosVenda[]) => void; onTroca: (dados: DadosTroca | null) => void;
  onAtualizar: () => void; onCancelar: () => void; onSalvar: (e: FormEvent) => void;
}

function Icone({ tipo }: { tipo: 'carro' | 'preco' | 'revisao' }) {
  return <span className="proposta-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{tipo === 'carro' ? <><path d="m5 8 2-4h10l2 4M4 8h16v10H4zM4 18v2m16-2v2M7 12h.01M17 12h.01M8 16h8" /></> : tipo === 'preco' ? <><path d="M3 3h8l10 10-8 8L3 11z" /><circle cx="7.5" cy="7.5" r="1" /></> : <><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" /></>}</svg></span>;
}

export function CriacaoOrcamento(p: Props) {
  const [etapa, setEtapa] = useState(1);
  const [buscaCliente, setBuscaCliente] = useState(() => p.opcoes?.clientes.find(c => String(c.id_cliente) === p.cliente)?.nome_razao_social ?? '');
  const [abrirTroca, setAbrirTroca] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const inputCliente = useRef<HTMLInputElement>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const fecharTroca = useCallback(() => setAbrirTroca(false), []);
  const veiculo = p.opcoes?.veiculos.find(v => String(v.id_ciclo) === p.ciclo);
  const cliente = p.opcoes?.clientes.find(c => String(c.id_cliente) === p.cliente);
  const encontrados = useMemo(() => p.opcoes?.clientes.filter(c => normalizar(c.nome_razao_social).includes(normalizar(buscaCliente.trim()))) ?? [], [p.opcoes, buscaCliente]);
  const realizadas = p.base?.realizadas.reduce((s, d) => s + Math.round(Number(d.valor) * 100), 0) ?? 0;
  const selecionadas = p.base?.realizadas.filter(d => p.selecionadas.includes(Number(d.id_despesa))).reduce((s, d) => s + Math.round(Number(d.valor) * 100), 0) ?? 0;
  const pos = totalPosVenda(p.posVenda);
  const avisar = p.resultado < 0 || p.abaixo;
  const situacao = p.resultado < 0 ? 'Prejuízo estimado' : p.abaixo ? 'Abaixo da margem mínima' : 'Dentro da margem mínima';
  function ir(n: number) { setEtapa(n); requestAnimationFrame(() => document.getElementById('proposta-etapa-' + n)?.focus()); }
  function conferir(n: number) {
    const campos = formulario.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-etapa="${n}"] input,[data-etapa="${n}"] select,[data-etapa="${n}"] textarea`);
    for (const campo of campos ?? []) if (!campo.checkValidity()) { ir(n); requestAnimationFrame(() => { campo.focus(); campo.reportValidity(); }); return false; }
    return true;
  }
  function avancar() { if (conferir(etapa)) ir(etapa + 1); }
  function invalidar(e: InvalidEvent<HTMLFormElement>) {
    const campo = e.target as HTMLInputElement;
    const painel = campo.closest<HTMLElement>('[data-etapa]');
    if (painel?.hidden) { e.preventDefault(); ir(Number(painel.dataset.etapa)); requestAnimationFrame(() => { campo.focus(); campo.reportValidity(); }); }
  }
  function salvar(e: FormEvent) {
    if (etapa !== 3) { e.preventDefault(); avancar(); return; }
    if (!conferir(1) || !conferir(2)) { e.preventDefault(); return; }
    p.onSalvar(e);
  }
  function navegar(n: number) { if (n <= etapa) ir(n); else if (conferir(1) && (n < 3 || conferir(2))) ir(n); }
  return <>
    <form className="proposta-editor" ref={formulario} onSubmit={salvar} onInvalidCapture={invalidar}>
      <fieldset disabled={p.salvando}>
        <nav className="proposta-steps" aria-label="Etapas do orçamento">{[
          ['Negociação', 'Cliente e veículo'], ['Valores e troca', 'Preço e condições'], ['Revisão', 'Confira e crie'],
        ].map(([titulo, descricao], i) => <button key={titulo} id={'proposta-etapa-' + (i + 1)} type="button" aria-current={etapa === i + 1 ? 'step' : undefined} className={etapa === i + 1 ? 'active' : etapa > i + 1 ? 'complete' : ''} onClick={() => navegar(i + 1)}><span className="proposta-step-circle">{etapa > i + 1 ? '✓' : i + 1}</span><span><strong>{titulo}</strong><small>{descricao}</small></span></button>)}</nav>
        <div className="proposta-workspace">
          <div className="proposta-main">
            <section className="proposta-card" id="proposta-panel-1" data-etapa="1" hidden={etapa !== 1} aria-labelledby="proposta-title-1">
              <header><Icone tipo="carro" /><div><h2 id="proposta-title-1">Dados da negociação</h2><p>Selecione o veículo e identifique o cliente interessado.</p></div></header>
              <div className="proposta-fields">
                <label className="field">Veículo *<select value={p.ciclo} required onChange={e => p.onCiclo(e.target.value)}><option value="">Selecione o veículo</option>{p.opcoes?.veiculos.map(v => <option key={v.id_ciclo} value={v.id_ciclo}>{v.marca} {v.modelo} · {v.nosso_numero} · {v.placa}</option>)}</select>{veiculo && <small>{veiculo.nosso_numero} · {veiculo.placa}</small>}</label>
                <div className="orc-client-picker"><label className="field">Cliente ativo *<input ref={inputCliente} type="search" required autoComplete="off" value={buscaCliente} placeholder="Digite o nome ou razão social" aria-describedby="proposta-client-help" onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} onChange={e => { setBuscaCliente(e.target.value); p.onCliente(''); e.target.setCustomValidity(e.target.value ? 'Selecione um cliente nas sugestões.' : ''); }} /></label>{buscaCliente.trim() && !cliente && <div className="orc-client-suggestions" aria-label="Clientes encontrados">{encontrados.slice(0, 20).map(c => <button type="button" key={c.id_cliente} onClick={() => { p.onCliente(String(c.id_cliente)); setBuscaCliente(c.nome_razao_social); inputCliente.current?.setCustomValidity(''); }}>{c.nome_razao_social}</button>)}</div>}<small id="proposta-client-help" role="status">{cliente ? 'Cliente selecionado.' : !buscaCliente.trim() ? 'Busque e selecione um cliente ativo.' : encontrados.length ? 'Selecione um nome. Refine a busca se necessário.' : 'Nenhum cliente encontrado.'}</small></div>
                <label className="field">Vendedor responsável<input readOnly value={p.usuario?.nome ?? ''} /><small>Usuário conectado.</small></label>
                <label className="field">Validade da proposta<input type="date" readOnly value={p.validade} /><small>7 dias a partir da criação.</small></label>
              </div>
              <details className="orc-disclosure"><summary>Adicionar observações <span>Opcional</span></summary><div className="orc-disclosure-body"><label className="field">Observações<textarea maxLength={5000} value={p.observacoes} onChange={e => p.onObservacoes(e.target.value)} /></label></div></details>
              <div className="proposta-hint">Os dados permanecem preenchidos ao avançar e voltar entre as etapas.</div>
            </section>
            <section className="proposta-card" id="proposta-panel-2" data-etapa="2" hidden={etapa !== 2} aria-labelledby="proposta-title-2">
              <header><Icone tipo="preco" /><div><h2 id="proposta-title-2">Defina os valores da proposta</h2><p>Ajuste o preço e escolha as despesas consideradas na sugestão.</p></div></header>
              {p.calculando && <p role="status">Atualizando os valores do veículo...</p>}
              {!p.base && !p.calculando && <p>Selecione um veículo na etapa Negociação para ver os valores.</p>}
              {p.base && <>
                <div className="proposta-price-entry"><label className="field">Valor negociado (R$)<input type="number" min="0.01" max="9999999999.99" step="0.01" value={p.valor} placeholder={(p.sugerido / 100).toFixed(2)} onChange={e => p.onValor(e.target.value)} /><small>Em branco, será usado o preço sugerido.</small><button type="button" className="proposta-inline" onClick={() => p.onValor((p.sugerido / 100).toFixed(2))}>Usar preço sugerido: {moeda(p.sugerido / 100)}</button></label><div className={avisar ? 'proposta-price-note warning' : 'proposta-price-note'}><strong>{situacao}</strong><small>{p.negociado >= p.sugerido / 100 ? `${moeda(p.negociado - p.sugerido / 100)} acima do preço sugerido` : `${moeda(p.sugerido / 100 - p.negociado)} abaixo do preço sugerido`}</small></div></div>
                <div className="proposta-origin"><span>{p.base.consignado ? 'Repasse acordado' : 'Aquisição do veículo'}<small>Valor obrigatório na composição</small></span><strong>{moeda(p.base.valor_base)}</strong><span className="proposta-fixed">Fixo</span></div>
                <DespesasOrcamento realizadas={p.base.realizadas} selecionadas={p.selecionadas} posVenda={p.posVenda} onSelecao={ids => p.onDespesas(ids, p.posVenda)} onPosVenda={itens => p.onDespesas(p.selecionadas, itens)} />
                <div className="proposta-rule"><span>Base do preço sugerido <strong>{moeda(p.basePreco / 100)}</strong></span><span>Acréscimo sobre a base <strong>{percentual(p.base.parametro.percentual_padrao)}</strong></span></div>
                {p.permiteTroca && <section className="proposta-trade-card"><div><Icone tipo="carro" /><div><h3>{p.temTroca ? `${p.troca.marca} ${p.troca.modelo}` : 'Cliente dará veículo na troca?'}</h3><p>{p.temTroca ? `${p.troca.placa} · ${p.usuario?.gestao ? 'Avaliação: ' + moeda(Number(p.troca.valor_solicitado || 0)) : 'Será encaminhado para avaliação pelo Compras'}` : 'Abra o formulário para incluir os dados do veículo.'}</p></div></div><div className="proposta-trade-actions"><button type="button" className="button secondary" onClick={() => setAbrirTroca(true)}>{p.temTroca ? 'Editar veículo de troca' : 'Adicionar veículo de troca'}</button>{p.temTroca && <button type="button" className="proposta-inline danger" onClick={() => setConfirmarRemocao(true)}>Remover</button>}</div>{confirmarRemocao && <div className="proposta-remove" role="group" aria-label="Confirmação de remoção da troca"><p>Remover o veículo de troca desta proposta?</p><button type="button" className="button secondary" onClick={() => setConfirmarRemocao(false)}>Manter veículo</button><button type="button" className="button danger" onClick={() => { p.onTroca(null); setConfirmarRemocao(false); }}>Confirmar remoção</button></div>}</section>}
                {p.abaixo && <div className="proposta-hint warning">{p.usuario?.gestao ? 'A margem está abaixo do mínimo. Sua autorização será registrada ao criar o orçamento.' : 'A margem está abaixo do mínimo. A proposta será encaminhada para autorização comercial.'}</div>}
              </>}
            </section>
            <section className="proposta-card" id="proposta-panel-3" data-etapa="3" hidden={etapa !== 3} aria-labelledby="proposta-title-3">
              <header><Icone tipo="revisao" /><div><h2 id="proposta-title-3">Revise antes de criar</h2><p>Confira os dados principais. Você pode voltar e corrigir as informações.</p></div></header>
              {p.base && <div className={avisar ? 'proposta-review-status warning' : 'proposta-review-status'}><strong>{situacao}</strong><p>{p.abaixo ? p.usuario?.gestao ? 'A autorização direta do gestor ficará registrada.' : 'Esta negociação depende de autorização comercial.' : `Margem de ${percentual(p.margem)} · mínima de ${percentual(p.base.parametro.percentual_minimo)}.`}</p></div>}
              <div className="proposta-review-grid">{[
                ['Cliente', cliente?.nome_razao_social ?? 'Não selecionado', 1],
                ['Veículo', veiculo ? `${veiculo.marca} ${veiculo.modelo} · ${veiculo.nosso_numero}` : 'Não selecionado', 1],
                ['Valor negociado', moeda(p.negociado), 2],
                ['Veículo de troca', p.temTroca ? `${p.troca.marca} ${p.troca.modelo} · ${p.troca.placa}` : 'Sem veículo de troca', 2],
              ].map(([titulo, conteudo, n]) => <div key={String(titulo)}><small>{titulo}<button type="button" className="proposta-inline" onClick={() => ir(Number(n))}>Editar<span className="proposta-sr-only"> {titulo}</span></button></small><strong>{conteudo}</strong></div>)}<div><small>Validade</small><strong>{p.validade.split('-').reverse().join('/')}</strong></div><div><small>Vendedor</small><strong>{p.usuario?.nome}</strong></div></div>
              {p.observacoes && <div className="proposta-review-observations"><small>Observações</small><p>{p.observacoes}</p></div>}
              <div className="proposta-hint">Depois de criar, você poderá consultar os detalhes, registrar reserva e sinal e acompanhar o histórico.</div>
            </section>
            {!p.vendedor && <div className="alert error">Seu usuário não possui vínculo comercial ativo. Confira o cadastro de usuários.</div>}
            <footer className="proposta-footer"><button type="button" className="button secondary" onClick={etapa === 1 ? p.onCancelar : () => ir(etapa - 1)}>{etapa === 1 ? 'Cancelar' : 'Voltar'}</button><small>{etapa} de 3</small>{etapa < 3 ? <button type="button" className="button primary" disabled={p.calculando || !p.base} onClick={avancar}>Continuar <span aria-hidden="true">→</span></button> : <button type="submit" className="button primary" disabled={p.calculando || !p.base || !p.vendedor || p.basePreco <= 0}>{p.salvando ? 'Criando...' : 'Criar orçamento'}</button>}</footer>
          </div>
          <aside className="proposta-sidebar" aria-label="Resumo da proposta" aria-busy={p.calculando}>
            <header><div><small>Resumo da proposta</small><h2>{veiculo ? `${veiculo.marca} ${veiculo.modelo}` : 'Selecione um veículo'}</h2><p>{veiculo ? `${veiculo.nosso_numero} · ${veiculo.placa}` : 'Os valores aparecerão aqui.'}</p></div><Icone tipo="carro" /></header>
            <div className="proposta-sidebar-body"><small>Valor para o cliente</small><strong className="proposta-total">{p.base ? moeda(p.negociado) : '—'}</strong><small>Preço sugerido {p.base ? moeda(p.sugerido / 100) : '—'}</small>
              {p.base && <><dl className="proposta-costs"><div><dt>{p.base.consignado ? 'Repasse' : 'Aquisição'}</dt><dd>{moeda(p.base.valor_base)}</dd></div><div><dt>Todas as despesas da revenda</dt><dd>{moeda(realizadas / 100)}</dd></div><div><dt>Compromissos pós-venda</dt><dd>{moeda(pos / 100)}</dd></div><div><dt>Impostos estimados ({percentual(p.base.imposto_percentual)})</dt><dd>{moeda(calcularProposta(p.custo,p.negociado,Number(p.base.imposto_percentual),Number(p.base.comissao_percentual??0)).impostos)}</dd></div><div><dt>Comissão estimada do vendedor ({percentual(p.base.comissao_percentual??0)})</dt><dd>{moeda(calcularProposta(p.custo,p.negociado,Number(p.base.imposto_percentual),Number(p.base.comissao_percentual??0)).comissao)}</dd></div><div className="total"><dt>Custo da operação antes dos impostos e comissão</dt><dd>{moeda(p.custo)}</dd></div></dl><small className="proposta-selected-note">Para o preço sugerido: {moeda(selecionadas / 100)} de despesas selecionadas. {"Impostos incluídos no preço sugerido e descontados do resultado. Estimativa sujeita à validação contábil."}</small>
                <div className={avisar ? 'proposta-result warning' : 'proposta-result'}><div><small>{p.resultado < 0 ? 'Prejuízo estimado' : 'Resultado estimado'}</small><span>{percentual(p.margem)}</span></div><strong>{moeda(p.resultado)}</strong><small>Margem mínima da revenda: {percentual(p.base.parametro.percentual_minimo)}</small></div>
                <dl className="proposta-balance">{p.temTroca && <div><dt>{p.usuario?.gestao ? 'Troca avaliada' : 'Troca pendente de avaliação'}</dt><dd>{p.usuario?.gestao ? moeda(Number(p.troca.valor_solicitado || 0)) : 'Não abate o saldo'}</dd></div>}<div><dt>{p.saldo < 0 ? 'Crédito na proposta' : 'Saldo a pagar'}</dt><dd>{moeda(Math.abs(p.saldo))}</dd></div></dl>
              </>}
            </div><footer><span aria-hidden="true">↻</span> Os cálculos acompanham as alterações.<button type="button" className="proposta-inline" disabled={!p.ciclo || p.calculando} onClick={p.onAtualizar}>{p.calculando ? 'Atualizando...' : 'Atualizar custos'}</button></footer>
          </aside>
        </div>
      </fieldset>
    </form>
    {abrirTroca && <TrocaPropostaDialog dados={p.temTroca ? p.troca : ofertaVazia()} gestao={!!p.usuario?.gestao} onFechar={fecharTroca} onConfirmar={dados => { p.onTroca(dados); fecharTroca(); }} />}
  </>;
}
