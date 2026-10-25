<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/Auth.php';
try {
    Auth::proteger();
    $permissoesRota = ['GET'=>'despesas.visualizar', 'POST'=>'despesas.cadastrar', 'PUT'=>'despesas.editar', 'DELETE'=>'despesas.cancelar'];
    $metodoPermissao = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!isset($permissoesRota[$metodoPermissao])) Auth::responder(405, ['sucesso'=>false,'mensagem'=>'Método não permitido.']);
    Auth::exigir($permissoesRota[$metodoPermissao]);
    Auth::exigir("custos.visualizar");

} catch (Throwable $erro) {
    Auth::responder(500, ['sucesso' => false, 'mensagem' => 'Não foi possível validar a sessão.']);
}


header(
    "Content-Type: application/json; charset=UTF-8"
);

header(
    "Access-Control-Allow-Origin: http://localhost:5173"
);

header(
    "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS"
);

header(
    "Access-Control-Allow-Headers: Content-Type, X-CSRF-Token"
);

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__
    . "/../config/Database.php";

require_once __DIR__
    . "/../models/DespesaVeiculo.php";

require_once __DIR__
    . "/../controllers/DespesaVeiculoController.php";

function responderRota(
    int $status,
    string $mensagem
): void {
    http_response_code($status);

    echo json_encode(
        [
            "sucesso" => false,
            "mensagem" => $mensagem,
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );

    exit;
}

function lerDadosJson(): array
{
    $conteudo =
        file_get_contents("php://input");

    $dados = json_decode(
        $conteudo,
        true
    );

    if (!is_array($dados)) {
        responderRota(
            400,
            "Os dados enviados são inválidos."
        );
    }

    return $dados;
}

try {
    $conexao = Database::conectar();

    $controller =
        new DespesaVeiculoController(
            $conexao
        );

    $metodo =
        $_SERVER["REQUEST_METHOD"];

    $idCiclo = filter_input(
        INPUT_GET,
        "id_ciclo",
        FILTER_VALIDATE_INT
    );

    if (
        $idCiclo === false
        || $idCiclo === null
        || $idCiclo <= 0
    ) {
        responderRota(
            400,
            "Informe um ciclo válido."
        );
    }

    if ($metodo === "GET") {
        $controller->consultar($idCiclo);
        exit;
    }

    $tipo = trim(
        strtolower(
            (string) (
                $_GET["tipo"] ?? ""
            )
        )
    );

    if (
        $tipo !== "prevista"
        && $tipo !== "realizada"
    ) {
        responderRota(
            400,
            "Informe o tipo da despesa: prevista ou realizada."
        );
    }

    if ($metodo === "POST") {
        $dados = lerDadosJson();

        if ($tipo === "prevista") {
            $controller->cadastrarPrevista(
                $idCiclo,
                $dados
            );

            exit;
        }

        $controller->cadastrarRealizada(
            $idCiclo,
            $dados
        );

        exit;
    }

    if (
        $metodo === "PUT"
        || $metodo === "DELETE"
    ) {
        $idDespesa = filter_input(
            INPUT_GET,
            "id",
            FILTER_VALIDATE_INT
        );

        if (
            $idDespesa === false
            || $idDespesa === null
            || $idDespesa <= 0
        ) {
            responderRota(
                400,
                "Informe uma despesa válida."
            );
        }

        if ($metodo === "DELETE") {
            if ($tipo === "prevista") {
                $controller->excluirPrevista(
                    $idCiclo,
                    $idDespesa
                );

                exit;
            }

            $controller->excluirRealizada(
                $idCiclo,
                $idDespesa
            );

            exit;
        }

        $dados = lerDadosJson();

        if ($tipo === "prevista") {
            $controller->atualizarPrevista(
                $idCiclo,
                $idDespesa,
                $dados
            );

            exit;
        }

        $controller->atualizarRealizada(
            $idCiclo,
            $idDespesa,
            $dados
        );

        exit;
    }

    responderRota(
        405,
        "Método não permitido."
    );
} catch (PDOException $erro) {
    responderRota(
        500,
        "Erro ao acessar o banco de dados."
    );
} catch (Throwable $erro) {
    responderRota(
        500,
        "Erro interno da API."
    );
}