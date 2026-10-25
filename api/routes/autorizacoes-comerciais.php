<?php
declare(strict_types=1);
require_once __DIR__.'/../config/Auth.php';
require_once __DIR__.'/../models/AutorizacaoComercial.php';
try {
 Auth::proteger();Auth::exigir('autorizacoes.decidir');$usuario=Auth::usuario();
 date_default_timezone_set('America/Sao_Paulo');$pdo=Database::conectar();$pdo->exec("SET time_zone='-03:00'");$m=new AutorizacaoComercial($pdo);
 $metodo=$_SERVER['REQUEST_METHOD']??'GET';
 if($metodo==='GET')Auth::responder(200,['sucesso'=>true,'dados'=>isset($_GET['id'])?$m->detalhes(Orcamento::id($_GET['id'])):$m->listar()]);
 if($metodo!=='POST'){header('Allow: GET, POST, OPTIONS');Auth::responder(405,['sucesso'=>false,'mensagem'=>'Método não permitido.']);}
 $dados=json_decode(file_get_contents('php://input')?:'',true,512,JSON_THROW_ON_ERROR);if(!is_array($dados))throw new InvalidArgumentException('Dados inválidos.');
 $id=Orcamento::id($_GET['id']??null);$m->decidir($id,$dados,(int)$usuario['id_usuario']);Auth::responder(200,['sucesso'=>true,'dados'=>$m->detalhes($id)]);
}catch(InvalidArgumentException|JsonException $e){Auth::responder(422,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(DomainException $e){Auth::responder(409,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(Throwable $e){error_log('AutoFlux autorizações: '.$e->getMessage());Auth::responder(500,['sucesso'=>false,'mensagem'=>'Não foi possível acessar as autorizações. Confira o SQL desta etapa.']);}
