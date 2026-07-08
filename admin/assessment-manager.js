/**
 * CORE System — Assessment Manager v3.0 (Dynamic Consultative Dashboard)
 * =======================================================================
 * القوانين المعتمدة: الالتزام بالهوية البصرية الحالية + تحويل النسب إلى تقارير نصية عربية
 * المخرجات: تفاصيل العيادة، الأولوية التشغيلية القصوى، وفخاخ التناقض السلوكي نصياً.
 * =======================================================================
 */

class AssessmentManager {
    constructor(dashboard) {
        // دعم استقبال كائن الداشبورد أو السيرفر مباشرة لضمان مرونة الربط السحابي
        this.dashboard = dashboard || {};
        this.supabase = dashboard.supabase || window.supabaseClient;
        this.activeLeadData = null;
    }

    async init() {
        const container = document.getElementById('assessments-table-container');
        if (container) {
            container.innerHTML = `
                <div style="padding:16px; background:#f0fdf4; border-right:4px solid #0f766e; border-radius:8px; margin-bottom:16px; font-weight:600; color:#115e59;">
                    🔄 جاري الاتصال الآمن بالسحاب وجلب السجلات الاستشارية للأطباء والمراكز...
                </div>
            `;
        }
        await this.renderAssessmentsTable();
    }

    /**
     * جلب وبناء جدول طلبات التقييم المنجزة
     */
    async renderAssessmentsTable() {
        const container = document.getElementById('assessments-table-container');
        if (!container) return;

        try {
            if (!this.supabase) {
                container.innerHTML = '<div style="color:#991b1b; padding:16px; background:#fef2f2; border-radius:8px; font-weight:700;">⚠️ خطأ: نظام الاتصال بالسحاب (Supabase) غير متصل حالياً.</div>';
                return;
            }

            // جلب سجلات الأطباء والمراكز المرتبة من الأحدث إلى الأقدم
            const leads = await this.supabase.select('leads', {
                order: { column: 'created_at', direction: 'desc' }
            });

            if (!leads || leads.length === 0) {
                container.innerHTML = '<div style="padding:20px; text-align:center; color:#6b7280; font-weight:600;">📭 لا توجد تقييمات أو سجلات منجزة حالياً في قاعدة البيانات السحابية.</div>';
                return;
            }

            // بناء الجدول مع الحفاظ المطلق على الخطوط والألوان والهوية البصرية الحالية للموقع
            let html = `
                <div style="overflow-x:auto; background:#ffffff; border-radius:12px; border:1px solid #e5e7eb; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                    <table style="width:100%; border-collapse:collapse; text-align:right; font-size:0.95rem;">
                        <thead>
                            <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0; color:#334155;">
                                <th style="padding:14px 16px; font-weight:700;">صاحب التقييم / العيادة</th>
                                <th style="padding:14px 16px; font-weight:700;">التخصص والبلد</th>
                                <th style="padding:14px 16px; font-weight:700; text-align:center;">معدل الكفاءة العام</th>
                                <th style="padding:14px 16px; font-weight:700; text-align:center;">الحالة التشغيلية</th>
                                <th style="padding:14px 16px; font-weight:700; text-align:center;">الإجراء</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            leads.forEach(lead => {
                const score = lead.score_percentage !== null ? parseFloat(lead.score_percentage) : null;
                
                // ترجمة النسب إلى مراحل نمو نصية معبرة بالعربية الفصحى تبعاً للمحرك الحسابي
                let statusBadge = '';
                if (lead.completed) {
                    if (score >= 75) statusBadge = `<span style="background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:20px; font-weight:700; font-size:0.85rem;">🏆 مرحلة الريادة</span>`;
                    else if (score >= 50) statusBadge = `<span style="background:#f0f9ff; color:#0369a1; padding:4px 10px; border-radius:20px; font-weight:700; font-size:0.85rem;">📈 مرحلة النمو</span>`;
                    else if (score >= 25) statusBadge = `<span style="background:#fef3c7; color:#b45309; padding:4px 10px; border-radius:20px; font-weight:700; font-size:0.85rem;">🔄 مرحلة التفعيل</span>`;
                    else statusBadge = `<span style="background:#fef2f2; color:#b91c1c; padding:4px 10px; border-radius:20px; font-weight:700; font-size:0.85rem;">⚠️ فجوة هيكلية</span>`;
                } else {
                    statusBadge = `<span style="background:#f1f5f9; color:#64748b; padding:4px 10px; border-radius:20px; font-weight:600; font-size:0.85rem;">⏳ قيد الإجراء</span>`;
                }

                const displayScore = score !== null ? `${score.toFixed(1)}%` : '---';
                const specialtyText = this.translateSpecialty(lead.specialty);
                const countryFlag = lead.country === 'JO' ? '🇯🇴 الأردن' : lead.country === 'SA' ? '🇸🇦 السعودية' : lead.country || '🌍 أخرى';

                html += `
                    <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                        <td style="padding:14px 16px;">
                            <div style="font-weight:700; color:#0f172a;">${lead.full_name || 'طبيب غير معروف'}</div>
                            <div style="font-size:0.85rem; color:#64748b; margin-top:2px;">🏠 ${lead.clinic_name || 'بدون اسم عيادة'}</div>
                        </td>
                        <td style="padding:14px 16px; color:#334155;">
                            <div>${specialtyText}</div>
                            <div style="font-size:0.85rem; color:#64748b; margin-top:2px;">${countryFlag}</div>
                        </td>
                        <td style="padding:14px 16px; text-align:center; font-weight:800; color:#0f766e; font-size:1.1rem;">
                            ${displayScore}
                        </td>
                        <td style="padding:14px 16px; text-align:center;">
                            ${statusBadge}
                        </td>
                        <td style="padding:14px 16px; text-align:center;">
                            <button class="btn-view-report" data-lead-id="${lead.id}" style="padding:8px 16px; background:#0f766e; color:#ffffff; border:none; border-radius:6px; font-family:inherit; font-size:0.85rem; font-weight:600; cursor:pointer; transition:all 0.2s; display:inline-flex; align-items:center; gap:6px;">
                                👁️ استعراض التقرير النصي
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += '</tbody></table></div>';
            
            // حقن جدول العرض والتحضير لحقن شاشة عرض التفاصيل الاستشارية دون تداخل بصري
            container.innerHTML = html + `<div id="consultative-details-modal" style="display:none; margin-top:24px;"></div>`;
            this.attachClickHandlers();

        } catch (err) {
            container.innerHTML = `<div style="color:#991b1b; padding:16px; background:#fef2f2; border-radius:8px; font-weight:700;">❌ فشل تحميل البيانات من السحاب: ${err.message}</div>`;
        }
    }

