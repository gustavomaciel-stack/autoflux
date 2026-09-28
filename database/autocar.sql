-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 06/09/2026 às 21:35
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `autocar`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `aquisicoes`
--

CREATE TABLE `aquisicoes` (
  `id_aquisicao` int(10) UNSIGNED NOT NULL,
  `id_ciclo` int(10) UNSIGNED NOT NULL,
  `id_usuario_responsavel` int(10) UNSIGNED DEFAULT NULL,
  `valor_aquisicao` decimal(12,2) NOT NULL,
  `data_aquisicao` date NOT NULL,
  `origem` varchar(50) NOT NULL,
  `observacoes` text DEFAULT NULL,
  `data_cadastro` datetime NOT NULL DEFAULT current_timestamp(),
  `data_atualizacao` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `aquisicoes`
--

INSERT INTO `aquisicoes` (`id_aquisicao`, `id_ciclo`, `id_usuario_responsavel`, `valor_aquisicao`, `data_aquisicao`, `origem`, `observacoes`, `data_cadastro`, `data_atualizacao`) VALUES
(1, 1, NULL, 74999.71, '2026-08-09', 'Não informada - cadastro anterior', NULL, '2026-08-09 23:10:00', '2026-09-02 19:02:25'),
(2, 2, NULL, 8000.00, '2026-08-12', 'Não informada - cadastro anterior', NULL, '2026-08-12 18:29:51', '2026-09-02 19:02:25');

-- --------------------------------------------------------

--
-- Estrutura para tabela `ciclos_veiculo`
--

CREATE TABLE `ciclos_veiculo` (
  `id_ciclo` int(10) UNSIGNED NOT NULL,
  `id_veiculo` int(10) UNSIGNED NOT NULL,
  `codigo_interno` varchar(20) NOT NULL,
  `placa` char(7) DEFAULT NULL,
  `renavam` char(11) DEFAULT NULL,
  `cor` varchar(30) NOT NULL,
  `quilometragem_entrada` int(10) UNSIGNED DEFAULT NULL,
  `horimetro_entrada` int(10) UNSIGNED DEFAULT NULL,
  `situacao_atual` varchar(30) NOT NULL,
  `data_entrada` datetime NOT NULL,
  `data_encerramento` datetime DEFAULT NULL,
  `observacoes` text DEFAULT NULL,
  `data_cadastro` datetime NOT NULL DEFAULT current_timestamp(),
  `data_atualizacao` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `ciclos_veiculo`
--

INSERT INTO `ciclos_veiculo` (`id_ciclo`, `id_veiculo`, `codigo_interno`, `placa`, `renavam`, `cor`, `quilometragem_entrada`, `horimetro_entrada`, `situacao_atual`, `data_entrada`, `data_encerramento`, `observacoes`, `data_cadastro`, `data_atualizacao`) VALUES
(1, 1, 'AF-000001', 'ABC1D23', '12345678901', 'Branco', 15000, NULL, 'Disponível', '2026-08-09 00:00:00', NULL, 'Veículo teste', '2026-08-09 23:10:00', '2026-09-02 19:02:25'),
(2, 2, 'AF-000002', 'IMN5289', '15155484811', 'Prata', 250000, NULL, 'Disponível', '2026-08-12 00:00:00', NULL, 'Precisa de pintura no capo, teto e porta direita.', '2026-08-12 18:29:51', '2026-09-02 19:02:25');

-- --------------------------------------------------------

--
-- Estrutura para tabela `despesas_veiculo`
--

CREATE TABLE `despesas_veiculo` (
  `id_despesa` int(10) UNSIGNED NOT NULL,
  `id_ciclo` int(10) UNSIGNED NOT NULL,
  `id_fornecedor` int(10) UNSIGNED DEFAULT NULL,
  `id_usuario_responsavel` int(10) UNSIGNED DEFAULT NULL,
  `categoria` varchar(30) NOT NULL,
  `descricao` varchar(255) NOT NULL,
  `data_despesa` date NOT NULL,
  `valor` decimal(12,2) NOT NULL,
  `observacoes` text DEFAULT NULL,
  `data_cadastro` datetime NOT NULL DEFAULT current_timestamp(),
  `data_atualizacao` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `fornecedores`
--

CREATE TABLE `fornecedores` (
  `id_fornecedor` int(10) UNSIGNED NOT NULL,
  `tipo_pessoa` char(2) NOT NULL,
  `razao_social_nome` varchar(150) NOT NULL,
  `nome_fantasia` varchar(150) DEFAULT NULL,
  `cpf` char(11) DEFAULT NULL,
  `cnpj` char(14) DEFAULT NULL,
  `telefone` varchar(20) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `cep` char(8) DEFAULT NULL,
  `logradouro` varchar(150) DEFAULT NULL,
  `numero` varchar(10) DEFAULT NULL,
  `complemento` varchar(100) DEFAULT NULL,
  `bairro` varchar(80) DEFAULT NULL,
  `cidade` varchar(80) DEFAULT NULL,
  `estado` char(2) DEFAULT NULL,
  `tipo_servico` varchar(60) NOT NULL,
  `observacoes` text DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `data_cadastro` datetime NOT NULL DEFAULT current_timestamp(),
  `data_atualizacao` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Despejando dados para a tabela `fornecedores`
--

INSERT INTO `fornecedores` (`id_fornecedor`, `tipo_pessoa`, `razao_social_nome`, `nome_fantasia`, `cpf`, `cnpj`, `telefone`, `email`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `estado`, `tipo_servico`, `observacoes`, `ativo`, `data_cadastro`, `data_atualizacao`) VALUES
(1, 'PJ', 'Oficina Teste Ltda', 'Oficina Teste', NULL, '12345678000195', '51999999999', 'teste@oficina.com', NULL, NULL, NULL, NULL, NULL, 'Novo Hamburgo', 'RS', 'Mecanica', NULL, 1, '2026-09-02 20:39:29', '2026-09-02 20:39:29');

-- --------------------------------------------------------

--
-- Estrutura para tabela `lancamentos_financeiros`
--

CREATE TABLE `lancamentos_financeiros` (
  `id_lancamento` int(10) UNSIGNED NOT NULL,
  `id_ciclo` int(10) UNSIGNED DEFAULT NULL,
  `id_aquisicao` int(10) UNSIGNED DEFAULT NULL,
  `id_despesa_veiculo` int(10) UNSIGNED DEFAULT NULL,
  `id_venda` int(11) DEFAULT NULL,
  `id_despesa_venda` int(10) UNSIGNED DEFAULT NULL,
  `id_usuario_responsavel` int(10) UNSIGNED DEFAULT NULL,
  `tipo_movimentacao` varchar(10) NOT NULL,
  `origem` varchar(30) NOT NULL,
  `descricao` varchar(255) NOT NULL,
  `valor` decimal(12,2) NOT NULL,
  `data_lancamento` date NOT NULL,
  `situacao` varchar(20) NOT NULL,
  `data_cadastro` datetime NOT NULL DEFAULT current_timestamp(),
  `data_atualizacao` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Despejando dados para a tabela `lancamentos_financeiros`
--

INSERT INTO `lancamentos_financeiros` (`id_lancamento`, `id_ciclo`, `id_aquisicao`, `id_despesa_veiculo`, `id_venda`, `id_despesa_venda`, `id_usuario_responsavel`, `tipo_movimentacao`, `origem`, `descricao`, `valor`, `data_lancamento`, `situacao`, `data_cadastro`, `data_atualizacao`) VALUES
(1, 1, 1, NULL, NULL, NULL, NULL, 'SAIDA', 'AQUISICAO', 'Aquisição do veículo - ciclo AF-000001', 74999.71, '2026-08-09', 'CONFIRMADO', '2026-08-09 23:10:00', '2026-09-02 19:02:25'),
(2, 2, 2, NULL, NULL, NULL, NULL, 'SAIDA', 'AQUISICAO', 'Aquisição do veículo - ciclo AF-000002', 8000.00, '2026-08-12', 'CONFIRMADO', '2026-08-12 18:29:51', '2026-09-02 19:02:25');

-- --------------------------------------------------------

--
-- Estrutura para tabela `movimentacoes_veiculo`
--

CREATE TABLE `movimentacoes_veiculo` (
  `id_movimentacao` int(10) UNSIGNED NOT NULL,
  `id_ciclo` int(10) UNSIGNED NOT NULL,
  `id_usuario_responsavel` int(10) UNSIGNED DEFAULT NULL,
  `situacao_anterior` varchar(30) NOT NULL,
  `situacao_nova` varchar(30) NOT NULL,
  `data_movimentacao` datetime NOT NULL,
  `observacoes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `movimentacoes_veiculo`
--

INSERT INTO `movimentacoes_veiculo` (`id_movimentacao`, `id_ciclo`, `id_usuario_responsavel`, `situacao_anterior`, `situacao_nova`, `data_movimentacao`, `observacoes`) VALUES
(1, 1, NULL, 'Fora do pátio', 'Disponível', '2026-08-09 00:00:00', 'Movimentação inicial migrada do protótipo'),
(2, 2, NULL, 'Fora do pátio', 'Disponível', '2026-08-12 00:00:00', 'Movimentação inicial migrada do protótipo');

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int(10) UNSIGNED NOT NULL,
  `nome` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `login` varchar(50) NOT NULL,
  `senha_hash` varchar(255) NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `data_cadastro` datetime NOT NULL DEFAULT current_timestamp(),
  `data_atualizacao` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estrutura para tabela `veiculos`
--

CREATE TABLE `veiculos` (
  `id_veiculo` int(10) UNSIGNED NOT NULL,
  `marca` varchar(50) NOT NULL,
  `modelo` varchar(80) NOT NULL,
  `versao` varchar(80) DEFAULT NULL,
  `ano_fabricacao` year(4) NOT NULL,
  `ano_modelo` year(4) NOT NULL,
  `cor` varchar(50) DEFAULT NULL,
  `combustivel` varchar(30) NOT NULL,
  `placa` varchar(7) DEFAULT NULL,
  `chassi` char(17) NOT NULL,
  `renavam` varchar(11) DEFAULT NULL,
  `quilometragem` int(11) DEFAULT NULL,
  `valor_compra` decimal(12,2) NOT NULL,
  `data_compra` date NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'Em estoque',
  `observacoes` text DEFAULT NULL,
  `data_cadastro` datetime NOT NULL DEFAULT current_timestamp(),
  `data_atualizacao` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `veiculos`
--

INSERT INTO `veiculos` (`id_veiculo`, `marca`, `modelo`, `versao`, `ano_fabricacao`, `ano_modelo`, `cor`, `combustivel`, `placa`, `chassi`, `renavam`, `quilometragem`, `valor_compra`, `data_compra`, `status`, `observacoes`, `data_cadastro`, `data_atualizacao`) VALUES
(1, 'Volkswagen', 'Polo', 'Highline', '2024', '2025', 'Branco', 'Flex', 'ABC1D23', '12345678901234567', '12345678901', 15000, 74999.71, '2026-08-09', 'Em estoque', 'Veículo teste', '2026-08-09 23:10:00', '2026-09-02 19:02:25'),
(2, 'Chevrolet', 'Corsa', 'Wind 1.0', '1998', '1999', 'Prata', 'Gasolina', 'IMN5289', '15351351381231131', '15155484811', 250000, 8000.00, '2026-08-12', 'Em estoque', 'Precisa de pintura no capo, teto e porta direita.', '2026-08-12 18:29:51', '2026-09-02 19:02:25');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `aquisicoes`
--
ALTER TABLE `aquisicoes`
  ADD PRIMARY KEY (`id_aquisicao`),
  ADD UNIQUE KEY `uk_aquisicao_ciclo` (`id_ciclo`),
  ADD KEY `fk_aquisicao_usuario` (`id_usuario_responsavel`);

--
-- Índices de tabela `ciclos_veiculo`
--
ALTER TABLE `ciclos_veiculo`
  ADD PRIMARY KEY (`id_ciclo`),
  ADD UNIQUE KEY `uk_ciclo_codigo_interno` (`codigo_interno`),
  ADD KEY `fk_ciclo_veiculo` (`id_veiculo`);

--
-- Índices de tabela `despesas_veiculo`
--
ALTER TABLE `despesas_veiculo`
  ADD PRIMARY KEY (`id_despesa`),
  ADD KEY `fk_despesa_ciclo` (`id_ciclo`),
  ADD KEY `fk_despesa_fornecedor` (`id_fornecedor`),
  ADD KEY `fk_despesa_usuario` (`id_usuario_responsavel`);

--
-- Índices de tabela `fornecedores`
--
ALTER TABLE `fornecedores`
  ADD PRIMARY KEY (`id_fornecedor`),
  ADD UNIQUE KEY `uk_fornecedor_cpf` (`cpf`),
  ADD UNIQUE KEY `uk_fornecedor_cnpj` (`cnpj`);

--
-- Índices de tabela `lancamentos_financeiros`
--
ALTER TABLE `lancamentos_financeiros`
  ADD PRIMARY KEY (`id_lancamento`),
  ADD KEY `fk_lancamento_ciclo` (`id_ciclo`),
  ADD KEY `fk_lancamento_aquisicao` (`id_aquisicao`),
  ADD KEY `fk_lancamento_despesa_veiculo` (`id_despesa_veiculo`),
  ADD KEY `fk_lancamento_usuario` (`id_usuario_responsavel`);

--
-- Índices de tabela `movimentacoes_veiculo`
--
ALTER TABLE `movimentacoes_veiculo`
  ADD PRIMARY KEY (`id_movimentacao`),
  ADD KEY `fk_movimentacao_ciclo` (`id_ciclo`),
  ADD KEY `fk_movimentacao_usuario` (`id_usuario_responsavel`);

--
-- Índices de tabela `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `uk_usuario_email` (`email`),
  ADD UNIQUE KEY `uk_usuario_login` (`login`);

--
-- Índices de tabela `veiculos`
--
ALTER TABLE `veiculos`
  ADD PRIMARY KEY (`id_veiculo`),
  ADD UNIQUE KEY `placa` (`placa`),
  ADD UNIQUE KEY `chassi` (`chassi`),
  ADD UNIQUE KEY `renavam` (`renavam`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `aquisicoes`
--
ALTER TABLE `aquisicoes`
  MODIFY `id_aquisicao` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `ciclos_veiculo`
--
ALTER TABLE `ciclos_veiculo`
  MODIFY `id_ciclo` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `despesas_veiculo`
--
ALTER TABLE `despesas_veiculo`
  MODIFY `id_despesa` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `fornecedores`
--
ALTER TABLE `fornecedores`
  MODIFY `id_fornecedor` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `lancamentos_financeiros`
--
ALTER TABLE `lancamentos_financeiros`
  MODIFY `id_lancamento` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `movimentacoes_veiculo`
--
ALTER TABLE `movimentacoes_veiculo`
  MODIFY `id_movimentacao` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `veiculos`
--
ALTER TABLE `veiculos`
  MODIFY `id_veiculo` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `aquisicoes`
--
ALTER TABLE `aquisicoes`
  ADD CONSTRAINT `fk_aquisicao_ciclo` FOREIGN KEY (`id_ciclo`) REFERENCES `ciclos_veiculo` (`id_ciclo`),
  ADD CONSTRAINT `fk_aquisicao_usuario` FOREIGN KEY (`id_usuario_responsavel`) REFERENCES `usuarios` (`id_usuario`);

--
-- Restrições para tabelas `ciclos_veiculo`
--
ALTER TABLE `ciclos_veiculo`
  ADD CONSTRAINT `fk_ciclo_veiculo` FOREIGN KEY (`id_veiculo`) REFERENCES `veiculos` (`id_veiculo`);

--
-- Restrições para tabelas `despesas_veiculo`
--
ALTER TABLE `despesas_veiculo`
  ADD CONSTRAINT `fk_despesa_ciclo` FOREIGN KEY (`id_ciclo`) REFERENCES `ciclos_veiculo` (`id_ciclo`),
  ADD CONSTRAINT `fk_despesa_fornecedor` FOREIGN KEY (`id_fornecedor`) REFERENCES `fornecedores` (`id_fornecedor`),
  ADD CONSTRAINT `fk_despesa_usuario` FOREIGN KEY (`id_usuario_responsavel`) REFERENCES `usuarios` (`id_usuario`);

--
-- Restrições para tabelas `lancamentos_financeiros`
--
ALTER TABLE `lancamentos_financeiros`
  ADD CONSTRAINT `fk_lancamento_aquisicao` FOREIGN KEY (`id_aquisicao`) REFERENCES `aquisicoes` (`id_aquisicao`),
  ADD CONSTRAINT `fk_lancamento_ciclo` FOREIGN KEY (`id_ciclo`) REFERENCES `ciclos_veiculo` (`id_ciclo`),
  ADD CONSTRAINT `fk_lancamento_despesa_veiculo` FOREIGN KEY (`id_despesa_veiculo`) REFERENCES `despesas_veiculo` (`id_despesa`),
  ADD CONSTRAINT `fk_lancamento_usuario` FOREIGN KEY (`id_usuario_responsavel`) REFERENCES `usuarios` (`id_usuario`);

--
-- Restrições para tabelas `movimentacoes_veiculo`
--
ALTER TABLE `movimentacoes_veiculo`
  ADD CONSTRAINT `fk_movimentacao_ciclo` FOREIGN KEY (`id_ciclo`) REFERENCES `ciclos_veiculo` (`id_ciclo`),
  ADD CONSTRAINT `fk_movimentacao_usuario` FOREIGN KEY (`id_usuario_responsavel`) REFERENCES `usuarios` (`id_usuario`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
