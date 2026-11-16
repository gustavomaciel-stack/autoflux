<?php

declare(strict_types=1);
require_once __DIR__ . "/../config/Auth.php";

require_once __DIR__.'/IdentidadeVeiculoEntrada.php';

final class Veiculo
{
    private PDO $conexao;

    public function __construct(PDO $conexao)
    {
        $this->conexao = $conexao;
    }

    public function listarTodos(): array
    {
        $consulta = $this->conexao->query($this->sqlConsultaCompleta() .
            ' ORDER BY c.id_ciclo DESC, v.id_veiculo DESC');
        return $consulta->fetchAll(PDO::FETCH_ASSOC);
    }

    public function listarPaginado(int $pagina, string $busca, string $situacao = '', bool $comercial = false): array
    {
        $base = 'SELECT patio.* FROM (' . $this->sqlConsultaCompleta() . ') patio';
        $parametros = [];
        if ($busca !== '') {
            $campos = ['nosso_numero', 'marca', 'modelo', 'versao', 'placa', 'chassi',
                'renavam', 'combustivel', 'cor', 'status', 'numero_nota', 'serie', 'nome_fornecedor_nf'];
            $condicoes = [];
            foreach ($campos as $indice => $campo) {
                $chave = 'busca' . $indice;
                $condicoes[] = "COALESCE(patio.$campo, '') LIKE :$chave";
                $parametros[$chave] = '%' . strtr($busca, ['!' => '!!', '%' => '!%', '_' => '!_']) . '%';
            }
            $base .= ' WHERE ' . implode(' OR ', array_map(
                static fn(string $condicao): string => $condicao . " ESCAPE '!'", $condicoes
            ));
        }
        if ($situacao !== '' && $situacao !== 'Todos') {
            $base .= ($busca !== '' ? ' AND ' : ' WHERE ') . 'patio.status = :situacao';
            $parametros['situacao'] = $situacao;
        }
        $contagem = $this->conexao->prepare('SELECT COUNT(*) FROM (' . $base . ') filtrados');
        $contagem->execute($parametros);
        $total = (int) $contagem->fetchColumn();
        $paginas = max(1, (int) ceil($total / 20));
        $pagina = max(1, min($pagina, $paginas));
        $offset = ($pagina - 1) * 20;
        $consulta = $this->conexao->prepare($base .
            " ORDER BY patio.id_ciclo DESC, patio.id_veiculo DESC LIMIT 20 OFFSET $offset");
        $consulta->execute($parametros);
        $resultado = ['itens' => $consulta->fetchAll(PDO::FETCH_ASSOC), 'total' => $total,
            'pagina' => $pagina, 'paginas' => $paginas];
        if ($comercial) {
            $resumo = $this->conexao->query("SELECT situacao_atual AS situacao, COUNT(*) AS quantidade
                FROM ciclos_veiculo WHERE data_encerramento IS NULL GROUP BY situacao_atual");
            $resultado['contadores'] = ['total' => 0, 'disponiveis' => 0, 'bloqueados' => 0];
            $resultado['situacoes'] = [];
            foreach ($resumo->fetchAll(PDO::FETCH_ASSOC) as $grupo) {
                $quantidade = (int) $grupo['quantidade'];
                $resultado['contadores']['total'] += $quantidade;
                $chave = $grupo['situacao'] === 'Disponível' ? 'disponiveis' : 'bloqueados';
                $resultado['contadores'][$chave] += $quantidade;
                $resultado['situacoes'][] = $grupo['situacao'];
            }
            sort($resultado['situacoes']);
        }
        return $resultado;
    }

    public function buscarPorChassi(string $chassi): array|false
    {
        $sql = "
            SELECT v.id_veiculo, v.marca, v.modelo, v.versao,
                   v.ano_fabricacao, v.ano_modelo, v.combustivel,
                   v.placa, v.chassi, v.observacoes,
                   c.id_ciclo, c.nosso_numero, c.renavam, c.cor,
                   c.data_encerramento,
                   EXISTS(SELECT 1 FROM ciclos_veiculo ca WHERE ca.id_veiculo=v.id_veiculo AND ca.data_encerramento IS NULL) AS possui_ciclo_ativo
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
            $entrada = $this->cadastrarEmTransacao($dados);
            $idVeiculo = $entrada['id_veiculo'];

            $this->conexao->commit();

            return $idVeiculo;
        } catch (Throwable $erro) {
            if ($this->conexao->inTransaction()) {
                $this->conexao->rollBack();
            }

            throw $erro;
        }
    }

