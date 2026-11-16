export function StatusComercial({situacao}:{situacao:string}) {
 const normal=situacao.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const cor=['autorizado','aprovada','avaliado','concluido'].includes(normal)?'success':normal.includes('pendente')||normal.includes('aguardando')?'warning':['cancelado','desistencia','rejeitada'].includes(normal)?'danger':'info';
 return <span className={`orc-status orc-status-${cor}`}>{situacao}</span>;
}
