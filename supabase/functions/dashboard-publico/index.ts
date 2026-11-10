import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchSectorNews(): Promise<Array<{ title: string; source: string; pubDate: string; link: string }>> {
  try {
    const rssUrl = 'https://news.google.com/rss/search?q=esquadrias+alum%C3%ADnio+constru%C3%A7%C3%A3o+civil&hl=pt-BR&gl=BR&ceid=BR:pt-419'
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DashboardBot/1.0)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []
    const xml = await res.text()

    const items: Array<{ title: string; source: string; pubDate: string; link: string }> = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match
    while ((match = itemRegex.exec(xml)) !== null && items.length < 8) {
      const block = match[1]
      const rawTitle =
        (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || block.match(/<title>(.*?)<\/title>/))?.[1] ?? ''
      const link =
        (block.match(/<link>(.*?)<\/link>/) || block.match(/<guid[^>]*>(.*?)<\/guid>/))?.[1] ?? ''
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''
      const sourceTag = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? ''

      // Google News embeds source at end of title as " - Source"
      const sourceFromTitle = rawTitle.match(/ - ([^-]+)$/)
      const title = rawTitle.replace(/ - [^-]+$/, '').trim()
      const source = sourceTag || sourceFromTitle?.[1]?.trim() || ''

      if (title) items.push({ title, source, pubDate, link })
    }
    return items
  } catch {
    return []
  }
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
      .select('id, titulo, cliente, etapa_atual, criado_em, atualizado_em, valor_contrato')
      .eq('company_id', companyId)
      .order('atualizado_em', { ascending: false })

    const projectIds = (projects || []).map((p) => p.id)

    let checklistStats: { project_id: string; concluido: boolean }[] = []
    let prazosData: { project_id: string; dados: Record<string, string> | null }[] = []
    let activityData: { project_id: string; criado_em: string; acao: string; detalhe: string | null; users: { nome: string } | null }[] = []
    let compraIniciadaIds: Set<string> = new Set()
    let pagamentosData: { project_id: string; valor: number }[] = []

    const newsPromise = fetchSectorNews()

    if (projectIds.length) {
      const [statsRes, prazosRes, activityRes, compraRes, pagRes] = await Promise.all([
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
        supabase
          .from('activity_log')
          .select('project_id, criado_em, acao, detalhe, users!usuario_id(nome)')
          .in('project_id', projectIds)
          .order('criado_em', { ascending: false }),
        supabase
          .from('checklist_items')
          .select('project_id')
          .in('project_id', projectIds)
          .eq('descricao', 'Orçamentos realizados')
          .eq('concluido', true),
        supabase
          .from('pagamentos')
          .select('project_id, valor')
          .in('project_id', projectIds),
      ])
      checklistStats = statsRes.data || []
      prazosData = prazosRes.data || []
      activityData = (activityRes.data || []) as typeof activityData
      compraIniciadaIds = new Set((compraRes.data || []).map((r: { project_id: string }) => r.project_id))
      pagamentosData = (pagRes.data || []) as typeof pagamentosData
    }

    const news = await newsPromise

    // Pagamentos por projeto
    const pagByProject: Record<string, number> = {}
    for (const pg of pagamentosData) {
      pagByProject[pg.project_id] = (pagByProject[pg.project_id] || 0) + Number(pg.valor)
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

    const lastActivityByProject: Record<string, { nome: string; em: string; acao: string; detalhe: string | null }> = {}
    for (const item of activityData) {
      if (!lastActivityByProject[item.project_id]) {
        lastActivityByProject[item.project_id] = {
          nome: item.users?.nome ?? 'Usuário',
          em: item.criado_em,
          acao: item.acao,
          detalhe: item.detalhe ?? null,
        }
      }
    }

    const projectsWithStats = (projects || []).map((p) => {
      const totalRecebido = pagByProject[p.id] || 0
      const saldo = p.valor_contrato != null ? Math.max(0, Number(p.valor_contrato) - totalRecebido) : null
      return {
        ...p,
        checklist_total: statsByProject[p.id]?.total ?? 0,
        checklist_done: statsByProject[p.id]?.done ?? 0,
        prazo_pedido: prazoByProject[p.id] ?? null,
        ultima_alteracao: lastActivityByProject[p.id] ?? null,
        compra_material_iniciada: compraIniciadaIds.has(p.id),
        total_recebido: totalRecebido,
        saldo_pendente: saldo,
      }
    }).sort((a, b) => {
      const aDate = a.ultima_alteracao?.em ?? a.atualizado_em ?? a.criado_em
      const bDate = b.ultima_alteracao?.em ?? b.atualizado_em ?? b.criado_em
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })

    const comContrato = projectsWithStats.filter((p) => p.valor_contrato != null && p.etapa_atual !== 'encerrado')
    const totalContratos = comContrato.reduce((s, p) => s + Number(p.valor_contrato), 0)
    const totalRecebido = comContrato.reduce((s, p) => s + (p.total_recebido || 0), 0)
    const totalAReceber = totalContratos - totalRecebido
    const pctRecebido = totalContratos > 0 ? Math.round((totalRecebido / totalContratos) * 100) : 0

    const topPendencias = projectsWithStats
      .filter((p) => p.saldo_pendente != null && p.saldo_pendente > 0.01 && p.etapa_atual !== 'encerrado')
      .sort((a, b) => (b.saldo_pendente ?? 0) - (a.saldo_pendente ?? 0))
      .slice(0, 5)
      .map((p) => ({ id: p.id, titulo: p.titulo, cliente: p.cliente, etapa_atual: p.etapa_atual, saldo_pendente: p.saldo_pendente }))

    const financial = { totalContratos, totalRecebido, totalAReceber, pctRecebido, topPendencias }

    return new Response(
      JSON.stringify({ company, projects: projectsWithStats, financial, news, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
