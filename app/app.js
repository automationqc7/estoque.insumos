const { useState, useEffect, useMemo, useRef, useCallback } = React;

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SESSION_KEY = "estoque_insumos_session";

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function fmtNum(n) {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString("pt-BR");
}
function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch (e) {
    return d;
  }
}

// ============================================================================
// LOGIN
// ============================================================================
function LoginScreen({ onLogin }) {
  const [pn, setPn] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    if (!pn || !senha) {
      setErro("Informe seu PN e sua senha.");
      return;
    }
    setCarregando(true);
    const { data, error } = await sb.rpc("login_usuario", { p_pn: pn.trim(), p_senha: senha });
    setCarregando(false);
    if (error) {
      setErro("Não foi possível entrar. Tente novamente.");
      return;
    }
    if (!data || data.length === 0) {
      setErro("PN ou senha incorretos.");
      return;
    }
    onLogin(data[0]);
  }

  return (
    <div className="login-screen">
      <div className="card login-card">
        <div className="login-logo"><CubeIcon size={26} /></div>
        <h1>Gestão de Insumos</h1>
        <div className="subtitle">Entre com seu PN e senha</div>
        {erro && <div className="login-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>PN</label>
            <input
              type="text"
              value={pn}
              onChange={(e) => setPn(e.target.value)}
              placeholder="Ex: 12345"
              autoFocus
            />
          </div>
          <div className="field">
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••"
            />
          </div>
          <button className="btn btn-primary btn-full" disabled={carregando}>
            {carregando ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <div className="login-hint">Primeiro acesso? A senha padrão é <strong>1234</strong>.</div>
      </div>
    </div>
  );
}

// ============================================================================
// TROCA DE SENHA OBRIGATÓRIA
// ============================================================================
function ForcePasswordChange({ user, onDone }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    if (nova.length < 4) {
      setErro("A nova senha precisa ter pelo menos 4 caracteres.");
      return;
    }
    if (nova !== confirma) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    setCarregando(true);
    const { data, error } = await sb.rpc("trocar_senha_usuario", {
      p_pn: user.pn,
      p_senha_atual: atual,
      p_senha_nova: nova,
    });
    setCarregando(false);
    if (error || !data) {
      setErro("Senha atual incorreta.");
      return;
    }
    onDone();
  }

  return (
    <div className="login-screen">
      <div className="card login-card">
        <div className="login-logo">🔒</div>
        <h1>Defina uma nova senha</h1>
        <div className="subtitle">Por segurança, troque a senha padrão antes de continuar</div>
        {erro && <div className="login-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Senha atual</label>
            <input type="password" value={atual} onChange={(e) => setAtual(e.target.value)} />
          </div>
          <div className="field">
            <label>Nova senha</label>
            <input type="password" value={nova} onChange={(e) => setNova(e.target.value)} />
          </div>
          <div className="field">
            <label>Confirmar nova senha</label>
            <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-full" disabled={carregando}>
            {carregando ? "Salvando…" : "Salvar e continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// NAVEGAÇÃO
// ============================================================================
const APP_NAME = "Gestão de Insumos";

// Ícone da aplicação: caixa de papelão 3D.
function CubeIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.6l8.5 4.4v9.9L12 21.4 3.5 16.9V7L12 2.6z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M3.6 7L12 11.4 20.4 7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M12 11.4V21.4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 4.1l8.4 4.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
      <rect x="10.4" y="12.7" width="3.2" height="1.8" rx="0.4" fill="currentColor" opacity="0.55"/>
    </svg>
  );
}

const NAV_ITEMS = [
  { key: "inicio", label: "Início", icon: "🏠" },
  { key: "dashboard", label: "Dashboard", icon: "📈" },
  { key: "reserva", label: "Reserva", icon: "🧾" },
  { key: "saida", label: "Saída", icon: "📤" },
  { key: "estoque", label: "Estoque", icon: "📊" },
  { key: "config", label: "Config.", icon: "⚙️" },
];

// Cores do tema — gráficos em tons de azul
const CHART_COLORS = {
  accent: "#0071e3",
  accentSoft: "#4a9eea",
  green: "#2a7ab5",
  red: "#c0522f",
  blue: "#0071e3",
  palette: ["#0a4d8c", "#0071e3", "#3d8fdc", "#5aa9e6", "#7cbde8", "#9bcdef", "#2a6aa0", "#b6ddf5"],
};

function TopBar({ user, onLogout }) {
  return (
    <div className="topbar">
      <div className="topbar-brand">
        <span className="brand-icon"><CubeIcon size={20} /></span>
        <span className="brand-text">
          {APP_NAME}
          <span className="brand-sub">Controle da Qualidade - Área Quente</span>
        </span>
      </div>
      <div className="topbar-user">
        <span className="user-pill">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          {user.nome}
        </span>
        <button onClick={onLogout} title="Sair">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sair
        </button>
      </div>
    </div>
  );
}

function TopNav({ active, onChange }) {
  return (
    <nav className="topnav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          className={active === item.key ? "active" : ""}
          onClick={() => onChange(item.key)}
          title={item.label}
        >
          <span className="icon">{item.icon}</span>
          <span className="label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ============================================================================
// DASHBOARD (INÍCIO)
// ============================================================================
function Dashboard({ user, onNavigate }) {
  const [estoque, setEstoque] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb
      .from("vw_estoque_atual")
      .select("*")
      .order("estoque_atual", { ascending: true });
    if (!error && data) setEstoque(data);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const criticos = useMemo(() => estoque.filter((i) => i.status === "CRITICO"), [estoque]);
  const totalItens = estoque.length;
  const totalConsumido = useMemo(
    () => estoque.reduce((acc, i) => acc + Number(i.total_consumido || 0), 0),
    [estoque]
  );
  const totalRecebido = useMemo(
    () => estoque.reduce((acc, i) => acc + Number(i.total_recebido || 0), 0),
    [estoque]
  );

  useEffect(() => {
    if (loading || !chartRef.current) return;
    const top = criticos.length > 0
      ? criticos.slice(0, 12)
      : [...estoque].sort((a, b) => (a.estoque_atual - a.estoque_minimo) - (b.estoque_atual - b.estoque_minimo)).slice(0, 12);

    const labels = top.map((i) => (i.descricao || i.codigo).slice(0, 22));
    const atual = top.map((i) => Number(i.estoque_atual));
    const minimo = top.map((i) => Number(i.estoque_minimo));

    if (chartInstance.current) chartInstance.current.destroy();
    chartInstance.current = new Chart(chartRef.current.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            // "Recipiente": contorno vermelho fino = nível do estoque mínimo
            label: "Estoque mínimo",
            data: minimo,
            backgroundColor: "rgba(192, 82, 47, 0.04)",
            borderColor: CHART_COLORS.red,
            borderWidth: { top: 1.5, left: 1.5, right: 1.5, bottom: 0 },
            borderSkipped: false,
            borderRadius: 3,
            categoryPercentage: 0.6,
            barPercentage: 0.9,
            grouped: false,
            order: 2,
          },
          {
            // Preenchimento azul = estoque atual (sobe até o nível atual)
            label: "Estoque atual",
            data: atual,
            backgroundColor: "#0071e3",
            borderRadius: 3,
            categoryPercentage: 0.6,
            barPercentage: 0.62,
            grouped: false,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top", labels: { usePointStyle: true, boxWidth: 8, font: { family: "Inter" } } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 } } },
          y: { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { font: { family: "Inter" } }, beginAtZero: true },
        },
      },
    });
  }, [loading, estoque, criticos]);

  return (
    <div>
      <div className="page-header">
        <h1>Olá, {user.nome.split(" ")[0]} 👋</h1>
        <p>Aqui está a visão geral da gestão de insumos hoje.</p>
      </div>

      {!loading && criticos.length > 0 && (
        <div className="alert-banner">
          <span className="icon">⚠️</span>
          <div>
            <strong>{criticos.length} {criticos.length === 1 ? "item está" : "itens estão"} abaixo do estoque mínimo</strong>
            <p>Priorize a reposição destes insumos o quanto antes.</p>
            <ul className="alert-list">
              {criticos.slice(0, 8).map((i) => (
                <li key={i.codigo}>{i.descricao || i.codigo} · {fmtNum(i.estoque_atual)}/{fmtNum(i.estoque_minimo)}</li>
              ))}
              {criticos.length > 8 && <li>+{criticos.length - 8} outros</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="label">Itens cadastrados</div>
          <div className="value">{fmtNum(totalItens)}</div>
        </div>
        <div className="card stat-card tone-critical">
          <div className="label">Itens críticos</div>
          <div className="value">{fmtNum(criticos.length)}</div>
        </div>
        <div className="card stat-card">
          <div className="label">Total recebido</div>
          <div className="value">{fmtNum(totalRecebido)}</div>
        </div>
        <div className="card stat-card">
          <div className="label">Total consumido</div>
          <div className="value">{fmtNum(totalConsumido)}</div>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="card action-card tone-blue" onClick={() => onNavigate("reserva")}>
          <div className="icon-badge">🧾</div>
          <h3>Reserva / Recebimento</h3>
          <p>Registre reservas de insumos e confirme o recebimento no almoxarifado.</p>
          <span className="cta">Abrir →</span>
        </div>
        <div className="card action-card tone-dark" onClick={() => onNavigate("saida")}>
          <div className="icon-badge">📤</div>
          <h3>Saída de Insumo</h3>
          <p>Registre o consumo de um item, por turno, local e motivo.</p>
          <span className="cta">Abrir →</span>
        </div>
        <div className="card action-card tone-green" onClick={() => onNavigate("estoque")}>
          <div className="icon-badge">📊</div>
          <h3>Estoque</h3>
          <p>Consulte a posição atual de cada item e compare com o mínimo.</p>
          <span className="cta">Abrir →</span>
        </div>
      </div>

      <div className="card section">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h2>Quantidade em estoque × estoque mínimo</h2>
          <span className="small muted">{criticos.length > 0 ? "Itens mais críticos" : "Itens mais próximos do mínimo"}</span>
        </div>
        <div className="chart-wrap">
          {loading ? <div className="empty-state">Carregando…</div> : <canvas ref={chartRef}></canvas>}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RESERVA / RECEBIMENTO
// ============================================================================
function ReservaRecebimento({ user, itens }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [recebendo, setRecebendo] = useState(null);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb
      .from("movimentos_estoque")
      .select("*")
      .eq("tipo", "reserva")
      .order("data_movimento", { ascending: false })
      .limit(200);
    setLista(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrado = useMemo(() => {
    if (!busca) return lista;
    const q = busca.toLowerCase();
    return lista.filter((m) => `${m.numero_reserva || ""}`.toLowerCase().includes(q));
  }, [lista, busca]);

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>Reserva / Recebimento</h1>
          <p>Solicite a reserva de um insumo e confirme quando ele chegar.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Nova reserva</button>
      </div>

      <div className="card section">
        <div className="flex-between" style={{ marginBottom: 14 }}>
          <h2>Últimas reservas</h2>
          <input
            className="search-input"
            type="text"
            placeholder="Buscar por nº da reserva…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", maxWidth: 260 }}
          />
        </div>
        <div className="table-scroll">
          <table className="data-table sticky-head">
            <thead>
              <tr>
                <th>Data Reserva</th><th>Reserva</th><th>Responsável</th><th>Código</th><th>Descrição</th><th>Quant.</th><th>Un.</th>
                <th>C/C</th><th>Data da Entrega</th><th>Laudo</th><th>Qtd. Recebida</th><th>Pendência</th><th>Resp. Recebimento</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtrado.map((m) => {
                const solicitante = (m.observacoes || "").replace(/^Solicitado por\s*/i, "") || "—";
                return (
                <tr key={m.id}>
                  <td>{fmtDate(m.data_movimento)}</td>
                  <td>{m.numero_reserva || "—"}</td>
                  <td>{solicitante}</td>
                  <td>{m.codigo}</td>
                  <td>{(itens[m.codigo] || {}).descricao || "—"}</td>
                  <td>{fmtNum(m.quantidade)}</td>
                  <td>{m.unidade || (itens[m.codigo] || {}).unidade || "—"}</td>
                  <td>{m.centro_custo || "—"}</td>
                  <td>{m.data_entrega ? fmtDate(m.data_entrega) : "—"}</td>
                  <td>
                    {m.laudo === "Aprovado" ? <span className="badge badge-ok">Aprovado</span>
                      : m.laudo ? <span className="badge badge-neutral">{m.laudo}</span>
                      : <span className="badge badge-critical">Pendente</span>}
                  </td>
                  <td>{fmtNum(m.quantidade_recebida)}</td>
                  <td>{Number(m.pendencia) > 0 ? <span className="badge badge-critical">{fmtNum(m.pendencia)}</span> : "—"}</td>
                  <td>{m.responsavel_recebimento || "—"}</td>
                  <td>
                    {!m.quantidade_recebida || Number(m.quantidade_recebida) < Number(m.quantidade) ? (
                      <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => setRecebendo(m)}>
                        Receber
                      </button>
                    ) : "—"}
                  </td>
                </tr>
              );})}
              {!loading && filtrado.length === 0 && (
                <tr><td colSpan="14"><div className="empty-state">Nenhuma reserva encontrada.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <NovaReservaModal
          user={user}
          itens={itens}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); carregar(); }}
        />
      )}
      {recebendo && (
        <ConfirmarRecebimentoModal
          movimento={recebendo}
          user={user}
          onClose={() => setRecebendo(null)}
          onSaved={() => { setRecebendo(null); carregar(); }}
        />
      )}
    </div>
  );
}

