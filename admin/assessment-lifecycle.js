/* CORE System — P5 complete assessment editor */
(function () {
  'use strict';

  const ROLES = [
    'TRUST','COMMUNICATION','CONVERSION','RETENTION','LOYALTY',
    'SCHEDULING','RECEPTION','ADMIN','COORDINATION','JOURNEY',
    'OPERATIONS','TEAM','GROWTH','PROFESSIONALISM','TEAMWORK'
  ];

  const safe = (manager, value) =>
    manager.escapeHtml ? manager.escapeHtml(String(value ?? '')) : String(value ?? '');

  const jsonPretty = value => JSON.stringify(value || {}, null, 2);
  const parseObject = (value, label) => {
    const parsed = JSON.parse(value || '{}');
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error(label + ' يجب أن يكون كائناً JSON.');
    }
    return parsed;
  };

  AssessmentManager.prototype.editAssessment = async function (id) {
    try {
      const allAssessments = await this.supabase.select('assessment_types') || [];
      const ast = allAssessments.find(a => a.id === id);
      if (!ast) return this.showToast('التقييم المطلوب غير موجود.', true);

      const status = String(ast.status || '').toLowerCase();
      if (status === 'archived') {
        return this.showToast('الإصدار المؤرشف تاريخي وغير قابل للتعديل. يمكن استعادته للعرض أو إنشاء نسخة عمل منه.', true);
      }

      this.editingAssessmentSlug = ast.slug || null;
      this.editingAssessmentStatus = status;

      document.getElementById('ast-id').value = ast.id;
      document.getElementById('ast-title-ar').value = ast.title_ar || '';
      document.getElementById('ast-title-en').value = ast.title_en || '';
      document.getElementById('ast-description').value = ast.description || '';
      document.getElementById('ast-status').value = status === 'published' ? 'Published' : 'Draft';
      document.getElementById('ast-status').disabled = true;
      document.getElementById('ast-has-traps').checked = !!ast.has_traps;
      document.getElementById('ast-has-simulator').checked = !!ast.has_ev_simulator;
      document.getElementById('ast-has-traps').disabled = status === 'published';
      document.getElementById('ast-has-simulator').disabled = status === 'published';

      const currentAxes = await this.supabase.select('axes', {
        filter: { assessment_type_id: ast.id },
        order: { column: 'display_order', direction: 'asc' }
      }) || [];

      const currentQuestions = await this.supabase.select('questions', {
        filter: { assessment_type_id: ast.id },
        order: { column: 'display_order', direction: 'asc' }
      }) || [];

      const questionIds = currentQuestions.map(q => q.id);
      if (questionIds.length) {
        const endpoint = 'options?select=*&question_id=in.(' + questionIds.join(',') + ')&order=display_order.asc';
        this.currentOptions = await this.supabase.request(endpoint, { method: 'GET' }) || [];
      } else {
        this.currentOptions = [];
      }

      this.renderModalTabs(currentAxes, currentQuestions, ast, status);
      const title = document.getElementById('assessment-modal-title');
      if (title) title.innerText = (status === 'published' ? 'تعديل التقييم المنشور: ' : 'تعديل مسودة: ') + (ast.title_ar || '');
      document.getElementById('assessment-modal').classList.remove('hidden');
    } catch (err) {
      this.showToast('خطأ أثناء تحميل تفاصيل التقييم: ' + err.message, true);
    }
  };

  AssessmentManager.prototype.createNewAssessment = function () {
    const form = document.getElementById('assessment-form');
    if (form) form.reset();
    document.getElementById('ast-id').value = '';
    this.editingAssessmentSlug = null;
    this.editingAssessmentStatus = 'draft';

    const statusEl = document.getElementById('ast-status');
    if (statusEl) {
      statusEl.value = 'Draft';
      statusEl.disabled = true;
      statusEl.title = 'تغيير حالة النشر يتم من زر النشر المخصص.';
    }
    document.getElementById('ast-has-traps').disabled = false;
    document.getElementById('ast-has-simulator').disabled = false;

    const title = document.getElementById('assessment-modal-title');
    if (title) title.innerText = 'إنشاء تقييم استشاري جديد';

    const tabs = document.getElementById('modal-tab-content');
    if (tabs) {
      tabs.innerHTML = '<p style="color:#0f766e;padding:15px;background:#f0fdf4;border-radius:8px;text-align:center;font-size:0.85rem;font-weight:600;">يرجى حفظ بيانات التقييم الأساسية أولاً، ثم سيظهر محرر المسودة الكامل لإضافة المحاور والأسئلة والخيارات والأوزان وإعدادات الحساب.</p>';
    }
    document.getElementById('assessment-modal').classList.remove('hidden');
  };

  AssessmentManager.prototype.saveAssessment = async function () {
    const id = document.getElementById('ast-id').value || null;
    const status = this.editingAssessmentStatus || String(document.getElementById('ast-status').value || 'draft').toLowerCase();
    const titleAr = document.getElementById('ast-title-ar').value;
    const titleEn = document.getElementById('ast-title-en').value;
    const description = document.getElementById('ast-description').value;
    const generatedSlug = this.editingAssessmentSlug ||
      (titleEn ? titleEn.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : 'assessment-' + Date.now());

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
      this.showToast(status === 'published'
        ? 'تم حفظ التعديلات التحريرية على التقييم المنشور.'
        : 'تم حفظ بيانات المسودة.');
      await this.renderAssessmentsTable();
      this.populateFilterDropdown();
      if (savedId) {
        document.getElementById('assessment-modal').classList.add('hidden');
        await this.editAssessment(savedId);
      }
    } catch (err) {
      this.showToast('فشل حفظ التعديلات: ' + err.message, true);
    }
  };

  AssessmentManager.prototype.renderModalTabs = function (axes, questions, ast, assessmentStatus) {
    const contentContainer = document.getElementById('modal-tab-content');
    if (!contentContainer) return;

    const isPublished = String(assessmentStatus || '').toLowerCase() === 'published';
    const assessmentId = ast.id;
    const roleMap = ast.axis_roles || {};
    const kpiMappings = ast.kpi_mappings || {};
    const evMappings = ast.ev_mappings || {};

    let html = '<div style="display:flex;flex-direction:column;gap:12px;text-align:right;direction:rtl;">';

    html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
    if (!isPublished) {
      html += '<button type="button" onclick="window.assessmentManager.addAxisInline(\'' + assessmentId + '\')" class="btn-primary" style="padding:6px 12px;font-size:0.8rem;">+ إضافة محور جديد</button>';
      html += '<button type="button" onclick="window.assessmentManager.saveCalculationConfig(\'' + assessmentId + '\')" class="btn-primary" style="padding:6px 12px;font-size:0.8rem;background:#0f766e;">💾 حفظ الإعدادات الحسابية</button>';
    } else {
      html += '<button type="button" onclick="window.assessmentManager.duplicateAssessment(\'' + assessmentId + '\')" class="btn-primary" style="padding:6px 12px;font-size:0.8rem;background:#6366f1;">📋 إنشاء نسخة عمل للتعديلات الهيكلية والحسابية</button>';
      html += '<span style="font-size:0.75rem;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:5px 8px;">النصوص فقط تعدل هنا مباشرة. الأسئلة والخيارات والأوزان والحسابات تعدل داخل نسخة عمل.</span>';
    }
    html += '</div>';

    if (!axes.length) {
      html += '<p style="color:#6b7280;text-align:center;padding:20px;background:#f8fafc;border-radius:8px;border:1px dashed #cbd5e1;font-size:0.85rem;">لا توجد محاور مرتبطة حالياً.</p>';
    } else {
      axes.sort((a,b) => (a.display_order || 0) - (b.display_order || 0));
      axes.forEach(axis => {
        const axisQuestions = questions
          .filter(q => q.axis_id === axis.id)
          .sort((a,b) => (a.display_order || 0) - (b.display_order || 0));

        html += '<div style="background:#f8fafc;padding:12px;border-radius:8px;border-right:4px solid #0f766e;border:1px solid #e5e7eb;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">';

        if (isPublished) {
          html += '<input type="text" value="' + safe(this, axis.title_ar || axis.title || '') + '" onchange="window.assessmentManager.updatePublishedAxisContent(\'' + axis.id + '\',this.value,\'' + assessmentId + '\')" style="flex:1;min-width:170px;padding:6px;border:1px solid #cbd5e1;border-radius:5px;font-family:Cairo;font-size:0.75rem;font-weight:700;">';
          html += '<span style="font-size:0.75rem;color:#64748b;">الوزن: %' + (axis.weight ?? 0) + '</span>';
        } else {
          html += '<input type="text" value="' + safe(this, axis.title_ar || axis.title || '') + '" onchange="window.assessmentManager.updateDraftAxis(\'' + axis.id + '\',\'' + assessmentId + '\')" data-axis-title="' + safe(this, axis.id) + '" style="flex:1;min-width:170px;padding:6px;border:1px solid #cbd5e1;border-radius:5px;font-family:Cairo;font-size:0.75rem;font-weight:700;">';
          html += '<label style="font-size:0.7rem;color:#64748b;">الوزن <input type="number" step="0.01" min="0" max="100" value="' + (axis.weight ?? 0) + '" id="axis-weight-' + axis.id + '" style="width:70px;padding:4px;text-align:center;"></label>';
          html += '<label style="font-size:0.7rem;color:#64748b;">الترتيب <input type="number" min="1" value="' + (axis.display_order ?? 1) + '" id="axis-order-' + axis.id + '" style="width:55px;padding:4px;text-align:center;"></label>';
          html += '<label style="font-size:0.7rem;color:#64748b;">الدور <select id="axis-role-' + axis.id + '" style="padding:4px;font-family:Cairo;font-size:0.7rem;"><option value="">— بدون دور —</option>' +
            ROLES.map(r => '<option value="' + r + '" ' + (roleMap[axis.code] === r ? 'selected' : '') + '>' + r + '</option>').join('') +
            '</select></label>';
          html += '<button type="button" onclick="window.assessmentManager.updateDraftAxis(\'' + axis.id + '\',\'' + assessmentId + '\')" style="padding:4px 7px;background:#0f766e;color:#fff;border:0;border-radius:4px;font-family:Cairo;font-size:0.68rem;">حفظ المحور</button>';
          html += '<button type="button" onclick="window.assessmentManager.deleteDraftAxis(\'' + axis.id + '\',\'' + assessmentId + '\')" style="padding:4px 7px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:4px;font-family:Cairo;font-size:0.68rem;">🗑️ حذف المحور</button>';
        }

        if (!isPublished) {
          html += '<button type="button" onclick="window.assessmentManager.addQuestionInline(\'' + assessmentId + '\',\'' + axis.id + '\')" style="padding:4px 7px;background:#10b981;color:#fff;border:0;border-radius:4px;font-family:Cairo;font-size:0.68rem;">+ إضافة سؤال</button>';
        }
        html += '</div>';

        if (!axisQuestions.length) {
          html += '<p style="font-size:0.75rem;color:#94a3b8;margin:7px 0 0;">⚠️ لا توجد أسئلة تحت هذا المحور حالياً.</p>';
        } else {
          html += '<div style="padding-right:8px;margin-top:8px;display:flex;flex-direction:column;gap:6px;">';
          axisQuestions.forEach(q => {
            const qOptions = (this.currentOptions || [])
              .filter(o => o.question_id === q.id)
              .sort((a,b) => (a.display_order || 0) - (b.display_order || 0));

            html += '<div style="background:#fff;padding:8px;border-radius:5px;border:1px solid #eef2f7;">';
            html += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';

            if (isPublished) {
              html += '<input type="text" value="' + safe(this,q.question_text_ar || q.question_text || '') + '" onchange="window.assessmentManager.updatePublishedQuestionText(\'' + q.id + '\',this.value,\'' + assessmentId + '\')" style="flex:1;min-width:180px;padding:6px;border:1px solid #cbd5e1;border-radius:5px;font-family:Cairo;font-size:0.72rem;">';
            } else {
              html += '<input type="text" value="' + safe(this,q.question_text_ar || q.question_text || '') + '" onchange="window.assessmentManager.updateDraftQuestion(\'' + q.id + '\',\'' + assessmentId + '\')" data-question-text="' + safe(this,q.id) + '" style="flex:1;min-width:180px;padding:6px;border:1px solid #cbd5e1;border-radius:5px;font-family:Cairo;font-size:0.72rem;">';
              html += '<label style="font-size:0.68rem;color:#64748b;">الترتيب <input type="number" min="1" value="' + (q.display_order ?? 1) + '" id="question-order-' + q.id + '" style="width:50px;padding:4px;text-align:center;"></label>';
              html += '<label style="font-size:0.68rem;color:#64748b;"><input type="checkbox" id="question-required-' + q.id + '" ' + (q.is_required ? 'checked' : '') + '> إلزامي</label>';
              html += '<label style="font-size:0.68rem;color:#64748b;">Trap <input type="number" min="0" value="' + (q.trap_index ?? '') + '" id="question-trap-' + q.id + '" style="width:50px;padding:4px;text-align:center;"></label>';
              html += '<button type="button" onclick="window.assessmentManager.updateDraftQuestion(\'' + q.id + '\',\'' + assessmentId + '\')" style="padding:4px 7px;background:#0f766e;color:#fff;border:0;border-radius:4px;font-family:Cairo;font-size:0.68rem;">حفظ السؤال</button>';
              html += '<button type="button" onclick="window.assessmentManager.deleteDraftQuestion(\'' + q.id + '\',\'' + assessmentId + '\')" style="padding:4px 7px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:4px;font-family:Cairo;font-size:0.68rem;">🗑️</button>';
            }

            html += '<span style="color:#0f766e;font-weight:600;font-size:0.68rem;">' + safe(this,q.code || '') + '</span></div>';
            html += '<div style="padding-right:10px;border-right:2px solid #e5e7eb;margin-top:6px;">';
            html += '<div style="font-size:0.68rem;color:#64748b;margin-bottom:5px;font-weight:600;">خيارات الإجابة:</div>';

            if (!qOptions.length) {
              html += '<p style="font-size:0.68rem;color:#94a3b8;margin:0;">لا توجد خيارات لهذا السؤال.</p>';
            } else {
              qOptions.forEach((opt, idx) => {
                html += '<div style="display:flex;gap:5px;align-items:center;margin-bottom:5px;flex-wrap:wrap;">';
                html += '<span style="font-size:0.65rem;color:#94a3b8;min-width:18px;">' + (idx + 1) + '.</span>';

                if (isPublished) {
                  html += '<input type="text" value="' + safe(this,opt.label_ar || opt.label || '') + '" onchange="window.assessmentManager.updatePublishedOptionText(\'' + opt.id + '\',this.value,\'' + assessmentId + '\')" style="flex:1;min-width:130px;padding:5px;border:1px solid #e5e7eb;border-radius:4px;font-family:Cairo;font-size:0.68rem;">';
                } else {
                  html += '<input type="text" value="' + safe(this,opt.label_ar || opt.label || '') + '" id="option-label-' + opt.id + '" style="flex:1;min-width:120px;padding:5px;border:1px solid #e5e7eb;border-radius:4px;font-family:Cairo;font-size:0.68rem;">';
                  html += '<input type="number" value="' + (opt.option_value ?? 0) + '" id="option-value-' + opt.id + '" min="0" max="100" step="0.01" title="القيمة الرياضية المستخدمة في مسار الحساب الحالي" style="width:65px;padding:5px;text-align:center;">';
                  html += '<input type="number" value="' + (opt.option_index ?? idx) + '" id="option-index-' + opt.id + '" min="0" style="width:50px;padding:5px;text-align:center;" title="هوية/ترتيب الخيار">';
                  html += '<input type="number" value="' + (opt.display_order ?? idx + 1) + '" id="option-order-' + opt.id + '" min="1" style="width:50px;padding:5px;text-align:center;">';
                  html += '<label style="font-size:0.62rem;color:#64748b;"><input type="checkbox" id="option-trap-' + opt.id + '" ' + (opt.is_trap ? 'checked' : '') + '> Trap</label>';
                  html += '<button type="button" onclick="window.assessmentManager.updateDraftOption(\'' + opt.id + '\',\'' + assessmentId + '\')" style="padding:4px 6px;background:#0f766e;color:#fff;border:0;border-radius:4px;font-family:Cairo;font-size:0.62rem;">حفظ</button>';
                  html += '<button type="button" onclick="window.assessmentManager.deleteOption(\'' + opt.id + '\',\'' + assessmentId + '\')" style="padding:4px 6px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:4px;font-family:Cairo;font-size:0.62rem;">🗑️</button>';
                }
                html += '</div>';
              });
            }

            if (!isPublished) {
              const canAddMore = qOptions.length < 5;
              html += '<button type="button" onclick="window.assessmentManager.addOption(\'' + q.id + '\',\'' + assessmentId + '\')" style="margin-top:3px;padding:4px 8px;font-size:0.64rem;background:#f0fdf4;color:#0f766e;border:1px solid #86efac;border-radius:4px;font-family:Cairo;font-weight:600;' + (canAddMore ? '' : 'opacity:.45;cursor:not-allowed;') + '" ' + (canAddMore ? '' : 'disabled') + '>+ إضافة خيار (' + qOptions.length + '/5)</button>';
            }
            html += '</div></div>';
          });
          html += '</div>';
        }
        html += '</div>';
      });
    }

    if (!isPublished) {
      html += this.renderCalculationConfigEditor(ast, axes, roleMap, kpiMappings, evMappings);
    }

    html += '</div>';
    contentContainer.innerHTML = html;
  };

  AssessmentManager.prototype.renderCalculationConfigEditor = function (ast, axes, roleMap, kpiMappings, evMappings) {
    let html = '<div style="background:#ecfeff;border:1px solid #a5f3fc;border-radius:8px;padding:12px;direction:rtl;">';
    html += '<h4 style="margin:0 0 8px;color:#155e75;font-size:.85rem;">⚙️ الإعدادات الحسابية</h4>';
    html += '<p style="margin:0 0 10px;color:#475569;font-size:.68rem;">هذه الإعدادات تؤثر على طريقة حساب النتيجة. في المسودة فقط يمكن تعديلها، ثم تُثبت عند النشر.</p>';

    html += '<div style="font-size:.72rem;font-weight:700;color:#334155;margin-bottom:5px;">ربط المحاور بالأدوار</div>';
    html += '<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px;">';
    axes.forEach(axis => {
      html += '<label style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:.68rem;">';
      html += '<span style="min-width:150px;">' + safe(this,axis.title_ar || axis.code) + '</span>';
      html += '<select id="calc-axis-role-' + axis.id + '" data-axis-code="' + safe(this,axis.code || '') + '" style="padding:4px;font-family:Cairo;font-size:.68rem;"><option value="">— بدون دور —</option>' +
        ROLES.map(r => '<option value="' + r + '" ' + (roleMap[axis.code] === r ? 'selected' : '') + '>' + r + '</option>').join('') +
        '</select>';
      html += '</label>';
    });
    html += '</div>';

    html += '<div style="font-size:.72rem;font-weight:700;color:#334155;margin-bottom:5px;">خرائط KPI — كل KPI = كود ← أدوار وأوزان</div>';
    html += '<div style="display:flex;flex-direction:column;gap:7px;">';
    const kpis = Object.keys(kpiMappings);
    if (!kpis.length) html += '<div style="color:#64748b;font-size:.68rem;">لا توجد خرائط KPI حالياً. يمكن إضافة واحدة من الزر.</div>';
    kpis.forEach(code => {
      html += '<div style="background:#fff;padding:7px;border:1px solid #dbeafe;border-radius:5px;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:5px;"><strong style="font-size:.7rem;">' + safe(this,code) + '</strong><button type="button" onclick="window.assessmentManager.removeKpiMapping(\'' + safe(this,code) + '\',\'' + ast.id + '\')" style="font-size:.62rem;color:#b91c1c;background:#fff;border:1px solid #fecaca;border-radius:4px;">حذف</button></div>';
      html += '<textarea id="calc-kpi-' + safe(this,code) + '" style="width:100%;min-height:60px;margin-top:5px;font-family:monospace;font-size:.65rem;direction:ltr;">' + safe(this,jsonPretty(kpiMappings[code])) + '</textarea>';
      html += '</div>';
    });
    html += '<button type="button" onclick="window.assessmentManager.addKpiMapping(\'' + ast.id + '\')" style="align-self:flex-start;padding:4px 8px;background:#fff;border:1px solid #93c5fd;border-radius:4px;font-family:Cairo;font-size:.65rem;">+ إضافة KPI</button>';
    html += '</div>';

    html += '<div style="font-size:.72rem;font-weight:700;color:#334155;margin:12px 0 5px;">خرائط EV</div>';
    html += '<div style="display:flex;flex-direction:column;gap:7px;">';
    const evs = Object.keys(evMappings);
    if (!evs.length) html += '<div style="color:#64748b;font-size:.68rem;">لا توجد خرائط EV حالياً.</div>';
    evs.forEach(code => {
      html += '<div style="background:#fff;padding:7px;border:1px solid #dbeafe;border-radius:5px;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;"><strong style="font-size:.7rem;">' + safe(this,code) + '</strong><button type="button" onclick="window.assessmentManager.removeEvMapping(\'' + safe(this,code) + '\',\'' + ast.id + '\')" style="font-size:.62rem;color:#b91c1c;background:#fff;border:1px solid #fecaca;border-radius:4px;">حذف</button></div>';
      html += '<textarea id="calc-ev-' + safe(this,code) + '" style="width:100%;min-height:60px;margin-top:5px;font-family:monospace;font-size:.65rem;direction:ltr;">' + safe(this,jsonPretty(evMappings[code])) + '</textarea>';
      html += '</div>';
    });
    html += '<button type="button" onclick="window.assessmentManager.addEvMapping(\'' + ast.id + '\')" style="align-self:flex-start;padding:4px 8px;background:#fff;border:1px solid #93c5fd;border-radius:4px;font-family:Cairo;font-size:.65rem;">+ إضافة خريطة EV</button>';
    html += '</div>';

    html += '<div style="margin-top:10px;padding:7px;background:#fff;border:1px dashed #94a3b8;border-radius:5px;font-size:.62rem;color:#475569;direction:rtl;">أوزان المحاور وقيم الخيارات تُعدل مباشرة في عناصرها أعلاه. خرائط الأدوار وKPI وEV تُحفظ مع المسودة ولا تُعدل على المنشور.</div>';
    html += '</div>';
    return html;
  };

  AssessmentManager.prototype.updateDraftAxis = async function (axisId, assessmentId) {
    const titleEl = document.querySelector('[data-axis-title="' + axisId + '"]');
    const title = titleEl ? titleEl.value.trim() : '';
    const weight = parseFloat(document.getElementById('axis-weight-' + axisId)?.value);
    const displayOrder = parseInt(document.getElementById('axis-order-' + axisId)?.value,10);
    if (!title) return this.showToast('اسم المحور لا يمكن أن يكون فارغاً.', true);
    if (!Number.isFinite(weight) || weight < 0) return this.showToast('وزن المحور غير صالح.', true);
    if (!Number.isInteger(displayOrder) || displayOrder < 1) return this.showToast('ترتيب المحور غير صالح.', true);

    try {
      await this.supabase.request('rpc/update_draft_axis_secure', {
        method:'POST',
        body:JSON.stringify({
          p_axis_id:axisId,
          p_title:title,
          p_title_ar:title,
          p_description:null,
          p_weight:weight,
          p_display_order:displayOrder
        })
      });
      await this.editAssessment(assessmentId);
      this.showToast('تم حفظ المحور ووزنه وترتيبه.');
    } catch (err) {
      this.showToast('فشل حفظ المحور: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.updateDraftQuestion = async function (questionId, assessmentId) {
    const textEl = document.querySelector('[data-question-text="' + questionId + '"]');
    const textValue = textEl ? textEl.value.trim() : '';
    const displayOrder = parseInt(document.getElementById('question-order-' + questionId)?.value,10);
    const required = !!document.getElementById('question-required-' + questionId)?.checked;
    const trapRaw = document.getElementById('question-trap-' + questionId)?.value;
    const trapIndex = trapRaw === '' ? null : parseInt(trapRaw,10);
    if (!textValue) return this.showToast('نص السؤال لا يمكن أن يكون فارغاً.', true);
    if (!Number.isInteger(displayOrder) || displayOrder < 1) return this.showToast('ترتيب السؤال غير صالح.', true);
    if (trapIndex !== null && (!Number.isInteger(trapIndex) || trapIndex < 0)) return this.showToast('قيمة Trap غير صالحة.', true);

    try {
      await this.supabase.request('rpc/update_draft_question_secure', {
        method:'POST',
        body:JSON.stringify({
          p_question_id:questionId,
          p_question_text:textValue,
          p_question_text_ar:textValue,
          p_axis_id:null,
          p_display_order:displayOrder,
          p_is_required:required,
          p_trap_index:trapIndex
        })
      });
      await this.editAssessment(assessmentId);
      this.showToast('تم حفظ السؤال وبنيته.');
    } catch (err) {
      this.showToast('فشل حفظ السؤال: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.updateDraftOption = async function (optionId, assessmentId) {
    const label = document.getElementById('option-label-' + optionId)?.value.trim() || '';
    const value = parseFloat(document.getElementById('option-value-' + optionId)?.value);
    const index = parseInt(document.getElementById('option-index-' + optionId)?.value,10);
    const order = parseInt(document.getElementById('option-order-' + optionId)?.value,10);
    const isTrap = !!document.getElementById('option-trap-' + optionId)?.checked;
    if (!label) return this.showToast('نص الخيار لا يمكن أن يكون فارغاً.', true);
    if (!Number.isFinite(value) || value < 0 || value > 100) return this.showToast('قيمة الخيار يجب أن تكون بين 0 و100.', true);
    if (!Number.isInteger(index) || index < 0) return this.showToast('رقم الخيار غير صالح.', true);
    if (!Number.isInteger(order) || order < 1) return this.showToast('ترتيب الخيار غير صالح.', true);

    try {
      await this.supabase.request('rpc/update_draft_option_secure', {
        method:'POST',
        body:JSON.stringify({
          p_option_id:optionId,
          p_label:label,
          p_label_ar:label,
          p_option_value:value,
          p_option_index:index,
          p_display_order:order,
          p_is_trap:isTrap,
          p_display_text:null,
          p_display_text_ar:null
        })
      });
      await this.editAssessment(assessmentId);
      this.showToast('تم حفظ الخيار وقيمته الرياضية.');
    } catch (err) {
      this.showToast('فشل حفظ الخيار: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.updatePublishedAxisContent = async function (axisId, titleAr, assessmentId) {
    const value = String(titleAr || '').trim();
    if (!value) return this.showToast('لا يمكن أن يكون اسم المحور فارغاً.', true);
    try {
      await this.supabase.request('rpc/update_published_axis_content_secure', {
        method:'POST',
        body:JSON.stringify({p_axis_id:axisId,p_title:value,p_title_ar:value,p_description:null})
      });
      await this.editAssessment(assessmentId);
      this.showToast('تم تحديث نص المحور.');
    } catch (err) {
      this.showToast('فشل تحديث نص المحور: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.updatePublishedQuestionText = async function (questionId, value, assessmentId) {
    const textValue = String(value || '').trim();
    if (!textValue) return this.showToast('لا يمكن أن يكون نص السؤال فارغاً.', true);
    try {
      await this.supabase.request('rpc/update_published_question_text_secure', {
        method:'POST',
        body:JSON.stringify({p_question_id:questionId,p_question_text:textValue,p_question_text_ar:textValue})
      });
      await this.editAssessment(assessmentId);
      this.showToast('تم تحديث نص السؤال.');
    } catch (err) {
      this.showToast('فشل تحديث نص السؤال: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.updatePublishedOptionText = async function (optionId, value, assessmentId) {
    const textValue = String(value || '').trim();
    if (!textValue) return this.showToast('لا يمكن أن يكون نص الخيار فارغاً.', true);
    try {
      await this.supabase.request('rpc/update_published_option_text_secure', {
        method:'POST',
        body:JSON.stringify({p_option_id:optionId,p_label:textValue,p_label_ar:textValue,p_display_text:null,p_display_text_ar:null})
      });
      await this.editAssessment(assessmentId);
      this.showToast('تم تحديث نص الخيار.');
    } catch (err) {
      this.showToast('فشل تحديث نص الخيار: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.updateDraftQuestionText = async function (questionId, value, assessmentId) {
    const textValue = String(value || '').trim();
    if (!textValue) return this.showToast('لا يمكن أن يكون نص السؤال فارغاً.', true);
    try {
      await this.supabase.request('rpc/update_draft_question_text_secure', {
        method:'POST',
        body:JSON.stringify({p_question_id:questionId,p_question_text:textValue,p_question_text_ar:textValue})
      });
      await this.editAssessment(assessmentId);
      this.showToast('تم تحديث نص السؤال.');
    } catch (err) {
      this.showToast('فشل تحديث نص السؤال: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.addAxisInline = async function (assessmentId) {
    const titleAr = prompt('أدخل اسم المحور الجديد (بالعربية):');
    if (!titleAr) return;
    const weightRaw = prompt('أدخل وزن المحور (رقم غير سالب، مثال 10 أو 20):','10');
    if (weightRaw === null) return;
    const weight = parseFloat(weightRaw);
    if (!Number.isFinite(weight) || weight < 0) return this.showToast('وزن المحور غير صالح.',true);

    try {
      const axes = await this.supabase.select('axes',{filter:{assessment_type_id:assessmentId}}) || [];
      const displayOrder = axes.reduce((m,a)=>Math.max(m,Number(a.display_order)||0),0)+1;
      await this.supabase.request('rpc/save_axis_secure',{
        method:'POST',
        body:JSON.stringify({
          p_assessment_type_id:assessmentId,
          p_title:titleAr.trim(),
          p_title_ar:titleAr.trim(),
          p_code:'AX' + Math.random().toString(36).substr(2,6).toUpperCase(),
          p_weight:weight,
          p_display_order:displayOrder
        })
      });
      await this.editAssessment(assessmentId);
      this.showToast('تمت إضافة المحور وحفظ وزنه.');
    } catch(err) {
      this.showToast('فشل إضافة المحور: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.addQuestionInline = async function (assessmentId, axisId) {
    const qTextAr = prompt('أدخل نص السؤال الجديد (بالعربية):');
    if (!qTextAr) return;
    try {
      const questions = await this.supabase.select('questions',{filter:{axis_id:axisId}}) || [];
      const displayOrder = questions.reduce((m,q)=>Math.max(m,Number(q.display_order)||0),0)+1;
      await this.supabase.request('rpc/save_question_secure',{
        method:'POST',
        body:JSON.stringify({
          p_assessment_type_id:assessmentId,
          p_axis_id:axisId,
          p_question_text:qTextAr.trim(),
          p_question_text_ar:qTextAr.trim(),
          p_code:'Q' + Math.random().toString(36).substr(2,6).toUpperCase(),
          p_question_type:'select',
          p_display_order:displayOrder,
          p_is_required:true,
          p_trap_index:null
        })
      });
      await this.editAssessment(assessmentId);
      this.showToast('تمت إضافة السؤال وحفظه.');
    } catch(err) {
      this.showToast('فشل إضافة السؤال: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.addOption = async function (questionId, assessmentId) {
    try {
      const allOptions = await this.supabase.select('options') || [];
      const qOptions = allOptions.filter(o=>o.question_id===questionId);
      if (qOptions.length >= 5) return this.showToast('الحد الأقصى 5 خيارات لكل سؤال.',true);
      const scoreRaw = prompt('أدخل القيمة الرياضية للخيار الجديد (0 إلى 100):','0');
      if (scoreRaw === null) return;
      const score = parseFloat(scoreRaw);
      if (!Number.isFinite(score) || score < 0 || score > 100) return this.showToast('قيمة الخيار غير صالحة.',true);
      const maxOrder = qOptions.reduce((m,o)=>Math.max(m,Number(o.display_order)||0),0);
      const maxIndex = qOptions.reduce((m,o)=>Math.max(m,Number(o.option_index)||-1),-1);
      const label = prompt('أدخل نص الخيار الجديد:','خيار جديد');
      if (label === null || !label.trim()) return;
      await this.supabase.request('rpc/add_option_secure',{
        method:'POST',
        body:JSON.stringify({
          p_question_id:questionId,
          p_label_ar:label.trim(),
          p_label:label.trim(),
          p_option_value:score,
          p_option_index:maxIndex+1,
          p_display_order:maxOrder+1,
          p_is_trap:false
        })
      });
      await this.editAssessment(assessmentId);
      this.showToast('تمت إضافة الخيار وحفظ قيمته.');
    } catch(err) {
      this.showToast('فشل إضافة الخيار: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.deleteDraftQuestion = async function (questionId, assessmentId) {
    if (!confirm('حذف هذا السؤال من المسودة؟ سيتم حذف خياراته المرتبطة به أيضاً.')) return;
    try {
      await this.supabase.request('rpc/delete_draft_question_secure',{method:'POST',body:JSON.stringify({p_question_id:questionId})});
      await this.editAssessment(assessmentId);
      this.showToast('تم حذف السؤال من المسودة.');
    } catch(err) {
      this.showToast('فشل حذف السؤال: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.deleteDraftAxis = async function (axisId, assessmentId) {
    if (!confirm('حذف هذا المحور من المسودة؟ سيتم حذف أسئلته وخياراتها المرتبطة به.')) return;
    try {
      await this.supabase.request('rpc/delete_draft_axis_secure',{method:'POST',body:JSON.stringify({p_axis_id:axisId})});
      await this.editAssessment(assessmentId);
      this.showToast('تم حذف المحور من المسودة.');
    } catch(err) {
      this.showToast('فشل حذف المحور: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.saveCalculationConfig = async function (assessmentId) {
    try {
      const axisRoles = {};
      document.querySelectorAll('[data-axis-code]').forEach(el => {
        const role = el.value;
        const code = el.dataset.axisCode;
        if (role) axisRoles[code] = role;
      });

      const kpiMappings = {};
      document.querySelectorAll('textarea[id^="calc-kpi-"]').forEach(el => {
        const code = el.id.substring('calc-kpi-'.length);
        kpiMappings[code] = parseObject(el.value,'خريطة KPI ' + code);
      });

      const evMappings = {};
      document.querySelectorAll('textarea[id^="calc-ev-"]').forEach(el => {
        const code = el.id.substring('calc-ev-'.length);
        evMappings[code] = parseObject(el.value,'خريطة EV ' + code);
      });

      await this.supabase.request('rpc/update_draft_calculation_config_secure',{
        method:'POST',
        body:JSON.stringify({
          p_id:assessmentId,
          p_axis_roles:axisRoles,
          p_kpi_mappings:kpiMappings,
          p_ev_mappings:evMappings
        })
      });
      await this.editAssessment(assessmentId);
      this.showToast('تم حفظ الإعدادات الحسابية.');
    } catch(err) {
      this.showToast('فشل حفظ الإعدادات الحسابية: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.addKpiMapping = function (assessmentId) {
    const code = prompt('أدخل كود KPI الجديد، مثال TFI:');
    if (!code) return;
    const clean = code.trim().toUpperCase();
    const el = document.getElementById('calc-kpi-' + clean);
    if (el) return this.showToast('كود KPI موجود بالفعل.',true);
    const mappings = {};
    document.querySelectorAll('textarea[id^="calc-kpi-"]').forEach(t => {
      mappings[t.id.substring('calc-kpi-'.length)] = t.value;
    });
    mappings[clean] = '{\n  "ROLE": 1\n}';
    const temp = document.getElementById('assessment-modal');
    if (temp) this.showToast('تمت إضافة خريطة KPI في المحرر؛ عدّل JSON ثم اضغط حفظ الإعدادات الحسابية.');
    const ast = (this.allAssessments || []).find(a=>a.id===assessmentId);
    if (ast) this.renderModalTabs(
      this._currentAxes || [], this._currentQuestions || [], ast, 'draft'
    );
    // Re-open from database so the new row is not presented as if it was saved.
    this.showToast('لإضافة KPI فعلياً استخدم JSON الحالي ثم احفظ؛ إنشاء السطر الجديد يتم بعد الحفظ.');
  };

  AssessmentManager.prototype.addEvMapping = function (assessmentId) {
    const code = prompt('أدخل كود خريطة EV الجديدة:');
    if (!code) return;
    const clean = code.trim().toUpperCase();
    const existing = document.getElementById('calc-ev-' + clean);
    if (existing) return this.showToast('كود EV موجود بالفعل.',true);
    // Create a temporary textarea so the next explicit Save captures it.
    const container = document.querySelector('#modal-tab-content');
    if (!container) return;
    const wrap = document.createElement('div');
    wrap.style.cssText='background:#fff;padding:7px;border:1px solid #dbeafe;border-radius:5px;';
    wrap.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;"><strong style="font-size:.7rem;">'+safe(this,clean)+'</strong></div><textarea id="calc-ev-'+safe(this,clean)+'" style="width:100%;min-height:60px;margin-top:5px;font-family:monospace;font-size:.65rem;direction:ltr;">{\\n  "ROLE": 1\\n}</textarea>';
    const section = [...container.querySelectorAll('div')].find(el => el.textContent?.includes('خرائط EV') && el.querySelector('textarea[id^="calc-ev-"]'));
    if (section) section.appendChild(wrap);
    this.showToast('أضيفت خريطة EV للمحرر؛ اضغط حفظ الإعدادات الحسابية.');
  };

  AssessmentManager.prototype.removeKpiMapping = function (code, assessmentId) {
    if (!confirm('حذف خريطة KPI ' + code + ' من المسودة؟')) return;
    const el = document.getElementById('calc-kpi-' + code);
    const box = el?.closest('div[style*="border:1px solid #dbeafe"]');
    if (box) box.remove();
    this.showToast('أزيلت من المحرر فقط؛ اضغط حفظ الإعدادات الحسابية لتثبيت الحذف.');
  };

  AssessmentManager.prototype.removeEvMapping = function (code, assessmentId) {
    if (!confirm('حذف خريطة EV ' + code + ' من المسودة؟')) return;
    const el = document.getElementById('calc-ev-' + code);
    const box = el?.closest('div[style*="border:1px solid #dbeafe"]');
    if (box) box.remove();
    this.showToast('أزيلت من المحرر فقط؛ اضغط حفظ الإعدادات الحسابية لتثبيت الحذف.');
  };

  AssessmentManager.prototype.deleteOption = async function (optionId, assessmentId) {
    if (!confirm('هل أنت متأكد من حذف هذا الخيار من المسودة؟')) return;
    try {
      await this.supabase.request('rpc/delete_option_secure',{method:'POST',body:JSON.stringify({p_option_id:optionId})});
      await this.editAssessment(assessmentId);
      this.showToast('تم حذف الخيار.');
    } catch(err) {
      this.showToast('فشل حذف الخيار: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.archiveAssessment = async function (id, currentStatus) {
    const current = String(currentStatus || '').toLowerCase();
    if (current !== 'published') {
      this.showToast('المسودة لا تُؤرشف، والإصدار المؤرشف تاريخي وغير قابل للتعديل.', true);
      return;
    }
    try {
      const family = this.familyByVersionId[id];
      if (!family?.id) throw new Error('تعذر تحديد عائلة التقييم المنشور.');
      if (!confirm('سيتم إيقاف ظهور هذا التقييم للعامة مع إبقاء بياناته التاريخية. متابعة؟')) return;
      await this.supabase.request('rpc/stop_public_assessment_secure',{method:'POST',body:JSON.stringify({p_family_id:family.id})});
      await this.renderAssessmentsTable();
      this.populateFilterDropdown();
      this.showToast('تم إيقاف الظهور العام مع حفظ التاريخ.');
    } catch(err) {
      this.showToast('فشل إيقاف الظهور العام: ' + err.message,true);
    }
  };

  AssessmentManager.prototype.deleteAssessment = async function (id, executionCount = 0) {
    if (Number(executionCount) > 0) {
      this.showToast('هذه المسودة مرتبطة بتاريخ تنفيذ ولا يمكن حذفها.', true);
      return;
    }
    if (!confirm('هذه مسودة لم تُستخدم في أي تنفيذ. سيتم حذفها نهائياً مع محتواها. متابعة؟')) return;
    try {
      await this.supabase.request('rpc/delete_assessment_draft_secure',{method:'POST',body:JSON.stringify({p_id:id})});
      await this.renderAssessmentsTable();
      this.populateFilterDropdown();
      this.showToast('تم حذف المسودة نهائياً.');
    } catch(err) {
      this.showToast('فشل حذف المسودة: ' + err.message,true);
    }
  };
})();
