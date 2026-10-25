<?php

declare(strict_types=1);

require_once __DIR__ . "/../config/Percentual.php";

final class Usuario
{
    private PDO $conexao;

    public function __construct(PDO $conexao)
    {
        $this->conexao = $conexao;
        $this->conexao->exec("SET time_zone = '-03:00'");
    }

    public function listarTodos(): array
    {
        $sql = "
            SELECT
                usuario.id_usuario,
                usuario.nome,
                usuario.email,
                usuario.login,
                usuario.ativo,
                usuario.data_cadastro,
                usuario.data_atualizacao,

                GROUP_CONCAT(
                    perfil.nome
                    ORDER BY perfil.nome
                    SEPARATOR '||'
                ) AS nomes_perfis

            FROM usuarios AS usuario

            LEFT JOIN usuarios_perfis AS associacao
                ON associacao.id_usuario =
                    usuario.id_usuario
                AND associacao.ativo = 1

            LEFT JOIN perfis AS perfil
                ON perfil.id_perfil =
                    associacao.id_perfil
                AND perfil.ativo = 1

            GROUP BY
                usuario.id_usuario,
                usuario.nome,
                usuario.email,
                usuario.login,
                usuario.ativo,
                usuario.data_cadastro,
                usuario.data_atualizacao

            ORDER BY usuario.nome
        ";

        $comando = $this->conexao->query($sql);

        $usuarios = $comando->fetchAll(
            PDO::FETCH_ASSOC
        );

        foreach ($usuarios as &$usuario) {
            $nomesPerfis =
                $usuario["nomes_perfis"];

            $usuario["perfis"] = $nomesPerfis
                ? explode("||", $nomesPerfis)
                : [];

            unset($usuario["nomes_perfis"]);
        }

        unset($usuario);
        $comissoes = $this->conexao->query('SELECT id_usuario, percentual_comissao FROM vendedores WHERE ativo = 1')->fetchAll(PDO::FETCH_KEY_PAIR);
        foreach ($usuarios as &$usuario) $usuario['percentual_comissao'] = $comissoes[$usuario['id_usuario']] ?? null;
        unset($usuario);
        return $usuarios;
    }

    public function buscarPorId(
        int $idUsuario
    ): array|false {
        $sql = "
            SELECT
                id_usuario,
                nome,
                email,
                login,
                ativo,
                data_cadastro,
                data_atualizacao
            FROM usuarios
            WHERE id_usuario = :id_usuario
            LIMIT 1
        ";

        $comando = $this->conexao->prepare($sql);

        $comando->execute([
            "id_usuario" => $idUsuario,
        ]);

        $usuario = $comando->fetch(
            PDO::FETCH_ASSOC
        );

        if ($usuario === false) {
            return false;
        }

        $usuario["perfis"] =
            $this->buscarPerfisDoUsuario(
                $idUsuario
            );

        $q = $this->conexao->prepare('SELECT percentual_comissao FROM vendedores WHERE id_usuario = ? AND ativo = 1');
        $q->execute([$idUsuario]);
        $comissao = $q->fetchColumn();
        $usuario['percentual_comissao'] = $comissao === false ? null : $comissao;
        return $usuario;
    }

    public function listarPerfisAtivos(): array
    {
        $sql = "
            SELECT
                id_perfil,
                nome,
                descricao
            FROM perfis
            WHERE ativo = 1
            ORDER BY nome
        ";

        $comando = $this->conexao->query($sql);

        return $comando->fetchAll(
            PDO::FETCH_ASSOC
        );
    }

