<?php
declare(strict_types=1);
require_once __DIR__.'/../config/Auth.php';
require_once __DIR__.'/../models/TrocaRecebida.php';
try {
    Auth::proteger();Auth::exigir('trocas.visualizar');
    date_default_timezone_set('America/Sao_Paulo');$pdo=Database::conectar();$pdo->exec("SET time_zone='-03:00'");$m=new TrocaRecebida($pdo);
    $metodo=$_SERVER['REQUEST_METHOD']??'GET';
    if($metodo==='GET')Auth::responder(200,['sucesso'=>true,'dados'=>isset($_GET['id'])?$m->detalhes(Orcamento::id($_GET['id'])):$m->listar($_GET)]);
    if($metodo!=='POST')Auth::responder(405,['sucesso'=>false,'mensagem'=>'Método não permitido.']);
    Auth::exigir('veiculos.cadastrar');Auth::exigir('avaliacoes.gerenciar');
    $d=json_decode(file_get_contents('php://input')?:'',true,512,JSON_THROW_ON_ERROR);if(!is_array($d))throw new InvalidArgumentException('Dados inválidos.');
    Auth::responder(201,['sucesso'=>true,'dados'=>$m->registrar(Orcamento::id($_GET['id']??null),$d,(int)Auth::usuario()['id_usuario'])]);
}catch(InvalidArgumentException|JsonException $e){Auth::responder(422,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(DomainException $e){Auth::responder(409,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(PDOException $e){error_log('AutoFlux entrada de troca: '.$e->getMessage());$duplicado=$e->getCode()==='23000';Auth::responder($duplicado?409:500,['sucesso'=>false,'mensagem'=>$duplicado?'Já existe uma entrada, placa, chassi ou nota fiscal com estes dados. Atualize a consulta e confira os documentos.':(($_SERVER['REQUEST_METHOD']??'GET')==='GET'?'Não foi possível consultar as trocas recebidas. Atualize a consulta e tente novamente.':'Não foi possível registrar a entrada da troca. Confira os dados e tente novamente.')]);}
catch(Throwable $e){error_log('AutoFlux entrada de troca: '.$e->getMessage());Auth::responder(500,['sucesso'=>false,'mensagem'=>'Não foi possível consultar ou registrar a entrada da troca.']);}
