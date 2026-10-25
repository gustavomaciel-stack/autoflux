# AutoFlux — Frontend

Aplicação em React e TypeScript (Vite), integrada à API PHP com PDO e MySQL/MariaDB.

## Executar localmente

1. Inicie o Apache/PHP e o servidor MySQL ou MariaDB usado pelo projeto.
2. Configure a conexão da API para o banco atual do AutoFlux.
3. Na pasta `frontend`, execute `npm install` e `npm run dev`.
4. Abra o endereço informado pelo Vite, normalmente `http://localhost:5173`.

O endereço local padrão das rotas é `http://localhost/autocar/api/routes/`.
Os serviços permitem configurar URLs por variáveis `VITE_API_*_URL`; o arquivo `.env.example` contém apenas um exemplo de fornecedor, não todas as rotas.

## Compilar

Execute `npm run build`. O resultado fica em `dist`.
A compilação local usa os endereços configurados durante o build. Para hospedagem, use a compilação preparada para o domínio e sua pasta `/api`; não publique um build apontando para localhost.

## Perfis e permissões

- As permissões dos perfis ativos de um usuário são somadas.
- O catálogo ativo do banco define os códigos aceitos, incluindo códigos legados sem ponto.
- Gestão/Diretoria tem acesso integral protegido.
- Administração de usuários, administração de perfis e devolução de consignação permanecem exclusivas de Gestão.
- Algumas ações acrescentam consultas necessárias automaticamente ao salvar.
- Após alterar permissões, atualize a página do usuário afetado para renovar os menus; a API verifica os acessos no servidor.
- As permissões financeiras genéricas do catálogo não criam telas adicionais. No código atual, custos e despesas são controlados por permissões específicas, como `custos.visualizar` e `despesas.visualizar`.

## Banco

`database/autocar.sql` é um dump histórico de 06/09/2026 e não representa o banco completo do MVP2. Não use esse arquivo para substituir ou restaurar o banco atual. Utilize um backup atualizado com as migrações efetivamente aplicadas.
