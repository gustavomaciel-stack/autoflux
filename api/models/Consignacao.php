<?php

declare(strict_types=1);

final class Consignacao
{
    private PDO $conexao;

    public function __construct(PDO $conexao)
    {
        $this->conexao = $conexao;
    }

    public function listar(): array
    {
        $sql = "
            SELECT
                co.id_consignacao,
                co.id_ciclo,
                co.id_proprietario,
                co.id_nota_fiscal_entrada,
                co.id_usuario_responsavel,
                co.situacao,
                co.data_saida,
                co.motivo_saida,
                co.observacoes,
                co.valor_repasse_acordado,
                co.responsavel_despesas,
                co.data_acordo,
                co.data_cadastro,
                co.data_atualizacao,

                c.nosso_numero,
                c.origem_entrada,
                c.renavam,
                c.cor,
                c.quilometragem_entrada,
                c.horimetro_entrada,
                c.situacao_atual,
                c.data_entrada,
                c.data_encerramento,

                v.id_veiculo,
                v.marca,
                v.modelo,
                v.versao,
                v.ano_fabricacao,
                v.ano_modelo,
                v.combustivel,
                v.placa,
                v.chassi,

                cli.tipo_pessoa AS tipo_proprietario,
                cli.nome_razao_social AS nome_proprietario,
                cli.cpf AS cpf_proprietario,
                cli.cnpj AS cnpj_proprietario,
                cli.telefone AS telefone_proprietario,

                nf.numero_nota,
                nf.serie,
                nf.data_emissao,
                nf.valor_total,

                u.nome AS usuario_responsavel
            FROM consignacoes co
            INNER JOIN ciclos_veiculo c
                ON c.id_ciclo = co.id_ciclo
            INNER JOIN veiculos v
                ON v.id_veiculo = c.id_veiculo
            INNER JOIN clientes cli
                ON cli.id_cliente = co.id_proprietario
            INNER JOIN notas_fiscais_entrada nf
                ON nf.id_nota_fiscal_entrada =
                   co.id_nota_fiscal_entrada
            INNER JOIN usuarios u
                ON u.id_usuario = co.id_usuario_responsavel
            ORDER BY co.id_consignacao DESC
        ";

        $consulta = $this->conexao->query($sql);

        return $consulta->fetchAll(PDO::FETCH_ASSOC);
    }

    public function buscarPorId(
        int $idConsignacao
    ): ?array {
        $sql = "
            SELECT
                co.id_consignacao,
                co.id_ciclo,
                co.id_proprietario,
                co.id_nota_fiscal_entrada,
                co.id_usuario_responsavel,
                co.situacao,
                co.data_saida,
                co.motivo_saida,
                co.observacoes,
                co.valor_repasse_acordado,
                co.responsavel_despesas,
                co.data_acordo,
                co.data_cadastro,
                co.data_atualizacao,

                c.nosso_numero,
                c.origem_entrada,
                c.renavam,
                c.cor,
                c.quilometragem_entrada,
                c.horimetro_entrada,
                c.situacao_atual,
                c.data_entrada,
                c.data_encerramento,

                v.id_veiculo,
                v.marca,
                v.modelo,
                v.versao,
                v.ano_fabricacao,
                v.ano_modelo,
                v.combustivel,
                v.placa,
                v.chassi,
                v.observacoes AS observacoes_veiculo,

                cli.tipo_pessoa AS tipo_proprietario,
                cli.nome_razao_social AS nome_proprietario,
                cli.nome_fantasia AS nome_fantasia_proprietario,
                cli.cpf AS cpf_proprietario,
                cli.cnpj AS cnpj_proprietario,
                cli.telefone AS telefone_proprietario,
                cli.email AS email_proprietario,

                nf.numero_nota,
                nf.serie,
                nf.chave_acesso,
                nf.descricao_item,
                nf.data_emissao,
                nf.data_entrada AS data_entrada_nota,
                nf.valor_total,
                nf.natureza_operacao,
                nf.observacoes AS observacoes_nota,

                u.nome AS usuario_responsavel
            FROM consignacoes co
            INNER JOIN ciclos_veiculo c
                ON c.id_ciclo = co.id_ciclo
            INNER JOIN veiculos v
                ON v.id_veiculo = c.id_veiculo
            INNER JOIN clientes cli
                ON cli.id_cliente = co.id_proprietario
            INNER JOIN notas_fiscais_entrada nf
                ON nf.id_nota_fiscal_entrada =
                   co.id_nota_fiscal_entrada
            INNER JOIN usuarios u
                ON u.id_usuario = co.id_usuario_responsavel
            WHERE co.id_consignacao = :id_consignacao
            LIMIT 1
        ";

        $consulta = $this->conexao->prepare($sql);

        $consulta->execute([
            ':id_consignacao' => $idConsignacao,
        ]);

        $consignacao = $consulta->fetch(PDO::FETCH_ASSOC);

        return $consignacao !== false
            ? $consignacao
            : null;
    }

