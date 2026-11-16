<?php
declare(strict_types=1);
require_once __DIR__.'/GarantiaVenda.php';
require_once __DIR__.'/Empresa.php';

/** Consultas sem mutações. Valores somados em centavos; resultados originais nunca são somados aos atualizados. */
final class AnaliseGerencial {
    public function __construct(private PDO $pdo) {}
    private function rows(string $sql):array {return $this->pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);}
    public static function cents(mixed $v):int {
        $s=(string)$v;$neg=str_starts_with($s,'-');
        return ($neg?-1:1)*Orcamento::centavos($neg?substr($s,1):$s);
    }
    private static function money(int $v):string {return Orcamento::moeda($v);}
    public static function filtros(array $f):array {
        $out=[];
        foreach(['inicio','fim'] as $k){
            $s=Orcamento::texto($f[$k]??'',10);$d=DateTimeImmutable::createFromFormat('!Y-m-d',$s);
            if($s!==''&&(!$d||$d->format('Y-m-d')!==$s))throw new InvalidArgumentException('Informe um período válido.');
            $out[$k]=$s;
        }
        if($out['inicio']!==''&&$out['fim']!==''&&$out['inicio']>$out['fim'])throw new InvalidArgumentException('A data inicial deve ser anterior à final.');
        foreach(['busca'=>120,'modelo'=>80,'ano'=>4,'origem'=>20,'vendedor'=>100] as $k=>$max)$out[$k]=Orcamento::texto($f[$k]??'',$max);
        if($out['ano']!==''&&!preg_match('/^(19|20|21)\d{2}$/',$out['ano']))throw new InvalidArgumentException('Informe o ano com quatro dígitos.');
        if(!in_array($out['origem'],['','Próprio','Consignado'],true))throw new InvalidArgumentException('Origem inválida.');
        return $out;
    }
    private static function contem(string $s,string $q):bool {return $q===''||mb_stripos($s,$q,0,'UTF-8')!==false;}
    private static function corresponde(array $r,array $f,bool $periodo=true):bool {
        $data=substr((string)($r['data']??''),0,10);
        if($periodo&&(($f['inicio']!==''&&$data<$f['inicio'])||($f['fim']!==''&&$data>$f['fim'])))return false;
        if(!self::contem(implode(' ',array_map(fn($k)=>(string)($r[$k]??''),['veiculo','placa','numero','pedido','cliente'])),$f['busca']))return false;
        if(!self::contem((string)($r['veiculo']??''),$f['modelo']))return false;
        if($f['ano']!==''&&!in_array($f['ano'],explode('/',(string)($r['ano']??'')),true))return false;
        if($f['origem']!==''&&($r['origem']??'')!==$f['origem'])return false;
        return self::contem((string)($r['vendedor']??''),$f['vendedor']);
    }
    private static function filtrarCadeias(array $cadeias,array $f):array {
        // Abertas ignoram o início, mas não aparecem antes da venda que iniciou a cadeia.
        return array_values(array_filter($cadeias,function($r)use($f){
            if(($r['situacao']??'')!=='Em aberto')return self::corresponde($r,$f);
            $data=substr((string)($r['data']??''),0,10);
            return ($f['fim']===''||$data<=$f['fim'])&&self::corresponde($r,$f,false);
        }));
    }
    private static function soma(array $rs,string $campo):string {return self::money(array_sum(array_map(fn($r)=>isset($r[$campo])?self::cents($r[$campo]):0,$rs)));}
    private static function somaResultados(array $rs):?string {return $rs&&!array_filter($rs,fn($r)=>$r['resultado']!==null)?null:self::soma($rs,'resultado');}
    private static function col(string $key,string $label,string $type='text'):array {return compact('key','label','type');}
    private static function indicador(string $label,mixed $value,string $type='money'):array {return compact('label','value','type');}

    /** Leituras em lote, inclusive custos de garantia vinculados a despesas já existentes. */
    public function carregar():array {
        $ciclos=[];
        foreach($this->rows('SELECT c.id_ciclo,c.nosso_numero,c.origem_entrada,c.origem_movimento,c.situacao_atual,c.data_entrada,c.data_encerramento,v.marca,v.modelo,v.placa,v.ano_fabricacao,v.ano_modelo,a.valor_aquisicao,a.data_aquisicao,a.origem origem_aquisicao,co.valor_repasse_acordado FROM ciclos_veiculo c JOIN veiculos v ON v.id_veiculo=c.id_veiculo LEFT JOIN aquisicoes a ON a.id_ciclo=c.id_ciclo LEFT JOIN consignacoes co ON co.id_ciclo=c.id_ciclo ORDER BY c.id_ciclo DESC') as $c){
            $cons=mb_strtolower($c['origem_entrada'],'UTF-8')==='consignação';
            $ciclos[(int)$c['id_ciclo']]=['id_ciclo'=>(int)$c['id_ciclo'],'numero'=>$c['nosso_numero'],'veiculo'=>$c['marca'].' '.$c['modelo'],'placa'=>$c['placa'],'ano'=>$c['ano_fabricacao'].'/'.$c['ano_modelo'],'origem'=>$cons?'Consignado':'Próprio','situacao'=>$c['situacao_atual'],'data'=>$c['data_entrada'],'encerramento'=>$c['data_encerramento'],'data_aquisicao'=>$c['data_aquisicao'],'origem_movimento'=>$c['origem_movimento'],'origem_aquisicao'=>$c['origem_aquisicao'],'aquisicao'=>$cons?null:$c['valor_aquisicao'],'repasse'=>$cons?$c['valor_repasse_acordado']:null,'despesas'=>'0.00','proprietario'=>'0.00','descontos'=>'0.00','previsoes'=>'0.00'];
        }
        $retornos=[];$ciclosAnteriores=[];
        foreach($this->rows('SELECT id_ciclo_origem,id_ciclo_retorno FROM cancelamentos_venda_autoflux WHERE id_ciclo_retorno IS NOT NULL') as $retorno){
            $origem=(int)$retorno['id_ciclo_origem'];$destino=(int)$retorno['id_ciclo_retorno'];
            $retornos[$origem]=$destino;
            if($origem<$destino)$ciclosAnteriores[$destino][]=$origem;
        }
        $custosPorCiclo=[];
        $despesas=[];$realizados=[];
        foreach($this->rows('SELECT d.*,f.razao_social_nome fornecedor FROM despesas_veiculo d LEFT JOIN fornecedores f ON f.id_fornecedor=d.id_fornecedor WHERE d.ativo=1 ORDER BY d.data_despesa DESC,d.id_despesa DESC') as $d){
            $id=(int)$d['id_ciclo'];if(!isset($ciclos[$id]))continue;
            $c=$ciclos[$id];$resp=$d['responsavel_despesa']??'Revenda';
            $campo=$resp==='Revenda'?'despesas':(str_contains(mb_strtolower($resp),'desconto')?'descontos':'proprietario');
            $ciclos[$id][$campo]=self::money(self::cents($c[$campo])+self::cents($d['valor']));
            if($d['responsavel_despesa']==='Revenda'||($d['responsavel_despesa']===null&&$c['origem']==='Próprio')){
                $custosPorCiclo[$id]=($custosPorCiclo[$id]??0)+self::cents($d['valor']);
            }
            $realizados[(int)$d['id_despesa']]=$d;
            $despesas[]=array_merge($c,['data'=>$d['data_despesa'],'descricao'=>$d['descricao'],'categoria'=>$d['categoria'],'fornecedor'=>$d['fornecedor']??'Não informado','responsavel'=>$resp,'valor'=>$d['valor'],'tipo'=>'Despesa do ciclo']);
        }
        foreach($this->rows("SELECT id_ciclo,valor_previsto,responsavel_despesa FROM despesas_previstas WHERE ativo=1 AND situacao='Pendente' AND id_despesa_realizada IS NULL AND id_ciclo IS NOT NULL") as $p){
            $id=(int)$p['id_ciclo'];if(isset($ciclos[$id])&&($p['responsavel_despesa']??'Revenda')==='Revenda')$ciclos[$id]['previsoes']=self::money(self::cents($ciclos[$id]['previsoes'])+self::cents($p['valor_previsto']));
        }
        foreach($ciclos as &$c){$c['investido']=$c['aquisicao']===null&&$c['origem']==='Próprio'?null:self::money(self::cents($c['aquisicao']??'0')+self::cents($c['despesas']));$c['projetado']=$c['investido']===null?null:self::money(self::cents($c['investido'])+self::cents($c['previsoes']));}unset($c);
        $garantia=[];
        foreach($this->rows('SELECT g.*,f.razao_social_nome fornecedor FROM despesas_garantia_autoflux g LEFT JOIN fornecedores f ON f.id_fornecedor=g.id_fornecedor WHERE g.ativo=1') as $g){
            $id=(int)$g['id_pedido'];$garantia[$id]??=['novas'=>0,'substituidas'=>[]];
            $d=$g['id_despesa_ciclo']!==null?($realizados[(int)$g['id_despesa_ciclo']]??null):null;
            if($g['id_despesa_ciclo']!==null&&!$d)continue;
            $loja=$d?($d['responsavel_despesa']??'Revenda')==='Revenda':$g['responsavel_custo']==='Revenda';
            if($loja){if(!$d)$garantia[$id]['novas']+=self::cents($g['valor']);if($g['previsao_indice']!==null)$garantia[$id]['substituidas'][]=(int)$g['previsao_indice'];}
            // Registros vinculados já estão no relatório de despesas do ciclo.
            if(!$d)$despesas[]=['id_pedido'=>$id,'data'=>$g['data_despesa'],'descricao'=>$g['descricao'],'categoria'=>'Garantia','fornecedor'=>$g['fornecedor']??'Não informado','responsavel'=>$g['responsavel_custo'],'valor'=>$g['valor'],'tipo'=>'Pós-venda'];
        }
        $vendas=[];$cancelados=[];
        foreach($this->rows('SELECT p.id_pedido,p.id_ciclo,p.numero_pedido,p.situacao,p.data_cancelamento,p.valor_negociado,p.snapshot pedido_snapshot,o.numero_orcamento,f.data_venda,f.valor_final,f.comissao_valor,f.snapshot FROM pedidos_venda_autoflux p LEFT JOIN orcamentos o ON o.id_orcamento=p.id_orcamento LEFT JOIN vendas_fechamento_autoflux f ON f.id_pedido=p.id_pedido WHERE p.situacao IN (\'Concluído\',\'Cancelado\') ORDER BY COALESCE(f.data_venda,p.data_cancelamento) DESC') as $p){
            $s=json_decode($p['pedido_snapshot'],true,512,JSON_THROW_ON_ERROR);$id=(int)$p['id_pedido'];
            $r=array_merge($ciclos[(int)$p['id_ciclo']]??[],['id_pedido'=>$id,'id_vendedor'=>(int)($s['id_vendedor']??0),'pedido'=>$p['numero_pedido'],'numero_orcamento'=>$s['numero_orcamento']??$p['numero_orcamento'],'nosso_numero'=>$s['nosso_numero']??($ciclos[(int)$p['id_ciclo']]['numero']??null),'veiculo'=>isset($s['marca'],$s['modelo'])?$s['marca'].' '.$s['modelo']:($ciclos[(int)$p['id_ciclo']]['veiculo']??'Não informado'),'placa'=>$s['placa']??($ciclos[(int)$p['id_ciclo']]['placa']??null),'cliente'=>$s['cliente']??'Não informado','vendedor'=>$s['vendedor']??'Não informado','data'=>$p['situacao']==='Cancelado'?$p['data_cancelamento']:$p['data_venda'],'situacao'=>$p['situacao'],'valor'=>$p['valor_final']??$p['valor_negociado'],'resultado'=>null,'resultado_original'=>null,'margem'=>null,'comissao'=>$p['comissao_valor'],'impostos'=>null,'classificacao'=>'Cancelado']);
            if($p['situacao']==='Cancelado'){$cancelados[]=$r;continue;}
            $base=GarantiaVenda::baseHistorica($p);
            $g=$garantia[$id]??['novas'=>0,'substituidas'=>[]];
            if($base){
                $custo=0;$vistos=[];$pendentes=[(int)$p['id_ciclo']];
                while($pendentes){
                    $ciclo=array_pop($pendentes);
                    if(isset($vistos[$ciclo]))continue;
                    $vistos[$ciclo]=true;
                    $custo+=$custosPorCiclo[$ciclo]??0;
                    array_push($pendentes,...($ciclosAnteriores[$ciclo]??[]));
                }
                $a=GarantiaVenda::apurar($base,$p['valor_final'],$custo,$g['novas'],$g['substituidas']);
                $r['resultado']=$a['resultado_atualizado'];$r['resultado_original']=$a['resultado_fechamento'];$r['custo_origem']=$base['custo_origem'];$r['impostos']=$base['impostos_estimados'];$r['previsoes']=$a['previsoes_pendentes'];$r['garantia_nova']=self::money($g['novas']);
                $r['margem']=self::cents($p['valor_final'])?number_format(self::cents($r['resultado'])/self::cents($p['valor_final'])*100,2,'.',''):null;
            }
            $r['classificacao']=$base?'Realizado':'Resultado indisponível';$vendas[$id]=$r;
        }
        // Completa a identidade dos gastos novos de pós-venda a partir do pedido, sem somá-los duas vezes.
        foreach($despesas as &$d)if(isset($d['id_pedido'],$vendas[$d['id_pedido']]))$d=array_merge(array_intersect_key($vendas[$d['id_pedido']],array_flip(['id_ciclo','numero','veiculo','ano','origem','placa','pedido','cliente','vendedor'])),$d);unset($d);
        $trocas=$this->rows('SELECT r.id_recebimento,r.id_pedido,r.valor_atribuido,r.snapshot,r.situacao situacao_recebimento,e.id_ciclo FROM trocas_recebidas_autoflux r JOIN pedidos_venda_autoflux p ON p.id_pedido=r.id_pedido AND p.situacao=\'Concluído\' LEFT JOIN entradas_troca_autoflux e ON e.id_recebimento=r.id_recebimento');
        // Uma revenda cancelada pode retornar em outro ciclo. Segue esse vínculo até a revenda válida.
        foreach($trocas as &$troca){$vistos=[];while($troca['id_ciclo']!==null&&isset($retornos[(int)$troca['id_ciclo']])){if(isset($vistos[(int)$troca['id_ciclo']]))throw new DomainException('Vínculo circular em retornos de veículos.');$vistos[(int)$troca['id_ciclo']]=true;$troca['id_ciclo']=$retornos[(int)$troca['id_ciclo']];}}unset($troca);
        $cadeias=self::cadeias($vendas,$trocas,$ciclos);
        $orcamentos=$this->rows('SELECT o.*,c.nosso_numero,v.marca,v.modelo,v.placa,cli.nome_razao_social cliente,u.nome vendedor FROM orcamentos o JOIN ciclos_veiculo c ON c.id_ciclo=o.id_ciclo JOIN veiculos v ON v.id_veiculo=c.id_veiculo JOIN clientes cli ON cli.id_cliente=o.id_cliente JOIN vendedores vd ON vd.id_vendedor=o.id_vendedor JOIN usuarios u ON u.id_usuario=vd.id_usuario ORDER BY o.data_orcamento DESC');
        $map=[];foreach($orcamentos as &$o){$o=array_merge($ciclos[(int)$o['id_ciclo']]??[],$o,['numero'=>$o['numero_orcamento'],'veiculo'=>$o['marca'].' '.$o['modelo'],'data'=>$o['data_orcamento'],'valor'=>$o['valor_negociado_atual']??null]);$map[(int)$o['id_orcamento']]=$o;}unset($o);
        $negociacoes=[];
        foreach($this->rows('SELECT n.*,u.nome responsavel FROM negociacoes_orcamento n LEFT JOIN usuarios u ON u.id_usuario=n.id_usuario_responsavel ORDER BY n.id_negociacao DESC') as $n){
            if(!isset($map[(int)$n['id_orcamento']]))continue;
            $negociacoes[]=array_merge($map[(int)$n['id_orcamento']],['data'=>$n['data_negociacao'],'tipo'=>$n['tipo_registro'],'valor'=>$n['valor_proposto'],'resultado_previsto'=>$n['resultado_previsto'],'margem_prevista'=>$n['margem_prevista'],'responsavel'=>$n['responsavel'],'observacoes'=>$n['observacoes']]);
        }
        return compact('ciclos','despesas','vendas','cancelados','cadeias','orcamentos','negociacoes');
    }

    /** Uma cadeia é exibida separadamente; nunca é acrescentada aos resultados individuais. */
    public static function cadeias(array &$vendas,array $trocas,array $ciclos=[]):array {
        $porCiclo=[];foreach($vendas as $id=>$v)$porCiclo[(int)$v['id_ciclo']]=$id;
        $filhos=[];$pais=[];
        foreach($trocas as $t){$p=(int)$t['id_pedido'];$filho=$t['id_ciclo']!==null?($porCiclo[(int)$t['id_ciclo']]??null):null;$filhos[$p][]=$filho;if($filho!==null){if(isset($pais[$filho])&&$pais[$filho]!==$p)throw new DomainException('Vínculo duplicado na cadeia de trocas.');$pais[$filho]=$p;}}
        $recebidas=[];
        foreach($trocas as $t){
            $oferta=json_decode($t['snapshot']??'{}',true)??[];
            $ciclo=$ciclos[(int)$t['id_ciclo']]??[];
            $revenda=$vendas[$porCiclo[(int)$t['id_ciclo']]??0]??null;
            $origem=$vendas[(int)$t['id_pedido']]??[];
            $recebidas[(int)$t['id_pedido']][]=[
                'id_recebimento'=>$t['id_recebimento']??null,
                'veiculo'=>$ciclo['veiculo']??trim(($oferta['marca']??'').' '.($oferta['modelo']??'')),
                'placa'=>$ciclo['placa']??$oferta['placa']??null,
                'numero'=>$ciclo['numero']??null,
                'pedido_origem'=>$origem['pedido']??null,
                'valor_atribuido'=>$t['valor_atribuido']??null,
                'situacao'=>$revenda?'Vendido':($ciclo['situacao']??$t['situacao_recebimento']??'Pendente de entrada'),
                'pedido_revenda'=>$revenda['pedido']??null,
                'id_pedido_revenda'=>$revenda['id_pedido']??null,
                'valor_revenda'=>$revenda['valor']??null,
            ];
        }
        $visitar=function(int $id,array $caminho=[])use(&$visitar,$filhos,$vendas):array{
            if(isset($caminho[$id]))throw new DomainException('Vínculo circular na cadeia de trocas.');$caminho[$id]=true;
            $saida=['ids'=>[$id],'pendentes'=>0];
            foreach($filhos[$id]??[] as $filho){if($filho===null){$saida['pendentes']++;continue;}$s=$visitar($filho,$caminho);$saida['ids']=array_merge($saida['ids'],$s['ids']);$saida['pendentes']+=$s['pendentes'];}
            return $saida;
        };
        foreach($vendas as $id=>&$v){$s=$visitar($id);if($s['pendentes']>0&&$v['resultado']!==null)$v['classificacao']='Estimado';}unset($v);
        $out=[];foreach($vendas as $id=>$v){if(isset($pais[$id])||!isset($filhos[$id]))continue;$s=$visitar($id);$ids=array_unique($s['ids']);$itens=array_values(array_map(fn($i)=>$vendas[$i],$ids));$veiculosTroca=[];foreach($ids as $operacao)array_push($veiculosTroca,...($recebidas[$operacao]??[]));$datas=array_column($itens,'data');sort($datas);$sem=count(array_filter($itens,fn($r)=>$r['resultado']===null));
            $out[]=array_merge($v,['numero'=>$v['pedido'],'data'=>$s['pendentes']?$v['data']:end($datas),'situacao'=>$s['pendentes']?'Em aberto':'Finalizada','classificacao'=>$s['pendentes']?'Estimada':'Finalizada','operacoes'=>count($itens),'pendentes'=>$s['pendentes'],'resultado'=>$sem?null:self::soma($itens,'resultado'),'margem'=>null,'vinculos'=>implode(' → ',array_column($itens,'pedido')),'itens'=>$itens,'veiculos_troca'=>$veiculosTroca]);
        }
        return $out;
    }

    public function consultar(array $entrada):array {
        $f=self::filtros($entrada);$tipo=Orcamento::texto($entrada['tipo']??'vendas',30);
        if(!in_array($tipo,['dashboard','veiculos','aquisicoes','despesas','orcamentos','negociacoes','vendas','vendedores','cadeias'],true))throw new InvalidArgumentException('Análise inválida.');
        // Consistência entre leituras, sem bloquear ou alterar os registros operacionais.
        $this->pdo->beginTransaction();
        try{$d=$this->carregar();$this->pdo->commit();}catch(Throwable $e){if($this->pdo->inTransaction())$this->pdo->rollBack();throw $e;}
        $filtrar=fn(array $rs,bool $periodo=true)=>array_values(array_filter($rs,fn($r)=>self::corresponde($r,$f,$periodo)));
        $vendidas=$filtrar($d['vendas']);$canceladas=$filtrar($d['cancelados']);
        $validas=array_values(array_filter($vendidas,fn($r)=>$r['resultado']!==null));
        $baseMargem=self::cents(self::soma($validas,'valor'));$margem=$baseMargem?number_format(self::cents(self::soma($validas,'resultado'))/$baseMargem*100,2,'.',''):null;
        $resumoVendas=[self::indicador('Vendas concluídas',count($vendidas),'number'),self::indicador('Valor das vendas',self::soma($vendidas,'valor')),self::indicador(count($validas)<count($vendidas)?'Resultado disponível (parcial)':'Resultado atualizado',count($vendidas)>0&&count($validas)===0?null:self::soma($validas,'resultado')),self::indicador('Pedidos cancelados',count($canceladas),'number')];
        $avisos=[];$sem=count($vendidas)-count($validas);if($sem)$avisos[]="$sem venda(s) sem composição histórica suficiente. O resultado e a margem dessas operações não entram nos totais.";
        $estimadas=count(array_filter($vendidas,fn($r)=>$r['classificacao']==='Estimado'));if($estimadas)$avisos[]="$estimadas venda(s) com resultado estimado: há veículos recebidos em troca ainda não vendidos.";
        if($tipo==='dashboard'){
            // Estoque atual não recebe filtro por data nem vendedor: não é uma posição histórica.
            $ff=$f;$ff['vendedor']='';$estoque=array_values(array_filter($d['ciclos'],fn($r)=>$r['encerramento']===null&&!in_array($r['situacao'],['Vendido','Devolvido','Cancelado'],true)&&self::corresponde($r,$ff,false)));
            $situacoes=[];foreach($estoque as $r)$situacoes[$r['situacao']]=($situacoes[$r['situacao']]??0)+1;
            $proprios=array_values(array_filter($estoque,fn($r)=>$r['origem']==='Próprio'));$faltantes=count(array_filter($proprios,fn($r)=>$r['aquisicao']===null));if($faltantes)$avisos[]="$faltantes veículo(s) próprio(s) ativo(s) sem valor de aquisição. Investimento parcial até regularização.";
            $meses=[];foreach($vendidas as $v){$m=substr($v['data'],0,7);$meses[$m]??=['mes'=>$m,'quantidade'=>0,'valor'=>'0.00','resultado'=>'0.00','resultados_disponiveis'=>0];$meses[$m]['quantidade']++;if($v['resultado']!==null)$meses[$m]['resultados_disponiveis']++;foreach(['valor','resultado'] as $key)if($v[$key]!==null)$meses[$m][$key]=self::money(self::cents($meses[$m][$key])+self::cents($v[$key]));}foreach($meses as &$mes)if($mes['resultados_disponiveis']===0)$mes['resultado']=null;unset($mes);ksort($meses);
            return ['tipo'=>$tipo,'filtros'=>$f,'gerado_em'=>date('Y-m-d H:i:s'),'avisos'=>$avisos,'estoque'=>[self::indicador('Veículos ativos',count($estoque),'number'),self::indicador('Capital em aquisições próprias',self::soma($proprios,'aquisicao')),self::indicador('Despesas realizadas da loja',self::soma($estoque,'despesas')),self::indicador('Previsões pendentes da loja',self::soma($estoque,'previsoes')),self::indicador('Total investido',self::soma($estoque,'investido')),self::indicador('Total projetado',self::soma($estoque,'projetado'))],'situacoes'=>$situacoes,'vendas'=>$resumoVendas,'resultados'=>[self::indicador('Resultados realizados',self::soma(array_filter($validas,fn($r)=>$r['classificacao']==='Realizado'),'resultado')),self::indicador('Resultados estimados',self::soma(array_filter($validas,fn($r)=>$r['classificacao']==='Estimado'),'resultado')),self::indicador('Margem sobre vendas',$margem,'percent')],'meses'=>array_values($meses),'vendedores'=>self::vendedores($vendidas),'cadeias'=>self::filtrarCadeias($d['cadeias'],$f)];
        }
        $ident=[self::col('numero','Nosso número'),self::col('veiculo','Veículo'),self::col('ano','Ano'),self::col('origem','Origem')];
        $din=fn($key,$label)=>self::col($key,$label,'money');$data=self::col('data','Data','date');
        $notas=[];$resumo=[];$identificacaoEmpresa=Empresa::identificacao((new Empresa($this->pdo))->consultar());
        switch($tipo){
            case 'veiculos':$titulo='Veículos e custos por ciclo';$itens=$filtrar($d['ciclos']);$colunas=array_merge($ident,[self::col('situacao','Situação'),$din('despesas','Despesas realizadas'),$din('previsoes','Despesas identificadas na compra'),$din('investido','Investido'),$din('projetado','Projetado')]);$notas[]='Período: data de entrada do ciclo. Despesas realizadas e despesas identificadas na compra consideram somente os custos da revenda. As identificadas na compra incluem apenas as pendentes de realização. Valores refletem os custos atuais dos ciclos selecionados; consignados não incluem aquisição ou repasse no capital investido.';$resumo=[self::indicador('Ciclos',count($itens),'number'),self::indicador('Aquisições próprias',self::soma($itens,'aquisicao')),self::indicador('Despesas realizadas',self::soma($itens,'despesas')),self::indicador('Despesas identificadas na compra',self::soma($itens,'previsoes')),self::indicador('Investido',self::soma($itens,'investido')),self::indicador('Projetado',self::soma($itens,'projetado'))];break;
            case 'aquisicoes':$titulo='Aquisições de veículos próprios';$itens=[];foreach($d['ciclos'] as $r)if($r['origem']==='Próprio'&&$r['data_aquisicao']!==null){$r['data']=$r['data_aquisicao'];$itens[]=$r;}$itens=$filtrar($itens);$colunas=array_merge($ident,[$data,self::col('origem_aquisicao','Origem da aquisição'),$din('aquisicao','Aquisição')]);$notas[]='Período: data de aquisição. Inclui veículos próprios ativos e encerrados; valores atribuídos às trocas representam custo de aquisição, sem presumir saída de caixa.';$resumo=[self::indicador('Aquisições',count($itens),'number'),self::indicador('Valor adquirido',self::soma($itens,'aquisicao'))];break;
            case 'despesas':$titulo='Despesas dos veículos e pós-venda';$itens=$filtrar($d['despesas']);$colunas=[self::col('numero','Nosso número'),self::col('veiculo','Veículo'),$data,self::col('descricao','Descrição'),self::col('fornecedor','Fornecedor'),self::col('responsavel','Custo de'),$din('valor','Valor')];$notas[]='Período: data da despesa. Somente registros ativos; despesas de garantia vinculadas ao ciclo aparecem uma única vez. Custos do proprietário ficam separados dos custos da loja.';$resumo=[self::indicador('Despesas',count($itens),'number'),self::indicador('Custo da loja',self::soma(array_filter($itens,fn($r)=>$r['responsavel']==='Revenda'),'valor')),self::indicador('Custo do proprietário',self::soma(array_filter($itens,fn($r)=>in_array($r['responsavel'],['Proprietário','Desconto no repasse'],true)),'valor')),self::indicador('Custo do cliente',self::soma(array_filter($itens,fn($r)=>$r['responsavel']==='Cliente'),'valor'))];break;
            case 'orcamentos':$titulo='Orçamentos';$itens=$filtrar($d['orcamentos']);$colunas=[self::col('numero','Orçamento'),self::col('veiculo','Veículo'),self::col('cliente','Cliente'),self::col('vendedor','Vendedor'),$data,self::col('situacao','Situação'),$din('valor','Proposta')];$notas[]='Período: data do orçamento. Propostas e negociações não representam receita nem vendas concluídas.';$resumo=[self::indicador('Orçamentos',count($itens),'number'),self::indicador('Propostas ativas',self::soma(array_filter($itens,fn($r)=>!in_array($r['situacao'],['Cancelado','Desistência','Convertido em pedido'],true)),'valor')),self::indicador('Cancelados',count(array_filter($itens,fn($r)=>$r['situacao']==='Cancelado')),'number'),self::indicador('Desistências',count(array_filter($itens,fn($r)=>$r['situacao']==='Desistência')),'number')];break;
            case 'negociacoes':$titulo='Histórico de negociações';$itens=$filtrar($d['negociacoes']);$colunas=[self::col('numero','Orçamento'),self::col('veiculo','Veículo'),$data,self::col('tipo','Registro'),self::col('responsavel','Responsável'),$din('valor','Proposta'),$din('resultado_previsto','Resultado previsto')];$notas[]='Período: data de cada negociação. Revisões do mesmo orçamento não são somadas como vendas.';$resumo=[self::indicador('Registros',count($itens),'number')];break;
            case 'vendedores':$titulo='Desempenho dos vendedores';$itens=self::vendedores($vendidas);$colunas=[self::col('vendedor','Vendedor'),self::col('quantidade','Vendas','number'),$din('valor','Vendido'),$din('comissao','Comissão'),$din('resultado','Resultado atualizado'),self::col('estimadas','Vendas com resultado estimado','number'),self::col('margem','Margem','percent')];$notas[]='Período: conclusão da venda. Margem ponderada pelo valor das operações com resultado disponível. Resultados incluem os gastos atuais de pós-venda.';$resumo=$resumoVendas;break;
            case 'cadeias':$titulo='Cadeias de veículos recebidos em troca';$itens=self::filtrarCadeias($d['cadeias'],$f);$colunas=[self::col('pedido','Pedido de origem'),self::col('veiculo','Veículo inicial'),self::col('situacao','Situação'),self::col('operacoes','Vendas','number'),self::col('pendentes','Trocas a vender','number'),$din('resultado','Resultado da cadeia')];$notas[]='Cadeias em aberto continuam visíveis nos períodos posteriores à venda de origem: ignoram a data inicial, mas respeitam a data final. Para as finalizadas, o período considera a última venda da cadeia. Filtros de veículo e vendedor consideram a operação de origem. Cada cadeia aparece uma vez, com todas as operações vinculadas, mesmo fora do período. Os valores são uma visão alternativa e não se somam aos resultados individuais.';$resumo=[self::indicador('Cadeias',count($itens),'number'),self::indicador('Finalizadas',count(array_filter($itens,fn($r)=>$r['situacao']==='Finalizada')),'number'),self::indicador('Resultado final das cadeias',self::somaResultados(array_filter($itens,fn($r)=>$r['situacao']==='Finalizada'))),self::indicador('Resultado estimado em aberto',self::somaResultados(array_filter($itens,fn($r)=>$r['situacao']==='Em aberto')))];break;
            default:$titulo='Vendas e resultados';$itens=array_merge($vendidas,$canceladas);$colunas=[self::col('pedido','Pedido'),self::col('veiculo','Veículo'),self::col('vendedor','Vendedor'),$data,$din('valor','Valor'),$din('resultado','Resultado atualizado'),self::col('margem','Margem','percent'),self::col('classificacao','Resultado')];$notas[]='Período: conclusão da venda ou cancelamento do pedido. Cancelados aparecem separados e não entram nos valores vendidos. Resultado atualizado substitui o resultado original, já com custos da loja e pós-venda, previsões pendentes, impostos estimados e comissão.';$resumo=$resumoVendas;
        }
        if(in_array($tipo,['vendas','vendedores'],true))$notas[]='Valores vendidos incluem veículos recebidos em troca e financiamentos. Não representam dinheiro recebido ou saldo de caixa.';
        if($tipo==='vendas')$resumo=array_merge($resumo,[self::indicador('Lucros apurados',self::soma(array_filter($validas,fn($r)=>self::cents($r['resultado'])>0),'resultado')),self::indicador('Prejuízos apurados',self::soma(array_filter($validas,fn($r)=>self::cents($r['resultado'])<0),'resultado')),self::indicador('Margem sobre vendas',$margem,'percent')]);
        if(!in_array($tipo,['vendas','vendedores','cadeias'],true))$avisos=[];
        if($tipo==='cadeias'){
            $abertas=count(array_filter($itens,fn($r)=>$r['situacao']==='Em aberto'));
            $avisos=$abertas?["$abertas cadeia(s) em aberto: incluídas até a data final selecionada, mesmo quando iniciadas antes do período, com resultado estimado até a venda de todas as trocas."]:[];
        }
        if($tipo==='cadeias'&&count(array_filter($itens,fn($r)=>$r['resultado']===null)))$avisos[]='Há cadeias com composição histórica insuficiente. Seus resultados não estão incluídos nos totais disponíveis.';
        if(in_array($tipo,['veiculos','aquisicoes'],true)&&count(array_filter($itens,fn($r)=>$r['origem']==='Próprio'&&$r['aquisicao']===null)))$avisos[]='Há veículos próprios sem aquisição informada. Totais de investimento parciais; confira os detalhes.';
        return ['tipo'=>$tipo,'titulo'=>$titulo,'empresa'=>$identificacaoEmpresa['nome'],'identificacao_empresa'=>$identificacaoEmpresa,'gerado_em'=>date('Y-m-d H:i:s'),'filtros'=>$f,'colunas'=>$colunas,'itens'=>$itens,'resumo'=>$resumo,'notas'=>$notas,'avisos'=>$avisos,'total'=>count($itens)];
    }
    private static function vendedores(array $vendas):array {
        $grupos=[];foreach($vendas as $v)$grupos[((int)($v['id_vendedor']??0)>0?'id:'.$v['id_vendedor']:'nome:'.$v['vendedor'])][]=$v;$out=[];
        foreach($grupos as $itens){$nome=$itens[0]['vendedor'];$validas=array_values(array_filter($itens,fn($r)=>$r['resultado']!==null));$valor=self::soma($validas,'valor');$resultado=self::soma($validas,'resultado');$out[]=['vendedor'=>$nome,'quantidade'=>count($itens),'valor'=>self::soma($itens,'valor'),'comissao'=>self::soma($itens,'comissao'),'resultado'=>$validas?$resultado:null,'estimadas'=>count(array_filter($itens,fn($r)=>$r['classificacao']==='Estimado')),'sem_resultado'=>count($itens)-count($validas),'margem'=>self::cents($valor)?number_format(self::cents($resultado)/self::cents($valor)*100,2,'.',''):null];}
        usort($out,fn($a,$b)=>self::cents($b['valor'])<=>self::cents($a['valor']));return $out;
    }
}
