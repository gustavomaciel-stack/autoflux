<?php
declare(strict_types=1);
require_once __DIR__.'/../config/Auth.php';require_once __DIR__.'/../models/Empresa.php';
try{
 Auth::proteger();date_default_timezone_set('America/Sao_Paulo');$pdo=Database::conectar();$pdo->exec("SET time_zone='-03:00'");$metodo=$_SERVER['REQUEST_METHOD']??'GET';$m=new Empresa($pdo);
 if($metodo==='GET')Auth::responder(200,['sucesso'=>true,'dados'=>$m->consultar()]);
 if($metodo!=='PUT')Auth::responder(405,['sucesso'=>false,'mensagem'=>'Método não permitido.']);
 Auth::exigir('empresa.gerenciar');$d=json_decode(file_get_contents('php://input'),true,512,JSON_THROW_ON_ERROR);if(!is_array($d))throw new InvalidArgumentException('Dados inválidos.');
 date_default_timezone_set('America/Sao_Paulo');Auth::responder(200,['sucesso'=>true,'dados'=>$m->salvar($d,(int)Auth::usuario()['id_usuario'])]);
}catch(InvalidArgumentException|JsonException $e){Auth::responder(422,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(DomainException $e){Auth::responder(409,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(Throwable $e){error_log('AutoFlux empresa: '.$e->getMessage());Auth::responder(500,['sucesso'=>false,'mensagem'=>'Não foi possível acessar o cadastro da empresa. Confira o SQL desta atualização.']);}
