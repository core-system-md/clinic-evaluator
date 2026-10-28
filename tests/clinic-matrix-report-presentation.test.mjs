import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync('assets/js/app.js', 'utf8');
const page = fs.readFileSync('clinic-matrix-staff-competency.html', 'utf8');

test('Clinic Matrix report shows measured scores without presenting uncalibrated Q1–Q4 bands as validated stages', () => {
  assert.match(app, /const isClinicMatrixReport = this\.currentAssessmentKey === 'clinic-matrix-staff-competency'/);
  assert.match(app, /const q = !isClinicMatrixReport &&/);
  assert.match(app, /نتيجة وصفية أولية/);
  assert.match(app, /لم تُعاير بعد حدود التصنيف ومرتكزات الأداء لهذا التقييم/);
  assert.match(app, /const qClass = isClinicMatrixReport \? '' : String\(axis\.bandCode/);
  assert.match(app, /bandCode: isClinicMatrixReport \? null : axis\.bandCode/);
  assert.match(page, /app\.js\?v=20261028-clinic-matrix-report-calibration-1/);
});

test('Other assessment families retain the existing Q1–Q4 label and color path', () => {
  assert.match(app, /this\.texts\?\.quartiles\?\.\[q\]/);
  assert.match(app, /const qClass = isClinicMatrixReport \? '' : String\(axis\.bandCode/);
});
