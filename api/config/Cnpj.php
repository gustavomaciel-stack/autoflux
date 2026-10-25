<?php
declare(strict_types=1);

/** Regra do DV publicada pela Receita Federal: valor ASCII do caractere - 48. */
final class Cnpj
{
    public static function normalizar(string $valor): string
    {
        return (string) preg_replace('/[.\/\-\s]/', '', strtoupper(trim($valor)));
    }

    public static function valido(string $valor): bool
    {
        $cnpj = self::normalizar($valor);
        if (!preg_match('/^[A-Z0-9]{12}[0-9]{2}$/D', $cnpj)) return false;
        if (preg_match('/^([0-9])\1{13}$/D', $cnpj)) return false;
        foreach ([12 => [5,4,3,2,9,8,7,6,5,4,3,2], 13 => [6,5,4,3,2,9,8,7,6,5,4,3,2]] as $posicao => $pesos) {
            $soma = 0;
            foreach ($pesos as $i => $peso) $soma += (ord($cnpj[$i]) - 48) * $peso;
            $resto = $soma % 11;
            $dv = $resto < 2 ? 0 : 11 - $resto;
            if ($dv !== (int) $cnpj[$posicao]) return false;
        }
        return true;
    }
}