function ItemSelect({ itens, value, onChange }) {
  const options = useMemo(() => Object.values(itens).sort((a, b) => (a.descricao || "").localeCompare(b.descricao || "")), [itens]);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Selecione um item…</option>
      {options.map((it) => (
        <option key={it.codigo} value={it.codigo}>
          {it.codigo} — {it.descricao || "(sem descrição)"}
        </option>
      ))}
    </select>
  );
}

// Campo de busca por descrição, com lista suspensa filtrada pelo que é digitado.
function ItemSearchSelect({ itens, value, onChange, allowClear = false, placeholder }) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const wrapRef = useRef(null);

  const options = useMemo(
    () => Object.values(itens).sort((a, b) => (a.descricao || "").localeCompare(b.descricao || "")),
    [itens]
  );

  // Quando um item já está selecionado, mostra sua descrição no campo.
  useEffect(() => {
    if (value && itens[value]) setTexto(`${itens[value].descricao || ""} (${value})`);
    else if (!value) setTexto("");
  }, [value, itens]);

  // Fecha a lista ao clicar fora.
  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return options.slice(0, 40);
    return options
      .filter((it) => (it.descricao || "").toLowerCase().includes(q) || `${it.codigo}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [texto, options]);

  return (
    <div className="combo" ref={wrapRef}>
      <input
        type="text"
        value={texto}
        placeholder={placeholder || "Buscar por código ou descrição…"}
        onChange={(e) => { setTexto(e.target.value); setAberto(true); if (value) onChange(""); }}
        onFocus={() => setAberto(true)}
      />
      {aberto && (
        <ul className="combo-list">
          {allowClear && (
            <li className="combo-clear" onMouseDown={() => { onChange(""); setTexto(""); setAberto(false); }}>
              Todos
            </li>
          )}
          {filtrados.map((it) => (
            <li
              key={it.codigo}
              onMouseDown={() => { onChange(it.codigo); setTexto(`${it.descricao || ""} (${it.codigo})`); setAberto(false); }}
            >
              <strong>{it.descricao || "(sem descrição)"}</strong>
              <span className="combo-code">{it.codigo}</span>
            </li>
          ))}
          {filtrados.length === 0 && <li className="combo-empty">Nenhum item encontrado</li>}
        </ul>
      )}
    </div>
  );
}

const LOCAIS_DESTINO = ["Laminação", "Tratamento Térmico", "Flex Line", "Fast Casing", "Fábrica de Luvas"];

const UNIDADES = ["pç", "lt", "un", "kg", "cj"];

// Ícones de ação (lápis, lixo, chave) no mesmo estilo visual
function IconButton({ kind, title, onClick }) {
  const icons = {
    edit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    delete: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
    key: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  };
  return (
    <button className={`icon-btn icon-btn-${kind}`} title={title} onClick={onClick} type="button">
      {icons[kind]}
    </button>
  );
}

function NovaReservaModal({ user, itens, onClose, onSaved }) {
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [cc, setCc] = useState("");
  const [numeroReserva, setNumeroReserva] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Descrição correspondente ao código digitado (base: itens da aba Estoque)
  const descricao = (itens[codigo.trim()] || {}).descricao || "";
  const codigoValido = !!itens[codigo.trim()];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!codigo.trim()) { setErro("Informe o código do produto."); return; }
    if (!codigoValido) { setErro("Código não encontrado no cadastro de produtos."); return; }
    if (!quantidade) { setErro("Informe a quantidade."); return; }
    if (!cc.trim()) { setErro("O centro de custo é obrigatório."); return; }
    if (!numeroReserva.trim()) { setErro("O número da reserva é obrigatório."); return; }
    setSalvando(true);
    const { error } = await sb.from("movimentos_estoque").insert({
      tipo: "reserva",
      codigo: codigo.trim(),
      quantidade: Number(quantidade),
      centro_custo: cc.trim(),
      numero_reserva: numeroReserva.trim(),
      usuario_pn: user.pn,
      observacoes: `Solicitado por ${user.nome}`,
    });
    setSalvando(false);
    if (error) { setErro("Não foi possível salvar. Tente novamente."); return; }
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Nova reserva</h2>
        <div className="subtitle">Registrada por {user.nome}</div>
        {erro && <div className="login-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Código</label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Digite o código do produto"
              autoFocus
            />
          </div>
          <div className="field">
            <label>Descrição</label>
            <input
              type="text"
              readOnly
              placeholder="Preenchida automaticamente pelo código"
              style={{ background: "rgba(0,0,0,0.03)", color: codigo && !codigoValido ? "var(--critical)" : "var(--text)" }}
              value={codigo && !codigoValido ? "Código não encontrado" : descricao}
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Quantidade</label>
              <input type="number" min="0" step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            <div className="field">
              <label>Centro de custo</label>
              <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Nº da reserva</label>
            <input type="text" value={numeroReserva} onChange={(e) => setNumeroReserva(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando…" : "Salvar reserva"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmarRecebimentoModal({ movimento, user, onClose, onSaved }) {
  const jaRecebido = Number(movimento.quantidade_recebida) || 0;
  const restante = Math.max(0, Number(movimento.quantidade) - jaRecebido);
  const [qtdRecebida, setQtdRecebida] = useState(restante || "");
  const [laudo, setLaudo] = useState("Aprovado");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const qtd = Number(qtdRecebida);
    if (!qtd || qtd <= 0) { setErro("Informe a quantidade recebida."); return; }
    setSalvando(true);

    // Acumula sobre o que já foi recebido antes (recebimentos parciais somam).
    const totalRecebido = jaRecebido + qtd;
    const pendencia = Math.max(0, Number(movimento.quantidade) - totalRecebido);

    // 1) Atualiza a reserva com o total acumulado e a pendência restante.
    //    Não sobrescreve o histórico: cada recebimento vira uma linha própria (passo 2).
    const { error: e1 } = await sb.from("movimentos_estoque")
      .update({
        quantidade_recebida: totalRecebido,
        laudo,
        pendencia,
        responsavel_recebimento: user.nome,
      })
      .eq("id", movimento.id);

    // 2) Registra ESTE recebimento como um novo lançamento (só a qtd desta vez),
    //    preservando quem recebeu e quando — sem apagar recebimentos anteriores.
    const { error: e2 } = await sb.from("movimentos_estoque").insert({
      tipo: "recebimento",
      codigo: movimento.codigo,
      quantidade: qtd,
      numero_reserva: movimento.numero_reserva,
      centro_custo: movimento.centro_custo,
      laudo,
      quantidade_recebida: qtd,
      pendencia,
      responsavel_recebimento: user.nome,
      usuario_pn: user.pn,
      observacoes: pendencia > 0 ? "Recebimento parcial" : null,
    });

    setSalvando(false);
    if (e1 || e2) { setErro("Não foi possível confirmar o recebimento."); return; }
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Confirmar recebimento</h2>
        <div className="subtitle">
          Item {movimento.codigo} · reservado {fmtNum(movimento.quantidade)}
          {jaRecebido > 0 && ` · já recebido ${fmtNum(jaRecebido)} (faltam ${fmtNum(restante)})`}
        </div>
        {erro && <div className="login-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label>Quantidade recebida agora</label>
              <input type="number" min="0" step="any" value={qtdRecebida} onChange={(e) => setQtdRecebida(e.target.value)} autoFocus />
            </div>
            <div className="field">
              <label>Laudo</label>
              <select value={laudo} onChange={(e) => setLaudo(e.target.value)}>
                <option>Aprovado</option>
                <option>Reprovado</option>
                <option>Pendente</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Responsável pelo recebimento</label>
            <input type="text" value={user.nome} readOnly style={{ background: "rgba(0,0,0,0.03)" }} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando…" : "Confirmar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// SAÍDA DE INSUMO
// ============================================================================
function Saida({ user, itens }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nomesPorPn, setNomesPorPn] = useState({});

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb
      .from("movimentos_estoque")
      .select("*")
      .eq("tipo", "saida")
      .order("data_movimento", { ascending: false })
      .limit(200);
    setLista(data || []);
    // resolve nomes dos usuários que registraram
    const pns = Array.from(new Set((data || []).map((m) => m.usuario_pn).filter(Boolean)));
    if (pns.length > 0) {
      const { data: us } = await sb.from("usuarios").select("pn, nome").in("pn", pns);
      const map = {};
      (us || []).forEach((u) => { map[u.pn] = u.nome; });
      setNomesPorPn(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>Saída de Insumo</h1>
          <p>Registre o consumo de um item do estoque.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Registrar saída</button>
      </div>

      <div className="card section">
        <h2 style={{ marginBottom: 14 }}>Últimas saídas</h2>
        <div className="table-scroll">
          <table className="data-table sticky-head">
            <thead>
              <tr><th>Data</th><th>Turno</th><th>Código</th><th>Descrição</th><th>Quant.</th><th>Un.</th><th>Local</th><th>Motivo</th><th>Registrado por</th></tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id}>
                  <td>{fmtDate(m.data_movimento)}</td>
                  <td>{m.turno || "—"}</td>
                  <td>{m.codigo}</td>
                  <td>{(itens[m.codigo] || {}).descricao || "—"}</td>
                  <td>{fmtNum(m.quantidade)}</td>
                  <td>{m.unidade || (itens[m.codigo] || {}).unidade || "—"}</td>
                  <td>{m.local_destino || "—"}</td>
                  <td>{m.motivo || "—"}</td>
                  <td>{m.usuario_pn ? (nomesPorPn[m.usuario_pn] || m.usuario_pn) : "—"}</td>
                </tr>
              ))}
              {!loading && lista.length === 0 && (
                <tr><td colSpan="9"><div className="empty-state">Nenhuma saída registrada ainda.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <NovaSaidaModal
          user={user}
          itens={itens}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); carregar(); }}
        />
      )}
    </div>
  );
}

function NovaSaidaModal({ user, itens, onClose, onSaved }) {
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [turno, setTurno] = useState("1");
  const [local, setLocal] = useState("");
  const [motivo, setMotivo] = useState("Consumo");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!codigo) { setErro("Busque e selecione o item."); return; }
    if (!quantidade) { setErro("Informe a quantidade."); return; }
    if (!local) { setErro("Selecione o local de destino."); return; }
    setSalvando(true);
    const { error } = await sb.from("movimentos_estoque").insert({
      tipo: "saida",
      codigo,
      quantidade: Number(quantidade),
      unidade: (itens[codigo] || {}).unidade || null,
      turno,
      local_destino: local,
      motivo,
      usuario_pn: user.pn,
    });
    setSalvando(false);
    if (error) { setErro("Não foi possível salvar. Tente novamente."); return; }
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Registrar saída</h2>
        <div className="subtitle">Registrado por {user.nome}</div>
        {erro && <div className="login-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Item</label>
            <ItemSearchSelect itens={itens} value={codigo} onChange={setCodigo} />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Quantidade</label>
              <input type="number" min="0" step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            <div className="field">
              <label>Turno</label>
              <select value={turno} onChange={(e) => setTurno(e.target.value)}>
                <option value="1">1º turno</option>
                <option value="2">2º turno</option>
                <option value="3">3º turno</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Local de destino</label>
              <select value={local} onChange={(e) => setLocal(e.target.value)}>
                <option value="">Selecione…</option>
                {LOCAIS_DESTINO.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Motivo</label>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                <option>Consumo</option>
                <option>Correção Estoque</option>
                <option>Perda</option>
                <option>Avaria</option>
                <option>Empréstimo</option>
                <option>Outro</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando…" : "Registrar saída"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// ESTOQUE
// ============================================================================
function Estoque() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("vw_estoque_atual").select("*").order("descricao", { ascending: true });
    setDados(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrado = useMemo(() => {
    return dados.filter((i) => {
      if (filtro === "criticos" && i.status !== "CRITICO") return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (!(`${i.codigo}`.includes(q) || (i.descricao || "").toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [dados, busca, filtro]);

  const criticos = dados.filter((i) => i.status === "CRITICO").length;

  return (
    <div>
      <div className="page-header">
        <h1>Estoque</h1>
        <p>Posição atual calculada a partir de todas as reservas, recebimentos e saídas.</p>
      </div>

      <div className="card section">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <input
            className="search-input"
            type="text"
            placeholder="Buscar por código ou descrição…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", flex: 1 }}
          />
          <div className="tag-row" style={{ marginBottom: 0 }}>
            <button className={`tag-filter ${filtro === "todos" ? "active" : ""}`} onClick={() => setFiltro("todos")}>Todos ({dados.length})</button>
            <button className={`tag-filter ${filtro === "criticos" ? "active" : ""}`} onClick={() => setFiltro("criticos")}>Críticos ({criticos})</button>
          </div>
        </div>

        <div className="table-scroll tall">
          <table className="data-table sticky-head">
            <thead>
              <tr><th>Código</th><th>Descrição</th><th>Un.</th><th>Recebido</th><th>Consumido</th><th>Estoque</th><th>Mínimo</th><th title="Média de saídas por mês nos últimos 12 meses">Consumo médio/mês</th><th title="Média de dias entre a reserva e o recebimento">Entrega média (dias)</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtrado.map((i) => (
                <tr key={i.codigo} className={i.status === "CRITICO" ? "row-critical" : ""}>
                  <td>{i.codigo}</td>
                  <td>{i.descricao || "—"}</td>
                  <td>{i.unidade}</td>
                  <td>{fmtNum(i.total_recebido)}</td>
                  <td>{fmtNum(i.total_consumido)}</td>
                  <td><strong>{fmtNum(i.estoque_atual)}</strong></td>
                  <td>{fmtNum(i.estoque_minimo)}</td>
                  <td>{i.consumo_medio_mensal != null ? fmtNum(i.consumo_medio_mensal) : "—"}</td>
                  <td>{i.tempo_medio_entrega_dias != null ? `${fmtNum(i.tempo_medio_entrega_dias)} d` : "—"}</td>
                  <td>
                    {i.status === "CRITICO"
                      ? <span className="badge badge-critical">Crítico</span>
                      : <span className="badge badge-ok">OK</span>}
                  </td>
                </tr>
              ))}
              {!loading && filtrado.length === 0 && (
                <tr><td colSpan="10"><div className="empty-state">Nenhum item encontrado.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD (análise com filtros e gráficos)
// ============================================================================

// Componente genérico de gráfico Chart.js (cria/destrói conforme os dados).
function ChartBox({ type, data, options, height = 300 }) {
  const canvasRef = useRef(null);
  const instRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (instRef.current) instRef.current.destroy();
    instRef.current = new Chart(canvasRef.current.getContext("2d"), {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...options,
      },
    });
    return () => { if (instRef.current) instRef.current.destroy(); };
  }, [type, data, options]);

  return (
    <div style={{ height }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

// Converte "YYYY-MM" -> "mmm/yy" para rótulos mais curtos
function labelMes(ym) {
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [y, m] = ym.split("-");
  return `${meses[Number(m) - 1]}/${y.slice(2)}`;
}

function DashboardAnalytics({ itens }) {
  const [movs, setMovs] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [fLocal, setFLocal] = useState("");
  const [fCodigo, setFCodigo] = useState("");
  const [fDataIni, setFDataIni] = useState("");
  const [fDataFim, setFDataFim] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    // busca reservas e saídas (recebimento não é usado nestes gráficos)
    const { data } = await sb
      .from("movimentos_estoque")
      .select("tipo, codigo, quantidade, data_movimento, local_destino")
      .in("tipo", ["reserva", "saida"])
      .order("data_movimento", { ascending: true })
      .limit(20000);
    setMovs(data || []);
    const { data: est } = await sb.from("vw_estoque_atual").select("codigo, descricao, estoque_atual").order("estoque_atual", { ascending: false });
    setEstoque(est || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // aplica os filtros (combinados por E)
  const filtrado = useMemo(() => {
    return movs.filter((m) => {
      if (fLocal && m.local_destino !== fLocal) return false;
      if (fCodigo && `${m.codigo}` !== `${fCodigo}`) return false;
      if (fDataIni && (!m.data_movimento || m.data_movimento.slice(0, 10) < fDataIni)) return false;
      if (fDataFim && (!m.data_movimento || m.data_movimento.slice(0, 10) > fDataFim)) return false;
      return true;
    });
  }, [movs, fLocal, fCodigo, fDataIni, fDataFim]);

  const temFiltro = fLocal || fCodigo || fDataIni || fDataFim;

  // --- agregações ---

  // 1) reservas por mês
  const reservasPorMes = useMemo(() => {
    const map = {};
    filtrado.filter((m) => m.tipo === "reserva").forEach((m) => {
      if (!m.data_movimento) return;
      const ym = m.data_movimento.slice(0, 7);
      map[ym] = (map[ym] || 0) + Number(m.quantidade || 0);
    });
    return Object.keys(map).sort().map((k) => ({ mes: k, valor: map[k] }));
  }, [filtrado]);

  // 2) saídas por mês
  const saidasPorMes = useMemo(() => {
    const map = {};
    filtrado.filter((m) => m.tipo === "saida").forEach((m) => {
      if (!m.data_movimento) return;
      const ym = m.data_movimento.slice(0, 7);
      map[ym] = (map[ym] || 0) + Number(m.quantidade || 0);
    });
    return Object.keys(map).sort().map((k) => ({ mes: k, valor: map[k] }));
  }, [filtrado]);

  // 3) consumo por área (local) por mês -> dataset empilhado
  const consumoAreaMes = useMemo(() => {
    const saidas = filtrado.filter((m) => m.tipo === "saida" && m.data_movimento);
    const meses = Array.from(new Set(saidas.map((m) => m.data_movimento.slice(0, 7)))).sort();
    const areas = Array.from(new Set(saidas.map((m) => m.local_destino || "—")));
    const matriz = {}; // area -> {mes: total}
    areas.forEach((a) => { matriz[a] = {}; });
    saidas.forEach((m) => {
      const ym = m.data_movimento.slice(0, 7);
      const a = m.local_destino || "—";
      matriz[a][ym] = (matriz[a][ym] || 0) + Number(m.quantidade || 0);
    });
    return { meses, areas, matriz };
  }, [filtrado]);

  // 4) itens mais consumidos
  const itensMaisConsumidos = useMemo(() => {
    const map = {};
    filtrado.filter((m) => m.tipo === "saida").forEach((m) => {
      map[m.codigo] = (map[m.codigo] || 0) + Number(m.quantidade || 0);
    });
    return Object.keys(map)
      .map((cod) => ({ codigo: cod, valor: map[cod], nome: (itens[cod] || {}).descricao || cod }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 12);
  }, [filtrado, itens]);

  // 5) quantidade disponível em estoque por produto (respeita filtro de código)
  const estoquePorProduto = useMemo(() => {
    let base = estoque.filter((e) => Number(e.estoque_atual) > 0);
    if (fCodigo) base = base.filter((e) => `${e.codigo}` === `${fCodigo}`);
    return base
      .sort((a, b) => Number(b.estoque_atual) - Number(a.estoque_atual))
      .slice(0, 15)
      .map((e) => ({ nome: (e.descricao || e.codigo).slice(0, 26), valor: Number(e.estoque_atual) }));
  }, [estoque, fCodigo]);

  const baseOptions = {
    plugins: { legend: { position: "top", labels: { usePointStyle: true, boxWidth: 8, font: { family: "Inter", size: 11 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 } } },
      y: { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { font: { family: "Inter" } }, beginAtZero: true },
    },
  };

  const codigosDisponiveis = useMemo(
    () => Object.values(itens).sort((a, b) => (a.descricao || "").localeCompare(b.descricao || "")),
    [itens]
  );

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Análise de reservas e consumo. Use os filtros para refinar; sem filtros, os gráficos mostram tudo.</p>
      </div>

      {/* Filtros */}
      <div className="card section filtros-card" style={{ marginBottom: 20 }}>
        <div className="filtros-grid">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Local (destino)</label>
            <select value={fLocal} onChange={(e) => setFLocal(e.target.value)}>
              <option value="">Todos</option>
              {LOCAIS_DESTINO.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Código ou descrição do item</label>
            <ItemSearchSelect itens={itens} value={fCodigo} onChange={setFCodigo} allowClear />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Data inicial</label>
            <input type="date" value={fDataIni} onChange={(e) => setFDataIni(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Data final</label>
            <input type="date" value={fDataFim} onChange={(e) => setFDataFim(e.target.value)} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              className="btn btn-secondary"
              disabled={!temFiltro}
              onClick={() => { setFLocal(""); setFCodigo(""); setFDataIni(""); setFDataFim(""); }}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Carregando dados…</div>
      ) : (
        <div className="dash-grid">
          <div className="card section">
            <h2 style={{ marginBottom: 16 }}>Itens adquiridos (entrada)</h2>
            {reservasPorMes.length === 0 ? <div className="empty-state">Sem dados para os filtros.</div> : (
              <ChartBox
                type="bar"
                data={{
                  labels: reservasPorMes.map((r) => labelMes(r.mes)),
                  datasets: [{ label: "Requisitado", data: reservasPorMes.map((r) => r.valor), backgroundColor: CHART_COLORS.accent, borderRadius: 6, maxBarThickness: 34 }],
                }}
                options={baseOptions}
              />
            )}
          </div>

          <div className="card section">
            <h2 style={{ marginBottom: 16 }}>Itens consumidos (saída)</h2>
            {saidasPorMes.length === 0 ? <div className="empty-state">Sem dados para os filtros.</div> : (
              <ChartBox
                type="bar"
                data={{
                  labels: saidasPorMes.map((r) => labelMes(r.mes)),
                  datasets: [{ label: "Consumido", data: saidasPorMes.map((r) => r.valor), backgroundColor: CHART_COLORS.green, borderRadius: 6, maxBarThickness: 34 }],
                }}
                options={baseOptions}
              />
            )}
          </div>

          <div className="card section">
            <h2 style={{ marginBottom: 16 }}>Consumo por gerência</h2>
            {consumoAreaMes.meses.length === 0 ? <div className="empty-state">Sem dados para os filtros.</div> : (
              <ChartBox
                type="bar"
                data={{
                  labels: consumoAreaMes.meses.map(labelMes),
                  datasets: consumoAreaMes.areas.map((a, idx) => ({
                    label: a,
                    data: consumoAreaMes.meses.map((ym) => consumoAreaMes.matriz[a][ym] || 0),
                    backgroundColor: CHART_COLORS.palette[idx % CHART_COLORS.palette.length],
                    borderRadius: 4,
                    maxBarThickness: 40,
                  })),
                }}
                options={{
                  ...baseOptions,
                  scales: {
                    x: { ...baseOptions.scales.x, stacked: true },
                    y: { ...baseOptions.scales.y, stacked: true },
                  },
                }}
              />
            )}
          </div>

          <div className="card section">
            <h2 style={{ marginBottom: 16 }}>Itens consumidos</h2>
            {itensMaisConsumidos.length === 0 ? <div className="empty-state">Sem dados para os filtros.</div> : (
              <ChartBox
                type="bar"
                height={Math.max(300, itensMaisConsumidos.length * 32)}
                data={{
                  labels: itensMaisConsumidos.map((i) => (i.nome || i.codigo).slice(0, 28)),
                  datasets: [{ label: "Consumido", data: itensMaisConsumidos.map((i) => i.valor), backgroundColor: CHART_COLORS.accentSoft, borderRadius: 6, maxBarThickness: 22 }],
                }}
                options={{
                  indexAxis: "y",
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { font: { family: "Inter" } }, beginAtZero: true },
                    y: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 } } },
                  },
                }}
              />
            )}
          </div>
          <div className="card section" style={{ gridColumn: "1 / -1" }}>
            <h2 style={{ marginBottom: 16 }}>Itens disponíveis em estoque, por produto</h2>
            {estoquePorProduto.length === 0 ? <div className="empty-state">Sem itens com saldo em estoque.</div> : (
              <ChartBox
                type="bar"
                height={Math.max(300, estoquePorProduto.length * 30)}
                data={{
                  labels: estoquePorProduto.map((i) => i.nome),
                  datasets: [{ label: "Em estoque", data: estoquePorProduto.map((i) => i.valor), backgroundColor: "#0071e3", borderRadius: 6, maxBarThickness: 22 }],
                }}
                options={{
                  indexAxis: "y",
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { font: { family: "Inter" } }, beginAtZero: true },
                    y: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 } } },
                  },
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================
function Configuracoes({ user, onItensChange }) {
  return (
    <div>
      <div className="page-header">
        <h1>Configurações</h1>
        <p>Gerencie produtos e usuários.</p>
      </div>

      {user.perfil === "admin" ? (
        <>
          <ProdutosConfig onItensChange={onItensChange} />
          <UsuariosConfig user={user} />
        </>
      ) : (
        <div className="card section">
          <p className="muted">Apenas administradores podem gerenciar produtos e usuários.</p>
        </div>
      )}
    </div>
  );
}

// ---- PRODUTOS ----
function ProdutosConfig({ onItensChange }) {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [showNovo, setShowNovo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [excluindo, setExcluindo] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("itens")
      .select("codigo, descricao, unidade, estoque_minimo")
      .eq("ativo", true)
      .order("descricao");
    setProdutos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function afterChange() {
    carregar();
    if (onItensChange) onItensChange();
  }

  const filtrado = useMemo(() => {
    if (!busca) return produtos;
    const q = busca.toLowerCase();
    return produtos.filter((p) => `${p.codigo}`.includes(q) || (p.descricao || "").toLowerCase().includes(q));
  }, [produtos, busca]);

  return (
    <div className="card section" style={{ marginBottom: 20 }}>
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h2>Produtos</h2>
        <button className="btn btn-primary" onClick={() => setShowNovo(true)}>+ Novo produto</button>
      </div>

      <input
        className="search-input"
        type="text"
        placeholder="Buscar por código ou descrição…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", width: "100%", marginBottom: 16 }}
      />

      <div className="table-scroll">
        <table className="data-table sticky-head">
          <thead>
            <tr><th>Código</th><th>Descrição</th><th>Un.</th><th>Estoque mínimo</th><th></th></tr>
          </thead>
          <tbody>
            {filtrado.map((p) => (
              <tr key={p.codigo}>
                <td>{p.codigo}</td>
                <td>{p.descricao || "—"}</td>
                <td>{p.unidade}</td>
                <td>{fmtNum(p.estoque_minimo)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div className="icon-actions">
                    <IconButton kind="edit" title="Editar" onClick={() => setEditando(p)} />
                    <IconButton kind="delete" title="Excluir" onClick={() => setExcluindo(p)} />
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtrado.length === 0 && (
              <tr><td colSpan="5"><div className="empty-state">Nenhum produto encontrado.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showNovo && <ProdutoModal onClose={() => setShowNovo(false)} onSaved={() => { setShowNovo(false); afterChange(); }} />}
      {editando && <ProdutoModal produto={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); afterChange(); }} />}
      {excluindo && (
        <ConfirmModal
          titulo="Excluir produto"
          mensagem={`Tem certeza que deseja excluir "${excluindo.descricao || excluindo.codigo}"? Se houver movimentações, ele será apenas desativado para preservar o histórico.`}
          onClose={() => setExcluindo(null)}
          onConfirm={async () => {
            await sb.rpc("excluir_item", { p_codigo: excluindo.codigo });
            setExcluindo(null);
            afterChange();
          }}
        />
      )}
    </div>
  );
}

function ProdutoModal({ produto, onClose, onSaved }) {
  const editMode = !!produto;
  const [codigo, setCodigo] = useState(produto ? produto.codigo : "");
  const [descricao, setDescricao] = useState(produto ? produto.descricao || "" : "");
  const [unidade, setUnidade] = useState(() => {
    const u = produto ? (produto.unidade || "un") : "un";
    return UNIDADES.includes(u) ? u : "un";
  });
  const [minimo, setMinimo] = useState(produto ? produto.estoque_minimo : "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!codigo || !descricao) { setErro("Informe o código e a descrição."); return; }
    setSalvando(true);
    let res;
    if (editMode) {
      res = await sb.rpc("editar_item", { p_codigo: codigo, p_descricao: descricao, p_unidade: unidade, p_estoque_minimo: Number(minimo) || 0 });
    } else {
      res = await sb.rpc("criar_item", { p_codigo: codigo.trim(), p_descricao: descricao, p_unidade: unidade, p_estoque_minimo: Number(minimo) || 0 });
    }
    setSalvando(false);
    if (res.error) { setErro("Não foi possível salvar: " + (res.error.message || res.error.hint || "erro desconhecido")); return; }
    if (res.data === false) { setErro("Já existe um produto com esse código."); return; }
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{editMode ? "Editar produto" : "Novo produto"}</h2>
        {erro && <div className="login-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Código</label>
            <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={editMode} />
          </div>
          <div className="field">
            <label>Descrição</label>
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Unidade</label>
              <select value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Estoque mínimo</label>
              <input type="number" min="0" step="any" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- USUÁRIOS ----
function UsuariosConfig({ user }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNovo, setShowNovo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [excluindo, setExcluindo] = useState(null);
  const [resetando, setResetando] = useState(null);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("usuarios").select("id, pn, nome, perfil, ativo, precisa_trocar_senha").order("nome");
    setUsuarios(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="card section">
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h2>Usuários</h2>
        <button className="btn btn-primary" onClick={() => setShowNovo(true)}>+ Novo usuário</button>
      </div>
      {aviso && <div className="login-error" style={{ marginBottom: 12 }}>{aviso}</div>}
      <div className="table-scroll">
        <table className="data-table sticky-head">
          <thead><tr><th>PN</th><th>Nome</th><th>Perfil</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.pn}</td>
                <td>{u.nome}</td>
                <td><span className="badge badge-neutral">{u.perfil}</span></td>
                <td>{u.precisa_trocar_senha
                  ? <span className="badge badge-critical">Aguardando 1º acesso</span>
                  : <span className="badge badge-ok">Ativo</span>}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div className="icon-actions">
                    <IconButton kind="key" title="Resetar senha" onClick={() => setResetando(u)} />
                    <IconButton kind="edit" title="Editar" onClick={() => setEditando(u)} />
                    {u.pn !== user.pn && (
                      <IconButton kind="delete" title="Excluir" onClick={() => setExcluindo(u)} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && usuarios.length === 0 && (
              <tr><td colSpan="5"><div className="empty-state">Nenhum usuário cadastrado.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showNovo && <NovoUsuarioModal onClose={() => setShowNovo(false)} onSaved={() => { setShowNovo(false); carregar(); }} />}
      {editando && <EditarUsuarioModal usuario={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); carregar(); }} />}
      {resetando && (
        <ConfirmModal
          titulo="Resetar senha"
          mensagem={`A senha de "${resetando.nome}" voltará para 1234, e será exigida a troca no próximo acesso. Confirmar?`}
          onClose={() => setResetando(null)}
          onConfirm={async () => {
            await sb.rpc("resetar_senha_usuario", { p_pn: resetando.pn });
            setResetando(null);
            carregar();
          }}
        />
      )}
      {excluindo && (
        <ConfirmModal
          titulo="Excluir usuário"
          mensagem={`Tem certeza que deseja excluir "${excluindo.nome}"? Esta ação não pode ser desfeita.`}
          onClose={() => setExcluindo(null)}
          onConfirm={async () => {
            const { data } = await sb.rpc("excluir_usuario", { p_pn: excluindo.pn });
            setExcluindo(null);
            if (data === false) { setAviso("Não é possível excluir o único administrador do sistema."); }
            else { setAviso(""); }
            carregar();
          }}
        />
      )}
    </div>
  );
}

function EditarUsuarioModal({ usuario, onClose, onSaved }) {
  const [nome, setNome] = useState(usuario.nome);
  const [perfil, setPerfil] = useState(usuario.perfil);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nome) { setErro("Informe o nome."); return; }
    setSalvando(true);
    const { error } = await sb.rpc("editar_usuario", { p_pn: usuario.pn, p_nome: nome.trim(), p_perfil: perfil });
    setSalvando(false);
    if (error) { setErro("Não foi possível salvar: " + (error.message || error.hint || "erro desconhecido")); return; }
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Editar usuário</h2>
        <div className="subtitle">PN {usuario.pn}</div>
        {erro && <div className="login-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field"><label>Nome</label><input type="text" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="field">
            <label>Perfil</label>
            <select value={perfil} onChange={(e) => setPerfil(e.target.value)}>
              <option value="operador">Operador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- MODAL DE CONFIRMAÇÃO GENÉRICO ----
function ConfirmModal({ titulo, mensagem, onClose, onConfirm }) {
  const [processando, setProcessando] = useState(false);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        <p className="subtitle" style={{ marginTop: 8 }}>{mensagem}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-danger"
            disabled={processando}
            onClick={async () => { setProcessando(true); await onConfirm(); setProcessando(false); }}
          >
            {processando ? "Processando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrocarMinhaSenha({ user }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(""); setMsg("");
    setSalvando(true);
    const { data, error } = await sb.rpc("trocar_senha_usuario", { p_pn: user.pn, p_senha_atual: atual, p_senha_nova: nova });
    setSalvando(false);
    if (error || !data) { setErro("Senha atual incorreta."); return; }
    setMsg("Senha atualizada com sucesso.");
    setAtual(""); setNova("");
  }

  return (
    <form onSubmit={handleSubmit}>
      {erro && <div className="login-error">{erro}</div>}
      {msg && <div className="login-error" style={{ background: "var(--ok-bg)", color: "#248a3d" }}>{msg}</div>}
      <div className="form-row">
        <div className="field">
          <label>Senha atual</label>
          <input type="password" value={atual} onChange={(e) => setAtual(e.target.value)} />
        </div>
        <div className="field">
          <label>Nova senha</label>
          <input type="password" value={nova} onChange={(e) => setNova(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-secondary" disabled={salvando}>{salvando ? "Salvando…" : "Trocar senha"}</button>
    </form>
  );
}

function NovoUsuarioModal({ onClose, onSaved }) {
  const [pn, setPn] = useState("");
  const [nome, setNome] = useState("");
  const [perfil, setPerfil] = useState("operador");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pn || !nome) { setErro("Preencha o PN e o nome."); return; }
    setSalvando(true);
    const { data, error } = await sb.rpc("criar_usuario", { p_pn: pn.trim(), p_nome: nome.trim(), p_senha: "1234", p_perfil: perfil });
    setSalvando(false);
    if (error || data === false) { setErro("Já existe um usuário com esse PN."); return; }
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Novo usuário</h2>
        <div className="subtitle">A senha inicial será <strong>1234</strong>, com troca obrigatória no 1º acesso.</div>
        {erro && <div className="login-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field"><label>PN</label><input type="text" value={pn} onChange={(e) => setPn(e.target.value)} /></div>
          <div className="field"><label>Nome</label><input type="text" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="field">
            <label>Perfil</label>
            <select value={perfil} onChange={(e) => setPerfil(e.target.value)}>
              <option value="operador">Operador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando…" : "Criar usuário"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// APP RAIZ
// ============================================================================
function App() {
  const [user, setUser] = useState(loadSession());
  const [view, setView] = useState("inicio");
  const [itens, setItens] = useState({});
  const [itensLoaded, setItensLoaded] = useState(false);

  const carregarItens = useCallback(async () => {
    const { data } = await sb.from("itens").select("codigo, descricao, unidade, estoque_minimo").eq("ativo", true);
    const map = {};
    (data || []).forEach((i) => { map[i.codigo] = i; });
    setItens(map);
    setItensLoaded(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    carregarItens();
  }, [user, carregarItens]);

  function handleLogin(u) {
    setUser(u);
    saveSession(u);
  }
  function handleLogout() {
    clearSession();
    setUser(null);
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (user.precisa_trocar_senha) {
    return (
      <ForcePasswordChange
        user={user}
        onDone={() => {
          const updated = { ...user, precisa_trocar_senha: false };
          setUser(updated);
          saveSession(updated);
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <TopBar user={user} onLogout={handleLogout} />
      <TopNav active={view} onChange={setView} />
      <div className="content">
        {!itensLoaded ? (
          <div className="loading-screen">Carregando…</div>
        ) : view === "inicio" ? (
          <Dashboard user={user} onNavigate={setView} />
        ) : view === "dashboard" ? (
          <DashboardAnalytics itens={itens} />
        ) : view === "reserva" ? (
          <ReservaRecebimento user={user} itens={itens} />
        ) : view === "saida" ? (
          <Saida user={user} itens={itens} />
        ) : view === "estoque" ? (
          <Estoque />
        ) : (
          <Configuracoes user={user} onItensChange={carregarItens} />
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
