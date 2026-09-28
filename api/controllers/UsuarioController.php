<?php

declare(strict_types=1);

final class UsuarioController
{
    private Usuario $usuario;

    public function __construct(Usuario $usuario)
    {
        $this->usuario = $usuario;
    }

    public function listar(): void
    {
        try {
            $this->responder(200, [
                "sucesso" => true,
                "dados" =>
                    $this->usuario->listarTodos(),
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível listar os usuários.",
            ]);
        }
    }

    public function listarPerfis(): void
    {
        try {
            $this->responder(200, [
                "sucesso" => true,
                "dados" =>
                    $this->usuario->listarPerfisAtivos(),
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível listar os perfis.",
            ]);
        }
    }

    public function buscar(int $idUsuario): void
    {
        if ($idUsuario <= 0) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    "O usuário informado é inválido.",
            ]);

            return;
        }

        try {
            $usuario =
                $this->usuario->buscarPorId(
                    $idUsuario
                );

            if ($usuario === false) {
                $this->responder(404, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Usuário não encontrado.",
                ]);

                return;
            }

            $this->responder(200, [
                "sucesso" => true,
                "dados" => $usuario,
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível consultar o usuário.",
            ]);
        }
    }

    public function cadastrar(array $dados): void
    {
        try {
            [
                $dadosPreparados,
                $idsPerfis
            ] = $this->prepararDados(
                $dados,
                true
            );

            $idUsuario =
                $this->usuario->cadastrar(
                    $dadosPreparados,
                    $idsPerfis
                );

            $usuarioCadastrado =
                $this->usuario->buscarPorId(
                    $idUsuario
                );

            $this->responder(201, [
                "sucesso" => true,
                "mensagem" =>
                    "Usuário cadastrado com sucesso.",
                "dados" => $usuarioCadastrado,
            ]);
        } catch (InvalidArgumentException $erro) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" => $erro->getMessage(),
            ]);
        } catch (PDOException $erro) {
            if (
                $this->registroDuplicado($erro)
            ) {
                $this->responder(409, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Já existe um usuário com este e-mail ou login.",
                ]);

                return;
            }

            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível cadastrar o usuário.",
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível cadastrar o usuário.",
            ]);
        }
    }

    public function atualizar(
        int $idUsuario,
        array $dados
    ): void {
        if ($idUsuario <= 0) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    "O usuário informado é inválido.",
            ]);

            return;
        }

        try {
            $usuarioExistente =
                $this->usuario->buscarPorId(
                    $idUsuario
                );

            if ($usuarioExistente === false) {
                $this->responder(404, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Usuário não encontrado.",
                ]);

                return;
            }

            [
                $dadosPreparados,
                $idsPerfis
            ] = $this->prepararDados(
                $dados,
                false
            );

            $ultimoGestor =
                $this->usuario
                    ->ehUltimoGestorAtivo(
                        $idUsuario
                    );

            $gestaoContinuaSelecionada =
                $this->usuario
                    ->perfilGestaoSelecionado(
                        $idsPerfis
                    );

            if (
                $ultimoGestor &&
                !$gestaoContinuaSelecionada
            ) {
                $this->responder(422, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Não é possível remover o perfil Gestão/Diretoria do último usuário master ativo.",
                ]);

                return;
            }

            $this->usuario->atualizar(
                $idUsuario,
                $dadosPreparados,
                $idsPerfis
            );

            $usuarioAtualizado =
                $this->usuario->buscarPorId(
                    $idUsuario
                );

            $this->responder(200, [
                "sucesso" => true,
                "mensagem" =>
                    "Usuário atualizado com sucesso.",
                "dados" => $usuarioAtualizado,
            ]);
        } catch (InvalidArgumentException $erro) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" => $erro->getMessage(),
            ]);
        } catch (PDOException $erro) {
            if (
                $this->registroDuplicado($erro)
            ) {
                $this->responder(409, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Já existe outro usuário com este e-mail ou login.",
                ]);

                return;
            }

            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível atualizar o usuário.",
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível atualizar o usuário.",
            ]);
        }
    }

    public function alterarSituacao(
        int $idUsuario,
        array $dados
    ): void {
        if ($idUsuario <= 0) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    "O usuário informado é inválido.",
            ]);

            return;
        }

        if (!array_key_exists("ativo", $dados)) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    "Informe a nova situação do usuário.",
            ]);

            return;
        }

        $ativo = filter_var(
            $dados["ativo"],
            FILTER_VALIDATE_BOOLEAN,
            FILTER_NULL_ON_FAILURE
        );

        if ($ativo === null) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    "A situação informada é inválida.",
            ]);

            return;
        }

        try {
            $usuarioExistente =
                $this->usuario->buscarPorId(
                    $idUsuario
                );

            if ($usuarioExistente === false) {
                $this->responder(404, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Usuário não encontrado.",
                ]);

                return;
            }

            if (
                !$ativo &&
                $this->usuario
                    ->ehUltimoGestorAtivo(
                        $idUsuario
                    )
            ) {
                $this->responder(422, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Não é possível inativar o último usuário Gestão/Diretoria ativo.",
                ]);

                return;
            }

            $this->usuario->alterarSituacao(
                $idUsuario,
                $ativo
            );

            $this->responder(200, [
                "sucesso" => true,
                "mensagem" => $ativo
                    ? "Usuário reativado com sucesso."
                    : "Usuário inativado com sucesso.",
                "dados" =>
                    $this->usuario->buscarPorId(
                        $idUsuario
                    ),
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível alterar a situação do usuário.",
            ]);
        }
    }

    private function prepararDados(
        array $dados,
        bool $cadastro
    ): array {
        $nome = trim(
            (string) ($dados["nome"] ?? "")
        );

        if ($nome === "") {
            throw new InvalidArgumentException(
                "Informe o nome do usuário."
            );
        }

        if (strlen($nome) > 50) {
            throw new InvalidArgumentException(
                "O nome deve possuir no máximo 50 caracteres."
            );
        }

        $email = strtolower(
            trim(
                (string) ($dados["email"] ?? "")
            )
        );

        if (
            !filter_var(
                $email,
                FILTER_VALIDATE_EMAIL
            )
        ) {
            throw new InvalidArgumentException(
                "Informe um endereço de e-mail válido."
            );
        }

        if (strlen($email) > 100) {
            throw new InvalidArgumentException(
                "O e-mail deve possuir no máximo 100 caracteres."
            );
        }

        $login = strtolower(
            trim(
                (string) ($dados["login"] ?? "")
            )
        );

        if (
            strlen($login) < 3 ||
            strlen($login) > 50
        ) {
            throw new InvalidArgumentException(
                "O login deve possuir entre 3 e 50 caracteres."
            );
        }

        if (
            !preg_match(
                "/^[a-z0-9._-]+$/",
                $login
            )
        ) {
            throw new InvalidArgumentException(
                "O login pode conter apenas letras, números, ponto, hífen e sublinhado."
            );
        }

        $senha = (string)
            ($dados["senha"] ?? "");

        $senhaHash = null;

        if ($cadastro || $senha !== "") {
            if (strlen($senha) < 8) {
                throw new InvalidArgumentException(
                    "A senha deve possuir pelo menos 8 caracteres."
                );
            }

            $senhaHash = password_hash(
                $senha,
                PASSWORD_DEFAULT
            );

            if ($senhaHash === false) {
                throw new RuntimeException(
                    "Não foi possível proteger a senha."
                );
            }
        }

        $idsPerfis =
            $dados["ids_perfis"] ?? null;

        if (
            !is_array($idsPerfis) ||
            $idsPerfis === []
        ) {
            throw new InvalidArgumentException(
                "Selecione pelo menos um perfil."
            );
        }

        $idsPerfis = array_values(
            array_unique(
                array_map(
                    "intval",
                    $idsPerfis
                )
            )
        );

        foreach ($idsPerfis as $idPerfil) {
            if ($idPerfil <= 0) {
                throw new InvalidArgumentException(
                    "Um dos perfis selecionados é inválido."
                );
            }
        }

        if (
            !$this->usuario
                ->perfisAtivosExistem(
                    $idsPerfis
                )
        ) {
            throw new InvalidArgumentException(
                "Um dos perfis selecionados não existe ou está inativo."
            );
        }

        $percentualComissao =
            $dados["percentual_comissao"] ?? null;

        if (
            $percentualComissao === "" ||
            $percentualComissao === null
        ) {
            $percentualComissao = null;
        } elseif (
            !is_numeric($percentualComissao) ||
            (float) $percentualComissao < 0 ||
            (float) $percentualComissao > 100
        ) {
            throw new InvalidArgumentException(
                "O percentual de comissão deve estar entre 0 e 100."
            );
        } else {
            $percentualComissao = round(
                (float) $percentualComissao,
                2
            );
        }

        return [
            [
                "nome" => $nome,
                "email" => $email,
                "login" => $login,
                "senha_hash" => $senhaHash,
                "percentual_comissao" =>
                    $percentualComissao,
            ],
            $idsPerfis,
        ];
    }

    private function registroDuplicado(
        PDOException $erro
    ): bool {
        return (int)
            ($erro->errorInfo[1] ?? 0) === 1062;
    }

    private function responder(
        int $status,
        array $conteudo
    ): void {
        http_response_code($status);

        echo json_encode(
            $conteudo,
            JSON_UNESCAPED_UNICODE |
                JSON_UNESCAPED_SLASHES
        );
    }
}