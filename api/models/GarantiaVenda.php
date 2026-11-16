<?php
declare(strict_types=1);
require_once __DIR__.'/Orcamento.php';
require_once __DIR__.'/PagamentoPedido.php';
final class GarantiaVenda {
 public function __construct(private PDO $pdo){}
 private function q(string $sql,array $args=[]):PDOStatement{$q=$this->pdo->prepare($sql);$q->execute($args);return $q;}
 private static function json(array $d):string{return json_encode($d,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);}
 private static function data(mixed $v):string{$s=Orcamento::texto($v,10);$d=DateTimeImmutable::createFromFormat('!Y-m-d',$s);if(!$d||$d->format('Y-m-d')!==$s||$s>date('Y-m-d'))throw new InvalidArgumentException('Informe uma data válida, até hoje.');return $s;}
 public function baseFechamento(array $p,string $comissao,?array $repasse):array {
  $s=is_string($p['snapshot']??null)?json_decode($p['snapshot'],true,512,JSON_THROW_ON_ERROR):($p['dados']??[]);
  $comp=$s['composicao']??[];
  if($repasse)$origem=$repasse['repasse_acordado'];
  else{$origem=$this->q('SELECT valor_aquisicao FROM aquisicoes WHERE id_ciclo=?',[$p['id_ciclo']])->fetchColumn();if($origem===false)throw new DomainException('Aquisição não encontrada para preservar o resultado.');}
  $realizadas=(new Orcamento($this->pdo))->realizadas((int)$p['id_ciclo']);
  $despesas=0;foreach($realizadas as $d)$despesas+=Orcamento::centavos($d['valor']);
  $previsoes=$comp['pos_venda']??[];$prev=0;foreach($previsoes as $d)$prev+=Orcamento::centavos($d['valor']);
  $impostos=Orcamento::moeda((int)round(Orcamento::centavos($p['valor_negociado'])*Orcamento::taxa($comp)/10000));
  $resultado=Orcamento::centavos($p['valor_negociado'])-Orcamento::centavos($origem)-$despesas-$prev-Orcamento::centavos($impostos)-Orcamento::centavos($comissao);
  return ['custo_origem'=>$origem,'despesas_ciclo'=>Orcamento::moeda($despesas),'previsoes'=>$previsoes,'impostos_estimados'=>$impostos,'comissao'=>$comissao,'resultado'=>Orcamento::moeda($resultado),'origem_registro'=>'Valores preservados na conclusão da venda'];
 }
 public static function apurar(array $base,string $venda,int $despesasCiclo,int $despesasNovas,array $substituidas):array {
  $pendente=0;foreach($base['previsoes'] as $i=>$d)if(!in_array($i,$substituidas,true))$pendente+=Orcamento::centavos($d['valor']);
  $atual=Orcamento::centavos($venda)-Orcamento::centavos($base['custo_origem'])-$despesasCiclo-$despesasNovas-Orcamento::centavos($base['impostos_estimados'])-Orcamento::centavos($base['comissao']);
  return ['resultado_fechamento'=>$base['resultado'],'resultado_atualizado'=>Orcamento::moeda($atual-$pendente),'resultado_sem_previsoes'=>Orcamento::moeda($atual),'previsoes_pendentes'=>Orcamento::moeda($pendente),'despesas_ciclo_atuais'=>Orcamento::moeda($despesasCiclo),'despesas_novas_garantia'=>Orcamento::moeda($despesasNovas),'origem_registro'=>$base['origem_registro']];
 }
 private function carregar(int $pedido,bool $bloquear=false):array {
  $r=$this->q('SELECT p.id_pedido,p.id_ciclo,p.situacao,p.versao,f.data_venda,f.valor_final,f.comissao_valor,f.snapshot FROM pedidos_venda_autoflux p JOIN vendas_fechamento_autoflux f ON f.id_pedido=p.id_pedido WHERE p.id_pedido=?'.($bloquear?' FOR UPDATE':''),[$pedido])->fetch(PDO::FETCH_ASSOC);
  if(!$r||($r['situacao']!=='Concluído'&&($bloquear||$r['situacao']!=='Cancelado')))throw new DomainException('Garantia disponível somente em vendas concluídas.');
  return $r;
 }
 public static function baseHistorica(array $p):?array {
  $s=json_decode($p['snapshot'],true,512,JSON_THROW_ON_ERROR);
  if(isset($s['financeiro']))return $s['financeiro'];
  // Vendas anteriores à atualização: usa somente a composição histórica, nunca custos atuais.
  $comp=$s['pedido']['composicao']??[];
  $origem=$s['repasse']['repasse_acordado']??$comp['custo_origem']??null;
  if($origem===null||!isset($comp['custo_total']))return null;
  $imposto=Orcamento::moeda((int)round(Orcamento::centavos($p['valor_final'])*Orcamento::taxa($comp)/10000));
  $resultado=Orcamento::centavos($p['valor_final'])-Orcamento::centavos($comp['custo_total'])-Orcamento::centavos($imposto)-Orcamento::centavos($p['comissao_valor']);
  return ['custo_origem'=>$origem,'previsoes'=>$comp['pos_venda']??[],'impostos_estimados'=>$imposto,'comissao'=>$p['comissao_valor'],'resultado'=>Orcamento::moeda($resultado),'origem_registro'=>'Recuperado dos valores históricos preservados no pedido'];
 }
 private function nomeFornecedor(mixed $id,mixed $despesa=null):string {
  if($id!==null){$nome=$this->q('SELECT razao_social_nome FROM fornecedores WHERE id_fornecedor=?',[(int)$id])->fetchColumn();return $nome===false?'Fornecedor não encontrado':(string)$nome;}
  if($despesa!==null){$nome=$this->q('SELECT f.razao_social_nome FROM despesas_veiculo d JOIN fornecedores f ON f.id_fornecedor=d.id_fornecedor WHERE d.id_despesa=?',[(int)$despesa])->fetchColumn();return $nome===false?'Fornecedor não encontrado':(string)$nome;}
  return 'Não informado';
 }
 private function eventoComFornecedor(array $e,array &$cache):array {
  $antes=json_decode($e['antes']??'null',true,512,JSON_THROW_ON_ERROR);
  $depois=json_decode($e['depois']??'{}',true,512,JSON_THROW_ON_ERROR);
  $nome=function(mixed $id,mixed $origem)use(&$cache):string{$chave=(string)$id.':'.(string)$origem;if(!isset($cache[$chave]))$cache[$chave]=$this->nomeFornecedor($id,$origem);return $cache[$chave];};
  if(is_array($antes)&&!isset($antes['fornecedor_nome'])&&(isset($antes['id_fornecedor'])||isset($antes['id_despesa_ciclo'])))$antes['fornecedor_nome']=$nome($antes['id_fornecedor']??null,$antes['id_despesa_ciclo']??null);
  if(isset($depois['valores'])&&!isset($depois['fornecedor_nome']))$depois['fornecedor_nome']=$nome($depois['valores'][4]??null,$depois['valores'][6]??null);
  $e['antes']=$antes===null?null:self::json($antes);$e['depois']=self::json($depois);
  return self::apresentarEvento($e);
 }
 public static function apresentarEvento(array $e):array {
  $antes=json_decode($e['antes']??'null',true,512,JSON_THROW_ON_ERROR)??[];
  $depois=json_decode($e['depois']??'{}',true,512,JSON_THROW_ON_ERROR);
  $titulos=['prazo'=>'Data de entrega registrada','atendimento'=>'Atendimento aberto','encerrar'=>'Atendimento concluído','despesa'=>'Despesa registrada','editar_despesa'=>'Despesa corrigida','excluir_despesa'=>'Despesa excluída ou desvinculada'];
  $campos=[];
  $adicionar=static function(string $campo,mixed $a,mixed $d)use(&$campos):void{if($a!==null||$d!==null)$campos[]=['campo'=>$campo,'antes'=>$a===null?null:(string)$a,'depois'=>$d===null?null:(string)$d];};
  if($e['tipo']==='prazo'){
   $adicionar('Data de entrega',$antes['data_entrega']??null,$depois['data_entrega']??null);
   $adicionar('Fim do prazo informado',$antes['fim_garantia']??null,$depois['fim_garantia']??null);
  }elseif($e['tipo']==='atendimento'){
   $adicionar('Atendimento',null,isset($depois['id_atendimento'])?'#'.$depois['id_atendimento']:null);
   $adicionar('Data da reclamação',null,$depois['data']??null);$adicionar('Problema relatado',null,$depois['problema']??null);
  }elseif($e['tipo']==='encerrar'){
   $adicionar('Atendimento',null,'#'.($depois['id_atendimento']??$antes['id_atendimento']??''));
   $adicionar('Situação',$antes['situacao']??'Aberto','Concluído');$adicionar('Solução / parecer',null,$depois['parecer']??null);
   if(isset($antes['problema']))$adicionar('Problema relatado',null,$antes['problema']);
  }elseif(in_array($e['tipo'],['despesa','editar_despesa'],true)){
   $v=$depois['valores']??[];
   $def=[['Atendimento','id_atendimento',0],['Descrição','descricao',1],['Data da despesa','data_despesa',2],['Valor','valor',3],['Fornecedor','id_fornecedor',4],['Responsável pelo custo','responsavel_custo',5],['Despesa vinculada do ciclo','id_despesa_ciclo',6],['Previsão pós-venda','previsao_indice',7]];
   foreach($def as [$label,$chave,$i]){
    $a=$antes[$chave]??null;$d=$v[$i]??null;
    if($chave==='id_fornecedor'){$a=$antes['fornecedor_nome']??($a===null?null:'Fornecedor não encontrado');$d=$depois['fornecedor_nome']??($d===null?null:'Fornecedor não encontrado');}
    if($chave==='valor'){$a=$a===null?null:'R$ '.number_format((float)$a,2,',','.');$d=$d===null?null:'R$ '.number_format((float)$d,2,',','.');}
    if($chave==='previsao_indice'){$a=$a===null?null:'Previsão '.((int)$a+1);$d=$d===null?null:'Previsão '.((int)$d+1);}
    $adicionar($label,$a,$d);
   }
  }elseif($e['tipo']==='excluir_despesa'){
   $adicionar('Descrição',null,$antes['descricao']??null);
   if(isset($antes['valor']))$adicionar('Valor do registro',null,'R$ '.number_format((float)$antes['valor'],2,',','.'));
   $adicionar('Motivo',null,$depois['motivo']??null);
   $adicionar('Efeito',null,isset($antes['id_despesa_ciclo'])?'Vínculo removido; a despesa original permanece no ciclo.':'Despesa excluída do cálculo, com histórico preservado.');
  }
  return ['id_evento'=>(int)($e['id_evento']??0),'tipo'=>$e['tipo'],'titulo'=>$titulos[$e['tipo']]??'Alteração de pós-venda','data_evento'=>$e['data_evento'],'responsavel'=>$e['responsavel'],'campos'=>$campos];
 }
 public function detalhes(int $pedido,bool $opcoes=true):array {
  $p=$this->carregar($pedido);$base=self::baseHistorica($p);
  $inicio=substr($p['data_venda'],0,10);
  $config=['data_entrega'=>$inicio,'fim_garantia'=>(new DateTimeImmutable($inicio))->modify('+90 days')->format('Y-m-d')];
  $atendimentos=$this->q('SELECT a.*,u.nome responsavel FROM atendimentos_garantia_autoflux a JOIN usuarios u ON u.id_usuario=a.id_usuario WHERE a.id_pedido=? ORDER BY a.id_atendimento DESC',[$pedido])->fetchAll(PDO::FETCH_ASSOC);
  $despesas=$this->q("SELECT g.*,u.nome responsavel,COALESCE(f.razao_social_nome,fc.razao_social_nome) fornecedor,d.ativo despesa_ciclo_ativa,d.valor valor_ciclo,d.responsavel_despesa responsavel_ciclo FROM despesas_garantia_autoflux g JOIN usuarios u ON u.id_usuario=g.id_usuario LEFT JOIN fornecedores f ON f.id_fornecedor=g.id_fornecedor LEFT JOIN despesas_veiculo d ON d.id_despesa=g.id_despesa_ciclo LEFT JOIN fornecedores fc ON fc.id_fornecedor=d.id_fornecedor WHERE g.id_pedido=? ORDER BY g.id_despesa_garantia DESC",[$pedido])->fetchAll(PDO::FETCH_ASSOC);
  $novas=0;$totalGarantia=0;$substituidas=[];
  foreach($despesas as &$d){
   $vinculada=$d['id_despesa_ciclo']!==null;$ativa=(int)$d['ativo']===1&&(!$vinculada||(int)$d['despesa_ciclo_ativa']===1);
   $d['valor_efetivo']=$vinculada?$d['valor_ciclo']:$d['valor'];$d['considerada']=$ativa;
   $daLoja=$vinculada?($d['responsavel_ciclo']===null||$d['responsavel_ciclo']==='Revenda'):$d['responsavel_custo']==='Revenda';
   if($ativa&&$daLoja){$valor=Orcamento::centavos($d['valor_efetivo']);$totalGarantia+=$valor;if(!$vinculada)$novas+=$valor;if($d['previsao_indice']!==null)$substituidas[]=(int)$d['previsao_indice'];}
  }unset($d);
  $totalCiclo=0;
  foreach((new Orcamento($this->pdo))->realizadas((int)$p['id_ciclo']) as $despesa)$totalCiclo+=Orcamento::centavos($despesa['valor']);
  foreach($atendimentos as &$a){$a['prazo']=$a['data_reclamacao']>=$inicio&&$a['data_reclamacao']<=$config['fim_garantia']?'Dentro do prazo informado':'Fora do prazo informado';}unset($a);
  $financeiro=$base?self::apurar($base,$p['valor_final'],$totalCiclo,$novas,array_values(array_unique($substituidas))):null;
  if($financeiro){$financeiro['valor_venda']=$p['valor_final'];$financeiro['custo_origem']=$base['custo_origem'];$financeiro['impostos_estimados']=$base['impostos_estimados'];$financeiro['comissao']=$base['comissao'];$financeiro['total_despesas_garantia']=Orcamento::moeda($totalGarantia);$financeiro['previsoes']=$base['previsoes'];$financeiro['previsoes_substituidas']=$substituidas;}
  $eventos=$this->q('SELECT e.id_evento,e.tipo,e.antes,e.depois,e.data_evento,u.nome responsavel FROM eventos_garantia_autoflux e JOIN usuarios u ON u.id_usuario=e.id_usuario WHERE e.id_pedido=? ORDER BY e.id_evento DESC',[$pedido])->fetchAll(PDO::FETCH_ASSOC);
  $cacheFornecedores=[];foreach($eventos as &$evento)$evento=$this->eventoComFornecedor($evento,$cacheFornecedores);unset($evento);
  $out=['eventos'=>$eventos,'config'=>$config,'atendimentos'=>$atendimentos,'despesas'=>$despesas,'financeiro'=>$financeiro,'versao'=>(int)$p['versao']];
  if($opcoes){$out['fornecedores']=$this->q('SELECT id_fornecedor,razao_social_nome FROM fornecedores WHERE ativo=1 ORDER BY razao_social_nome')->fetchAll(PDO::FETCH_ASSOC);$out['despesas_ciclo']=$this->q("SELECT id_despesa,descricao,valor FROM despesas_veiculo WHERE id_ciclo=? AND ativo=1 AND (responsavel_despesa='Revenda' OR responsavel_despesa IS NULL) AND id_despesa NOT IN (SELECT id_despesa_ciclo FROM despesas_garantia_autoflux WHERE ativo=1 AND id_despesa_ciclo IS NOT NULL) ORDER BY id_despesa DESC",[$p['id_ciclo']])->fetchAll(PDO::FETCH_ASSOC);}
  return $out;
 }
 public function alterar(int $pedido,array $d,int $usuario):void {
  $this->pdo->beginTransaction();try{
   $p=$this->carregar($pedido,true);
   if(Orcamento::id($d['versao']??null)!==(int)$p['versao'])throw new DomainException('O pedido mudou. Atualize antes de registrar a garantia.');
   $tipo=$d['tipo']??'';
   if(in_array($tipo,['despesa','editar_despesa','excluir_despesa'],true)){
    $antes=null;$id=0;
    if($tipo!=='despesa'){$id=Orcamento::id($d['id_despesa_garantia']??null);$antes=$this->q('SELECT * FROM despesas_garantia_autoflux WHERE id_despesa_garantia=? AND id_pedido=? AND ativo=1 FOR UPDATE',[$id,$pedido])->fetch(PDO::FETCH_ASSOC);if(!$antes)throw new DomainException('Despesa não encontrada ou já excluída.');}
    if($tipo==='excluir_despesa'){
     $motivo=Orcamento::texto($d['motivo']??'',5000);if($motivo==='')throw new InvalidArgumentException('Informe o motivo da exclusão.');
     $this->q('UPDATE despesas_garantia_autoflux SET ativo=0,id_usuario_exclusao=?,data_exclusao=CURRENT_TIMESTAMP,motivo_exclusao=? WHERE id_despesa_garantia=?',[$usuario,$motivo,$id]);$depois=['ativo'=>0,'motivo'=>$motivo];
    }else{
     $at=$antes['id_atendimento']??null;
     $descricao=Orcamento::texto($d['descricao']??'',255);if($descricao==='')throw new InvalidArgumentException('Informe a descrição da despesa.');
     $data=self::data($d['data_despesa']??null);if($data<substr($p['data_venda'],0,10))throw new InvalidArgumentException('A despesa não pode ser anterior à venda.');
     $resp=$d['responsavel_custo']??'Revenda';if(!in_array($resp,['Revenda','Proprietário','Cliente'],true))throw new InvalidArgumentException('Responsável pelo custo inválido.');
     $vinculo=empty($d['id_despesa_ciclo'])?null:Orcamento::id($d['id_despesa_ciclo']);$fornecedor=null;
     if($antes&&$antes['id_despesa_ciclo']!==null)throw new DomainException('Para corrigir um vínculo, exclua o vínculo e registre novamente. A despesa original permanece no ciclo.');
     if($vinculo){
      $orig=$this->q("SELECT valor FROM despesas_veiculo WHERE id_despesa=? AND id_ciclo=? AND ativo=1 AND (responsavel_despesa='Revenda' OR responsavel_despesa IS NULL) FOR UPDATE",[$vinculo,$p['id_ciclo']])->fetchColumn();if($orig===false)throw new DomainException('Despesa do ciclo indisponível.');
      $valor=Orcamento::centavos($orig);$resp='Revenda';
     }else{
      $valor=Orcamento::centavos($d['valor']??null);if($valor<=0)throw new InvalidArgumentException('Informe um valor positivo.');
      $fornecedor=Orcamento::id($d['id_fornecedor']??null);if(!$this->q('SELECT id_fornecedor FROM fornecedores WHERE id_fornecedor=? AND ativo=1',[$fornecedor])->fetchColumn())throw new DomainException('Selecione um fornecedor ativo.');
     }
     $indice=isset($d['previsao_indice'])&&$d['previsao_indice']!==''?(int)$d['previsao_indice']:null;
     if($indice!==null){$b=self::baseHistorica($p);if(!is_int($d['previsao_indice'])||$indice<0||!isset($b['previsoes'][$indice])||$resp!=='Revenda')throw new InvalidArgumentException('Previsão pós-venda inválida para esta despesa.');
      if($this->q('SELECT id_despesa_garantia FROM despesas_garantia_autoflux WHERE id_pedido=? AND previsao_indice=? AND ativo=1 AND id_despesa_garantia<>?',[$pedido,$indice,$id])->fetchColumn())throw new DomainException('Essa previsão já foi realizada.');}
     if($vinculo&&$this->q('SELECT id_despesa_garantia FROM despesas_garantia_autoflux WHERE id_despesa_ciclo=? AND ativo=1',[$vinculo])->fetchColumn())throw new DomainException('Essa despesa já foi vinculada à garantia.');
     $valores=[$at,$descricao,$data,Orcamento::moeda($valor),$fornecedor,$resp,$vinculo,$indice];
     if($tipo==='editar_despesa')$this->q('UPDATE despesas_garantia_autoflux SET id_atendimento=?,descricao=?,data_despesa=?,valor=?,id_fornecedor=?,responsavel_custo=?,id_despesa_ciclo=?,previsao_indice=? WHERE id_despesa_garantia=?',[...$valores,$id]);
     else{$this->q('INSERT INTO despesas_garantia_autoflux(id_atendimento,descricao,data_despesa,valor,id_fornecedor,responsavel_custo,id_despesa_ciclo,previsao_indice,id_pedido,id_usuario) VALUES(?,?,?,?,?,?,?,?,?,?)',[...$valores,$pedido,$usuario]);$id=(int)$this->pdo->lastInsertId();}
     $depois=['id_despesa_garantia'=>$id,'valores'=>$valores];
    }
   }else throw new InvalidArgumentException('Operação de garantia inválida.');
   if(is_array($antes)&&(isset($antes['id_fornecedor'])||isset($antes['id_despesa_ciclo'])))$antes['fornecedor_nome']=$this->nomeFornecedor($antes['id_fornecedor']??null,$antes['id_despesa_ciclo']??null);
   if(isset($depois['valores']))$depois['fornecedor_nome']=$this->nomeFornecedor($depois['valores'][4]??null,$depois['valores'][6]??null);
   $this->q('INSERT INTO eventos_garantia_autoflux(id_pedido,id_usuario,tipo,antes,depois) VALUES(?,?,?,?,?)',[$pedido,$usuario,$tipo,$antes?self::json($antes):null,self::json($depois)]);
   $this->q('UPDATE pedidos_venda_autoflux SET versao=versao+1 WHERE id_pedido=?',[$pedido]);
   $this->q("INSERT INTO eventos_pedido_autoflux(id_pedido,id_usuario,tipo,observacoes) VALUES(?,?,'Garantia e pós-venda',?)",[$pedido,$usuario,'Operação registrada: '.$tipo]);
   $this->pdo->commit();
  }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
 }
}
