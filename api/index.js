const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// ── Database ──────────────────────────────────────────────────
const DB_FILE = process.env.VERCEL ? '/tmp/db.json' : path.join(__dirname, 'db.json');
const db = {
  read() {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ consultations: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  },
  write(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }
};

// ── Medical Knowledge Base ────────────────────────────────────
const DISEASES = {
  'Paludisme': {
    prevalence: 0.15, severity: 'Élevée',
    description: 'Infection parasitaire transmise par les moustiques.',
    advice: 'Consultez un médecin immédiatement.',
    symptoms: { 'Fièvre': 0.95, 'Maux de tête': 0.80, 'Frissons': 0.90, 'Fatigue': 0.85 }
  },
  'Grippe': {
    prevalence: 0.12, severity: 'Modérée',
    description: 'Infection virale des voies respiratoires.',
    advice: 'Repos, hydratation et paracétamol.',
    symptoms: { 'Fièvre': 0.85, 'Toux': 0.80, 'Fatigue': 0.90, 'Mal de gorge': 0.65 }
  },
  'Anémie': {
    prevalence: 0.07, severity: 'Modérée',
    description: 'Diminution du nombre de globules rouges.',
    advice: 'Bilan sanguin (NFS).',
    symptoms: { 'Fatigue': 0.95, 'Pâleur': 0.80, 'Vertiges': 0.70 }
  }
};

const ALL_SYMPTOMS = [...new Set(Object.values(DISEASES).flatMap(d => Object.keys(d.symptoms)))].sort();

function bayesianAnalysis(selectedSymptoms, age, gender) {
  const results = Object.entries(DISEASES).map(([name, disease]) => {
    let logLikelihood = 0;
    selectedSymptoms.forEach(s => {
      logLikelihood += Math.log(disease.symptoms[s] || 0.05);
    });
    return { disease: name, probability: Math.exp(logLikelihood), ...disease };
  });
  const sum = results.reduce((s, r) => s + r.probability, 0);
  return results.map(r => ({
    ...r,
    probability: parseFloat(((r.probability / sum) * 100).toFixed(1)),
    matchingSymptoms: selectedSymptoms.filter(s => r.symptoms[s] > 0.5),
    matchRate: 100
  })).sort((a,b) => b.probability - a.probability);
}

// ── API Routes ────────────────────────────────────────────────
app.get('/api/symptoms', (req, res) => res.json(ALL_SYMPTOMS));
app.get('/api/stats', (req, res) => res.json({ totalConsultations: db.read().consultations.length, topSymptoms: [], diseaseFrequency: [] }));
app.get('/api/history', (req, res) => res.json(db.read().consultations));
app.post('/api/diagnose', (req, res) => {
  const { symptoms, age, gender, patientName } = req.body;
  const results = bayesianAnalysis(symptoms, age, gender);
  const data = db.read();
  const consult = { id: uuidv4(), patientName, selectedSymptoms: symptoms, topDisease: results[0].disease, topProbability: results[0].probability, timestamp: new Date().toISOString() };
  data.consultations.push(consult);
  db.write(data);
  res.json({ results, methodology: { type: 'Bayesian', symptomsUsed: symptoms.length, diseasesEvaluated: results.length } });
});

module.exports = app;
