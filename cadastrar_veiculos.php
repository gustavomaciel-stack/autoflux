<?php

require_once __DIR__ . "/config/conexao.php";

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $marca = trim($_POST["marca"]);
    $modelo = trim($_POST["modelo"]);
    $versao = trim($_POST["versao"]);

    $ano_fabricacao = $_POST["ano_fabricacao"];
    $ano_modelo = $_POST["ano_modelo"];

    $cor = trim($_POST["cor"]);
    $combustivel = trim($_POST["combustivel"]);

    $quilometragem = $_POST["quilometragem"];

    $placa = strtoupper(trim($_POST["placa"]));
    $chassi = strtoupper(trim($_POST["chassi"]));
    $renavam = trim($_POST["renavam"]);

    $valor_compra = $_POST["valor_compra"];
    $data_compra = $_POST["data_compra"];

    $observacoes = trim($_POST["observacoes"]);

    $versao = $versao !== "" ? $versao : null;
    $cor = $cor !== "" ? $cor : null;
    $combustivel = $combustivel !== "" ? $combustivel : null;

    $quilometragem = $quilometragem !== "" ? $quilometragem : null;

    $placa = $placa !== "" ? $placa : null;
    $chassi = $chassi !== "" ? $chassi : null;
    $renavam = $renavam !== "" ? $renavam : null;

    $observacoes = $observacoes !== "" ? $observacoes : null;

    try {

        $sql = "INSERT INTO veiculos (
            marca,
            modelo,
            versao,
            ano_fabricacao,
            ano_modelo,
            cor,
            combustivel,
            placa,
            chassi,
            renavam,
            quilometragem,
            valor_compra,
            data_compra,
            observacoes
        ) VALUES (
            :marca,
            :modelo,
            :versao,
            :ano_fabricacao,
            :ano_modelo,
            :cor,
            :combustivel,
            :placa,
            :chassi,
            :renavam,
            :quilometragem,
            :valor_compra,
            :data_compra,
            :observacoes
        )";

        $comando = $conexao->prepare($sql);

        $comando->execute([
            ":marca" => $marca,
            ":modelo" => $modelo,
            ":versao" => $versao,
            ":ano_fabricacao" => $ano_fabricacao,
            ":ano_modelo" => $ano_modelo,
            ":cor" => $cor,
            ":combustivel" => $combustivel,
            ":placa" => $placa,
            ":chassi" => $chassi,
            ":renavam" => $renavam,
            ":quilometragem" => $quilometragem,
            ":valor_compra" => $valor_compra,
            ":data_compra" => $data_compra,
            ":observacoes" => $observacoes
        ]);

        header("Location: cadastrar_veiculos.php?sucesso=1");
        exit;

    } catch (PDOException $erro) {

        if ($erro->getCode() == 23000) {

            $mensagemErro = "Já existe um veículo com essa placa, chassi ou RENAVAM.";

        } else {

            $mensagemErro = "Erro ao cadastrar o veículo: " . $erro->getMessage();

        }
    }
}

?>
  
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Cadastrar Veículo - AutoFlux</title>
</head>

<body>
    <h1>Cadastrar Veículo</h1>

    <a href="listar_veiculos.php">Ver veículos da Loja</a>

    <br><br>
    
     <?php if (isset($_GET["sucesso"])): ?>

        <p>Veículo cadastrado com sucesso!</p>

        <?php endif; ?>

        <?php if (isset($mensagemErro)): ?>

        <p><?php echo $mensagemErro; ?></p>

        <?php endif; ?>

    <form method="POST">

        <label for="marca">Marca:</label>
        <input type="text" id="marca" name="marca" required>

        <br><br>

        <label for="modelo">Modelo:</label>
        <input type="text" id="modelo" name="modelo" required>

        <br><br>

        <label for="versao">Versão:</label>
        <input type="text" id="versao" name="versao">

        <br><br>

        <label for="ano_fabricacao">Ano de Fabricação:</label>
        <input
        type="number"
        id="ano_fabricacao"
        name="ano_fabricacao"
        min="1900"
        max="2100"
        required
        >

        <br><br>

        <label for="ano_modelo">Ano do Modelo:</label>
        <input
        type="number"
        id="ano_modelo"
        name="ano_modelo"
        min="1900"
        max="2100"
        required
        >

        <br><br>

        <label for="cor">Cor:</label>
        <input type="text" id="cor" name="cor">

        <br><br>

        <label for="combustivel">Combustível:</label>
        <select id="combustivel" name="combustivel">
        <option value="">Selecione</option>
        <option value="Gasolina">Gasolina</option>
        <option value="Etanol">Etanol</option>
        <option value="Flex">Flex</option>
        <option value="Diesel">Diesel</option>
        <option value="Hibrido">Híbrido</option>
        <option value="Eletrico">Elétrico</option>
        </select>

        <br><br>

        <label for="quilometragem">Quilometragem:</label>
        <input
        type="number"
        id="quilometragem"
        name="quilometragem"
        min="0"
        >

        <br><br>

        <label for="placa">Placa:</label>
        <input
        type="text"
        id="placa"
        name="placa"
        maxlength="7"
        >

        <br><br>

        <label for="chassi">Chassi:</label>
        <input
        type="text"
        id="chassi"
        name="chassi"
        maxlength="17"
        >

        <br><br>

        <label for="renavam">RENAVAM:</label>
        <input
        type="text"
        id="renavam"
        name="renavam"
        maxlength="11"
        >

        <br><br>

        <label for="valor_compra">Valor da Compra:</label>
        <input
        type="number"
        id="valor_compra"
        name="valor_compra"
        step="0.01"
        min="0"
        required
        >

        <br><br>

        <label for="data_compra">Data da Compra:</label>
        <input
        type="date"
        id="data_compra"
        name="data_compra"
        required
        >

        <br><br>

        <label for="observacoes">Observações:</label>
        <textarea
        id="observacoes"
        name="observacoes"
        rows="4"
        cols="40"
        ></textarea>

        <br><br>

        <button type="submit">Cadastrar</button>
        <br><br>
    </form>

</body>
</html>