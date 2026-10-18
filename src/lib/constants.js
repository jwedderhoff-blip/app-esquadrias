export const ETAPAS = [
  { key: 'pedido', label: 'Pedido' },
  { key: 'contrato', label: 'Contrato assinado' },
  { key: 'compra_material', label: 'Compra de material' },
  { key: 'fabricacao', label: 'Em fabricação' },
  { key: 'pronto_entrega', label: 'Pronto para entrega' },
  { key: 'instalacao', label: 'Instalação' },
  { key: 'pos_obra', label: 'Pós-obra' },
  { key: 'encerrado', label: 'Encerrado' },
]

export const ETAPA_INDEX = Object.fromEntries(ETAPAS.map((e, i) => [e.key, i]))

export const ETAPA_LABEL = Object.fromEntries(ETAPAS.map((e) => [e.key, e.label]))

export const PERFIL_LABEL = {
  operacional: 'Operacional',
  supervisor: 'Supervisor',
  administrador: 'Administrador',
  super_admin: 'Super Admin',
}
