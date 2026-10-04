/* CORE System — P5 responsive assessment editor workspace */
(function () {
  'use strict';

  const ROLES = ['TRUST','COMMUNICATION','CONVERSION','RETENTION','LOYALTY','SCHEDULING','RECEPTION','ADMIN','COORDINATION','JOURNEY','OPERATIONS','TEAM','GROWTH','PROFESSIONALISM','TEAMWORK'];

  const esc = (m,v) => m.escapeHtml ? m.escapeHtml(String(v ?? '')) : String(v ?? '');
  const cleanStatus = ast => String(ast?.status || 'draft').toLowerCase();
  const byOrder = (a,b) => (Number(a.display_order)||0) - (Number(b.display_order)||0);

  AssessmentManager.prototype._workspaceState = AssessmentManager.prototype._workspaceState || { section:'overview', axisId:null, questionId:null, dirty:false, lastSaved:null, mode:null };

  AssessmentManager.prototype._formatWorkspaceDate = function (value) {
    if (!value) return null;
    try {
      return new Date(value).toLocaleString('ar-JO', {dateStyle:'short', timeStyle:'short'});
    } catch (_) {
      return String(value);
    }
  };

  AssessmentManager.prototype._workspaceErrorText = function (err) {
    const raw = String(err?.message || err || '').trim();
    if (/admin capability required/i.test(raw)) return 'لا تملك الصلاحية الإدارية المطلوبة لهذه العملية.';
    if (/Assessment version not found|التقييم المطلوب غير موجود/i.test(raw)) return 'لم تعد هذه النسخة موجودة على الخادم. حدّث لوحة الإدارة ثم افتحها من جديد.';
    if (/current public assessment cannot be deleted/i.test(raw)) return 'هذه النسخة هي النسخة العامة الحالية، لذلك يمنع النظام حذفها.';
    if (/execution history/i.test(raw)) return 'هذه النسخة مرتبطة بتاريخ تنفيذ أو نتائج، لذلك يجب الاحتفاظ بها كسجل تاريخي.';
    if (/working copy is a source for another assessment version/i.test(raw)) return 'هذه المسودة مستخدمة كمصدر لنسخة أخرى، لذلك يمنع النظام حذفها للحفاظ على سلسلة الإصدارات.';
    if (/Only draft|only working-copy|requires a working copy|published.*immutable|immutable/i.test(raw)) return 'هذه العملية غير مسموحة على حالة النسخة الحالية. راجع الحالة واعمَل على نسخة عمل عند الحاجة.';
    if (/must be|required|cannot be empty|invalid|between 0 and 100|positive/i.test(raw)) return raw;
    return raw || 'حدث خطأ غير معروف من الخادم.';
  };

  AssessmentManager.prototype._setWorkspaceStatus = function (kind, operation, target, detail, nextAction) {
    const el = document.getElementById('workspace-operation-status');
    if (!el) return;
    const labels = {
      saving:'جارٍ التنفيذ',
      saved:'تم الحفظ',
      error:'لم تكتمل العملية',
      info:'حالة المحرر'
    };
    const cls = kind === 'error' ? 'is-error' : kind === 'saved' ? 'is-saved' : kind === 'saving' ? 'is-saving' : '';
    el.className = 'workspace-status ' + cls;
    el.innerHTML =
      '<strong>' + esc(this, labels[kind] || kind) + '</strong>' +
      '<span>' + esc(this, operation || 'عملية') + ' → ' + esc(this, target || 'التقييم') + '</span>' +
      (detail ? '<span>' + esc(this, detail) + '</span>' : '') +
      (nextAction ? '<span>التالي: ' + esc(this, nextAction) + '</span>' : '');
  };

  AssessmentManager.prototype._markWorkspaceDirty = function (dirty) {
    this._workspaceState.dirty = !!dirty;
    const badge = document.getElementById('workspace-dirty-badge');
    if (badge) { badge.textContent = dirty ? 'تعديلات غير محفوظة' : 'كل التعديلات محفوظة'; badge.className = 'workspace-dirty ' + (dirty ? 'dirty' : 'clean'); }
  };

  AssessmentManager.prototype._confirmWorkspaceLeave = function(nextLabel) {
    if (!this._workspaceState?.dirty) return true;
    return confirm('توجد تعديلات غير محفوظة. الانتقال إلى ' + (nextLabel || 'قسم آخر') + ' سيؤدي إلى فقد هذه التعديلات غير المحفوظة. هل تريد المتابعة؟');
  };

  AssessmentManager.prototype._workspaceNavigate = function(section) {
    const labels = {overview:'نظرة عامة',structure:'الهيكل',questions:'الأسئلة',calculation:'الحساب',validation:'التحقق والنشر'};
    if (section !== this._workspaceState.section && !this._confirmWorkspaceLeave(labels[section])) return;
    this._workspaceState.section = section;
    this._renderWorkspaceView();
  };

  AssessmentManager.prototype._workspaceSelectAxis = function(axisId) {
    if (!this._confirmWorkspaceLeave('المحور المحدد')) return;
    this._workspaceState.axisId = axisId;
    const questions = this._workspaceData.questions.filter(q => q.axis_id === axisId).sort(byOrder);
    if (!questions.some(q => q.id === this._workspaceState.questionId)) this._workspaceState.questionId = questions[0]?.id || null;
    this._workspaceState.section = 'structure';
    this._renderWorkspaceView();
  };

  AssessmentManager.prototype._workspaceSelectQuestion = function(questionId) {
    if (!this._confirmWorkspaceLeave('السؤال المحدد')) return;
    this._workspaceState.questionId = questionId;
    this._workspaceState.section = 'questions';
    this._renderWorkspaceView();
  };

  AssessmentManager.prototype.closeAssessmentWorkspace = function() {
    if (this._workspaceState.dirty && !confirm('توجد تعديلات غير محفوظة. مغادرة المحرر الآن؟')) return;
    document.getElementById('assessment-modal')?.classList.add('hidden');
    document.getElementById('dashboard-content')?.classList.remove('editor-mode');
    this._workspaceState.dirty = false;
    this._workspaceState.axisId = null;
    this._workspaceState.questionId = null;
  };

  AssessmentManager.prototype._loadWorkspaceData = async function(id) {
    const allAssessments = await this.supabase.select('assessment_types') || [];
    const ast = allAssessments.find(a => a.id === id);
    if (!ast) throw new Error('التقييم المطلوب غير موجود.');
    const status = cleanStatus(ast);
    if (status === 'archived') throw new Error('الإصدار المؤرشف تاريخي وغير قابل للتعديل. استخدم الاستعادة أو إنشاء نسخة عمل.');
    const axes = (await this.supabase.select('axes', {filter:{assessment_type_id:id}}) || []).sort(byOrder);
    const questions = (await this.supabase.select('questions', {filter:{assessment_type_id:id}}) || []).sort(byOrder);
    const qIds = questions.map(q => q.id);
    let options = [];
    if (qIds.length) options = await this.supabase.request('options?select=*&question_id=in.(' + qIds.join(',') + ')&order=display_order.asc', {method:'GET'}) || [];
    let family = this.familyByVersionId?.[id] || null;
    if (!family && ast.family_id) { family = ((await this.supabase.select('assessment_families',{filter:{id:ast.family_id}})) || [])[0] || null; }
    this.currentOptions = options;
    this._workspaceData = { ast, status, axes, questions, options, family };
    return this._workspaceData;
  };

  AssessmentManager.prototype.editAssessment = async function(id) {
    try {
      await this._loadWorkspaceData(id);
      this.editingAssessmentSlug = this._workspaceData.ast.slug || null;
      this.editingAssessmentStatus = this._workspaceData.status;
      const rememberedAxis = this._workspaceState.axisId;
      const rememberedQuestion = this._workspaceState.questionId;
      const hasAxis = this._workspaceData.axes.some(a => a.id === rememberedAxis);
      this._workspaceState.axisId = hasAxis ? rememberedAxis : this._workspaceData.axes[0]?.id || null;
      const axisQuestions = this._workspaceData.questions.filter(q => q.axis_id === this._workspaceState.axisId).sort(byOrder);
      this._workspaceState.questionId = axisQuestions.some(q => q.id === rememberedQuestion) ? rememberedQuestion : axisQuestions[0]?.id || null;
      this._workspaceState.mode = this._workspaceData.status;
      this._workspaceState.dirty = false;
      this._workspaceState.lastSaved = this._formatWorkspaceDate(this._workspaceData.ast.updated_at) || this._workspaceState.lastSaved;
      this._setWorkspaceStatus('saved','فتح المحرر',this._workspaceData.ast.title_ar || this._workspaceData.ast.slug,'تم تحميل أحدث نسخة من الخادم.','يمكنك اختيار أي قسم والتحرير ضمن هذه النسخة.');
      document.getElementById('dashboard-content')?.classList.add('editor-mode');
      document.getElementById('assessment-modal')?.classList.remove('hidden');
      this._renderWorkspaceView();
      window.scrollTo({top:0,behavior:'smooth'});
    } catch (err) {
      this._setWorkspaceStatus?.('error','فتح المحرر','التقييم',this._workspaceErrorText(err),'حدّث لوحة الإدارة ثم أعد المحاولة.');
      this.showToast('تعذر فتح المحرر: ' + this._workspaceErrorText(err), true);
    }
  };

  AssessmentManager.prototype.createNewAssessment = function() {
    this.editingAssessmentSlug = null;
    this.editingAssessmentStatus = 'draft';
    this._workspaceData = {ast:{id:'',status:'draft',title_ar:'',title_en:'',description:'',has_traps:false,has_ev_simulator:false,family_id:null,slug:''},status:'draft',axes:[],questions:[],options:[],family:null};
    this._workspaceState = {section:'overview',axisId:null,questionId:null,dirty:false,lastSaved:null,mode:'draft'};
    this._renderWorkspaceView(true);
    document.getElementById('assessment-modal')?.classList.remove('hidden');
    document.getElementById('dashboard-content')?.classList.add('editor-mode');
    window.scrollTo({top:0,behavior:'smooth'});
  };

  AssessmentManager.prototype._renderWorkspaceView = function(isNew) {
    const d = this._workspaceData;
    if (!d) return;
    const statusText = d.status === 'published' ? 'منشور' : 'مسودة';
    const title = d.ast.title_ar || 'تقييم جديد';
    const familyLabel = d.family?.slug || d.ast.family_id || '—';
    const axis = d.axes.find(a => a.id === this._workspaceState.axisId);
    const question = d.questions.find(q => q.id === this._workspaceState.questionId);
    const trail = [title, axis?.title_ar || axis?.title || axis?.code, question?.question_text_ar || question?.question_text || question?.code]
      .filter(Boolean).join(' → ');

    document.getElementById('assessment-modal-title').textContent =
      isNew ? 'إنشاء تقييم استشاري جديد' :
      (d.status === 'published' ? 'تحرير محتوى منشور' : 'تحرير مسودة عمل');

    document.getElementById('workspace-assessment-name').textContent = title;
    document.getElementById('workspace-family').textContent = familyLabel;
    document.getElementById('workspace-status').textContent = statusText;
    document.getElementById('workspace-version').textContent = d.ast.slug || 'سيُحدد بعد الحفظ';
    document.getElementById('workspace-counts').textContent =
      d.axes.length + ' محاور · ' + d.questions.length + ' أسئلة · ' + d.options.length + ' خيارات';

    const breadcrumb = document.getElementById('workspace-breadcrumb');
    if (breadcrumb) breadcrumb.textContent = trail || 'Assessment → Overview';

    const lastSaved = document.getElementById('workspace-last-saved');
    if (lastSaved) lastSaved.textContent =
      this._workspaceState.lastSaved ? 'آخر حفظ مؤكد: ' + this._workspaceState.lastSaved : 'آخر حفظ مؤكد: —';

    const deleteBtn = document.getElementById('workspace-delete-draft');
    if (deleteBtn) deleteBtn.classList.toggle('hidden', d.status !== 'draft' || !d.ast.id);

    this._markWorkspaceDirty(!!this._workspaceState.dirty);
    document.querySelectorAll('.workspace-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === this._workspaceState.section));

    const area = document.getElementById('modal-tab-content');
    if (!area) return;
    area.innerHTML = this._renderSection(isNew);
    this._wireWorkspaceEvents();
  };

  AssessmentManager.prototype._renderSection = function(isNew) {
    const section = this._workspaceState.section;
    if (section === 'overview') return this._renderOverview(isNew);
    if (section === 'structure') return this._renderStructure();
    if (section === 'questions') return this._renderQuestions();
    if (section === 'calculation') return this._renderCalculation();
    return this._renderValidation();
  };

  AssessmentManager.prototype._renderOverview = function(isNew) {
    const d=this._workspaceData, pub=d.status==='published';
    return '<div class="workspace-flow">' +
      '<section class="editor-card editor-card-primary">' +
        '<div class="card-title-row"><div><h3>بيانات التقييم</h3><p class="editor-help">عدّل البيانات ثم استخدم «حفظ البيانات الأساسية». النجاح لا يُعرض إلا بعد إعادة القراءة من الخادم.</p></div><span class="scope-pill">'+(pub?'تحرير نص منشور':'نسخة عمل قابلة للتحرير')+'</span></div>' +
        '<div class="editor-form-grid">' +
          '<label>العنوان بالعربية <span class="required-mark">*</span><input id="ast-title-ar" type="text" required value="'+esc(this,d.ast.title_ar||'')+'" autocomplete="off"></label>' +
          '<label>العنوان بالإنجليزية<input id="ast-title-en" type="text" value="'+esc(this,d.ast.title_en||'')+'" autocomplete="off"></label>' +
          '<label class="wide">الوصف<textarea id="ast-description" rows="5">'+esc(this,d.ast.description||'')+'</textarea></label>' +
        '</div>' +
        '<input type="hidden" id="ast-id" value="'+esc(this,d.ast.id||'')+'">' +
        '<input type="hidden" id="ast-status" value="'+(pub?'Published':'Draft')+'">' +
        '<div class="setting-strip">' +
          '<label class="switch-row"><input id="ast-has-traps" type="checkbox" '+(d.ast.has_traps?'checked':'')+(pub?' disabled':'')+'><span><strong>الأفخاخ</strong><small>تفعيل منطق Trap لهذه النسخة</small></span></label>' +
          '<label class="switch-row"><input id="ast-has-simulator" type="checkbox" '+(d.ast.has_ev_simulator?'checked':'')+(pub?' disabled':'')+'><span><strong>محاكي EV</strong><small>تفعيل إعداد المحاكي لهذه النسخة</small></span></label>' +
        '</div>' +
        '<div class="editor-actions editor-actions-primary">' +
          '<button type="button" class="btn-primary" id="workspace-save-details">💾 حفظ البيانات الأساسية</button>' +
          (pub?'<span class="editor-help-inline">التعديلات الهيكلية والحسابية تتطلب «نسخة عمل جديدة».</span>':'<span class="editor-help-inline">الحالة والتوقيت الظاهر أعلاه مصدرهما الخادم بعد آخر حفظ مؤكد.</span>') +
        '</div>' +
      '</section>' +
      '<section class="editor-card">' +
        '<div class="card-title-row"><div><h3>أين أنت الآن؟</h3><p class="editor-help">تقييم كامل ≠ نموذج صغير. استخدم الأقسام للوصول إلى الجزء المطلوب دون فقدان السياق.</p></div></div>' +
        '<div class="summary-grid">' +
          '<div><span>العائلة</span><strong>'+esc(this,d.family?.slug || d.ast.family_id || '—')+'</strong></div>' +
          '<div><span>المحاور</span><strong>'+d.axes.length+'</strong></div>' +
          '<div><span>الأسئلة</span><strong>'+d.questions.length+'</strong></div>' +
          '<div><span>الخيارات</span><strong>'+d.options.length+'</strong></div>' +
        '</div>' +
        '<div class="workflow-hints">' +
          '<div><b>الهيكل</b><span>إدارة المحاور والأوزان والترتيب.</span></div>' +
          '<div><b>الأسئلة</b><span>إدارة السؤال وخياراته وقيمه.</span></div>' +
          '<div><b>الحساب</b><span>الأدوار وخرائط KPI وEV.</span></div>' +
          '<div><b>التحقق والنشر</b><span>فحص الخادم ثم النشر أو إنشاء نسخة عمل.</span></div>' +
        '</div>' +
      '</section>' +
    '</div>';
  };
  AssessmentManager.prototype._renderStructure = function() {
    const d=this._workspaceData, pub=d.status==='published';
    const list=d.axes.map((a,index) => {
      const qs=d.questions.filter(q=>q.axis_id===a.id);
      return '<button type="button" class="workspace-axis-item '+(a.id===this._workspaceState.axisId?'active':'')+'" data-axis-select="'+esc(this,a.id)+'">' +
        '<span class="item-index">'+(index+1)+'</span>' +
        '<span class="item-main"><strong>'+esc(this,a.title_ar||a.title||a.code)+'</strong><small>'+qs.length+' سؤال</small></span>' +
        '<span class="item-meta">وزن '+esc(this,a.weight??0)+'</span>' +
      '</button>';
    }).join('') || '<div class="workspace-empty">لا توجد محاور في هذه النسخة.</div>';

    const axis=d.axes.find(a=>a.id===this._workspaceState.axisId);
    let editor='<div class="editor-card"><div class="empty-state-icon">↳</div><h3>اختر محوراً</h3><p class="editor-help">اختر محوراً من اليسار لعرض تفاصيله هنا.</p></div>';
    if(axis){
      const qs=d.questions.filter(q=>q.axis_id===axis.id).sort(byOrder);
      editor='<section class="editor-card editor-card-primary">' +
        '<div class="card-title-row"><div><div class="context-kicker">المحور المحدد</div><h3>'+esc(this,axis.title_ar||axis.title||axis.code)+'</h3><p class="editor-help">'+qs.length+' سؤال مرتبط بهذا المحور.</p></div>' +
        (pub?'<span class="scope-pill scope-locked">الهيكل مقفل</span>':'<button type="button" class="btn-danger" onclick="window.assessmentManager.deleteDraftAxis(\''+axis.id+'\',\''+d.ast.id+'\')">حذف المحور</button>') +
        '</div>' +
        '<div class="editor-form-grid">' +
          '<label>اسم المحور<input id="axis-title-workspace" data-axis-title="'+esc(this,axis.id)+'" type="text" value="'+esc(this,axis.title_ar||axis.title||'')+'" '+(pub?'disabled':'')+'></label>' +
          '<label>الوزن<input id="axis-weight-'+axis.id+'" type="number" min="0" max="100" step="0.01" value="'+esc(this,axis.weight??0)+'" '+(pub?'disabled':'')+'></label>' +
          '<label>الترتيب<input id="axis-order-'+axis.id+'" type="number" min="1" value="'+esc(this,axis.display_order??1)+'" '+(pub?'disabled':'')+'></label>' +
          '<label>دور الحساب<select id="axis-role-'+axis.id+'" '+(pub?'disabled':'')+'><option value="">— بدون دور —</option>'+ROLES.map(r=>'<option '+(this._workspaceData.ast.axis_roles?.[axis.code]===r?'selected':'')+' value="'+r+'">'+r+'</option>').join('')+'</select></label>' +
        '</div>' +
        '<div class="locked-grid"><span>الكود: <b>'+esc(this,axis.code||'—')+'</b></span><span>الأسئلة: <b>'+qs.length+'</b></span><span>الحالة: <b>'+(pub?'منشور':'مسودة')+'</b></span></div>' +
        '<div class="editor-actions">' +
          (pub?'<button type="button" class="btn-primary" onclick="window.assessmentManager.updatePublishedAxisContent(\''+axis.id+'\',document.getElementById(\'axis-title-workspace\').value,\''+d.ast.id+'\')">💾 حفظ نص المحور</button><button type="button" class="btn-secondary" onclick="window.assessmentManager.duplicateAssessment(\''+d.ast.id+'\')">📋 إنشاء نسخة عمل</button>' :
            '<button type="button" class="btn-primary" onclick="window.assessmentManager.updateDraftAxis(\''+axis.id+'\',\''+d.ast.id+'\')">💾 حفظ المحور</button><button type="button" class="btn-secondary" onclick="window.assessmentManager._workspaceNavigate(\'questions\')">الانتقال إلى أسئلة المحور</button>') +
        '</div>' +
      '</section>';
    }

    const addForm=pub?'':'<div class="inline-create"><div><strong>إضافة محور</strong><small>أنشئ المحور هنا بدل إدخاله في نافذة متفرقة.</small></div><div class="inline-create-fields"><input id="new-axis-title" type="text" placeholder="اسم المحور بالعربية"><input id="new-axis-weight" type="number" min="0" max="100" step="0.01" value="10" placeholder="الوزن"><button type="button" class="btn-primary btn-compact" onclick="window.assessmentManager.addAxisInline(\''+d.ast.id+'\')">+ إضافة</button></div></div>';

    return '<div class="workspace-split">' +
      '<aside class="workspace-list-pane"><div class="pane-head"><div><h3>المحاور</h3><span>'+d.axes.length+' محور</span></div>' +
      (pub?'':'<span class="pane-tip">اختر محوراً للفتح والتحرير.</span>') +
      '</div>'+addForm+list+'</aside>' +
      '<main class="workspace-editor-pane">'+editor+'</main>' +
    '</div>';
  };
  AssessmentManager.prototype._renderQuestions = function() {
    const d=this._workspaceData, pub=d.status==='published', axis=d.axes.find(a=>a.id===this._workspaceState.axisId);
    const axisButtons=d.axes.map(a=>'<button type="button" class="mini-chip '+(a.id===this._workspaceState.axisId?'active':'')+'" data-axis-question="'+a.id+'">'+esc(this,a.title_ar||a.code)+'</button>').join('');
    if(!axis) return '<section class="editor-card"><div class="card-title-row"><div><h3>الأسئلة</h3><p class="editor-help">لا توجد محاور محددة بعد. ارجع إلى «الهيكل» وأنشئ محوراً أولاً.</p></div><button type="button" class="btn-secondary" onclick="window.assessmentManager._workspaceNavigate(\'structure\')">← إلى الهيكل</button></div></section>';

    const qs=d.questions.filter(q=>q.axis_id===axis.id).sort(byOrder);
    const qList=qs.map((q,index)=>
      '<button type="button" class="workspace-question-item '+(q.id===this._workspaceState.questionId?'active':'')+'" data-question-select="'+q.id+'">' +
        '<span class="item-index">'+(index+1)+'</span><span class="item-main"><strong>'+esc(this,q.question_text_ar||q.question_text||'سؤال بدون نص')+'</strong><small>'+esc(this,q.code||'')+'</small></span>' +
      '</button>'
    ).join('') || '<div class="workspace-empty">لا توجد أسئلة تحت هذا المحور.</div>';

    const q=qs.find(x=>x.id===this._workspaceState.questionId);
    let editor='<section class="editor-card"><div class="empty-state-icon">?</div><h3>اختر سؤالاً</h3><p class="editor-help">اختر سؤالاً من القائمة لفتح نصه وخياراته.</p></section>';
    if(q){
      const opts=d.options.filter(o=>o.question_id===q.id).sort(byOrder);
      const optionCards=opts.map((o,i)=>
        '<article class="option-card">' +
          '<div class="option-card-head"><span class="option-number">الخيار '+(i+1)+'</span><span class="option-code">Index '+esc(this,o.option_index??i)+'</span></div>' +
          '<div class="option-fields">' +
            '<label>النص<input id="option-label-'+o.id+'" type="text" value="'+esc(this,o.label_ar||o.label||'')+'" '+(pub?'':'')+'></label>' +
            (pub?
              '<div class="readonly-stat"><span>القيمة</span><b>'+esc(this,o.option_value??0)+'</b></div><div class="readonly-stat"><span>الترتيب</span><b>'+esc(this,o.display_order??i+1)+'</b></div>' +
              '<button type="button" class="btn-secondary" onclick="window.assessmentManager.updatePublishedOptionText(\''+o.id+'\',document.getElementById(\'option-label-'+o.id+'\').value,\''+d.ast.id+'\')">💾 حفظ النص</button>' :
              '<label>القيمة <input id="option-value-'+o.id+'" type="number" min="0" max="100" step="0.01" value="'+esc(this,o.option_value??0)+'"></label>' +
              '<label>رقم الخيار <input id="option-index-'+o.id+'" type="number" min="0" value="'+esc(this,o.option_index??i)+'"></label>' +
              '<label>ترتيب العرض <input id="option-order-'+o.id+'" type="number" min="1" value="'+esc(this,o.display_order??i+1)+'"></label>' +
              '<label class="check-row"><input id="option-trap-'+o.id+'" type="checkbox" '+(o.is_trap?'checked':'')+'> Trap</label>' +
              '<div class="option-actions"><button type="button" class="btn-secondary" onclick="window.assessmentManager.updateDraftOption(\''+o.id+'\',\''+d.ast.id+'\')">💾 حفظ الخيار</button><button type="button" class="btn-danger" onclick="window.assessmentManager.deleteOption(\''+o.id+'\',\''+d.ast.id+'\')">حذف</button></div>') +
          '</div>' +
        '</article>'
      ).join('');

      const addOption=pub?'':'<div class="inline-create inline-create-option"><div><strong>إضافة خيار</strong><small>حد أقصى 5 خيارات لكل سؤال.</small></div><div class="inline-create-fields option-create-fields"><input id="new-option-label" type="text" placeholder="نص الخيار"><input id="new-option-score" type="number" min="0" max="100" step="0.01" value="0" placeholder="القيمة"><button type="button" class="btn-primary btn-compact" '+(opts.length>=5?'disabled':'')+' onclick="window.assessmentManager.addOption(\''+q.id+'\',\''+d.ast.id+'\')">+ إضافة الخيار</button></div></div>';

      editor='<section class="editor-card editor-card-primary">' +
        '<div class="card-title-row"><div><div class="context-kicker">السؤال المحدد</div><h3>'+esc(this,q.code||'السؤال')+'</h3><p class="editor-help">هذا السؤال تابع لمحور: <b>'+esc(this,axis.title_ar||axis.code)+'</b>.</p></div>' +
        (pub?'<span class="scope-pill scope-locked">المحتوى النصي فقط</span>':'<button type="button" class="btn-danger" onclick="window.assessmentManager.deleteDraftQuestion(\''+q.id+'\',\''+d.ast.id+'\')">حذف السؤال</button>') +
        '</div>' +
        '<label>نص السؤال<textarea id="question-text-workspace" data-question-text="'+q.id+'" rows="5">'+esc(this,q.question_text_ar||q.question_text||'')+'</textarea></label>' +
        (pub?
          '<div class="locked-grid"><span>الترتيب: <b>'+esc(this,q.display_order??1)+'</b></span><span>إلزامي: <b>'+(q.is_required?'نعم':'لا')+'</b></span><span>Trap: <b>'+esc(this,q.trap_index??'—')+'</b></span><span>النوع: <b>'+esc(this,q.question_type||'—')+'</b></span></div>' :
          '<div class="editor-form-grid"><label>الترتيب<input id="question-order-'+q.id+'" type="number" min="1" value="'+esc(this,q.display_order??1)+'"></label><label class="check-row"><input id="question-required-'+q.id+'" type="checkbox" '+(q.is_required?'checked':'')+'> إلزامي</label><label>Trap<input id="question-trap-'+q.id+'" type="number" min="0" value="'+esc(this,q.trap_index??'')+'"></label><label>نوع السؤال<input type="text" value="'+esc(this,q.question_type||'select')+'" disabled></label></div>') +
        '<div class="editor-actions">' +
          (pub?'<button type="button" class="btn-primary" onclick="window.assessmentManager.updatePublishedQuestionText(\''+q.id+'\',document.getElementById(\'question-text-workspace\').value,\''+d.ast.id+'\')">💾 حفظ نص السؤال</button><button type="button" class="btn-secondary" onclick="window.assessmentManager.duplicateAssessment(\''+d.ast.id+'\')">📋 نسخة عمل</button>' :
            '<button type="button" class="btn-primary" onclick="window.assessmentManager.updateDraftQuestion(\''+q.id+'\',\''+d.ast.id+'\')">💾 حفظ السؤال</button>') +
        '</div>' +
        '<div class="options-editor"><div class="section-subhead"><div><h4>خيارات الإجابة</h4><span>'+opts.length+' من 5</span></div></div>'+addOption+(optionCards||'<div class="workspace-empty">لا توجد خيارات لهذا السؤال.</div>')+'</div>' +
      '</section>';
    }

    return '<div class="axis-chip-row">'+axisButtons+'</div><div class="workspace-split"><aside class="workspace-list-pane"><div class="pane-head"><div><h3>أسئلة المحور</h3><span>'+qs.length+' سؤال</span></div>' +
      (pub?'':'<div class="inline-create compact-create"><input id="new-question-text" type="text" placeholder="نص السؤال الجديد"><button type="button" class="btn-primary btn-compact" onclick="window.assessmentManager.addQuestionInline(\''+d.ast.id+'\',\''+axis.id+'\')">+ سؤال</button></div>') +
      qList+'</aside><main class="workspace-editor-pane">'+editor+'</main></div>';
  };
  AssessmentManager.prototype._renderCalculation = function() {
    const d=this._workspaceData, pub=d.status==='published', ast=d.ast;
    const roleRows=d.axes.map(a=>
      '<label class="calc-row"><span><strong>'+esc(this,a.title_ar||a.code)+'</strong><small>'+esc(this,a.code||'')+'</small></span>' +
      '<select '+(pub?'disabled':'')+' id="calc-axis-role-'+a.id+'" data-axis-code="'+esc(this,a.code||'')+'"><option value="">— بدون دور —</option>'+
      ROLES.map(r=>'<option '+(ast.axis_roles?.[a.code]===r?'selected':'')+' value="'+r+'">'+r+'</option>').join('')+
      '</select></label>'
    ).join('');

    const mapBoxes=Object.keys(ast.kpi_mappings||{}).map(code=>
      '<div class="mapping-box"><div class="mapping-head"><div><strong>'+esc(this,code)+'</strong><small>خريطة KPI — أوزان الأدوار</small></div></div>'+
      '<textarea id="calc-kpi-'+esc(this,code)+'" rows="7" '+(pub?'disabled':'')+'>'+esc(this,JSON.stringify(ast.kpi_mappings[code]||{},null,2))+'</textarea></div>'
    ).join('');

    const evRows=ROLES.map(role=>{
      const value=ast.ev_mappings?.[role];
      return '<label class="calc-row ev-row"><span><strong>'+esc(this,role)+'</strong><small>وزن EV</small></span>'+
        '<input '+(pub?'disabled':'')+' data-ev-role="'+esc(this,role)+'" type="number" min="0" step="0.01" value="'+(value===undefined||value===null?'':esc(this,value))+'" placeholder="مثال 0.10"></label>';
    }).join('');

    return '<section class="editor-card editor-card-primary calculation-card">' +
      '<div class="card-title-row"><div><h3>الإعدادات الحسابية</h3><p class="editor-help">الأدوار وخرائط KPI وأوزان EV جزء من تعريف القياس. احفظها ثم أعد التحقق من الخادم.</p></div><span class="scope-pill '+(pub?'scope-locked':'')+'">'+(pub?'منشور — قراءة فقط':'مسودة — قابل للتعديل')+'</span></div>' +
      '<h4>ربط المحاور بالأدوار</h4><div class="calc-list">'+(roleRows||'<div class="workspace-empty">لا توجد محاور.</div>')+'</div>' +
      '<div class="mapping-section"><div class="section-subhead"><div><h4>خرائط KPI</h4><span>كل KPI = كائن أوزان للأدوار</span></div></div>'+
        '<div id="calc-kpi-list">'+(mapBoxes||'<div class="workspace-empty">لا توجد خرائط KPI.</div>')+'</div>'+
        (pub?'':'<div class="inline-create compact-create"><div><strong>إضافة KPI</strong><small>أدخل كودًا جديدًا ثم احفظ الإعدادات.</small></div><div class="inline-create-fields"><input id="new-kpi-code" type="text" placeholder="مثال TFI"><button type="button" class="btn-secondary btn-compact" onclick="window.assessmentManager.addKpiMapping(\''+ast.id+'\')">+ KPI</button></div></div>')+
      '</div>' +
      '<div class="mapping-section"><div class="section-subhead"><div><h4>أوزان EV حسب الدور</h4><span>قيمة رقمية لكل Role وفق محرك التقييم الحالي</span></div></div>'+
        '<div class="calc-list ev-weight-list">'+evRows+'</div>'+
      '</div>' +
      (pub?'<div class="locked-notice">هذه نسخة منشورة. للتعديلات الحسابية أنشئ نسخة عمل.</div>':'<div class="editor-actions editor-actions-primary"><button type="button" class="btn-primary" onclick="window.assessmentManager.saveCalculationConfig(\''+ast.id+'\')">💾 حفظ الإعدادات الحسابية</button></div>') +
    '</section>';
  };
  AssessmentManager.prototype._renderValidation = function() {
    const d=this._workspaceData, pub=d.status==='published';
    return '<div class="workspace-flow">' +
      '<section class="editor-card editor-card-primary">' +
        '<div class="card-title-row"><div><h3>التحقق قبل النشر</h3><p class="editor-help">هذا الفحص خادمي. لا يُعد نجاحاً نهائياً حتى يعيد الخادم نتيجة قابلة للقراءة.</p></div><span class="scope-pill">'+(pub?'منشور':'مسودة')+'</span></div>' +
        '<div class="validation-instructions"><b>قبل النشر</b><span>احفظ كل قسم عدّلته، ثم شغّل التحقق. أخطاء الصلاحية أو القيود ستظهر بسبب واضح وإجراء تالٍ.</span></div>' +
        '<button type="button" class="btn-primary btn-large" id="workspace-run-validation">🔎 تشغيل التحقق الآن</button>' +
        '<div id="workspace-validation-result" class="validation-result"><div class="workspace-empty">لم يُشغّل التحقق بعد.</div></div>' +
      '</section>' +
      '<section class="editor-card">' +
        '<div class="card-title-row"><div><h3>دورة الإصدار</h3><p class="editor-help">الحالة الحالية هي مصدر الحقيقة؛ لا يغيّر هذا القسم قواعد P2/P3/P4.</p></div></div>' +
        '<div class="lifecycle-box"><div class="lifecycle-state">'+(pub?'منشور':'مسودة')+'</div>' +
        (pub?
          '<p>المحتوى التحريري يمكن تعديله مباشرة. أي تعديل هيكلي أو حسابي يبدأ من نسخة عمل جديدة.</p><div class="editor-actions"><button type="button" class="btn-secondary" onclick="window.assessmentManager.duplicateAssessment(\''+d.ast.id+'\')">📋 إنشاء نسخة عمل</button></div>' :
          '<p>يمكن نشر هذه المسودة بعد اجتياز التحقق. حذفها نهائياً مسموح فقط عندما لا توجد بيانات تنفيذ مرتبطة بها.</p><div class="editor-actions"><button type="button" class="btn-primary" onclick="window.assessmentManager.publishAssessment(\''+d.ast.id+'\')">🚀 نشر المسودة</button><button type="button" class="btn-danger" id="workspace-delete-draft-secondary" onclick="window.assessmentManager.deleteAssessment(\''+d.ast.id+'\')">🗑 حذف المسودة نهائياً</button></div>') +
        '</div>' +
      '</section>' +
    '</div>';
  };
  AssessmentManager.prototype._wireWorkspaceEvents = function() {
    const root=document.getElementById('assessment-modal');
    if(!root) return;

    const markDirty=()=>this._markWorkspaceDirty(true);
    root.querySelectorAll('input:not([disabled]):not([type="button"]):not([type="submit"]), textarea:not([disabled]), select:not([disabled])').forEach(el=>{
      el.addEventListener('input',markDirty);
      el.addEventListener('change',markDirty);
    });

    root.querySelectorAll('[data-axis-select]').forEach(b=>b.addEventListener('click',()=>this._workspaceSelectAxis(b.dataset.axisSelect)));
    root.querySelectorAll('[data-axis-question]').forEach(b=>b.addEventListener('click',()=>{
      if(!this._confirmWorkspaceLeave('أسئلة المحور')) return;
      const axisId=b.dataset.axisQuestion;
      this._workspaceState.axisId=axisId;
      const axisQuestions=this._workspaceData.questions.filter(q=>q.axis_id===axisId).sort(byOrder);
      this._workspaceState.questionId=axisQuestions[0]?.id || null;
      this._workspaceState.section='questions';
      this._renderWorkspaceView();
    }));
    root.querySelectorAll('[data-question-select]').forEach(b=>b.addEventListener('click',()=>this._workspaceSelectQuestion(b.dataset.questionSelect)));

    document.getElementById('workspace-save-details')?.addEventListener('click',()=>this.saveAssessment());
    document.getElementById('workspace-run-validation')?.addEventListener('click',()=>this.runWorkspaceValidation());

    const deleteHeader=document.getElementById('workspace-delete-draft');
    if (deleteHeader) deleteHeader.onclick=()=>this.deleteAssessment(this._workspaceData?.ast?.id);

    const area=document.getElementById('modal-tab-content');
    area?.querySelectorAll('[data-section-next]').forEach(btn=>{
      btn.addEventListener('click',()=>this._workspaceNavigate(btn.dataset.sectionNext));
    });
  };
  AssessmentManager.prototype.runWorkspaceValidation = async function() {
    const d=this._workspaceData; const out=document.getElementById('workspace-validation-result'); if(!d?.ast?.id||!out) return;
    const target=d.ast.title_ar || d.ast.slug || 'التقييم';
    this._setWorkspaceStatus('saving','التحقق',target,'جاري فحص سلامة النسخة على الخادم.','لا تغلق المحرر أثناء التحقق.');
    out.innerHTML='<div class="validation-loading">جاري التحقق...</div>';
    try {
      const raw=await this.supabase.request('rpc/validate_assessment_version_secure',{method:'POST',body:JSON.stringify({p_version_id:d.ast.id})});
      const result=raw?.result ?? raw; const valid=!!result?.valid;
      const checks=result?.checks || result?.details || [];
      let html='<div class="validation-banner '+(valid?'valid':'invalid')+'"><strong>'+(valid?'النسخة اجتازت التحقق.':'النسخة تحتاج إلى إصلاحات.')+'</strong></div>';
      if(Array.isArray(checks)&&checks.length) html+='<div class="validation-checks">'+checks.map(c=>'<div><strong>'+esc(this,c.name||c.check||'فحص')+'</strong><span>'+esc(this,c.message||c.detail||String(c))+'</span></div>').join('')+'</div>';
      else html+='<pre>'+esc(this,JSON.stringify(result,null,2))+'</pre>';
      out.innerHTML=html;
      this._setWorkspaceStatus(valid?'saved':'error','التحقق',target,
        valid?'النسخة اجتازت الفحوصات الخادمية ويمكن متابعة النشر.':'توجد فحوصات تحتاج إلى إصلاح قبل النشر.',
        valid?'انتقل إلى «دورة الإصدار» للنشر.':'أصلح العناصر المشار إليها ثم أعد التحقق.');
    } catch(err) {
      const reason=this._workspaceErrorText(err);
      out.innerHTML='<div class="validation-banner invalid"><strong>لم يكتمل التحقق</strong><span>'+esc(this,reason)+'</span></div>';
      this._setWorkspaceStatus('error','التحقق',target,reason,'راجع السبب ثم أعد التحقق.');
    }
  };

  AssessmentManager.prototype.saveAssessment = async function() {
    const id = document.getElementById('ast-id')?.value || null;
    const status = this.editingAssessmentStatus || String(document.getElementById('ast-status')?.value || 'draft').toLowerCase();
    const titleAr = document.getElementById('ast-title-ar')?.value.trim() || '';
    const titleEn = document.getElementById('ast-title-en')?.value.trim() || '';
    const description = document.getElementById('ast-description')?.value.trim() || '';
    const generatedSlug = this.editingAssessmentSlug ||
      (titleEn ? titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g,'') : 'assessment-' + Date.now());
    const title = titleAr || titleEn || 'التقييم';

    if (!titleAr) {
      this._setWorkspaceStatus('error','حفظ البيانات الأساسية',title,'العنوان بالعربية مطلوب.','أدخل العنوان ثم أعد المحاولة.');
      return;
    }

    this._setWorkspaceStatus('saving','حفظ البيانات الأساسية',title,'جاري الحفظ والتحقق من القراءة من الخادم بعد العملية.');
    try {
      const raw = await this.supabase.request('rpc/save_assessment_secure', {
        method:'POST',
        body:JSON.stringify({
          p_id:id,
          p_title_ar:titleAr,
          p_title_en:titleEn,
          p_slug:generatedSlug,
          p_description:description,
          p_status:status,
          p_has_traps:!!document.getElementById('ast-has-traps')?.checked,
          p_has_ev_simulator:!!document.getElementById('ast-has-simulator')?.checked
        })
      });
      const savedId = id || this.rpcScalar(raw);
      if (!savedId) throw new Error('الخادم لم يُعد معرف التقييم المحفوظ.');
      await this.renderAssessmentsTable();
      this.populateFilterDropdown();
      this._workspaceState.lastSaved = null;
      this._markWorkspaceDirty(false);
      await this.editAssessment(savedId);
      this._setWorkspaceStatus('saved','حفظ البيانات الأساسية',this._workspaceData?.ast?.title_ar || title,'تم الحفظ وإعادة القراءة من الخادم بنجاح.','تابع التحرير أو افتح «التحقق والنشر».');
    } catch(err) {
      const reason=this._workspaceErrorText(err);
      this._setWorkspaceStatus('error','حفظ البيانات الأساسية',title,reason,'تحقق من البيانات ولم يُعتبر الحفظ ناجحاً.');
      this.showToast('فشل حفظ البيانات الأساسية: ' + reason,true);
    }
  };

  const previousShowToast = AssessmentManager.prototype.showToast;
  AssessmentManager.prototype.showToast = function(message, isError=false) {
    previousShowToast.call(this,message,isError);
    const root=document.getElementById('assessment-modal');
    if(!root || root.classList.contains('hidden')) return;
    const text=String(message||'');
    if(isError) {
      const reason=this._workspaceErrorText ? this._workspaceErrorText({message:text}) : text;
      this._setWorkspaceStatus('error','عملية التحرير','التقييم',reason,'راجع السبب ثم أعد المحاولة.');
    } else if (/اضغط حفظ|أزيلت من المحرر|أضيفت من المحرر|في المحرر/.test(text)) {
      this._setWorkspaceStatus('info','تعديل محلي',this._workspaceData?.ast?.title_ar || 'التقييم',text,'احفظ العملية من الزر الظاهر في القسم الحالي.');
      this._markWorkspaceDirty(true);
    } else if (/^(تم|تمت)\s/.test(text)) {
      const when=this._formatWorkspaceDate(this._workspaceData?.ast?.updated_at) || new Date().toLocaleString('ar-JO',{dateStyle:'short',timeStyle:'short'});
      this._workspaceState.lastSaved=when;
      this._markWorkspaceDirty(false);
      this._setWorkspaceStatus('saved','اكتملت العملية',this._workspaceData?.ast?.title_ar || 'التقييم',text,'تم تأكيد العملية من الخادم؛ يمكنك متابعة التحرير.');
    }
  };

  document.addEventListener('DOMContentLoaded',()=>{
    const root=document.getElementById('assessment-modal'); if(!root) return;
    document.querySelectorAll('.workspace-nav-btn').forEach(b=>b.addEventListener('click',()=>window.assessmentManager?window.assessmentManager._workspaceNavigate(b.dataset.section):null));
    document.getElementById('btn-close-assessment-workspace')?.addEventListener('click',()=>window.assessmentManager?.closeAssessmentWorkspace());
  });
})();