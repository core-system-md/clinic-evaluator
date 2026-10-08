-- Disposable PostgreSQL contract test for WP-03 axis-weight normalization.
begin;

create temporary table wp03_axes (
  slug text not null,
  version integer not null,
  code text not null,
  weight numeric(8,4) not null
);

insert into wp03_axes(slug,version,code,weight) values
 ('admin-reception-assessment',1,'AX1',35),('admin-reception-assessment',1,'AX2',25),('admin-reception-assessment',1,'AX3',25),('admin-reception-assessment',1,'AX4',15),
 ('clinic-performance',1,'A1',0.50),('clinic-performance',1,'A2',0.30),('clinic-performance',1,'A3',0.20),
 ('comprehensive-clinic-assessment',1,'AX1',20),('comprehensive-clinic-assessment',1,'AX2',20),('comprehensive-clinic-assessment',1,'AX3',20),('comprehensive-clinic-assessment',1,'AX4',15),('comprehensive-clinic-assessment',1,'AX5',15),('comprehensive-clinic-assessment',1,'AX6',10),
 ('comprehensive-clinic-assessment-v2',2,'AX1',20),('comprehensive-clinic-assessment-v2',2,'AX2',20),('comprehensive-clinic-assessment-v2',2,'AX3',20),('comprehensive-clinic-assessment-v2',2,'AX4',15),('comprehensive-clinic-assessment-v2',2,'AX5',15),('comprehensive-clinic-assessment-v2',2,'AX6',10),
 ('medical-team-assessment',1,'A1',0.35),('medical-team-assessment',1,'A2',0.30),('medical-team-assessment',1,'A3',0.20),('medical-team-assessment',1,'A4',0.15),
 ('patient-journey',1,'A1',0.20),('patient-journey',1,'A2',0.15),('patient-journey',1,'A3',0.25),('patient-journey',1,'A4',0.25),('patient-journey',1,'A5',0.15);

do $$
declare n integer;
begin
  select count(*) into n
  from (
    select slug, version
    from wp03_axes
    where slug in ('clinic-performance','medical-team-assessment','patient-journey')
      and version=1
    group by slug,version
    having abs(sum(weight)-1) > 0.000001
  ) bad;
  if n <> 0 then raise exception 'fractional precondition failed'; end if;
end $$;

with family_weights as (
  select slug,version,sum(weight) weight_sum
  from wp03_axes
  where slug in ('clinic-performance','medical-team-assessment','patient-journey')
    and version=1
  group by slug,version
)
update wp03_axes a
set weight=round(a.weight*100,2)
from family_weights f
where a.slug=f.slug and a.version=f.version
  and f.weight_sum between 0.999999 and 1.000001;

do $$
declare n integer;
begin
  select count(*) into n
  from (
    select slug,version
    from wp03_axes
    group by slug,version
    having abs(sum(weight)-100) > 0.000001
       and slug in ('clinic-performance','medical-team-assessment','patient-journey')
       and version=1
  ) bad;
  if n <> 0 then raise exception 'percentage postcondition failed'; end if;

  if (select weight from wp03_axes where slug='clinic-performance' and code='A1') <> 50 then
    raise exception 'clinic A1 mapping mismatch';
  end if;
  if (select weight from wp03_axes where slug='medical-team-assessment' and code='A1') <> 35 then
    raise exception 'medical A1 mapping mismatch';
  end if;
  if (select weight from wp03_axes where slug='patient-journey' and code='A1') <> 20 then
    raise exception 'patient A1 mapping mismatch';
  end if;
end $$;

rollback;
