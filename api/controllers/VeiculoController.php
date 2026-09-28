<?php

declare(strict_types=1);

final class VeiculoController
{
    private Veiculo $veiculo;

    public function __construct(PDO $conexao)
    {
        $this->veiculo = new Veiculo($conexao);
    }

    public function listar(): void
    {
        try {
            $this->responder(200, [
                "sucesso" => true,
                "dados" => $this->veiculo->listarTodos(),
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível listar os veículos.",
            ]);
        }
    }

    public function buscarChassi(string $chassi): void
    {
        if (!preg_match('/^[A-Z0-9]{17}$/', $chassi)) {
            $this->responder(422, ["sucesso" => false, "mensagem" => "Chassi inválido."]);
            return;
        }
        try {
            $this->responder(200, [
                "sucesso" => true,
                "dados" => $this->veiculo->buscarPorChassi($chassi) ?: null,
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, ["sucesso" => false, "mensagem" => "Não foi possível consultar o chassi."]);
        }
    }

    public function buscar(int $idVeiculo): void
    {
        if ($idVeiculo <= 0) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    "O veículo informado é inválido.",
            ]);

            return;
        }

        try {
            $veiculo =
                $this->veiculo->buscarPorId($idVeiculo);

            if ($veiculo === false) {
                $this->responder(404, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Veículo não encontrado.",
                ]);

                return;
            }

            $this->responder(200, [
                "sucesso" => true,
                "dados" => $veiculo,
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível consultar o veículo.",
            ]);
        }
    }

    public function cadastrar(array $dados): void
    {
        try {
            $dadosPreparados =
                $this->prepararDados($dados, true);

            $idVeiculo =
                $this->veiculo->cadastrar($dadosPreparados);

            $this->responder(201, [
                "sucesso" => true,
                "mensagem" =>
                    "Entrada do veículo cadastrada com sucesso.",
                "dados" =>
                    $this->veiculo->buscarPorId($idVeiculo),
            ]);
        } catch (InvalidArgumentException $erro) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" => $erro->getMessage(),
            ]);
        } catch (PDOException $erro) {
            if ($this->registroDuplicado($erro)) {
                $this->responder(409, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Já existe um registro com a placa, chassi, nota fiscal ou chave de acesso informada.",
                ]);

                return;
            }

            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível cadastrar a entrada do veículo.",
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível cadastrar a entrada do veículo.",
            ]);
        }
    }

    public function atualizar(
        int $idVeiculo,
        array $dados
    ): void {
        if ($idVeiculo <= 0) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    "O veículo informado é inválido.",
            ]);

            return;
        }

        try {
            $veiculoAtual =
                $this->veiculo->buscarPorId($idVeiculo);

            if ($veiculoAtual === false) {
                $this->responder(404, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Veículo não encontrado.",
                ]);

                return;
            }

            $possuiAquisicao =
                $veiculoAtual["id_aquisicao"] !== null;

            $dadosPreparados =
                $this->prepararDados(
                    $dados,
                    false,
                    $possuiAquisicao
                );

            $this->veiculo->atualizar(
                $idVeiculo,
                $dadosPreparados
            );

            $this->responder(200, [
                "sucesso" => true,
                "mensagem" =>
                    "Veículo atualizado com sucesso.",
                "dados" =>
                    $this->veiculo->buscarPorId($idVeiculo),
            ]);
        } catch (InvalidArgumentException $erro) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" => $erro->getMessage(),
            ]);
        } catch (PDOException $erro) {
            if ($this->registroDuplicado($erro)) {
                $this->responder(409, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Já existe outro veículo com esta placa ou chassi.",
                ]);

                return;
            }

            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível atualizar o veículo.",
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível atualizar o veículo.",
            ]);
        }
    }

    private function prepararDados(
        array $dados,
        bool $incluirNotaFiscal,
        bool $exigirDadosAquisicao = true
    ): array {
        $marca = $this->textoObrigatorio(
            $dados,
            "marca",
            "Informe a marca do veículo."
        );

        $modelo = $this->textoObrigatorio(
            $dados,
            "modelo",
            "Informe o modelo do veículo."
        );

        $combustivel = $this->textoObrigatorio(
            $dados,
            "combustivel",
            "Informe o combustível do veículo."
        );

        $cor = $this->textoObrigatorio(
            $dados,
            "cor",
            "Informe a cor do veículo."
        );

        $placa = strtoupper(
            preg_replace(
                "/[^A-Za-z0-9]/",
                "",
                $this->textoObrigatorio(
                    $dados,
                    "placa",
                    "Informe a placa do veículo."
                )
            )
        );

        if (strlen($placa) !== 7) {
            throw new InvalidArgumentException(
                "A placa deve possuir 7 caracteres."
            );
        }

        $chassi = strtoupper(
            preg_replace(
                "/[^A-Za-z0-9]/",
                "",
                $this->textoObrigatorio(
                    $dados,
                    "chassi",
                    "Informe o chassi do veículo."
                )
            )
        );

        if (strlen($chassi) !== 17) {
            throw new InvalidArgumentException(
                "O chassi deve possuir 17 caracteres."
            );
        }

        $renavam =
            $this->textoOpcional($dados, "renavam");

        if ($renavam !== null) {
            $renavam =
                preg_replace("/\D/", "", $renavam);

            if (strlen($renavam) !== 11) {
                throw new InvalidArgumentException(
                    "O RENAVAM deve possuir 11 números."
                );
            }
        }

        $anoFabricacao = $this->validarAno(
            $dados["ano_fabricacao"] ?? null,
            "ano de fabricação"
        );

        $anoModelo = $this->validarAno(
            $dados["ano_modelo"] ?? null,
            "ano do modelo"
        );

        $valorCompra = null;
        $dataCompra = null;
        $origem = null;

        if ($exigirDadosAquisicao) {
            $valorCompra = $this->validarValor(
                $dados["valor_compra"] ?? null
            );

            $dataCompra = trim(
                (string) ($dados["data_compra"] ?? "")
            );

            if (!$this->dataValida($dataCompra)) {
                throw new InvalidArgumentException(
                    "Informe uma data de aquisição válida."
                );
            }

            $origem = $this->textoObrigatorio(
                $dados,
                "origem",
                "Informe a origem da aquisição."
            );
        }

        $quilometragem = $this->inteiroNaoNegativo(
            $dados["quilometragem"] ?? null,
            "A quilometragem não pode ser negativa."
        );

        $horimetro = $this->inteiroNaoNegativo(
            $dados["horimetro"] ?? null,
            "O horímetro não pode ser negativo."
        );

        $dadosPreparados = [
            "marca" => $marca,
            "modelo" => $modelo,
            "versao" =>
                $this->textoOpcional($dados, "versao"),
            "ano_fabricacao" => $anoFabricacao,
            "ano_modelo" => $anoModelo,
            "combustivel" => $combustivel,
            "placa" => $placa,
            "chassi" => $chassi,
            "observacoes" =>
                $this->textoOpcional(
                    $dados,
                    "observacoes"
                ),
            "renavam" => $renavam,
            "cor" => $cor,
            "quilometragem" => $quilometragem,
            "horimetro" => $horimetro,
            "valor_compra" => $valorCompra,
            "data_compra" => $dataCompra,
            "origem" => $origem,
            "possui_aquisicao" =>
                $exigirDadosAquisicao,

            // Temporário no MVP1 enquanto não há login.
            "id_usuario_responsavel" => 1,
        ];

        if (!$incluirNotaFiscal) {
            return $dadosPreparados;
        }

        return array_merge(
            $dadosPreparados,
            $this->prepararNotaFiscal($dados)
        );
    }

    private function prepararNotaFiscal(
        array $dados
    ): array {
        $idFornecedor =
            $dados["id_fornecedor_origem"] ?? null;

        $nomeAvulso = $this->textoOpcional(
            $dados,
            "nome_fornecedor_avulso"
        );

        if (
            $idFornecedor === ""
            || $idFornecedor === 0
            || $idFornecedor === "0"
        ) {
            $idFornecedor = null;
        }

        if ($idFornecedor !== null) {
            if (
                filter_var(
                    $idFornecedor,
                    FILTER_VALIDATE_INT
                ) === false
                || (int) $idFornecedor <= 0
            ) {
                throw new InvalidArgumentException(
                    "O fornecedor selecionado é inválido."
                );
            }

            $idFornecedor = (int) $idFornecedor;
        }

        if (
            $idFornecedor === null
            && $nomeAvulso === null
        ) {
            throw new InvalidArgumentException(
                "Selecione um fornecedor cadastrado ou informe o nome do particular."
            );
        }

        if (
            $idFornecedor !== null
            && $nomeAvulso !== null
        ) {
            throw new InvalidArgumentException(
                "Informe somente uma origem: fornecedor cadastrado ou particular."
            );
        }

        if (
            $nomeAvulso !== null
            && mb_strlen($nomeAvulso) > 150
        ) {
            throw new InvalidArgumentException(
                "O nome do particular deve possuir no máximo 150 caracteres."
            );
        }

        $numeroNota = $this->textoObrigatorio(
            $dados,
            "numero_nota",
            "Informe o número da nota fiscal."
        );

        if (mb_strlen($numeroNota) > 20) {
            throw new InvalidArgumentException(
                "O número da nota fiscal deve possuir no máximo 20 caracteres."
            );
        }

        $serie = $this->textoObrigatorio(
            $dados,
            "serie",
            "Informe a série da nota fiscal."
        );

        if (mb_strlen($serie) > 10) {
            throw new InvalidArgumentException(
                "A série da nota fiscal deve possuir no máximo 10 caracteres."
            );
        }

        $dataEmissao = trim(
            (string) ($dados["data_emissao_nf"] ?? "")
        );

        if (!$this->dataValida($dataEmissao)) {
            throw new InvalidArgumentException(
                "Informe uma data de emissão válida."
            );
        }

        $descricaoItem = $this->textoObrigatorio(
            $dados,
            "descricao_item_nf",
            "Informe a descrição do item da nota fiscal."
        );

        if (mb_strlen($descricaoItem) > 255) {
            throw new InvalidArgumentException(
                "A descrição do item deve possuir no máximo 255 caracteres."
            );
        }

        $chaveAcesso = $this->textoOpcional(
            $dados,
            "chave_acesso"
        );

        if ($chaveAcesso !== null) {
            $chaveAcesso =
                preg_replace("/\D/", "", $chaveAcesso);

            if (strlen($chaveAcesso) !== 44) {
                throw new InvalidArgumentException(
                    "A chave de acesso deve possuir 44 números."
                );
            }
        }

        $naturezaOperacao = $this->textoOpcional(
            $dados,
            "natureza_operacao"
        );

        if (
            $naturezaOperacao !== null
            && mb_strlen($naturezaOperacao) > 100
        ) {
            throw new InvalidArgumentException(
                "A natureza da operação deve possuir no máximo 100 caracteres."
            );
        }

        return [
            "id_fornecedor_origem" => $idFornecedor,
            "nome_fornecedor_avulso" => $nomeAvulso,
            "numero_nota" => $numeroNota,
            "serie" => $serie,
            "chave_acesso" => $chaveAcesso,
            "data_emissao_nf" => $dataEmissao,
            "descricao_item_nf" => $descricaoItem,
            "natureza_operacao" => $naturezaOperacao,
            "observacoes_nf" =>
                $this->textoOpcional(
                    $dados,
                    "observacoes_nf"
                ),
        ];
    }

    private function textoObrigatorio(
        array $dados,
        string $campo,
        string $mensagem
    ): string {
        $valor = trim(
            (string) ($dados[$campo] ?? "")
        );

        if ($valor === "") {
            throw new InvalidArgumentException(
                $mensagem
            );
        }

        return $valor;
    }

    private function textoOpcional(
        array $dados,
        string $campo
    ): ?string {
        $valor = trim(
            (string) ($dados[$campo] ?? "")
        );

        return $valor === "" ? null : $valor;
    }

    private function validarAno(
        mixed $valor,
        string $campo
    ): int {
        if (
            filter_var(
                $valor,
                FILTER_VALIDATE_INT
            ) === false
        ) {
            throw new InvalidArgumentException(
                "Informe um {$campo} válido."
            );
        }

        $ano = (int) $valor;
        $anoMaximo = (int) date("Y") + 1;

        if ($ano < 1900 || $ano > $anoMaximo) {
            throw new InvalidArgumentException(
                "Informe um {$campo} entre 1900 e {$anoMaximo}."
            );
        }

        return $ano;
    }

    private function validarValor(mixed $valor): float
    {
        if (is_string($valor)) {
            $valor = str_replace(
                ",",
                ".",
                trim($valor)
            );
        }

        if (
            !is_numeric($valor)
            || (float) $valor <= 0
        ) {
            throw new InvalidArgumentException(
                "Informe um valor de aquisição válido."
            );
        }

        return round((float) $valor, 2);
    }

    private function inteiroNaoNegativo(
        mixed $valor,
        string $mensagem
    ): ?int {
        if ($valor === null || $valor === "") {
            return null;
        }

        if (
            filter_var(
                $valor,
                FILTER_VALIDATE_INT
            ) === false
            || (int) $valor < 0
        ) {
            throw new InvalidArgumentException(
                $mensagem
            );
        }

        return (int) $valor;
    }

    private function dataValida(string $data): bool
    {
        $objetoData =
            DateTime::createFromFormat(
                "Y-m-d",
                $data
            );

        return $objetoData !== false
            && $objetoData->format("Y-m-d") === $data;
    }

    private function registroDuplicado(
        PDOException $erro
    ): bool {
        return $erro->getCode() === "23000"
            || (int) ($erro->errorInfo[1] ?? 0)
                === 1062;
    }

    private function responder(
        int $status,
        array $conteudo
    ): void {
        http_response_code($status);

        echo json_encode(
            $conteudo,
            JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
        );
    }
}
