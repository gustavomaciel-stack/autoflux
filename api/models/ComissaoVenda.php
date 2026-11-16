<?php
declare(strict_types=1);

final class ComissaoVenda {
    public static function semComissao(PDO $pdo,int $usuario): bool {
        $q=$pdo->prepare('SELECT p.nome FROM perfis p JOIN usuarios_perfis up ON up.id_perfil=p.id_perfil WHERE up.id_usuario=? AND up.ativo=1 AND p.ativo=1');
        $q->execute([$usuario]);
        foreach($q->fetchAll(PDO::FETCH_COLUMN) as $nome){
            $nome=mb_strtolower(trim($nome),'UTF-8');
            if(in_array($nome,['gerente','gerente de vendas','diretor','diretoria','gestão','gestao','gestão/diretoria','gestao/diretoria'],true))return true;
        }
        return false;
    }
    public static function percentual(PDO $pdo,int $usuario): string {
        if(self::semComissao($pdo,$usuario))return '0.00';
        $q=$pdo->prepare('SELECT percentual_comissao FROM vendedores WHERE id_usuario=? AND ativo=1');
        $q->execute([$usuario]);$v=$q->fetchColumn();
        if($v===false||$v===null)throw new DomainException('Cadastre a comissão do vendedor antes de criar o orçamento.');
        $centavos=Orcamento::centavos($v);
        if($centavos>10000)throw new DomainException('Percentual de comissão inválido.');
        return Orcamento::moeda($centavos);
    }
}
