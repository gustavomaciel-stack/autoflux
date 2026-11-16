<?php

declare(strict_types=1);

final class NotaFiscalEntradaController
{
    private NotaFiscalEntrada $notaFiscalEntrada;

    public function __construct(PDO $conexao)
    {
        $this->notaFiscalEntrada =
            new NotaFiscalEntrada($conexao);
    }

    public function listar(?array $filtros = null): void
    {
        try {
            $notasFiscais =
                $filtros === null ? $this->notaFiscalEntrada->listarTodos() : $this->notaFiscalEntrada->listarPagina($filtros);

            $this->responder(200, [
                "sucesso" => true,
                "dados" => $notasFiscais,
            ]);
        } catch (InvalidArgumentException $erro) {
            $this->responder(422, ["sucesso" => false, "mensagem" => $erro->getMessage()]);
        } catch (Throwable $erro) {
            error_log('Consulta de notas fiscais de entrada: '.$erro->getMessage());
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível listar as notas fiscais de entrada.",
            ]);
        }
    }

    public function buscar(
        int $idNotaFiscalEntrada
    ): void {
        if ($idNotaFiscalEntrada <= 0) {
            $this->responder(422, [
                "sucesso" => false,
                "mensagem" =>
                    "A nota fiscal informada é inválida.",
            ]);

            return;
        }

        try {
            $notaFiscal =
                $this->notaFiscalEntrada->buscarPorId(
                    $idNotaFiscalEntrada
                );

            if ($notaFiscal === false) {
                $this->responder(404, [
                    "sucesso" => false,
                    "mensagem" =>
                        "Nota fiscal de entrada não encontrada.",
                ]);

                return;
            }

            $this->responder(200, [
                "sucesso" => true,
                "dados" => $notaFiscal,
            ]);
        } catch (Throwable $erro) {
            $this->responder(500, [
                "sucesso" => false,
                "mensagem" =>
                    "Não foi possível consultar a nota fiscal de entrada.",
            ]);
        }
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