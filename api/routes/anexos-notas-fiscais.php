<?php
declare(strict_types=1);
require_once __DIR__.'/../config/Auth.php';
require_once __DIR__.'/../models/AnexoNotaFiscal.php';
try {
 Auth::proteger();Auth::exigir('notas.visualizar');
 $metodo=$_SERVER['REQUEST_METHOD']??'GET';
 if(!in_array($metodo,['GET','POST'],true))Auth::responder(405,['sucesso'=>false,'mensagem'=>'Método não permitido.']);
 if($metodo==='POST')Auth::exigir('veiculos.cadastrar');
 $model=new AnexoNotaFiscal(Database::conectar(),require __DIR__.'/../config/ArquivosNota.php');
 $id=filter_var($_GET[$metodo==='GET'&&isset($_GET['anexo'])?'anexo':'nota']??null,FILTER_VALIDATE_INT);
 if(!$id||$id<1)throw new InvalidArgumentException('Identificação da nota ou do anexo inválida.');
 if($metodo==='GET'&&isset($_GET['anexo'])) {$model->baixar($id);exit;}
 if($metodo==='POST')$model->enviar($id,(int)Auth::usuario()['id_usuario'],$_FILES['arquivo']??[]);
 Auth::responder(200,['sucesso'=>true,'dados'=>$model->listar($id)]);
} catch(InvalidArgumentException $e){Auth::responder(422,['sucesso'=>false,'mensagem'=>$e->getMessage()]);}
catch(PDOException $e){error_log('AutoFlux anexos NF: '.$e->getMessage());Auth::responder(500,['sucesso'=>false,'mensagem'=>'Não foi possível acessar os anexos. Confira a instalação do SQL desta atualização.']);}
catch(Throwable $e){error_log('AutoFlux anexos NF: '.$e->getMessage());Auth::responder(500,['sucesso'=>false,'mensagem'=>$e instanceof RuntimeException?$e->getMessage():'Não foi possível concluir a operação com o anexo.']);}
