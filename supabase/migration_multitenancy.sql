-- ============================================================
-- Migração: Multi-tenancy (empresas)
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Função helper de company
create or replace function public.get_my_company()
returns uuid language sql security definer stable as $$
  select company_id from public.users where id = auth.uid();
$$;

-- 2. Habilitar RLS em companies
alter table public.companies enable row level security;

-- 3. Policies para companies
create policy "super_admin ve todas empresas" on public.companies
  for all using (public.get_my_perfil() = 'super_admin');

create policy "usuario ve sua empresa" on public.companies
  for select using (id = public.get_my_company());

-- 4. Atualizar policies de projects
drop policy if exists "operacional ve apenas seus projetos" on public.projects;
drop policy if exists "operacional cria projetos" on public.projects;
drop policy if exists "operacional atualiza seus projetos" on public.projects;

create policy "projetos isolados por empresa" on public.projects
  for select using (
    public.get_my_perfil() = 'super_admin'
    or (company_id = public.get_my_company()
      and (public.get_my_perfil() in ('supervisor', 'administrador') or criado_por = auth.uid()))
  );

create policy "criar projeto na propria empresa" on public.projects
  for insert with check (
    auth.uid() is not null and company_id = public.get_my_company()
  );

create policy "atualizar projeto da propria empresa" on public.projects
  for update using (
    company_id = public.get_my_company()
    and (public.get_my_perfil() in ('supervisor', 'administrador', 'super_admin') or criado_por = auth.uid())
  );

-- 5. Atualizar policies de users
drop policy if exists "usuarios autenticados podem ler" on public.users;
drop policy if exists "apenas administrador insere/atualiza" on public.users;

create policy "leitura de usuarios" on public.users
  for select using (
    public.get_my_perfil() = 'super_admin' or company_id = public.get_my_company()
  );

create policy "admin gerencia usuarios da empresa" on public.users
  for all using (
    public.get_my_perfil() = 'super_admin'
    or (public.get_my_perfil() = 'administrador' and company_id = public.get_my_company())
  );

-- 6. Atribuir super_admin ao seu usuário
update public.users set perfil = 'super_admin' where email = 'jwedderhoff@gmail.com';

-- 7. Criar empresa demo e vincular dados existentes
insert into public.companies (id, nome, slug) values
  ('00000000-0000-0000-0000-000000000001', 'Demo — App Esquadrias', 'demo');

update public.users    set company_id = '00000000-0000-0000-0000-000000000001' where company_id is null;
update public.projects set company_id = '00000000-0000-0000-0000-000000000001' where company_id is null;
