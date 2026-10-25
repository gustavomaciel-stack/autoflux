<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/Auth.php';
try {
    Auth::proteger();
    $permissoesRota = ['GET'=>'clientes.visualizar', 'POST'=>'clientes.cadastrar', 'PUT'=>'clientes.editar'];
    $metodoPermissao = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!isset($permissoesRota[$metodoPermissao])) Auth::responder(405, ['sucesso'=>false,'mensagem'=>'Método não permitido.']);
    Auth::exigir($permissoesRota[$metodoPermissao]);

} catch (Throwable $erro) {
    Auth::responder(500, ['sucesso' => false, 'mensagem' => 'Não foi possível validar a sessão.']);
}


header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-CSRF-Token");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__ . "/../config/Database.php";
require_once __DIR__ . "/../models/Cliente.php";
require_once __DIR__ . "/../controllers/ClienteController.php";

function responderJson(
    array $conteudo,
    int $status = 200
): never {
    http_response_code($status);

    echo json_encode(
        $conteudo,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );

    exit;
}

function lerCorpoJson(): array
{
    $conteudo = file_get_contents("php://input");

    if ($conteudo === false || trim($conteudo) === "") {
        throw new InvalidArgumentException(
            "Nenhum dado foi enviado."
        );
    }

    $dados = json_decode($conteudo, true);

    if (!is_array($dados)) {
        throw new InvalidArgumentException(
            "Os dados enviados são inválidos."
        );
    }

    return $dados;
}

try {
    $conexao = Database::conectar();

    $model = new Cliente($conexao);
    $controller = new ClienteController($model);

    $metodo = $_SERVER["REQUEST_METHOD"];

    $idCliente = filter_input(
        INPUT_GET,
        "id",
        FILTER_VALIDATE_INT
    );

    if ($metodo === "GET") {
        if (isset($_GET["id"])) {
            if (
                $idCliente === false ||
                $idCliente === null ||
                $idCliente <= 0
            ) {
                responderJson(
                    [
                        "sucesso" => false,
                        "mensagem" => "ID do cliente inválido.",
                    ],
                    400
                );
            }

            responderJson(
                $controller->buscarPorId($idCliente)
            );
        }

        responderJson(
            $controller->listar()
        );
    }

    if ($metodo === "POST") {
        $dados = lerCorpoJson();

        responderJson(
            $controller->cadastrar($dados),
            201
        );
    }

    if ($metodo === "PUT") {
        if (
            $idCliente === false ||
            $idCliente === null ||
            $idCliente <= 0
        ) {
            responderJson(
                [
                    "sucesso" => false,
                    "mensagem" => "Informe um ID de cliente válido.",
                ],
                400
            );
        }

        $dados = lerCorpoJson();

        responderJson(
            $controller->atualizar(
                $idCliente,
                $dados
            )
        );
    }

    responderJson(
        [
            "sucesso" => false,
            "mensagem" => "Método não permitido.",
        ],
        405
    );
} catch (InvalidArgumentException $erro) {
    responderJson(
        [
            "sucesso" => false,
            "mensagem" => $erro->getMessage(),
        ],
        400
    );
} catch (RuntimeException $erro) {
    responderJson(
        [
            "sucesso" => false,
            "mensagem" => $erro->getMessage(),
        ],
        404
    );
} catch (PDOException $erro) {
    if ((string) $erro->getCode() === "23000") {
        responderJson(
            [
                "sucesso" => false,
                "mensagem" =>
                    "Já existe um cliente com esse CPF ou CNPJ.",
            ],
            409
        );
    }

    responderJson(
        [
            "sucesso" => false,
            "mensagem" => "Erro ao acessar o banco de dados.",
        ],
        500
    );
} catch (Throwable $erro) {
    responderJson(
        [
            "sucesso" => false,
            "mensagem" => "Erro interno da API.",
        ],
        500
    );
}