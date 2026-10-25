<?php

declare(strict_types=1);

final class DespesaVeiculo
{
    private PDO $conexao;

    public function __construct(PDO $conexao)
    {
        $this->conexao = $conexao;
        $this->conexao->exec("SET time_zone = '-03:00'");
    }

    public function consultarPorCiclo(
        int $idCiclo
    ): array|false {
        $resumo = $this->buscarResumo($idCiclo);

        if ($resumo === false) {
            return false;
        }

        $resumo["despesas_realizadas"] =
            $this->listarRealizadas($idCiclo);

        $resumo["despesas_previstas"] =
            $this->listarPrevistas($idCiclo);

        return $resumo;
    }

    public function cadastrarPrevista(int $idCiclo, int $idUsuarioResponsavel, array $dados): int {
        $this->conexao->beginTransaction();
        try {
            $this->bloquearPlanejamento($idCiclo);
            $id = $this->cadastrarPrevistaInterna($idCiclo, $idUsuarioResponsavel, $dados);
            $this->conexao->commit(); return $id;
        } catch (Throwable $e) { if ($this->conexao->inTransaction()) $this->conexao->rollBack(); throw $e; }
    }
    public function atualizarPrevista(int $idCiclo, int $idDespesaPrevista, int $idUsuarioResponsavel, array $dados): bool {
        $this->conexao->beginTransaction();
        try {
            $this->bloquearPlanejamento($idCiclo);
            $ok = $this->atualizarPrevistaInterna($idCiclo, $idDespesaPrevista, $idUsuarioResponsavel, $dados);
            $this->conexao->commit(); return $ok;
        } catch (Throwable $e) { if ($this->conexao->inTransaction()) $this->conexao->rollBack(); throw $e; }
    }
    private function bloquearPlanejamento(int $ciclo): void {
        $q=$this->conexao->prepare('SELECT id_ciclo FROM ciclos_veiculo WHERE id_ciclo=? FOR UPDATE');$q->execute([$ciclo]);
        // O bloqueio do ciclo impede que a classificação mude no meio da criação.
        // Marcação é explícita; novas previsões têm padrão 0 e não alteram propostas existentes.
    }

