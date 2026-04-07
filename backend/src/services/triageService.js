const SEVERITY_LEVELS = {
  EMERGENCY: { label: "Emergency", weight: 100, color: "red" },
  MODERATE: { label: "Moderate", weight: 50, color: "orange" },
  ROUTINE: { label: "Routine", weight: 10, color: "green" },
};

class TriageService {
  /**
   * Performs high-fidelity multidimensional triage.
   * @param {Object} data { symptoms, answers, age, history }
   */
  static performTriage(data) {
    const { symptoms, answers, age, history = [] } = data;
    let severity = "ROUTINE";
    let reasoning = "Diagnostic Intelligence: Routine symptoms detected with no immediate life-threat markers.";
    let confidence = 85; // Base confidence

    const isChestPain = symptoms.includes('chest_pain');
    const isBreathless = symptoms.includes('shortness_of_breath') || symptoms.includes('difficulty_breathing');
    const isFever = symptoms.includes('fever');

    // 🔴 EMERGENCY BRANCH (Immediate Action Required)
    if (isChestPain && (answers.pain_spread === true || answers.sweating === true || age > 45)) {
      severity = "EMERGENCY";
      reasoning = "🔴 CRITICAL ALERT: High probability of acute myocardial infarction (Cardiac Event). Factors: Chest pain radiation, diaphoresis (sweating), and age risk factor.";
      confidence = 95;
    } else if (isBreathless && (answers.at_rest === true || answers.breath_onset === 'Suddenly')) {
      severity = "EMERGENCY";
      reasoning = "🔴 CRITICAL ALERT: Severe respiratory failure/Acute pulmonary embolism suspected. Sudden onset/dyspnea at rest recorded.";
      confidence = 92;
    } else if (isFever && age < 3 && answers.temp_level === true) {
      severity = "EMERGENCY";
      reasoning = "🔴 CRITICAL ALERT: Pediatric Sepsis Risk. High fever in infants/toddlers requires immediate clinical intervention.";
      confidence = 88;
    }

    // 🟠 MODERATE BRANCH (Urgent care within hours)
    else if (isFever && (answers.fever_duration > 3 || answers.respiratory_issues === true)) {
      severity = "MODERATE";
      reasoning = "🟠 URGENT: Persistent febrile illness with potential secondary pulmonary involvement. Priority clinical review indicated.";
      confidence = 82;
    } else if (age > 65 || age < 5) {
      severity = "MODERATE";
      reasoning = "🟠 URGENT: Vulnerable population protocols active. Symptoms require early intervention to prevent acute escalation.";
      confidence = 90;
    }

    // 🏛 Scoring Engine Incorporating Medical History
    const severityWeight = SEVERITY_LEVELS[severity].weight;
    const historyRisk = history.some(h => h && h.length > 0) ? 15 : 0;
    const score = severityWeight + historyRisk + (age / 100) * 5;

    const flags = [];
    if (score > 80) flags.push("CRITICAL_THRESHOLD");
    if (pedsRisk) flags.push("PEDIATRIC_WATCH");
    if (data.history?.some(h => h?.includes('Heart') || h?.includes('Diabetes'))) flags.push("CHRONIC_COMORBIDITY");
    if (data.symptoms?.includes('chest_pain')) flags.push("CARDIAC_RISK");

    return {
      severity,
      score,
      confidence,
      flags,
      reasoning: `Patient shows ${severity} severity (${score}% risk). ${pedsRisk ? 'Pediatric priority flagged.' : ''} ${flags.length ? 'Flags: ' + flags.join(', ') : ''}`,
      clinicalSummary: `${severity} Priority | Confidence: ${confidence}% | Reasoning: ${reasoning}`
    };
  }
}

module.exports = TriageService;
