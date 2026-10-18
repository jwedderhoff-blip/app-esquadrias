export const CHECKLIST_FIELDS = {
  'Identificação do cliente (nome, CNPJ/CPF, contato)': [
    { key: 'nome_cliente', label: 'Nome do cliente', type: 'text', required: true },
    { key: 'cnpj_cpf', label: 'CNPJ / CPF', type: 'text', required: true },
    { key: 'contato', label: 'Contato (telefone ou e-mail)', type: 'text', required: false },
  ],
  'Descrição do produto solicitado': [
    { key: 'descricao', label: 'Descrição do produto', type: 'textarea', required: true },
  ],
  'Prazo solicitado pelo cliente': [
    { key: 'prazo', label: 'Prazo solicitado', type: 'date', required: true },
  ],
  'Responsável interno atribuído': [
    { key: 'responsavel_id', label: 'Responsável', type: 'user_select', required: true },
  ],
  'Valor contratual registrado': [
    { key: 'valor', label: 'Valor (R$)', type: 'currency', required: true },
  ],
  'Data de assinatura registrada': [
    { key: 'data_assinatura', label: 'Data de assinatura', type: 'date', required: true },
  ],
  'Prazo de entrega do material confirmado': [
    { key: 'prazo_entrega', label: 'Prazo de entrega do material', type: 'date', required: true },
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
}
