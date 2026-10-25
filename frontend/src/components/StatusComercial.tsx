export function StatusComercial({situacao}:{situacao:string}) {
 const normal=situacao.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const cor=['autorizado','aprovada','avaliado'].includes(normal)?'success':normal.includes('pendente')||normal.includes('aguardando')?'warning':['cancelado','rejeitada'].includes(normal)?'danger':'info';
 return <span className={`orc-status orc-status-${cor}`}>{situacao}</span>;
}
