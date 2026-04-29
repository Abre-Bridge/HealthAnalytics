const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

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
// Each disease has: prevalence (prior probability), symptoms with
// P(symptom | disease) — how likely a patient with this disease shows the symptom
const DISEASES = {
  'Paludisme': {
    prevalence: 0.15,
    severity: 'Élevée',
    description: 'Infection parasitaire transmise par les moustiques, très fréquente en zone tropicale.',
    advice: 'Consultez un médecin immédiatement. Un test de diagnostic rapide (TDR) est recommandé.',
    symptoms: {
      'Fièvre': 0.95, 'Maux de tête': 0.80, 'Frissons': 0.90,
      'Douleurs musculaires': 0.70, 'Fatigue': 0.85, 'Nausées': 0.60,
      'Vomissements': 0.50, 'Transpiration excessive': 0.75, 'Diarrhée': 0.30,
      'Toux': 0.10, 'Douleur abdominale': 0.40
    }
  },
  'Grippe': {
    prevalence: 0.12,
    severity: 'Modérée',
    description: 'Infection virale des voies respiratoires supérieures, très contagieuse.',
    advice: 'Repos, hydratation et paracétamol. Consultez si les symptômes persistent plus de 5 jours.',
    symptoms: {
      'Fièvre': 0.85, 'Maux de tête': 0.75, 'Toux': 0.80,
      'Fatigue': 0.90, 'Douleurs musculaires': 0.80, 'Frissons': 0.70,
      'Mal de gorge': 0.65, 'Écoulement nasal': 0.60, 'Nausées': 0.25,
      'Éternuements': 0.40
    }
  },
  'Typhoïde': {
    prevalence: 0.08,
    severity: 'Élevée',
    description: 'Infection bactérienne causée par Salmonella typhi, liée à l\'eau et la nourriture contaminées.',
    advice: 'Traitement antibiotique obligatoire. Consultez un médecin en urgence.',
    symptoms: {
      'Fièvre': 0.95, 'Maux de tête': 0.80, 'Douleur abdominale': 0.85,
      'Fatigue': 0.90, 'Diarrhée': 0.60, 'Constipation': 0.40,
      'Perte d\'appétit': 0.80, 'Nausées': 0.50, 'Éruption cutanée': 0.30,
      'Douleurs musculaires': 0.40
    }
  },
  'COVID-19': {
    prevalence: 0.05,
    severity: 'Variable',
    description: 'Infection respiratoire causée par le coronavirus SARS-CoV-2.',
    advice: 'Isolement immédiat. Faites un test PCR ou antigénique. Consultez si difficultés respiratoires.',
    symptoms: {
      'Fièvre': 0.80, 'Toux': 0.70, 'Fatigue': 0.80,
      'Perte de goût': 0.65, 'Perte d\'odorat': 0.60, 'Maux de tête': 0.50,
      'Douleurs musculaires': 0.45, 'Mal de gorge': 0.40, 'Diarrhée': 0.20,
      'Difficultés respiratoires': 0.35, 'Frissons': 0.30
    }
  },
  'Gastro-entérite': {
    prevalence: 0.10,
    severity: 'Faible',
    description: 'Inflammation de l\'estomac et des intestins, souvent virale ou bactérienne.',
    advice: 'Hydratation intensive (SRO). Consultez si sang dans les selles ou déshydratation sévère.',
    symptoms: {
      'Diarrhée': 0.95, 'Vomissements': 0.85, 'Nausées': 0.90,
      'Douleur abdominale': 0.80, 'Fièvre': 0.40, 'Fatigue': 0.60,
      'Perte d\'appétit': 0.70, 'Frissons': 0.25, 'Maux de tête': 0.30
    }
  },
  'Pneumonie': {
    prevalence: 0.04,
    severity: 'Élevée',
    description: 'Infection des poumons pouvant être bactérienne, virale ou fongique.',
    advice: 'Consultez immédiatement. Une radiographie thoracique et des antibiotiques sont souvent nécessaires.',
    symptoms: {
      'Toux': 0.90, 'Fièvre': 0.85, 'Difficultés respiratoires': 0.80,
      'Douleur thoracique': 0.70, 'Fatigue': 0.75, 'Frissons': 0.60,
      'Transpiration excessive': 0.50, 'Maux de tête': 0.30, 'Nausées': 0.20,
      'Douleurs musculaires': 0.35
    }
  },
  'Infection Urinaire': {
    prevalence: 0.06,
    severity: 'Modérée',
    description: 'Infection bactérienne du système urinaire, plus fréquente chez les femmes.',
    advice: 'Antibiotiques prescrits par un médecin. Boire beaucoup d\'eau.',
    symptoms: {
      'Douleur en urinant': 0.90, 'Envie fréquente d\'uriner': 0.85,
      'Douleur abdominale': 0.60, 'Fièvre': 0.40, 'Fatigue': 0.35,
      'Urine trouble': 0.70, 'Douleur pelvienne': 0.55, 'Nausées': 0.20
    }
  },
  'Anémie': {
    prevalence: 0.07,
    severity: 'Modérée',
    description: 'Diminution du nombre de globules rouges ou de l\'hémoglobine dans le sang.',
    advice: 'Bilan sanguin (NFS). Supplémentation en fer et acide folique selon les résultats.',
    symptoms: {
      'Fatigue': 0.95, 'Pâleur': 0.80, 'Vertiges': 0.70,
      'Maux de tête': 0.55, 'Essoufflement': 0.60, 'Palpitations': 0.50,
      'Frissons': 0.30, 'Perte d\'appétit': 0.40, 'Ongles cassants': 0.45
    }
  }
};

