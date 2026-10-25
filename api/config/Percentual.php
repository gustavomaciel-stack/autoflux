<?php
declare(strict_types=1);

final class Percentual
{
    public static function validar(mixed $valor, string $campo): string
    {
        if (!is_string($valor) && !is_int($valor) && !is_float($valor)) {
            throw new InvalidArgumentException($campo . ' é obrigatório.');
        }
        $texto = str_replace(',', '.', trim((string) $valor));
        if (!preg_match('/^[0-9]{1,3}(?:\.[0-9]{1,2})?$/D', $texto) || (float) $texto > 100) {
            throw new InvalidArgumentException($campo . ' deve estar entre 0 e 100, com até duas casas decimais.');
        }
        return number_format((float) $texto, 2, '.', '');
    }
}