    public function cadastrar(array $dados): array
    {
        try {
            $this->conexao->beginTransaction();

            $this->validarProprietario(
                (int) $dados['id_proprietario']
            );

            $this->validarUsuario(
                (int) $dados['id_usuario_responsavel']
            );

            $this->validarDuplicidadeNota(
                $dados['numero_nota'],
                $dados['serie']
            );

            $idVeiculo = $this->obterOuCadastrarVeiculo(
                $dados
            );

            $this->validarCicloAtivo($idVeiculo);

            $idCiclo = $this->cadastrarCiclo(
                $idVeiculo,
                $dados
            );

            $nossoNumero = sprintf(
                'AF-%06d',
                $idCiclo
            );

            $this->atualizarNossoNumero(
                $idCiclo,
                $nossoNumero
            );

            $idNotaFiscal = $this->cadastrarNotaFiscal(
                $idVeiculo,
                $idCiclo,
                $dados
            );

            $idConsignacao = $this->cadastrarRegistro(
                $idCiclo,
                $idNotaFiscal,
                $dados
            );

            $this->cadastrarMovimentacaoInicial(
                $idCiclo,
                $dados
            );

            $this->conexao->commit();

            $consignacao = $this->buscarPorId(
                $idConsignacao
            );

            if ($consignacao === null) {
                throw new RuntimeException(
                    'Não foi possível consultar a consignação cadastrada.'
                );
            }

            return $consignacao;
        } catch (Throwable $erro) {
            if ($this->conexao->inTransaction()) {
                $this->conexao->rollBack();
            }

            throw $erro;
        }
    }