    // A transação pertence ao chamador: aquisição e vínculo da troca são atômicos.
    public function cadastrarEmTransacao(array $dados): array
    {
        if (!$this->conexao->inTransaction()) throw new LogicException('A entrada exige uma transação ativa.');
        if ((int) ($dados['id_usuario_responsavel'] ?? 0) <= 0) {
            throw new LogicException('A entrada exige um usuário responsável.');
        }
        $idVeiculo = $this->obterOuCadastrarVeiculo($dados);
        $idCiclo = $this->cadastrarCiclo($idVeiculo, $dados);
        $idAquisicao = $this->cadastrarAquisicao($idVeiculo, $idCiclo, $dados);
        $this->cadastrarNotaFiscal($idVeiculo, $idCiclo, $idAquisicao, $dados);
        $this->cadastrarMovimentacaoInicial($idCiclo, $dados);
        return ['id_veiculo'=>$idVeiculo, 'id_ciclo'=>$idCiclo, 'id_aquisicao'=>$idAquisicao];
    }

    public function atualizar(int $idVeiculo, array $dados, ?array $usuario = null): bool
    {
        $this->conexao->beginTransaction();

        try {
            $q = $this->conexao->prepare('SELECT * FROM veiculos WHERE id_veiculo=? FOR UPDATE');
            $q->execute([$idVeiculo]);$anterior = $q->fetch(PDO::FETCH_ASSOC);
            if (!$anterior) throw new InvalidArgumentException('Veículo não encontrado.');
            $q = $this->conexao->prepare('SELECT * FROM ciclos_veiculo WHERE id_veiculo=? AND data_encerramento IS NULL FOR UPDATE');
            $q->execute([$idVeiculo]);$ciclo = $q->fetch(PDO::FETCH_ASSOC);
            if (!$ciclo) throw new DomainException('O veículo não possui ciclo ativo. Atualize a consulta.');
            $corrigiuChassi = $dados['chassi'] !== $anterior['chassi'];
            $motivoChassi = '';
            if ($corrigiuChassi) {
                if (!$usuario || !Auth::podeCorrigirChassi($usuario) || (int)($usuario['id_usuario'] ?? 0) < 1) throw new DomainException('Somente Gestão/Diretoria pode corrigir o chassi.', 403);
                if (!is_string($dados['chassi']) || !preg_match('/^[A-Z0-9]{17}$/D', $dados['chassi'])) throw new InvalidArgumentException('O chassi deve possuir 17 caracteres alfanuméricos.');
                if (($dados['chassi_anterior'] ?? null) !== $anterior['chassi']) throw new DomainException('O chassi foi alterado por outro usuário. Atualize o veículo antes de corrigir.');
                $motivoChassi = $dados['motivo_correcao_chassi'] ?? '';
                if (!is_string($motivoChassi) || trim($motivoChassi) === '' || mb_strlen($motivoChassi) > 1000) throw new InvalidArgumentException('Informe o motivo da correção do chassi (até 1.000 caracteres).');
                $motivoChassi = trim($motivoChassi);
                $q = $this->conexao->prepare('SELECT id_veiculo FROM veiculos WHERE chassi=? AND id_veiculo<>? FOR UPDATE');
                $q->execute([$dados['chassi'], $idVeiculo]);
                if ($q->fetchColumn() !== false) throw new DomainException('Este chassi já pertence a outro veículo, inclusive no histórico. Confira o cadastro antes de corrigir.');
            }
            $this->conferirRenavam($dados['renavam'] ?? null, $dados['chassi'], $idVeiculo);
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

            if ($corrigiuChassi) {
                $observacao = 'Correção do chassi · Anterior: '.$anterior['chassi'].' · Corrigido: '.$dados['chassi'].' · Motivo: '.$motivoChassi;
                $q = $this->conexao->prepare('INSERT INTO movimentacoes_veiculo(id_ciclo,id_usuario_responsavel,situacao_anterior,situacao_nova,data_movimentacao,observacoes) VALUES(?,?,?,?,?,?)');
                $q->execute([$ciclo['id_ciclo'], (int)$usuario['id_usuario'], $ciclo['situacao_atual'], $ciclo['situacao_atual'], (new DateTimeImmutable('now',new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d H:i:s'), $observacao]);
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

    private function conferirRenavam(?string $renavam, string $chassi, ?int $idExcluir = null): void
    {
        if ($renavam === null || $renavam === '') return;
        // Na edição, a identidade é o ID persistido, nunca o chassi que está sendo corrigido.
        // Exclui todos os ciclos do próprio veículo, inclusive os já encerrados.
        $filtro = $idExcluir !== null ? 'v.id_veiculo<>?' : 'v.chassi<>?';
        $q = $this->conexao->prepare(
            'SELECT v.id_veiculo,v.marca,v.modelo,v.placa,c.nosso_numero
             FROM ciclos_veiculo c JOIN veiculos v ON v.id_veiculo=c.id_veiculo
             WHERE c.renavam=? AND '.$filtro.'
             ORDER BY (c.data_encerramento IS NULL) DESC,c.id_ciclo DESC LIMIT 1 FOR UPDATE'
        );
        $q->execute([$renavam, $idExcluir !== null ? $idExcluir : $chassi]);
        $conflito = $q->fetch(PDO::FETCH_ASSOC);
        if ($conflito !== false) {
            $identificacao = trim($conflito['marca'].' '.$conflito['modelo']);
            throw new InvalidArgumentException(
                'O RENAVAM informado já está vinculado a outro veículo: '.$identificacao.
                ' · Placa '.$conflito['placa'].' · '.$conflito['nosso_numero'].'. '.
                'Confira o RENAVAM dos dois cadastros antes de salvar. Os ciclos deste próprio veículo foram desconsiderados.'
            );
        }
    }

    private function obterOuCadastrarVeiculo(array $dados): int
    {
        $this->conferirRenavam($dados['renavam'] ?? null, $dados['chassi']);
        $placa = $this->conexao->prepare('SELECT chassi FROM veiculos WHERE placa=? FOR UPDATE');
        $placa->execute([$dados['placa']]);
        foreach ($placa->fetchAll(PDO::FETCH_COLUMN) as $chassi) {
            if ($chassi !== $dados['chassi']) throw new InvalidArgumentException('Esta placa está vinculada a outro chassi. Confira os documentos antes da entrada.');
        }
        $sqlBusca = "
            SELECT id_veiculo, chassi, marca, modelo, versao, ano_fabricacao, ano_modelo, combustivel, placa
            FROM veiculos
            WHERE chassi = :chassi
            LIMIT 1 FOR UPDATE
        ";

        $comandoBusca = $this->conexao->prepare($sqlBusca);

        $comandoBusca->execute([
            "chassi" => $dados["chassi"],
        ]);

        $veiculoExistente =
            $comandoBusca->fetch(PDO::FETCH_ASSOC);

        if ($veiculoExistente !== false) {
            IdentidadeVeiculoEntrada::validar($this->conexao, $veiculoExistente, $dados);
            // Preserva marca, placa e demais dados compartilhados com os ciclos antigos.
            return (int)$veiculoExistente['id_veiculo'];
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
                id_usuario_responsavel,
                valor_aquisicao,
                data_aquisicao,
                origem,
                situacao,
                data_conclusao
            ) VALUES (
                :id_ciclo,
                :id_veiculo,
                :id_usuario_responsavel,
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
            "id_usuario_responsavel" => $dados["id_usuario_responsavel"],
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
                $dados["id_usuario_responsavel"],
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
                $dados["id_usuario_responsavel"],
            "situacao_anterior" => "Fora do pátio",
            "situacao_nova" => "Disponível",
            "observacoes" =>
                IdentidadeVeiculoEntrada::descreverEntrada($dados, "Entrada do veículo no pátio."),
        ]);
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
                c.origem_movimento,
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
