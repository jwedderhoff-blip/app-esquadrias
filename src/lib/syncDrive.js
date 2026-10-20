import { supabase } from './supabase'
import { ETAPA_LABEL } from './constants'

/**
 * Espelha um documento já salvo no Supabase para o Google Drive da empresa.
 * Fire-and-forget: erros de Drive não bloqueiam o fluxo principal.
 *
 * @param {object} opts
 * @param {string} opts.documentId  - ID do registro na tabela documents
 * @param {string} opts.urlStorage  - URL pública no Supabase Storage
 * @param {string} opts.fileName    - Nome do arquivo
 * @param {string} opts.mimeType    - MIME type (ex: 'application/pdf')
 * @param {string} opts.companyId   - UUID da empresa
 * @param {string} opts.projectTitulo - Título do projeto (nome da subpasta)
 * @param {string} opts.etapa       - Key da etapa (ex: 'fabricacao')
 */
export async function syncToDrive({ documentId, urlStorage, fileName, mimeType, companyId, projectTitulo, etapa }) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/drive-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        document_id: documentId,
        url_storage: urlStorage,
        file_name: fileName,
        mime_type: mimeType || 'application/octet-stream',
        company_id: companyId,
        project_titulo: projectTitulo,
        etapa_label: ETAPA_LABEL[etapa] ?? etapa,
      }),
    })
  } catch (err) {
    console.warn('[syncToDrive] falhou (não crítico):', err)
  }
}
