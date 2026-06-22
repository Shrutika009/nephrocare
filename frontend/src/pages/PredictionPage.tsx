import type { ChangeEvent, FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { labInputLabels, stageOrder } from '../constants'
import type { Page, PredictionForm, PredictionResult } from '../types'
import { formatPercent, formatValue, modelSourceSummary, reportData, stageGfrBand, stageNumber } from '../utils/format'
import { downloadPredictionPdf } from '../utils/predictionPdf'

export type PredictionStep = 'calculator' | 'result'
type ActiveReport = ReturnType<typeof reportData>

type PredictionPageProps = {
  predictionStep: PredictionStep
  setPredictionStep: (step: PredictionStep) => void
  form: PredictionForm
  result: PredictionResult | null
  activeReport: ActiveReport | null
  uploadStatus: string
  extractedFields: string[]
  loading: boolean
  error: string
  showPage: (page: Page) => void
  submitPrediction: (event: FormEvent) => void
  handleReportUpload: (event: ChangeEvent<HTMLInputElement>) => void
  updateNumber: (key: keyof PredictionForm, value: string) => void
  updateChoice: (key: keyof PredictionForm, value: string) => void
  resetPrediction: () => void
}

const labInputs: [keyof PredictionForm, string, string][] = [
  ['age', 'Age', 'Yrs'],
  ['sex', 'Sex', ''],
  ['urine_albumin', 'Urine albumin : creatinine ratio', 'mg/g'],
  ['blood_pressure', 'Blood pressure', 'mmHg'],
  ['blood_glucose_random', 'Blood glucose random', 'mg/dL'],
  ['blood_urea', 'Blood urea', 'mg/dL'],
  ['serum_creatinine', 'Serum creatinine', 'mg/dL'],
  ['sodium', 'Sodium', 'mmol/L'],
  ['potassium', 'Potassium', 'mmol/L'],
  ['hemoglobin', 'Hemoglobin', 'g/dL'],
  ['hypertension', 'Hypertension', ''],
  ['diabetes_mellitus', 'Diabetes mellitus', ''],
]

export function PredictionPage(props: PredictionPageProps) {
  const { predictionStep, result, activeReport } = props
  const className = predictionStep === 'result' && result ? 'prediction-page result-page kfre-page' : 'prediction-page calculator-page'

  return <main className={className} id="top">
    {predictionStep === 'result' && result && activeReport
      ? <PredictionResultView {...props} result={result} activeReport={activeReport} />
      : <PredictionCalculator {...props} />}
  </main>
}

function PredictionResultView({ result, activeReport, setPredictionStep, showPage }: PredictionPageProps & { result: PredictionResult; activeReport: ActiveReport }) {
  return <>
    <section className="result-hero">
      <button className="back-button" onClick={() => setPredictionStep('calculator')}><Icon name="arrow" size={16} /> Back</button>
      <div className="result-actions">
        <button type="button" onClick={() => downloadPredictionPdf(result)}><Icon name="report" size={17} /> Download PDF</button>
        <button type="button" onClick={() => showPage('home')}>Back home</button>
      </div>
    </section>
    <section className="kfre-report">
      <h1>Your results</h1>
      <div className="kfre-vitals" aria-label="Submitted prediction values">
        <div><Icon name="lab" size={25} /><strong>{formatValue(result.input.urine_albumin)}</strong><small>mg/g</small><span>Urine albumin</span></div>
        <div><Icon name="user" size={25} /><strong>{activeReport.sexShort}</strong><span>Sex</span></div>
        <div><Icon name="activity" size={25} /><strong>{formatValue(result.input.age)}</strong><span>Age</span></div>
        <div><Icon name="heart" size={25} /><strong>{formatValue(result.kidney_function.egfr_2021)}</strong><small>mL/min/1.73 m2</small><span>eGFR</span></div>
      </div>
      <div className="kfre-divider"><span>Assessment</span></div>
      <div className="kfre-stage-heading">
        <h2>Stage {activeReport.stageNumber}</h2>
        <p>{activeReport.stageSeverity}</p>
      </div>
      <div className="kfre-assessment-grid">
        <div className="kfre-kidney-scale">
          <h3>CKD stages</h3>
          <div className="kidney-scale-body">
            <div className="kidney-list">
              {stageOrder.map(stage => <div key={stage} className={stage === activeReport.stageKey ? 'active' : ''}><span>{stageNumber(stage)}</span><small>{stage === 'G1' ? 'No or slight' : stage === 'G2' ? 'Mild' : stage === 'G3a' || stage === 'G3b' ? 'Moderate' : stage === 'G4' ? 'Severe' : 'Failure range'}</small></div>)}
            </div>
            <div className="gfr-list">
              <h3>Glomerular filtration rate</h3>
              {stageOrder.map(stage => <div key={stage} className={stage === activeReport.stageKey ? 'active' : ''}><span>{stageGfrBand(stage)}</span></div>)}
            </div>
          </div>
        </div>
        <div className="kfre-risk-summary">
          <p>{modelSourceSummary(result)}</p>
          <div className="risk-years">
            <div><span>Estimated CKD risk</span><strong>{formatPercent(activeReport.riskPercent)}</strong></div>
          </div>
          <h3>What this means</h3>
          <ul>
            <li>This is a screening estimate based on the values you entered.</li>
            <li>Please discuss this result with your doctor for diagnosis and next steps.</li>
          </ul>
        </div>
      </div>
      <div className="kfre-detail-grid">
        <div><h3>Lab marker flags</h3>{result.warnings.length ? result.warnings.map(item => <p key={item.key}><b>{item.label}</b> is {item.status} at {item.value} {item.unit}. Range: {item.range}</p>) : <p>No submitted markers are outside the screening ranges.</p>}</div>
        <div><h3>Recommendations</h3>{result.recommendations.map(item => <p key={item}>{item}</p>)}</div>
      </div>
    </section>
  </>
}

function PredictionCalculator({
  form,
  uploadStatus,
  extractedFields,
  loading,
  error,
  submitPrediction,
  handleReportUpload,
  updateNumber,
  updateChoice,
  resetPrediction,
}: PredictionPageProps) {
  return <>
    <section className="calculator-hero">
      <span className="eyebrow">CKD</span>
      <h1>Risk calculation</h1>
      <p>If you do not have the information required below talk to your doctor.</p>
    </section>
    <section className="calculator-shell">
      <div className="calculator-panel">
        <form className="calculator-form" onSubmit={submitPrediction}>
          <div className="calculator-grid">
            {labInputs.map(([key, label, unit]) => key === 'sex' || key === 'hypertension' || key === 'diabetes_mellitus'
              ? <label key={key}><span>{label}</span><select required value={form[key]} onChange={event => updateChoice(key, event.target.value)}><option value="" disabled>Select</option>{key === 'sex' ? <><option value="female">Female</option><option value="male">Male</option></> : <><option value="no">No</option><option value="yes">Yes</option></>}</select></label>
              : <label key={key}><span>{label}</span><div><input type="number" step="any" value={form[key]} onChange={event => updateNumber(key, event.target.value)} required /><small>{unit}</small></div></label>)}
          </div>
          <div className="calculator-actions">
            <button type="button" onClick={resetPrediction}>Reset</button>
            <button className="prediction-submit" disabled={loading}>{loading ? 'Calculating...' : 'Calculate risk'}</button>
          </div>
          {error && <p className="prediction-error">{error}</p>}
        </form>
        <section className="calculator-note">
          <h2>About this calculator</h2>
          <p>NephroCare estimates CKD screening risk, eGFR category, lab marker flags, and stage information from the current clinical values. The result supports screening conversations and does not replace clinician diagnosis.</p>
        </section>
      </div>
    </section>
  </>
}
