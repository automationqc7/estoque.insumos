const { useState, useEffect, useMemo, useRef, useCallback } = React;

// Renderiza o conteúdo do modal direto no <body> (via portal), garantindo que
// ele sempre fique acima de qualquer card/tabela, sem sofrer com z-index preso
// dentro de outro elemento.
function Modal({ onClose, children }) {
  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      {children}
    </div>,
    document.body
  );
}

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
function fmtBRL(n) {
  return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
        <h1 className="login-title">Sto<span className="brand-q">Q</span>•room</h1>
        <div className="login-tagline2" style={{ marginBottom: 26 }}>Qualidade Área Quente</div>
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
const APP_NAME = "StoQ•room";

// Ícone da aplicação: caixa de papelão 3D (preenchida, para fundo claro).
function CubeIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.6l8.5 4.4v9.9L12 21.4 3.5 16.9V7L12 2.6z" fill="#c89a6a" stroke="#7a4e28" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M3.6 7L12 11.4 20.4 7" stroke="#7a4e28" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M12 11.4V21.4" stroke="#7a4e28" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 4.1l8.4 4.4" stroke="#7a4e28" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
      <rect x="10.4" y="12.7" width="3.2" height="1.8" rx="0.4" fill="#7a4e28" opacity="0.6"/>
    </svg>
  );
}

