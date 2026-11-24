import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return err('Unauthorized', 401)

    // Verifica se o caller é super_admin
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return err('Unauthorized', 401)

    const { data: callerProfile } = await callerClient
      .from('users')
      .select('perfil')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.perfil !== 'super_admin') return err('Apenas super_admin pode migrar projetos.', 403)

    const { project_ids, dest_company_id } = await req.json()
    if (!project_ids?.length || !dest_company_id) return err('project_ids e dest_company_id são obrigatórios.')

    // Usa service role para bypassar RLS
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Valida que a empresa destino existe
    const { data: destCompany } = await admin.from('companies').select('id, nome').eq('id', dest_company_id).single()
    if (!destCompany) return err('Empresa destino não encontrada.')

    // Valida os projetos (guarda dados antes para o log)
    const { data: projects } = await admin
      .from('projects')
      .select('id, titulo, company_id')
      .in('id', project_ids)
    if (!projects?.length) return err('Nenhum projeto encontrado.')

    const sourceCompanyId = projects[0].company_id

    // Migra projects
    const { error: projErr } = await admin
      .from('projects')
      .update({ company_id: dest_company_id })
      .in('id', project_ids)
    if (projErr) return err('Erro ao migrar projetos: ' + projErr.message)

    // Migra pagamentos
    const { error: pagErr } = await admin
      .from('pagamentos')
      .update({ company_id: dest_company_id })
      .in('project_id', project_ids)
    if (pagErr) return err('Projetos migrados, mas erro nos pagamentos: ' + pagErr.message)

    // Registra no activity_log de cada projeto
    const logs = projects.map((p) => ({
      project_id: p.id,
      usuario_id: caller.id,
      acao: 'projeto_migrado',
      detalhe: `Projeto migrado para empresa ${destCompany.nome} (ID: ${dest_company_id})`,
    }))
    await admin.from('activity_log').insert(logs)

    return new Response(
      JSON.stringify({ migrated: projects.length, dest_company: destCompany.nome }),
      { headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
