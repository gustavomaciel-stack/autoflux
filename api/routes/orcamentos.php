<?php
declare(strict_types=1);
require_once __DIR__.'/../config/Auth.php';
require_once __DIR__.'/../models/Orcamento.php';
try {
 Auth::proteger();$usuario=Auth::usuario();
 $metodoAcesso=$_SERVER['REQUEST_METHOD']??'GET';
 if(!in_array($metodoAcesso,['GET','POST','PUT'],true))Auth::responder(405,['sucesso'=>false,'mensagem'=>'Método não permitido.']);
 Auth::exigir($metodoAcesso==='GET'?'orcamentos.visualizar':'orcamentos.gerenciar');
 date_default_timezone_set('America/Sao_Paulo');$pdo=Database::conectar();$pdo->exec("SET time_zone='-03:00'");$m=new Orcamento($pdo);$metodo=$_SERVER['REQUEST_METHOD']??'GET';
 if($metodo==='GET'){
  $dados=isset($_GET['id'])?$m->detalhes(Orcamento::id($_GET['id'])):(isset($_GET['ciclo'])?$m->base(Orcamento::id($_GET['ciclo']),(int)$usuario['id_usuario']):(isset($_GET['opcoes'])?$m->opcoes((int)$usuario['id_usuario']):(isset($_GET['paginado'])?$m->paginar($_GET):$m->listar())));Auth::responder(200,['sucesso'=>true,'dados'=>$dados]);
 }
 if(!in_array($metodo,['POST','PUT'],true))Auth::responder(405,['sucesso'=>false,'mensagem'=>'Método não permitido.']);
 $d=json_decode(file_get_contents('php://input')?:'',true,512,JSON_THROW_ON_ERROR);if(!is_array($d))throw new InvalidArgumentException('Dados inválidos.');
 if($metodo==='POST'){if(isset($d['troca']))Auth::exigir('trocas.gerenciar');$id=$m->criar($d,(int)$usuario['id_usuario'],Auth::ehGestao($usuario));Auth::responder(201,['sucesso'=>true,'dados'=>$m->detalhes($id)]);}
 $id=Orcamento::id($_GET['id']??null);$m->alterar($id,$d,(int)$usuario['id_usuario'],Auth::ehGestao($usuario));Auth::responder(200,['sucesso'=>true,'dados'=>$m->detalhes($id)]);
}catch(InvalidArgumentException|JsonException $e){Auth::responder(422,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(DomainException $e){Auth::responder(409,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(Throwable $e){error_log('AutoFlux orçamentos: '.$e->getMessage());Auth::responder(500,['sucesso'=>false,'mensagem'=>'Não foi possível acessar os orçamentos. Confira o SQL desta etapa.']);}