// Extract unique symptoms
const ALL_SYMPTOMS = [...new Set(
  Object.values(DISEASES).flatMap(d => Object.keys(d.symptoms))
)].sort();

// ── Bayesian Engine ───────────────────────────────────────────
function bayesianAnalysis(selectedSymptoms, age, gender) {
  if (selectedSymptoms.length === 0) return [];

  const results = [];

  // Total prevalence for normalization
  const totalPrevalence = Object.values(DISEASES).reduce((s, d) => s + d.prevalence, 0);

  for (const [name, disease] of Object.entries(DISEASES)) {
    // Prior: P(Disease)
    let prior = disease.prevalence / totalPrevalence;

    // Age adjustment (simple heuristic)
    if (age < 5 && (name === 'Paludisme' || name === 'Pneumonie')) prior *= 1.3;
    if (age > 60 && (name === 'Pneumonie' || name === 'Anémie')) prior *= 1.4;

    // Likelihood: P(Symptoms | Disease) = product of individual symptom probabilities
    let logLikelihood = 0;
    for (const symptom of selectedSymptoms) {
      const pSymptomGivenDisease = disease.symptoms[symptom] || 0.02; // base rate if symptom not in disease
      logLikelihood += Math.log(pSymptomGivenDisease);
    }

    // Also account for symptoms NOT selected (absence of symptoms)
    for (const symptom of ALL_SYMPTOMS) {
      if (!selectedSymptoms.includes(symptom) && disease.symptoms[symptom]) {
        // P(NOT symptom | disease) = 1 - P(symptom | disease)
        // Only penalize strongly associated symptoms
        if (disease.symptoms[symptom] > 0.6) {
          logLikelihood += Math.log(1 - disease.symptoms[symptom] * 0.3);
        }
      }
    }

    // Posterior (unnormalized, in log space)
    const logPosterior = Math.log(prior) + logLikelihood;
    results.push({
      disease: name,
      logPosterior,
      ...disease
    });
  }

  // Convert from log space and normalize
  const maxLog = Math.max(...results.map(r => r.logPosterior));
  results.forEach(r => {
    r.rawPosterior = Math.exp(r.logPosterior - maxLog);
  });
  const sumPosterior = results.reduce((s, r) => s + r.rawPosterior, 0);
  results.forEach(r => {
    r.probability = parseFloat(((r.rawPosterior / sumPosterior) * 100).toFixed(1));
  });

  // Sort by probability descending
  results.sort((a, b) => b.probability - a.probability);

  // Compute matching symptoms for each disease
  results.forEach(r => {
    r.matchingSymptoms = selectedSymptoms.filter(s => r.symptoms[s] && r.symptoms[s] > 0.3);
    r.matchRate = parseFloat(((r.matchingSymptoms.length / selectedSymptoms.length) * 100).toFixed(0));
    // Clean up internal fields
    delete r.logPosterior;
    delete r.rawPosterior;
    delete r.symptoms;
  });

  return results;
}