    public function perfisAtivosExistem(
        array $idsPerfis
    ): bool {
        $idsPerfis = array_values(
            array_unique(
                array_map(
                    "intval",
                    $idsPerfis
                )
            )
        );

        if ($idsPerfis === []) {
            return false;
        }

        $marcadores = implode(
            ",",
            array_fill(
                0,
                count($idsPerfis),
                "?"
            )
        );

        $sql = "
            SELECT COUNT(*)
            FROM perfis
            WHERE ativo = 1
              AND id_perfil IN (
                  {$marcadores}
              )
        ";

        $comando =
            $this->conexao->prepare($sql);

        $comando->execute($idsPerfis);

        return
            (int) $comando->fetchColumn()
            === count($idsPerfis);
    }

    public function perfilGestaoSelecionado(
        array $idsPerfis
    ): bool {
        $idsPerfis = array_values(
            array_unique(
                array_map(
                    "intval",
                    $idsPerfis
                )
            )
        );

        if ($idsPerfis === []) {
            return false;
        }

        $marcadores = implode(
            ",",
            array_fill(
                0,
                count($idsPerfis),
                "?"
            )
        );

        $sql = "
            SELECT COUNT(*)
            FROM perfis
            WHERE ativo = 1
              AND nome = 'Gestão/Diretoria'
              AND id_perfil IN (
                  {$marcadores}
              )
        ";

        $comando =
            $this->conexao->prepare($sql);

        $comando->execute($idsPerfis);

        return
            (int) $comando->fetchColumn() > 0;
    }

    public function cadastrar(
        array $dados,
        array $idsPerfis
    ): int {
        $this->conexao->beginTransaction();

        try {
            $sql = "
                INSERT INTO usuarios (
                    nome,
                    email,
                    login,
                    senha_hash,
                    ativo
                ) VALUES (
                    :nome,
                    :email,
                    :login,
                    :senha_hash,
                    1
                )
            ";

            $comando =
                $this->conexao->prepare($sql);

            $comando->execute([
                "nome" => $dados["nome"],
                "email" => $dados["email"],
                "login" => $dados["login"],
                "senha_hash" =>
                    $dados["senha_hash"],
            ]);

            $idUsuario =
                (int) $this->conexao
                    ->lastInsertId();

            $this->adicionarPerfis(
                $idUsuario,
                $idsPerfis
            );

            $this->sincronizarComissao($idUsuario, $dados['percentual_comissao'] ?? null);
            $this->conexao->commit();

            return $idUsuario;
        } catch (Throwable $erro) {
            if (
                $this->conexao->inTransaction()
            ) {
                $this->conexao->rollBack();
            }

            throw $erro;
        }
    }

    public function atualizar(
        int $idUsuario,
        array $dados,
        array $idsPerfis
    ): bool {
        $this->conexao->beginTransaction();

        try {
            if ($dados["senha_hash"] !== null) {
                $sql = "
                    UPDATE usuarios
                    SET
                        nome = :nome,
                        email = :email,
                        login = :login,
                        senha_hash = :senha_hash
                    WHERE id_usuario =
                        :id_usuario
                ";

                $parametros = [
                    "id_usuario" => $idUsuario,
                    "nome" => $dados["nome"],
                    "email" => $dados["email"],
                    "login" => $dados["login"],
                    "senha_hash" =>
                        $dados["senha_hash"],
                ];
            } else {
                $sql = "
                    UPDATE usuarios
                    SET
                        nome = :nome,
                        email = :email,
                        login = :login
                    WHERE id_usuario =
                        :id_usuario
                ";

                $parametros = [
                    "id_usuario" => $idUsuario,
                    "nome" => $dados["nome"],
                    "email" => $dados["email"],
                    "login" => $dados["login"],
                ];
            }

            $comando =
                $this->conexao->prepare($sql);

            $resultado =
                $comando->execute($parametros);

            $this->sincronizarPerfis(
                $idUsuario,
                $idsPerfis
            );

            $this->sincronizarComissao($idUsuario, $dados['percentual_comissao'] ?? null);
            $this->conexao->commit();

            return $resultado;
        } catch (Throwable $erro) {
            if (
                $this->conexao->inTransaction()
            ) {
                $this->conexao->rollBack();
            }

            throw $erro;
        }
    }

