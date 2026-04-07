const QUESTIONS = {
    baseline: [
        { id: 'age', label: 'Welcome to SAHAY. Let\'s start with your clinical profile. What is your current Age?', type: 'number' },
        { id: 'gender', label: 'What is your Gender?', type: 'select', options: ['Male', 'Female', 'Other'] },
        { id: 'weight', label: 'What is your approximate Weight (in kg)?', type: 'number' },
        { id: 'height', label: 'What is your approximate Height (in cm)?', type: 'number' },
        { id: 'bloodGroup', label: 'What is your Blood Group?', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] },
        { id: 'chronicConditions', label: 'Do you have any existing medical conditions like Diabetes, Asthma, or Hypertension?', type: 'text' }
    ],
    intent: { id: 'mainSymptom', label: 'Understood. Now, tell me about your primary medical concern today. What symptoms are you experiencing?', type: 'text' },
    branches: {
        chest_pain: [
            { id: 'pain_type', label: 'Is the pain sharp, or more like a heavy pressure/squeezing?', type: 'select', options: ['Sharp', 'Heavy Pressure', 'Aching'] },
            { id: 'pain_spread', label: 'Is the pain spreading to your left arm or jaw?', type: 'boolean' },
            { id: 'sweating', label: 'Are you experiencing excessive cold sweating or nausea?', type: 'boolean' },
            { id: 'pain_duration', label: 'How long have you had this pain (in minutes)?', type: 'number' }
        ],
        fever: [
            { id: 'fever_duration', label: 'How many days have you had the fever?', type: 'number' },
            { id: 'temp_level', label: 'Is the temperature above 102°F (High Fever)?', type: 'boolean' },
            { id: 'respiratory_issues', label: 'Are you having any cough or trouble breathing?', type: 'boolean' }
        ],
        shortness_of_breath: [
            { id: 'breath_onset', label: 'Did the breathlessness start suddenly, or gradually?', type: 'select', options: ['Suddenly', 'Gradually'] },
            { id: 'at_rest', label: 'Do you feel breathlessness even while sitting or lying down (at rest)?', type: 'boolean' }
        ],
        difficulty_breathing: [
            { id: 'breath_onset', label: 'Did the breathlessness start suddenly, or gradually?', type: 'select', options: ['Suddenly', 'Gradually'] },
            { id: 'at_rest', label: 'Do you feel breathlessness even while sitting or lying down (at rest)?', type: 'boolean' }
        ]
    }
};

class QuestionnaireService {
    static getNextQuestion(previousAnswers, currentSymptom) {
        for (const q of QUESTIONS.baseline) {
            if (previousAnswers[q.id] === undefined) return q;
        }
        if (!currentSymptom) return QUESTIONS.intent;
        const standardizedSymptom = currentSymptom.toLowerCase().replace(/ /g, '_');
        const branch = QUESTIONS.branches[standardizedSymptom];
        if (branch) {
            for (const q of branch) {
                if (previousAnswers[q.id] === undefined) return q;
            }
        }
        return null;
    }

    static generateSummary(answers, symptom, triageResult) {
        const bmi = (answers.weight / ((answers.height / 100) ** 2)).toFixed(1);
        return `
----- CLINICAL TRIAGE SUMMARY -----
PATIENT BIOMETRICS
- ${answers.age}y ${answers.gender} | BMI: ${bmi} (${answers.weight}kg / ${answers.height}cm)
- Blood Type: ${answers.bloodGroup || 'NA'}
- Medical History: ${answers.chronicConditions || 'None reported'}

PRESENTATION
- Primary Symptom: ${symptom.toUpperCase()}
- Clinical Indicators:
  ${Object.keys(answers).filter(k => !QUESTIONS.baseline.map(q => q.id).includes(k) && k !== 'mainSymptom').map(k => `- ${k.replace(/_/g, ' ')}: ${answers[k]}`).join('\n  ')}

TRIAGE CONCLUSION
- Priority: ${triageResult.severity} (Confidence: ${triageResult.confidence}%)
- Clinical Reasoning: ${triageResult.reasoning}
- Protocol: ${triageResult.severity === 'EMERGENCY' ? '🔴 RED ALERT - STABILIZE IMMEDIATELY' : '🟡 URGENT CARE'}
----------------------------------
    `.trim();
    }
}

module.exports = { QuestionnaireService, QUESTIONS };
