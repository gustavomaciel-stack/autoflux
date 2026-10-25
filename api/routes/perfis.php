<?php
declare(strict_types=1);
require_once __DIR__.'/../config/Auth.php';
try {
    Auth::proteger();
    Auth::exigir('perfis.administrar');
    $pdo = Database::conectar();
    $metodo = $_SERVER['REQUEST_METHOD'];
    if ($metodo === 'GET') {
        $perfis = $pdo->query('SELECT id_perfil,nome,descricao,ativo FROM perfis ORDER BY nome')->fetchAll(PDO::FETCH_ASSOC);
        $q = $pdo->prepare('SELECT DISTINCT pm.codigo FROM permissoes pm JOIN perfis_permissoes pp ON pp.id_permissao=pm.id_permissao WHERE pp.id_perfil=? AND pp.ativo=1 AND pm.ativo=1');
        foreach ($perfis as &$perfil) {
            $q->execute([$perfil['id_perfil']]);
            $perfil['permissoes']=$q->fetchAll(PDO::FETCH_COLUMN);
            $perfil['gestao']=Auth::ehGestao(['perfis'=>[$perfil]]);
        }
        unset($perfil);
        $catalogo=$pdo->query('SELECT codigo,nome,modulo FROM permissoes WHERE ativo=1 ORDER BY modulo,nome')->fetchAll(PDO::FETCH_ASSOC);
        Auth::responder(200,['sucesso'=>true,'dados'=>['perfis'=>$perfis,'catalogo'=>$catalogo]]);
    }
    if (!in_array($metodo,['POST','PUT'],true)) Auth::responder(405,['sucesso'=>false,'mensagem'=>'Método não permitido.']);
    $dados=json_decode(file_get_contents('php://input'),true);
    if (!is_array($dados)) Auth::responder(400,['sucesso'=>false,'mensagem'=>'Dados inválidos.']);
    $id=(int)($_GET['id']??0);
    $nome=trim((string)($dados['nome']??''));
    $descricao=trim((string)($dados['descricao']??''));
    $ativo=(int)($dados['ativo']??1);
    $codigos=$dados['permissoes']??[];
    if ($nome==='' || mb_strlen($nome)>100 || mb_strlen($descricao)>255 || !in_array($ativo,[0,1],true) || !is_array($codigos)) Auth::responder(422,['sucesso'=>false,'mensagem'=>'Confira nome, descrição, situação e permissões.']);
    $codigos=array_values(array_unique(array_filter($codigos,'is_string')));
    $pdo->beginTransaction();
    $antigo=null;
    if ($metodo==='PUT') {
        $q=$pdo->prepare('SELECT id_perfil,nome,ativo FROM perfis WHERE id_perfil=? FOR UPDATE');$q->execute([$id]);$antigo=$q->fetch(PDO::FETCH_ASSOC);
        if (!$antigo) { $pdo->rollBack();Auth::responder(404,['sucesso'=>false,'mensagem'=>'Perfil não encontrado.']); }
    }
    $gestao=Auth::ehGestao(['perfis'=>[['nome'=>$nome]]]);
    if (($antigo && Auth::ehGestao(['perfis'=>[$antigo]])) || $gestao) {
        $pdo->rollBack();Auth::responder(422,['sucesso'=>false,'mensagem'=>'Gestão/Diretoria possui acesso integral e não pode ser alterado nesta tela.']);
    }
    // O catálogo ativo é a referência, inclusive para códigos legados sem ponto.
    $catalogo=$pdo->query('SELECT codigo FROM permissoes WHERE ativo=1')->fetchAll(PDO::FETCH_COLUMN);
    if (array_diff($codigos,$catalogo)) {
        $pdo->rollBack();Auth::responder(422,['sucesso'=>false,'mensagem'=>'Há permissões indisponíveis. Atualize a página e selecione novamente os acessos.']);
    }
    foreach ($codigos as $codigo) {
        [$modulo,$acao]=array_pad(explode('.', $codigo, 2),2,'');
        if ($acao!=='visualizar' && in_array($modulo,['veiculos','despesas','consignacoes','fornecedores','clientes'],true)) $codigos[]=$modulo.'.visualizar';
        if ($modulo==='orcamentos' && $acao==='gerenciar') { $codigos[]='orcamentos.visualizar'; $codigos[]='vendas.visualizar'; $codigos[]='clientes.visualizar'; }
        if ($modulo==='despesas') $codigos[]='custos.visualizar';
        if (in_array($modulo,['vendas','consignacoes','notas','despesas','custos'],true)) $codigos[]='veiculos.visualizar';
        if ($modulo==='consignacoes' && $acao==='cadastrar') { $codigos[]='clientes.visualizar'; $codigos[]='clientes.cadastrar'; }
        if ($modulo==='veiculos' && $acao==='cadastrar') $codigos[]='fornecedores.visualizar';
    }
    $codigos=array_values(array_unique($codigos));
    $reservados=['usuarios.administrar','perfis.administrar','consignacoes.devolver'];
    if (!$codigos || array_diff($codigos,$catalogo) || array_intersect($codigos,$reservados)) {
        $pdo->rollBack();Auth::responder(422,['sucesso'=>false,'mensagem'=>'Selecione ao menos uma permissão válida. Administração e devolução são exclusivas de Gestão.']);
    }
    if ($metodo==='POST') {
        $q=$pdo->prepare('INSERT INTO perfis(nome,descricao,ativo) VALUES(?,?,?)');$q->execute([$nome,$descricao,$ativo]);$id=(int)$pdo->lastInsertId();
    } else {
        $q=$pdo->prepare('UPDATE perfis SET nome=?,descricao=?,ativo=? WHERE id_perfil=?');$q->execute([$nome,$descricao,$ativo,$id]);
    }
    $q=$pdo->prepare('UPDATE perfis_permissoes SET ativo=0 WHERE id_perfil=?');$q->execute([$id]);
    $buscar=$pdo->prepare('SELECT id_permissao FROM permissoes WHERE codigo=? AND ativo=1');
    $reativar=$pdo->prepare('UPDATE perfis_permissoes SET ativo=1 WHERE id_perfil=? AND id_permissao=?');
    $existe=$pdo->prepare('SELECT id_perfil_permissao FROM perfis_permissoes WHERE id_perfil=? AND id_permissao=? LIMIT 1');
    $inserir=$pdo->prepare('INSERT INTO perfis_permissoes(id_perfil,id_permissao) VALUES(?,?)');
    foreach ($codigos as $codigo) {
        $buscar->execute([$codigo]);$idPermissao=(int)$buscar->fetchColumn();
        $existe->execute([$id,$idPermissao]);
        if ($existe->fetchColumn()) $reativar->execute([$id,$idPermissao]); else $inserir->execute([$id,$idPermissao]);
    }
    $pdo->commit();
    Auth::responder(200,['sucesso'=>true,'mensagem'=>'Perfil salvo. As novas permissões já valem no backend.']);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    Auth::responder($e->getCode()==='23000'?409:500,['sucesso'=>false,'mensagem'=>$e->getCode()==='23000'?'Já existe um perfil com este nome.':'Não foi possível salvar ou consultar os perfis. Confira a migração SQL.']);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    Auth::responder(500,['sucesso'=>false,'mensagem'=>'Não foi possível processar os perfis.']);
}
