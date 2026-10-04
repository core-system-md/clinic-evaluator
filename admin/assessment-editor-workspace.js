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
    return confirm('توجد تعديلات غير محفوظة. الانتقال إلى ' + (nextLabel || 'قسم آخر') + ' سيتركها في الذاكرة فقط. احفظ التغييرات أولاً أم تابع؟');
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
    const d=this._workspaceData, published=d.status==='published';
    return '<div class="workspace-section-grid">' +
      '<section class="editor-card"><h4>بيانات التقييم</h4><p class="editor-help">هذه البيانات تُحفظ عبر عملية إدارية آمنة. الحفظ يعيد قراءة النسخة من الخادم قبل إعلان نجاحه.</p>' +
      '<div class="editor-form-grid"><label>العنوان بالعربية<input id="ast-title-ar" type="text" required value="'+esc(this,d.ast.title_ar||'')+'"></label><label>العنوان بالإنجليزية<input id="ast-title-en" type="text" value="'+esc(this,d.ast.title_en||'')+'"></label><label class="wide">الوصف التشخيصي<textarea id="ast-description" rows="3">'+esc(this,d.ast.description||'')+'</textarea></label></div>' +
      '<div class="editor-meta-row"><span>الحالة: <strong>'+(published?'منشور':'مسودة')+'</strong></span><span>النفاذ: '+(published?'محتوى منشور':'نسخة عمل')+'</span></div>' +
      '<div class="editor-actions"><button type="button" class="btn-primary" id="workspace-save-details">💾 حفظ البيانات الأساسية</button>'+(published?'':'<span class="editor-help-inline">النشر يتم من قسم «التحقق والنشر» فقط.</span>')+'</div></section>' +
      '<section class="editor-card"><h4>ملخص الحالة</h4><div class="summary-grid"><div><span>Family</span><strong>'+esc(this,d.family?.slug || d.ast.family_id || '—')+'</strong></div><div><span>الهيكل</span><strong>'+d.axes.length+' محاور</strong></div><div><span>الأسئلة</span><strong>'+d.questions.length+'</strong></div><div><span>الخيارات</span><strong>'+d.options.length+'</strong></div></div></section></div>';
  };

  AssessmentManager.prototype._renderStructure = function() {
    const d=this._workspaceData, pub=d.status==='published';
    let list=d.axes.map(a => {
      const qs=d.questions.filter(q=>q.axis_id===a.id);
      return '<button type="button" class="workspace-axis-item '+(a.id===this._workspaceState.axisId?'active':'')+'" data-axis-select="'+esc(this,a.id)+'"><strong>'+esc(this,a.title_ar||a.title||a.code)+'</strong><span>'+qs.length+' سؤال · وزن '+esc(this,a.weight??0)+'</span></button>'; }).join('');
    if(!list) list='<div class="workspace-empty">لا توجد محاور بعد.</div>';
    const axis=d.axes.find(a=>a.id===this._workspaceState.axisId);
    let editor='<div class="workspace-empty">اختر محوراً من القائمة.</div>';
    if(axis){
      const qs=d.questions.filter(q=>q.axis_id===axis.id).sort(byOrder);
      editor='<section class="editor-card"><div class="editor-card-head"><div><h4>'+esc(this,axis.title_ar||axis.title||axis.code)+'</h4><p class="editor-help">'+qs.length+' سؤال مرتبط بهذا المحور.</p></div>'+(pub?'':'<button type="button" class="btn-danger" onclick="window.assessmentManager.deleteDraftAxis(\''+axis.id+'\',\''+d.ast.id+'\')">حذف المحور</button>')+'</div>' +
        '<div class="editor-form-grid"><label>اسم المحور<input '+(pub?'':'data-axis-title="'+esc(this,axis.id)+'" ')+'id="axis-title-workspace" type="text" value="'+esc(this,axis.title_ar||axis.title||'')+'"></label>' +
        (pub?'<label>الوزن<input type="text" value="'+esc(this,axis.weight??0)+'" disabled></label>':'<label>الوزن<input id="axis-weight-'+axis.id+'" type="number" min="0" max="100" step="0.01" value="'+esc(this,axis.weight??0)+'"></label>') +
        (pub?'<label>الترتيب<input type="text" value="'+esc(this,axis.display_order??1)+'" disabled></label>':'<label>الترتيب<input id="axis-order-'+axis.id+'" type="number" min="1" value="'+esc(this,axis.display_order??1)+'"></label>') +
        (pub?'<label>الدور<input type="text" value="— (يتطلب نسخة عمل للتغيير)" disabled></label>':'<label>الدور<select id="axis-role-'+axis.id+'"><option value="">— بدون دور —</option>'+ROLES.map(r=>'<option '+(this._workspaceData.ast.axis_roles?.[axis.code]===r?'selected':'')+' value="'+r+'">'+r+'</option>').join('')+'</select></label>') + '</div>' +
        '<div class="editor-actions">'+(pub?'<button type="button" class="btn-primary" onclick="window.assessmentManager.updatePublishedAxisContent(\''+axis.id+'\',document.getElementById(\'axis-title-workspace\').value,\''+d.ast.id+'\')">حفظ نص المحور</button><button type="button" class="btn-secondary" onclick="window.assessmentManager.duplicateAssessment(\''+d.ast.id+'\')">📋 إنشاء نسخة عمل للتعديل الهيكلي</button>':'<button type="button" class="btn-primary" onclick="window.assessmentManager.updateDraftAxis(\''+axis.id+'\',\''+d.ast.id+'\')">💾 حفظ المحور</button><button type="button" class="btn-secondary" onclick="window.assessmentManager._workspaceNavigate(\'questions\')">الانتقال إلى أسئلته</button>')+'</div></section>';
    }
    return '<div class="workspace-split"><aside class="workspace-list-pane"><div class="pane-head"><h4>المحاور</h4>'+(pub?'':'<button type="button" class="btn-primary btn-compact" onclick="window.assessmentManager.addAxisInline(\''+d.ast.id+'\')">+ محور</button>')+'</div>'+list+'</aside><main class="workspace-editor-pane">'+editor+'</main></div>';
  };

  AssessmentManager.prototype._renderQuestions = function() {
    const d=this._workspaceData, pub=d.status==='published', axis=d.axes.find(a=>a.id===this._workspaceState.axisId);
    const axisButtons=d.axes.map(a=>'<button type="button" class="mini-chip '+(a.id===this._workspaceState.axisId?'active':'')+'" data-axis-question="'+a.id+'">'+esc(this,a.title_ar||a.code)+'</button>').join('');
    if(!axis) return '<div class="editor-card"><h4>الأسئلة</h4><p class="editor-help">لا توجد محاور. أنشئ محوراً أولاً من قسم «الهيكل».</p></div>';
    const qs=d.questions.filter(q=>q.axis_id===axis.id).sort(byOrder);
    const qList=qs.map(q=>'<button type="button" class="workspace-question-item '+(q.id===this._workspaceState.questionId?'active':'')+'" data-question-select="'+q.id+'"><strong>'+esc(this,q.question_text_ar||q.question_text||'سؤال بدون نص')+'</strong><span>'+esc(this,q.code||'')+'</span></button>').join('') || '<div class="workspace-empty">لا توجد أسئلة تحت هذا المحور.</div>';
    const q=qs.find(x=>x.id===this._workspaceState.questionId);
    let editor='<div class="workspace-empty">اختر سؤالاً من القائمة.</div>';
    if(q){
      const opts=d.options.filter(o=>o.question_id===q.id).sort(byOrder);
      editor='<section class="editor-card"><div class="editor-card-head"><div><h4>السؤال</h4><p class="editor-help">'+esc(this,q.code||'—')+'</p></div>'+(pub?'':'<button type="button" class="btn-danger" onclick="window.assessmentManager.deleteDraftQuestion(\''+q.id+'\',\''+d.ast.id+'\')">حذف السؤال</button>')+'</div>' +
      '<label>نص السؤال<textarea '+(pub?'':'data-question-text="'+q.id+'" ')+'id="question-text-workspace" rows="4">'+esc(this,q.question_text_ar||q.question_text||'')+'</textarea></label>' +
      (pub?'<div class="locked-grid"><span>الترتيب: '+esc(this,q.display_order??1)+'</span><span>إلزامي: '+(q.is_required?'نعم':'لا')+'</span><span>Trap: '+esc(this,q.trap_index??'—')+'</span></div>':'<div class="editor-form-grid"><label>الترتيب<input id="question-order-'+q.id+'" type="number" min="1" value="'+esc(this,q.display_order??1)+'"></label><label class="check"><input id="question-required-'+q.id+'" type="checkbox" '+(q.is_required?'checked':'')+'> إلزامي</label><label>Trap<input id="question-trap-'+q.id+'" type="number" min="0" value="'+esc(this,q.trap_index??'')+'"></label></div>') +
      '<div class="editor-actions">'+(pub?'<button type="button" class="btn-primary" onclick="window.assessmentManager.updatePublishedQuestionText(\''+q.id+'\',document.getElementById(\'question-text-workspace\').value,\''+d.ast.id+'\')">حفظ نص السؤال</button><button type="button" class="btn-secondary" onclick="window.assessmentManager.duplicateAssessment(\''+d.ast.id+'\')">📋 نسخة عمل</button>':'<button type="button" class="btn-primary" onclick="window.assessmentManager.updateDraftQuestion(\''+q.id+'\',\''+d.ast.id+'\')">💾 حفظ السؤال</button>')+'</div>' +
      '<div class="options-editor"><div class="editor-card-head"><h4>خيارات الإجابة ('+opts.length+')</h4>'+(pub?'':'<button type="button" class="btn-primary btn-compact" '+(opts.length>=5?'disabled':'')+' onclick="window.assessmentManager.addOption(\''+q.id+'\',\''+d.ast.id+'\')">+ خيار</button>')+'</div>' +
      (opts.map((o,i)=>'<div class="option-editor"><div class="option-index">'+(i+1)+'</div>'+(pub?'<input id="option-label-'+o.id+'" type="text" value="'+esc(this,o.label_ar||o.label||'')+'"><button type="button" class="btn-secondary btn-compact" onclick="window.assessmentManager.updatePublishedOptionText(\''+o.id+'\',document.getElementById(\'option-label-'+o.id+'\').value,\''+d.ast.id+'\')">حفظ النص</button>':'<input id="option-label-'+o.id+'" type="text" value="'+esc(this,o.label_ar||o.label||'')+'"><input id="option-value-'+o.id+'" type="number" min="0" max="100" step="0.01" value="'+esc(this,o.option_value??0)+'"><input id="option-index-'+o.id+'" type="number" min="0" value="'+esc(this,o.option_index??i)+'"><input id="option-order-'+o.id+'" type="number" min="1" value="'+esc(this,o.display_order??i+1)+'"><label class="check"><input id="option-trap-'+o.id+'" type="checkbox" '+(o.is_trap?'checked':'')+'> Trap</label><button type="button" class="btn-secondary btn-compact" onclick="window.assessmentManager.updateDraftOption(\''+o.id+'\',\''+d.ast.id+'\')">حفظ</button><button type="button" class="btn-danger btn-compact" onclick="window.assessmentManager.deleteOption(\''+o.id+'\',\''+d.ast.id+'\')">حذف</button>')+'</div>').join('') || '<div class="workspace-empty">لا توجد خيارات لهذا السؤال.</div>') + '</div></section>';
    }
    return '<div class="axis-chip-row">'+axisButtons+'</div><div class="workspace-split"><aside class="workspace-list-pane"><div class="pane-head"><h4>أسئلة المحور</h4>'+(pub?'':'<button type="button" class="btn-primary btn-compact" onclick="window.assessmentManager.addQuestionInline(\''+d.ast.id+'\',\''+axis.id+'\')">+ سؤال</button>')+'</div>'+qList+'</aside><main class="workspace-editor-pane">'+editor+'</main></div>';
  };

  AssessmentManager.prototype._renderCalculation = function() {
    const d=this._workspaceData, pub=d.status==='published', ast=d.ast;
    const roles=Object.keys(ast.axis_roles||{}); const kpis=Object.keys(ast.kpi_mappings||{}); const evs=Object.keys(ast.ev_mappings||{});
    const roleRows=d.axes.map(a=>'<label class="calc-row"><span>'+esc(this,a.title_ar||a.code)+'</span><select '+(pub?'disabled':'')+' id="calc-axis-role-'+a.id+'" data-axis-code="'+esc(this,a.code||'')+'"><option value="">— بدون دور —</option>'+ROLES.map(r=>'<option '+(ast.axis_roles?.[a.code]===r?'selected':'')+' value="'+r+'">'+r+'</option>').join('')+'</select></label>').join('');
    const mapBoxes=(kind,obj)=>Object.keys(obj||{}).map(code=>'<div class="mapping-box"><div class="mapping-head"><strong>'+esc(this,code)+'</strong>'+(pub?'':'<button type="button" class="btn-danger btn-compact" onclick="window.assessmentManager.remove'+kind+'Mapping(\''+esc(this,code)+'\',\''+ast.id+'\')">حذف</button>')+'</div><textarea id="calc-'+kind.toLowerCase()+'-'+esc(this,code)+'" rows="5" '+(pub?'disabled':'')+'>'+esc(this,JSON.stringify(obj[code]||{},null,2))+'</textarea></div>').join('');
    return '<section class="editor-card calculation-card"><h4>الإعدادات الحسابية</h4><p class="editor-help">الأدوار وKPI وEV جزء من تعريف القياس. لا تُغيّر في النسخة المنشورة.</p><h5>ربط المحاور بالأدوار</h5><div class="calc-list">'+roleRows+'</div><h5>خرائط KPI</h5><div class="mapping-list" id="calc-kpi-list">'+(mapBoxes('Kpi',ast.kpi_mappings)+'<button type="button" class="btn-secondary btn-compact" '+(pub?'disabled':'')+' onclick="window.assessmentManager.addKpiMapping(\''+ast.id+'\')">+ KPI</button>')+'</div><h5>خرائط EV</h5><div class="mapping-list" id="calc-ev-list">'+(mapBoxes('Ev',ast.ev_mappings)+'<button type="button" class="btn-secondary btn-compact" '+(pub?'disabled':'')+' onclick="window.assessmentManager.addEvMapping(\''+ast.id+'\')">+ خريطة EV</button>')+'</div>'+(pub?'<div class="locked-notice">هذه نسخة منشورة. للتعديلات الحسابية أنشئ نسخة عمل.</div>':'<div class="editor-actions"><button type="button" class="btn-primary" onclick="window.assessmentManager.saveCalculationConfig(\''+ast.id+'\')">💾 حفظ الإعدادات الحسابية</button></div>')+'</section>';
  };

  AssessmentManager.prototype._renderValidation = function() {
    const d=this._workspaceData, pub=d.status==='published';
    return '<div class="workspace-section-grid"><section class="editor-card"><h4>التحقق قبل النشر</h4><p class="editor-help">يستخدم هذا القسم نفس دالة التحقق الخادمية المعتمدة قبل publication. لا يوجد تحقق دلالي بالذكاء الاصطناعي هنا.</p><button type="button" class="btn-primary" id="workspace-run-validation">🔎 تشغيل التحقق الآن</button><div id="workspace-validation-result" class="validation-result"><div class="workspace-empty">لم يُشغّل التحقق بعد.</div></div></section><section class="editor-card"><h4>دورة النشر</h4><div class="lifecycle-box"><strong>الحالة الحالية: '+(pub?'منشور':'مسودة')+'</strong><p>'+ (pub?'التعديل الهيكلي يتطلب نسخة عمل جديدة.':'هذه المسودة يمكن نشرها بعد اجتياز التحقق.')+'</p>' + (pub?'<button type="button" class="btn-secondary" onclick="window.assessmentManager.duplicateAssessment(\''+d.ast.id+'\')">📋 إنشاء نسخة عمل</button>':'<button type="button" class="btn-primary" onclick="window.assessmentManager.publishAssessment(\''+d.ast.id+'\')">🚀 نشر المسودة</button>')+'</div></section></div>';
  };

  AssessmentManager.prototype._wireWorkspaceEvents = function() {
    const form=document.getElementById('assessment-form');
    ['ast-title-ar','ast-title-en','ast-description'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>this._markWorkspaceDirty(true)));
    document.querySelectorAll('[data-axis-select]').forEach(b=>b.addEventListener('click',()=>this._workspaceSelectAxis(b.dataset.axisSelect)));
    document.querySelectorAll('[data-axis-question]').forEach(b=>b.addEventListener('click',()=>{this._workspaceState.axisId=b.dataset.axisQuestion; this._workspaceSelectAxis(b.dataset.axisQuestion);}));
    document.querySelectorAll('[data-question-select]').forEach(b=>b.addEventListener('click',()=>this._workspaceSelectQuestion(b.dataset.questionSelect)));
    document.getElementById('workspace-save-details')?.addEventListener('click',()=>this.saveAssessment());
    document.getElementById('workspace-run-validation')?.addEventListener('click',()=>this.runWorkspaceValidation());
  };

  AssessmentManager.prototype.runWorkspaceValidation = async function() {
    const d=this._workspaceData; const out=document.getElementById('workspace-validation-result'); if(!d?.ast?.id||!out) return;
    this._setWorkspaceStatus('saving','التحقق','التقييم','جاري فحص سلامة النسخة على الخادم.'); out.innerHTML='<div class="validation-loading">جاري التحقق...</div>';
    try {
      const raw=await this.supabase.request('rpc/validate_assessment_version_secure',{method:'POST',body:JSON.stringify({p_version_id:d.ast.id})});
      const result=raw?.result ?? raw; const valid=!!result?.valid;
      const checks=result?.checks || result?.details || [];
      let html='<div class="validation-banner '+(valid?'valid':'invalid')+'"><strong>'+(valid?'النسخة اجتازت التحقق.':'النسخة تحتاج إلى إصلاحات.')+'</strong></div>';
      if(Array.isArray(checks)&&checks.length) html+='<div class="validation-checks">'+checks.map(c=>'<div><strong>'+esc(this,c.name||c.check||'فحص')+'</strong><span>'+esc(this,c.message||c.detail||String(c))+'</span></div>').join('')+'</div>';
      else html+='<pre>'+esc(this,JSON.stringify(result,null,2))+'</pre>';
      out.innerHTML=html; this._setWorkspaceStatus('saved','التحقق','التقييم',valid?'لا توجد مشكلة تمنع النشر وفق نتيجة الخادم.':'راجع الفحوصات المعروضة قبل محاولة النشر.');
    } catch(err) { out.innerHTML='<div class="validation-banner invalid"><strong>فشل تشغيل التحقق</strong><span>'+esc(this,err.message)+'</span></div>'; this._setWorkspaceStatus('error','التحقق','التقييم',err.message,'صحح الخطأ ثم أعد التحقق.'); }
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
      this._workspaceState.lastSaved = new Date().toLocaleString('ar-JO',{dateStyle:'short',timeStyle:'short'});
      this._markWorkspaceDirty(false);
      this._workspaceState.axisId = null;
      this._workspaceState.questionId = null;
      await this.editAssessment(savedId);
      this._setWorkspaceStatus('saved','حفظ البيانات الأساسية',title,'تم الحفظ وإعادة القراءة من الخادم بنجاح.','تابع التحرير أو افتح «التحقق والنشر».');
    } catch(err) {
      this._setWorkspaceStatus('error','حفظ البيانات الأساسية',title,err.message,'تحقق من البيانات ولم يُعتبر الحفظ ناجحاً.');
      this.showToast('فشل حفظ البيانات الأساسية: ' + err.message,true);
    }
  };

  const previousShowToast = AssessmentManager.prototype.showToast;
  AssessmentManager.prototype.showToast = function(message, isError=false) {
    previousShowToast.call(this,message,isError);
    const root=document.getElementById('assessment-modal');
    if(!root || root.classList.contains('hidden')) return;
    const text=String(message||'');
    if(isError) {
      this._setWorkspaceStatus('error','عملية التحرير','التقييم',text,'راجع السبب ثم أعد المحاولة.');
      return;
    }
    const pending = /إلى المحرر|اضغط حفظ/i.test(text);
    if(pending) {
      this._setWorkspaceStatus('info','تعديل محلي','التقييم',text,'اضغط زر الحفظ الظاهر في هذا القسم.');
      return;
    }
    const persisted = /حفظ|تحديث|حذف|إضافة|إنشاء|استعادة|نشر|إيقاف|تمت|تمتة|تم /i.test(text);
    if(persisted) {
      this._workspaceState.lastSaved = new Date().toLocaleString('ar-JO',{dateStyle:'short',timeStyle:'short'});
      this._markWorkspaceDirty(false);
      this._setWorkspaceStatus('saved','عملية التحرير','التقييم',text,'تم تحديث حالة المحرر من نتيجة العملية.');
    }
  };

  document.addEventListener('DOMContentLoaded',()=>{
    const root=document.getElementById('assessment-modal'); if(!root) return;
    document.querySelectorAll('.workspace-nav-btn').forEach(b=>b.addEventListener('click',()=>window.assessmentManager?window.assessmentManager._workspaceNavigate(b.dataset.section):null));
    document.getElementById('btn-close-assessment-workspace')?.addEventListener('click',()=>window.assessmentManager?.closeAssessmentWorkspace());
  });
})();