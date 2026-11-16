<?php
declare(strict_types=1);
require_once __DIR__.'/../config/Cnpj.php';
require_once __DIR__.'/Orcamento.php';
final class Empresa {
 public function __construct(private PDO $pdo){}
 public function consultar():array {
  $r=$this->pdo->query('SELECT * FROM empresa_autoflux WHERE id_empresa=1')->fetch(PDO::FETCH_ASSOC);
  if(!$r)throw new DomainException('Execute o SQL do cadastro da empresa antes de continuar.');
  $r['versao']=(int)$r['versao'];$r['cadastrada']=$r['razao_social']!=='';return $r;
 }
 public static function validar(array $d):array {
  $out=[];foreach(['razao_social'=>150,'nome_fantasia'=>150,'cnpj'=>20,'telefone'=>20,'email'=>150,'cep'=>10,'logradouro'=>150,'numero'=>20,'complemento'=>100,'bairro'=>80,'cidade'=>80,'estado'=>2] as $k=>$tam)$out[$k]=Orcamento::texto($d[$k]??'',$tam);
  $out['cnpj']=Cnpj::normalizar($out['cnpj']);if(!Cnpj::valido($out['cnpj']))throw new InvalidArgumentException('Informe um CNPJ válido.');
  $out['cep']=preg_replace('/\D/','',$out['cep']);$out['estado']=strtoupper($out['estado']);
  foreach(['razao_social'=>'razão social','nome_fantasia'=>'nome fantasia','telefone'=>'telefone','logradouro'=>'logradouro','numero'=>'número (ou S/N)','bairro'=>'bairro','cidade'=>'cidade'] as $k=>$label)if($out[$k]==='')throw new InvalidArgumentException('Informe '.$label.'.');
  if(!filter_var($out['email'],FILTER_VALIDATE_EMAIL))throw new InvalidArgumentException('Informe um e-mail válido.');
  if(strlen(preg_replace('/\D/','',$out['telefone']))<10)throw new InvalidArgumentException('Informe o telefone com DDD.');
  if(strlen($out['cep'])!==8)throw new InvalidArgumentException('Informe o CEP com oito dígitos.');
  if(!in_array($out['estado'],explode(' ','AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'),true))throw new InvalidArgumentException('Selecione uma UF válida.');
  return $out;
 }
 public function salvar(array $d,int $usuario):array {
  $novo=self::validar($d);$versao=Orcamento::id($d['versao']??null);$this->pdo->beginTransaction();
  try{
   $q=$this->pdo->query('SELECT * FROM empresa_autoflux WHERE id_empresa=1 FOR UPDATE');$antes=$q->fetch(PDO::FETCH_ASSOC);
   if(!$antes||(int)$antes['versao']!==$versao)throw new DomainException('O cadastro da empresa mudou. Atualize antes de salvar.');
   $campos=array_keys($novo);$q=$this->pdo->prepare('UPDATE empresa_autoflux SET '.implode(',',array_map(fn($k)=>$k.'=?',$campos)).',versao=versao+1,id_usuario=?,data_atualizacao=CURRENT_TIMESTAMP WHERE id_empresa=1');$q->execute([...array_values($novo),$usuario]);
   $q=$this->pdo->prepare('INSERT INTO eventos_empresa_autoflux(id_usuario,antes,depois) VALUES(?,?,?)');$q->execute([$usuario,json_encode($antes,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),json_encode($novo,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
   $this->pdo->commit();return $this->consultar();
  }catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
 }
 public static function identificacao(array $e):array {
  $nome=$e['nome_fantasia']?:($e['razao_social']?:'Autocar Veículos');
  return ['nome'=>$nome,'razao_social'=>$e['razao_social'],'cnpj'=>$e['cnpj'],'telefone'=>$e['telefone'],'email'=>$e['email'],'endereco'=>implode(' · ',array_filter([trim($e['logradouro'].', '.$e['numero'],' ,'),$e['complemento'],$e['bairro'],trim($e['cidade'].'/'.$e['estado'],'/'),$e['cep']]))];
 }
}
