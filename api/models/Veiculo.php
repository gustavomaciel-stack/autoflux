<?php

declare(strict_types=1);

final class Veiculo
{
    private PDO $conexao;

    public function __construct(PDO $conexao)
    {
        $this->conexao = $conexao;
    }

    public function listarTodos(): array
    {
        $sql = $this->sqlConsultaCompleta() . "
            ORDER BY c.data_entrada DESC, v.id_veiculo DESC
        ";

        $comando = $this->conexao->query($sql);

        return $comando->fetchAll(PDO::FETCH_ASSOC);
    }

    public function buscarPorChassi(string $chassi): array|false
    {
        $sql = "
            SELECT v.id_veiculo, v.marca, v.modelo, v.versao,
                   v.ano_fabricacao, v.ano_modelo, v.combustivel,
                   v.placa, v.chassi, v.observacoes,
                   c.id_ciclo, c.nosso_numero, c.renavam, c.cor,
                   c.data_encerramento
            FROM veiculos v
            LEFT JOIN ciclos_veiculo c ON c.id_ciclo = (
                SELECT MAX(c2.id_ciclo) FROM ciclos_veiculo c2
                WHERE c2.id_veiculo = v.id_veiculo
            )
            WHERE v.chassi = :chassi
            LIMIT 1
        ";
        $comando = $this->conexao->prepare($sql);
        $comando->execute(["chassi" => $chassi]);
        return $comando->fetch(PDO::FETCH_ASSOC);
    }

