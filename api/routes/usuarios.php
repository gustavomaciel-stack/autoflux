<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/Auth.php';
try {
    Auth::proteger();
    $permissoesRota = ['GET'=>'usuarios.administrar', 'POST'=>'usuarios.administrar', 'PUT'=>'usuarios.administrar', 'PATCH'=>'usuarios.administrar'];
    $metodoPermissao = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!isset($permissoesRota[$metodoPermissao])) Auth::responder(405, ['sucesso'=>false,'mensagem'=>'Método não permitido.']);
    Auth::exigir($permissoesRota[$metodoPermissao]);

} catch (Throwable $erro) {
    Auth::responder(500, ['sucesso' => false, 'mensagem' => 'Não foi possível validar a sessão.']);
}


header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:5173");
header(
    "Access-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS"
);
header("Access-Control-Allow-Headers: Content-Type, X-CSRF-Token");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__ . "/../config/Database.php";
require_once __DIR__ . "/../models/Usuario.php";
require_once __DIR__ . "/../controllers/UsuarioController.php";

try {
    $conexao = Database::conectar();
    $modelo = new Usuario($conexao);
    $controller = new UsuarioController($modelo);

    $metodo = $_SERVER["REQUEST_METHOD"];

    $idUsuario = filter_input(
        INPUT_GET,
        "id",
        FILTER_VALIDATE_INT
    );

    $acao = trim(
        (string) ($_GET["acao"] ?? "")
    );

    /*
     * GET ?acao=perfis
     *
     * Lista os perfis ativos para o formulário.
     */
    if (
        $metodo === "GET" &&
        $acao === "perfis"
    ) {
        $controller->listarPerfis();
        exit;
    }

    /*
     * GET
     *
     * Sem ID: lista todos os usuários.
     * Com ID: consulta um usuário.
     */
    if ($metodo === "GET") {
        if (isset($_GET["id"])) {
            if (
                $idUsuario === false ||
                $idUsuario === null
            ) {
                http_response_code(400);

                echo json_encode(
                    [
                        "sucesso" => false,
                        "mensagem" =>
                            "ID do usuário inválido.",
                    ],
                    JSON_UNESCAPED_UNICODE
                );

                exit;
            }

            $controller->buscar($idUsuario);
            exit;
        }

        $controller->listar();
        exit;
    }

    /*
     * POST
     *
     * Cadastra um novo usuário.
     */
    if ($metodo === "POST") {
        $conteudo = file_get_contents(
            "php://input"
        );

        $dados = json_decode(
            $conteudo,
            true
        );

        if (!is_array($dados)) {
            http_response_code(400);

            echo json_encode(
                [
                    "sucesso" => false,
                    "mensagem" =>
                        "Os dados enviados são inválidos.",
                ],
                JSON_UNESCAPED_UNICODE
            );

            exit;
        }

        $controller->cadastrar($dados);
        exit;
    }

    /*
     * PUT
     *
     * Atualiza um usuário.
     */
    if ($metodo === "PUT") {
        if (
            $idUsuario === false ||
            $idUsuario === null
        ) {
            http_response_code(400);

            echo json_encode(
                [
                    "sucesso" => false,
                    "mensagem" =>
                        "Informe o ID do usuário.",
                ],
                JSON_UNESCAPED_UNICODE
            );

            exit;
        }

        $conteudo = file_get_contents(
            "php://input"
        );

        $dados = json_decode(
            $conteudo,
            true
        );

        if (!is_array($dados)) {
            http_response_code(400);

            echo json_encode(
                [
                    "sucesso" => false,
                    "mensagem" =>
                        "Os dados enviados são inválidos.",
                ],
                JSON_UNESCAPED_UNICODE
            );

            exit;
        }

        $controller->atualizar(
            $idUsuario,
            $dados
        );

        exit;
    }

    /*
     * PATCH
     *
     * Inativa ou reativa um usuário.
     */
    if ($metodo === "PATCH") {
        if (
            $idUsuario === false ||
            $idUsuario === null
        ) {
            http_response_code(400);

            echo json_encode(
                [
                    "sucesso" => false,
                    "mensagem" =>
                        "Informe o ID do usuário.",
                ],
                JSON_UNESCAPED_UNICODE
            );

            exit;
        }

        $conteudo = file_get_contents(
            "php://input"
        );

        $dados = json_decode(
            $conteudo,
            true
        );

        if (!is_array($dados)) {
            http_response_code(400);

            echo json_encode(
                [
                    "sucesso" => false,
                    "mensagem" =>
                        "Os dados enviados são inválidos.",
                ],
                JSON_UNESCAPED_UNICODE
            );

            exit;
        }

        $controller->alterarSituacao(
            $idUsuario,
            $dados
        );

        exit;
    }

    http_response_code(405);

    echo json_encode(
        [
            "sucesso" => false,
            "mensagem" => "Método não permitido.",
        ],
        JSON_UNESCAPED_UNICODE
    );
} catch (PDOException $erro) {
    http_response_code(500);

    echo json_encode(
        [
            "sucesso" => false,
            "mensagem" =>
                "Erro ao acessar o banco de dados.",
        ],
        JSON_UNESCAPED_UNICODE
    );
} catch (Throwable $erro) {
    http_response_code(500);

    echo json_encode(
        [
            "sucesso" => false,
            "mensagem" => "Erro interno da API.",
        ],
        JSON_UNESCAPED_UNICODE
    );
}