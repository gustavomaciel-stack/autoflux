<?php

declare(strict_types=1);

require_once __DIR__ . '/Database.php';

final class Auth
{
    public static function iniciar(): void
    {
        header('Access-Control-Allow-Origin: http://localhost:5173');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Cache-Control: no-store');
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
        if (session_status() !== PHP_SESSION_ACTIVE) {
            ini_set('session.use_strict_mode', '1');
            session_name('AUTOFLUX_SESSION');
            session_set_cookie_params([
                'httponly' => true,
                'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
                'samesite' => 'Lax',
                'path' => rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/') . '/',
            ]);
            session_start();
        }
        $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    }

    public static function responder(int $status, array $dados): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function validarOrigem(): void
    {
        $origem = $_SERVER['HTTP_ORIGIN'] ?? '';
        $mesmaOrigem = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https://' : 'http://')
            . ($_SERVER['HTTP_HOST'] ?? '');
        if ($origem !== '' && $origem !== 'http://localhost:5173' && $origem !== $mesmaOrigem) {
            self::responder(403, ['sucesso' => false, 'mensagem' => 'Origem da solicitação não permitida.']);
        }
    }

    public static function validarCsrf(): void
    {
        self::validarOrigem();
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($token) || !hash_equals($_SESSION['csrf'], $token)) {
            self::responder(403, ['sucesso' => false, 'mensagem' => 'Atualize a página e tente novamente.']);
        }
    }

    public static function usuario(): array
    {
        $id = (int) ($_SESSION['id_usuario'] ?? 0);
        if ($id <= 0) {
            self::responder(401, ['sucesso' => false, 'mensagem' => 'Faça login para acessar o sistema.']);
        }
        $pdo = Database::conectar();
        $q = $pdo->prepare('SELECT id_usuario, nome, login FROM usuarios WHERE id_usuario = :id AND ativo = 1');
        $q->execute(['id' => $id]);
        $usuario = $q->fetch(PDO::FETCH_ASSOC);
        if (!$usuario) {
            unset($_SESSION['id_usuario']);
            self::responder(401, ['sucesso' => false, 'mensagem' => 'Sua conta está inativa ou indisponível.']);
        }
        $q = $pdo->prepare('SELECT p.id_perfil, p.nome FROM perfis p INNER JOIN usuarios_perfis up ON up.id_perfil = p.id_perfil WHERE up.id_usuario = :id AND up.ativo = 1 AND p.ativo = 1 ORDER BY p.nome');
        $q->execute(['id' => $id]);
        $usuario['perfis'] = $q->fetchAll(PDO::FETCH_ASSOC);
        $usuario['id_usuario'] = (int) $usuario['id_usuario'];
        $usuario['gestao'] = self::ehGestao($usuario);
        $q = $pdo->prepare('SELECT DISTINCT pm.codigo FROM permissoes pm INNER JOIN perfis_permissoes pp ON pp.id_permissao=pm.id_permissao AND pp.ativo=1 INNER JOIN perfis p ON p.id_perfil=pp.id_perfil AND p.ativo=1 INNER JOIN usuarios_perfis up ON up.id_perfil=p.id_perfil AND up.ativo=1 WHERE up.id_usuario=:id AND pm.ativo=1');
        $q->execute(['id'=>$id]);
        $usuario['permissoes'] = $q->fetchAll(PDO::FETCH_COLUMN);
        return $usuario;
    }

    public static function ehGestao(array $usuario): bool
    {
        foreach ($usuario['perfis'] as $perfil) {
            $nome = mb_strtolower(trim($perfil['nome']), 'UTF-8');
            if (in_array($nome, ['gestão', 'gestao', 'diretoria', 'gestão/diretoria', 'gestao/diretoria'], true)) return true;
        }
        return false;
    }

    public static function permite(string $codigo, ?array $usuario = null): bool
    {
        $usuario ??= self::usuario();
        // Consulta básica do pátio disponível para todo usuário autenticado e ativo.
        if ($codigo === 'veiculos.visualizar') return true;
        // Administração permanece exclusiva de Gestão, mesmo se manipularem vínculos no banco.
        if (in_array($codigo, ['usuarios.administrar','perfis.administrar','consignacoes.devolver'], true)) return self::ehGestao($usuario);
        return self::ehGestao($usuario) || in_array($codigo, $usuario['permissoes'], true);
    }

    public static function exigir(string $codigo): void
    {
        if (!self::permite($codigo)) self::responder(403, ['sucesso'=>false,'mensagem'=>'Seu perfil não permite esta operação.']);
    }

    public static function filtrarFinanceiro(array $dados): array
    {
        foreach ($dados as $chave => $valor) {
            if (is_string($chave) && preg_match('/^(valor_(compra|aquisicao|repasse_acordado|nota_fiscal|total)|custo_.*|total_(investido|projetado)|despesas_.*|responsavel_despesas)$/', $chave)) {
                $dados[$chave] = null;
            } elseif (is_array($valor)) {
                $dados[$chave] = self::filtrarFinanceiro($valor);
            }
        }
        return $dados;
    }

    public static function proteger(): void
    {
        self::iniciar();
        self::usuario();
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
            self::validarCsrf();
        }
    }
}
