<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/Auth.php';
require_once __DIR__ . '/../models/Cliente.php';
require_once __DIR__ . '/../controllers/ClienteController.php';

try {
    Auth::proteger();
    $metodoPermissao = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $permissoes = ['GET'=>'clientes.visualizar','POST'=>'clientes.cadastrar','PUT'=>'clientes.editar','PATCH'=>'clientes.editar'];
    if (!isset($permissoes[$metodoPermissao])) Auth::responder(405, ['sucesso'=>false,'mensagem'=>'Método não permitido.']);
    Auth::exigir($permissoes[$metodoPermissao]);

    $controller = new ClienteController(new Cliente(Database::conectar()));
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $id = isset($_GET['id']) ? filter_var($_GET['id'], FILTER_VALIDATE_INT) : null;
    if (isset($_GET['id']) && (!$id || $id < 1)) throw new InvalidArgumentException('ID do cliente inválido.');

    if ($metodo === 'GET') {
        $resultado = $id ? $controller->buscarPorId($id) : $controller->listar();
        if (!$id && ($_GET['ativos'] ?? '') === '1') {
            $resultado['dados'] = array_values(array_filter($resultado['dados'], fn(array $c): bool => (int)$c['ativo'] === 1));
        }
        Auth::responder(200, $resultado);
    }
    if (!in_array($metodo, ['POST','PUT','PATCH'], true)) {
        header('Allow: GET, POST, PUT, PATCH, OPTIONS');
        Auth::responder(405, ['sucesso'=>false, 'mensagem'=>'Método não permitido.']);
    }
    $dados = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($dados)) throw new InvalidArgumentException('Os dados enviados são inválidos.');
    if ($metodo === 'POST') Auth::responder(201, $controller->cadastrar($dados));
    if (!$id) throw new InvalidArgumentException('Informe o ID do cliente.');
    Auth::responder(200, $metodo === 'PATCH' ? $controller->alterarSituacao($id, $dados['ativo'] ?? null) : $controller->atualizar($id, $dados));
} catch (InvalidArgumentException $erro) {
    Auth::responder(400, ['sucesso'=>false, 'mensagem'=>$erro->getMessage()]);
} catch (PDOException $erro) {
    error_log('AutoFlux clientes: ' . $erro->getMessage());
    Auth::responder((string)$erro->getCode() === '23000' ? 409 : 500, ['sucesso'=>false,
        'mensagem'=>(string)$erro->getCode() === '23000' ? 'Já existe um cliente com esse CPF ou CNPJ.' : 'Erro ao acessar o banco. Confira se o SQL do cadastro de clientes foi executado.']);
} catch (RuntimeException $erro) {
    Auth::responder(404, ['sucesso'=>false, 'mensagem'=>$erro->getMessage()]);
} catch (Throwable $erro) {
    error_log('AutoFlux clientes: ' . $erro->getMessage());
    Auth::responder(500, ['sucesso'=>false, 'mensagem'=>'Não foi possível concluir a operação de clientes.']);
}