    public function buscarPorId(int $idVeiculo): array|false
    {
        $sql = $this->sqlConsultaCompleta() . "
            WHERE v.id_veiculo = :id_veiculo
            ORDER BY c.id_ciclo DESC
            LIMIT 1
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_veiculo" => $idVeiculo,
        ]);

        return $comando->fetch(PDO::FETCH_ASSOC);
    }

    public function cadastrar(array $dados): int
    {
        $this->conexao->beginTransaction();

        try {
            $idVeiculo = $this->obterOuCadastrarVeiculo($dados);

            $idCiclo = $this->cadastrarCiclo(
                $idVeiculo,
                $dados
            );

            $idAquisicao = $this->cadastrarAquisicao(
                $idVeiculo,
                $idCiclo,
                $dados
            );

            $this->cadastrarNotaFiscal(
                $idVeiculo,
                $idCiclo,
                $idAquisicao,
                $dados
            );

            $this->cadastrarMovimentacaoInicial(
                $idCiclo,
                $dados
            );

            $this->conexao->commit();

            return $idVeiculo;
        } catch (Throwable $erro) {
            if ($this->conexao->inTransaction()) {
                $this->conexao->rollBack();
            }

            throw $erro;
        }
    }

    public function atualizar(int $idVeiculo, array $dados): bool
    {
        $this->conexao->beginTransaction();

        try {
            $possuiAquisicao =
                (bool) ($dados["possui_aquisicao"] ?? false);

            $sqlVeiculo = "
                UPDATE veiculos
                SET
                    marca = :marca,
                    modelo = :modelo,
                    versao = :versao,
                    ano_fabricacao = :ano_fabricacao,
                    ano_modelo = :ano_modelo,
                    combustivel = :combustivel,
                    placa = :placa,
                    chassi = :chassi,
                    observacoes = :observacoes
                WHERE id_veiculo = :id_veiculo
            ";

            $comandoVeiculo = $this->conexao->prepare($sqlVeiculo);

            $comandoVeiculo->execute([
                "id_veiculo" => $idVeiculo,
                "marca" => $dados["marca"],
                "modelo" => $dados["modelo"],
                "versao" => $dados["versao"],
                "ano_fabricacao" => $dados["ano_fabricacao"],
                "ano_modelo" => $dados["ano_modelo"],
                "combustivel" => $dados["combustivel"],
                "placa" => $dados["placa"],
                "chassi" => $dados["chassi"],
                "observacoes" => $dados["observacoes"],
            ]);

            $sqlCiclo = "
                UPDATE ciclos_veiculo
                SET
                    renavam = :renavam,
                    cor = :cor,
                    quilometragem_entrada = :quilometragem_entrada,
                    horimetro_entrada = :horimetro_entrada,
                    data_entrada = CASE
                        WHEN :atualizar_data_entrada = 1
                            THEN :data_entrada
                        ELSE data_entrada
                    END
                WHERE id_veiculo = :id_veiculo
                  AND data_encerramento IS NULL
            ";

            $comandoCiclo = $this->conexao->prepare($sqlCiclo);

            $comandoCiclo->execute([
                "id_veiculo" => $idVeiculo,
                "renavam" => $dados["renavam"],
                "cor" => $dados["cor"],
                "quilometragem_entrada" => $dados["quilometragem"],
                "horimetro_entrada" => $dados["horimetro"],
                "data_entrada" => $dados["data_compra"],
                "atualizar_data_entrada" =>
                    $possuiAquisicao ? 1 : 0,
            ]);

            if ($possuiAquisicao) {
                $sqlAquisicao = "
                    UPDATE aquisicoes a
                    INNER JOIN ciclos_veiculo c
                        ON c.id_ciclo = a.id_ciclo
                    SET
                        a.valor_aquisicao = :valor_aquisicao,
                        a.data_aquisicao = :data_aquisicao,
                        a.origem = :origem,
                        a.data_conclusao = :data_conclusao
                    WHERE c.id_veiculo = :id_veiculo
                      AND c.data_encerramento IS NULL
                ";

                $comandoAquisicao =
                    $this->conexao->prepare($sqlAquisicao);

                $comandoAquisicao->execute([
                    "id_veiculo" => $idVeiculo,
                    "valor_aquisicao" =>
                        $dados["valor_compra"],
                    "data_aquisicao" =>
                        $dados["data_compra"],
                    "origem" => $dados["origem"],
                    "data_conclusao" =>
                        $dados["data_compra"]
                        . " 00:00:00",
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

    private function obterOuCadastrarVeiculo(array $dados): int
    {
        $sqlBusca = "
            SELECT id_veiculo
            FROM veiculos
            WHERE chassi = :chassi
            LIMIT 1
        ";

        $comandoBusca = $this->conexao->prepare($sqlBusca);

        $comandoBusca->execute([
            "chassi" => $dados["chassi"],
        ]);

        $veiculoExistente =
            $comandoBusca->fetch(PDO::FETCH_ASSOC);

        if ($veiculoExistente !== false) {
            $idVeiculo =
                (int) $veiculoExistente["id_veiculo"];

            $sqlCicloAtivo = "
                SELECT id_ciclo
                FROM ciclos_veiculo
                WHERE id_veiculo = :id_veiculo
                  AND data_encerramento IS NULL
                LIMIT 1
            ";

            $comandoCicloAtivo =
                $this->conexao->prepare($sqlCicloAtivo);

            $comandoCicloAtivo->execute([
                "id_veiculo" => $idVeiculo,
            ]);

            if ($comandoCicloAtivo->fetch() !== false) {
                throw new InvalidArgumentException(
                    "Este chassi já possui um ciclo ativo no pátio."
                );
            }

            $sqlAtualiza = "
                UPDATE veiculos
                SET
                    marca = :marca,
                    modelo = :modelo,
                    versao = :versao,
                    ano_fabricacao = :ano_fabricacao,
                    ano_modelo = :ano_modelo,
                    combustivel = :combustivel,
                    placa = :placa,
                    observacoes = :observacoes
                WHERE id_veiculo = :id_veiculo
            ";

            $comandoAtualiza =
                $this->conexao->prepare($sqlAtualiza);

            $comandoAtualiza->execute([
                "id_veiculo" => $idVeiculo,
                "marca" => $dados["marca"],
                "modelo" => $dados["modelo"],
                "versao" => $dados["versao"],
                "ano_fabricacao" =>
                    $dados["ano_fabricacao"],
                "ano_modelo" => $dados["ano_modelo"],
                "combustivel" => $dados["combustivel"],
                "placa" => $dados["placa"],
                "observacoes" => $dados["observacoes"],
            ]);

            return $idVeiculo;
        }

        $sql = "
            INSERT INTO veiculos (
                marca,
                modelo,
                versao,
                ano_fabricacao,
                ano_modelo,
                combustivel,
                placa,
                chassi,
                observacoes
            ) VALUES (
                :marca,
                :modelo,
                :versao,
                :ano_fabricacao,
                :ano_modelo,
                :combustivel,
                :placa,
                :chassi,
                :observacoes
            )
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "marca" => $dados["marca"],
            "modelo" => $dados["modelo"],
            "versao" => $dados["versao"],
            "ano_fabricacao" => $dados["ano_fabricacao"],
            "ano_modelo" => $dados["ano_modelo"],
            "combustivel" => $dados["combustivel"],
            "placa" => $dados["placa"],
            "chassi" => $dados["chassi"],
            "observacoes" => $dados["observacoes"],
        ]);

        return (int) $this->conexao->lastInsertId();
    }

    private function cadastrarCiclo(
        int $idVeiculo,
        array $dados
    ): int {
        $numeroTemporario =
            "TMP-" . bin2hex(random_bytes(6));

        $sql = "
            INSERT INTO ciclos_veiculo (
                id_veiculo,
                nosso_numero,
                origem_entrada,
                renavam,
                cor,
                quilometragem_entrada,
                horimetro_entrada,
                situacao_atual,
                data_entrada,
                observacoes
            ) VALUES (
                :id_veiculo,
                :nosso_numero,
                :origem_entrada,
                :renavam,
                :cor,
                :quilometragem_entrada,
                :horimetro_entrada,
                :situacao_atual,
                :data_entrada,
                :observacoes
            )
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_veiculo" => $idVeiculo,
            "nosso_numero" => $numeroTemporario,
            "origem_entrada" => "aquisição",
            "renavam" => $dados["renavam"],
            "cor" => $dados["cor"],
            "quilometragem_entrada" =>
                $dados["quilometragem"],
            "horimetro_entrada" => $dados["horimetro"],
            "situacao_atual" => "Disponível",
            "data_entrada" =>
                $dados["data_compra"] . " 00:00:00",
            "observacoes" => $dados["observacoes"],
        ]);

        $idCiclo =
            (int) $this->conexao->lastInsertId();

        $nossoNumero = "AF-" . str_pad(
            (string) $idCiclo,
            6,
            "0",
            STR_PAD_LEFT
        );

        $sqlNumero = "
            UPDATE ciclos_veiculo
            SET nosso_numero = :nosso_numero
            WHERE id_ciclo = :id_ciclo
        ";

        $comandoNumero =
            $this->conexao->prepare($sqlNumero);

        $comandoNumero->execute([
            "nosso_numero" => $nossoNumero,
            "id_ciclo" => $idCiclo,
        ]);

        return $idCiclo;
    }

    private function cadastrarAquisicao(
        int $idVeiculo,
        int $idCiclo,
        array $dados
    ): int {
        $sql = "
            INSERT INTO aquisicoes (
                id_ciclo,
                id_veiculo,
                valor_aquisicao,
                data_aquisicao,
                origem,
                situacao,
                data_conclusao
            ) VALUES (
                :id_ciclo,
                :id_veiculo,
                :valor_aquisicao,
                :data_aquisicao,
                :origem,
                :situacao,
                :data_conclusao
            )
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_ciclo" => $idCiclo,
            "id_veiculo" => $idVeiculo,
            "valor_aquisicao" =>
                $dados["valor_compra"],
            "data_aquisicao" =>
                $dados["data_compra"],
            "origem" => $dados["origem"],
            "situacao" => "Concluída",
            "data_conclusao" =>
                $dados["data_compra"] . " 00:00:00",
        ]);

        return (int) $this->conexao->lastInsertId();
    }

    private function cadastrarNotaFiscal(
        int $idVeiculo,
        int $idCiclo,
        int $idAquisicao,
        array $dados
    ): void {
        $idFornecedor =
            $dados["id_fornecedor_origem"] ?? null;

        $nomeAvulso = trim(
            (string) (
                $dados["nome_fornecedor_avulso"] ?? ""
            )
        );

        if ($nomeAvulso !== "") {
            $idFornecedor = null;
        } else {
            $nomeAvulso = null;
        }

        $idFornecedorNormalizado =
            $idFornecedor === null
                ? null
                : (int) $idFornecedor;

        if (
            $this->notaFiscalDuplicada(
                (string) $dados["numero_nota"],
                (string) $dados["serie"],
                $idFornecedorNormalizado,
                $nomeAvulso
            )
        ) {
            throw new InvalidArgumentException(
                "Já existe uma nota fiscal com este número, série e origem."
            );
        }

        $sql = "
            INSERT INTO notas_fiscais_entrada (
                id_aquisicao,
                id_fornecedor_origem,
                nome_fornecedor_avulso,
                id_ciclo,
                id_veiculo,
                descricao_item,
                id_usuario_responsavel,
                numero_nota,
                id_cliente_origem,
                serie,
                chave_acesso,
                data_emissao,
                valor_total,
                natureza_operacao,
                observacoes,
                data_entrada
            ) VALUES (
                :id_aquisicao,
                :id_fornecedor_origem,
                :nome_fornecedor_avulso,
                :id_ciclo,
                :id_veiculo,
                :descricao_item,
                :id_usuario_responsavel,
                :numero_nota,
                NULL,
                :serie,
                :chave_acesso,
                :data_emissao,
                :valor_total,
                :natureza_operacao,
                :observacoes,
                :data_entrada
            )
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_aquisicao" => $idAquisicao,
            "id_fornecedor_origem" =>
                $idFornecedorNormalizado,
            "nome_fornecedor_avulso" => $nomeAvulso,
            "id_ciclo" => $idCiclo,
            "id_veiculo" => $idVeiculo,
            "descricao_item" =>
                $dados["descricao_item_nf"],
            "id_usuario_responsavel" =>
                $dados["id_usuario_responsavel"] ?? 1,
            "numero_nota" => $dados["numero_nota"],
            "serie" => $dados["serie"],
            "chave_acesso" =>
                $dados["chave_acesso"] ?: null,
            "data_emissao" =>
                $dados["data_emissao_nf"],
            "valor_total" => $dados["valor_compra"],
            "natureza_operacao" =>
                $dados["natureza_operacao"] ?: null,
            "observacoes" =>
                $dados["observacoes_nf"] ?: null,
            "data_entrada" => $dados["data_compra"],
        ]);
    }

    private function cadastrarMovimentacaoInicial(
        int $idCiclo,
        array $dados
    ): void {
        $sql = "
            INSERT INTO movimentacoes_veiculo (
                id_ciclo,
                id_usuario_responsavel,
                situacao_anterior,
                situacao_nova,
                data_movimentacao,
                observacoes
            ) VALUES (
                :id_ciclo,
                :id_usuario_responsavel,
                :situacao_anterior,
                :situacao_nova,
                CURRENT_TIMESTAMP,
                :observacoes
            )
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_ciclo" => $idCiclo,
            "id_usuario_responsavel" =>
                $dados["id_usuario_responsavel"] ?? 1,
            "situacao_anterior" => "Fora do pátio",
            "situacao_nova" => "Disponível",
            "observacoes" =>
                "Entrada inicial do veículo no pátio.",
        ]);
    }

    private function notaFiscalDuplicada(
        string $numeroNota,
        string $serie,
        ?int $idFornecedor,
        ?string $nomeAvulso
    ): bool {
        if ($idFornecedor !== null) {
            $sql = "
                SELECT id_nota_fiscal_entrada
                FROM notas_fiscais_entrada
                WHERE numero_nota = :numero_nota
                  AND serie = :serie
                  AND id_fornecedor_origem =
                      :id_fornecedor_origem
                LIMIT 1
            ";

            $parametros = [
                "numero_nota" => $numeroNota,
                "serie" => $serie,
                "id_fornecedor_origem" =>
                    $idFornecedor,
            ];
        } else {
            $sql = "
                SELECT id_nota_fiscal_entrada
                FROM notas_fiscais_entrada
                WHERE numero_nota = :numero_nota
                  AND serie = :serie
                  AND LOWER(
                      TRIM(nome_fornecedor_avulso)
                  ) = LOWER(TRIM(:nome))
                LIMIT 1
            ";

            $parametros = [
                "numero_nota" => $numeroNota,
                "serie" => $serie,
                "nome" => $nomeAvulso,
            ];
        }

        $comando = $this->conexao->prepare($sql);
        $comando->execute($parametros);

        return $comando->fetch() !== false;
    }

    private function sqlConsultaCompleta(): string
    {
        return "
            SELECT
                v.id_veiculo,
                v.marca,
                v.modelo,
                v.versao,
                v.ano_fabricacao,
                v.ano_modelo,
                v.combustivel,
                v.placa,
                v.chassi,
                v.observacoes,
                v.data_cadastro,
                v.data_atualizacao,

                c.id_ciclo,
                c.nosso_numero,
                c.origem_entrada,
                c.renavam,
                c.cor,
                c.quilometragem_entrada
                    AS quilometragem,
                c.horimetro_entrada
                    AS horimetro,
                c.situacao_atual AS status,
                c.data_entrada,
                c.data_encerramento,

                a.id_aquisicao,
                a.valor_aquisicao AS valor_compra,
                co.valor_repasse_acordado,
                co.responsavel_despesas,
                a.data_aquisicao AS data_compra,
                a.origem AS origem_aquisicao,
                a.situacao AS situacao_aquisicao,

                (
                    COALESCE(a.valor_aquisicao, 0)
                    +
                    COALESCE(
                        (
                            SELECT SUM(dv.valor)
                            FROM despesas_veiculo dv
                            WHERE dv.id_ciclo = c.id_ciclo
                            AND dv.ativo = 1
                        ),
                        0
                    )
                ) AS custo_acumulado,

                nf.id_nota_fiscal_entrada,
                nf.id_fornecedor_origem,
                nf.nome_fornecedor_avulso,
                nf.numero_nota,
                nf.serie,
                nf.chave_acesso,
                nf.data_emissao AS data_emissao_nf,
                nf.descricao_item AS descricao_item_nf,
                nf.natureza_operacao,
                nf.observacoes AS observacoes_nf,

                COALESCE(
                    f.razao_social_nome,
                    nf.nome_fornecedor_avulso,
                    cli.nome_razao_social
                ) AS nome_fornecedor_nf

            FROM veiculos v

            INNER JOIN ciclos_veiculo c
                ON c.id_veiculo = v.id_veiculo
               AND c.data_encerramento IS NULL

            LEFT JOIN aquisicoes a
                ON a.id_ciclo = c.id_ciclo

            LEFT JOIN consignacoes co
                ON co.id_ciclo = c.id_ciclo

            LEFT JOIN notas_fiscais_entrada nf
                ON nf.id_ciclo = c.id_ciclo

            LEFT JOIN fornecedores f
                ON f.id_fornecedor =
                    nf.id_fornecedor_origem

            LEFT JOIN clientes cli
                ON cli.id_cliente =
                    nf.id_cliente_origem
        ";
    }
}
