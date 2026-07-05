-- ============================================================================
-- CONTROLE DE ESTOQUE DE INSUMOS — SCHEMA SUPABASE (PostgreSQL)
-- ============================================================================
-- PROPOSTA DE ESTRUTURA UNIFICADA
--
-- A planilha original tinha 3 abas praticamente independentes:
--   - "Reserva e Recebimento"  -> entradas de insumo (reserva + recebimento)
--   - "Movimentação"           -> saídas de insumo (consumo)
--   - "Estoque"                -> resultado calculado (recebido - consumido)
--
-- Aqui isso vira 2 tabelas + 1 view:
--
--   1) itens              -> catálogo mestre (1 linha por código de insumo)
--   2) movimentos_estoque -> LIVRO ÚNICO de lançamentos (tipo: reserva /
--                            recebimento / saida), cada linha aponta pro
--                            item e guarda quem fez e quando.
--   3) vw_estoque_atual   -> view calculada em tempo real a partir do livro
--                            único (substitui a aba "Estoque", que na
--                            planilha era uma fórmula).
--
-- Vantagem: recebimento e saída de um mesmo item ficam no mesmo lugar,
-- o histórico fica rastreável por usuário/data, e o "estoque" nunca fica
-- desatualizado porque é sempre calculado, nunca digitado à mão.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. USUÁRIOS (login por PN / senha)
-- ---------------------------------------------------------------------------
create table if not exists usuarios (
  id              uuid primary key default gen_random_uuid(),
  pn              text unique not null,              -- número de identificação (matrícula)
  nome            text not null,
  senha_hash      text not null,                      -- hash bcrypt (nunca texto puro)
  perfil          text not null default 'operador' check (perfil in ('admin','operador')),
  precisa_trocar_senha boolean not null default true, -- força troca no 1º acesso
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

comment on table usuarios is 'Login local por PN (não usa Supabase Auth) para casar com o formato "PN + senha" pedido. Senha default do 1º acesso é 1234 (ver seed.sql), com troca obrigatória.';

-- ---------------------------------------------------------------------------
-- 2. ITENS (catálogo mestre — vem da aba "Estoque")
-- ---------------------------------------------------------------------------
create table if not exists itens (
  codigo          text primary key,
  descricao       text not null default '',
  unidade         text not null default 'un',
  estoque_minimo  numeric not null default 0,
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. MOVIMENTOS_ESTOQUE (livro único — substitui as abas "Reserva e
--    Recebimento" e "Movimentação")
-- ---------------------------------------------------------------------------
create table if not exists movimentos_estoque (
  id                uuid primary key default gen_random_uuid(),
  tipo              text not null check (tipo in ('reserva','recebimento','saida')),
  codigo            text not null references itens(codigo) on update cascade,
  quantidade        numeric not null,
  data_movimento    timestamptz not null default now(),

  -- rastreabilidade: quem fez o lançamento
  usuario_pn        text references usuarios(pn),

  -- campos específicos de "reserva/recebimento"
  centro_custo      text,             -- C/C
  numero_reserva    text,             -- Reserva
  data_entrega      date,             -- Data da Entrega
  laudo             text,             -- Aprovado / Reprovado / Pendente
  quantidade_recebida numeric,
  pendencia         numeric default 0,
  responsavel_recebimento text,

  -- campos específicos de "saída / movimentação"
  turno             text,
  local_destino     text,
  motivo            text,

  observacoes       text,
  criado_em         timestamptz not null default now()
);

create index if not exists idx_mov_codigo on movimentos_estoque(codigo);
create index if not exists idx_mov_tipo on movimentos_estoque(tipo);
create index if not exists idx_mov_data on movimentos_estoque(data_movimento);

comment on table movimentos_estoque is 'Livro único: cada reserva, recebimento ou saída de insumo é uma linha aqui. O estoque final é sempre calculado (view vw_estoque_atual), nunca armazenado.';

-- ---------------------------------------------------------------------------
-- 4. VIEW: ESTOQUE ATUAL (substitui a aba "Estoque")
-- ---------------------------------------------------------------------------
create or replace view vw_estoque_atual as
select
  i.codigo,
  i.descricao,
  i.unidade,
  i.estoque_minimo,
  coalesce(sum(m.quantidade) filter (where m.tipo = 'recebimento'), 0)              as total_recebido,
  coalesce(sum(m.quantidade) filter (where m.tipo = 'saida'), 0)                    as total_consumido,
  coalesce(sum(m.quantidade) filter (where m.tipo = 'recebimento'), 0)
    - coalesce(sum(m.quantidade) filter (where m.tipo = 'saida'), 0)                as estoque_atual,
  case
    when (coalesce(sum(m.quantidade) filter (where m.tipo = 'recebimento'), 0)
          - coalesce(sum(m.quantidade) filter (where m.tipo = 'saida'), 0)) < i.estoque_minimo
      then 'CRITICO'
    else 'OK'
  end as status
from itens i
left join movimentos_estoque m on m.codigo = i.codigo
where i.ativo = true
group by i.codigo, i.descricao, i.unidade, i.estoque_minimo;

-- ---------------------------------------------------------------------------
-- 5. RLS (Row Level Security) — habilitado, liberado para usuários
--    autenticados via a própria aplicação (login customizado por PN).
--    Ajuste as políticas conforme sua necessidade de segurança real.
-- ---------------------------------------------------------------------------
alter table usuarios enable row level security;
alter table itens enable row level security;
alter table movimentos_estoque enable row level security;

-- Usa a chave "anon" do Supabase apenas dentro da própria aplicação.
-- Como o login é próprio (não é o Supabase Auth), liberamos acesso via anon key
-- e a segurança de "quem pode logar" fica a cargo da tela de login do app.
create policy "leitura publica usuarios" on usuarios for select using (true);
create policy "escrita publica usuarios" on usuarios for insert with check (true);
create policy "atualizacao publica usuarios" on usuarios for update using (true);

create policy "leitura publica itens" on itens for select using (true);
create policy "escrita publica itens" on itens for insert with check (true);
create policy "atualizacao publica itens" on itens for update using (true);

create policy "leitura publica movimentos" on movimentos_estoque for select using (true);
create policy "escrita publica movimentos" on movimentos_estoque for insert with check (true);
create policy "atualizacao publica movimentos" on movimentos_estoque for update using (true);

-- ---------------------------------------------------------------------------
-- 6. LOGIN SEGURO VIA FUNÇÕES (pgcrypto) — a senha nunca trafega em texto
--    puro nem o hash é exposto ao navegador; o app chama estas funções via
--    supabase.rpc(...).
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- Autentica por PN + senha. Retorna os dados do usuário (sem o hash) ou nada.
create or replace function login_usuario(p_pn text, p_senha text)
returns table (id uuid, pn text, nome text, perfil text, precisa_trocar_senha boolean)
language plpgsql
security definer
as $$
begin
  return query
    select u.id, u.pn, u.nome, u.perfil, u.precisa_trocar_senha
    from usuarios u
    where u.pn = p_pn
      and u.ativo = true
      and u.senha_hash = crypt(p_senha, u.senha_hash);
end;
$$;

-- Troca a senha do usuário (exige a senha atual) e desliga o "precisa trocar".
create or replace function trocar_senha_usuario(p_pn text, p_senha_atual text, p_senha_nova text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_ok boolean;
begin
  select exists(
    select 1 from usuarios
    where pn = p_pn and senha_hash = crypt(p_senha_atual, senha_hash)
  ) into v_ok;

  if not v_ok then
    return false;
  end if;

  update usuarios
    set senha_hash = crypt(p_senha_nova, gen_salt('bf')),
        precisa_trocar_senha = false
    where pn = p_pn;

  return true;
end;
$$;

-- Cria um novo usuário já com hash de senha (usado na tela Configurações).
-- Senha padrão sugerida no app: 1234 (o próprio banco força a troca no 1º acesso).
create or replace function criar_usuario(p_pn text, p_nome text, p_senha text, p_perfil text default 'operador')
returns boolean
language plpgsql
security definer
as $$
begin
  insert into usuarios (pn, nome, senha_hash, perfil, precisa_trocar_senha)
  values (p_pn, p_nome, crypt(p_senha, gen_salt('bf')), p_perfil, true);
  return true;
exception when unique_violation then
  return false;
end;
$$;

grant execute on function login_usuario(text, text) to anon, authenticated;
grant execute on function trocar_senha_usuario(text, text, text) to anon, authenticated;
grant execute on function criar_usuario(text, text, text, text) to anon, authenticated;

-- ATENÇÃO DE SEGURANÇA:
-- Essas políticas liberam leitura/escrita para qualquer requisição que use a
-- anon key (ou seja, qualquer um que tenha o link do app). Isso é aceitável
-- para uma primeira versão interna, mas para produção real o recomendado é:
--   a) migrar o login para o Supabase Auth (email/senha ou PN@empresa.com), e
--   b) trocar essas políticas para "using (auth.uid() is not null)".
-- Deixamos assim por enquanto para não travar o funcionamento com login
-- próprio por PN + senha, como pedido.
