<?php

declare(strict_types=1);

header(
    "Content-Type: application/json; charset=UTF-8"
);

header(
    "Access-Control-Allow-Origin: http://localhost:5173"
);

header(
    "Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS"
);

header(
    "Access-Control-Allow-Headers: Content-Type"
);

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__
    . "/../config/Database.php";

require_once __DIR__
    . "/../models/Veiculo.php";

require_once __DIR__
    . "/../controllers/VeiculoController.php";

try {
    $conexao = Database::conectar();

    $controller =
        new VeiculoController($conexao);

    $metodo = $_SERVER["REQUEST_METHOD"];

    $idVeiculo = filter_input(
        INPUT_GET,
        "id",
        FILTER_VALIDATE_INT
    );

    if ($metodo === "GET") {
        if (isset($_GET["chassi"])) {
            $controller->buscarChassi(strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $_GET["chassi"])));
            exit;
        }
        if (isset($_GET["id"])) {
            if (
                $idVeiculo === false ||
                $idVeiculo === null
            ) {
                responderErroRota(
                    400,
                    "ID do veículo inválido."
                );

                exit;
            }

            $controller->buscar($idVeiculo);
            exit;
        }

        $controller->listar();
        exit;
    }

    if ($metodo === "POST") {
        $dados = receberDadosJson();

        if ($dados === null) {
            responderErroRota(
                400,
                "Os dados enviados são inválidos."
            );

            exit;
        }

        $controller->cadastrar($dados);
        exit;
    }

    if ($metodo === "PUT") {
        if (
            $idVeiculo === false ||
            $idVeiculo === null
        ) {
            responderErroRota(
                400,
                "Informe o ID do veículo."
            );

            exit;
        }

        $dados = receberDadosJson();

        if ($dados === null) {
            responderErroRota(
                400,
                "Os dados enviados são inválidos."
            );

            exit;
        }

        $controller->atualizar(
            $idVeiculo,
            $dados
        );

        exit;
    }

    responderErroRota(
        405,
        "Método não permitido."
    );
} catch (PDOException $erro) {
    responderErroRota(
        500,
        "Erro ao acessar o banco de dados."
    );
} catch (Throwable $erro) {
    responderErroRota(
        500,
        "Erro interno da API."
    );
}

function receberDadosJson(): ?array
{
    $conteudo = file_get_contents(
        "php://input"
    );

    if (
        $conteudo === false ||
        trim($conteudo) === ""
    ) {
        return null;
    }

    $dados = json_decode(
        $conteudo,
        true
    );

    return is_array($dados)
        ? $dados
        : null;
}

function responderErroRota(
    int $status,
    string $mensagem
): void {
    http_response_code($status);

    echo json_encode(
        [
            "sucesso" => false,
            "mensagem" => $mensagem,
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );
}
