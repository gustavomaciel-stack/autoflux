<?php
declare(strict_types=1);

/** Normalização e conferência do formato, sem cálculo de dígitos verificadores. */
final class Cnpj
{
    public static function normalizar(string $valor): string
    {
        return (string) preg_replace('/[.\/\-\s]/', '', strtoupper(trim($valor)));
    }

    public static function valido(string $valor): bool
    {
        $cnpj = self::normalizar($valor);
        return preg_match('/^[A-Z0-9]{12}[0-9]{2}$/D', $cnpj) === 1;
    }
}
