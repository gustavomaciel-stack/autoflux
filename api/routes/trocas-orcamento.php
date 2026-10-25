<?php
declare(strict_types=1);
require_once __DIR__.'/../config/Auth.php';
require_once __DIR__.'/../models/Orcamento.php';
try {
    Auth::proteger();$usuario=Auth::usuario();$metodo=$_SERVER['REQUEST_METHOD']??'GET';
    date_default_timezone_set('America/Sao_Paulo');$pdo=Database::conectar();$pdo->exec("SET time_zone='-03:00'");$m=new TrocaOrcamento($pdo);
    if($metodo==='GET'){
        Auth::exigir('trocas.visualizar');
        $dados=isset($_GET['id_orcamento'])?$m->contexto(Orcamento::id($_GET['id_orcamento'])):$m->listar($_GET);
        Auth::responder(200,['sucesso'=>true,'dados'=>$dados]);
    }
    if($metodo!=='PUT')Auth::responder(405,['sucesso'=>false,'mensagem'=>'Método não permitido.']);
    $d=json_decode(file_get_contents('php://input')?:'',true,512,JSON_THROW_ON_ERROR);if(!is_array($d))throw new InvalidArgumentException('Dados inválidos.');
    if(in_array($d['acao']??'',['avaliar','rejeitar'],true))Auth::exigir('avaliacoes.gerenciar');
    elseif(in_array($d['acao']??'',['ofertar','retirar'],true))Auth::exigir('trocas.gerenciar');
    else throw new InvalidArgumentException('Ação inválida.');
    $id=Orcamento::id($_GET['id_orcamento']??null);$m->alterar($id,$d,(int)$usuario['id_usuario'],Auth::ehGestao($usuario));
    Auth::responder(200,['sucesso'=>true,'dados'=>$m->contexto($id)]);
}catch(InvalidArgumentException|JsonException $e){Auth::responder(422,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(DomainException $e){Auth::responder(409,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(Throwable $e){error_log('AutoFlux troca: '.$e->getMessage());Auth::responder(500,['sucesso'=>false,'mensagem'=>'Não foi possível consultar ou salvar a troca. Confira o SQL desta etapa.']);}