// ── Statistical Summary ───────────────────────────────────────
function computeStats(consultations) {
  if (consultations.length === 0) return null;

  // Most common symptoms
  const symptomCounts = {};
  const diseaseCounts = {};
  const ageGroups = { '0-17': 0, '18-35': 0, '36-55': 0, '56+': 0 };

  consultations.forEach(c => {
    c.selectedSymptoms.forEach(s => {
      symptomCounts[s] = (symptomCounts[s] || 0) + 1;
    });
    if (c.topDisease) {
      diseaseCounts[c.topDisease] = (diseaseCounts[c.topDisease] || 0) + 1;
    }
    const age = c.age || 25;
    if (age <= 17) ageGroups['0-17']++;
    else if (age <= 35) ageGroups['18-35']++;
    else if (age <= 55) ageGroups['36-55']++;
    else ageGroups['56+']++;
  });

  // Descriptive stats on number of symptoms per consultation
  const symptomPerConsult = consultations.map(c => c.selectedSymptoms.length);
  const mean = symptomPerConsult.reduce((a, b) => a + b, 0) / symptomPerConsult.length;
  const sortedSPC = [...symptomPerConsult].sort((a, b) => a - b);
  const median = sortedSPC[Math.floor(sortedSPC.length / 2)];
  const variance = symptomPerConsult.reduce((s, v) => s + (v - mean) ** 2, 0) / symptomPerConsult.length;
  const stdDev = Math.sqrt(variance);

  return {
    totalConsultations: consultations.length,
    avgSymptoms: parseFloat(mean.toFixed(1)),
    medianSymptoms: median,
    stdDevSymptoms: parseFloat(stdDev.toFixed(2)),
    topSymptoms: Object.entries(symptomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count, pct: parseFloat(((count / consultations.length) * 100).toFixed(0)) })),
    diseaseFrequency: Object.entries(diseaseCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: parseFloat(((count / consultations.length) * 100).toFixed(0)) })),
    ageDistribution: Object.entries(ageGroups).map(([group, count]) => ({ group, count }))
  };
}

// ── API Routes ────────────────────────────────────────────────

app.get('/api/symptoms', (_req, res) => {
  res.json(ALL_SYMPTOMS);
});

app.get('/api/diseases', (_req, res) => {
  const summary = Object.entries(DISEASES).map(([name, d]) => ({
    name, prevalence: d.prevalence, severity: d.severity,
    symptomCount: Object.keys(d.symptoms).length
  }));
  res.json(summary);
});

app.post('/api/diagnose', (req, res) => {
  const { symptoms, age, gender, patientName } = req.body;
  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    return res.status(400).json({ error: 'Sélectionnez au moins un symptôme.' });
  }

  const results = bayesianAnalysis(symptoms, age || 25, gender || 'non-specifié');

  // Save consultation
  const data = db.read();
  const consultation = {
    id: uuidv4(),
    patientName: patientName || 'Anonyme',
    age: parseInt(age) || 25,
    gender: gender || 'non-specifié',
    selectedSymptoms: symptoms,
    topDisease: results[0]?.disease || null,
    topProbability: results[0]?.probability || 0,
    resultCount: results.length,
    timestamp: new Date().toISOString()
  };
  data.consultations.push(consultation);
  db.write(data);

  res.json({
    consultation,
    results,
    methodology: {
      type: 'Inférence Bayésienne',
      formula: 'P(Maladie|Symptômes) ∝ P(Symptômes|Maladie) × P(Maladie)',
      symptomsUsed: symptoms.length,
      diseasesEvaluated: Object.keys(DISEASES).length
    }
  });
});

app.get('/api/history', (_req, res) => {
  res.json(db.read().consultations);
});

app.get('/api/stats', (_req, res) => {
  const data = db.read();
  const stats = computeStats(data.consultations);
  res.json(stats || { totalConsultations: 0 });
});

app.delete('/api/history/:id', (req, res) => {
  const data = db.read();
  data.consultations = data.consultations.filter(c => c.id !== req.params.id);
  db.write(data);
  res.json({ success: true });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve Frontend in Production ──────────────────────────────
const DIST = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(DIST, 'index.html'));
  });
}

if (process.env.NODE_ENV !== 'production' || process.env.RAILWAY_ENVIRONMENT) {
  app.listen(PORT, () => {
    console.log(`\n  🩺 HealthBridge Analytics API`);
    console.log(`  ├─ Port:   ${PORT}`);
    console.log(`  ├─ Maladies: ${Object.keys(DISEASES).length}`);
    console.log(`  ├─ Symptômes: ${ALL_SYMPTOMS.length}`);
    console.log(`  └─ Status: Opérationnel\n`);
  });
}

module.exports = app;
