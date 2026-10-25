import type { Orcamento } from '../services/orcamentosApi';
import { totalPosVenda } from './DespesasOrcamento';
import { calcularProposta } from '../services/orcamentosApi';
import type { DespesaPosVenda } from '../services/orcamentosApi';
import './CriacaoOrcamento.css';
const moeda=(v:string|number)=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const percentual=(v:string|number)=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
interface Props {
 orcamento:Orcamento;
 previa?:{valor:number;custo:number;posVenda:DespesaPosVenda[];sugerido:number};
 ocupado:boolean;
 onAtualizar:()=>void;
}
export function ResumoOrcamento({orcamento:o,previa,ocupado,onAtualizar}:Props){
 const valor=previa?.valor??Number(o.valor_negociado_atual);
 const custo=previa?.custo??Number(o.composicao?.custo_total??o.base_comercial_planejada);
 const calc=calcularProposta(custo,valor,Number(o.composicao?.imposto_percentual??0),Number(o.composicao?.comissao_percentual??0));
 const margem=previa?calc.margem:Number(o.margem_prevista);
 const resultado=previa?calc.resultado:Number(o.resultado_previsto);
 const alerta=resultado<0||Number(margem.toFixed(2))<Number(o.percentual_minimo_aplicado);
 const pos=totalPosVenda(previa?.posVenda??o.composicao?.pos_venda??[])/100;
 const origem=Number((previa?o.financeiro_atual.custo_origem:o.composicao?.custo_origem)??o.composicao?.base_origem??o.valor_aquisicao_base??o.valor_repasse_base??0);
 const despesas=custo-origem-pos;
 const sinal=Number(o.reserva_ativa?.valor_sinal??0);
 const troca=Number(o.valor_troca);
 const saldo=previa?Math.round(valor*100)/100-troca-sinal:Number(o.saldo_proposta);
 return <aside className="proposta-sidebar" aria-label="Resumo financeiro do orçamento">
  <header><div><small>{previa?'Prévia da nova proposta':'Resumo do orçamento'}</small><h2>{o.marca} {o.modelo}</h2><p>{o.nosso_numero} · {o.placa}</p></div><span className="proposta-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m5 8 2-4h10l2 4M4 8h16v10H4zM4 18v2m16-2v2M7 12h2m6 0h2"/></svg></span></header>
  <div className="proposta-sidebar-body"><small>{previa?'Novo valor negociado':'Valor negociado'}</small><strong className="proposta-total">{moeda(valor)}</strong><small>{previa?'Preço sugerido da edição':'Preço sugerido registrado'} {moeda(previa?.sugerido??o.preco_sugerido)}</small>
   <dl className="proposta-costs"><div><dt>{o.valor_repasse_base===null?(previa?'Aquisição atual':'Aquisição registrada'):(previa?'Repasse atual':'Repasse registrado')}</dt><dd>{moeda(origem)}</dd></div><div><dt>{previa?'Despesas da revenda na nova proposta':'Despesas da revenda na composição registrada'}</dt><dd>{moeda(despesas)}</dd></div><div><dt>Compromissos pós-venda</dt><dd>{moeda(pos)}</dd></div><div><dt>Impostos estimados ({percentual(o.composicao?.imposto_percentual??0)})</dt><dd>{moeda(calc.impostos)}</dd></div><div><dt>Comissão estimada do vendedor ({percentual(o.composicao?.comissao_percentual??0)})</dt><dd>{moeda(calc.comissao)}</dd></div><div className="total"><dt>Custo antes dos impostos e comissão {previa?'da nova proposta':'registrado'}</dt><dd>{moeda(custo)}</dd></div></dl>
   <div className={alerta?'proposta-result warning':'proposta-result'}><div><small>{resultado<0?'Prejuízo estimado'+(previa?'':' registrado'):'Resultado estimado'+(previa?'':' registrado')}</small><span>{percentual(margem)}</span></div><strong>{moeda(resultado)}</strong><small>Margem mínima: {percentual(o.percentual_minimo_aplicado)}</small></div>
   <dl className="proposta-balance"><div><dt>Troca avaliada</dt><dd>{moeda(troca)}</dd></div><div><dt>Sinal registrado</dt><dd>{moeda(sinal)}</dd></div><div><dt>{saldo<0?'Crédito na proposta':'Saldo restante a pagar'}</dt><dd>{moeda(Math.abs(saldo))}</dd></div></dl>
   {o.troca_ativa&&!o.troca_ativa.avaliacao_vigente&&<p className="proposta-sidebar-note">A troca aguarda avaliação e ainda não reduz o saldo.</p>}
  </div>
  <footer>{previa?'Esta é uma prévia. Salve a negociação para registrar os novos valores.':'Valores preservados nesta proposta. Alterações no veículo só serão incorporadas mediante edição e salvamento; as propostas anteriores permanecem no histórico.'}<button type="button" className="proposta-inline" disabled={ocupado||!!previa} onClick={onAtualizar}>{ocupado?'Atualizando...':'Atualizar detalhes'}</button></footer>
 </aside>;
}
