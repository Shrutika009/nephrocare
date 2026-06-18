import { stageOrder } from '../constants'
import type { PredictionResult } from '../types'
import { formatPercent, formatValue, modelSourceSummary, reportData, stageGfrBand, stageNumber, wrapText } from './format'

const pageWidth = 612
const pageHeight = 792

function pdfEscape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function pdfText(x: number, y: number, text: string, size = 11, color = '0 0 0', font = '/F1') {
  return `BT ${color} rg ${font} ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET`
}

function pdfWrappedText(x: number, y: number, text: string, size = 11, color = '0 0 0', maxLength = 76) {
  const lines = wrapText(text, maxLength)
  return lines.map((line, index) => pdfText(x, y - index * Math.round(size * 1.45), line, size, color)).join('\n')
}

function pdfRect(x: number, y: number, w: number, h: number, fill: string, stroke?: string) {
  if (stroke) return `q ${fill} rg ${stroke} RG 1 w ${x} ${y} ${w} ${h} re B Q`
  return `q ${fill} rg ${x} ${y} ${w} ${h} re f Q`
}

function createPdfBlob(pages: string[]) {
  const objects = Array<string>(3 + pages.length * 2)
  const pageObjectNumbers = pages.map((_, index) => 4 + index * 2)
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map(number => `${number} 0 R`).join(' ')}] /Count ${pages.length} >>`
  objects[2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'

  pages.forEach((content, index) => {
    const pageObjectIndex = 3 + index * 2
    const contentObjectIndex = pageObjectIndex + 1
    const contentObjectNumber = contentObjectIndex + 1
    objects[pageObjectIndex] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`
    objects[contentObjectIndex] = `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`
  })

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

function buildPredictionPdf(result: PredictionResult): Blob {
  const now = new Date()
  const report = reportData(result)
  const page: string[] = []
  const navy = '0.05 0.23 0.40'
  const maroon = '0.74 0.04 0.24'
  const muted = '0.31 0.36 0.42'
  const pale = '0.98 0.99 1.00'
  const softBlue = '0.86 0.93 0.98'
  const softRose = '0.98 0.87 0.91'
  const vitals = [
    { label: 'Urine albumin', value: formatValue(result.input.urine_albumin), unit: 'mg/g' },
    { label: 'Sex', value: report.sexShort, unit: result.input.sex },
    { label: 'Age', value: formatValue(result.input.age), unit: 'years' },
    { label: 'eGFR', value: formatValue(result.kidney_function.egfr_2021), unit: 'mL/min/1.73 m2' },
  ]

  page.push(
    pdfRect(0, 0, pageWidth, pageHeight, pale),
    pdfRect(0, 742, pageWidth, 50, navy),
    pdfText(42, 762, 'NephroCare CKD Prediction System', 15, '1 1 1'),
    pdfText(430, 762, `Generated ${now.toLocaleDateString()}`, 9, '0.85 0.95 0.98'),
    pdfText(225, 686, 'YOUR RESULTS', 28, maroon),
  )

  vitals.forEach((item, index) => {
    const x = 62 + index * 126
    page.push(
      pdfText(x, 636, item.value, 18, index === 0 || index === 3 ? maroon : navy),
      pdfText(x + 36, 638, item.unit, 8, navy),
      pdfText(x, 620, item.label.toUpperCase(), 8, navy)
    )
  })

  page.push(
    pdfRect(60, 574, 190, 1, navy),
    pdfRect(250, 568, 112, 13, navy),
    pdfText(280, 572, 'ASSESSMENT', 8, '1 1 1'),
    pdfRect(362, 574, 190, 1, navy),
    pdfText(270, 508, `STAGE ${report.stageNumber}`, 32, maroon),
    pdfText(198, 486, report.stageSeverity.toUpperCase(), 11, maroon),
    pdfText(83, 440, 'CKD STAGES', 10, navy),
    pdfText(220, 440, 'GLOMERULAR FILTRATION RATE', 10, navy)
  )

  stageOrder.forEach((stage, index) => {
    const y = 410 - index * 28
    const active = stage === report.stageKey
    page.push(
      pdfRect(90, y - 8, 96, 20, active ? maroon : softRose),
      pdfText(124, y - 1, stageNumber(stage), 14, active ? '1 1 1' : navy),
      pdfRect(226, y - 8, 96, 20, active ? maroon : softBlue),
      pdfText(256, y - 1, stageGfrBand(stage), 10, active ? '1 1 1' : navy)
    )
  })

  page.push(
    pdfWrappedText(356, 448, 'Your estimated CKD risk is based on the health details you entered.', 10, navy, 30),
    pdfRect(382, 390, 176, 22, navy),
    pdfText(430, 398, 'ESTIMATED CKD RISK', 9, '1 1 1'),
    pdfText(406, 352, formatPercent(report.riskPercent), 30, maroon),
    pdfWrappedText(356, 304, 'This estimate is for screening support and should be discussed with a clinician.', 11, navy, 35),
    pdfText(74, 226, 'LAB MARKER FLAGS', 12, navy),
    pdfText(324, 226, 'RECOMMENDATIONS', 12, navy)
  )

  if (result.warnings.length) {
    result.warnings.slice(0, 5).forEach((item, index) => {
      page.push(pdfWrappedText(74, 206 - index * 28, `${item.label}: ${item.value} ${item.unit} is ${item.status}. Range ${item.range}.`, 9, '0 0 0', 36))
    })
  } else {
    page.push(pdfWrappedText(74, 206, 'No submitted markers are outside the screening ranges.', 9, '0 0 0', 36))
  }

  result.recommendations.slice(0, 5).forEach((item, index) => {
    page.push(pdfWrappedText(324, 206 - index * 28, item, 9, '0 0 0', 38))
  })

  page.push(
    pdfRect(42, 50, 528, 1, '0.77 0.82 0.86'),
    pdfWrappedText(42, 32, 'Care note: This report supports screening conversations and does not replace clinician diagnosis or treatment advice.', 8, muted, 92)
  )

  return createPdfBlob([page.join('\n')])
}

export function downloadPredictionPdf(result: PredictionResult) {
  const blob = buildPredictionPdf(result)
  const now = new Date()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `nephrocare-ckd-risk-${now.toISOString().slice(0, 10)}.pdf`
  link.click()
  URL.revokeObjectURL(link.href)
}
