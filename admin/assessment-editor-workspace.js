/* CORE System — P5 responsive assessment editor workspace */
(function () {
  'use strict';

  const ROLES = ['TRUST','COMMUNICATION','CONVERSION','RETENTION','LOYALTY','SCHEDULING','RECEPTION','ADMIN','COORDINATION','JOURNEY','OPERATIONS','TEAM','GROWTH','PROFESSIONALISM','TEAMWORK'];

  const esc = (m,v) => m.escapeHtml ? m.escapeHtml(String(v ?? '')) : String(v ?? '');
  const cleanStatus = ast => String(ast?.status || 'draft').toLowerCase();
  const byOrder = (a,b) => (Number(a.display_order)||0) - (Number(b.display_order)||0);

  AssessmentManager.prototype._workspaceState = AssessmentManager.prototype._workspaceState || { section:'overview', axisId:null, questionId:null, dirty:false, lastSaved:null, mode:null };

  AssessmentManager.prototype._setWorkspaceStatus = function (kind, operation, target, detail, nextAction) {
    const el = document.getElementById('workspace-operation-status');
    if (!el) return;
    const labels = {saving:'جاري الحفظ', saved:'تم الحفظ', error:'تعذر الحفظ', info:'معلومة'};
    const cls = kind === 'error' ? 'is-error' : kind === 'saved' ? 'is-saved' : kind === 'saving' ? 'is-saving' : '';
    el.className = 'workspace-status ' + cls;
    el.innerHTML = '<strong>' + esc(this, labels[kind] || kind) + '</strong><span>' + esc(this, operation || 'عملية') + ' → ' + esc(this, target || 'التقييم') + '</span>' + (detail ? '<span>' + esc(this, detail) + '</span>' : '') + (nextAction ? '<span>الخطوة التالية: ' + esc(this, nextAction) + '</span>' : '');
  };

  AssessmentManager.prototype._markWorkspaceDirty = function (dirty) {
    this._workspaceState.dirty = !!dirty;
    const badge = document.getElementById('workspace-dirty-badge');
    if (badge) { badge.textContent = dirty ? 'تعديلات غير محفوظة' : 'كل التعديلات محفوظة'; badge.className = 'workspace-dirty ' + (dirty ? 'dirty' : 'clean'); }
  };

  AssessmentManager.prototype._workspaceNavigate = function(section) {
    this._workspaceState.section = section;
    this._renderWorkspaceView();
  };

  AssessmentManager.prototype._workspaceSelectAxis = function(axisId) {
    this._workspaceState.axisId = axisId;
    const questions = this._workspaceData.questions.filter(q => q.axis_id === axisId).sort(byOrder);
    if (!questions.some(q => q.id === this._workspaceState.questionId)) this._workspaceState.questionId = questions[0]?.id || null;
    this._workspaceState.section = 'structure';
    this._renderWorkspaceView();
  };

  AssessmentManager.prototype._workspaceSelectQuestion = function(questionId) {
    this._workspaceState.questionId = questionId;
    this._workspaceState.section = 'questions';
    this._renderWorkspaceView();
  };

  AssessmentManager.prototype.closeAssessmentWorkspace = function() {
    if (this._workspaceState.dirty && !confirm('لديك تعديلات غير محفوظة في بيانات التقييم الأساسية. مغادرة المحرر الآن؟')) return;
    document.getElementById('assessment-modal')?.classList.add('hidden');
    document.getElementById('dashboard-content')?.classList.remove('editor-mode');
    this._workspaceState.dirty = false;
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
      this._setWorkspaceStatus('saved','فتح المحرر',this._workspaceData.ast.title_ar || this._workspaceData.ast.slug,'تم تحميل أحدث نسخة من الخادم.');
      this._renderWorkspaceView();
      document.getElementById('assessment-modal')?.classList.remove('hidden');
      document.getElementById('dashboard-content')?.classList.add('editor-mode');
      window.scrollTo({top:0,behavior:'smooth'});
    } catch (err) {
      this.showToast('تعذر فتح المحرر: ' + err.message, true);
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
    const form = document.getElementById('assessment-form');
    if (!form) return;
    document.getElementById('ast-id').value = d.ast.id || '';
    document.getElementById('ast-title-ar').value = d.ast.title_ar || '';
    document.getElementById('ast-title-en').value = d.ast.title_en || '';
    document.getElementById('ast-description').value = d.ast.description || '';
    document.getElementById('ast-status').value = d.status === 'published' ? 'Published' : 'Draft';
    document.getElementById('ast-status').disabled = true;
    document.getElementById('ast-has-traps').checked = !!d.ast.has_traps;
    document.getElementById('ast-has-simulator').checked = !!d.ast.has_ev_simulator;
    document.getElementById('ast-has-traps').disabled = d.status === 'published';
    document.getElementById('ast-has-simulator').disabled = d.status === 'published';
    const title = document.getElementById('assessment-modal-title');
    if (title) title.textContent = isNew ? 'إنشاء تقييم استشاري جديد' : (d.status === 'published' ? 'تحرير محتوى منشور' : 'تحرير مسودة عمل');
    const familyLabel = d.family?.slug || d.ast.family_id || '—';
    document.getElementById('workspace-assessment-name').textContent = d.ast.title_ar || 'تقييم جديد';
    document.getElementById('workspace-family').textContent = familyLabel;
    document.getElementById('workspace-status').textContent = d.status === 'published' ? 'منشور' : 'مسودة';
    document.getElementById('workspace-version').textContent = d.ast.slug || 'سيُحدد بعد الحفظ';
    document.getElementById('workspace-counts').textContent = d.axes.length + ' محاور · ' + d.questions.length + ' سؤالاً · ' + d.options.length + ' خيارات';
    const lastSaved = document.getElementById('workspace-last-saved');
    if (lastSaved) lastSaved.textContent = this._workspaceState.lastSaved ? 'آخر حفظ: ' + this._workspaceState.lastSaved : 'آخر حفظ: —';
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
      '<div class="editor-form-grid"><label>العنوان بالعربية<input id="ast-title-ar" type="text" required value=""></label><label>العنوان بالإنجليزية<input id="ast-title-en" type="text" value=""></label><label class="wide">الوصف التشخيصي<textarea id="ast-description" rows="3"></textarea></label></div>' +
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

  const originalSave = AssessmentManager.prototype.saveAssessment;
  AssessmentManager.prototype.saveAssessment = async function() {
    const title=document.getElementById('ast-title-ar')?.value.trim();
    const id=document.getElementById('ast-id')?.value || null;
    if(!title) return this._setWorkspaceStatus('error','حفظ البيانات الأساسية','العنوان','العنوان بالعربية مطلوب.','أدخل عنواناً ثم حاول الحفظ مجدداً.');
    this._setWorkspaceStatus('saving','حفظ البيانات الأساسية',title,'جاري تنفيذ العملية والتحقق من persistence.');
    try {
      await originalSave.call(this);
      if(id || document.getElementById('ast-id')?.value) { this._workspaceState.lastSaved=new Date().toLocaleString('ar-JO',{dateStyle:'short',timeStyle:'short'}); this._markWorkspaceDirty(false); this._setWorkspaceStatus('saved','حفظ البيانات الأساسية',title,'تمت إعادة القراءة من الخادم.','يمكن متابعة التحرير أو التحقق والنشر.'); }
    } catch(err) { this._setWorkspaceStatus('error','حفظ البيانات الأساسية',title,err.message,'لم يعتمد أي نجاح؛ راجع الرسالة ثم أعد المحاولة.'); throw err; }
  };

  document.addEventListener('DOMContentLoaded',()=>{
    const root=document.getElementById('assessment-modal'); if(!root) return;
    document.querySelectorAll('.workspace-nav-btn').forEach(b=>b.addEventListener('click',()=>window.assessmentManager?window.assessmentManager._workspaceNavigate(b.dataset.section):null));
    document.getElementById('btn-close-assessment-workspace')?.addEventListener('click',()=>window.assessmentManager?.closeAssessmentWorkspace());
  });
})();