const NAV_ITEMS = [
  { key: "inicio", label: "Início", icon: "🏠" },
  { key: "reserva", label: "Reserva", icon: "🧾" },
  { key: "saida", label: "Saída", icon: "📤" },
  { key: "estoque", label: "Estoque", icon: "📊" },
  { key: "sapatas", label: "Sapatas US", icon: "🥾" },
  { key: "dashboard", label: "Dashboard", icon: "📈" },
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
          <span className="brand-name">Sto<span className="brand-q">Q</span>•room</span>
          <span className="brand-sub2">Qualidade Área Quente</span>
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
  const [budgetData, setBudgetData] = useState([]);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const budgetChartRef = useRef(null);
  const budgetChartInstance = useRef(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb
      .from("vw_estoque_atual")
      .select("*")
      .order("estoque_atual", { ascending: true });
    if (!error && data) setEstoque(data);

    // --- Budget vs realizado (mês corrente) por centro de custo ---
    const agora = new Date();
    const ini = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().slice(0, 10);
    const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [{ data: ccs }, { data: reservas }, { data: precos }] = await Promise.all([
      sb.from("centros_custo").select("numero, descricao, budget"),
      sb.from("movimentos_estoque")
        .select("codigo, quantidade, centro_custo, data_movimento")
        .eq("tipo", "reserva")
        .gte("data_movimento", ini)
        .lte("data_movimento", fim + "T23:59:59"),
      sb.from("itens").select("codigo, preco"),
    ]);

    const precoMap = {};
    (precos || []).forEach((p) => { precoMap[p.codigo] = Number(p.preco || 0); });

    const realizado = {};
    (reservas || []).forEach((r) => {
      const cc = r.centro_custo || "—";
      realizado[cc] = (realizado[cc] || 0) + Number(r.quantidade || 0) * (precoMap[r.codigo] || 0);
    });

    const linhas = (ccs || [])
      .filter((c) => Number(c.budget || 0) > 0 || realizado[c.numero])
      .map((c) => ({
        numero: c.numero,
        descricao: c.descricao || c.numero,
        budget: Number(c.budget || 0),
        gasto: realizado[c.numero] || 0,
      }))
      .sort((a, b) => b.gasto - a.gasto);
    setBudgetData(linhas);

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
  const totalEmEstoque = useMemo(
    () => estoque.reduce((acc, i) => acc + Number(i.estoque_atual || 0), 0),
    [estoque]
  );
  const valorEstoque = useMemo(
    () => estoque.reduce((acc, i) => acc + Number(i.valor_estoque || 0), 0),
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
            barPercentage: 0.72,
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
            barPercentage: 0.6,
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

  // Gráfico Budget vs Realizado (mês corrente) por centro de custo
  useEffect(() => {
    if (loading || !budgetChartRef.current || budgetData.length === 0) return;

    const labels = budgetData.map((b) => (b.descricao || b.numero));
    const gastos = budgetData.map((b) => Math.round(b.gasto * 100) / 100);
    const metas = budgetData.map((b) => Math.round(b.budget * 100) / 100);
    // barra fica vermelha (pastel) quando o gasto ultrapassa a meta (meta > 0)
    const cores = budgetData.map((b) =>
      (b.budget > 0 && b.gasto > b.budget) ? "rgba(240, 128, 100, 0.75)" : "rgba(130, 180, 140, 0.8)"
    );

    if (budgetChartInstance.current) budgetChartInstance.current.destroy();
    budgetChartInstance.current = new Chart(budgetChartRef.current.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Gasto no mês",
            data: gastos,
            backgroundColor: cores,
            borderColor: "#9aa0a6",
            borderWidth: 1,
            borderRadius: 3,
            maxBarThickness: 60,
            order: 2,
          },
          {
            // Meta como marcador de linha vermelha horizontal sobre cada barra
            label: "Meta (budget)",
            type: "line",
            data: metas,
            showLine: false,
            pointStyle: "line",
            pointRadius: 22,
            pointBorderColor: "#b00020",
            pointBackgroundColor: "#b00020",
            pointBorderWidth: 2.5,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true, boxWidth: 8, font: { family: "Inter", size: 11 },
              generateLabels: (chart) => {
                const items = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                items.forEach((it) => {
                  if (it.text === "Gasto no mês") {
                    it.fillStyle = "rgba(130, 180, 140, 0.9)";
                    it.strokeStyle = "rgba(130, 180, 140, 0.9)";
                  }
                });
                return items;
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${fmtBRL(ctx.parsed.y)}`,
              afterBody: (items) => {
                const idx = items[0].dataIndex;
                const b = budgetData[idx];
                if (b.budget > 0) {
                  const pct = Math.round((b.gasto / b.budget) * 100);
                  return `Utilizado: ${pct}% da meta`;
                }
                return "";
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 } } },
          y: { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { font: { family: "Inter" }, callback: (v) => fmtBRL(v) }, beginAtZero: true },
        },
      },
    });
  }, [loading, budgetData]);

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
          <div className="label">Total em estoque</div>
          <div className="value">{fmtNum(totalEmEstoque)}</div>
        </div>
        <div className="card stat-card">
          <div className="label">Valor do estoque</div>
          <div className="value">{fmtBRL(valorEstoque)}</div>
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

      <div className="card section">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h2>Custo de reserva no mês × meta (por centro de custo)</h2>
          <span className="small muted">Mês corrente</span>
        </div>
        <div className="chart-wrap">
          {loading ? <div className="empty-state">Carregando…</div>
            : budgetData.length === 0 ? <div className="empty-state">Nenhum centro de custo com meta ou gasto no mês. Cadastre a meta (budget) em Configurações → Centros de Custo.</div>
            : <canvas ref={budgetChartRef}></canvas>}
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
  const [filtroPend, setFiltroPend] = useState("todas");

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

  // pendente = ainda não recebeu tudo que foi reservado
  function isPendente(m) {
    return !m.quantidade_recebida || Number(m.quantidade_recebida) < Number(m.quantidade);
  }

  const filtrado = useMemo(() => {
    return lista.filter((m) => {
      if (filtroPend === "pendentes" && !isPendente(m)) return false;
      if (busca && !`${m.numero_reserva || ""}`.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [lista, busca, filtroPend]);

  const qtdPendentes = useMemo(() => lista.filter(isPendente).length, [lista]);

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
          <div className="tag-row" style={{ marginBottom: 0 }}>
            <button className={`tag-filter ${filtroPend === "todas" ? "active" : ""}`} onClick={() => setFiltroPend("todas")}>Todas ({lista.length})</button>
            <button className={`tag-filter ${filtroPend === "pendentes" ? "active" : ""}`} onClick={() => setFiltroPend("pendentes")}>Pendentes ({qtdPendentes})</button>
          </div>
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

const LOCAIS_DESTINO = ["Laminação", "Tratamento Térmico", "Flex Line", "Fast Casing", "Fábrica de Luvas", "Terceiros"];

const UNIDADES = ["pç", "lt", "un", "kg", "cj", "fr", "cx"];

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
    <Modal onClose={onClose}>
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
    </Modal>
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
    <Modal onClose={onClose}>
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
    </Modal>
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
    <Modal onClose={onClose}>
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
    </Modal>
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
              <tr><th>Código</th><th>Descrição</th><th>Un.</th><th>Recebido</th><th>Consumido</th><th>Estoque</th><th>Mínimo</th><th>R$ total</th><th title="Média de saídas por mês nos últimos 12 meses">Consumo médio/mês</th><th title="Média de dias entre a reserva e o recebimento">Entrega média (dias)</th><th>Status</th></tr>
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
                  <td>{fmtBRL(i.valor_estoque)}</td>
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
                <tr><td colSpan="11"><div className="empty-state">Nenhum item encontrado.</div></td></tr>
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

// Treemap (retângulos proporcionais) para o estoque de sapatas
function TreemapBox({ dados, height = 340 }) {
  const canvasRef = useRef(null);
  const instRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !dados || dados.length === 0) return;
    if (instRef.current) instRef.current.destroy();
    const palette = ["#0a4d8c", "#0071e3", "#3d8fdc", "#5aa9e6", "#7cbde8", "#9bcdef", "#2a6aa0", "#b6ddf5", "#1d5f9e", "#4e97dd"];
    instRef.current = new Chart(canvasRef.current.getContext("2d"), {
      type: "treemap",
      data: {
        datasets: [{
          tree: dados,
          key: "valor",
          groups: ["nome"],
          spacing: 1,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.7)",
          backgroundColor: (ctx) => {
            if (ctx.type !== "data") return "transparent";
            return palette[ctx.dataIndex % palette.length];
          },
          labels: {
            display: true,
            color: "#fff",
            font: { family: "Inter", size: 11, weight: "600" },
            formatter: (ctx) => {
              const d = ctx.raw._data;
              return [d.nome, fmtNum(d.valor)];
            },
          },
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { title: (items) => items[0].raw._data.nome, label: (item) => `Estoque: ${fmtNum(item.raw._data.valor)}` } },
        },
      },
    });
    return () => { if (instRef.current) instRef.current.destroy(); };
  }, [dados]);

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

// Multi-seleção de centros de custo (lista "número – descrição")
function MultiSelectCC({ opcoes, selecionados, onChange }) {
  const [aberto, setAberto] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDoc(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function toggle(num) {
    if (selecionados.includes(num)) onChange(selecionados.filter((x) => x !== num));
    else onChange([...selecionados, num]);
  }

  const rotulo = selecionados.length === 0
    ? "Todos"
    : `${selecionados.length} selecionado(s)`;

  return (
    <div className="combo" ref={wrapRef}>
      <div
        className="multiselect-trigger"
        onClick={() => setAberto((v) => !v)}
      >
        {rotulo}
        <span style={{ opacity: 0.5 }}>▾</span>
      </div>
      {aberto && (
        <ul className="combo-list">
          {selecionados.length > 0 && (
            <li className="combo-clear" onMouseDown={() => onChange([])}>Limpar seleção</li>
          )}
          {opcoes.length === 0 && <li className="combo-empty">Nenhum centro cadastrado</li>}
          {opcoes.map((c) => (
            <li key={c.numero} onMouseDown={(e) => { e.preventDefault(); toggle(c.numero); }} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" readOnly checked={selecionados.includes(c.numero)} style={{ width: "auto", margin: 0 }} />
              <span>{c.numero}{c.descricao ? ` – ${c.descricao}` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DashboardAnalytics({ itens }) {
  const [movs, setMovs] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [precos, setPrecos] = useState({});
  const [sapProd, setSapProd] = useState([]);
  const [sapEstoque, setSapEstoque] = useState([]);
  const [turnoSel, setTurnoSel] = useState("todos");
  const [loading, setLoading] = useState(true);

  // filtros
  const [fLocal, setFLocal] = useState("");
  const [fCodigo, setFCodigo] = useState("");
  const [fCentros, setFCentros] = useState([]);  // multi-seleção
  const [fDataIni, setFDataIni] = useState("");
  const [fDataFim, setFDataFim] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    // reservas e saídas, agora com centro_custo
    const { data } = await sb
      .from("movimentos_estoque")
      .select("tipo, codigo, quantidade, data_movimento, local_destino, centro_custo")
      .in("tipo", ["reserva", "saida"])
      .order("data_movimento", { ascending: true })
      .limit(20000);
    setMovs(data || []);
    const { data: est } = await sb.from("vw_estoque_atual").select("codigo, descricao, estoque_atual, preco").order("estoque_atual", { ascending: false });
    setEstoque(est || []);
    // mapa de preço por código (para valores)
    const pmap = {};
    (est || []).forEach((e) => { pmap[e.codigo] = Number(e.preco || 0); });
    setPrecos(pmap);
    const { data: cc } = await sb.from("centros_custo").select("numero, descricao").order("numero");
    setCentrosCusto(cc || []);
    // produção de sapatas + estoque de sapatas (para os gráficos novos)
    const { data: prod } = await sb.from("sapatas_producao").select("codigo, quantidade, data_producao, turno").limit(20000);
    setSapProd(prod || []);
    const { data: sapEst } = await sb.from("vw_sapatas_estoque").select("*");
    setSapEstoque(sapEst || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // aplica os filtros (combinados por E)
  const filtrado = useMemo(() => {
    return movs.filter((m) => {
      if (fLocal && m.local_destino !== fLocal) return false;
      if (fCodigo && `${m.codigo}` !== `${fCodigo}`) return false;
      if (fCentros.length > 0 && !fCentros.includes(m.centro_custo)) return false;
      if (fDataIni && (!m.data_movimento || m.data_movimento.slice(0, 10) < fDataIni)) return false;
      if (fDataFim && (!m.data_movimento || m.data_movimento.slice(0, 10) > fDataFim)) return false;
      return true;
    });
  }, [movs, fLocal, fCodigo, fCentros, fDataIni, fDataFim]);

  const temFiltro = fLocal || fCodigo || fCentros.length > 0 || fDataIni || fDataFim;

  // descrição do centro de custo por número
  const ccDesc = useMemo(() => {
    const m = {};
    centrosCusto.forEach((c) => { m[c.numero] = c.descricao || c.numero; });
    return m;
  }, [centrosCusto]);

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

  // 6) valor adquirido (reserva) por mês, por centro de custo — empilhado
  //    valor = preço unitário atual × quantidade reservada
  const valorCCporMes = useMemo(() => {
    const reservas = filtrado.filter((m) => m.tipo === "reserva" && m.data_movimento);
    const meses = Array.from(new Set(reservas.map((m) => m.data_movimento.slice(0, 7)))).sort();
    const ccs = Array.from(new Set(reservas.map((m) => m.centro_custo || "—")));
    const matriz = {};
    ccs.forEach((c) => { matriz[c] = {}; });
    reservas.forEach((m) => {
      const ym = m.data_movimento.slice(0, 7);
      const c = m.centro_custo || "—";
      const valor = Number(m.quantidade || 0) * (precos[m.codigo] || 0);
      matriz[c][ym] = (matriz[c][ym] || 0) + valor;
    });
    // rótulo do CC: "número – descrição"
    const rotulos = ccs.map((c) => (c === "—" ? "Sem centro de custo" : `${c}${ccDesc[c] && ccDesc[c] !== c ? " – " + ccDesc[c] : ""}`));
    return { meses, ccs, rotulos, matriz };
  }, [filtrado, precos, ccDesc]);

  // 7) itens adquiridos (reserva), do maior para o menor — por valor
  const itensAdquiridos = useMemo(() => {
    const map = {};
    filtrado.filter((m) => m.tipo === "reserva").forEach((m) => {
      const valor = Number(m.quantidade || 0) * (precos[m.codigo] || 0);
      map[m.codigo] = (map[m.codigo] || 0) + valor;
    });
    return Object.keys(map)
      .map((cod) => ({ codigo: cod, valor: map[cod], nome: (itens[cod] || {}).descricao || cod }))
      .filter((x) => x.valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 12);
  }, [filtrado, precos, itens]);

  const baseOptions = {
    plugins: { legend: { position: "top", labels: { usePointStyle: true, boxWidth: 8, font: { family: "Inter", size: 11 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 } } },
      y: { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { font: { family: "Inter" } }, beginAtZero: true },
    },
  };

  // --- Sapatas: produção mensal ---
  const sapProdMensal = useMemo(() => {
    const map = {};
    sapProd.forEach((p) => {
      if (!p.data_producao) return;
      const ym = String(p.data_producao).slice(0, 7);
      map[ym] = (map[ym] || 0) + Number(p.quantidade || 0);
    });
    return Object.keys(map).sort().map((k) => ({ mes: k, valor: map[k] }));
  }, [sapProd]);

  // --- Sapatas: produção diária do mês corrente (com filtro de turno) ---
  const sapProdDiaria = useMemo(() => {
    const agora = new Date();
    const ym = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
    const map = {};
    sapProd.forEach((p) => {
      if (!p.data_producao || String(p.data_producao).slice(0, 7) !== ym) return;
      if (turnoSel !== "todos" && p.turno !== turnoSel) return;
      const dia = String(p.data_producao).slice(8, 10);
      map[dia] = (map[dia] || 0) + Number(p.quantidade || 0);
    });
    return Object.keys(map).sort().map((k) => ({ dia: k, valor: map[k] }));
  }, [sapProd, turnoSel]);

  // --- Sapatas: estoque por modelo (treemap) ---
  const sapEstoqueTree = useMemo(() => {
    return sapEstoque
      .filter((e) => Number(e.total_produzido) > 0)
      .map((e) => ({ nome: (e.descricao || e.codigo).slice(0, 24), codigo: e.codigo, valor: Number(e.total_produzido) }))
      .sort((a, b) => b.valor - a.valor);
  }, [sapEstoque]);

  const turnosDisp = useMemo(() => {
    return Array.from(new Set(sapProd.map((p) => p.turno).filter(Boolean))).sort();
  }, [sapProd]);

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
            <label>Local de destino (consumo)</label>
            <select value={fLocal} onChange={(e) => setFLocal(e.target.value)}>
              <option value="">Todos</option>
              {LOCAIS_DESTINO.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Centro de custo</label>
            <MultiSelectCC
              opcoes={centrosCusto}
              selecionados={fCentros}
              onChange={setFCentros}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Código ou descrição do item</label>
            <ItemSearchSelect itens={itens} value={fCodigo} onChange={setFCodigo} allowClear />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              className="btn btn-secondary"
              disabled={!temFiltro}
              onClick={() => { setFLocal(""); setFCodigo(""); setFCentros([]); setFDataIni(""); setFDataFim(""); }}
            >
              Limpar filtros
            </button>
          </div>
        </div>
        <div className="filtros-datas">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Data inicial</label>
            <input type="date" value={fDataIni} onChange={(e) => setFDataIni(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Data final</label>
            <input type="date" value={fDataFim} onChange={(e) => setFDataFim(e.target.value)} />
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

          <div className="card section">
            <h2 style={{ marginBottom: 16 }}>Valor adquirido por centro de custo (por mês)</h2>
            {valorCCporMes.meses.length === 0 ? <div className="empty-state">Sem dados para os filtros.</div> : (
              <ChartBox
                type="bar"
                data={{
                  labels: valorCCporMes.meses.map(labelMes),
                  datasets: valorCCporMes.ccs.map((c, idx) => ({
                    label: valorCCporMes.rotulos[idx],
                    data: valorCCporMes.meses.map((ym) => Math.round((valorCCporMes.matriz[c][ym] || 0) * 100) / 100),
                    backgroundColor: CHART_COLORS.palette[idx % CHART_COLORS.palette.length],
                    borderRadius: 4,
                    maxBarThickness: 40,
                  })),
                }}
                options={{
                  ...baseOptions,
                  plugins: {
                    legend: { position: "top", labels: { usePointStyle: true, boxWidth: 8, font: { family: "Inter", size: 10 } } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtBRL(ctx.parsed.y)}` } },
                  },
                  scales: {
                    x: { ...baseOptions.scales.x, stacked: true },
                    y: { ...baseOptions.scales.y, stacked: true, ticks: { font: { family: "Inter" }, callback: (v) => fmtBRL(v) } },
                  },
                }}
              />
            )}
          </div>

          <div className="card section">
            <h2 style={{ marginBottom: 16 }}>Itens adquiridos (valor)</h2>
            {itensAdquiridos.length === 0 ? <div className="empty-state">Sem dados para os filtros.</div> : (
              <ChartBox
                type="bar"
                height={Math.max(300, itensAdquiridos.length * 32)}
                data={{
                  labels: itensAdquiridos.map((i) => (i.nome || i.codigo).slice(0, 28)),
                  datasets: [{ label: "Valor adquirido", data: itensAdquiridos.map((i) => Math.round(i.valor * 100) / 100), backgroundColor: CHART_COLORS.accent, borderRadius: 6, maxBarThickness: 22 }],
                }}
                options={{
                  indexAxis: "y",
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => fmtBRL(ctx.parsed.x) } },
                  },
                  scales: {
                    x: { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { font: { family: "Inter" }, callback: (v) => fmtBRL(v) }, beginAtZero: true },
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

          <div className="card section">
            <h2 style={{ marginBottom: 16 }}>Produção mensal de sapatas</h2>
            {sapProdMensal.length === 0 ? <div className="empty-state">Sem produção registrada.</div> : (
              <ChartBox
                type="line"
                data={{
                  labels: sapProdMensal.map((r) => labelMes(r.mes)),
                  datasets: [{
                    label: "Produzido",
                    data: sapProdMensal.map((r) => r.valor),
                    borderColor: "#7bbf8a",
                    backgroundColor: "rgba(123,191,138,0.18)",
                    pointBackgroundColor: "#5aa872",
                    pointBorderColor: "#5aa872",
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                  }],
                }}
                options={baseOptions}
              />
            )}
          </div>

          <div className="card section">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <h2>Produção diária (mês atual)</h2>
              <select value={turnoSel} onChange={(e) => setTurnoSel(e.target.value)} style={{ maxWidth: 150, fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)" }}>
                <option value="todos">Todos os turnos</option>
                {turnosDisp.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {sapProdDiaria.length === 0 ? <div className="empty-state">Sem produção no mês atual{turnoSel !== "todos" ? " para este turno" : ""}.</div> : (
              <ChartBox
                type="line"
                data={{
                  labels: sapProdDiaria.map((r) => r.dia),
                  datasets: [{
                    label: "Produzido",
                    data: sapProdDiaria.map((r) => r.valor),
                    borderColor: "#9ccfa8",
                    backgroundColor: "rgba(156,207,168,0.18)",
                    pointBackgroundColor: "#7bbf8a",
                    pointBorderColor: "#7bbf8a",
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                  }],
                }}
                options={baseOptions}
              />
            )}
          </div>

          <div className="card section" style={{ gridColumn: "1 / -1" }}>
            <h2 style={{ marginBottom: 16 }}>Sapatas disponíveis em estoque</h2>
            {sapEstoqueTree.length === 0 ? <div className="empty-state">Nenhuma sapata em estoque. Registre produções na aba Sapatas US.</div> : (
              <ChartBox
                type="bar"
                height={Math.max(300, sapEstoqueTree.length * 30)}
                data={{
                  labels: sapEstoqueTree.map((s) => s.nome),
                  datasets: [{
                    label: "Em estoque",
                    data: sapEstoqueTree.map((s) => s.valor),
                    backgroundColor: sapEstoqueTree.map((_, i) => {
                      const greens = ["#a6d8b4", "#8fcea1", "#7bbf8a", "#9ccfa8", "#b7e0c2", "#c8e8cf", "#6fb682", "#88c79a"];
                      return greens[i % greens.length];
                    }),
                    borderRadius: 6,
                    maxBarThickness: 24,
                  }],
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

// Extrai o diâmetro da descrição do produto: primeiro trecho até o 1º espaço.
// Ex: "244,40 x 13,84 - P29HBV..." -> 244.40
function extrairDiametro(descricao) {
  if (!descricao) return null;
  const primeiro = String(descricao).trim().split(/\s+/)[0]; // "244,40"
  const num = parseFloat(primeiro.replace(",", "."));
  return isNaN(num) ? null : num;
}

// Extrai o número da sapata (diâmetro) e a letra (L/C) de "244L" -> {diam:244, letra:'L'}
function parseSapata(sapata) {
  const m = String(sapata).trim().toUpperCase().match(/^([\d.,]+)\s*([LC])$/);
  if (!m) return null;
  return { diam: parseFloat(m[1].replace(",", ".")), letra: m[2] };
}

function SapatasUS({ user, itens }) {
  const [aba, setAba] = useState("producao"); // producao | rendimento | analise

  return (
    <div>
      <div className="page-header">
        <h1>Sapatas US</h1>
        <p>Produção de sapatas para ultrassom, rendimento e planejamento.</p>
      </div>

      <div className="tag-row">
        <button className={`tag-filter ${aba === "producao" ? "active" : ""}`} onClick={() => setAba("producao")}>Produção</button>
        <button className={`tag-filter ${aba === "rendimento" ? "active" : ""}`} onClick={() => setAba("rendimento")}>Consumo médio (rendimento)</button>
        <button className={`tag-filter ${aba === "analise" ? "active" : ""}`} onClick={() => setAba("analise")}>Análise de planejamento</button>
      </div>

      {aba === "producao" && <SapatasProducao user={user} itens={itens} />}
      {aba === "rendimento" && <SapatasRendimento />}
      {aba === "analise" && <SapatasAnalise itens={itens} />}
    </div>
  );
}

// ---- PARTE 1: Produção ----
function SapatasProducao({ user, itens }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nomesPorPn, setNomesPorPn] = useState({});

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("sapatas_producao").select("*").order("data_producao", { ascending: false }).limit(300);
    setLista(data || []);
    const pns = Array.from(new Set((data || []).map((m) => m.usuario_pn).filter(Boolean)));
    if (pns.length) {
      const { data: us } = await sb.from("usuarios").select("pn, nome").in("pn", pns);
      const map = {}; (us || []).forEach((u) => { map[u.pn] = u.nome; });
      setNomesPorPn(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="card section">
      <div className="flex-between" style={{ marginBottom: 14 }}>
        <h2>Sapatas para Ultrassom</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Registrar produção</button>
      </div>
      <div className="table-scroll">
        <table className="data-table sticky-head">
          <thead><tr><th>Data</th><th>Turno</th><th>Código</th><th>Descrição</th><th>Qtd. produzida</th><th>Registrado por</th></tr></thead>
          <tbody>
            {lista.map((m) => (
              <tr key={m.id}>
                <td>{fmtDate(m.data_producao)}</td>
                <td>{m.turno || "—"}</td>
                <td>{m.codigo}</td>
                <td>{(itens[m.codigo] || {}).descricao || "—"}</td>
                <td>{fmtNum(m.quantidade)}</td>
                <td>{m.usuario_pn ? (nomesPorPn[m.usuario_pn] || m.usuario_pn) : "—"}</td>
              </tr>
            ))}
            {!loading && lista.length === 0 && (
              <tr><td colSpan="6"><div className="empty-state">Nenhuma produção registrada ainda.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      {showForm && <SapatasProducaoModal user={user} itens={itens} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); carregar(); }} />}
    </div>
  );
}

function SapatasProducaoModal({ user, itens, onClose, onSaved }) {
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [turno, setTurno] = useState("Turno 1");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const descricao = (itens[codigo.trim()] || {}).descricao || "";
  const codigoValido = !!itens[codigo.trim()];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!codigo.trim()) { setErro("Informe o código da sapata."); return; }
    if (!codigoValido) { setErro("Código não encontrado no cadastro de produtos."); return; }
    if (!quantidade) { setErro("Informe a quantidade produzida."); return; }
    if (!data) { setErro("Informe a data."); return; }
    setSalvando(true);
    const { error } = await sb.from("sapatas_producao").insert({
      codigo: codigo.trim(),
      quantidade: Number(quantidade),
      data_producao: data,
      turno,
      usuario_pn: user.pn,
    });
    setSalvando(false);
    if (error) { setErro("Não foi possível salvar."); return; }
    onSaved();
  }

  return (
    <Modal onClose={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Registrar produção</h2>
        <div className="subtitle">Registrado por {user.nome}</div>
        {erro && <div className="login-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Código da sapata</label>
            <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Digite o código" autoFocus />
          </div>
          <div className="field">
            <label>Descrição</label>
            <input type="text" readOnly placeholder="Preenchida pelo código"
              style={{ background: "rgba(0,0,0,0.03)", color: codigo && !codigoValido ? "var(--critical)" : "var(--text)" }}
              value={codigo && !codigoValido ? "Código não encontrado" : descricao} />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Quantidade produzida</label>
              <input type="number" min="0" step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            <div className="field">
              <label>Data</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Turno</label>
            <select value={turno} onChange={(e) => setTurno(e.target.value)}>
              <option>Turno 1</option><option>Turno 2</option><option>Turno 3</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando…" : "Registrar"}</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ---- PARTE 2: Rendimento (Tabela 2) ----
function SapatasRendimento() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNovo, setShowNovo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [excluindo, setExcluindo] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("sapatas_rendimento").select("*").order("sapata");
    setLista(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="card section">
      <div className="flex-between" style={{ marginBottom: 14 }}>
        <h2>Consumo médio de sapatas</h2>
        <button className="btn btn-primary" onClick={() => setShowNovo(true)}>+ Nova sapata</button>
      </div>
      <p className="small muted" style={{ marginTop: -6, marginBottom: 14 }}>
        Identifique a sapata pelo diâmetro + letra (L = longa, C = curta). Ex: 244L, 323C. Rendimento = tubos produzidos por 1 conjunto.
      </p>
      <div className="table-scroll">
        <table className="data-table sticky-head">
          <thead><tr><th>Sapata</th><th>Rendimento (tubos)</th><th></th></tr></thead>
          <tbody>
            {lista.map((r) => (
              <tr key={r.sapata}>
                <td>{r.sapata}</td>
                <td>{fmtNum(r.rendimento)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div className="icon-actions">
                    <IconButton kind="edit" title="Editar" onClick={() => setEditando(r)} />
                    <IconButton kind="delete" title="Excluir" onClick={() => setExcluindo(r)} />
                  </div>
                </td>
              </tr>
            ))}
            {!loading && lista.length === 0 && (
              <tr><td colSpan="3"><div className="empty-state">Nenhuma sapata cadastrada.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      {showNovo && <RendimentoModal onClose={() => setShowNovo(false)} onSaved={() => { setShowNovo(false); carregar(); }} />}
      {editando && <RendimentoModal rend={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); carregar(); }} />}
      {excluindo && (
        <ConfirmModal titulo="Excluir sapata" mensagem={`Excluir a sapata "${excluindo.sapata}"?`}
          onClose={() => setExcluindo(null)}
          onConfirm={async () => { await sb.rpc("excluir_rendimento", { p_sapata: excluindo.sapata }); setExcluindo(null); carregar(); }} />
      )}
    </div>
  );
}

function RendimentoModal({ rend, onClose, onSaved }) {
  const editMode = !!rend;
  const [sapata, setSapata] = useState(rend ? rend.sapata : "");
  const [rendimento, setRendimento] = useState(rend ? rend.rendimento : "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!sapata.trim()) { setErro("Informe a sapata (ex: 244L)."); return; }
    if (!parseSapata(sapata)) { setErro("Formato inválido. Use diâmetro + L ou C. Ex: 244L, 323C."); return; }
    setSalvando(true);
    const fn = editMode ? "editar_rendimento" : "criar_rendimento";
    const { data, error } = await sb.rpc(fn, { p_sapata: sapata.trim(), p_rendimento: Number(rendimento) || 0 });
    setSalvando(false);
    if (error) { setErro("Não foi possível salvar."); return; }
    if (data === false) { setErro("Já existe essa sapata cadastrada."); return; }
    onSaved();
  }

  return (
    <Modal onClose={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{editMode ? "Editar sapata" : "Nova sapata"}</h2>
        {erro && <div className="login-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Sapata (diâmetro + L/C)</label>
            <input type="text" value={sapata} onChange={(e) => setSapata(e.target.value)} disabled={editMode} placeholder="Ex: 244L" />
          </div>
          <div className="field">
            <label>Rendimento (tubos por conjunto)</label>
            <input type="number" min="0" step="any" value={rendimento} onChange={(e) => setRendimento(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ---- PARTE 3: Análise de planejamento ----
function SapatasAnalise({ itens }) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null);
  const [rendimentos, setRendimentos] = useState([]);
  const [estoquePorModelo, setEstoquePorModelo] = useState({});
  const [carruagens, setCarruagens] = useState(1);
  const [arquivoPendente, setArquivoPendente] = useState(null); // guarda o arquivo até escolher carruagens
  const [perguntarCarr, setPerguntarCarr] = useState(false);

  const carregarBase = useCallback(async () => {
    const { data: rend } = await sb.from("sapatas_rendimento").select("*");
    setRendimentos(rend || []);
    // estoque por MODELO = código do produto (ex: "244L"). Vem da view de estoque.
    const { data: est } = await sb.from("vw_estoque_atual").select("codigo, estoque_atual");
    const mapa = {};
    (est || []).forEach((e) => { mapa[String(e.codigo).trim().toUpperCase()] = Number(e.estoque_atual || 0); });
    setEstoquePorModelo(mapa);
  }, []);
  useEffect(() => { carregarBase(); }, [carregarBase]);

  function estoqueModelo(cod) {
    return estoquePorModelo[String(cod).trim().toUpperCase()] || 0;
  }

  // diâmetros distintos cadastrados na tabela de rendimento
  function diamsDisponiveis() {
    return Array.from(new Set(rendimentos.map((r) => parseSapata(r.sapata)).filter(Boolean).map((s) => s.diam))).sort((a, b) => b - a);
  }
  // principal = maior dentro da faixa (ref até -5%); alternativa = segunda maior na faixa
  function sapatasParaDiametro(diamRef) {
    const limiteInf = diamRef * 0.95;
    const candidatos = diamsDisponiveis().filter((d) => d <= diamRef && d >= limiteInf).sort((a, b) => b - a);
    return { principal: candidatos[0] ?? null, alternativa: candidatos[1] ?? null };
  }
  function rendimentoDe(diam, letra) {
    const alvo = rendimentos.find((r) => {
      const p = parseSapata(r.sapata);
      return p && Math.abs(p.diam - diam) < 0.001 && p.letra === letra;
    });
    return alvo ? Number(alvo.rendimento) : null;
  }
  function rendConjunto(diam) {
    return rendimentoDe(diam, "L") || rendimentoDe(diam, "C") || null;
  }

  function onEscolherArquivo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setArquivoPendente(file);
    setPerguntarCarr(true);
    e.target.value = "";
  }

  async function processar() {
    if (!arquivoPendente) return;
    setPerguntarCarr(false); setErro(""); setResultado(null); setProcessando(true);
    const mult = Number(carruagens) || 1;
    try {
      const buf = await arquivoPendente.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
      if (rows.length === 0) throw new Error("Planilha vazia.");

      const headers = Object.keys(rows[0]);
      const colDesc = headers.find((h) => h.trim().toLowerCase().startsWith("descrição produto") || h.trim().toLowerCase().startsWith("descricao produto"));
      const colInicio = headers.find((h) => h.trim().toLowerCase().startsWith("início") || h.trim().toLowerCase().startsWith("inicio"));
      const colPecas = headers.find((h) => h.trim().toLowerCase().includes("peças previstas") || h.trim().toLowerCase().includes("pecas previstas"));
      const colPedido = headers.find((h) => h.trim().toLowerCase().includes("pedido"));
      const colOrdem = headers.find((h) => h.trim().toLowerCase() === "ordem");
      if (!colDesc || !colPecas) throw new Error('A planilha precisa ter as colunas "Descrição produto" e "Peças previstas para produção".');

      const porModelo = {};
      const porOrdem = [];
      const cronoMap = {}; // dataISO -> { modelo -> qtd }

      rows.forEach((r) => {
        const desc = r[colDesc];
        const tubos = Number(r[colPecas]) || 0;
        const diamRef = extrairDiametro(desc);
        if (diamRef == null || tubos <= 0) return;

        const { principal, alternativa } = sapatasParaDiametro(diamRef);

        // calcula necessidade de sapatas para um diâmetro-base
        function calcPara(diamBase) {
          if (diamBase == null) return null;
          const rend = rendConjunto(diamBase);
          if (!rend || rend <= 0) return null;
          const conjuntos = Math.ceil(tubos / rend) * mult;
          const longa = conjuntos * 2;
          const curta = conjuntos * 3;
          const modeloL = `${diamBase}L`, modeloC = `${diamBase}C`;
          const estL = estoqueModelo(modeloL), estC = estoqueModelo(modeloC);
          // saldo = estoque − necessidade (negativo = falta; positivo = sobra em estoque)
          const saldoL = estL - longa;
          const saldoC = estC - curta;
          return {
            base: diamBase, conjuntos,
            modeloL, modeloC,
            necessLonga: longa, necessCurta: curta,
            estLonga: estL, estCurta: estC,
            saldoLonga: saldoL, saldoCurta: saldoC,
          };
        }

        const calcP = calcPara(principal);
        const calcA = calcPara(alternativa);

        // acumula por modelo (usando a sapata principal) para a tabela "Sapatas necessárias"
        if (calcP) {
          porModelo[calcP.modeloL] = porModelo[calcP.modeloL] || { qtd: 0, tubos: 0 };
          porModelo[calcP.modeloC] = porModelo[calcP.modeloC] || { qtd: 0, tubos: 0 };
          porModelo[calcP.modeloL].qtd += calcP.necessLonga; porModelo[calcP.modeloL].tubos += tubos;
          porModelo[calcP.modeloC].qtd += calcP.necessCurta; porModelo[calcP.modeloC].tubos += tubos;

          const dISO = parseDataPlan(colInicio ? r[colInicio] : null);
          if (dISO) {
            cronoMap[dISO] = cronoMap[dISO] || {};
            cronoMap[dISO][calcP.modeloL] = (cronoMap[dISO][calcP.modeloL] || 0) + calcP.necessLonga;
            cronoMap[dISO][calcP.modeloC] = (cronoMap[dISO][calcP.modeloC] || 0) + calcP.necessCurta;
          }
        }

        porOrdem.push({
          data: parseDataPlan(colInicio ? r[colInicio] : null),
          pedidoItem: colPedido ? r[colPedido] : "",
          ordem: colOrdem ? r[colOrdem] : "",
          descricao: desc,
          diamRef,
          tubos,
          principal: calcP,   // pode ser null
          alternativa: calcA, // pode ser null
        });
      });

      const modelos = Object.keys(porModelo).sort().map((k) => {
        const necessidade = porModelo[k].qtd;
        const estoque = estoqueModelo(k);
        const saldo = estoque - necessidade;
        return { modelo: k, quantidade: necessidade, tubos: porModelo[k].tubos, estoque, saldo };
      });

      // cronograma: lista ordenada por data
      const cronograma = Object.keys(cronoMap).sort().map((d) => {
        const modelosData = cronoMap[d];
        const total = Object.values(modelosData).reduce((a, b) => a + b, 0);
        return { data: d, modelos: modelosData, total };
      });

      setResultado({ modelos, porOrdem, cronograma, carruagens: mult });
    } catch (err) {
      setErro(err.message || "Não foi possível processar a planilha.");
    } finally {
      setProcessando(false);
      setArquivoPendente(null);
    }
  }

  function exportar() {
    if (!resultado) return;
    const wb = XLSX.utils.book_new();
    const aoa1 = [["Carruagens consideradas:", resultado.carruagens], [], ["Modelo", "Quantidade", "Estoque", "Saldo", "Tubos a produzir"]];
    resultado.modelos.forEach((m) => aoa1.push([m.modelo, m.quantidade, m.estoque, m.saldo, m.tubos]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa1), "Sapatas necessárias");

    const aoa2 = [[
      "Início (Enfornam.)", "Pedido/Item", "Ordem", "Descrição produto", "Tubos",
      "Sapata (princ.)", "Nec. CURTA", "Est. CURTA", "Saldo CURTA", "Nec. LONGA", "Est. LONGA", "Saldo LONGA",
      "Sapata (alt.)", "Nec. CURTA", "Est. CURTA", "Saldo CURTA", "Nec. LONGA", "Est. LONGA", "Saldo LONGA",
    ]];
    resultado.porOrdem.forEach((o) => {
      const p = o.principal, a = o.alternativa;
      aoa2.push([
        o.data ? fmtDate(o.data) : "", o.pedidoItem, o.ordem, o.descricao, o.tubos,
        p ? `${p.base}` : "—", p ? p.necessCurta : "", p ? p.estCurta : "", p ? p.saldoCurta : "", p ? p.necessLonga : "", p ? p.estLonga : "", p ? p.saldoLonga : "",
        a ? `${a.base}` : "—", a ? a.necessCurta : "", a ? a.estCurta : "", a ? a.saldoCurta : "", a ? a.necessLonga : "", a ? a.estLonga : "", a ? a.saldoLonga : "",
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa2), "Resumo por ordem");

    const aoa3 = [["Data necessidade", "Modelo", "Quantidade"]];
    resultado.cronograma.forEach((c) => {
      Object.keys(c.modelos).sort().forEach((mod) => aoa3.push([fmtDate(c.data), mod, c.modelos[mod]]));
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa3), "Cronograma reposição");

    XLSX.writeFile(wb, "analise_sapatas.xlsx");
  }

  return (
    <div className="card section">
      <h2 style={{ marginBottom: 6 }}>Análise de planejamento</h2>
      <p className="small muted" style={{ marginBottom: 16 }}>
        Anexe a planilha do cronograma (colunas "Descrição produto" e "Peças previstas para produção").
        O diâmetro é o 1º trecho da descrição. Cada conjunto = 2 sapatas LONGA + 3 CURTA.
      </p>

      {rendimentos.length === 0 && (
        <div className="login-error" style={{ marginBottom: 12 }}>
          Cadastre primeiro os rendimentos na aba "Consumo médio (rendimento)".
        </div>
      )}
      {erro && <div className="login-error">{erro}</div>}

      <label className="btn btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
        {processando ? "Processando…" : "Anexar planilha"}
        <input type="file" accept=".xlsx,.xls" onChange={onEscolherArquivo} disabled={processando || rendimentos.length === 0} style={{ display: "none" }} />
      </label>

      {perguntarCarr && (
        <Modal onClose={() => { setPerguntarCarr(false); setArquivoPendente(null); }}>
          <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Quantas carruagens?</h2>
            <p className="subtitle" style={{ marginTop: 8 }}>O número de conjuntos será multiplicado pela quantidade de carruagens.</p>
            <div className="tag-row" style={{ marginTop: 8 }}>
              {[1, 2, 3].map((n) => (
                <button key={n} className={`tag-filter ${carruagens === n ? "active" : ""}`} onClick={() => setCarruagens(n)}>{n} carruagem{n > 1 ? "s" : ""}</button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { setPerguntarCarr(false); setArquivoPendente(null); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={processar}>Processar</button>
            </div>
          </div>
        </Modal>
      )}

      {resultado && (
        <>
          <div className="flex-between" style={{ margin: "24px 0 12px" }}>
            <h2>Sapatas necessárias <span className="small muted" style={{ fontWeight: 400 }}>· {resultado.carruagens} carruagem(s)</span></h2>
            <button className="btn btn-success" onClick={exportar}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-3px", marginRight: 5 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6"/>
                <path d="M12 12v6"/><path d="M9.5 15.5L12 18l2.5-2.5"/>
              </svg>
              Exportar Excel
            </button>
          </div>
          <div className="table-scroll">
            <table className="data-table sticky-head">
              <thead><tr><th>Modelo</th><th>Quantidade</th><th>Estoque</th><th>Saldo</th><th>Tubos a produzir</th></tr></thead>
              <tbody>
                {resultado.modelos.map((m) => (
                  <tr key={m.modelo} className={m.saldo < 0 ? "row-saldo-neg" : ""}>
                    <td>{m.modelo}</td>
                    <td>{fmtNum(m.quantidade)}</td>
                    <td>{fmtNum(m.estoque)}</td>
                    <td>{m.saldo < 0 ? <span className="badge badge-critical">{fmtNum(m.saldo)}</span> : fmtNum(m.saldo)}</td>
                    <td>{fmtNum(m.tubos)}</td>
                  </tr>
                ))}
                {resultado.modelos.length === 0 && (
                  <tr><td colSpan="5"><div className="empty-state">Nenhum modelo calculado. Verifique se os diâmetros da planilha têm sapata correspondente cadastrada.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 style={{ margin: "24px 0 12px" }}>Cronograma de reposição <span className="small muted" style={{ fontWeight: 400 }}>· por data de necessidade</span></h2>
          <div className="table-scroll">
            <table className="data-table sticky-head">
              <thead><tr><th>Data necessidade</th><th>Modelo</th><th>Quantidade</th></tr></thead>
              <tbody>
                {resultado.cronograma.map((c) => (
                  Object.keys(c.modelos).sort().map((mod, i) => (
                    <tr key={c.data + mod}>
                      <td>{i === 0 ? fmtDate(c.data) : ""}</td>
                      <td>{mod}</td>
                      <td>{fmtNum(c.modelos[mod])}</td>
                    </tr>
                  ))
                ))}
                {resultado.cronograma.length === 0 && (
                  <tr><td colSpan="3"><div className="empty-state">Sem datas de necessidade na planilha.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 style={{ margin: "24px 0 12px" }}>Resumo por ordem</h2>
          <p className="small muted" style={{ marginTop: -6, marginBottom: 12 }}>
            Necessidade (sapatas por conjunto) × Estoque × Saldo, para a sapata principal e a alternativa. Saldo negativo (falta em estoque) destacado em vermelho claro.
          </p>
          <div className="table-scroll tall">
            <table className="data-table sticky-head resumo-ordem">
              <thead>
                <tr>
                  <th>Início (Enfornam.)</th>
                  <th>Pedido/Item</th>
                  <th>Ordem</th>
                  <th>Descrição produto</th>
                  <th>Tubos</th>
                  <th className="col-p">Modelo (princ.)</th>
                  <th className="col-p">Necessidade Curta (princ.)</th>
                  <th className="col-p">Estoque Curta (princ.)</th>
                  <th className="col-p">Saldo Curta (princ.)</th>
                  <th className="col-p">Necessidade Longa (princ.)</th>
                  <th className="col-p">Estoque Longa (princ.)</th>
                  <th className="col-p">Saldo Longa (princ.)</th>
                  <th className="col-a">Modelo (alt.)</th>
                  <th className="col-a">Necessidade Curta (alt.)</th>
                  <th className="col-a">Estoque Curta (alt.)</th>
                  <th className="col-a">Saldo Curta (alt.)</th>
                  <th className="col-a">Necessidade Longa (alt.)</th>
                  <th className="col-a">Estoque Longa (alt.)</th>
                  <th className="col-a">Saldo Longa (alt.)</th>
                </tr>
              </thead>
              <tbody>
                {resultado.porOrdem.map((o, idx) => {
                  const p = o.principal, a = o.alternativa;
                  const negativo = (p && (p.saldoCurta < 0 || p.saldoLonga < 0));
                  const cel = (v, isSaldo) => {
                    if (v == null) return "—";
                    if (isSaldo && v < 0) return <span className="badge badge-critical">{fmtNum(v)}</span>;
                    return fmtNum(v);
                  };
                  return (
                    <tr key={idx} className={negativo ? "row-saldo-neg" : ""}>
                      <td>{o.data ? fmtDate(o.data) : "—"}</td>
                      <td>{o.pedidoItem || "—"}</td>
                      <td>{o.ordem || "—"}</td>
                      <td>{o.descricao}</td>
                      <td>{fmtNum(o.tubos)}</td>
                      {/* principal */}
                      <td>{p ? p.base : "—"}</td>
                      <td>{p ? cel(p.necessCurta) : "—"}</td>
                      <td>{p ? cel(p.estCurta) : "—"}</td>
                      <td>{p ? cel(p.saldoCurta, true) : "—"}</td>
                      <td>{p ? cel(p.necessLonga) : "—"}</td>
                      <td>{p ? cel(p.estLonga) : "—"}</td>
                      <td>{p ? cel(p.saldoLonga, true) : "—"}</td>
                      {/* alternativa */}
                      <td>{a ? a.base : "—"}</td>
                      <td>{a ? cel(a.necessCurta) : "—"}</td>
                      <td>{a ? cel(a.estCurta) : "—"}</td>
                      <td>{a ? cel(a.saldoCurta, true) : "—"}</td>
                      <td>{a ? cel(a.necessLonga) : "—"}</td>
                      <td>{a ? cel(a.estLonga) : "—"}</td>
                      <td>{a ? cel(a.saldoLonga, true) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// Interpreta datas do plano: aceita Date, serial Excel, ou "DD/MM/AAAA hh:mm:ss" -> ISO yyyy-mm-dd
function parseDataPlan(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // serial Excel (dias desde 1899-12-30)
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim().split(" ")[0]; // remove hora
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  return null;
}

// Monta dataset empilhado do cronograma (data x modelos)
function cronogramaChartData(cronograma) {
  const labels = cronograma.map((c) => {
    const [y, mo, d] = c.data.split("-");
    return `${d}/${mo}`;
  });
  const modelosSet = new Set();
  cronograma.forEach((c) => Object.keys(c.modelos).forEach((m) => modelosSet.add(m)));
  const modelos = Array.from(modelosSet).sort();
  const palette = ["#0a4d8c", "#0071e3", "#3d8fdc", "#5aa9e6", "#7cbde8", "#9bcdef", "#2a6aa0", "#b6ddf5"];
  return {
    labels,
    datasets: modelos.map((mod, idx) => ({
      label: mod,
      data: cronograma.map((c) => c.modelos[mod] || 0),
      backgroundColor: palette[idx % palette.length],
      borderRadius: 3,
      maxBarThickness: 40,
    })),
  };
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
          <CentroCustoConfig />
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
  const [showAtualizar, setShowAtualizar] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("itens")
      .select("codigo, descricao, unidade, estoque_minimo, preco")
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
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowAtualizar(true)}>↻ Atualizar valores</button>
          <button className="btn btn-primary" onClick={() => setShowNovo(true)}>+ Novo produto</button>
        </div>
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
            <tr><th>Código</th><th>Descrição</th><th>Valor</th><th>Un.</th><th>Estoque mínimo</th><th></th></tr>
          </thead>
          <tbody>
            {filtrado.map((p) => (
              <tr key={p.codigo}>
                <td>{p.codigo}</td>
                <td>{p.descricao || "—"}</td>
                <td>{fmtBRL(p.preco)}</td>
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
              <tr><td colSpan="6"><div className="empty-state">Nenhum produto encontrado.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showNovo && <ProdutoModal onClose={() => setShowNovo(false)} onSaved={() => { setShowNovo(false); afterChange(); }} />}
      {editando && <ProdutoModal produto={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); afterChange(); }} />}
      {showAtualizar && <AtualizarValoresModal onClose={() => setShowAtualizar(false)} onDone={() => { setShowAtualizar(false); afterChange(); }} />}
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

// Modal de atualização mensal de valores via planilha (colunas "Material" e "Preço")
function AtualizarValoresModal({ onClose, onDone }) {
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setErro(""); setResultado(null); setProcessando(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
      if (rows.length === 0) throw new Error("Planilha vazia.");

      // Localiza colunas "Material" e "Preço" (tolerante a acento/caixa)
      const headers = Object.keys(rows[0]);
      const colMat = headers.find((h) => h.trim().toLowerCase() === "material");
      const colPreco = headers.find((h) => {
        const k = h.trim().toLowerCase();
        return k === "preço" || k === "preco";
      });
      if (!colMat || !colPreco) {
        throw new Error('A planilha precisa ter as colunas "Material" e "Preço".');
      }

      // Monta mapa código -> preço (último valor vence)
      const mapa = {};
      rows.forEach((r) => {
        const cod = r[colMat] != null ? String(r[colMat]).trim() : "";
        const preco = r[colPreco];
        if (!cod || preco == null || preco === "") return;
        const p = Number(String(preco).replace(",", "."));
        if (!isNaN(p)) mapa[cod] = p;
      });

      // Chama a função que atualiza só quando o valor difere
      let atualizados = 0, semMudanca = 0, naoEncontrados = 0;
      const entries = Object.entries(mapa);
      for (const [cod, preco] of entries) {
        const { data, error } = await sb.rpc("atualizar_preco_item", { p_codigo: cod, p_preco: preco });
        if (error) { naoEncontrados++; continue; }
        if (data === true) atualizados++;
        else semMudanca++;  // igual OU código inexistente
      }
      setResultado({ total: entries.length, atualizados, semMudanca });
    } catch (err) {
      setErro(err.message || "Não foi possível processar a planilha.");
    } finally {
      setProcessando(false);
      e.target.value = "";
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Atualizar valores</h2>
        <p className="subtitle" style={{ marginTop: 8 }}>
          Anexe uma planilha (.xlsx) com as colunas <strong>Material</strong> e <strong>Preço</strong>.
          Só serão atualizados os produtos cujo preço estiver diferente do cadastrado. O histórico não é alterado.
        </p>
        {erro && <div className="login-error">{erro}</div>}
        {resultado && (
          <div className="login-error" style={{ background: "var(--ok-bg)", color: "#248a3d" }}>
            {resultado.atualizados} atualizado(s), {resultado.semMudanca} sem alteração — de {resultado.total} linha(s) lida(s).
          </div>
        )}
        {!resultado && (
          <label className="btn btn-primary btn-full" style={{ textAlign: "center", cursor: "pointer", display: "block", marginTop: 8 }}>
            {processando ? "Processando…" : "Escolher planilha"}
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} disabled={processando} style={{ display: "none" }} />
          </label>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary btn-full" onClick={resultado ? onDone : onClose}>
            {resultado ? "Concluir" : "Cancelar"}
          </button>
        </div>
      </div>
    </Modal>
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
  const [preco, setPreco] = useState(produto ? produto.preco : "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!codigo || !descricao) { setErro("Informe o código e a descrição."); return; }
    setSalvando(true);
    let res;
    if (editMode) {
      res = await sb.rpc("editar_item_preco", { p_codigo: codigo, p_descricao: descricao, p_unidade: unidade, p_estoque_minimo: Number(minimo) || 0, p_preco: Number(preco) || 0 });
    } else {
      res = await sb.rpc("criar_item_preco", { p_codigo: codigo.trim(), p_descricao: descricao, p_unidade: unidade, p_estoque_minimo: Number(minimo) || 0, p_preco: Number(preco) || 0 });
    }
    setSalvando(false);
    if (res.error) { setErro("Não foi possível salvar: " + (res.error.message || res.error.hint || "erro desconhecido")); return; }
    if (res.data === false) { setErro("Já existe um produto com esse código."); return; }
    onSaved();
  }

  return (
    <Modal onClose={onClose}>
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
              <label>Valor (R$)</label>
              <input type="number" min="0" step="any" value={preco} onChange={(e) => setPreco(e.target.value)} />
            </div>
            <div className="field">
              <label>Unidade</label>
              <select value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Estoque mínimo</label>
            <input type="number" min="0" step="any" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

// ---- CENTROS DE CUSTO ----
function CentroCustoConfig() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNovo, setShowNovo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [excluindo, setExcluindo] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("centros_custo").select("numero, descricao, budget").order("numero");
    setLista(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="card section" style={{ marginBottom: 20 }}>
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h2>Centros de Custo</h2>
        <button className="btn btn-primary" onClick={() => setShowNovo(true)}>+ Novo centro de custo</button>
      </div>
      <div className="table-scroll">
        <table className="data-table sticky-head">
          <thead><tr><th>Centro de Custo</th><th>Descrição</th><th>Budget do mês</th><th></th></tr></thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.numero}>
                <td>{c.numero}</td>
                <td>{c.descricao || "—"}</td>
                <td>{fmtBRL(c.budget)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div className="icon-actions">
                    <IconButton kind="edit" title="Editar" onClick={() => setEditando(c)} />
                    <IconButton kind="delete" title="Excluir" onClick={() => setExcluindo(c)} />
                  </div>
                </td>
              </tr>
            ))}
            {!loading && lista.length === 0 && (
              <tr><td colSpan="4"><div className="empty-state">Nenhum centro de custo cadastrado.</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showNovo && <CentroCustoModal onClose={() => setShowNovo(false)} onSaved={() => { setShowNovo(false); carregar(); }} />}
      {editando && <CentroCustoModal centro={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); carregar(); }} />}
      {excluindo && (
        <ConfirmModal
          titulo="Excluir centro de custo"
          mensagem={`Excluir o centro de custo "${excluindo.numero}"? Isso não afeta reservas já registradas.`}
          onClose={() => setExcluindo(null)}
          onConfirm={async () => {
            await sb.rpc("excluir_centro_custo", { p_numero: excluindo.numero });
            setExcluindo(null);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function CentroCustoModal({ centro, onClose, onSaved }) {
  const editMode = !!centro;
  const [numero, setNumero] = useState(centro ? centro.numero : "");
  const [descricao, setDescricao] = useState(centro ? centro.descricao || "" : "");
  const [budget, setBudget] = useState(centro ? centro.budget : "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!numero.trim()) { setErro("Informe o número do centro de custo."); return; }
    setSalvando(true);
    let res;
    if (editMode) {
      res = await sb.rpc("editar_centro_custo", { p_numero: numero.trim(), p_descricao: descricao, p_budget: Number(budget) || 0 });
    } else {
      res = await sb.rpc("criar_centro_custo", { p_numero: numero.trim(), p_descricao: descricao, p_budget: Number(budget) || 0 });
    }
    setSalvando(false);
    if (res.error) { setErro("Não foi possível salvar."); return; }
    if (res.data === false) { setErro("Já existe um centro de custo com esse número."); return; }
    onSaved();
  }

  return (
    <Modal onClose={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{editMode ? "Editar centro de custo" : "Novo centro de custo"}</h2>
        {erro && <div className="login-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Número do Centro de Custo</label>
            <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} disabled={editMode} />
          </div>
          <div className="field">
            <label>Descrição</label>
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="field">
            <label>Budget do mês (R$)</label>
            <input type="number" min="0" step="any" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
          </div>
        </form>
      </div>
    </Modal>
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
    <Modal onClose={onClose}>
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
    </Modal>
  );
}

// ---- MODAL DE CONFIRMAÇÃO GENÉRICO ----
function ConfirmModal({ titulo, mensagem, onClose, onConfirm }) {
  const [processando, setProcessando] = useState(false);
  return (
    <Modal onClose={onClose}>
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
    </Modal>
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
    <Modal onClose={onClose}>
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
    </Modal>
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
        ) : view === "sapatas" ? (
          <SapatasUS user={user} itens={itens} />
        ) : (
          <Configuracoes user={user} onItensChange={carregarItens} />
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
