import {type Indicador,formatarGerencial} from '../services/gerencialApi';
export function IndicadoresGerenciais({itens}:{itens:Indicador[]}){return <div className="ger-metricas">{itens.map(i=><article className={'ger-metrica '+(i.type==='money'&&Number(i.value)<0?'ger-negativo':'')} key={i.label}><span>{i.label}</span><strong>{formatarGerencial(i.value,i.type)}</strong></article>)}</div>;}
