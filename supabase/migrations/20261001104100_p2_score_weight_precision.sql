-- P2 runtime completion fix:
-- assessment axis weights can be values such as 35.00, while scores.weight
-- was numeric(3,2) and could only hold values below 10.00.
alter table public.scores
  alter column weight type numeric(5,2) using weight::numeric(5,2);

-- weighted_score can exceed 999.99 when a weighted axis score is calculated.
alter table public.scores
  alter column weighted_score type numeric(10,2) using weighted_score::numeric(10,2);
