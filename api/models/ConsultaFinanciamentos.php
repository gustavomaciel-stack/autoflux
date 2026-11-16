<?php
declare(strict_types=1);
require_once __DIR__.'/Orcamento.php';
final class ConsultaFinanciamentos {
 public function __construct(private PDO $pdo){}
 private function q(string $sql,array $args=[]):PDOStatement{$q=$this->pdo->prepare($sql);$q->execute($args);return $q;}
 public function listar(array $f):array {
  $busca=Orcamento::texto($f['busca']??'',150);$banco=Orcamento::texto($f['banco']??'',100);$periodo=$f['periodo']??'mes';$mes=Orcamento::texto($f['mes']??date('Y-m'),7);$pagina=Orcamento::id($f['pagina']??1);
  if(!in_array($periodo,['mes','proximos30','futuros','anteriores','sem_data','todos'],true))throw new InvalidArgumentException('Período inválido.');
  $dt=DateTimeImmutable::createFromFormat('!Y-m',$mes);
  if(!$dt||$dt->format('Y-m')!==$mes||(int)$dt->format('Y')<1000||(int)$dt->format('Y')>=9999)throw new InvalidArgumentException('Informe um mês válido para a previsão de término.');
  $inicio=$dt->format('Y-m-d');$fim=$dt->modify('+1 month')->format('Y-m-d');
  $base=" FROM pagamentos_pedido_autoflux pg JOIN pedidos_venda_autoflux p ON p.id_pedido=pg.id_pedido JOIN ciclos_veiculo c ON c.id_ciclo=p.id_ciclo JOIN veiculos v ON v.id_veiculo=c.id_veiculo JOIN clientes cli ON cli.id_cliente=p.id_cliente WHERE p.situacao='Concluído' AND pg.ativo=1 AND pg.forma='Financiamento'";
  $bancos=$this->q('SELECT DISTINCT pg.banco'.$base." AND pg.banco IS NOT NULL AND TRIM(pg.banco)<>'' ORDER BY pg.banco")->fetchAll(PDO::FETCH_COLUMN);
  $args=[];
  if($busca!==''){$base.=" AND CONCAT_WS(' ',p.numero_pedido,c.nosso_numero,v.placa,v.marca,v.modelo,JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.placa')),JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.marca')),JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.modelo')),JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.cliente')),cli.nome_razao_social,cli.telefone) LIKE ? ESCAPE '!'";$args[]='%'.str_replace(['!','%','_'],['!!','!%','!_'],$busca).'%';}
  if($banco!==''){$base.=' AND pg.banco=?';$args[]=$banco;}
  $cont=$this->q("SELECT COUNT(*) total,COALESCE(SUM(pg.ultimo_vencimento>=DATE_FORMAT(CURRENT_DATE,'%Y-%m-01') AND pg.ultimo_vencimento<DATE_ADD(DATE_FORMAT(CURRENT_DATE,'%Y-%m-01'),INTERVAL 1 MONTH)),0) neste_mes,COALESCE(SUM(pg.ultimo_vencimento>=CURRENT_DATE AND pg.ultimo_vencimento<=DATE_ADD(CURRENT_DATE,INTERVAL 30 DAY)),0) proximos30,COALESCE(SUM(pg.ultimo_vencimento<CURRENT_DATE),0) anteriores,COALESCE(SUM(pg.ultimo_vencimento IS NULL),0) sem_data".$base,$args)->fetch(PDO::FETCH_ASSOC);
  $where=match($periodo){'mes'=>' AND pg.ultimo_vencimento>=? AND pg.ultimo_vencimento<?','proximos30'=>' AND pg.ultimo_vencimento>=CURRENT_DATE AND pg.ultimo_vencimento<=DATE_ADD(CURRENT_DATE,INTERVAL 30 DAY)','futuros'=>' AND pg.ultimo_vencimento>=CURRENT_DATE','anteriores'=>' AND pg.ultimo_vencimento<CURRENT_DATE','sem_data'=>' AND pg.ultimo_vencimento IS NULL',default=>''};
  if($periodo==='mes')$args=[...$args,$inicio,$fim];
  $total=(int)$this->q('SELECT COUNT(*)'.$base.$where,$args)->fetchColumn();$paginas=max(1,(int)ceil($total/20));$pagina=min($pagina,$paginas);
  $campos="pg.id_pagamento,pg.banco,pg.parcelas,pg.primeiro_vencimento,pg.ultimo_vencimento,p.id_pedido,p.numero_pedido,c.nosso_numero,COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.marca')),v.marca) marca,COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.modelo')),v.modelo) modelo,COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p.snapshot,'$.placa')),v.placa) placa,cli.nome_razao_social cliente,cli.telefone,DATEDIFF(pg.ultimo_vencimento,CURRENT_DATE) dias_restantes";
  $itens=$this->q('SELECT '.$campos.$base.$where.' ORDER BY pg.ultimo_vencimento IS NULL,pg.ultimo_vencimento,p.id_pedido,pg.id_pagamento LIMIT 20 OFFSET '.(($pagina-1)*20),$args)->fetchAll(PDO::FETCH_ASSOC);
  foreach($itens as &$i){$i['id_pagamento']=(int)$i['id_pagamento'];$i['id_pedido']=(int)$i['id_pedido'];$i['parcelas']=$i['parcelas']===null?null:(int)$i['parcelas'];$i['dias_restantes']=$i['dias_restantes']===null?null:(int)$i['dias_restantes'];}unset($i);
  return ['itens'=>$itens,'total'=>$total,'pagina'=>$pagina,'paginas'=>$paginas,'contadores'=>array_map('intval',$cont),'bancos'=>$bancos];
 }
}
