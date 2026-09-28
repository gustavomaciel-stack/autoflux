<?php

declare(strict_types=1);

header("Content-Type: application/json; charset=UTF-8");

header(
    "Access-Control-Allow-Origin: http://localhost:5173"
);

header(
    "Access-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS"
);

header(
    "Access-Control-Allow-Headers: Content-Type"
);

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__ . "/../config/Database.php";

require_once __DIR__
    . "/../controllers/FornecedorController.php";

try {
    $conexao = Database::conectar();

    $controller = new FornecedorController(
        $conexao
    );

    $idFornecedor = filter_input(
        INPUT_GET,
        "id",
        FILTER_VALIDATE_INT
    );

    /*
     * GET
     *
     * Sem ID: lista todos os fornecedores.
     * Com ID: busca um fornecedor específico.
     */
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        if (isset($_GET["id"])) {
            if (
                $idFornecedor === false ||
                $idFornecedor === null
            ) {
                http_response_code(400);

                echo json_encode(
                    [
                        "sucesso" => false,
                        "mensagem" => "ID do fornecedor inválido."
                    ],
                    JSON_UNESCAPED_UNICODE
                );

                exit;
            }

            $controller->buscar($idFornecedor);
            exit;
        }

        $controller->listar();
        exit;
    }

    /*
     * POST
     *
     * Cadastra um novo fornecedor.
     */
    if ($_SERVER["REQUEST_METHOD"] === "POST") {
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
                    "mensagem" => "Os dados enviados são inválidos."
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
     * Atualiza os dados de um fornecedor.
     */
    if ($_SERVER["REQUEST_METHOD"] === "PUT") {
        if (
            $idFornecedor === false ||
            $idFornecedor === null
        ) {
            http_response_code(400);

            echo json_encode(
                [
                    "sucesso" => false,
                    "mensagem" => "Informe o ID do fornecedor."
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
                    "mensagem" => "Os dados enviados são inválidos."
                ],
                JSON_UNESCAPED_UNICODE
            );

            exit;
        }

        $controller->atualizar(
            $idFornecedor,
            $dados
        );

        exit;
    }

    /*
     * PATCH
     *
     * Inativa ou reativa um fornecedor.
     */
    if ($_SERVER["REQUEST_METHOD"] === "PATCH") {
        if (
            $idFornecedor === false ||
            $idFornecedor === null
        ) {
            http_response_code(400);

            echo json_encode(
                [
                    "sucesso" => false,
                    "mensagem" => "Informe o ID do fornecedor."
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
                    "mensagem" => "Os dados enviados são inválidos."
                ],
                JSON_UNESCAPED_UNICODE
            );

            exit;
        }

        $controller->alterarSituacao(
            $idFornecedor,
            $dados
        );

        exit;
    }

    http_response_code(405);

    echo json_encode(
        [
            "sucesso" => false,
            "mensagem" => "Método não permitido."
        ],
        JSON_UNESCAPED_UNICODE
    );
} catch (PDOException $erro) {
    if ((string) $erro->getCode() === "23000") {
        http_response_code(409);

        echo json_encode(
            [
                "sucesso" => false,
                "mensagem" =>
                    "Já existe um fornecedor com esse CPF ou CNPJ."
            ],
            JSON_UNESCAPED_UNICODE
        );

        exit;
    }

    http_response_code(500);

    echo json_encode(
        [
            "sucesso" => false,
            "mensagem" => "Erro ao acessar o banco de dados."
        ],
        JSON_UNESCAPED_UNICODE
    );
} catch (Throwable $erro) {
    http_response_code(500);

    echo json_encode(
        [
            "sucesso" => false,
            "mensagem" => "Erro interno da API."
        ],
        JSON_UNESCAPED_UNICODE
    );
}