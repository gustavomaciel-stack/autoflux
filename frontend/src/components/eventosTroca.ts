import type {OfertaTroca} from '../services/trocasApi';
import type {EventoHistorico,CampoHistorico} from './HistoricoEventos';
const moeda=(v:string|number|null)=>v==null?'Não informado':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const data=(v:string)=>`${v.slice(0,10).split('-').reverse().join('/')} às ${v.slice(11,16)}`;
export function eventosTroca(trocas:OfertaTroca[]):EventoHistorico[]{
 const eventos:EventoHistorico[]=[];
 for(const t of trocas){
  const veiculo=`${t.marca} ${t.modelo} · ${t.placa}`;
  const ultima=[...t.avaliacoes].sort((a,b)=>Number(b.id_avaliacao)-Number(a.id_avaliacao))[0];
  eventos.push({id:`oferta-${t.id_veiculo_entrada}`,tipo:'Ofertas',titulo:'Veículo oferecido em troca',data:t.data_cadastro,responsavel:t.responsavel,resumo:veiculo,campos:[{campo:'Veículo',depois:veiculo},{campo:'Ano',depois:t.ano+(t.ano_modelo?'/'+t.ano_modelo:'')},{campo:'Valor solicitado pelo cliente',depois:moeda(t.valor_solicitado)},{campo:'Último valor avaliado desta oferta',depois:ultima?moeda(ultima.valor_avaliado):'Aguardando avaliação'},{campo:'Situação da oferta',depois:Number(t.ativo)===1?'Ativa':'Encerrada — fora do total atual no pagamento'}]});
  const avaliacoes=[...t.avaliacoes].sort((a,b)=>Number(a.id_avaliacao)-Number(b.id_avaliacao));
  avaliacoes.forEach((a,i)=>{
   const anterior=avaliacoes[i-1];const campos:CampoHistorico[]=[{campo:'Veículo',depois:veiculo},{campo:'Valor atribuído na avaliação',antes:anterior?moeda(anterior.valor_avaliado):null,depois:moeda(a.valor_avaliado)},{campo:'Despesas identificadas na compra',antes:anterior?moeda(anterior.total_despesas):null,depois:moeda(a.total_despesas)},{campo:'Data informada da avaliação',depois:data(a.data_avaliacao)},{campo:'Parecer',depois:a.observacoes}];
   a.despesas.forEach((d,n)=>campos.push({campo:`Despesa ${n+1}`,depois:`${d.descricao} · ${d.categoria} · ${moeda(d.valor_previsto)}${d.observacoes?' · '+d.observacoes:''}`}));
   eventos.push({id:`avaliacao-${a.id_avaliacao}`,tipo:'Avaliações',titulo:anterior?'Avaliação atualizada':'Avaliação registrada',data:a.data_registro||a.data_avaliacao,responsavel:a.responsavel,resumo:veiculo,destaque:{rotulo:'Valor desta avaliação',valor:moeda(a.valor_avaliado)},campos});
  });
  if(t.data_encerramento){
   const rejeitada=t.motivo_encerramento?.startsWith('Rejeitada:');const substituida=t.motivo_encerramento?.startsWith('Oferta substituída');
   eventos.push({id:`encerramento-${t.id_veiculo_entrada}`,tipo:'Encerramentos',titulo:rejeitada?'Oferta rejeitada':substituida?'Oferta substituída':'Oferta retirada',data:t.data_encerramento,responsavel:t.responsavel_encerramento||'',resumo:`${veiculo} · Esta oferta não compõe o total atual da troca.`,campos:[{campo:'Veículo',depois:veiculo},{campo:'Motivo',depois:t.motivo_encerramento},{campo:'Efeito na negociação',depois:'Oferta encerrada. Avaliações anteriores preservadas no histórico.'}]});
  }
 }
 return eventos;
}
