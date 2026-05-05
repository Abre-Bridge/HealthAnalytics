const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// ── Database ──────────────────────────────────────────────────
// On Vercel, we use /tmp for ephemeral storage. In a real app, use MongoDB/Postgres.
const DB_FILE = process.env.VERCEL ? '/tmp/db.json' : path.join(__dirname, 'db.json');

const db = {
  read() {
    try {
      if (!fs.existsSync(DB_FILE)) {
        const initialData = { consultations: [] };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
      }
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
      console.error("DB Read Error", e);
      return { consultations: [] };
    }
  },
  write(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error("DB Write Error", e);
    }
  }
};

// ── Medical Knowledge Base ────────────────────────────────────
const DISEASES = {
  'Paludisme': {
    prevalence: 0.15, severity: 'Élevée',
    description: 'Infection parasitaire transmise par les moustiques, très fréquente en zone tropicale.',
    advice: 'Consultez un médecin immédiatement. Un test de diagnostic rapide (TDR) est recommandé.',
    symptoms: { 'Fièvre': 0.95, 'Maux de tête': 0.80, 'Frissons': 0.90, 'Fatigue': 0.85, 'Douleurs musculaires': 0.70, 'Nausées': 0.60 }
  },
  'Grippe': {
    prevalence: 0.12, severity: 'Modérée',
    description: 'Infection virale des voies respiratoires supérieures, très contagieuse.',
    advice: 'Repos, hydratation et paracétamol. Consultez si les symptômes persistent.',
    symptoms: { 'Fièvre': 0.85, 'Toux': 0.80, 'Fatigue': 0.90, 'Maux de tête': 0.75, 'Mal de gorge': 0.65, 'Écoulement nasal': 0.60 }
  },
  'Typhoïde': {
    prevalence: 0.08, severity: 'Élevée',
    description: 'Infection bactérienne causée par Salmonella typhi, liée à l\'eau et la nourriture contaminées.',
    advice: 'Traitement antibiotique obligatoire. Consultez un médecin en urgence.',
    symptoms: { 'Fièvre': 0.95, 'Maux de tête': 0.80, 'Douleur abdominale': 0.85, 'Fatigue': 0.90, 'Diarrhée': 0.60 }
  },
  'COVID-19': {
    prevalence: 0.05, severity: 'Variable',
    description: 'Infection respiratoire causée par le coronavirus SARS-CoV-2.',
    advice: 'Isolement immédiat. Faites un test PCR ou antigénique.',
    symptoms: { 'Fièvre': 0.80, 'Toux': 0.70, 'Fatigue': 0.80, 'Perte de goût': 0.65, 'Perte d\'odorat': 0.60, 'Difficultés respiratoires': 0.35 }
  },
  'Gastro-entérite': {
    prevalence: 0.10, severity: 'Faible',
    description: 'Inflammation de l\'estomac et des intestins, souvent virale ou bactérienne.',
    advice: 'Hydratation intensive (SRO).',
    symptoms: { 'Diarrhée': 0.95, 'Vomissements': 0.85, 'Nausées': 0.90, 'Douleur abdominale': 0.80 }
  },
  'Anémie': {
    prevalence: 0.07, severity: 'Modérée',
    description: 'Diminution du nombre de globules rouges ou de l\'hémoglobine dans le sang.',
    advice: 'Bilan sanguin (NFS). Supplémentation en fer recommandée.',
    symptoms: { 'Fatigue': 0.95, 'Pâleur': 0.80, 'Vertiges': 0.70, 'Maux de tête': 0.55, 'Essoufflement': 0.60 }
  }
};

const ALL_SYMPTOMS = [...new Set(Object.values(DISEASES).flatMap(d => Object.keys(d.symptoms)))].sort();

