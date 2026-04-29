import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  HeartPulse, Activity, History, BarChart3, Search,
  Trash2, CheckCircle2, AlertOctagon, ShieldCheck, Clock, Users, Sun, Moon, Stethoscope, Droplet
} from 'lucide-react';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

// ── Medical Tooltip ────────────────────────────────────────────
function TT({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontSize: '0.85rem', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 500 }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
}

// ── Health Status Badge ────────────────────────────────────────
function SeverityBadge({ level }) {
  const map = {
    'Élevée': { cls: 'bg-danger', icon: <AlertOctagon size={13} /> },
    'Modérée': { cls: 'bg-warn', icon: <Activity size={13} /> },
    'Faible': { cls: 'bg-safe', icon: <ShieldCheck size={13} /> },
    'Variable': { cls: 'bg-primary', icon: <Droplet size={13} /> }
  };
  const s = map[level] || map['Variable'];
  return <span className={`badge ${s.cls}`}>{s.icon} {level}</span>;
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState('dark');
  const [tab, setTab] = useState('diagnose');
  const [symptoms, setSymptoms] = useState([]);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({ name: '', age: '', gender: 'homme' });
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sympRes, histRes, statRes] = await Promise.all([
        axios.get(`${API}/symptoms`),
        axios.get(`${API}/history`),
        axios.get(`${API}/stats`)
      ]);
      if (Array.isArray(sympRes.data)) setSymptoms(sympRes.data);
      if (Array.isArray(histRes.data)) setHistory(histRes.data);
      if (statRes.data && typeof statRes.data === 'object') setStats(statRes.data);
    } catch (e) {
      console.error("API Error", e);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleSymptom = (s) => {
    setSelected(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleDiagnose = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/diagnose`, {
        symptoms: selected,
        age: parseInt(form.age) || 25,
        gender: form.gender,
        patientName: form.name || 'Anonyme'
      });
      setResult(res.data);
      setTab('results');
      fetchData();
    } catch { } finally { setLoading(false); }
  };

  const reset = () => {
    setSelected([]); setResult(null);
    setForm({ name: '', age: '', gender: 'homme' });
    setTab('diagnose');
  };

  const deleteConsult = async (id) => {
    await axios.delete(`${API}/history/${id}`);
    fetchData();
  };

  const TABS = [
    { id: 'diagnose', icon: HeartPulse, label: 'Évaluation' },
    { id: 'results', icon: Activity, label: 'Diagnostic' },
    { id: 'stats', icon: BarChart3, label: 'Données' },
    { id: 'history', icon: History, label: 'Dossiers' }
  ];

  // Enhanced Medical Palette for Charts
  const PIE_COLORS = ['#0d9488', '#0284c7', '#059669', '#f59e0b', '#e11d48', '#8b5cf6', '#14b8a6', '#475569'];

  // Animations variants
  const pageVariants = {
    initial: { opacity: 0, y: 15, scale: 0.98 },
    in: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut", staggerChildren: 0.1 } },
    out: { opacity: 0, y: -15, transition: { duration: 0.2 } }
  };
  const itemVariants = { initial: { opacity: 0, y: 10 }, in: { opacity: 1, y: 0 } };

  return (
    <div className="fade-in">
      {/* ── HEADER ────────────────────────────────────────────── */}
      <header className="top-header">
        <div className="brand">
          <div className="brand-icon"><HeartPulse size={20} /></div>
          <div><span style={{ color: 'var(--text)' }}>Health</span><span className="text-gradient">Bridge</span></div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Desktop Nav */}
          <nav className="desktop-nav">
            {TABS.map(t => (
              <button key={t.id} className={`desktop-tab ${tab === t.id ? 'desktop-tab--active' : ''}`} onClick={() => setTab(t.id)}>
                <t.icon size={16} strokeWidth={tab === t.id ? 2.5 : 2} /> {t.label}
              </button>
            ))}
          </nav>

          <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* ── MOBILE BOTTOM NAV ───────          ────────────────────────── */}
      <nav className="bottom-nav">
        {TABS.map(t => (
          <button key={t.id} className={`nav-item ${tab === t.id ? 'nav-item--active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="icon-wrap"><t.icon size={20} strokeWidth={tab === t.id ? 2.5 : 2} /></span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        {/* ══════ DIAGNOSE TAB ══════ */}
        {tab === 'diagnose' && (
          <motion.div key="diag" variants={pageVariants} initial="initial" animate="in" exit="out" className="grid">
            
            {/* Patient File */}
            <motion.div variants={itemVariants} className="glass">
              <div className="section-title"><Users size={20} color="var(--teal-500)" /> Fichier Patient</div>
              <div className="grid grid-3">
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 8 }}>Nom Complet</label>
                  <input className="input" placeholder="ex: Kengne Marie" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 8 }}>Âge (Années)</label>
                  <input className="input" type="number" placeholder="32" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                </div>
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 8 }}>Sexe Biologique</label>
                  <select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="homme">Masculin</option>
                    <option value="femme">Féminin</option>
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Sympotm Matrix */}
            <motion.div variants={itemVariants} className="glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div className="section-title" style={{ margin: 0 }}>
                  <Search size={20} color="var(--teal-500)" /> Matrice Clinique des Symptômes
                </div>
                <span className="badge bg-primary">
                  {selected.length} Marqueur{selected.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="chips">
                {symptoms.map(s => {
                  const isSelected = selected.includes(s);
                  return (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                      key={s} className={`chip ${isSelected ? 'chip--selected' : ''}`} onClick={() => toggleSymptom(s)}
                    >
                      {isSelected && <CheckCircle2 size={14} />} {s}
                    </motion.button>
                  )
                })}
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button className="btn btn--primary" onClick={handleDiagnose} disabled={selected.length === 0 || loading} style={{ flex: 1 }}>
                  <HeartPulse size={18} />
                  {loading ? 'Analyse algorithmique en cours...' : 'Exécuter l\'Analyse Bayésienne'}
                </button>
                {selected.length > 0 && <button className="btn btn--ghost" onClick={() => setSelected([])}>Réinitialiser</button>}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ══════ RESULTS TAB ══════ */}
        {tab === 'results' && result && (
          <motion.div key="res" variants={pageVariants} initial="initial" animate="in" exit="out" className="grid">
            
            {/* Meta Info */}
            <motion.div variants={itemVariants} className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div className="label">Protocole d'Évaluation</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: 4, color: 'var(--teal-500)' }}>{result.methodology.type}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'monospace', marginTop: 4 }}>
                  {result.methodology.formula}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '2.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="label">Marqueurs</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{result.methodology.symptomsUsed}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="label">Pathologies Cibles</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{result.methodology.diseasesEvaluated}</div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-main">
              {/* Disease Rankings */}
              <div className="glass">
                <div className="section-title"><Activity size={20} color="var(--teal-500)" /> Tableau des Probabilités</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {result.results.map((r, i) => (
                    <div key={i} className="result-card">
                      <div className={`result-rank ${r.severity === 'Élevée' ? 'bg-danger' : r.severity === 'Modérée' ? 'bg-warn' : 'bg-safe'}`}>
                        {r.probability}%
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700 }}>{r.disease}</span>
                          <SeverityBadge level={r.severity} />
                        </div>
                        <div className="progress-track">
                          <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${r.probability}%` }}
                            transition={{ duration: 1.2, delay: i * 0.1 }}
                            style={{ background: `linear-gradient(90deg, ${PIE_COLORS[i % PIE_COLORS.length]}, ${PIE_COLORS[(i + 1) % PIE_COLORS.length]})` }}
                          />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>
                          Fiabilité: {r.matchRate}% · Identifie {r.matchingSymptoms.length} symptôme{r.matchingSymptoms.length > 1 ? 's' : ''} concordant{r.matchingSymptoms.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Primary Report */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass" style={{ borderTop: '4px solid var(--teal-500)' }}>
                  <div className="label">Diagnostic Primaire Détecté</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, marginTop: 4 }}>{result.results[0]?.disease}</div>
                  <div className="text-gradient" style={{ fontSize: '3rem', fontWeight: 900, marginTop: -4 }}>{result.results[0]?.probability}%</div>
                  
                  <div className="glass-panel" style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.results[0]?.description}</div>
                  </div>
                  
                  <div style={{ padding: '1rem', background: 'var(--amber-soft)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--amber-500)' }}>
                    <div style={{ color: 'var(--amber-500)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <AlertOctagon size={16} /> Recommandation Médicale
                    </div>
                    <div style={{ color: 'var(--text)', fontSize: '0.9rem', marginTop: 8, fontWeight: 500 }}>{result.results[0]?.advice}</div>
                  </div>
                </div>

                <div className="glass">
                  <div className="section-title">Spectre des Probabilités</div>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={result.results.slice(0, 5)} dataKey="probability" nameKey="disease" cx="50%" cy="50%" innerRadius={60} outerRadius={90} strokeWidth={0} paddingAngle={2}>
                          {result.results.slice(0, 5).map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                        </Pie>
                        <Tooltip content={<TT />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.button variants={itemVariants} className="btn btn--ghost btn--block" onClick={reset}>
               Terminer et Démarrer une Nouvelle Consultation
            </motion.button>
          </motion.div>
        )}

        {/* ══════ STATS TAB ══════ */}
        {tab === 'stats' && (
          <motion.div key="stats" variants={pageVariants} initial="initial" animate="in" exit="out" className="grid">
            {stats?.totalConsultations > 0 ? (
              <>
                <div className="grid grid-4">
                  {[
                    { label: 'Consultations Totales', value: stats.totalConsultations, icon: Stethoscope, color: 'var(--teal-500)' },
                    { label: 'Indice Synthétique', value: stats.avgSymptoms, icon: Activity, color: 'var(--sky-500)' },
                    { label: 'Médiane des Signes', value: stats.medianSymptoms, icon: BarChart3, color: 'var(--emerald-500)' },
                    { label: 'Déviation Standard', value: stats.stdDevSymptoms, icon: ShieldCheck, color: 'var(--amber-500)' }
                  ].map((s, i) => (
                    <div key={i} className="glass">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div className="label">{s.label}</div>
                          <div className="metric" style={{ marginTop: 8 }}>{s.value}</div>
                        </div>
                        <div style={{ background: `rgba(255,255,255,0.05)`, padding: '0.6rem', borderRadius: '12px' }}>
                          <s.icon size={22} color={s.color} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-2">
                  <div className="glass">
                    <div className="section-title"><BarChart3 size={20} color="var(--teal-500)" /> Fréquence des Signes Cliniques</div>
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.topSymptoms} layout="vertical" margin={{ left: -10 }}>
                          <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" width={140} stroke="var(--text-muted)" tick={{ fontSize: 11, fontWeight: 500 }} />
                          <Tooltip content={<TT />} />
                          <Bar dataKey="count" name="Observations" radius={[0, 6, 6, 0]} barSize={18}>
                            {stats.topSymptoms.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass">
                    <div className="section-title"><Activity size={20} color="var(--sky-500)" /> Distribution des Pathologies</div>
                    <div style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.diseaseFrequency} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={110} strokeWidth={2} stroke="var(--bg)" label={({ name, pct }) => `${name} ${pct}%`} labelLine={false} style={{ fontSize: 10, fontWeight: 600 }}>
                            {stats.diseaseFrequency.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<TT />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="glass" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                <Stethoscope size={56} style={{ opacity: 0.1, marginBottom: '1.5rem', color: 'var(--teal-500)' }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Aucune Donnée Épidémiologique</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Les statistiques seront générées après la validation de la première évaluation patient.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ══════ HISTORY TAB ══════ */}
        {tab === 'history' && (
          <motion.div key="hist" variants={pageVariants} initial="initial" animate="in" exit="out" className="glass">
            <div className="section-title"><Clock size={20} color="var(--teal-500)" /> Registre des Diagnostics</div>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <History size={48} style={{ opacity: 0.15, marginBottom: '1rem' }} />
                <p>Le registre électronique est actuellement vide.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {history.slice().reverse().map(c => (
                  <motion.div whileHover={{ scale: 1.01 }} key={c.id} className="result-card" style={{ justifyContent: 'space-between', background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div className="result-rank bg-primary" style={{ padding: '0 0.5rem', width: 'auto', minWidth: 60 }}>
                        {c.topProbability}%
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 2 }}>{c.patientName} <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.9rem' }}>· {c.age} ans</span></div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: 'var(--teal-500)', fontWeight: 600 }}>{c.topDisease}</span> 
                          <span>·</span> {c.selectedSymptoms.length} symptômes détectés 
                          <span>·</span> <Clock size={12}/> {new Date(c.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <button className="btn btn--ghost" style={{ padding: '0.6rem' }} onClick={() => deleteConsult(c.id)} title="Supprimer du registre">
                      <Trash2 size={18} color="var(--rose-400)" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