    public function registrarDevolucao(
        int $idConsignacao,
        int $idUsuarioResponsavel,
        string $dataSaida,
        string $motivoSaida
    ): array {
        try {
            $this->conexao->beginTransaction();

            $consignacao = $this->buscarPorId(
                $idConsignacao
            );

            if ($consignacao === null) {
                throw new RuntimeException(
                    'Consignação não encontrada.'
                );
            }

            if ($consignacao['situacao'] !== 'Ativa') {
                throw new InvalidArgumentException(
                    'Somente consignações ativas podem ser devolvidas.'
                );
            }

            $dataEntrada = substr((string) $consignacao['data_entrada'], 0, 10);
            if ($dataSaida < $dataEntrada) {
                throw new InvalidArgumentException(
                    'A data da devolução não pode ser anterior à data de entrada do veículo.'
                );
            }

            $this->validarUsuario(
                $idUsuarioResponsavel
            );

            $sqlConsignacao = "
                UPDATE consignacoes
                SET
                    situacao = 'Devolvida',
                    data_saida = :data_saida,
                    motivo_saida = :motivo_saida
                WHERE id_consignacao = :id_consignacao
                  AND situacao = 'Ativa'
            ";

            $consultaConsignacao =
                $this->conexao->prepare(
                    $sqlConsignacao
                );

            $consultaConsignacao->execute([
                ':data_saida' => $dataSaida,
                ':motivo_saida' => $motivoSaida,
                ':id_consignacao' => $idConsignacao,
            ]);

            $sqlCiclo = "
                UPDATE ciclos_veiculo
                SET
                    situacao_atual = 'Devolvido',
                    data_encerramento = :data_encerramento
                WHERE id_ciclo = :id_ciclo
                  AND data_encerramento IS NULL
            ";

            $consultaCiclo =
                $this->conexao->prepare($sqlCiclo);

            $consultaCiclo->execute([
                ':data_encerramento' => $dataSaida,
                ':id_ciclo' => $consignacao['id_ciclo'],
            ]);

            $sqlMovimentacao = "
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
                    'Devolvido',
                    CURRENT_TIMESTAMP,
                    :observacoes
                )
            ";

            $consultaMovimentacao =
                $this->conexao->prepare(
                    $sqlMovimentacao
                );

            $consultaMovimentacao->execute([
                ':id_ciclo' => $consignacao['id_ciclo'],
                ':id_usuario_responsavel' =>
                    $idUsuarioResponsavel,
                ':situacao_anterior' =>
                    $consignacao['situacao_atual'],
                ':observacoes' => $motivoSaida,
            ]);

            $this->conexao->commit();

            $consignacaoAtualizada =
                $this->buscarPorId($idConsignacao);

            if ($consignacaoAtualizada === null) {
                throw new RuntimeException(
                    'Não foi possível consultar a consignação devolvida.'
                );
            }

            return $consignacaoAtualizada;
        } catch (Throwable $erro) {
            if ($this->conexao->inTransaction()) {
                $this->conexao->rollBack();
            }

            throw $erro;
        }
    }

    private function validarProprietario(
        int $idProprietario
    ): void {
        $sql = "
            SELECT id_cliente
            FROM clientes
            WHERE id_cliente = :id_cliente
            LIMIT 1
        ";

        $consulta = $this->conexao->prepare($sql);

        $consulta->execute([
            ':id_cliente' => $idProprietario,
        ]);

        if ($consulta->fetch(PDO::FETCH_ASSOC) === false) {
            throw new InvalidArgumentException(
                'O proprietário informado não foi encontrado.'
            );
        }
    }

    private function validarUsuario(
        int $idUsuario
    ): void {
        $sql = "
            SELECT id_usuario
            FROM usuarios
            WHERE id_usuario = :id_usuario
            LIMIT 1
        ";

        $consulta = $this->conexao->prepare($sql);

        $consulta->execute([
            ':id_usuario' => $idUsuario,
        ]);

        if ($consulta->fetch(PDO::FETCH_ASSOC) === false) {
            throw new InvalidArgumentException(
                'O usuário responsável não foi encontrado.'
            );
        }
    }

    private function validarDuplicidadeNota(
        string $numeroNota,
        string $serie
    ): void {
        $sql = "
            SELECT id_nota_fiscal_entrada
            FROM notas_fiscais_entrada
            WHERE numero_nota = :numero_nota
              AND serie = :serie
            LIMIT 1
        ";

        $consulta = $this->conexao->prepare($sql);

        $consulta->execute([
            ':numero_nota' => $numeroNota,
            ':serie' => $serie,
        ]);

        if ($consulta->fetch(PDO::FETCH_ASSOC) !== false) {
            throw new InvalidArgumentException(
                'Já existe uma Nota Fiscal de Entrada com este número e série.'
            );
        }
    }

    private function obterOuCadastrarVeiculo(
        array $dados
    ): int {
        $sqlBusca = "
            SELECT id_veiculo
            FROM veiculos
            WHERE chassi = :chassi
            LIMIT 1
        ";

        $consultaBusca =
            $this->conexao->prepare($sqlBusca);

        $consultaBusca->execute([
            ':chassi' => $dados['chassi'],
        ]);

        $veiculoExistente =
            $consultaBusca->fetch(PDO::FETCH_ASSOC);

        if ($veiculoExistente !== false) {
            $idVeiculo =
                (int) $veiculoExistente['id_veiculo'];

            $sqlAtualizacao = "
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

            $consultaAtualizacao =
                $this->conexao->prepare(
                    $sqlAtualizacao
                );

            $consultaAtualizacao->execute([
                ':id_veiculo' => $idVeiculo,
                ':marca' => $dados['marca'],
                ':modelo' => $dados['modelo'],
                ':versao' => $dados['versao'],
                ':ano_fabricacao' =>
                    $dados['ano_fabricacao'],
                ':ano_modelo' =>
                    $dados['ano_modelo'],
                ':combustivel' =>
                    $dados['combustivel'],
                ':placa' => $dados['placa'],
                ':observacoes' =>
                    $dados['observacoes_veiculo'],
            ]);

            return $idVeiculo;
        }

        $sqlCadastro = "
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

        $consultaCadastro =
            $this->conexao->prepare($sqlCadastro);

        $consultaCadastro->execute([
            ':marca' => $dados['marca'],
            ':modelo' => $dados['modelo'],
            ':versao' => $dados['versao'],
            ':ano_fabricacao' =>
                $dados['ano_fabricacao'],
            ':ano_modelo' => $dados['ano_modelo'],
            ':combustivel' => $dados['combustivel'],
            ':placa' => $dados['placa'],
            ':chassi' => $dados['chassi'],
            ':observacoes' =>
                $dados['observacoes_veiculo'],
        ]);

        return (int) $this->conexao->lastInsertId();
    }

    private function validarCicloAtivo(
        int $idVeiculo
    ): void {
        $sql = "
            SELECT id_ciclo
            FROM ciclos_veiculo
            WHERE id_veiculo = :id_veiculo
              AND data_encerramento IS NULL
            LIMIT 1
        ";

        $consulta = $this->conexao->prepare($sql);

        $consulta->execute([
            ':id_veiculo' => $idVeiculo,
        ]);

        if ($consulta->fetch(PDO::FETCH_ASSOC) !== false) {
            throw new InvalidArgumentException(
                'Este veículo já possui um ciclo ativo no pátio.'
            );
        }
    }

    private function cadastrarCiclo(
        int $idVeiculo,
        array $dados
    ): int {
        $identificadorTemporario =
            'TMP-' . bin2hex(random_bytes(6));

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
                'consignação',
                :renavam,
                :cor,
                :quilometragem_entrada,
                :horimetro_entrada,
                'Disponível',
                CONCAT(:data_entrada, ' ', CURRENT_TIME()),
                :observacoes
            )
        ";

        $consulta = $this->conexao->prepare($sql);

        $consulta->execute([
            ':id_veiculo' => $idVeiculo,
            ':nosso_numero' =>
                $identificadorTemporario,
            ':renavam' => $dados['renavam'],
            ':cor' => $dados['cor'],
            ':quilometragem_entrada' =>
                $dados['quilometragem_entrada'],
            ':horimetro_entrada' =>
                $dados['horimetro_entrada'],
            ':data_entrada' => $dados['data_entrada'],
            ':observacoes' =>
                $dados['observacoes_consignacao'],
        ]);

        return (int) $this->conexao->lastInsertId();
    }

    private function atualizarNossoNumero(
        int $idCiclo,
        string $nossoNumero
    ): void {
        $sql = "
            UPDATE ciclos_veiculo
            SET nosso_numero = :nosso_numero
            WHERE id_ciclo = :id_ciclo
        ";

        $consulta = $this->conexao->prepare($sql);

        $consulta->execute([
            ':nosso_numero' => $nossoNumero,
            ':id_ciclo' => $idCiclo,
        ]);
    }

    private function cadastrarNotaFiscal(
        int $idVeiculo,
        int $idCiclo,
        array $dados
    ): int {
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
                NULL,
                NULL,
                NULL,
                :id_ciclo,
                :id_veiculo,
                :descricao_item,
                :id_usuario_responsavel,
                :numero_nota,
                :id_cliente_origem,
                :serie,
                :chave_acesso,
                :data_emissao,
                :valor_total,
                :natureza_operacao,
                :observacoes,
                :data_entrada
            )
        ";

        $consulta = $this->conexao->prepare($sql);

        $consulta->execute([
            ':id_ciclo' => $idCiclo,
            ':id_veiculo' => $idVeiculo,
            ':descricao_item' =>
                $dados['descricao_item'],
            ':id_usuario_responsavel' =>
                $dados['id_usuario_responsavel'],
            ':numero_nota' => $dados['numero_nota'],
            ':id_cliente_origem' =>
                $dados['id_proprietario'],
            ':serie' => $dados['serie'],
            ':chave_acesso' => $dados['chave_acesso'],
            ':data_emissao' => $dados['data_emissao'],
            ':valor_total' => $dados['valor_total'],
            ':natureza_operacao' =>
                $dados['natureza_operacao'],
            ':observacoes' =>
                $dados['observacoes_nota'],
            ':data_entrada' => $dados['data_entrada'],
        ]);

        return (int) $this->conexao->lastInsertId();
    }

    private function cadastrarRegistro(
        int $idCiclo,
        int $idNotaFiscal,
        array $dados
    ): int {
        $sql = "
            INSERT INTO consignacoes (
                id_ciclo,
                id_proprietario,
                id_nota_fiscal_entrada,
                id_usuario_responsavel,
                situacao,
                observacoes,
                valor_repasse_acordado,
                responsavel_despesas,
                data_acordo
            ) VALUES (
                :id_ciclo,
                :id_proprietario,
                :id_nota_fiscal_entrada,
                :id_usuario_responsavel,
                'Ativa',
                :observacoes,
                :valor_repasse_acordado,
                :responsavel_despesas,
                :data_acordo
            )
        ";

        $consulta = $this->conexao->prepare($sql);

        $consulta->execute([
            ':id_ciclo' => $idCiclo,
            ':id_proprietario' =>
                $dados['id_proprietario'],
            ':id_nota_fiscal_entrada' =>
                $idNotaFiscal,
            ':id_usuario_responsavel' =>
                $dados['id_usuario_responsavel'],
            ':observacoes' =>
                $dados['observacoes_consignacao'],
            ':valor_repasse_acordado' =>
                $dados['valor_repasse_acordado'],
            ':responsavel_despesas' =>
                $dados['responsavel_despesas'],
            ':data_acordo' =>
                $dados['data_acordo'],
        ]);

        return (int) $this->conexao->lastInsertId();
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
                'Fora do pátio',
                'Disponível',
                CURRENT_TIMESTAMP,
                :observacoes
            )
        ";

        $consulta = $this->conexao->prepare($sql);

        $consulta->execute([
            ':id_ciclo' => $idCiclo,
            ':id_usuario_responsavel' =>
                $dados['id_usuario_responsavel'],
            ':observacoes' =>
                'Entrada inicial do veículo consignado no pátio.',
        ]);
    }
}