    /**
     * ربط أحداث الأزرار ديناميكياً لتجنب التجميد الصامت في الهواتف
     */
    attachClickHandlers() {
        const buttons = document.querySelectorAll('.btn-view-report');
        buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const leadId = btn.getAttribute('data-lead-id');
                await this.showLeadConsultativeReport(leadId);
            });
        });
    }

    /**
     * معالجة واستعراض التقرير الاستشاري النصي الشامل باللغة العربية
     */
    async showLeadConsultativeReport(leadId) {
        const detailsContainer = document.getElementById('consultative-details-modal');
        if (!detailsContainer) return;

        detailsContainer.style.display = 'block';
        detailsContainer.innerHTML = `
            <div style="padding:20px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; text-align:center; font-weight:600; color:#475569;">
                ⏳ جاري مراجعة وتحليل السجل السلوكي للعيادة واستدعاء التوجيهات النصية...
            </div>
        `;
        
        // التمرير السلس للشاشة لضمان الرؤية على أجهزة الهاتف
        detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

        try {
            // 1. جلب بيانات صاحب الطلب الأساسية
            const leadRes = await this.supabase.select('leads', { filter: { id: leadId } });
            if (!leadRes || !leadRes[0]) {
                detailsContainer.innerHTML = '<div style="color:red; padding:12px;">❌ تعذر العثور على بيانات صاحب التقييم.</div>';
                return;
            }
            const lead = leadRes[0];

            // 2. جلب دراجات المحاور التفصيلية
            const scores = await this.supabase.select('scores', { filter: { lead_id: leadId } });
            
            // 3. جلب الإجابات التفصيلية المسجلة بالفصل الجديد لدعم التحليل السلوكي
            const answers = await this.supabase.select('answers', { filter: { lead_id: leadId } });

            // بناء أقسام التقرير الاستشاري النصي المقروء
            let scoresHtml = '';
            let weakestAxis = { name: 'غير محدد', score: 101 };
            let strongestAxis = { name: 'غير محدد', score: -1 };

            if (scores && scores.length > 0) {
                scores.forEach(s => {
                    const currentScore = parseFloat(s.percentage);
                    const axisName = s.axis_name_ar || s.axis_id;
                    
                    if (currentScore < weakestAxis.score) {
                        weakestAxis = { name: axisName, score: currentScore };
                    }
                    if (currentScore > strongestAxis.score) {
                        strongestAxis = { name: axisName, score: currentScore };
                    }

                    const barColor = currentScore >= 75 ? '#15803d' : currentScore >= 50 ? '#4b5563' : currentScore >= 25 ? '#b45309' : '#b91c1c';

                    scoresHtml += `
                        <div style="margin-bottom:14px; background:#ffffff; padding:12px; border-radius:8px; border:1px solid #e2e8f0;">
                            <div style="display:flex; justify-content:between; font-weight:700; font-size:0.9rem; margin-bottom:6px; color:#1e293b;">
                                <span style="flex:1;">📌 ${axisName}</span>
                                <span style="color:${barColor}; font-weight:800;">${currentScore.toFixed(1)}%</span>
                            </div>
                            <div style="width:100%; height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
                                <div style="width:${currentScore}%; height:100%; background:${barColor}; border-radius:4px;"></div>
                            </div>
                        </div>
                    `;
                });
            } else {
                scoresHtml = '<p style="color:#64748b; font-size:0.9rem;">لم يتم تسجيل درجات تفصيلية للمحاور في هذا التقييم بعد.</p>';
            }

            // تحليل فخاخ التناقض السلوكي نصياً بالعربية الفصحى
            let trapsHtml = '';
            const trapAnswers = answers ? answers.filter(a => a.is_trap || a.answer_value === 0 || a.option_value === 0) : [];
            
            if (trapAnswers.length > 0) {
                trapAnswers.forEach((trap, idx) => {
                    trapsHtml += `
                        <div style="background:#fff5f5; border-right:4px solid #f43f5e; padding:12px 16px; border-radius:6px; margin-bottom:10px;">
                            <h4 style="color:#9f1239; font-size:0.95rem; font-weight:700;">🚨 ثغرة سلوكية مكتشفة رقم (${idx + 1})</h4>
                            <p style="color:#4c0519; font-size:0.9rem; margin-top:4px; line-height:1.6;">${trap.question_text || 'تراجع في معيار الأداء ضمن محاور العمل اليومي.'}</p>
                        </div>
                    `;
                });
            } else {
                trapsHtml = `
                    <div style="background:#f0fdf4; border-right:4px solid #10b981; padding:12px 16px; border-radius:6px; color:#14532d; font-weight:600; font-size:0.9rem;">
                        ✅ لم يتم رصد أي تناقضات سلوكية أو فخاخ تسريب حادة في هذا التقييم، أداء العيادة متزن ومطابق للمعلن.
                    </div>
                `;
            }

            // حساب مؤشرات الأداء الحيوية استشارياً (Business English ضمن سياق عربي)
            const getAxisScore = (id) => {
                const found = scores.find(s => s.axis_id === id);
                return found ? parseFloat(found.percentage) : 50;
            };

            const tfi = Math.round((getAxisScore('A1') + getAxisScore('A2')) / 2);
            const tap = Math.round((getAxisScore('A3') + getAxisScore('A4')) / 2);
            const prp = Math.round(getAxisScore('A5'));

            // دمج وعرض واجهة التقرير النصي العربي المتكاملة والمحمية بالكامل
            detailsContainer.innerHTML = `
                <div class="form-card fade-in" style="background:#ffffff; border-radius:16px; padding:28px; border:2px solid #0f766e; box-shadow:0 10px 25px -5px rgba(15,118,110,0.1); margin-top:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #f0fdfa; padding-bottom:14px; margin-bottom:20px;">
                        <h3 style="color:#134e4a; font-weight:800; font-size:1.3rem; margin-0:0;">📋 التقرير التشخيصي النصي الشامل للعيادة</h3>
                        <button id="btn-close-details" style="padding:6px 14px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:6px; font-weight:700; cursor:pointer;">❌ إغلاق العرض</button>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:24px; font-size:0.9rem;">
                        <div><strong style="color:#0f766e;">👤 اسم المقيّم:</strong> ${lead.full_name}</div>
                        <div><strong style="color:#0f766e;">📱 الهاتف:</strong> ${lead.phone || 'غير مسجل'}</div>
                        <div><strong style="color:#0f766e;">📧 البريد:</strong> ${lead.email || 'غير مسجل'}</div>
                        <div><strong style="color:#0f766e;">⚕️ التخصص الطبي:</strong> ${this.translateSpecialty(lead.specialty)}</div>
                        <div><strong style="color:#0f766e;">👥 حجم الفريق الإداري:</strong> ${this.translateStaffSize(lead.team)}</div>
                        <div><strong style="color:#0f766e;">📅 تاريخ التقييم:</strong> ${new Date(lead.created_at).toLocaleDateString('ar-JO')}</div>
                    </div>

                    <h4 style="color:#134e4a; font-weight:700; margin-bottom:12px; font-size:1.05rem;">📊 لوحة قيادة مؤشرات الأداء الأساسية (KPIs Dashboard)</h4>
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:24px;">
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center;">
                            <div style="font-size:0.85rem; color:#64748b; font-weight:600;">مؤشر بناء الثقة (Trust Formation Index)</div>
                            <div style="font-size:1.4rem; font-weight:800; color:#0f766e; margin-top:4px;">${tfi}%</div>
                        </div>
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center;">
                            <div style="font-size:0.85rem; color:#64748b; font-weight:600;">مؤشر قبول العلاج (Treatment Acceptance Potential)</div>
                            <div style="font-size:1.4rem; font-weight:800; color:#0f766e; margin-top:4px;">${tap}%</div>
                        </div>
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center;">
                            <div style="font-size:0.85rem; color:#64748b; font-weight:600;">مؤشر الاستبقاء والولاء (Patient Retention Potential)</div>
                            <div style="font-size:1.4rem; font-weight:800; color:#0f766e; margin-top:4px;">${prp}%</div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
                        <div>
                            <h4 style="color:#134e4a; font-weight:700; margin-bottom:12px; font-size:1.05rem;">📈 تحليل محاور الأداء الاستراتيجي</h4>
                            ${scoresHtml}
                        </div>

                        <div>
                            <h4 style="color:#134e4a; font-weight:700; margin-bottom:12px; font-size:1.05rem;">💡 التوجيهات الاستشارية وفرص التطوير الهيكلي</h4>
                            <div style="background:#f0fdfa; border-right:4px solid #0f766e; border-radius:8px; padding:16px; margin-bottom:14px;">
                                <h4 style="color:#115e59; font-size:0.95rem; font-weight:700; margin-bottom:6px;">🎯 الأولوية التشغيلية القصوى للعيادة:</h4>
                                <p style="color:#134e4a; font-size:0.9rem; line-height:1.7;">
                                    يمثل محور <strong>"${weakestAxis.name}"</strong> الفجوة الهيكلية الأكبر ومصدر التسريب الرئيسي للمرضى حالياً بنسبة أداء تفوق خطورة التقييم الإداري (${weakestAxis.score.toFixed(1)}%). يتطلب هذا المعيار تدخلاً فورياً لإعادة صياغة العقد المسبق وبروتوكولات المتابعة.
                                </p>
                            </div>
                            <div style="background:#f8fafc; border-right:4px solid #475569; border-radius:8px; padding:16px;">
                                <h4 style="color:#334155; font-size:0.95rem; font-weight:700; margin-bottom:6px;">💪 نقطة القوة المرتكز عليها:</h4>
                                <p style="color:#475569; font-size:0.9rem; line-height:1.7;">
                                    تتمتع العيادة بنظام تشغيلي مستقر ومعيار متميز في محور <strong>"${strongestAxis.name}"</strong> بنسبة كفاءة بلغت (${strongestAxis.score.toFixed(1)}%). يمكن الارتكاز على هذا المعيار لرفع الكفاءة التشغيلية والمالية لباقي الكادر السريري.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top:24px;">
                        <h4 style="color:#134e4a; font-weight:700; margin-bottom:12px; font-size:1.05rem;">🚨 رصد فجوات الأداء ومنافذ التسريب السلوكي لرحلة المريض</h4>
                        ${trapsHtml}
                    </div>
                </div>
            `;

            // تفعيل زر إغلاق شاشة العرض والعودة للجدول
            document.getElementById('btn-close-details').addEventListener('click', () => {
                detailsContainer.style.display = 'none';
                document.getElementById('assessments-table-container').scrollIntoView({ behavior: 'smooth' });
            });

        } catch (err) {
            detailsContainer.innerHTML = `<div style="color:#b91c1c; padding:16px; background:#fef2f2; border-radius:8px;">❌ فشل معالجة وتحليل بيانات التقرير الاستشاري: ${err.message}</div>`;
        }
    }

    /**
     * دوال مساعدة لترجمة الرموز البرمجية إلى مسميات عربية واضحة ومقروءة
     */
    translateSpecialty(s) {
        const map = { cosmetic: 'تجميل وليزر', dental: 'أسنان', general: 'عام وعائلي', derma: 'جلدية', ortho: 'عظام وعلاج طبيعي', eye: 'عيون' };
        return map[s] || s || 'تخصص طبي عام';
    }

    translateStaffSize(t) {
        const map = { '1': '1 – 3 أفراد', '2': '4 – 8 أفراد', '3': '9 – 15 فرداً', '4': 'أكثر من 15 فرداً' };
        return map[t] || t || 'غير محدد';
    }
}

// تثبيت الكائن في البيئة العالمية لمتصفحات الهاتف والكمبيوتر ومنع التجمد الصامت
window.AssessmentManager = AssessmentManager;
