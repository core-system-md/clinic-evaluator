/* CORE System — P5 Assessment Lifecycle correction */
(function () {
  'use strict';

  const safe = (manager, value) => manager.escapeHtml ? manager.escapeHtml(String(value ?? '')) : String(value ?? '');

  AssessmentManager.prototype.editAssessment = async function (id) {
    try {
      const allAssessments = await this.supabase.select('assessment_types') || [];
      const ast = allAssessments.find(a => a.id === id);
      if (!ast) return this.showToast('التقييم المطلوب غير موجود.', true);

      const status = String(ast.status || '').toLowerCase();
      if (status === 'archived') return this.showToast('الإصدار المؤرشف غير قابل للتعديل.', true);

      this.editingAssessmentSlug = ast.slug || null;
      this.editingAssessmentStatus = status;

      document.getElementById('ast-id').value = ast.id;
      document.getElementById('ast-title-ar').value = ast.title_ar || '';
      document.getElementById('ast-title-en').value = ast.title_en || '';
      document.getElementById('ast-description').value = ast.description || '';
      document.getElementById('ast-status').value = status === 'published' ? 'Published' : 'Draft';
      document.getElementById('ast-status').disabled = status === 'published';
      document.getElementById('ast-has-traps').checked = !!ast.has_traps;
      document.getElementById('ast-has-simulator').checked = !!ast.has_ev_simulator;
      document.getElementById('ast-has-traps').disabled = status === 'published';
      document.getElementById('ast-has-simulator').disabled = status === 'published';

      const allAxes = await this.supabase.select('axes') || [];
      const allQuestions = await this.supabase.select('questions') || [];
      const currentAxes = allAxes.filter(x => x.assessment_type_id === ast.id);
      const currentQuestions = allQuestions.filter(q => q.assessment_type_id === ast.id);
      const questionIds = currentQuestions.map(q => q.id);
      if (questionIds.length) {
        const endpoint = 'options?select=*&question_id=in.(' + questionIds.join(',') + ')';
        this.currentOptions = await this.supabase.request(endpoint, { method: 'GET' }) || [];
      } else {
        this.currentOptions = [];
      }

      this.renderModalTabs(currentAxes, currentQuestions, ast.id, status);
      const title = document.getElementById('assessment-modal-title');
      if (title) title.innerText = 'تعديل تقييم: ' + (ast.title_ar || '');
      document.getElementById('assessment-modal').classList.remove('hidden');
    } catch (err) {
      this.showToast('خطأ أثناء تحميل تفاصيل التقييم: ' + err.message, true);
    }
  };

  AssessmentManager.prototype.saveAssessment = async function () {
    const id = document.getElementById('ast-id').value || null;
    const status = this.editingAssessmentStatus || String(document.getElementById('ast-status').value || 'draft').toLowerCase();
    const titleAr = document.getElementById('ast-title-ar').value;
    const titleEn = document.getElementById('ast-title-en').value;
    const description = document.getElementById('ast-description').value;
    const generatedSlug = this.editingAssessmentSlug || (titleEn ? titleEn.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : 'assessment-' + Date.now());

    try {
      const result = await this.supabase.request('rpc/save_assessment_secure', {
        method: 'POST',
        body: JSON.stringify({
          p_id: id,
          p_title_ar: titleAr,
          p_title_en: titleEn,
          p_slug: generatedSlug,
          p_description: description,
          p_status: status,
          p_has_traps: document.getElementById('ast-has-traps').checked,
          p_has_ev_simulator: document.getElementById('ast-has-simulator').checked
        })
      });

      const savedId = id || this.rpcScalar(result);
      this.showToast(status === 'published' ? 'تم حفظ التعديلات التحريرية على التقييم المنشور.' : 'تم حفظ التقييم كنسخة عمل.');
      document.getElementById('assessment-modal').classList.add('hidden');
      await this.renderAssessmentsTable();
      this.populateFilterDropdown();
      if (!id && savedId) await this.editAssessment(savedId);
    } catch (err) {
      this.showToast('فشل حفظ التعديلات: ' + err.message, true);
    }
  };

  AssessmentManager.prototype.renderModalTabs = function (axes, questions, assessmentId, assessmentStatus) {
    const contentContainer = document.getElementById('modal-tab-content');
    if (!contentContainer) return;
    const isPublished = String(assessmentStatus || '').toLowerCase() === 'published';
    let html = '<div style="display:flex; flex-direction:column; gap:12px; text-align:right; direction:rtl;">';

    html += '<div style="text-align:left; margin-bottom:5px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">';
    if (!isPublished) html += '<button type="button" onclick="window.assessmentManager.addAxisInline(\'' + assessmentId + '\')" class="btn-primary" style="padding:6px 12px; font-size:0.8rem;">+ إضافة محور جديد</button>';
    if (isPublished) html += '<button type="button" onclick="window.assessmentManager.duplicateAssessment(\'' + assessmentId + '\')" class="btn-primary" style="padding:6px 12px; font-size:0.8rem; background:#6366f1;">📋 إنشاء نسخة عمل للتعديلات الهيكلية</button><span style="font-size:0.75rem;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:5px 8px;">يمكن تعديل النصوص فقط هنا؛ تغييرات الأسئلة/الخيارات/الدرجات تحتاج نسخة عمل.</span>';
    html += '</div>';

    if (!axes.length) {
      html += '<p style="color:#6b7280;text-align:center;padding:20px;background:#f8fafc;border-radius:8px;border:1px dashed #cbd5e1;font-size:0.85rem;">لا توجد محاور مرتبطة حالياً.</p>';
    } else {
      axes.sort((a,b) => (a.display_order || 0) - (b.display_order || 0));
      axes.forEach(axis => {
        const axisQuestions = questions.filter(q => q.axis_id === axis.id).sort((a,b) => (a.display_order || 0) - (b.display_order || 0));
        html += '<div style="background:#f8fafc;padding:12px;border-radius:8px;border-right:4px solid #0f766e;border-top:1px solid #e5e7eb;border-left:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;font-weight:700;color:#134e4a;font-size:0.85rem;margin-bottom:8px;flex-wrap:wrap;gap:5px;">';
        if (isPublished) {
          html += '<input type="text" value="' + safe(this, axis.title_ar || axis.title || '') + '" onblur="window.assessmentManager.updatePublishedAxisContent(\'' + axis.id + '\', this.value)" style="flex:1;min-width:180px;padding:5px 7px;border:1px solid #cbd5e1;border-radius:5px;font-family:Cairo;font-size:0.75rem;font-weight:700;color:#134e4a;">';
        } else {
          html += '<span>📌 محور: ' + safe(this, axis.title_ar || axis.title || 'بدون اسم') + ' (' + safe(this, axis.code || '') + ')</span>';
        }
        html += '<span style="font-size:0.75rem;color:#6b7280;margin-right:auto;margin-left:10px;">الوزن: %' + (axis.weight || 0) + '</span>';
        if (!isPublished) html += '<button type="button" onclick="window.assessmentManager.addQuestionInline(\'' + assessmentId + '\',\'' + axis.id + '\')" style="padding:2px 6px;font-size:0.7rem;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;font-family:Cairo;font-weight:600;">+ إضافة سؤال</button>';
        html += '</div>';
        html += '<div style="padding-right:8px;display:flex;flex-direction:column;gap:4px;">';

        if (!axisQuestions.length) {
          html += '<p style="font-size:0.75rem;color:#94a3b8;margin:0;padding:4px 0;">⚠️ لا توجد أسئلة تحت هذا المحور حالياً.</p>';
        } else {
          axisQuestions.forEach(q => {
            const qOptions = (this.currentOptions || []).filter(o => o.question_id === q.id).sort((a,b) => (a.display_order || 0) - (b.display_order || 0));
            html += '<div style="font-size:0.75rem;color:#334155;background:white;padding:6px 8px;border-radius:4px;border:1px solid #f1f5f9;margin-bottom:4px;">';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px;">';
            if (isPublished) {
              html += '<input type="text" value="' + safe(this, q.question_text_ar || q.question_text || '') + '" onblur="window.assessmentManager.updatePublishedQuestionText(\'' + q.id + '\', this.value)" style="flex:1;min-width:180px;padding:5px 7px;border:1px solid #cbd5e1;border-radius:5px;font-family:Cairo;font-size:0.75rem;font-weight:600;color:#334155;">';
            } else {
              html += '<input type="text" value="' + safe(this, q.question_text_ar || q.question_text || '') + '" onblur="window.assessmentManager.updateDraftQuestionText(\'' + q.id + '\', this.value)" style="flex:1;min-width:180px;padding:5px 7px;border:1px solid #e5e7eb;border-radius:5px;font-family:Cairo;font-size:0.75rem;font-weight:600;color:#334155;">';
            }
            html += '<span style="color:#0f766e;font-weight:600;font-size:0.7rem;">(' + safe(this, q.code || '') + ')</span></div>';
            html += '<div style="padding-right:12px;border-right:2px solid #e5e7eb;margin-right:4px;"><div style="font-size:0.7rem;color:#6b7280;margin-bottom:4px;font-weight:600;">خيارات الإجابة:</div>';

            if (!qOptions.length) {
              html += '<p style="font-size:0.7rem;color:#94a3b8;margin:0;">لا توجد خيارات لهذا السؤال.</p>';
            } else {
              qOptions.forEach((opt, idx) => {
                html += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;flex-wrap:wrap;">';
                html += '<span style="font-size:0.7rem;color:#6b7280;min-width:20px;">' + (idx + 1) + '.</span>';
                html += '<input type="text" value="' + safe(this, opt.label_ar || opt.label || '') + '" onblur="window.assessmentManager.updateOption(\'' + opt.id + '\',\'label_ar\', this.value)" placeholder="نص الخيار بالعربية" style="flex:1;min-width:120px;padding:4px 6px;border:1px solid #e5e7eb;border-radius:4px;font-family:Cairo;font-size:0.7rem;">';
                html += '<input type="number" value="' + (opt.option_value !== null && opt.option_value !== undefined ? opt.option_value : '') + '" onblur="window.assessmentManager.updateOption(\'' + opt.id + '\',\'option_value\', this.value)" placeholder="الدرجة" title="' + (isPublished ? 'تغيير الدرجة يحتاج إنشاء نسخة عمل جديدة' : 'قيمة الدرجة') + '" ' + (isPublished ? 'disabled' : '') + ' style="width:60px;padding:4px 6px;border:1px solid #e5e7eb;border-radius:4px;font-family:Cairo;font-size:0.7rem;text-align:center;opacity:' + (isPublished ? '0.6' : '1') + ';">';
                if (!isPublished) html += '<button type="button" onclick="window.assessmentManager.deleteOption(\'' + opt.id + '\',\'' + assessmentId + '\')" style="padding:2px 6px;font-size:0.65rem;background:#fef2f2;color:#dc2626;border:1px solid #fee2e2;border-radius:4px;cursor:pointer;font-family:Cairo;">🗑️</button>';
                html += '</div>';
              });
            }
            if (!isPublished) {
              const canAddMore = qOptions.length < 5;
              html += '<button type="button" onclick="window.assessmentManager.addOption(\'' + q.id + '\',\'' + assessmentId + '\')" style="margin-top:4px;padding:3px 8px;font-size:0.65rem;background:#f0fdf4;color:#0f766e;border:1px solid #86efac;border-radius:4px;cursor:pointer;font-family:Cairo;font-weight:600;' + (canAddMore ? '' : 'opacity:0.4;cursor:not-allowed;') + '" ' + (canAddMore ? '' : 'disabled') + '>+ إضافة خيار (' + qOptions.length + '/5)</button>';
            }
            html += '</div></div>';
          });
        }
        html += '</div></div>';
      });
    }
    html += '</div>';
    contentContainer.innerHTML = html;
  };

  AssessmentManager.prototype.updatePublishedAxisContent = async function (axisId, titleAr) {
    const value = String(titleAr || '').trim();
    if (!value) return this.showToast('لا يمكن أن يكون اسم المحور فارغاً.', true);
    try {
      await this.supabase.request('rpc/update_published_axis_content_secure', {
        method: 'POST',
        body: JSON.stringify({ p_axis_id: axisId, p_title: value, p_title_ar: value, p_description: null })
      });
      this.showToast('تم تحديث نص المحور.');
    } catch (err) { this.showToast('فشل تحديث نص المحور: ' + err.message, true); }
  };

  AssessmentManager.prototype.updatePublishedQuestionText = async function (questionId, value) {
    const textValue = String(value || '').trim();
    if (!textValue) return this.showToast('لا يمكن أن يكون نص السؤال فارغاً.', true);
    try {
      await this.supabase.request('rpc/update_published_question_text_secure', {
        method: 'POST',
        body: JSON.stringify({ p_question_id: questionId, p_question_text: textValue, p_question_text_ar: textValue })
      });
      this.showToast('تم تحديث نص السؤال.');
    } catch (err) { this.showToast('فشل تحديث نص السؤال: ' + err.message, true); }
  };

  AssessmentManager.prototype.updateDraftQuestionText = async function (questionId, value) {
    const textValue = String(value || '').trim();
    if (!textValue) return this.showToast('لا يمكن أن يكون نص السؤال فارغاً.', true);
    try {
      await this.supabase.request('rpc/update_draft_question_text_secure', {
        method: 'POST',
        body: JSON.stringify({ p_question_id: questionId, p_question_text: textValue, p_question_text_ar: textValue })
      });
      this.showToast('تم تحديث نص السؤال.');
    } catch (err) { this.showToast('فشل تحديث نص السؤال: ' + err.message, true); }
  };

  AssessmentManager.prototype.archiveAssessment = async function (id, currentStatus) {
    const current = String(currentStatus || '').toLowerCase();
    if (current === 'draft') {
      this.showToast('المسودة لا تُؤرشف؛ استخدم حذف المسودة أو انشرها.', true);
      return;
    }
    if (current !== 'published') {
      this.showToast('النسخة المؤرشفة غير قابلة للتعديل.', true);
      return;
    }
    try {
      const family = this.familyByVersionId[id];
      if (!family?.id) throw new Error('تعذر تحديد عائلة التقييم المنشور.');
      if (!confirm('سيتم إيقاف ظهور هذا التقييم للعامة مع إبقاء بياناته التاريخية. متابعة؟')) return;
      await this.supabase.request('rpc/stop_public_assessment_secure', { method: 'POST', body: JSON.stringify({ p_family_id: family.id }) });
      this.showToast('تم إيقاف الظهور العام مع حفظ التاريخ.');
      await this.renderAssessmentsTable();
      this.populateFilterDropdown();
    } catch (err) { this.showToast('فشل إيقاف الظهور العام: ' + err.message, true); }
  };
})();
