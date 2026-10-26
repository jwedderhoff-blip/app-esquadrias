import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson)
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const signingInput = `${b64url(header)}.${b64url(payload)}`

  const pemKey = sa.private_key.replace(/\\n/g, '\n')
  const keyBody = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(keyBody), (c) => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const encodedSig = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${signingInput}.${encodedSig}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    throw new Error('Falha ao obter token Google: ' + JSON.stringify(tokenData))
  }
  return tokenData.access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verificar usuário autenticado
    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authErr } = await userSupabase.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { project_id, project_title, cliente, company_id } = await req.json()
    if (!project_id || !project_title || !company_id) {
      return new Response(JSON.stringify({ error: 'Parâmetros obrigatórios: project_id, project_title, company_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const folderName = cliente
      ? `${cliente} - ${project_title}`
      : project_title

    // Verificar que o projeto pertence à empresa informada
    const { data: projectCheck, error: projCheckErr } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .eq('company_id', company_id)
      .single()
    if (projCheckErr || !projectCheck) {
      return new Response(JSON.stringify({ error: 'Projeto não pertence à empresa informada.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Buscar pasta-mãe da empresa
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .select('drive_folder_id, nome')
      .eq('id', company_id)
      .single()

    if (compErr || !company) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!company.drive_folder_id) {
      return new Response(JSON.stringify({ error: 'Empresa sem pasta Drive configurada. Configure em Admin → Empresas.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const parentId = company.drive_folder_id

    // Autenticar com service account
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')
    if (!serviceAccountJson) {
      return new Response(JSON.stringify({ error: 'GOOGLE_SERVICE_ACCOUNT_KEY não configurado nos secrets do Supabase.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const accessToken = await getGoogleAccessToken(serviceAccountJson)

    // Criar subpasta no Drive
    const driveRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      }),
    })

    const driveData = await driveRes.json()
    if (!driveData.id) {
      throw new Error('Drive API error: ' + JSON.stringify(driveData))
    }

    const folderUrl = `https://drive.google.com/drive/folders/${driveData.id}`

    // Salvar no projeto
    await supabase
      .from('projects')
      .update({ drive_pasta_url: folderUrl, drive_pasta_id: driveData.id })
      .eq('id', project_id)

    return new Response(JSON.stringify({ folder_id: driveData.id, folder_url: folderUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
