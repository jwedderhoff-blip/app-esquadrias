// Campos que podem ser copiados do projeto para o item de checklist
export const CHECKLIST_COPY_FROM_PROJECT = {
  'Dados complementares do cliente e endereço da obra': [
    { key: 'nome_cliente', projectField: 'cliente' },
    { key: 'cnpj_cpf', projectField: 'cliente_cpf_cnpj' },
    { key: 'contato', projectField: 'cliente_fone' },
    { key: 'email', projectField: 'cliente_email' },
  ],
}

export const CHECKLIST_FIELDS = {
  'Dados complementares do cliente e endereço da obra': [
    { key: 'nome_cliente', label: 'Nome do cliente', type: 'text', required: true },
    { key: 'cnpj_cpf', label: 'CNPJ / CPF', type: 'text', required: false },
    { key: 'contato', label: 'Telefone / WhatsApp', type: 'text', required: false },
    { key: 'email', label: 'E-mail', type: 'text', required: false },
    { key: 'logradouro', label: 'Endereço da obra (logradouro)', type: 'text', required: false },
    { key: 'numero_end', label: 'Número', type: 'text', required: false },
    { key: 'complemento', label: 'Complemento', type: 'text', required: false },
    { key: 'bairro', label: 'Bairro', type: 'text', required: false },
    { key: 'cidade_obra', label: 'Cidade', type: 'text', required: false },
    { key: 'estado_obra', label: 'Estado', type: 'text', required: false },
    { key: 'cep', label: 'CEP', type: 'text', required: false },
  ],
  // 'Descrição do produto solicitado' → requer_documento=true, usa ModalAnexo (upload do orçamento aprovado)
  'Prazo solicitado pelo cliente': [
    { key: 'prazo', label: 'Prazo solicitado', type: 'date', required: true },
  ],
  'Responsável interno atribuído': [
    { key: 'responsavel_nome', label: 'Responsável', type: 'text', required: true, placeholder: 'Nome do responsável pela produção' },
  ],
  'Valor contratual registrado': [
    { key: 'valor', label: 'Valor (R$)', type: 'currency', required: true },
  ],
  'Data de assinatura registrada': [
    { key: 'data_assinatura', label: 'Data de assinatura', type: 'date', required: true },
  ],
  // Fabricação
  'Ordem de produção emitida': [
    { key: 'data_emissao', label: 'Data de emissão da ordem', type: 'date', required: true },
    { key: 'observacoes', label: 'Observações', type: 'textarea', required: false },
  ],
  'Responsável pela fabricação': [
    { key: 'nome_responsavel', label: 'Nome do responsável', type: 'text', required: true },
  ],
  'Prazo de início e conclusão da fabricação': [
    { key: 'prazo_inicio', label: 'Data de início', type: 'date', required: true },
    { key: 'prazo_conclusao', label: 'Data de conclusão', type: 'date', required: true },
  ],
  // Instalação
  'Data de início e conclusão da instalação': [
    { key: 'data_inicio', label: 'Data de início', type: 'date', required: true },
    { key: 'data_conclusao_prevista', label: 'Data de conclusão prevista', type: 'date', required: false },
  ],
  'Nome dos instaladores': [
    { key: 'nome_instaladores', label: 'Nome dos instaladores', type: 'text', required: true },
  ],
  'Data da conclusão real da instalação': [
    { key: 'data_conclusao_real', label: 'Data da conclusão real', type: 'date', required: true, alertar_atraso: false },
  ],
  // Pronto para entrega — logística agrupada
  'Logística de entrega confirmada': [
    { key: 'entregador_nome', label: 'Entregador agendado (nome)', type: 'text', required: false },
    { key: 'data_entrega_agendada', label: 'Data agendada para entrega', type: 'date', required: false },
    { key: 'cliente_agendado', label: 'Cliente agendado (confirmado)', type: 'boolean', required: false },
    { key: 'nota_emitida', label: 'Nota fiscal emitida', type: 'boolean', required: false },
  ],
  'Prazo de entrega do material confirmado': [
    { key: 'prazo_entrega', label: 'Prazo de entrega do material', type: 'date', required: true, alertar_atraso: true },
  ],
  'Prazo de conclusão definido': [
    { key: 'prazo_conclusao', label: 'Prazo de conclusão', type: 'date', required: true },
  ],
  'Produto inspecionado (conferência de qualidade)': [
    { key: 'resultado', label: 'Resultado da inspeção', type: 'select', required: true,
      options: ['Aprovado', 'Aprovado com ressalvas', 'Reprovado'] },
    { key: 'observacoes', label: 'Observações', type: 'textarea', required: false },
  ],
  'Data de entrega/instalação agendada': [
    { key: 'data_agendada', label: 'Data agendada', type: 'date', required: true },
    { key: 'horario', label: 'Horário', type: 'time', required: false },
  ],
  'Vistoria realizada': [
    { key: 'nome_vistoriador', label: 'Nome do vistoriador', type: 'text', required: false },
    { key: 'data_vistoria', label: 'Data da vistoria', type: 'date', required: true },
    { key: 'observacoes', label: 'Observações', type: 'textarea', required: false },
  ],
  'Pendências registradas e tratadas': [
    { key: 'status', label: 'Status', type: 'select', required: true,
      options: ['Sem pendências', 'Pendências tratadas'] },
    { key: 'pendencias', label: 'Descrição das pendências', type: 'textarea', required: false },
  ],
  'Documentação completa arquivada': [
    { key: 'local_arquivo', label: 'Local de arquivamento', type: 'text', required: false },
    { key: 'observacoes', label: 'Observações', type: 'textarea', required: false },
  ],
  'Projeto marcado como encerrado': [
    { key: 'observacoes', label: 'Observações finais', type: 'textarea', required: false },
  ],
  'Satisfação do cliente registrada': [
    { key: 'satisfacao', label: 'Nível de satisfação', type: 'select', required: true,
      options: ['Muito satisfeito', 'Satisfeito', 'Parcialmente satisfeito', 'Insatisfeito'] },
    { key: 'observacoes', label: 'Comentários do cliente', type: 'textarea', required: false },
  ],
  'Prazo de garantia registrado': [
    { key: 'prazo_garantia', label: 'Validade da garantia', type: 'date', required: true },
    { key: 'observacoes', label: 'Condições da garantia', type: 'textarea', required: false },
  ],
}
