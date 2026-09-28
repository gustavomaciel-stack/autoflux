<?php

declare(strict_types=1);

require_once __DIR__ . "/../models/Fornecedor.php";

final class FornecedorController
{
    private Fornecedor $fornecedorModel;

    public function __construct(PDO $conexao)
    {
        $this->fornecedorModel = new Fornecedor($conexao);
    }

    public function listar(): void
    {
        $fornecedores = $this->fornecedorModel->listarTodos();

        echo json_encode(
            [
                "sucesso" => true,
                "dados" => $fornecedores
            ],
            JSON_UNESCAPED_UNICODE
        );
    }

    public function buscar(int $idFornecedor): void
    {
        $fornecedor = $this->fornecedorModel->buscarPorId(
            $idFornecedor
        );

        if ($fornecedor === false) {
            $this->responderNaoEncontrado();
            return;
        }

        echo json_encode(
            [
                "sucesso" => true,
                "dados" => $fornecedor
            ],
            JSON_UNESCAPED_UNICODE
        );
    }

    public function cadastrar(array $dados): void
    {
        $dadosFornecedor = $this->validarENormalizar($dados);

        if ($dadosFornecedor === null) {
            return;
        }

        $idFornecedor = $this->fornecedorModel->cadastrar(
            $dadosFornecedor
        );

        http_response_code(201);

        echo json_encode(
            [
                "sucesso" => true,
                "mensagem" => "Fornecedor cadastrado com sucesso.",
                "id_fornecedor" => $idFornecedor
            ],
            JSON_UNESCAPED_UNICODE
        );
    }

    public function atualizar(
        int $idFornecedor,
        array $dados
    ): void {
        $fornecedor = $this->fornecedorModel->buscarPorId(
            $idFornecedor
        );

        if ($fornecedor === false) {
            $this->responderNaoEncontrado();
            return;
        }

        $dadosFornecedor = $this->validarENormalizar($dados);

        if ($dadosFornecedor === null) {
            return;
        }

        $this->fornecedorModel->atualizar(
            $idFornecedor,
            $dadosFornecedor
        );

        echo json_encode(
            [
                "sucesso" => true,
                "mensagem" => "Fornecedor atualizado com sucesso."
            ],
            JSON_UNESCAPED_UNICODE
        );
    }

    public function alterarSituacao(
        int $idFornecedor,
        array $dados
    ): void {
        $fornecedor = $this->fornecedorModel->buscarPorId(
            $idFornecedor
        );

        if ($fornecedor === false) {
            $this->responderNaoEncontrado();
            return;
        }

        if (
            !array_key_exists("ativo", $dados) ||
            !is_bool($dados["ativo"])
        ) {
            $this->responderErro(
                "Informe corretamente a situação do fornecedor."
            );
            return;
        }

        $this->fornecedorModel->alterarSituacao(
            $idFornecedor,
            $dados["ativo"]
        );

        $mensagem = $dados["ativo"]
            ? "Fornecedor reativado com sucesso."
            : "Fornecedor inativado com sucesso.";

        echo json_encode(
            [
                "sucesso" => true,
                "mensagem" => $mensagem
            ],
            JSON_UNESCAPED_UNICODE
        );
    }

    private function validarENormalizar(array $dados): ?array
    {
        $tipoPessoa = strtoupper(
            trim((string) ($dados["tipo_pessoa"] ?? ""))
        );

        $razaoSocial = trim(
            (string) ($dados["razao_social_nome"] ?? "")
        );

        $telefone = trim(
            (string) ($dados["telefone"] ?? "")
        );

        $tipoServico = trim(
            (string) ($dados["tipo_servico"] ?? "")
        );

        if (!in_array($tipoPessoa, ["PF", "PJ"], true)) {
            $this->responderErro(
                "O tipo de pessoa deve ser PF ou PJ."
            );
            return null;
        }

        if (
            $razaoSocial === "" ||
            $telefone === "" ||
            $tipoServico === ""
        ) {
            $this->responderErro(
                "Nome/razão social, telefone e tipo de serviço são obrigatórios."
            );
            return null;
        }

        $cpf = (string) preg_replace(
            "/\D/",
            "",
            (string) ($dados["cpf"] ?? "")
        );

        $cnpj = (string) preg_replace(
            "/\D/",
            "",
            (string) ($dados["cnpj"] ?? "")
        );

        if ($tipoPessoa === "PF" && strlen($cpf) !== 11) {
            $this->responderErro(
                "Informe um CPF com 11 números."
            );
            return null;
        }

        if ($tipoPessoa === "PJ" && strlen($cnpj) !== 14) {
            $this->responderErro(
                "Informe um CNPJ com 14 números."
            );
            return null;
        }

        $estado = strtoupper(
            trim((string) ($dados["estado"] ?? ""))
        );

        if ($estado !== "" && strlen($estado) !== 2) {
            $this->responderErro(
                "O estado deve conter a sigla com 2 letras."
            );
            return null;
        }

        return [
            "tipo_pessoa" => $tipoPessoa,
            "razao_social_nome" => $razaoSocial,

            "nome_fantasia" => $tipoPessoa === "PJ"
                ? $this->campoOpcional(
                    $dados["nome_fantasia"] ?? null
                )
                : null,

            "cpf" => $tipoPessoa === "PF" ? $cpf : null,
            "cnpj" => $tipoPessoa === "PJ" ? $cnpj : null,

            "telefone" => $telefone,

            "email" => $this->campoOpcional(
                $dados["email"] ?? null
            ),

            "cep" => $this->campoOpcional(
                $dados["cep"] ?? null
            ),

            "logradouro" => $this->campoOpcional(
                $dados["logradouro"] ?? null
            ),

            "numero" => $this->campoOpcional(
                $dados["numero"] ?? null
            ),

            "complemento" => $this->campoOpcional(
                $dados["complemento"] ?? null
            ),

            "bairro" => $this->campoOpcional(
                $dados["bairro"] ?? null
            ),

            "cidade" => $this->campoOpcional(
                $dados["cidade"] ?? null
            ),

            "estado" => $estado !== "" ? $estado : null,

            "tipo_servico" => $tipoServico,

            "observacoes" => $this->campoOpcional(
                $dados["observacoes"] ?? null
            )
        ];
    }

    private function campoOpcional(mixed $valor): ?string
    {
        $valorLimpo = trim(
            (string) ($valor ?? "")
        );

        return $valorLimpo !== ""
            ? $valorLimpo
            : null;
    }

    private function responderErro(string $mensagem): void
    {
        http_response_code(422);

        echo json_encode(
            [
                "sucesso" => false,
                "mensagem" => $mensagem
            ],
            JSON_UNESCAPED_UNICODE
        );
    }

    private function responderNaoEncontrado(): void
    {
        http_response_code(404);

        echo json_encode(
            [
                "sucesso" => false,
                "mensagem" => "Fornecedor não encontrado."
            ],
            JSON_UNESCAPED_UNICODE
        );
    }
}