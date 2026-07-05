-- Usuário administrador padrão.
-- PN: admin
-- Senha inicial: 1234  (o sistema vai obrigar a troca no primeiro login)
--
-- Rode este arquivo DEPOIS de schema.sql (precisa da extensão pgcrypto e
-- da função criar_usuario já criadas).

select criar_usuario('admin', 'Administrador', '1234', 'admin');

-- Para cadastrar mais gente direto pelo SQL (opcional — o normal é usar a
-- aba Configurações do app):
-- select criar_usuario('12345', 'Nome da Pessoa', '1234', 'operador');
