<?php
declare(strict_types=1);
// As operações são executadas na transação do orçamento, após bloquear seu ciclo.
final class ReservaOrcamento {
 public function __construct(private PDO $pdo) {}
 private function executar(string $sql,array $args=[]): PDOStatement {$q=$this->pdo->prepare($sql);$q->execute($args);return $q;}
 public function ativa(int $ciclo): array|false {return $this->executar('SELECT * FROM reservas_orcamento WHERE ciclo_ativo=?',[$ciclo])->fetch(PDO::FETCH_ASSOC);}
 public function conferirCiclo(int $ciclo,?int $orcamento=null): void {
  $r=$this->ativa($ciclo);
  if($r&&($orcamento===null||(int)$r['id_orcamento']!==$orcamento))throw new DomainException('O veículo está reservado em outra negociação.');
 }
 public function detalhes(int $orcamento): array {
  $reservas=$this->executar('SELECT r.*,u.nome responsavel,us.nome responsavel_sinal,ul.nome responsavel_liberacao FROM reservas_orcamento r JOIN usuarios u ON u.id_usuario=r.id_usuario_responsavel LEFT JOIN usuarios us ON us.id_usuario=r.id_usuario_sinal LEFT JOIN usuarios ul ON ul.id_usuario=r.id_usuario_liberacao WHERE r.id_orcamento=? ORDER BY r.id_reserva DESC',[$orcamento])->fetchAll(PDO::FETCH_ASSOC);
  $eventos=$this->executar('SELECT e.*,u.nome responsavel FROM eventos_reserva_orcamento e JOIN reservas_orcamento r ON r.id_reserva=e.id_reserva JOIN usuarios u ON u.id_usuario=e.id_usuario_responsavel WHERE r.id_orcamento=? ORDER BY e.id_evento DESC',[$orcamento])->fetchAll(PDO::FETCH_ASSOC);
  // Versão usa o último evento real, mesmo quando agrupamos a exibição antiga.
  $versao=(int)($eventos[0]['id_evento']??0);
  $porId=[];foreach($eventos as $e)$porId[(int)$e['id_evento']]=$e;
  $ocultar=[];
  foreach($eventos as &$e){
   $anterior=$porId[(int)$e['id_evento']-1]??null;
   if($e['tipo']==='Sinal registrado'&&$anterior&&$anterior['tipo']==='Reserva'
      &&(int)$anterior['id_reserva']===(int)$e['id_reserva']
      &&(int)$anterior['id_usuario_responsavel']===(int)$e['id_usuario_responsavel']
      &&$anterior['data_evento']===$e['data_evento']
      &&$anterior['valor_sinal']===$e['valor_sinal']&&(float)$e['valor_sinal']>0
      &&$anterior['observacoes']===$e['observacoes']){
    $e['tipo']='Reserva com sinal';$ocultar[(int)$anterior['id_evento']]=true;
   }
  }
  unset($e);
  $eventos=array_values(array_filter($eventos,fn(array $e):bool=>!isset($ocultar[(int)$e['id_evento']])));
  $ativa=null;foreach($reservas as $r)if($r['data_liberacao']===null){$ativa=$r;break;}
  return ['reserva_ativa'=>$ativa,'reservas'=>$reservas,'eventos_reserva'=>$eventos,'versao_reserva'=>$versao];
 }
 public function conferirVersao(int $orcamento,array $d): void {
  $atual=$this->executar('SELECT COALESCE(MAX(e.id_evento),0) FROM eventos_reserva_orcamento e JOIN reservas_orcamento r ON r.id_reserva=e.id_reserva WHERE r.id_orcamento=?',[$orcamento])->fetchColumn();
  $esperada=filter_var($d['versao_reserva']??null,FILTER_VALIDATE_INT);
  if($esperada===false||$esperada===null||$esperada<0||(int)$atual!==$esperada)throw new DomainException('A reserva ou o sinal mudou. Atualize os detalhes antes de continuar.');
 }
 private function evento(array $r,int $usuario,string $tipo,string $obs,?string $destino=null): void {
  $this->executar('INSERT INTO eventos_reserva_orcamento(id_reserva,id_usuario_responsavel,tipo,valor_sinal,destino_sinal,observacoes) VALUES(?,?,?,?,?,?)',[$r['id_reserva'],$usuario,$tipo,$r['valor_sinal'],$destino,$obs]);
 }
 public function reservar(array $o,array $c,array $d,int $usuario): void {
  if($o['situacao']!=='Autorizado')throw new DomainException('Autorize a proposta antes de reservar o veículo.');
  if($o['data_validade']<date('Y-m-d'))throw new DomainException('Este orçamento está vencido. Crie uma nova proposta.');
  if($c['data_encerramento']!==null||$c['situacao_atual']!=='Disponível')throw new DomainException('O veículo não está disponível para reserva.');
  if($this->ativa((int)$o['id_ciclo']))throw new DomainException('O veículo já possui uma reserva ativa.');
  $sinal=Orcamento::centavos($d['valor_sinal']??'0');
  if($sinal>Orcamento::centavos($o['valor_negociado_atual']))throw new InvalidArgumentException('O sinal não pode ultrapassar o valor negociado.');
  $obs=Orcamento::texto($d['justificativa']??'',5000);
  $this->executar('INSERT INTO reservas_orcamento(id_orcamento,id_ciclo,id_usuario_responsavel,valor_sinal,data_sinal,id_usuario_sinal) VALUES(?,?,?,?,IF(? > 0,CURRENT_TIMESTAMP,NULL),IF(? > 0,?,NULL))',[$o['id_orcamento'],$o['id_ciclo'],$usuario,Orcamento::moeda($sinal),$sinal,$sinal,$usuario]);
  $r=['id_reserva'=>(int)$this->pdo->lastInsertId(),'valor_sinal'=>Orcamento::moeda($sinal)];
  $this->movimentar((int)$o['id_ciclo'],$usuario,'Disponível','Reservado','Reserva do orçamento '.$o['numero_orcamento']);
  $this->evento($r,$usuario,$sinal>0?'Reserva com sinal':'Reserva',$obs);
 }
 public function sinal(array $o,array $d,int $usuario): void {
  $r=$this->ativa((int)$o['id_ciclo']);
  if(!$r||(int)$r['id_orcamento']!==(int)$o['id_orcamento'])throw new DomainException('Reserve o veículo nesta negociação antes de registrar o sinal.');
  if($o['situacao']!=='Autorizado')throw new DomainException('A proposta precisa estar autorizada para registrar o sinal.');
  if(Orcamento::centavos($r['valor_sinal'])>0)throw new DomainException('Esta reserva já possui sinal registrado.');
  $sinal=Orcamento::centavos($d['valor_sinal']??null);
  if($sinal<=0||$sinal>Orcamento::centavos($o['valor_negociado_atual']))throw new InvalidArgumentException('O sinal deve ser positivo e não ultrapassar o valor negociado.');
  $obs=Orcamento::texto($d['justificativa']??'',5000);
  $r['valor_sinal']=Orcamento::moeda($sinal);
  $this->executar('UPDATE reservas_orcamento SET valor_sinal=?,data_sinal=CURRENT_TIMESTAMP,id_usuario_sinal=? WHERE id_reserva=?',[$r['valor_sinal'],$usuario,$r['id_reserva']]);
  $this->evento($r,$usuario,'Sinal registrado',$obs);
 }
 public function liberar(array $o,array $d,int $usuario,string $motivo,bool $obrigatoria=false): void {
  $r=$this->ativa((int)$o['id_ciclo']);
  if(!$r||(int)$r['id_orcamento']!==(int)$o['id_orcamento']){if($obrigatoria)throw new DomainException('Esta negociação não possui reserva ativa.');return;}
  $destino=null;$obs='';
  if(Orcamento::centavos($r['valor_sinal'])>0){
   $destino=$d['destino_sinal']??null;
   if(!in_array($destino,['Devolvido','Retido','Transferido'],true))throw new InvalidArgumentException('Informe o destino do sinal: devolvido, retido ou transferido.');
   $obs=Orcamento::texto($d['observacoes_destino']??'',5000);
   if($obs==='')throw new InvalidArgumentException('Descreva o destino do sinal, incluindo a negociação de destino se transferido.');
  }
  $this->executar('UPDATE reservas_orcamento SET data_liberacao=CURRENT_TIMESTAMP,id_usuario_liberacao=?,motivo_liberacao=?,destino_sinal=?,observacoes_destino=? WHERE id_reserva=?',[$usuario,$motivo,$destino,$obs?:null,$r['id_reserva']]);
  $c=$this->executar('SELECT situacao_atual,data_encerramento FROM ciclos_veiculo WHERE id_ciclo=?',[$o['id_ciclo']])->fetch(PDO::FETCH_ASSOC);
  if($c['data_encerramento']===null&&$c['situacao_atual']==='Reservado')$this->movimentar((int)$o['id_ciclo'],$usuario,'Reservado','Disponível','Liberação do orçamento '.$o['numero_orcamento'].': '.$motivo);
  $this->evento($r,$usuario,'Liberação',$motivo.($obs!==''?' — '.$obs:''),$destino);
 }
 private function movimentar(int $ciclo,int $usuario,string $anterior,string $nova,string $obs): void {
  $this->executar('UPDATE ciclos_veiculo SET situacao_atual=? WHERE id_ciclo=?',[$nova,$ciclo]);
  $this->executar('INSERT INTO movimentacoes_veiculo(id_ciclo,id_usuario_responsavel,situacao_anterior,situacao_nova,observacoes) VALUES(?,?,?,?,?)',[$ciclo,$usuario,$anterior,$nova,$obs]);
 }
}
