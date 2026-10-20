import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const companyId = url.searchParams.get('company_id')

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'company_id obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: company, error: compErr } = await supabase
      .from('companies')
      .select('id, nome, logo_url, cidade, estado')
      .eq('id', companyId)
      .single()

    if (compErr || !company) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: projects } = await supabase
      .from('projects')
      .select('id, titulo, cliente, etapa_atual, criado_em, atualizado_em')
      .eq('company_id', companyId)
      .order('atualizado_em', { ascending: false })

    const projectIds = (projects || []).map((p) => p.id)

    let checklistStats: { project_id: string; concluido: boolean }[] = []
    let prazosData: { project_id: string; dados: Record<string, string> | null }[] = []
    if (projectIds.length) {
      const [statsRes, prazosRes] = await Promise.all([
        supabase
          .from('checklist_items')
          .select('project_id, concluido')
          .in('project_id', projectIds),
        supabase
          .from('checklist_items')
          .select('project_id, dados')
          .in('project_id', projectIds)
          .eq('descricao', 'Prazo solicitado pelo cliente')
          .eq('etapa', 'pedido'),
      ])
      checklistStats = statsRes.data || []
      prazosData = prazosRes.data || []
    }

    const statsByProject: Record<string, { total: number; done: number }> = {}
    for (const item of checklistStats) {
      if (!statsByProject[item.project_id]) statsByProject[item.project_id] = { total: 0, done: 0 }
      statsByProject[item.project_id].total++
      if (item.concluido) statsByProject[item.project_id].done++
    }

    const prazoByProject: Record<string, string | null> = {}
    for (const item of prazosData) {
      prazoByProject[item.project_id] = item.dados?.prazo ?? null
    }

    const projectsWithStats = (projects || []).map((p) => ({
      ...p,
      checklist_total: statsByProject[p.id]?.total ?? 0,
      checklist_done: statsByProject[p.id]?.done ?? 0,
      prazo_pedido: prazoByProject[p.id] ?? null,
    }))

    return new Response(
      JSON.stringify({ company, projects: projectsWithStats, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
