import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ServiceAccount {
  client_email: string
  private_key: string
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  const toB64Url = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const header = toB64Url({ alg: 'RS256', typ: 'JWT' })
  const payload = toB64Url({
    iss: sa.client_email,
    sub: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })

  const pem = sa.private_key.replace(/\\n/g, '\n')
  const pemBody = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/[\r\n\s]/g, '')
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(`${header}.${payload}`)
  )
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const jwt = `${header}.${payload}.${sigB64}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Token error: ${JSON.stringify(data)}`)
  return data.access_token
}

async function findOrCreateFolder(
  token: string,
  name: string,
  parentId: string | null
): Promise<string> {
  const safeName = name.replace(/'/g, "\\'")
  const parentClause = parentId ? `and '${parentId}' in parents` : ''
  const q = `name='${safeName}' and mimeType='application/vnd.google-apps.folder' ${parentClause} and trashed=false`

  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const sd = await search.json()
  if (sd.files?.length > 0) return sd.files[0].id

  const create = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  })
  const cd = await create.json()
  if (!create.ok) throw new Error(`Create folder error: ${JSON.stringify(cd)}`)
  return cd.id
}

async function uploadFile(
  token: string,
  name: string,
  content: Uint8Array,
  mimeType: string,
  parentId: string
): Promise<{ id: string; webViewLink: string }> {
  const boundary = 'eq9_meridio_boundary'
  const meta = JSON.stringify({ name, parents: [parentId] })
  const enc = new TextEncoder()

  const body = new Uint8Array([
    ...enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    ...content,
    ...enc.encode(`\r\n--${boundary}--`),
  ])

  const up = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
      },
      body,
    }
  )
  const ud = await up.json()
  if (!up.ok) throw new Error(`Drive upload error: ${JSON.stringify(ud)}`)

  // Permissão pública (leitura por link)
  await fetch(`https://www.googleapis.com/drive/v3/files/${ud.id}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  })

  const info = await fetch(
    `https://www.googleapis.com/drive/v3/files/${ud.id}?fields=id,webViewLink`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const id_data = await info.json()

  return { id: ud.id, webViewLink: id_data.webViewLink }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')
    if (!serviceAccountKey) {
      return new Response(JSON.stringify({ error: 'Google Drive não configurado' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const {
      document_id,
      url_storage,
      file_name,
      mime_type,
      company_id,
      project_titulo,
      etapa_label,
    } = await req.json()

    // Buscar empresa
    const { data: company } = await supabase
      .from('companies')
      .select('nome, drive_folder_id')
      .eq('id', company_id)
      .single()

    if (!company) throw new Error('Empresa não encontrada')

    // Baixar arquivo do Supabase Storage
    const fileRes = await fetch(url_storage)
    if (!fileRes.ok) throw new Error(`Falha ao baixar arquivo: ${fileRes.status}`)
    const fileContent = new Uint8Array(await fileRes.arrayBuffer())

    // Autenticar no Google
    const sa = JSON.parse(serviceAccountKey) as ServiceAccount
    const token = await getAccessToken(sa)

    // Criar hierarquia de pastas: Empresa → Projeto → Etapa
    let companyFolderId = company.drive_folder_id
    if (!companyFolderId) {
      companyFolderId = await findOrCreateFolder(token, company.nome, null)
      await supabase.from('companies').update({ drive_folder_id: companyFolderId }).eq('id', company_id)
    }

    const projectFolderId = await findOrCreateFolder(token, project_titulo, companyFolderId)
    const etapaFolderId = await findOrCreateFolder(token, etapa_label, projectFolderId)

    // Fazer upload
    const { id: driveFileId, webViewLink } = await uploadFile(
      token,
      file_name,
      fileContent,
      mime_type || 'application/octet-stream',
      etapaFolderId
    )

    // Atualizar documento com URL do Drive
    await supabase
      .from('documents')
      .update({ url_drive: webViewLink, drive_file_id: driveFileId })
      .eq('id', document_id)

    return new Response(
      JSON.stringify({ success: true, url_drive: webViewLink }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[drive-sync]', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