    private function sincronizarComissao(int $idUsuario, mixed $percentual): void
    {
        $q = $this->conexao->prepare("SELECT COUNT(*) FROM usuarios_perfis up
            INNER JOIN perfis p ON p.id_perfil = up.id_perfil AND p.ativo = 1
            WHERE up.id_usuario = ? AND up.ativo = 1 AND LOWER(TRIM(p.nome)) IN ('vendedor','gestão','gestao','diretoria','gestão/diretoria','gestao/diretoria')");
        $q->execute([$idUsuario]);
        if ((int) $q->fetchColumn() === 0) {
            $q = $this->conexao->prepare('UPDATE vendedores SET ativo = 0 WHERE id_usuario = ?');
            $q->execute([$idUsuario]);
            return;
        }
        // Gestão também pode vender. Sem comissão informada, preserva a existente
        // ou começa em zero; o perfil Vendedor mantém a validação obrigatória.
        $q = $this->conexao->prepare("SELECT COUNT(*) FROM usuarios_perfis up JOIN perfis p ON p.id_perfil=up.id_perfil AND p.ativo=1 WHERE up.id_usuario=? AND up.ativo=1 AND LOWER(TRIM(p.nome))='vendedor'");
        $q->execute([$idUsuario]);
        $vendedor = (int)$q->fetchColumn() > 0;
        if (!$vendedor && ($percentual === null || $percentual === '')) {
            $q = $this->conexao->prepare('SELECT percentual_comissao FROM vendedores WHERE id_usuario=?');
            $q->execute([$idUsuario]);
            $existente = $q->fetchColumn();
            $percentual = $existente === false ? '0.00' : $existente;
        }
        $valor = Percentual::validar($percentual, 'Comissão do vendedor');
        $q = $this->conexao->prepare('INSERT INTO vendedores (id_usuario, percentual_comissao, ativo)
            VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE percentual_comissao = VALUES(percentual_comissao), ativo = 1');
        $q->execute([$idUsuario, $valor]);
    }

    public function alterarSituacao(
        int $idUsuario,
        bool $ativo
    ): bool {
        $sql = "
            UPDATE usuarios
            SET ativo = :ativo
            WHERE id_usuario = :id_usuario
        ";

        $comando =
            $this->conexao->prepare($sql);

        return $comando->execute([
            "id_usuario" => $idUsuario,
            "ativo" => $ativo ? 1 : 0,
        ]);
    }

    public function ehUltimoGestorAtivo(
        int $idUsuario
    ): bool {
        $sql = "
            SELECT
                EXISTS (
                    SELECT 1
                    FROM usuarios AS usuario

                    INNER JOIN usuarios_perfis
                        AS associacao
                        ON associacao.id_usuario =
                            usuario.id_usuario
                        AND associacao.ativo = 1

                    INNER JOIN perfis AS perfil
                        ON perfil.id_perfil =
                            associacao.id_perfil
                        AND perfil.ativo = 1

                    WHERE usuario.id_usuario =
                        :id_usuario
                      AND usuario.ativo = 1
                      AND perfil.nome =
                          'Gestão/Diretoria'
                ) AS usuario_e_gestor,

                (
                    SELECT COUNT(
                        DISTINCT
                        usuario_ativo.id_usuario
                    )

                    FROM usuarios
                        AS usuario_ativo

                    INNER JOIN usuarios_perfis
                        AS associacao_ativa
                        ON associacao_ativa.id_usuario =
                            usuario_ativo.id_usuario
                        AND associacao_ativa.ativo = 1

                    INNER JOIN perfis
                        AS perfil_ativo
                        ON perfil_ativo.id_perfil =
                            associacao_ativa.id_perfil
                        AND perfil_ativo.ativo = 1

                    WHERE usuario_ativo.ativo = 1
                      AND perfil_ativo.nome =
                          'Gestão/Diretoria'
                ) AS total_gestores
        ";

        $comando =
            $this->conexao->prepare($sql);

        $comando->execute([
            "id_usuario" => $idUsuario,
        ]);

        $resultado = $comando->fetch(
            PDO::FETCH_ASSOC
        );

        if ($resultado === false) {
            return false;
        }

        return
            (bool) $resultado["usuario_e_gestor"]
            && (int) $resultado["total_gestores"]
                <= 1;
    }

    private function buscarPerfisDoUsuario(
        int $idUsuario
    ): array {
        $sql = "
            SELECT
                perfil.id_perfil,
                perfil.nome

            FROM usuarios_perfis
                AS associacao

            INNER JOIN perfis AS perfil
                ON perfil.id_perfil =
                    associacao.id_perfil

            WHERE associacao.id_usuario =
                :id_usuario
              AND associacao.ativo = 1
              AND perfil.ativo = 1

            ORDER BY perfil.nome
        ";

        $comando =
            $this->conexao->prepare($sql);

        $comando->execute([
            "id_usuario" => $idUsuario,
        ]);

        return $comando->fetchAll(
            PDO::FETCH_ASSOC
        );
    }

    private function adicionarPerfis(
        int $idUsuario,
        array $idsPerfis
    ): void {
        $sql = "
            INSERT INTO usuarios_perfis (
                id_usuario,
                id_perfil,
                data_associacao,
                data_encerramento,
                ativo
            ) VALUES (
                :id_usuario,
                :id_perfil,
                CURRENT_TIMESTAMP,
                NULL,
                1
            )
            ON DUPLICATE KEY UPDATE
                ativo = 1,
                data_associacao =
                    CURRENT_TIMESTAMP,
                data_encerramento = NULL
        ";

        $comando =
            $this->conexao->prepare($sql);

        $idsPerfis = array_unique(
            array_map(
                "intval",
                $idsPerfis
            )
        );

        foreach ($idsPerfis as $idPerfil) {
            $comando->execute([
                "id_usuario" => $idUsuario,
                "id_perfil" => $idPerfil,
            ]);
        }
    }

    private function sincronizarPerfis(
        int $idUsuario,
        array $novosIds
    ): void {
        $novosIds = array_values(
            array_unique(
                array_map(
                    "intval",
                    $novosIds
                )
            )
        );

        $sql = "
            SELECT id_perfil
            FROM usuarios_perfis
            WHERE id_usuario = :id_usuario
              AND ativo = 1
        ";

        $comando =
            $this->conexao->prepare($sql);

        $comando->execute([
            "id_usuario" => $idUsuario,
        ]);

        $idsAtuais = array_map(
            "intval",
            $comando->fetchAll(
                PDO::FETCH_COLUMN
            )
        );

        $idsRemovidos = array_values(
            array_diff(
                $idsAtuais,
                $novosIds
            )
        );

        $idsAdicionados = array_values(
            array_diff(
                $novosIds,
                $idsAtuais
            )
        );

        if ($idsRemovidos !== []) {
            $marcadores = implode(
                ",",
                array_fill(
                    0,
                    count($idsRemovidos),
                    "?"
                )
            );

            $sqlEncerrar = "
                UPDATE usuarios_perfis
                SET
                    ativo = 0,
                    data_encerramento =
                        CURRENT_TIMESTAMP
                WHERE id_usuario = ?
                  AND ativo = 1
                  AND id_perfil IN (
                      {$marcadores}
                  )
            ";

            $comandoEncerrar =
                $this->conexao->prepare(
                    $sqlEncerrar
                );

            $comandoEncerrar->execute(
                array_merge(
                    [$idUsuario],
                    $idsRemovidos
                )
            );
        }

        if ($idsAdicionados !== []) {
            $this->adicionarPerfis(
                $idUsuario,
                $idsAdicionados
            );
        }
    }
}