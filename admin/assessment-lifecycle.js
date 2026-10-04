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
    const inlineTitle=document.getElementById('new-axis-title')?.value.trim();
    const inlineWeight=document.getElementById('new-axis-weight')?.value;
    const titleAr=inlineTitle || prompt('أدخل اسم المحور الجديد (بالعربية):');
    if (!titleAr) return;
    const weightRaw=inlineWeight !== undefined && inlineWeight !== '' ? inlineWeight : prompt('أدخل وزن المحور (رقم غير سالب، مثال 10 أو 20):','10');
    if (weightRaw === null) return;
    const weight=parseFloat(weightRaw);
    if (!Number.isFinite(weight) || weight < 0) return this.showToast('وزن المحور غير صالح.',true);
    try {
      const axes=await this.supabase.select('axes',{filter:{assessment_type_id:assessmentId}}) || [];
      const displayOrder=axes.reduce((m,a)=>Math.max(m,Number(a.display_order)||0),0)+1;
      await this.supabase.request('rpc/save_axis_secure',{method:'POST',body:JSON.stringify({
        p_assessment_type_id:assessmentId,p_title:titleAr.trim(),p_title_ar:titleAr.trim(),
        p_code:'AX'+Math.random().toString(36).substr(2,6).toUpperCase(),p_weight:weight,p_display_order:displayOrder
      })});
      await this.editAssessment(assessmentId);
      this.showToast('تمت إضافة المحور وحفظ وزنه.');
    } catch(err) { this.showToast('فشل إضافة المحور: ' + err.message,true); }
  };
    AssessmentManager.prototype.addQuestionInline = async function (assessmentId, axisId) {
    const inlineText=document.getElementById('new-question-text')?.value.trim();
    const qTextAr=inlineText || prompt('أدخل نص السؤال الجديد (بالعربية):');
    if (!qTextAr) return;
    try {
      const questions=await this.supabase.select('questions',{filter:{axis_id:axisId}}) || [];
      const displayOrder=questions.reduce((m,q)=>Math.max(m,Number(q.display_order)||0),0)+1;
      await this.supabase.request('rpc/save_question_secure',{method:'POST',body:JSON.stringify({
        p_assessment_type_id:assessmentId,p_axis_id:axisId,p_question_text:qTextAr.trim(),
        p_question_text_ar:qTextAr.trim(),p_code:'Q'+Math.random().toString(36).substr(2,6).toUpperCase(),
        p_question_type:'select',p_display_order:displayOrder,p_is_required:true,p_trap_index:null
      })});
      await this.editAssessment(assessmentId);
      this.showToast('تمت إضافة السؤال وحفظه.');
    } catch(err) { this.showToast('فشل إضافة السؤال: ' + err.message,true); }
  };
    AssessmentManager.prototype.addOption = async function (questionId, assessmentId) {
    try {
      const qOptions=await this.supabase.select('options',{filter:{question_id:questionId}}) || [];
      if(qOptions.length>=5) return this.showToast('الحد الأقصى 5 خيارات لهذا السؤال هو 5.',true);

      const inlineScore=document.getElementById('new-option-score-'+questionId);
      const scoreRaw=inlineScore && inlineScore.value !== '' ? inlineScore.value : prompt('أدخل القيمة الرياضية للخيار الجديد (0 إلى 100):','0');
      if(scoreRaw===null) return;
      const score=parseFloat(scoreRaw);
      if(!Number.isFinite(score)||score<0||score>100) return this.showToast('قيمة الخيار يجب أن تكون بين 0 و100.',true);

      const inlineLabel=document.getElementById('new-option-label-'+questionId);
      const label=(inlineLabel?.value || '').trim() || prompt('أدخل نص الخيار الجديد:','خيار جديد');
      if(label===null || !String(label).trim()) return;

      const maxOrder=qOptions.reduce((m,o)=>Math.max(m,Number(o.display_order)||0),0);
      const maxIndex=qOptions.reduce((m,o)=>Math.max(m,Number(o.option_index)||-1),-1);
      const raw=await this.supabase.request('rpc/add_option_secure',{
        method:'POST',
        body:JSON.stringify({
          p_question_id:questionId,p_label_ar:String(label).trim(),p_label:String(label).trim(),
          p_option_value:score,p_option_index:maxIndex+1,p_display_order:maxOrder+1,p_is_trap:false
        })
      });
      const createdId=this.rpcScalar(raw);
      if(!createdId) throw new Error('الخادم لم يُرجع هوية الخيار الجديد.');
      await this.editAssessment(assessmentId);
      this.showToast('تمت إضافة الخيار لهذا السؤال وحفظه من الخادم.');
    } catch(err) {
      this.showToast('فشل إضافة الخيار لهذا السؤال: ' + (this._workspaceErrorText?this._workspaceErrorText(err):err.message),true);
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
      document.querySelectorAll('[data-ev-role]').forEach(el => {
        const role = el.dataset.evRole;
        const raw = el.value.trim();
        if (!raw) return;
        const weight = Number(raw);
        if (!Number.isFinite(weight) || weight < 0) {
          throw new Error('وزن EV للدور ' + role + ' يجب أن يكون رقماً غير سالب.');
        }
        evMappings[role] = weight;
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
      const reason=this._workspaceErrorText ? this._workspaceErrorText(err) : err.message;
      this.showToast('فشل حفظ الإعدادات الحسابية: ' + reason,true);
    }
  };

    AssessmentManager.prototype.addKpiMapping = function (assessmentId) {
    const raw=document.getElementById('new-kpi-code')?.value.trim() || prompt('أدخل كود KPI الجديد، مثال TFI:');
    if(!raw) return;
    const code=raw.toUpperCase().replace(/[^A-Z0-9_-]/g,'');
    if(!code) return this.showToast('كود KPI غير صالح.',true);
    if(document.getElementById('calc-kpi-'+code)) return this.showToast('كود KPI موجود بالفعل.',true);
    const list=document.getElementById('calc-kpi-list'); if(!list) return;
    const box=document.createElement('div'); box.className='calc-kpi-box'; box.id='calc-kpi-box-'+code;
    box.innerHTML='<div class="mapping-head"><strong>'+safe(this,code)+'</strong><button type="button" class="btn-danger btn-compact" onclick="window.assessmentManager.removeKpiMapping(\''+safe(this,code)+'\')">حذف</button></div><textarea id="calc-kpi-'+safe(this,code)+'" rows="6">{&quot;ROLE&quot;:1}</textarea>';
    list.insertBefore(box,list.querySelector('.compact-create') || null);
    this._markWorkspaceDirty?.(true);
  };
    AssessmentManager.prototype.addEvMapping = function (assessmentId) {
    const raw=document.getElementById('new-ev-code')?.value.trim() || prompt('أدخل كود خريطة EV الجديدة:');
    if(!raw) return;
    const code=raw.toUpperCase().replace(/[^A-Z0-9_-]/g,'');
    if(!code) return this.showToast('كود EV غير صالح.',true);
    if(document.getElementById('calc-ev-'+code)) return this.showToast('كود EV موجود بالفعل.',true);
    const list=document.getElementById('calc-ev-list'); if(!list) return;
    const box=document.createElement('div'); box.className='calc-ev-box'; box.id='calc-ev-box-'+code;
    box.innerHTML='<div class="mapping-head"><strong>'+safe(this,code)+'</strong><button type="button" class="btn-danger btn-compact" onclick="window.assessmentManager.removeEvMapping(\''+safe(this,code)+'\')">حذف</button></div><textarea id="calc-ev-'+safe(this,code)+'" rows="6">{&quot;ROLE&quot;:1}</textarea>';
    list.insertBefore(box,list.querySelector('.compact-create') || null);
    this._markWorkspaceDirty?.(true);
  };
    AssessmentManager.prototype.removeKpiMapping = function (code) {
    if (!confirm('حذف خريطة KPI '+code+' من المسودة؟')) return;
    document.getElementById('calc-kpi-box-'+code)?.remove();
    this._markWorkspaceDirty?.(true);
    this.showToast('أزيلت من المحرر. اضغط حفظ الإعدادات الحسابية لتثبيت الحذف.');
  };
    AssessmentManager.prototype.removeEvMapping = function (code) {
    if (!confirm('حذف خريطة EV '+code+' من المسودة؟')) return;
    document.getElementById('calc-ev-box-'+code)?.remove();
    this._markWorkspaceDirty?.(true);
    this.showToast('أزيلت من المحرر. اضغط حفظ الإعدادات الحسابية لتثبيت الحذف.');
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

  AssessmentManager.prototype.deleteAssessment = async function (id) {
    const target = this._workspaceData?.ast?.id === id
      ? (this._workspaceData.ast.title_ar || this._workspaceData.ast.slug || 'المسودة')
      : 'المسودة';
    const inWorkspace = this._workspaceData?.ast?.id === id && !document.getElementById('assessment-modal')?.classList.contains('hidden');
    if (inWorkspace && this._workspaceState?.dirty && !confirm('توجد تعديلات غير محفوظة. حذف المسودة سيحذف كل محتواها نهائياً. متابعة؟')) return;
    if (!inWorkspace && !confirm('هذه مسودة عمل. سيتم حذفها نهائياً مع محاورها وأسئلتها وخياراتها. إذا كانت مرتبطة بتاريخ تنفيذ سيرفض الخادم الحذف ويحافظ عليها. متابعة؟')) return;

    if (inWorkspace && this._setWorkspaceStatus) {
      this._setWorkspaceStatus('saving','حذف المسودة',target,'جاري طلب الحذف من الخادم والتحقق من النتيجة.','لا تغلق الصفحة أثناء العملية.');
    }

    try {
      const raw = await this.supabase.request('rpc/delete_assessment_draft_secure',{
        method:'POST',
        body:JSON.stringify({p_id:id})
      });
      const result = raw?.result ?? raw;
      if (!result || result.success !== true) {
        throw new Error('الخادم لم يؤكد حذف المسودة.');
      }

      await this.renderAssessmentsTable();
      this.populateFilterDropdown();

      if (inWorkspace) {
        this._workspaceState.dirty = false;
        document.getElementById('assessment-modal')?.classList.add('hidden');
        document.getElementById('dashboard-content')?.classList.remove('editor-mode');
      }

      this.showToast('تم حذف المسودة نهائياً مع محتواها.');
    } catch(err) {
      if (inWorkspace && this._setWorkspaceStatus) {
        const message = String(err?.message || err || '');
        const detail = /execution history|نتائج|تنفيذ/i.test(message)
          ? 'هذه النسخة مرتبطة بسجل تنفيذ، لذلك لم يتم حذفها.'
          : message;
        this._setWorkspaceStatus('error','حذف المسودة',target,detail,'تحقق من السبب ثم أعد المحاولة؛ لم يُعتبر الحذف ناجحاً.');
      }
      this.showToast('فشل حذف المسودة: ' + (err?.message || err), true);
    }
  };
})();
