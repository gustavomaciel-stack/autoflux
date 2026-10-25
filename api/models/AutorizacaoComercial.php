<?php
declare(strict_types=1);
require_once __DIR__.'/Orcamento.php';
final class AutorizacaoComercial {
 public function __construct(private PDO $pdo) {}
 public static function solicitar(PDO $pdo,int $orcamento,int $usuario): void {
  $q=$pdo->prepare('SELECT * FROM orcamentos WHERE id_orcamento=?');$q->execute([$orcamento]);$o=$q->fetch(PDO::FETCH_ASSOC);
  if(!$o||!in_array($o['situacao'],['Em negociação','Aguardando aprovação'],true))throw new DomainException('Este orçamento não permite solicitar autorização.');
  if((float)$o['margem_prevista']>=(float)$o['percentual_minimo_aplicado'])throw new DomainException('A proposta respeita o limite e pode ser autorizada sem aprovação excepcional.');
  $q=$pdo->prepare('SELECT id_negociacao FROM negociacoes_orcamento WHERE id_orcamento=? ORDER BY id_negociacao DESC LIMIT 1');$q->execute([$orcamento]);$versao=$q->fetchColumn();
  if($versao===false)throw new DomainException('A proposta não possui histórico.');
  $q=$pdo->prepare('SELECT decisao FROM aprovacoes_orcamento WHERE id_negociacao=?');$q->execute([$versao]);$decisao=$q->fetchColumn();
  if($decisao!==false&&$decisao!=='Pendente')throw new DomainException('Esta versão já foi decidida. Edite a proposta para solicitar nova análise.');
  if($decisao===false){
   $q=$pdo->prepare('INSERT INTO aprovacoes_orcamento(id_orcamento,id_usuario_solicitante,id_negociacao,base_comercial_analisada,preco_sugerido_analisado,valor_negociado_analisado,resultado_previsto_analisado,margem_prevista_analisada,percentual_minimo_analisado) VALUES(?,?,?,?,?,?,?,?,?)');
   $q->execute([$orcamento,$usuario,$versao,$o['base_comercial_planejada'],$o['preco_sugerido'],$o['valor_negociado_atual'],$o['resultado_previsto'],$o['margem_prevista'],$o['percentual_minimo_aplicado']]);
  }
  $q=$pdo->prepare("UPDATE orcamentos SET situacao='Aguardando aprovação' WHERE id_orcamento=?");$q->execute([$orcamento]);
 }
 // Executada dentro da transação de criação/ajuste, depois de solicitar a versão atual.
 // O indicador de Gestão é determinado pela sessão autenticada na rota.
 public static function aprovarPeloGestor(PDO $pdo,int $orcamento,int $usuario,string $motivo=''): void {
  $q=$pdo->prepare("UPDATE aprovacoes_orcamento SET decisao='Aprovada',id_usuario_aprovador=?,data_decisao=CURRENT_TIMESTAMP,observacoes=? WHERE id_orcamento=? AND decisao='Pendente' AND id_negociacao=(SELECT MAX(n.id_negociacao) FROM negociacoes_orcamento n WHERE n.id_orcamento=?)");
  $q->execute([$usuario,'Autorização direta pelo usuário Gestão/Diretoria que registrou a proposta.'.($motivo!==''?' Motivo do ajuste: '.$motivo:''),$orcamento,$orcamento]);
  if($q->rowCount()!==1)throw new DomainException('A solicitação da proposta atual não foi encontrada para autorização.');
  $q=$pdo->prepare("UPDATE orcamentos SET situacao='Autorizado' WHERE id_orcamento=?");$q->execute([$orcamento]);
 }
 public function listar(): array {
  return $this->pdo->query("SELECT a.*,o.numero_orcamento,o.situacao situacao_orcamento,c.nosso_numero,v.marca,v.modelo,v.placa,cl.nome_razao_social cliente,u.nome vendedor,sol.nome solicitante,apr.nome aprovador,
   CASE WHEN a.decisao<>'Pendente' THEN a.decisao WHEN o.situacao='Aguardando aprovação' AND a.id_negociacao=(SELECT MAX(n.id_negociacao) FROM negociacoes_orcamento n WHERE n.id_orcamento=o.id_orcamento) THEN 'Pendente' ELSE 'Encerrada sem decisão' END situacao_analise
   FROM aprovacoes_orcamento a JOIN orcamentos o ON o.id_orcamento=a.id_orcamento JOIN ciclos_veiculo c ON c.id_ciclo=o.id_ciclo JOIN veiculos v ON v.id_veiculo=c.id_veiculo JOIN clientes cl ON cl.id_cliente=o.id_cliente JOIN vendedores vd ON vd.id_vendedor=o.id_vendedor JOIN usuarios u ON u.id_usuario=vd.id_usuario JOIN usuarios sol ON sol.id_usuario=a.id_usuario_solicitante LEFT JOIN usuarios apr ON apr.id_usuario=a.id_usuario_aprovador
   ORDER BY a.data_solicitacao,a.id_aprovacao")->fetchAll(PDO::FETCH_ASSOC);
 }
 public function detalhes(int $id): array {
  foreach($this->listar() as $a)if((int)$a['id_aprovacao']===$id){$a['orcamento']=(new Orcamento($this->pdo))->detalhes((int)$a['id_orcamento']);return $a;}
  throw new InvalidArgumentException('Autorização não encontrada.');
 }
 public function decidir(int $id,array $dados,int $usuario): void {
  $decisao=$dados['decisao']??null;
  if(!in_array($decisao,['Aprovada','Rejeitada'],true))throw new InvalidArgumentException('Escolha aprovar ou rejeitar.');
  $obs=Orcamento::texto($dados['justificativa']??null,5000);if($obs==='')throw new InvalidArgumentException('Informe a justificativa da decisão.');
  $esperada=Orcamento::id($dados['id_negociacao']??null);
  $this->pdo->beginTransaction();try {
   $q=$this->pdo->prepare('SELECT id_orcamento FROM aprovacoes_orcamento WHERE id_aprovacao=?');$q->execute([$id]);$orcamento=$q->fetchColumn();
   if($orcamento===false)throw new InvalidArgumentException('Autorização não encontrada.');
   // Mesma ordem de bloqueio da edição: orçamento primeiro, depois autorização.
   $q=$this->pdo->prepare('SELECT * FROM orcamentos WHERE id_orcamento=? FOR UPDATE');$q->execute([$orcamento]);$o=$q->fetch(PDO::FETCH_ASSOC);
   $q=$this->pdo->prepare('SELECT * FROM aprovacoes_orcamento WHERE id_aprovacao=? FOR UPDATE');$q->execute([$id]);$a=$q->fetch(PDO::FETCH_ASSOC);
   $q=$this->pdo->prepare('SELECT MAX(id_negociacao) FROM negociacoes_orcamento WHERE id_orcamento=?');$q->execute([$orcamento]);$ultima=(int)$q->fetchColumn();
   if($a['decisao']!=='Pendente'||$o['situacao']!=='Aguardando aprovação'||$ultima!==$esperada||$esperada!==(int)$a['id_negociacao']||$o['valor_negociado_atual']!==$a['valor_negociado_analisado'])throw new DomainException('A proposta foi alterada, cancelada ou já decidida. Atualize a consulta antes de analisar.');
   foreach(['base_comercial_planejada'=>'base_comercial_analisada','preco_sugerido'=>'preco_sugerido_analisado','resultado_previsto'=>'resultado_previsto_analisado','margem_prevista'=>'margem_prevista_analisada','percentual_minimo_aplicado'=>'percentual_minimo_analisado'] as $campo=>$snapshot){
    if($o[$campo]!==$a[$snapshot])throw new DomainException('Os valores analisados mudaram. Atualize a consulta.');
   }
   $q=$this->pdo->prepare('SELECT situacao_atual,data_encerramento FROM ciclos_veiculo WHERE id_ciclo=? FOR UPDATE');$q->execute([$o['id_ciclo']]);$c=$q->fetch(PDO::FETCH_ASSOC);
   if($decisao==='Aprovada')(new Orcamento($this->pdo))->conferirCusto($o);
   $reserva=new ReservaOrcamento($this->pdo);
   if($decisao==='Aprovada')$reserva->conferirCiclo((int)$o['id_ciclo'],(int)$orcamento);
   $propria=$reserva->ativa((int)$o['id_ciclo']);
   if($decisao==='Aprovada'&&(!$c||$c['data_encerramento']!==null||!in_array($c['situacao_atual'],['Disponível','Reservado'],true)||($c['situacao_atual']==='Reservado'&&!$propria)))throw new DomainException('O veículo não está disponível para autorizar esta negociação.');
   $q=$this->pdo->prepare('UPDATE aprovacoes_orcamento SET decisao=?,id_usuario_aprovador=?,data_decisao=CURRENT_TIMESTAMP,observacoes=? WHERE id_aprovacao=?');$q->execute([$decisao,$usuario,$obs,$id]);
   $q=$this->pdo->prepare('UPDATE orcamentos SET situacao=? WHERE id_orcamento=?');$q->execute([$decisao==='Aprovada'?'Autorizado':'Em negociação',$orcamento]);
   $this->pdo->commit();
  }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
 }
}
