<?php

declare(strict_types=1);

final class DespesaVeiculoController
{
    private DespesaVeiculo $despesa;

    private const CATEGORIAS = [
        "Mecânica",
        "Funilaria",
        "Pintura",
        "Elétrica",
        "Higienização",
        "Documentação",
        "Transporte",
        "Pneus",
        "Outros",
    ];

    public function __construct(PDO $conexao)
    {
        $this->despesa =
            new DespesaVeiculo($conexao);
    }

    public function consultar(
        int $idCiclo
    ): void {
        if ($idCiclo <= 0) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    "O ciclo informado é inválido.",
            ]);

            return;
        }

        try {
            $dados =
                $this->despesa
                    ->consultarPorCiclo(
                        $idCiclo
                    );

            if ($dados === false) {
                $this->responder(404, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Ciclo ou aquisição não encontrado.",
                ]);

                return;
            }

            $this->responder(200, [
                "sucesso" => true,
                "dados" => $dados,
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível consultar os custos do veículo.",
            ]);
        }
    }

    public function cadastrarPrevista(
        int $idCiclo,
        array $dados
    ): void {
        try {
            $dadosPreparados =
                $this->prepararDadosBase(
                    $dados
                );

            /*
             * Temporário no MVP1.
             * Depois será obtido do usuário autenticado.
             */
            $idUsuarioResponsavel = 1;

            $idDespesaPrevista =
                $this->despesa
                    ->cadastrarPrevista(
                        $idCiclo,
                        $idUsuarioResponsavel,
                        $dadosPreparados
                    );

            $this->responder(201, [
                "sucesso" => true,
                "mensagem" =>
                    "Despesa prevista cadastrada com sucesso.",
                "id_despesa_prevista" =>
                    $idDespesaPrevista,
                "dados" =>
                    $this->despesa
                        ->consultarPorCiclo(
                            $idCiclo
                        ),
            ]);
        } catch (InvalidArgumentException $erro) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    $erro->getMessage(),
            ]);
        } catch (PDOException $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível cadastrar a despesa prevista.",
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível cadastrar a despesa prevista.",
            ]);
        }
    }

    public function atualizarPrevista(
        int $idCiclo,
        int $idDespesaPrevista,
        array $dados
    ): void {
        try {
            if ($idDespesaPrevista <= 0) {
                throw new InvalidArgumentException(
                    "A despesa prevista informada é inválida."
                );
            }

            $dadosPreparados =
                $this->prepararDadosBase(
                    $dados
                );

            $idUsuarioResponsavel = 1;

            $atualizou =
                $this->despesa
                    ->atualizarPrevista(
                        $idCiclo,
                        $idDespesaPrevista,
                        $idUsuarioResponsavel,
                        $dadosPreparados
                    );

            if (!$atualizou) {
                $this->responder(404, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Despesa prevista pendente não encontrada.",
                ]);

                return;
            }

            $this->responder(200, [
                "sucesso" => true,
                "mensagem" =>
                    "Despesa prevista atualizada com sucesso.",
                "dados" =>
                    $this->despesa
                        ->consultarPorCiclo(
                            $idCiclo
                        ),
            ]);
        } catch (InvalidArgumentException $erro) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    $erro->getMessage(),
            ]);
        } catch (PDOException $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível atualizar a despesa prevista.",
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível atualizar a despesa prevista.",
            ]);
        }
    }

    public function cadastrarRealizada(
        int $idCiclo,
        array $dados
    ): void {
        try {
            $dadosPreparados =
                $this->prepararDadosRealizada(
                    $dados
                );

            $idDespesaPrevista =
                $this->validarIdOpcional(
                    $dados[
                        "id_despesa_prevista"
                    ] ?? null,
                    "A despesa prevista selecionada é inválida."
                );

            $idUsuarioResponsavel = 1;

            $idDespesa =
                $this->despesa
                    ->cadastrarRealizada(
                        $idCiclo,
                        $idUsuarioResponsavel,
                        $dadosPreparados,
                        $idDespesaPrevista
                    );

            $this->responder(201, [
                "sucesso" => true,
                "mensagem" =>
                    "Despesa realizada cadastrada com sucesso.",
                "id_despesa" => $idDespesa,
                "dados" =>
                    $this->despesa
                        ->consultarPorCiclo(
                            $idCiclo
                        ),
            ]);
        } catch (InvalidArgumentException $erro) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    $erro->getMessage(),
            ]);
        } catch (PDOException $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível cadastrar a despesa realizada.",
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível cadastrar a despesa realizada.",
            ]);
        }
    }

    public function atualizarRealizada(
        int $idCiclo,
        int $idDespesa,
        array $dados
    ): void {
        try {
            if ($idDespesa <= 0) {
                throw new InvalidArgumentException(
                    "A despesa realizada informada é inválida."
                );
            }

            $dadosPreparados =
                $this->prepararDadosRealizada(
                    $dados
                );

            $idUsuarioResponsavel = 1;

            $atualizou =
                $this->despesa
                    ->atualizarRealizada(
                        $idCiclo,
                        $idDespesa,
                        $idUsuarioResponsavel,
                        $dadosPreparados
                    );

            if (!$atualizou) {
                $this->responder(404, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Despesa realizada não encontrada.",
                ]);

                return;
            }

            $this->responder(200, [
                "sucesso" => true,
                "mensagem" =>
                    "Despesa realizada atualizada com sucesso.",
                "dados" =>
                    $this->despesa
                        ->consultarPorCiclo(
                            $idCiclo
                        ),
            ]);
        } catch (InvalidArgumentException $erro) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    $erro->getMessage(),
            ]);
        } catch (PDOException $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível atualizar a despesa realizada.",
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível atualizar a despesa realizada.",
            ]);
        }
    }

    public function excluirPrevista(
        int $idCiclo,
        int $idDespesaPrevista
    ): void {
        try {
            if ($idDespesaPrevista <= 0) {
                throw new InvalidArgumentException(
                    "A despesa prevista informada é inválida."
                );
            }

            $excluiu =
                $this->despesa
                    ->excluirPrevista(
                        $idCiclo,
                        $idDespesaPrevista
                    );

            if (!$excluiu) {
                $this->responder(404, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Despesa prevista pendente não encontrada.",
                ]);

                return;
            }

            $this->responder(200, [
                "sucesso" => true,
                "mensagem" =>
                    "Despesa prevista excluída com sucesso.",
                "dados" =>
                    $this->despesa
                        ->consultarPorCiclo(
                            $idCiclo
                        ),
            ]);
        } catch (InvalidArgumentException $erro) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    $erro->getMessage(),
            ]);
        } catch (PDOException $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível excluir a despesa prevista.",
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível excluir a despesa prevista.",
            ]);
        }
    }

    public function excluirRealizada(
        int $idCiclo,
        int $idDespesa
    ): void {
        try {
            if ($idDespesa <= 0) {
                throw new InvalidArgumentException(
                    "A despesa realizada informada é inválida."
                );
            }

            $excluiu =
                $this->despesa
                    ->excluirRealizada(
                        $idCiclo,
                        $idDespesa
                    );

            if (!$excluiu) {
                $this->responder(404, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Despesa realizada não encontrada.",
                ]);

                return;
            }

            $this->responder(200, [
                "sucesso" => true,
                "mensagem" =>
                    "Despesa realizada excluída com sucesso.",
                "dados" =>
                    $this->despesa
                        ->consultarPorCiclo(
                            $idCiclo
                        ),
            ]);
        } catch (InvalidArgumentException $erro) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    $erro->getMessage(),
            ]);
        } catch (PDOException $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível excluir a despesa realizada.",
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível excluir a despesa realizada.",
            ]);
        }
    }

    private function prepararDadosBase(
        array $dados
    ): array {
        $categoria = trim(
            (string) (
                $dados["categoria"] ?? ""
            )
        );

        if ($categoria === "") {
            throw new InvalidArgumentException(
                "Informe a categoria da despesa."
            );
        }

        if (
            !in_array(
                $categoria,
                self::CATEGORIAS,
                true
            )
        ) {
            throw new InvalidArgumentException(
                "A categoria informada não é permitida."
            );
        }

        $descricao = trim(
            (string) (
                $dados["descricao"] ?? ""
            )
        );

        if ($descricao === "") {
            throw new InvalidArgumentException(
                "Informe a descrição da despesa."
            );
        }

        if (mb_strlen($descricao) > 255) {
            throw new InvalidArgumentException(
                "A descrição deve possuir no máximo 255 caracteres."
            );
        }

        $valor = $dados["valor"] ?? null;

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
                "Informe um valor de despesa válido."
            );
        }

        $observacoes = trim(
            (string) (
                $dados["observacoes"] ?? ""
            )
        );

        if ($observacoes === "") {
            $observacoes = null;
        }

        return [
            "categoria" => $categoria,
            "descricao" => $descricao,
            "valor" =>
                round((float) $valor, 2),
            "observacoes" => $observacoes,
        ];
    }

    private function prepararDadosRealizada(
        array $dados
    ): array {
        $dadosPreparados =
            $this->prepararDadosBase($dados);

        $idFornecedor =
            $dados["id_fornecedor"] ?? null;

        if (
            filter_var(
                $idFornecedor,
                FILTER_VALIDATE_INT
            ) === false
            || (int) $idFornecedor <= 0
        ) {
            throw new InvalidArgumentException(
                "Selecione um fornecedor válido."
            );
        }

        $dataDespesa = trim(
            (string) (
                $dados["data_despesa"] ?? ""
            )
        );

        if (!$this->dataValida($dataDespesa)) {
            throw new InvalidArgumentException(
                "Informe uma data de despesa válida."
            );
        }

        $dadosPreparados["id_fornecedor"] =
            (int) $idFornecedor;

        $dadosPreparados["data_despesa"] =
            $dataDespesa;

        return $dadosPreparados;
    }

    private function validarIdOpcional(
        mixed $valor,
        string $mensagem
    ): ?int {
        if (
            $valor === null
            || $valor === ""
        ) {
            return null;
        }

        if (
            filter_var(
                $valor,
                FILTER_VALIDATE_INT
            ) === false
            || (int) $valor <= 0
        ) {
            throw new InvalidArgumentException(
                $mensagem
            );
        }

        return (int) $valor;
    }

    private function dataValida(
        string $data
    ): bool {
        $objetoData =
            DateTime::createFromFormat(
                "Y-m-d",
                $data
            );

        return
            $objetoData !== false
            && $objetoData->format(
                "Y-m-d"
            ) === $data;
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