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
        <div className="login-logo">📦</div>
        <h1>Estoque de Insumos</h1>
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
const NAV_ITEMS = [
  { key: "inicio", label: "Início", icon: "🏠" },
  { key: "reserva", label: "Reserva", icon: "🧾" },
  { key: "saida", label: "Saída", icon: "📤" },
  { key: "estoque", label: "Estoque", icon: "📊" },
  { key: "config", label: "Config.", icon: "⚙️" },
];

function TopBar({ user, onLogout }) {
  return (
    <div className="topbar">
      <div className="topbar-brand">
        <span className="dot" />
        Estoque de Insumos
      </div>
      <div className="topbar-user">
        <span>{user.nome} · {user.pn}</span>
        <button onClick={onLogout}>Sair</button>
      </div>
    </div>
  );
}

function BottomNav({ active, onChange }) {
  return (
    <div className="bottomnav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          className={active === item.key ? "active" : ""}
          onClick={() => onChange(item.key)}
        >
          <span className="icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
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
          { label: "Estoque atual", data: atual, backgroundColor: "#0071e3", borderRadius: 6, maxBarThickness: 26 },
          { label: "Estoque mínimo", data: minimo, backgroundColor: "#ff3b30", borderRadius: 6, maxBarThickness: 26 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top", labels: { usePointStyle: true, boxWidth: 8, font: { family: "Inter" } } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 } } },
          y: { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { font: { family: "Inter" } } },
        },
      },
    });
  }, [loading, estoque, criticos]);

  return (
    <div>
      <div className="page-header">
        <h1>Olá, {user.nome.split(" ")[0]} 👋</h1>
        <p>Aqui está a visão geral do estoque de insumos hoje.</p>
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

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb
      .from("movimentos_estoque")
      .select("*")
      .eq("tipo", "reserva")
      .order("data_movimento", { ascending: false })
      .limit(80);
    setLista(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

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
        <h2 style={{ marginBottom: 14 }}>Últimas reservas</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th><th>Código</th><th>Item</th><th>Qtd.</th>
                <th>Reserva</th><th>Laudo</th><th>Recebido</th><th>Pendência</th><th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id}>
                  <td>{fmtDate(m.data_movimento)}</td>
                  <td>{m.codigo}</td>
                  <td>{(itens[m.codigo] || {}).descricao || "—"}</td>
                  <td>{fmtNum(m.quantidade)}</td>
                  <td>{m.numero_reserva || "—"}</td>
                  <td>
                    {m.laudo === "Aprovado" ? <span className="badge badge-ok">Aprovado</span>
                      : m.laudo ? <span className="badge badge-neutral">{m.laudo}</span>
                      : <span className="badge badge-critical">Pendente</span>}
                  </td>
                  <td>{fmtNum(m.quantidade_recebida)}</td>
                  <td>{Number(m.pendencia) > 0 ? <span className="badge badge-critical">{fmtNum(m.pendencia)}</span> : "—"}</td>
                  <td>
                    {!m.quantidade_recebida || Number(m.quantidade_recebida) < Number(m.quantidade) ? (
                      <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => setRecebendo(m)}>
                        Receber
                      </button>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {!loading && lista.length === 0 && (
                <tr><td colSpan="9"><div className="empty-state">Nenhuma reserva registrada ainda.</div></td></tr>
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

function NovaReservaModal({ user, itens, onClose, onSaved }) {
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [cc, setCc] = useState("");
  const [numeroReserva, setNumeroReserva] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!codigo || !quantidade) {
      setErro("Selecione o item e informe a quantidade.");
      return;
    }
    setSalvando(true);
    const { error } = await sb.from("movimentos_estoque").insert({
      tipo: "reserva",
      codigo,
      quantidade: Number(quantidade),
      centro_custo: cc || null,
      numero_reserva: numeroReserva || null,
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
            <label>Item</label>
            <ItemSelect itens={itens} value={codigo} onChange={setCodigo} />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Quantidade</label>
              <input type="number" min="0" step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            <div className="field">
              <label>Centro de custo (opcional)</label>
              <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Nº da reserva (opcional)</label>
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

function ConfirmarRecebimentoModal({ movimento, onClose, onSaved }) {
  const [qtdRecebida, setQtdRecebida] = useState(movimento.quantidade || "");
  const [laudo, setLaudo] = useState("Aprovado");
  const [responsavel, setResponsavel] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSalvando(true);
    const pendencia = Math.max(0, Number(movimento.quantidade) - Number(qtdRecebida));

    const { error: e1 } = await sb.from("movimentos_estoque")
      .update({ quantidade_recebida: Number(qtdRecebida), laudo, pendencia, responsavel_recebimento: responsavel || null })
      .eq("id", movimento.id);

    const { error: e2 } = await sb.from("movimentos_estoque").insert({
      tipo: "recebimento",
      codigo: movimento.codigo,
      quantidade: Number(qtdRecebida),
      numero_reserva: movimento.numero_reserva,
      centro_custo: movimento.centro_custo,
      laudo,
      quantidade_recebida: Number(qtdRecebida),
      pendencia,
      responsavel_recebimento: responsavel || null,
    });

    setSalvando(false);
    if (e1 || e2) { setErro("Não foi possível confirmar o recebimento."); return; }
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Confirmar recebimento</h2>
        <div className="subtitle">Item {movimento.codigo} · reservado {fmtNum(movimento.quantidade)}</div>
        {erro && <div className="login-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label>Quantidade recebida</label>
              <input type="number" min="0" step="any" value={qtdRecebida} onChange={(e) => setQtdRecebida(e.target.value)} />
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
            <input type="text" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
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

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb
      .from("movimentos_estoque")
      .select("*")
      .eq("tipo", "saida")
      .order("data_movimento", { ascending: false })
      .limit(80);
    setLista(data || []);
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
        <button className="btn btn-dark" onClick={() => setShowForm(true)}>+ Registrar saída</button>
      </div>

      <div className="card section">
        <h2 style={{ marginBottom: 14 }}>Últimas saídas</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Data</th><th>Código</th><th>Item</th><th>Qtd.</th><th>Turno</th><th>Local</th><th>Motivo</th><th>Registrado por</th></tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id}>
                  <td>{fmtDate(m.data_movimento)}</td>
                  <td>{m.codigo}</td>
                  <td>{(itens[m.codigo] || {}).descricao || "—"}</td>
                  <td>{fmtNum(m.quantidade)}</td>
                  <td>{m.turno || "—"}</td>
                  <td>{m.local_destino || "—"}</td>
                  <td>{m.motivo || "—"}</td>
                  <td>{m.usuario_pn || "—"}</td>
                </tr>
              ))}
              {!loading && lista.length === 0 && (
                <tr><td colSpan="8"><div className="empty-state">Nenhuma saída registrada ainda.</div></td></tr>
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
    if (!codigo || !quantidade) { setErro("Selecione o item e informe a quantidade."); return; }
    setSalvando(true);
    const { error } = await sb.from("movimentos_estoque").insert({
      tipo: "saida",
      codigo,
      quantidade: Number(quantidade),
      turno,
      local_destino: local || null,
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
            <ItemSelect itens={itens} value={codigo} onChange={setCodigo} />
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
              <input type="text" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex: Distribuição Q&T" />
            </div>
            <div className="field">
              <label>Motivo</label>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                <option>Consumo</option>
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

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Código</th><th>Descrição</th><th>Un.</th><th>Recebido</th><th>Consumido</th><th>Estoque</th><th>Mínimo</th><th>Status</th></tr>
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
                  <td>
                    {i.status === "CRITICO"
                      ? <span className="badge badge-critical">Crítico</span>
                      : <span className="badge badge-ok">OK</span>}
                  </td>
                </tr>
              ))}
              {!loading && filtrado.length === 0 && (
                <tr><td colSpan="8"><div className="empty-state">Nenhum item encontrado.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================
function Configuracoes({ user }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNovo, setShowNovo] = useState(false);

  const carregar = useCallback(async () => {
    if (user.perfil !== "admin") { setLoading(false); return; }
    setLoading(true);
    const { data } = await sb.from("usuarios").select("id, pn, nome, perfil, ativo, precisa_trocar_senha").order("nome");
    setUsuarios(data || []);
    setLoading(false);
  }, [user.perfil]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div>
      <div className="page-header">
        <h1>Configurações</h1>
        <p>Gerencie usuários e sua própria conta.</p>
      </div>

      <div className="card section" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 14 }}>Minha conta</h2>
        <TrocarMinhaSenha user={user} />
      </div>

      {user.perfil === "admin" ? (
        <div className="card section">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h2>Usuários</h2>
            <button className="btn btn-primary" onClick={() => setShowNovo(true)}>+ Novo usuário</button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>PN</th><th>Nome</th><th>Perfil</th><th>Status</th></tr></thead>
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
                  </tr>
                ))}
                {!loading && usuarios.length === 0 && (
                  <tr><td colSpan="4"><div className="empty-state">Nenhum usuário cadastrado.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card section">
          <p className="muted">Apenas administradores podem cadastrar novos usuários.</p>
        </div>
      )}

      {showNovo && (
        <NovoUsuarioModal onClose={() => setShowNovo(false)} onSaved={() => { setShowNovo(false); carregar(); }} />
      )}
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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await sb.from("itens").select("codigo, descricao, unidade, estoque_minimo").eq("ativo", true);
      const map = {};
      (data || []).forEach((i) => { map[i.codigo] = i; });
      setItens(map);
      setItensLoaded(true);
    })();
  }, [user]);

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
      <div className="content">
        {!itensLoaded ? (
          <div className="loading-screen">Carregando…</div>
        ) : view === "inicio" ? (
          <Dashboard user={user} onNavigate={setView} />
        ) : view === "reserva" ? (
          <ReservaRecebimento user={user} itens={itens} />
        ) : view === "saida" ? (
          <Saida user={user} itens={itens} />
        ) : view === "estoque" ? (
          <Estoque />
        ) : (
          <Configuracoes user={user} />
        )}
      </div>
      <BottomNav active={view} onChange={setView} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
