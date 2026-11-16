<?php
declare(strict_types=1);
require_once __DIR__.'/Orcamento.php';
final class ConsultaGarantias {
 public function __construct(private PDO $pdo){}
 private function q(string $sql,array $args=[]):PDOStatement{$q=$this->pdo->prepare($sql);$q->execute($args);return $q;}
 public function listar(array $f):array {
  $busca=Orcamento::texto($f['busca']??'',150);$situacao=$f['situacao']??'vigente';
  if(!in_array($situacao,['vigente','vence30','vencida','todas'],true))throw new InvalidArgumentException('Filtro de garantia inválido.');
  $pagina=Orcamento::id($f['pagina']??1);
  $from=" FROM pedidos_venda_autoflux p JOIN ciclos_veiculo c ON c.id_ciclo=p.id_ciclo JOIN veiculos v ON v.id_veiculo=c.id_veiculo JOIN clientes cli ON cli.id_cliente=p.id_cliente JOIN vendas_fechamento_autoflux fe ON fe.id_pedido=p.id_pedido WHERE p.situacao='Concluído'";
  $args=[];
  if($busca!==''){$from.=' AND (p.numero_pedido LIKE ? OR c.nosso_numero LIKE ? OR v.placa LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ? OR cli.nome_razao_social LIKE ?)';$termo='%'.str_replace(['!','%','_'],['!!','!%','!_'],$busca).'%';$from=str_replace(' LIKE ?'," LIKE ? ESCAPE '!'",$from);$args=array_fill(0,6,$termo);}
  $fim='DATE_ADD(DATE(fe.data_venda),INTERVAL 90 DAY)';
  $vigente="DATE(fe.data_venda)<=CURRENT_DATE AND $fim>=CURRENT_DATE";
  $vence30=$vigente." AND $fim<=DATE_ADD(CURRENT_DATE,INTERVAL 30 DAY)";
  $cont=$this->q("SELECT COUNT(*) total,COALESCE(SUM($vigente),0) vigentes,COALESCE(SUM($vence30),0) vence30,COALESCE(SUM($fim<CURRENT_DATE),0) vencidas".$from,$args)->fetch(PDO::FETCH_ASSOC);
  $status=match($situacao){'vigente'=>$vigente,'vence30'=>$vence30, 'vencida'=>"$fim<CURRENT_DATE",default=>'1=1'};
  $from.=' AND ('.$status.')';$total=(int)$this->q('SELECT COUNT(*)'.$from,$args)->fetchColumn();$paginas=max(1,(int)ceil($total/20));$pagina=min($pagina,$paginas);
  $campos="p.id_pedido,p.numero_pedido,p.id_ciclo,c.nosso_numero,v.marca,v.modelo,v.placa,cli.nome_razao_social cliente,fe.data_venda,$fim fim_garantia,DATEDIFF($fim,CURRENT_DATE) dias_restantes,
   CASE WHEN $fim<CURRENT_DATE THEN 'Vencida' ELSE 'Vigente' END situacao_garantia,
   COALESCE((SELECT SUM(CASE WHEN w.id_despesa_ciclo IS NULL AND w.responsavel_custo='Revenda' THEN w.valor WHEN w.id_despesa_ciclo IS NOT NULL AND d.ativo=1 AND (d.responsavel_despesa='Revenda' OR d.responsavel_despesa IS NULL) THEN d.valor ELSE 0 END) FROM despesas_garantia_autoflux w LEFT JOIN despesas_veiculo d ON d.id_despesa=w.id_despesa_ciclo WHERE w.id_pedido=p.id_pedido AND w.ativo=1),0) gastos_garantia";
  $itens=$this->q('SELECT '.$campos.$from. " ORDER BY fe.data_venda DESC,p.id_pedido DESC LIMIT 20 OFFSET ".(($pagina-1)*20),$args)->fetchAll(PDO::FETCH_ASSOC);
  foreach($itens as &$i){$i['id_pedido']=(int)$i['id_pedido'];$i['dias_restantes']=$i['dias_restantes']===null?null:(int)$i['dias_restantes'];$i['gastos_garantia']=Orcamento::moeda(Orcamento::centavos(number_format((float)$i['gastos_garantia'],2,'.','')));}unset($i);
  return ['itens'=>$itens,'total'=>$total,'pagina'=>$pagina,'paginas'=>$paginas,'contadores'=>array_map('intval',$cont)];
 }
}