    private function cadastrarPrevistaInterna(
        int $idCiclo,
        int $idUsuarioResponsavel,
        array $dados
    ): int {
        $this->validarCiclo($idCiclo);
            $responsavelDespesa = $this->prepararResponsavelDespesa($idCiclo, $dados);

        $idAquisicao =
            $this->buscarIdAquisicao($idCiclo);

        $sql = "
            INSERT INTO despesas_previstas (
                id_aquisicao,
                id_ciclo,
                id_avaliacao,
                id_despesa_realizada,
                id_usuario_responsavel,
                responsavel_despesa,
                integra_base_comercial,
                data_inclusao_planejamento,
                categoria,
                descricao,
                valor_previsto,
                situacao,
                observacoes
            ) VALUES (
                :id_aquisicao,
                :id_ciclo,
                NULL,
                NULL,
                :id_usuario_responsavel,
                :responsavel_despesa,
                :integra_base_comercial,
                IF(:planejamento_data = 1, CURRENT_TIMESTAMP, NULL),
                :categoria,
                :descricao,
                :valor_previsto,
                'Pendente',
                :observacoes
            )
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_aquisicao" => $idAquisicao,
            "id_ciclo" => $idCiclo,
            "id_usuario_responsavel" =>
                $idUsuarioResponsavel,
            "responsavel_despesa" => $responsavelDespesa,
            "integra_base_comercial" => $dados["integra_base_comercial"],
            "planejamento_data" => $dados["integra_base_comercial"],
            "categoria" => $dados["categoria"],
            "descricao" => $dados["descricao"],
            "valor_previsto" => $dados["valor"],
            "observacoes" => $dados["observacoes"],
        ]);

        return (int) $this->conexao->lastInsertId();
    }

    private function atualizarPrevistaInterna(
        int $idCiclo,
        int $idDespesaPrevista,
        int $idUsuarioResponsavel,
        array $dados
    ): bool {
        $this->validarCiclo($idCiclo);
            $responsavelDespesa = $this->prepararResponsavelDespesa($idCiclo, $dados);

        $sql = "
            UPDATE despesas_previstas
            SET
                responsavel_despesa = :responsavel_despesa,
                data_inclusao_planejamento = CASE WHEN :planejamento_data = 0 THEN NULL ELSE COALESCE(data_inclusao_planejamento,CURRENT_TIMESTAMP) END,
                integra_base_comercial = :integra_base_comercial,
                categoria = :categoria,
                descricao = :descricao,
                valor_previsto = :valor_previsto,
                observacoes = :observacoes
            WHERE id_despesa_prevista =
                    :id_despesa_prevista
              AND id_ciclo = :id_ciclo
              AND situacao = 'Pendente'
              AND ativo = 1
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "responsavel_despesa" => $responsavelDespesa,
            "integra_base_comercial" => $dados["integra_base_comercial"],
            "planejamento_data" => $dados["integra_base_comercial"],
            "categoria" => $dados["categoria"],
            "descricao" => $dados["descricao"],
            "valor_previsto" => $dados["valor"],
            "observacoes" => $dados["observacoes"],
            "id_despesa_prevista" =>
                $idDespesaPrevista,
            "id_ciclo" => $idCiclo,
        ]);

        return $comando->rowCount() > 0;
    }

    public function cadastrarRealizada(
        int $idCiclo,
        int $idUsuarioResponsavel,
        array $dados,
        ?int $idDespesaPrevista
    ): int {
        $this->conexao->beginTransaction();

        try {
            $this->validarCiclo($idCiclo);
            $responsavelDespesa = $this->prepararResponsavelDespesa($idCiclo, $dados);

            $sql = "
                INSERT INTO despesas_veiculo (
                    id_ciclo,
                    id_fornecedor,
                    id_usuario_responsavel,
                    responsavel_despesa,
                    categoria,
                    descricao,
                    data_despesa,
                    valor,
                    observacoes
                ) VALUES (
                    :id_ciclo,
                    :id_fornecedor,
                    :id_usuario_responsavel,
                    :responsavel_despesa,
                    :categoria,
                    :descricao,
                    :data_despesa,
                    :valor,
                    :observacoes
                )
            ";

            $comando = $this->conexao->prepare($sql);

            $comando->execute([
                "id_ciclo" => $idCiclo,
                "id_fornecedor" =>
                    $dados["id_fornecedor"],
                "id_usuario_responsavel" =>
                    $idUsuarioResponsavel,
                "responsavel_despesa" => $responsavelDespesa,
            "categoria" => $dados["categoria"],
                "descricao" => $dados["descricao"],
                "data_despesa" =>
                    $dados["data_despesa"],
                "valor" => $dados["valor"],
                "observacoes" =>
                    $dados["observacoes"],
            ]);

            $idDespesa =
                (int) $this->conexao->lastInsertId();

            if ($idDespesaPrevista !== null) {
                $sqlPrevista = "
                    UPDATE despesas_previstas
                    SET
                        id_despesa_realizada =
                            :id_despesa_realizada,
                        situacao = 'Realizada'
                    WHERE id_despesa_prevista =
                            :id_despesa_prevista
                      AND id_ciclo = :id_ciclo
                      AND situacao = 'Pendente'
                      AND id_despesa_realizada IS NULL
                      AND ativo = 1
                ";

                $comandoPrevista =
                    $this->conexao->prepare(
                        $sqlPrevista
                    );

                $comandoPrevista->execute([
                    "id_despesa_realizada" =>
                        $idDespesa,
                    "id_despesa_prevista" =>
                        $idDespesaPrevista,
                    "id_ciclo" => $idCiclo,
                ]);

                if (
                    $comandoPrevista->rowCount()
                    !== 1
                ) {
                    throw new InvalidArgumentException(
                        "A despesa prevista selecionada não está pendente ou não pertence a este ciclo."
                    );
                }
            }

            $this->conexao->commit();

            return $idDespesa;
        } catch (Throwable $erro) {
            if ($this->conexao->inTransaction()) {
                $this->conexao->rollBack();
            }

            throw $erro;
        }
    }

    public function atualizarRealizada(
        int $idCiclo,
        int $idDespesa,
        int $idUsuarioResponsavel,
        array $dados
    ): bool {
        $this->validarCiclo($idCiclo);
            $responsavelDespesa = $this->prepararResponsavelDespesa($idCiclo, $dados);

        $sql = "
            UPDATE despesas_veiculo
            SET
                id_fornecedor = :id_fornecedor,
                responsavel_despesa = :responsavel_despesa,
                categoria = :categoria,
                descricao = :descricao,
                data_despesa = :data_despesa,
                valor = :valor,
                observacoes = :observacoes
            WHERE id_despesa = :id_despesa
              AND id_ciclo = :id_ciclo
              AND ativo = 1
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_fornecedor" =>
                $dados["id_fornecedor"],
            "responsavel_despesa" => $responsavelDespesa,
            "categoria" => $dados["categoria"],
            "descricao" => $dados["descricao"],
            "data_despesa" =>
                $dados["data_despesa"],
            "valor" => $dados["valor"],
            "observacoes" =>
                $dados["observacoes"],
            "id_despesa" => $idDespesa,
            "id_ciclo" => $idCiclo,
        ]);

        return $comando->rowCount() > 0;
    }

    public function excluirPrevista(
        int $idCiclo,
        int $idDespesaPrevista
    ): bool {
        $this->validarCiclo($idCiclo);

        $sql = "
            UPDATE despesas_previstas
            SET
                ativo = 0,
                data_exclusao = NOW()
            WHERE id_despesa_prevista =
                    :id_despesa_prevista
              AND id_ciclo = :id_ciclo
              AND situacao = 'Pendente'
              AND ativo = 1
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_despesa_prevista" =>
                $idDespesaPrevista,
            "id_ciclo" => $idCiclo,
        ]);

        return $comando->rowCount() > 0;
    }

    public function excluirRealizada(
        int $idCiclo,
        int $idDespesa
    ): bool {
        $this->conexao->beginTransaction();

        try {
            $this->validarCiclo($idCiclo);

            $sqlPrevista = "
                SELECT id_despesa_prevista
                FROM despesas_previstas
                WHERE id_ciclo = :id_ciclo
                  AND id_despesa_realizada =
                        :id_despesa
                  AND ativo = 1
                LIMIT 1
                FOR UPDATE
            ";

            $comandoPrevista =
                $this->conexao->prepare(
                    $sqlPrevista
                );

            $comandoPrevista->execute([
                "id_ciclo" => $idCiclo,
                "id_despesa" => $idDespesa,
            ]);

            $idDespesaPrevista =
                $comandoPrevista->fetchColumn();

            $sqlDespesa = "
                UPDATE despesas_veiculo
                SET
                    ativo = 0,
                    data_exclusao = NOW()
                WHERE id_despesa = :id_despesa
                  AND id_ciclo = :id_ciclo
                  AND ativo = 1
            ";

            $comandoDespesa =
                $this->conexao->prepare(
                    $sqlDespesa
                );

            $comandoDespesa->execute([
                "id_despesa" => $idDespesa,
                "id_ciclo" => $idCiclo,
            ]);

            if (
                $comandoDespesa->rowCount()
                !== 1
            ) {
                $this->conexao->rollBack();

                return false;
            }

            if ($idDespesaPrevista !== false) {
                $sqlRestaurarPrevista = "
                    UPDATE despesas_previstas
                    SET
                        id_despesa_realizada = NULL,
                        situacao = 'Pendente'
                    WHERE id_despesa_prevista =
                            :id_despesa_prevista
                      AND id_ciclo = :id_ciclo
                      AND ativo = 1
                ";

                $comandoRestaurarPrevista =
                    $this->conexao->prepare(
                        $sqlRestaurarPrevista
                    );

                $comandoRestaurarPrevista->execute([
                    "id_despesa_prevista" =>
                        (int) $idDespesaPrevista,
                    "id_ciclo" => $idCiclo,
                ]);
            }

            $this->conexao->commit();

            return true;
        } catch (Throwable $erro) {
            if ($this->conexao->inTransaction()) {
                $this->conexao->rollBack();
            }

            throw $erro;
        }
    }

    private function buscarResumo(
        int $idCiclo
    ): array|false {
        $sql = "
            SELECT
                ciclo.id_ciclo,
                ciclo.id_veiculo,
                ciclo.nosso_numero,
                ciclo.origem_entrada,
                ciclo.situacao_atual,

                veiculo.marca,
                veiculo.modelo,
                veiculo.versao,
                veiculo.placa,

                aquisicao.id_aquisicao,
                consignacao.valor_repasse_acordado,
                consignacao.responsavel_despesas,

                COALESCE(
                    aquisicao.valor_aquisicao,
                    0
                ) AS valor_aquisicao,

                COALESCE(
                    (
                        SELECT SUM(despesa.valor)
                        FROM despesas_veiculo
                            AS despesa
                        WHERE despesa.id_ciclo =
                            ciclo.id_ciclo
                          AND despesa.ativo = 1
                    ),
                    0
                ) AS total_despesas_realizadas,

                COALESCE(
                    (
                        SELECT SUM(
                            prevista.valor_previsto
                        )
                        FROM despesas_previstas
                            AS prevista
                        WHERE prevista.id_ciclo =
                            ciclo.id_ciclo
                          AND prevista.situacao =
                            'Pendente'
                          AND prevista.ativo = 1
                    ),
                    0
                ) AS total_despesas_previstas,

                (
                    COALESCE(
                        aquisicao.valor_aquisicao,
                        0
                    )
                    +
                    COALESCE(
                        (
                            SELECT SUM(
                                despesa.valor
                            )
                            FROM despesas_veiculo
                                AS despesa
                            WHERE despesa.id_ciclo =
                                ciclo.id_ciclo
                              AND despesa.ativo = 1
                        ),
                        0
                    )
                ) AS custo_acumulado,

                (
                    COALESCE(
                        aquisicao.valor_aquisicao,
                        0
                    )
                    +
                    COALESCE(
                        (
                            SELECT SUM(
                                despesa.valor
                            )
                            FROM despesas_veiculo
                                AS despesa
                            WHERE despesa.id_ciclo =
                                ciclo.id_ciclo
                              AND despesa.ativo = 1
                        ),
                        0
                    )
                    +
                    COALESCE(
                        (
                            SELECT SUM(
                                prevista.valor_previsto
                            )
                            FROM despesas_previstas
                                AS prevista
                            WHERE prevista.id_ciclo =
                                ciclo.id_ciclo
                              AND prevista.situacao =
                                'Pendente'
                              AND prevista.ativo = 1
                        ),
                        0
                    )
                ) AS custo_projetado

            FROM ciclos_veiculo AS ciclo

            INNER JOIN veiculos AS veiculo
                ON veiculo.id_veiculo =
                    ciclo.id_veiculo

            LEFT JOIN aquisicoes AS aquisicao
                ON aquisicao.id_ciclo =
                    ciclo.id_ciclo

            LEFT JOIN consignacoes AS consignacao
                ON consignacao.id_ciclo = ciclo.id_ciclo

            WHERE ciclo.id_ciclo = :id_ciclo

            LIMIT 1
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_ciclo" => $idCiclo,
        ]);

        return $comando->fetch(
            PDO::FETCH_ASSOC
        );
    }

    private function listarRealizadas(
        int $idCiclo
    ): array {
        $sql = "
            SELECT
                despesa.id_despesa,
                despesa.id_ciclo,
                despesa.id_fornecedor,
                despesa.id_usuario_responsavel,
                despesa.responsavel_despesa,
                despesa.categoria,
                despesa.descricao,
                despesa.data_despesa,
                despesa.valor,
                despesa.observacoes,
                despesa.data_cadastro,
                despesa.data_atualizacao,

                fornecedor.razao_social_nome
                    AS fornecedor,

                usuario.nome
                    AS usuario_responsavel

            FROM despesas_veiculo AS despesa

            INNER JOIN fornecedores AS fornecedor
                ON fornecedor.id_fornecedor =
                    despesa.id_fornecedor

            LEFT JOIN usuarios AS usuario
                ON usuario.id_usuario =
                    despesa.id_usuario_responsavel

            WHERE despesa.id_ciclo = :id_ciclo
              AND despesa.ativo = 1

            ORDER BY
                despesa.data_despesa DESC,
                despesa.id_despesa DESC
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_ciclo" => $idCiclo,
        ]);

        return $comando->fetchAll(
            PDO::FETCH_ASSOC
        );
    }

    private function listarPrevistas(
        int $idCiclo
    ): array {
        $sql = "
            SELECT
                prevista.id_despesa_prevista,
                prevista.id_aquisicao,
                prevista.id_ciclo,
                prevista.id_avaliacao,
                prevista.id_despesa_realizada,
                prevista.id_usuario_responsavel,
                prevista.responsavel_despesa,
                prevista.integra_base_comercial,
                prevista.data_inclusao_planejamento,
                prevista.categoria,
                prevista.descricao,
                prevista.valor_previsto,
                prevista.situacao,
                prevista.observacoes,
                prevista.data_cadastro,
                prevista.data_atualizacao,

                usuario.nome
                    AS usuario_responsavel

            FROM despesas_previstas AS prevista

            LEFT JOIN usuarios AS usuario
                ON usuario.id_usuario =
                    prevista.id_usuario_responsavel

            WHERE prevista.id_ciclo = :id_ciclo
              AND prevista.ativo = 1

            ORDER BY
                prevista.id_despesa_prevista DESC
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_ciclo" => $idCiclo,
        ]);

        return $comando->fetchAll(
            PDO::FETCH_ASSOC
        );
    }

    private function buscarIdAquisicao(
        int $idCiclo
    ): ?int {
        $sql = "
            SELECT id_aquisicao
            FROM aquisicoes
            WHERE id_ciclo = :id_ciclo
            LIMIT 1
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_ciclo" => $idCiclo,
        ]);

        $idAquisicao =
            $comando->fetchColumn();

        if ($idAquisicao === false) {
            return null;
        }

        return (int) $idAquisicao;
    }

    private function prepararResponsavelDespesa(
        int $idCiclo,
        array $dados
    ): string {
        $comando = $this->conexao->prepare("
            SELECT origem_entrada
            FROM ciclos_veiculo
            WHERE id_ciclo = :id_ciclo
            LIMIT 1
        ");
        $comando->execute(["id_ciclo" => $idCiclo]);
        $origem = $comando->fetchColumn();

        if ($origem === false) {
            throw new InvalidArgumentException(
                "O ciclo informado não foi encontrado."
            );
        }
        if ($origem !== "consignação") {
            return "Revenda";
        }

        $responsavel = trim(
            (string) ($dados["responsavel_despesa"] ?? "")
        );
        if (!in_array($responsavel, [
            "Revenda", "Proprietário", "Desconto no repasse"
        ], true)) {
            throw new InvalidArgumentException(
                "Selecione quem assume a despesa do consignado."
            );
        }
        return $responsavel;
    }

    private function validarCiclo(
        int $idCiclo
    ): void {
        $sql = "
            SELECT id_ciclo
            FROM ciclos_veiculo
            WHERE id_ciclo = :id_ciclo
            LIMIT 1
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_ciclo" => $idCiclo,
        ]);

        if (
            $comando->fetchColumn()
            === false
        ) {
            throw new InvalidArgumentException(
                "O ciclo informado não foi encontrado."
            );
        }
    }
}
