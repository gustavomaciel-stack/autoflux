<?php

require_once __DIR__ . "/config/conexao.php";

$sql = "SELECT * FROM veiculos ORDER BY id_veiculo DESC";

$comando = $conexao->prepare($sql);

$comando->execute();

$veiculos = $comando->fetchALL(PDO::FETCH_ASSOC);

?>

<!DOCTYPE html>
<head>
    <meta charset="UTF-8">

    <meta
    name = "vierport"
    content = "windth=device-width, initial-scale=1.0"
    >
    <title>Veículos - AutoFlux</title>
</head>

<body>
    <h1>Veículos Cadastrados</h1>
<a href="cadastrar_veiculos.php">Cadastrar novo veículo</a>

<br><br>

    <table border="1">

    <thead>
        <tr>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Versão</th>
            <th>Ano</th>
            <th>Placa</th>
            <th>Quilometragem</th>
            <th>Valor da Compra</th>
            <th>Status</th>
            <th>Ações</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($veiculos as $veiculo): ?>
            <tr>
                <td>
                    <?php echo htmlspecialchars($veiculo["marca"]); ?>
                </td>
                <td>
                    <?php echo htmlspecialchars($veiculo["modelo"]); ?>
                </td>
                <td>
                    <?php echo htmlspecialchars($veiculo["versao"]??""); ?>
                </td>
                <td>
                    <?php
                    echo $veiculo["ano_fabricacao"]
                    . "/"
                    . $veiculo["ano_modelo"];
                    ?>
                </td>
                <td>
                    <?php echo htmlspecialchars($veiculo["placa"]??""); ?>
                </td>
                <td>
                    <?php
                    echo number_format(
                        $veiculo["quilometragem"],
                        0,
                        ",",
                        "."
                    ) . "km";
                    ?>                  
                </td>
                <td>
                    <?php
                    echo "R$" . number_format(
                        $veiculo["valor_compra"], 2, ",","."
                    );
                    ?>
                </td>
                <td>
                    <?php echo htmlspecialchars($veiculo["status"]); ?>
                </td>
                <td>
                    <a href=visualizar_veiculo.php?id=<?php echo $veiculo["id_veiculo"]; ?>">
                    Visualizar
                    </a>
                </td>
            </tr>
            <?php endforeach; ?>
    </tbody>
    </table>
</body>

</html>