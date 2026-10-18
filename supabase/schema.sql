-- ============================================================
-- App Esquadrias — Schema completo
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------

create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  nome text not null,
  email text not null unique,
  perfil text not null check (perfil in ('operacional', 'supervisor', 'administrador')),
  ativo boolean default true,
  criado_em timestamptz default now()
);

create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  cliente text not null,
  etapa_atual text not null default 'pedido',
  criado_por uuid references public.users(id),
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

create table public.project_stages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  etapa text not null,
  iniciada_em timestamptz default now(),
  concluida_em timestamptz,
  concluida_por uuid references public.users(id)
);

create table public.checklist_templates (
  id uuid primary key default uuid_generate_v4(),
  etapa text not null,
  descricao text not null,
  ordem int not null default 0
);

create table public.checklist_items (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  etapa text not null,
  descricao text not null,
  concluido boolean default false,
  concluido_por uuid references public.users(id),
  concluido_em timestamptz
);

create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  etapa text not null,
  nome_arquivo text not null,
  url_storage text not null,
  enviado_por uuid references public.users(id),
  enviado_em timestamptz default now()
);

create table public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  usuario_id uuid references public.users(id),
  acao text not null,
  detalhe text,
  criado_em timestamptz default now()
);

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references public.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  tipo text not null check (tipo in ('documento_pendente', 'documento_adicionado')),
  mensagem text not null,
  lida boolean default false,
  criado_em timestamptz default now()
);

-- ------------------------------------------------------------
-- Seed: checklist_templates
-- ------------------------------------------------------------

insert into public.checklist_templates (etapa, descricao, ordem) values
  ('pedido', 'Identificação do cliente (nome, CNPJ/CPF, contato)', 1),
  ('pedido', 'Descrição do produto solicitado', 2),
  ('pedido', 'Prazo solicitado pelo cliente', 3),
  ('pedido', 'Responsável interno atribuído', 4),

  ('contrato', 'Contrato em PDF anexado', 1),
  ('contrato', 'Valor contratual registrado', 2),
  ('contrato', 'Data de assinatura registrada', 3),

  ('compra_material', 'Ordem de compra gerada', 1),
  ('compra_material', 'Nota fiscal de compra anexada', 2),
  ('compra_material', 'Prazo de entrega do material confirmado', 3),

  ('fabricacao', 'Ordem de produção emitida', 1),
  ('fabricacao', 'Prazo de conclusão definido', 2),

  ('pronto_entrega', 'Produto inspecionado (conferência de qualidade)', 1),
  ('pronto_entrega', 'Data de entrega/instalação agendada', 2),

  ('instalacao', 'Foto do produto instalado anexada', 1),
  ('instalacao', 'Aceite do cliente registrado', 2),

  ('pos_obra', 'Vistoria realizada', 1),
  ('pos_obra', 'Pendências registradas e tratadas', 2),

  ('encerrado', 'Documentação completa arquivada', 1),
  ('encerrado', 'Projeto marcado como encerrado', 2);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_stages enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_items enable row level security;
alter table public.documents enable row level security;
alter table public.activity_log enable row level security;
alter table public.notifications enable row level security;

-- Helper: retorna perfil do usuário autenticado
create or replace function public.get_my_perfil()
returns text language sql security definer stable as $$
  select perfil from public.users where id = auth.uid();
$$;

-- users
create policy "usuarios autenticados podem ler" on public.users
  for select using (auth.uid() is not null);

create policy "apenas administrador insere/atualiza" on public.users
  for all using (public.get_my_perfil() = 'administrador');

-- checklist_templates (leitura para todos autenticados)
create policy "leitura livre de templates" on public.checklist_templates
  for select using (auth.uid() is not null);

-- projects
create policy "operacional ve apenas seus projetos" on public.projects
  for select using (
    public.get_my_perfil() in ('supervisor', 'administrador')
    or criado_por = auth.uid()
  );

create policy "operacional cria projetos" on public.projects
  for insert with check (auth.uid() is not null);

create policy "operacional atualiza seus projetos" on public.projects
  for update using (
    public.get_my_perfil() in ('supervisor', 'administrador')
    or criado_por = auth.uid()
  );

-- project_stages
create policy "stages seguem acesso ao projeto" on public.project_stages
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (public.get_my_perfil() in ('supervisor', 'administrador') or p.criado_por = auth.uid())
    )
  );

-- checklist_items
create policy "checklist segue acesso ao projeto" on public.checklist_items
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (public.get_my_perfil() in ('supervisor', 'administrador') or p.criado_por = auth.uid())
    )
  );

-- documents
create policy "documentos seguem acesso ao projeto" on public.documents
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (public.get_my_perfil() in ('supervisor', 'administrador') or p.criado_por = auth.uid())
    )
  );

-- activity_log
create policy "log segue acesso ao projeto" on public.activity_log
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (public.get_my_perfil() in ('supervisor', 'administrador') or p.criado_por = auth.uid())
    )
  );

-- notifications
create policy "usuario ve apenas suas notificacoes" on public.notifications
  for all using (usuario_id = auth.uid());

-- ------------------------------------------------------------
-- Trigger: atualiza projects.atualizado_em
-- ------------------------------------------------------------

create or replace function public.touch_project()
returns trigger language plpgsql as $$
begin
  update public.projects set atualizado_em = now() where id = new.project_id;
  return new;
end;
$$;

create trigger trg_checklist_touch
  after insert or update on public.checklist_items
  for each row execute function public.touch_project();

create trigger trg_document_touch
  after insert on public.documents
  for each row execute function public.touch_project();
