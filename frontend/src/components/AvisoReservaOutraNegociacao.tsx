interface Props {reserva?:{numero_orcamento:string}|null}
export function AvisoReservaOutraNegociacao({reserva}:Props){
 if(!reserva)return null;
 return <div className="alert warning" role="status"><strong>Não é possível aprovar, pois o veículo está reservado em outro orçamento.</strong><p>Reserva vinculada ao orçamento {reserva.numero_orcamento}. Você ainda pode rejeitar a solicitação ou retirar a oferta de troca, conforme suas permissões. Após regularizar a reserva, atualize a consulta.</p></div>;
}
