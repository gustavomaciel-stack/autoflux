<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/Auth.php';
Auth::iniciar();

try {
    $metodo = $_SERVER['REQUEST_METHOD'];
    $acao = $_GET['acao'] ?? 'sessao';
    if ($metodo === 'GET' && $acao === 'sessao') {
        if (empty($_SESSION['id_usuario'])) {
            Auth::responder(200, ['sucesso' => true, 'dados' => null, 'csrf' => $_SESSION['csrf']]);
        }
        Auth::responder(200, ['sucesso' => true, 'dados' => Auth::usuario(), 'csrf' => $_SESSION['csrf']]);
    }
    if ($metodo !== 'POST') {
        Auth::responder(405, ['sucesso' => false, 'mensagem' => 'Método não permitido.']);
    }
    Auth::validarCsrf();
    $dados = json_decode(file_get_contents('php://input'), true);
    if (!is_array($dados)) {
        Auth::responder(400, ['sucesso' => false, 'mensagem' => 'Dados inválidos.']);
    }
    $pdo = Database::conectar();
    if ($acao === 'login') {
        $login = strtolower(trim((string) ($dados['login'] ?? '')));
        $senha = (string) ($dados['senha'] ?? '');
        $q = $pdo->prepare('SELECT id_usuario, senha_hash, ativo FROM usuarios WHERE login = :login LIMIT 1');
        $q->execute(['login' => $login]);
        $conta = $q->fetch(PDO::FETCH_ASSOC);
        if (!$conta || !password_verify($senha, $conta['senha_hash']) || (int) $conta['ativo'] !== 1) {
            Auth::responder(401, ['sucesso' => false, 'mensagem' => 'Usuário ou senha inválidos, ou conta inativa.']);
        }
        session_regenerate_id(true);
        $_SESSION['id_usuario'] = (int) $conta['id_usuario'];
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        Auth::responder(200, ['sucesso' => true, 'dados' => Auth::usuario(), 'csrf' => $_SESSION['csrf']]);
    }
    $usuario = Auth::usuario();
    if ($acao === 'sair') {
        $_SESSION = [];
        $params = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $params['path'], 'secure' => $params['secure'], 'httponly' => true, 'samesite' => 'Lax']);
        session_destroy();
        Auth::responder(200, ['sucesso' => true]);
    }
    if ($acao === 'senha') {
        $atual = (string) ($dados['senha_atual'] ?? '');
        $nova = (string) ($dados['nova_senha'] ?? '');
        $confirmacao = (string) ($dados['confirmacao'] ?? '');
        if (strlen($nova) < 8 || $nova !== $confirmacao) {
            Auth::responder(422, ['sucesso' => false, 'mensagem' => 'Informe uma senha de pelo menos 8 caracteres e uma confirmação igual.']);
        }
        $q = $pdo->prepare('SELECT senha_hash FROM usuarios WHERE id_usuario = :id');
        $q->execute(['id' => $usuario['id_usuario']]);
        $hashAtual = $q->fetchColumn();
        if (!is_string($hashAtual) || !password_verify($atual, $hashAtual)) {
            Auth::responder(422, ['sucesso' => false, 'mensagem' => 'A senha atual está incorreta.']);
        }
        $hashNovo = password_hash($nova, PASSWORD_DEFAULT);
        $q = $pdo->prepare('UPDATE usuarios SET senha_hash = :nova WHERE id_usuario = :id AND senha_hash = :atual AND ativo = 1');
        $q->execute(['nova' => $hashNovo, 'id' => $usuario['id_usuario'], 'atual' => $hashAtual]);
        if ($q->rowCount() !== 1) {
            Auth::responder(409, ['sucesso' => false, 'mensagem' => 'A conta foi alterada. Entre novamente e tente outra vez.']);
        }
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        Auth::responder(200, ['sucesso' => true, 'mensagem' => 'Senha alterada com sucesso.', 'csrf' => $_SESSION['csrf']]);
    }
    Auth::responder(400, ['sucesso' => false, 'mensagem' => 'Operação inválida.']);
} catch (Throwable $erro) {
    Auth::responder(500, ['sucesso' => false, 'mensagem' => 'Não foi possível concluir a autenticação.']);
}
