<?php
declare(strict_types=1);
require_once __DIR__.'/Orcamento.php';
final class DestinoTrocaCancelada {
 public function __construct(private PDO $pdo){}
 private function q(string $sql,array $args=[]):PDOStatement{$q=$this->pdo->prepare($sql);$q->execute($args);return $q;}
 private function bloqueio(array $c,bool $lock=false):?string {
  if($c['data_encerramento']!==null)return 'O ciclo '.$c['nosso_numero'].' já está encerrado ('.$c['situacao_atual'].').';
  $s=$lock?' FOR UPDATE':'';
  $p=$this->q("SELECT numero_pedido FROM pedidos_venda_autoflux WHERE id_ciclo=? AND situacao IN ('Em andamento','Concluído')".$s,[$c['id_ciclo']])->fetchColumn();
  if($p)return 'Veículo vinculado ao pedido '.$p.'. Resolva esse pedido antes de devolver.';
  $r=$this->q('SELECT id_orcamento FROM reservas_orcamento WHERE ciclo_ativo=?'.$s,[$c['id_ciclo']])->fetchColumn();
  if($r)return 'Existe uma reserva ativa no orçamento #'.$r.'. Libere a reserva antes de devolver.';
  if(!in_array($c['situacao_atual'],['Disponível','Em manutenção'],true))return 'A situação '.$c['situacao_atual'].' não permite devolução direta.';
  return null;
 }
 public function listar(int $pedido):array {
  $rows=$this->q('SELECT r.id_recebimento,r.valor_atribuido,r.snapshot,e.id_ciclo,c.nosso_numero,c.situacao_atual,c.data_encerramento,d.destino,d.data_destino,d.justificativa,d.documento,d.data_registro,u.nome responsavel FROM trocas_recebidas_autoflux r LEFT JOIN entradas_troca_autoflux e ON e.id_recebimento=r.id_recebimento LEFT JOIN ciclos_veiculo c ON c.id_ciclo=e.id_ciclo LEFT JOIN destinos_troca_cancelada_autoflux d ON d.id_recebimento=r.id_recebimento LEFT JOIN usuarios u ON u.id_usuario=d.id_usuario WHERE r.id_pedido=? ORDER BY r.id_recebimento',[$pedido])->fetchAll(PDO::FETCH_ASSOC);
  foreach($rows as &$r){$s=json_decode($r['snapshot'],true,512,JSON_THROW_ON_ERROR);$r['marca']=$s['marca']??'';$r['modelo']=$s['modelo']??'';$r['placa']=$s['placa']??'';unset($r['snapshot']);$r['id_recebimento']=(int)$r['id_recebimento'];$r['id_ciclo']=$r['id_ciclo']===null?null:(int)$r['id_ciclo'];$r['pendente']=$r['id_ciclo']!==null&&$r['destino']===null;$r['bloqueio_devolucao']=$r['pendente']?$this->bloqueio($r):null;if($r['id_ciclo']===null&&$r['destino']===null)$r['destino']='Pendência cancelada';}unset($r);return $rows;
 }
 public function cancelarPendencias(int $pedido):void {
  // Sem entrada não existe ciclo a retirar do pátio. O recebimento original continua no histórico.
  $this->q("UPDATE trocas_recebidas_autoflux SET situacao='Cancelada' WHERE id_pedido=? AND id_recebimento NOT IN (SELECT id_recebimento FROM entradas_troca_autoflux)",[$pedido]);
 }
 public function registrar(int $pedido,array $d,int $usuario):void {
  $id=Orcamento::id($d['id_recebimento']??null);$destino=$d['destino']??'';
  if(!in_array($destino,['Devolvida','Mantida'],true))throw new InvalidArgumentException('Escolha devolver ao cliente ou manter na revenda.');
  if(($d['conferido']??false)!==true)throw new InvalidArgumentException('Confirme o destino desta troca.');
  $just=Orcamento::texto($d['justificativa']??'',5000);$doc=Orcamento::texto($d['documento']??'',150);
  if($just==='')throw new InvalidArgumentException('Informe o motivo ou o acordo para esta troca.');
  if($destino==='Devolvida'&&$doc==='')throw new InvalidArgumentException('Informe o documento da saída/devolução.');
  $this->pdo->beginTransaction();try{
   $p=$this->q('SELECT * FROM pedidos_venda_autoflux WHERE id_pedido=? FOR UPDATE',[$pedido])->fetch(PDO::FETCH_ASSOC);
   $x=$this->q('SELECT * FROM cancelamentos_venda_autoflux WHERE id_pedido=? FOR UPDATE',[$pedido])->fetch(PDO::FETCH_ASSOC);
   if(!$p||$p['situacao']!=='Cancelado'||!$x)throw new DomainException('A operação exige uma venda concluída já cancelada.');
   if(Orcamento::id($d['versao']??null)!==(int)$p['versao'])throw new DomainException('O pedido mudou. Atualize antes de confirmar o destino.');
   $r=$this->q('SELECT * FROM trocas_recebidas_autoflux WHERE id_recebimento=? AND id_pedido=? FOR UPDATE',[$id,$pedido])->fetch(PDO::FETCH_ASSOC);
   if(!$r)throw new InvalidArgumentException('Esta troca não pertence ao pedido informado.');
   if($this->q('SELECT id_destino FROM destinos_troca_cancelada_autoflux WHERE id_recebimento=? FOR UPDATE',[$id])->fetchColumn())throw new DomainException('O destino desta troca já foi registrado. Atualize o pedido.');
   $c=$this->q('SELECT c.* FROM entradas_troca_autoflux e JOIN ciclos_veiculo c ON c.id_ciclo=e.id_ciclo WHERE e.id_recebimento=? FOR UPDATE',[$id])->fetch(PDO::FETCH_ASSOC);
   if(!$c)throw new DomainException('Esta troca não teve entrada. A pendência de entrada foi cancelada, sem movimentação do estoque.');
   $data=Orcamento::texto($d['data_destino']??'',10);$dt=DateTimeImmutable::createFromFormat('!Y-m-d',$data);$min=max($x['data_efetiva'],substr($c['data_entrada'],0,10));
   if(!$dt||$dt->format('Y-m-d')!==$data||$data<$min||$data>date('Y-m-d'))throw new InvalidArgumentException('A data deve ser igual ou posterior à entrada e ao cancelamento, e não pode estar no futuro.');
   if($destino==='Devolvida'){
    $bloqueio=$this->bloqueio($c,true);if($bloqueio)throw new DomainException($bloqueio);
    $this->q("UPDATE ciclos_veiculo SET situacao_atual='Devolvido ao cliente',data_encerramento=? WHERE id_ciclo=?",[$data.' 00:00:00',$c['id_ciclo']]);
    $this->q("UPDATE trocas_recebidas_autoflux SET situacao='Devolvida ao cliente' WHERE id_recebimento=?",[$id]);
    $obs='Devolução da troca por cancelamento do pedido '.$p['numero_pedido'].' · Documento: '.$doc.' · '.$just;
    $this->q("INSERT INTO movimentacoes_veiculo(id_ciclo,id_usuario_responsavel,situacao_anterior,situacao_nova,data_movimentacao,observacoes) VALUES(?,?,?,'Devolvido ao cliente',CURRENT_TIMESTAMP,?)",[$c['id_ciclo'],$usuario,$c['situacao_atual'],$obs]);
   }
   $snapshot=json_encode(['recebimento'=>$r,'ciclo_anterior'=>$c],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
   $this->q('INSERT INTO destinos_troca_cancelada_autoflux(id_pedido,id_recebimento,id_ciclo,id_usuario,destino,data_destino,justificativa,documento,snapshot) VALUES(?,?,?,?,?,?,?,?,?)',[$pedido,$id,$c['id_ciclo'],$usuario,$destino,$data,$just,$doc?:null,$snapshot]);
   $this->q('UPDATE pedidos_venda_autoflux SET versao=versao+1 WHERE id_pedido=?',[$pedido]);
   $this->q("INSERT INTO eventos_pedido_autoflux(id_pedido,id_usuario,tipo,observacoes) VALUES(?,?,'Destino da troca registrado',?)",[$pedido,$usuario,$c['nosso_numero'].' · '.($destino==='Devolvida'?'Devolvida ao cliente':'Mantida na revenda / acordo registrado').' · Data: '.$data.' · Documento: '.$doc.' · '.$just]);
   $this->pdo->commit();
  }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
 }
}