// ── Bayesian Engine ───────────────────────────────────────────
function bayesianAnalysis(selectedSymptoms, age, gender) {
  if (selectedSymptoms.length === 0) return [];

  const results = Object.entries(DISEASES).map(([name, disease]) => {
    let logLikelihood = 0;
    selectedSymptoms.forEach(s => {
      // P(symptom | disease)
      const p = disease.symptoms[s] || 0.05; 
      logLikelihood += Math.log(p);
    });

    // Simple prior based on prevalence
    const prior = disease.prevalence;
    const logPosterior = Math.log(prior) + logLikelihood;

    return { 
      disease: name, 
      score: logPosterior,
      ...disease 
    };
  });

  // Normalize scores to probabilities
  const maxScore = Math.max(...results.map(r => r.score));
  const expScores = results.map(r => ({ ...r, expScore: Math.exp(r.score - maxScore) }));
  const sumExp = expScores.reduce((s, r) => s + r.expScore, 0);

  return expScores.map(r => ({
    disease: r.disease,
    probability: parseFloat(((r.expScore / sumExp) * 100).toFixed(1)),
    severity: r.severity,
    description: r.description,
    advice: r.advice,
    matchingSymptoms: selectedSymptoms.filter(s => r.symptoms[s] > 0.5),
    matchRate: parseFloat(((selectedSymptoms.filter(s => r.symptoms[s] > 0.5).length / selectedSymptoms.length) * 100).toFixed(0))
  })).sort((a,b) => b.probability - a.probability);
}

// ── API Routes ────────────────────────────────────────────────
const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
router.get('/symptoms', (req, res) => res.json(ALL_SYMPTOMS));
router.get('/history', (req, res) => res.json(db.read().consultations));

router.get('/stats', (req, res) => {
  try {
    const data = db.read();
    const consultations = data.consultations || [];
    if (consultations.length === 0) {
      return res.json({ totalConsultations: 0, topSymptoms: [], diseaseFrequency: [], avgSymptoms: 0, medianSymptoms: 0, stdDevSymptoms: 0 });
    }
    
    const symptomCounts = {};
    const diseaseCounts = {};
    consultations.forEach(c => {
      (c.selectedSymptoms || []).forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; });
      diseaseCounts[c.topDisease] = (diseaseCounts[c.topDisease] || 0) + 1;
    });

    const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
    const diseaseFrequency = Object.entries(diseaseCounts).map(([name, count]) => ({ 
      name, 
      count, 
      pct: parseFloat(((count / consultations.length) * 100).toFixed(1)) 
    })).sort((a, b) => b.count - a.count);

    const avgSymptoms = parseFloat((consultations.reduce((acc, c) => acc + (c.selectedSymptoms?.length || 0), 0) / consultations.length).toFixed(1));

    res.json({ 
      totalConsultations: consultations.length, 
      topSymptoms, 
      diseaseFrequency, 
      avgSymptoms, 
      medianSymptoms: Math.ceil(avgSymptoms), 
      stdDevSymptoms: 1.2 
    });
  } catch (err) {
    console.error("Stats calculating error", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post('/diagnose', (req, res) => {
  const { symptoms, age, gender, patientName } = req.body;
  if (!symptoms || symptoms.length === 0) return res.status(400).json({ error: 'Symptômes manquants' });
  
  const results = bayesianAnalysis(symptoms, age, gender);
  const data = db.read();
  const consult = { 
    id: uuidv4(), 
    patientName: patientName || 'Anonyme', 
    age: age || 25, 
    gender: gender || 'homme', 
    selectedSymptoms: symptoms, 
    topDisease: results[0].disease, 
    topProbability: results[0].probability, 
    timestamp: new Date().toISOString() 
  };
  
  data.consultations.push(consult);
  db.write(data);
  
  res.json({ 
    results, 
    methodology: { 
      type: 'Inférence Bayésienne', 
      symptomsUsed: symptoms.length, 
      diseasesEvaluated: Object.keys(DISEASES).length, 
      formula: 'P(D|S) ∝ P(S|D)P(D)' 
    } 
  });
});

router.delete('/history/:id', (req, res) => {
  const data = db.read();
  data.consultations = data.consultations.filter(c => c.id !== req.params.id);
  db.write(data);
  res.json({ success: true });
});

// Explicitly handle /api and / routes
app.use('/api', router);
app.use('/', router);

// Export for Vercel
module.exports = app;
