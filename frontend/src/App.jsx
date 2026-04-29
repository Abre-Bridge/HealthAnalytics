import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Stethoscope, Activity, History, BarChart3, Search,
  ChevronRight, Trash2, CheckCircle, AlertTriangle, Shield, Clock, Users, Sun, Moon
} from 'lucide-react';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

// ── Custom Tooltip ────────────────────────────────────────────
function TT({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#14141f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.6rem 0.9rem', fontSize: '0.8rem' }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
}

// ── Severity Badge ────────────────────────────────────────────
function SeverityBadge({ level }) {
  const map = {
    'Élevée': { cls: 'severity-high', icon: <AlertTriangle size={12} /> },
    'Modérée': { cls: 'severity-mod', icon: <Shield size={12} /> },
    'Faible': { cls: 'severity-low', icon: <CheckCircle size={12} /> },
    'Variable': { cls: 'severity-mod', icon: <Activity size={12} /> }
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
      setSymptoms(sympRes.data);
      setHistory(histRes.data || []);
      setStats(statRes.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    setSelected([]);
    setResult(null);
    setForm({ name: '', age: '', gender: 'homme' });
    setTab('diagnose');
  };

  const deleteConsult = async (id) => {
    await axios.delete(`${API}/history/${id}`);
    fetchData();
  };

  const TABS = [
    { id: 'diagnose', icon: Stethoscope, label: 'Diagnostic' },
    { id: 'results', icon: Activity, label: 'Résultats' },
    { id: 'stats', icon: BarChart3, label: 'Statistiques' },
    { id: 'history', icon: History, label: 'Historique' }
  ];

  const PIE_COLORS = ['#0d9488', '#0284c7', '#059669', '#d97706', '#e11d48', '#16a34a', '#8b5cf6', '#14b8a6'];

  return (
    <div className="fade-in">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="nav">
        <div className="nav__left">
          <div className="nav__icon"><Stethoscope size={18} color="#fff" /></div>
          <div className="nav__brand">MediPulse</div>
        </div>
        <div className="nav__right">
          <div className="tabs">
            {TABS.map(t => (
              <button key={t.id} className={`tab ${tab === t.id ? 'tab--active' : ''}`} onClick={() => setTab(t.id)}>
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>

      <AnimatePresence mode="wait">

        {/* ══════ DIAGNOSE TAB ══════ */}
        {tab === 'diagnose' && (
          <motion.div key="diag" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Patient info */}
            <div className="glass" style={{ marginBottom: '1.25rem' }}>
              <div className="section-title"><Users size={18} color="var(--teal)" /> Informations du Patient</div>
              <div className="grid grid-3">
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 6 }}>Nom</label>
                  <input className="input" placeholder="ex: Jean Kamga" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 6 }}>Âge</label>
                  <input className="input" type="number" placeholder="25" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                </div>
                <div>
                  <label className="label" style={{ display: 'block', marginBottom: 6 }}>Sexe</label>
                  <select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Symptom Picker */}
            <div className="glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className="section-title" style={{ margin: 0 }}>
                  <Search size={18} color="var(--teal)" /> Sélectionnez vos Symptômes
                </div>
                <span className="badge" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
                  {selected.length} sélectionné{selected.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="chips">
                {symptoms.map(s => (
                  <button
                    key={s}
                    className={`chip ${selected.includes(s) ? 'chip--selected' : ''}`}
                    onClick={() => toggleSymptom(s)}
                  >
                    {selected.includes(s) && <CheckCircle size={13} />} {s}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn--primary" onClick={handleDiagnose} disabled={selected.length === 0 || loading} style={{ flex: 1 }}>
                  <Stethoscope size={18} />
                  {loading ? 'Analyse en cours...' : 'Lancer le Diagnostic Bayésien'}
                </button>
                {selected.length > 0 && (
                  <button className="btn btn--ghost" onClick={() => setSelected([])}>Effacer</button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════ RESULTS TAB ══════ */}
        {tab === 'results' && result && (
          <motion.div key="res" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Methodology Banner */}
            <div className="glass" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div className="label">Méthodologie</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 4 }}>{result.methodology.type}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontFamily: 'monospace', marginTop: 4 }}>
                  {result.methodology.formula}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="label">Symptômes</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{result.methodology.symptomsUsed}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="label">Maladies</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{result.methodology.diseasesEvaluated}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-main">
              {/* Disease Rankings */}
              <div className="glass">
                <div className="section-title"><Activity size={18} color="var(--teal)" /> Probabilités Conditionnelles</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {result.results.map((r, i) => (
                    <div key={i} className="result-card">
                      <div
                        className={`result-rank ${r.severity === 'Élevée' ? 'severity-high' : r.severity === 'Modérée' ? 'severity-mod' : 'severity-low'}`}
                      >
                        {r.probability}%
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{r.disease}</span>
                          <SeverityBadge level={r.severity} />
                        </div>
                        <div className="progress-track">
                          <motion.div
                            className="progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${r.probability}%` }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            style={{ background: `linear-gradient(90deg, ${PIE_COLORS[i % PIE_COLORS.length]}, ${PIE_COLORS[(i + 1) % PIE_COLORS.length]})` }}
                          />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
                          Correspondance: {r.matchRate}% · {r.matchingSymptoms.length} symptôme{r.matchingSymptoms.length > 1 ? 's' : ''} reconnu{r.matchingSymptoms.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Result Detail + Pie */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="glass" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), transparent)' }}>
                  <div className="label">Diagnostic Principal</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }}>{result.results[0]?.disease}</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--teal)', marginTop: 4 }}>{result.results[0]?.probability}%</div>
                  <div style={{ margin: '1rem 0', height: 1, background: 'var(--glass-border)' }} />
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>{result.results[0]?.description}</div>
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--amber-soft)', borderRadius: 'var(--radius-xs)', fontSize: '0.82rem', color: 'var(--amber)' }}>
                    <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {result.results[0]?.advice}
                  </div>
                </div>

                <div className="glass">
                  <div className="section-title">Répartition des Probabilités</div>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={result.results.slice(0, 5)} dataKey="probability" nameKey="disease" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={0}>
                          {result.results.slice(0, 5).map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                        </Pie>
                        <Tooltip content={<TT />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <button className="btn btn--ghost btn--block" style={{ marginTop: '1.25rem' }} onClick={reset}>
              Nouvelle Consultation
            </button>
          </motion.div>
        )}

        {/* ══════ STATS TAB ══════ */}
        {tab === 'stats' && (
          <motion.div key="stats" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {stats?.totalConsultations > 0 ? (
              <>
                {/* Stat Cards */}
                <div className="grid grid-4" style={{ marginBottom: '1.25rem' }}>
                  {[
                    { label: 'Consultations', value: stats.totalConsultations, icon: Stethoscope, color: 'var(--teal)' },
                    { label: 'Moy. Symptômes', value: stats.avgSymptoms, icon: Activity, color: 'var(--blue)' },
                    { label: 'Médiane Sympt.', value: stats.medianSymptoms, icon: BarChart3, color: 'var(--green)' },
                    { label: 'Écart-Type', value: stats.stdDevSymptoms, icon: Shield, color: 'var(--amber)' }
                  ].map((s, i) => (
                    <motion.div key={i} className="glass" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.08 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div className="label">{s.label}</div>
                          <div className="metric" style={{ color: s.color }}>{s.value}</div>
                        </div>
                        <s.icon size={20} color={s.color} style={{ opacity: 0.5 }} />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-2">
                  {/* Top Symptoms Chart */}
                  <div className="glass">
                    <div className="section-title"><BarChart3 size={18} color="var(--teal)" /> Symptômes les Plus Fréquents</div>
                    <div style={{ height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.topSymptoms} layout="vertical">
                          <XAxis type="number" stroke="#555" tick={{ fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" width={130} stroke="#555" tick={{ fontSize: 10 }} />
                          <Tooltip content={<TT />} />
                          <Bar dataKey="count" name="Fréquence" radius={[0, 6, 6, 0]} barSize={16}>
                            {stats.topSymptoms.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Disease Distribution */}
                  <div className="glass">
                    <div className="section-title"><Activity size={18} color="var(--blue)" /> Distribution des Diagnostics</div>
                    <div style={{ height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.diseaseFrequency} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} strokeWidth={0} label={({ name, pct }) => `${name} (${pct}%)`}>
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
              <div className="glass" style={{ textAlign: 'center', padding: '4rem' }}>
                <BarChart3 size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-dim)' }}>Aucune donnée statistique disponible.<br />Effectuez votre première consultation pour commencer.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ══════ HISTORY TAB ══════ */}
        {tab === 'history' && (
          <motion.div key="hist" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="glass">
              <div className="section-title"><History size={18} color="var(--teal)" /> Historique des Consultations</div>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <Clock size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                  <p>Aucune consultation enregistrée</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {history.slice().reverse().map(c => (
                    <div key={c.id} className="result-card" style={{ justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="result-rank" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
                          {c.topProbability}%
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.patientName} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {c.age} ans</span></div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                            {c.topDisease} · {c.selectedSymptoms.length} symptôme{c.selectedSymptoms.length > 1 ? 's' : ''} · {new Date(c.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                          </div>
                        </div>
                      </div>
                      <button className="btn btn--ghost" style={{ padding: '0.5rem' }} onClick={() => deleteConsult(c.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
