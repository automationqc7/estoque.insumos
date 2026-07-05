# Controle de Estoque de Insumos — App Web + Supabase

Aplicação web (React puro via CDN, sem etapa de build) para controlar
reservas, recebimentos, saídas e o estoque de insumos, com login por PN/senha
e histórico de movimentações. Os dados ficam no Supabase (Postgres na nuvem).

## O que tem aqui

```
project/
├── app/                    ← a aplicação em si (abra app/index.html)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── supabaseConfig.js   ← você edita com a URL/chave do SEU Supabase
├── supabase/
│   ├── schema.sql           ← rode 1º: cria as tabelas, a view e as funções de login
│   ├── seed_itens.sql       ← rode 2º: carrega os ~488 itens da sua planilha
│   ├── seed_movimentos.sql  ← rode 3º: carrega o histórico (reservas/recebimentos/saídas)
│   └── seed_usuario_admin.sql ← rode 4º: cria o usuário admin (PN "admin", senha "1234")
└── data/                    ← os mesmos dados em CSV, caso prefira importar
    ├── estoque.csv
    ├── reserva_recebimento.csv
    └── movimentacao.csv
```

## Passo 1 — Criar o projeto no Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto.
2. No painel, vá em **SQL Editor** e rode, **nesta ordem**:
   1. `supabase/schema.sql`
   2. `supabase/seed_itens.sql`
   3. `supabase/seed_movimentos.sql`
   4. `supabase/seed_usuario_admin.sql`
3. Vá em **Project Settings → API** e copie:
   - `Project URL`
   - `anon public key`

## Passo 2 — Conectar o app ao seu Supabase

Abra `app/supabaseConfig.js` e substitua:

```js
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "SUA-CHAVE-ANON-PUBLICA";
```

pelos valores copiados no passo anterior.

## Passo 3 — Abrir o app

Não precisa de `npm install` nem build. Duas opções:

- **Mais simples:** dê duplo clique em `app/index.html` para abrir no navegador.
  (Alguns navegadores bloqueiam `fetch` em arquivos abertos como `file://`;
  se isso acontecer, use a opção abaixo.)
- **Recomendado:** sirva a pasta `app/` com qualquer servidor estático, por
  exemplo com Python (`python3 -m http.server 8080` dentro da pasta `app/`)
  ou publicando em Netlify/Vercel/GitHub Pages (arraste a pasta `app/`).

## Passo 4 — Primeiro login

- **PN:** `admin`
- **Senha:** `1234`

No primeiro acesso o sistema vai pedir para trocar a senha. Depois disso,
use a aba **Configurações** para cadastrar as demais pessoas — todo novo
usuário também começa com a senha `1234` e é obrigado a trocá-la.

## A estrutura de dados (unificação das 3 abas da planilha)

A planilha original tinha 3 abas praticamente independentes. No banco isso
virou:

- **`itens`** — catálogo mestre (1 linha por código de insumo, com a
  descrição, unidade e estoque mínimo).
- **`movimentos_estoque`** — **livro único** de lançamentos. Cada reserva,
  cada recebimento e cada saída vira uma linha aqui, com um campo `tipo`
  (`reserva` / `recebimento` / `saida`), o código do item, a quantidade,
  a data e quem fez o lançamento.
- **`vw_estoque_atual`** — uma *view* (não uma tabela) que soma tudo isso em
  tempo real: `estoque_atual = total_recebido − total_consumido`, e marca
  `status = 'CRITICO'` quando o estoque atual fica abaixo do mínimo.

Essa é a parte que resolve o pedido de "pensar numa estruturação para
integrar as 3 bases numa única tabela": o livro único (`movimentos_estoque`)
é essa tabela — o "estoque" nunca é digitado à mão, ele é sempre calculado a
partir do histórico, então nunca fica desatualizado.

## Funcionalidades implementadas

- **Login por PN + senha**, com senha padrão `1234` no primeiro acesso e
  troca obrigatória (senhas ficam com hash bcrypt no banco, nunca em texto
  puro).
- **Página inicial** com os 3 cards pedidos (Reserva/Recebimento, Saída de
  Insumo, Estoque), indicadores gerais, alerta de itens críticos e gráfico
  de estoque atual × estoque mínimo.
- **Reserva/Recebimento:** cria reservas e confirma o recebimento (com
  laudo e pendência), ambos viram lançamentos no livro único.
- **Saída de Insumo:** registra consumo por turno, local e motivo,
  vinculado ao usuário logado.
- **Estoque:** tabela com busca, filtro de críticos e status calculado.
- **Configurações:** troca da própria senha e (para administradores)
  cadastro de novos usuários.
- **Design:** minimalista, inspirado no sistema visual da Apple — fundo
  neutro, cantos arredondados, glassmorphism (`backdrop-filter: blur`),
  barras de navegação fixas no topo/rodapé.

## Limitações conhecidas / próximos passos sugeridos

- O login é próprio (tabela `usuarios` + funções SQL), não usa o Supabase
  Auth — mais simples de casar com "login por PN", mas menos robusto que
  Auth nativo. Se quiser subir de nível de segurança depois, dá para migrar
  para Supabase Auth (e-mail/senha) mantendo o PN como um campo do perfil.
- As políticas de RLS (`supabase/schema.sql`) estão liberadas para qualquer
  requisição com a chave anônima, para não travar o login customizado. Para
  um ambiente de produção mais sensível, vale revisar essas políticas.
- O upload de laudos/anexos de recebimento não foi incluído — hoje o campo
  "Laudo" é só um texto (Aprovado/Reprovado/Pendente).
