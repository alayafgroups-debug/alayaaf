alter table public.departments
  add column if not exists branch_id text;

alter table public.employees
  add column if not exists branch_id text;

update public.employees e
set branch_id = b.id
from public.branches b
where e.branch_id is null
  and nullif(btrim(e.branch), '') is not null
  and btrim(e.branch) = btrim(b.name);

update public.departments d
set branch_id = b.id
from public.branches b
where d.branch_id is null
  and nullif(btrim(d.branch), '') is not null
  and btrim(d.branch) = btrim(b.name);

with department_branch_counts as (
  select
    e.department_id,
    e.branch_id,
    count(*) as employee_count,
    row_number() over (
      partition by e.department_id
      order by count(*) desc, e.branch_id
    ) as rank
  from public.employees e
  where e.department_id is not null
    and e.branch_id is not null
  group by e.department_id, e.branch_id
)
update public.departments d
set branch_id = counts.branch_id
from department_branch_counts counts
where d.branch_id is null
  and counts.department_id = d.id
  and counts.rank = 1;

alter table public.departments
  drop constraint if exists departments_branch_id_fkey;

alter table public.departments
  add constraint departments_branch_id_fkey
  foreign key (branch_id) references public.branches(id)
  on update cascade on delete restrict;

alter table public.employees
  drop constraint if exists employees_branch_id_fkey;

alter table public.employees
  add constraint employees_branch_id_fkey
  foreign key (branch_id) references public.branches(id)
  on update cascade on delete restrict;

create index if not exists departments_branch_id_idx
  on public.departments(branch_id);

create index if not exists employees_branch_id_idx
  on public.employees(branch_id);

create or replace function public.sync_hr_branch_reference()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  resolved_branch record;
begin
  if new.branch_id is not null then
    select id, name into resolved_branch
    from public.branches
    where id = new.branch_id;

    if not found then
      raise exception 'Branch % does not exist', new.branch_id;
    end if;

    new.branch := resolved_branch.name;
  elsif nullif(btrim(new.branch), '') is not null then
    select id, name into resolved_branch
    from public.branches
    where btrim(name) = btrim(new.branch)
    order by created_at, id
    limit 1;

    if found then
      new.branch_id := resolved_branch.id;
      new.branch := resolved_branch.name;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists departments_sync_branch_reference on public.departments;
create trigger departments_sync_branch_reference
before insert or update of branch_id, branch on public.departments
for each row execute function public.sync_hr_branch_reference();

drop trigger if exists employees_sync_branch_reference on public.employees;
create trigger employees_sync_branch_reference
before insert or update of branch_id, branch on public.employees
for each row execute function public.sync_hr_branch_reference();

create or replace function public.propagate_hr_branch_name()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.name is distinct from old.name then
    update public.departments
    set branch = new.name
    where branch_id = new.id;

    update public.employees
    set branch = new.name
    where branch_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists branches_propagate_name on public.branches;
create trigger branches_propagate_name
after update of name on public.branches
for each row execute function public.propagate_hr_branch_name();
