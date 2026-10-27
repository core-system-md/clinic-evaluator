-- Repair only the existing Clinic Matrix V1 draft. Do not publish it or create a release.
do $$
declare
  v_assessment_id uuid;
  v_family_id uuid;
  v_status text;
  v_question_count integer;
  v_option_count integer;
  v_updated_questions integer;
  v_updated_options integer;
begin
  select a.id, a.family_id, a.status
    into v_assessment_id, v_family_id, v_status
  from public.assessment_types a
  join public.assessment_families f on f.id = a.family_id
  where a.slug = 'clinic-matrix-staff-competency'
    and f.slug = 'clinic-matrix-staff-competency'
    and a.version = 1
  for update of a;

  if v_assessment_id is null then
    raise exception 'Clinic Matrix V1 draft not found; refusing content mutation';
  end if;
  if v_status <> 'draft' then
    raise exception 'Clinic Matrix V1 is not a draft (%); refusing content mutation', v_status;
  end if;

  select count(*) into v_question_count
  from public.questions where assessment_type_id = v_assessment_id;
  select count(*) into v_option_count
  from public.options o join public.questions q on q.id=o.question_id
  where q.assessment_type_id = v_assessment_id;

  if v_question_count <> 12 or v_option_count <> 48 then
    raise exception 'Unexpected Clinic Matrix content shape: questions %, options %; refusing mutation', v_question_count, v_option_count;
  end if;

  with question_data(code, english_text) as (values
    ('Q1', 'A patient asks via WhatsApp only about a cosmetic procedure and its price. What is the best initial response?'),
    ('Q2', 'The patient reads messages but does not confirm the appointment. How do you follow up?'),
    ('Q3', 'A patient arrives at the clinic and is unsure which service they need. What do you do?'),
    ('Q4', 'The patient is upset about a delay while the waiting area is crowded. What is the best response?'),
    ('Q5', 'The patient describes a previous unsatisfactory experience and seems apprehensive. How do you respond?'),
    ('Q6', 'The patient asks whether a medical procedure is suitable for their condition, but you are not part of the clinical team. What do you say?'),
    ('Q7', 'After the consultation, the patient asks about the difference between two options and the final cost. What is best?'),
    ('Q8', 'The cost of one part of the plan changes after the details are clarified. How do you handle this?'),
    ('Q9', 'The patient says the price is higher than expected. How do you respond?'),
    ('Q10', 'The patient hesitates because the outcome is not guaranteed and asks you to reassure them. What is the most appropriate response?'),
    ('Q11', 'The visit has ended and the patient is interested but has not decided to book. How do you close the conversation?'),
    ('Q12', 'The patient missed their appointment and did not answer the first call. What is the best follow-up?')
  )
  update public.questions q
     set question_text = d.english_text
    from question_data d
   where q.assessment_type_id = v_assessment_id
     and q.code = d.code;

  get diagnostics v_updated_questions = row_count;
  if v_updated_questions <> 12 then
    raise exception 'Expected to update 12 question translations; updated %', v_updated_questions;
  end if;

  with option_data(question_code, option_index, english_label, corrected_value) as (values
    ('Q1', 0, 'Send only the price and end the conversation.', 40),
    ('Q1', 1, 'Ask many detailed questions before answering.', 40),
    ('Q1', 2, 'Send a long list of all available services.', 0),
    ('Q1', 3, 'Welcome the patient, answer clearly, then ask one brief question to understand their needs and suggest an appropriate next step.', 100),
    ('Q2', 0, 'Send repeated reminders until they reply.', 40),
    ('Q2', 1, 'Send one polite message with two suitable options and leave the decision to the patient.', 100),
    ('Q2', 2, 'Close the conversation without following up.', 40),
    ('Q2', 3, 'Offer an immediate discount without understanding the hesitation.', 40),
    ('Q3', 0, 'Welcome them, ask brief questions to understand the purpose of the visit, then direct them to the appropriate specialist.', 100),
    ('Q3', 1, 'Immediately recommend the most popular procedure.', 40),
    ('Q3', 2, 'Refer them to the doctor without explaining any information.', 70),
    ('Q3', 3, 'Assume they came to book the service they saw online.', 40),
    ('Q4', 0, 'Tell them the delay is not your responsibility.', 0),
    ('Q4', 1, 'Ignore their frustration until their turn comes.', 0),
    ('Q4', 2, 'Apologize, honestly explain the expected wait, and offer the available options.', 100),
    ('Q4', 3, 'Promise they will be seen within minutes without checking.', 0),
    ('Q5', 0, 'Listen without interrupting, summarize what you understood, and coordinate with the clinical team as needed.', 100),
    ('Q5', 1, 'Reassure them that the result is guaranteed this time.', 0),
    ('Q5', 2, 'Quickly move on to explaining the available offers.', 0),
    ('Q5', 3, 'Tell them the previous experience means nothing.', 0),
    ('Q6', 0, 'Give your personal opinion so they do not have to wait.', 0),
    ('Q6', 1, 'Guess based on similar cases.', 0),
    ('Q6', 2, 'Explain the limits of your role and arrange an answer from a qualified clinical professional.', 100),
    ('Q6', 3, 'Confirm the procedure is suitable because it is commonly performed.', 0),
    ('Q7', 0, 'Direct them to the more expensive option because it is more comprehensive.', 0),
    ('Q7', 1, 'Clearly explain the differences, limitations, and expected costs, then check their understanding.', 100),
    ('Q7', 2, 'Quote only the base price and leave other fees until later.', 0),
    ('Q7', 3, 'Explain the options in simple language and clarify the cost and limitations of each.', 100),
    ('Q8', 0, 'Avoid mentioning the change until the patient agrees.', 0),
    ('Q8', 1, 'Tell the patient only when they pay.', 0),
    ('Q8', 2, 'Explain the reason and updated cost before any commitment, and obtain the patient''s agreement.', 100),
    ('Q8', 3, 'Give an approximate figure without explaining what it includes.', 40),
    ('Q9', 0, 'Understand their concern and explain what the price includes and which alternatives are available, without pressure.', 100),
    ('Q9', 1, 'Offer a discount immediately before understanding the objection.', 40),
    ('Q9', 2, 'Say that the higher price guarantees a better result.', 0),
    ('Q9', 3, 'Explain the price components and give the patient time to decide.', 100),
    ('Q10', 0, 'Explain that outcomes vary and that the clinical professional can discuss realistic expectations and risks.', 100),
    ('Q10', 1, 'Promise that they will get the result they want.', 0),
    ('Q10', 2, 'Use photos of other patients'' results to persuade them that the outcome is guaranteed.', 0),
    ('Q10', 3, 'Clarify the limits of possible outcomes and refer clinical questions to the appropriate specialist.', 100),
    ('Q11', 0, 'Demand an immediate decision so they do not lose the offer.', 0),
    ('Q11', 1, 'Summarize the available next step and ask whether they would like to book or take time to think.', 100),
    ('Q11', 2, 'Leave without explaining how they can contact the clinic later.', 0),
    ('Q11', 3, 'Offer the choice to book now or follow up later, and explain how to get in touch.', 100),
    ('Q12', 0, 'Send a message blaming them for missing the appointment.', 0),
    ('Q12', 1, 'Book another appointment without their consent.', 0),
    ('Q12', 2, 'Send a polite message asking whether they would like to reschedule and making it easy to contact the clinic.', 100),
    ('Q12', 3, 'Keep calling several times a day until they answer.', 0)
  )
  update public.options o
     set label = d.english_label,
         option_value = d.corrected_value
    from public.questions q, option_data d
   where q.id = o.question_id
     and q.assessment_type_id = v_assessment_id
     and q.code = d.question_code
     and o.option_index = d.option_index;

  get diagnostics v_updated_options = row_count;
  if v_updated_options <> 48 then
    raise exception 'Expected to update 48 option translations and draft anchors; updated %', v_updated_options;
  end if;

  perform public.write_admin_audit(
    'assessment.draft_content.corrected',
    'assessment_types',
    v_assessment_id,
    v_family_id,
    null,
    jsonb_build_object(
      'status','draft',
      'question_translations_updated',v_updated_questions,
      'option_translations_and_anchors_updated',v_updated_options,
      'published',false,
      'release_created',false,
      'reason','Correct bilingual source-field population and clearly inconsistent ethical scoring anchors'
    )
  );
end;
$$;