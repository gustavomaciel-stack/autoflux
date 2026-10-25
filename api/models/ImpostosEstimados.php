<?php
declare(strict_types=1);
require_once __DIR__.'/../config/Percentual.php';
final class ImpostosEstimados {
 public static function validar(mixed $itens): array {
  $nomes=['ICMS','PIS','COFINS','CSLL','IRPJ'];
  if(!is_array($itens)||count($itens)!==count($nomes))throw new InvalidArgumentException('Informe os cinco impostos da venda.');
  $saida=[];$soma=0;
  foreach($nomes as $nome){
   $item=$itens[$nome]??null;
   if(!is_array($item))throw new InvalidArgumentException('Configuração de '.$nome.' inválida.');
   $base=Percentual::validar($item['base']??null,'Base de '.$nome);
   $aliquota=Percentual::validar($item['aliquota']??null,'Alíquota de '.$nome);
   $soma+=(int)round((float)$base*100)*(int)round((float)$aliquota*100);
   $saida[$nome]=['base'=>$base,'aliquota'=>$aliquota];
  }
  $total=(int)round($soma/10000);
  if($total>=10000)throw new InvalidArgumentException('A soma dos impostos deve ser inferior a 100%.');
  return ['itens'=>$saida,'total'=>number_format($total/100,2,'.','')];
 }
}
