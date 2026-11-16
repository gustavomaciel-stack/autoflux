<?php
declare(strict_types=1);

/** Uma nova entrada não corrige a identidade compartilhada pelos ciclos anteriores. */
final class IdentidadeVeiculoEntrada
{
    public const CAMPOS = ['marca','modelo','versao','ano_fabricacao','ano_modelo','combustivel','placa'];

    private static function normalizar(mixed $valor): string
    {
        return mb_strtolower((string)preg_replace('/\s+/u', ' ', trim((string)$valor)), 'UTF-8');
    }

    public static function conferir(array $existente, array $dados): void
    {
        $nomes = ['marca'=>'marca','modelo'=>'modelo','versao'=>'versão','ano_fabricacao'=>'ano de fabricação','ano_modelo'=>'ano-modelo','combustivel'=>'combustível','placa'=>'placa'];
        $divergencias=[];
        foreach(self::CAMPOS as $campo){
            if(self::normalizar($existente[$campo]??'')!==self::normalizar($dados[$campo]??''))$divergencias[]=$nomes[$campo];
        }
        if($divergencias)throw new InvalidArgumentException('Este chassi já pertence a '.$existente['marca'].' '.$existente['modelo'].' · placa '.$existente['placa'].'. Dados divergentes: '.implode(', ', $divergencias).'. Confira os documentos. Uma nova entrada não pode substituir a identificação do veículo; correções devem ser revisadas pela Gestão.');
        $confirmacao=$dados['confirmacao_retorno']??null;
        if(!is_array($confirmacao)||(int)($confirmacao['id_veiculo']??0)!==(int)$existente['id_veiculo']||($confirmacao['chassi']??'')!==$existente['chassi'])throw new InvalidArgumentException('Confirme que este é o mesmo veículo retornando antes de registrar a nova entrada.');
        foreach(self::CAMPOS as $campo){
            if(!array_key_exists($campo,$confirmacao)||self::normalizar($confirmacao[$campo])!==self::normalizar($existente[$campo]??''))throw new InvalidArgumentException('O cadastro do veículo mudou. Consulte novamente o chassi e confirme o retorno.');
        }
    }

    public static function descreverEntrada(array $dados, string $texto): string
    {
        $identificacao=trim(($dados['marca']??'').' '.($dados['modelo']??'').' '.($dados['versao']??''));
        $texto.=' Identificação na entrada: '.$identificacao.' · placa '.($dados['placa']??'').' · chassi '.($dados['chassi']??'').' · '.($dados['ano_fabricacao']??'').'/'.($dados['ano_modelo']??'').' · '.($dados['combustivel']??'').'.';
        if(!empty($dados['confirmacao_retorno']))$texto.=' Retorno do mesmo veículo confirmado; cadastro e ciclos anteriores preservados.';
        $observacoes=trim((string)($dados['observacoes_veiculo']??$dados['observacoes']??''));
        if($observacoes!=='')$texto.=' Observações desta entrada: '.$observacoes;
        return $texto;
    }

    public static function validar(PDO $pdo, array $existente, array $dados): void
    {
        $q=$pdo->prepare('SELECT id_ciclo FROM ciclos_veiculo WHERE id_veiculo=? AND data_encerramento IS NULL LIMIT 1 FOR UPDATE');
        $q->execute([(int)$existente['id_veiculo']]);
        if($q->fetchColumn()!==false)throw new InvalidArgumentException('Este chassi já possui um ciclo ativo no pátio. Não é possível registrar outra entrada.');
        self::conferir($existente,$dados);
        $q=$pdo->prepare('SELECT renavam FROM ciclos_veiculo WHERE id_veiculo=? ORDER BY id_ciclo DESC LIMIT 1');
        $q->execute([(int)$existente['id_veiculo']]);$renavam=$q->fetchColumn();
        if($renavam!==false&&$renavam!==null&&$renavam!==''&&!empty($dados['renavam'])&&$renavam!==$dados['renavam'])throw new InvalidArgumentException('O RENAVAM diverge do histórico deste chassi. Confira os documentos e solicite revisão da Gestão antes de registrar o retorno.');
    }
}
