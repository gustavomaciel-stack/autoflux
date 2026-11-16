<?php
declare(strict_types=1);
require_once __DIR__.'/../config/Auth.php';
require_once __DIR__.'/../models/AnaliseGerencial.php';
try {
    Auth::proteger();Auth::exigir('gerenciais.visualizar');
    if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET')Auth::responder(405,['sucesso'=>false,'mensagem'=>'Método não permitido.']);
    date_default_timezone_set('America/Sao_Paulo');$pdo=Database::conectar();$pdo->exec("SET time_zone='-03:00'");
    Auth::responder(200,['sucesso'=>true,'dados'=>(new AnaliseGerencial($pdo))->consultar($_GET)]);
}catch(InvalidArgumentException $e){Auth::responder(422,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(Throwable $e){error_log('AutoFlux gerencial: '.$e->getMessage());Auth::responder(500,['sucesso'=>false,'mensagem'=>'Não foi possível gerar a análise. Confira a disponibilidade do banco e as atualizações anteriores do MVP3. Nenhum total foi apresentado.']);}
