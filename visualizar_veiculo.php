<?php

require_once __DIR__ . "/config/conexao.php";

if (!isset($_GET["id"])) {
    die("Veículo não informado.");
}

$id = $_GET["id"];

$sql = "SELECT * FROM veiculos WHERE id_veiculo = :id";
$comando = $conexao->prepare($sql);

$comando->execute([
    ":id" => $id
]);

$veiculo = $comando->fetch(PDO::FETCH_ASSOC);

if (!$veiculo) {
    die("Veículo não encontrado");
}

?>

<!DOCTYPE html>
<html lang="pt-br"

<head>
    <meta
    name="vieport"
    Content="width=device-width, initial-scale=1.0"
    >

    <title>Detalhes do Veículo - AutoFlux</title>
</head>

<body>
    <h1>Detalhes do Veículo</h1>
    <a href="listar_veiculos.php">Ver estoque da loja</a>

    <br><br>
<h2>
    <?php echo htmlspecialchars($veiculo["marca"]); ?>

    <?php echo htmlspecialchars($veiculo["modelo"]); ?>

    <?php echo htmlspecialchars($veiculo["versao"] ??""); ?>
</h2>
<p>
    <strong>Ano:</strong>

    <?php
    echo $veiculo["ano_fabricacao"]
    . "/"
    . $veiculo["ano_modelo"];
    ?>
</p>

<p>
    <strong>Cor:</strong>
    <?php echo htmlspecialchars($veiculo["cor"] ?? "Não informado"); ?>
</p>

<p>
    <strong>Combustível:</strong>
    <?php echo htmlspecialchars($veiculo["combustivel"] ?? "Não informada"); ?>
</p>

<p>
    <strong>Placa:</strong>
    <?php echo htmlspecialchars($veiculo["placa"] ?? "Não informada"); ?>
</p>

<p>
    <strong>Chassi:</strong>
    <?php echo htmlspecialchars($veiculo["chassi"] ?? "Não informado"); ?>
</p>

<p>
    <strong>RENAVAM:</strong>
    <?php echo htmlspecialchars($veiculo["renavam"] ?? "Não informado"); ?>
</p>

<p>
    <strong>Quilometragem:</strong>

    <?php 
    if($veiculo["quilometragem"] !== null) {
        echo number_format(
            $veiculo["quilometragem"],
            0,
            ".",
            "."
        ) . " km";
    } else {
        echo "Não informada";
    }
    ?>
</p>

<p>
    <strong>Valor da compra:</strong>

    <?php
    echo "R$ " . number_format(
        $veiculo["valor_compra"],
        2,
        ",",
        "."
        );
        ?>
</p>

<p>
    <strong>Data da compra:</strong>

    <?php
    echo date(
        "d/m/Y",
        strtotime($veiculo["data_compra"])
    );
    ?>
</p>

<p>
    <strong>Status:</strong>
    <?php echo htmlspecialchars($veiculo["status"]); ?>
</p>

<p>
    <strong>Observações:</strong>
    <?php echo htmlspecialchars($veiculo["observacoes"] ?? "Nenhuma"); ?>
</p>

</body>

</html>