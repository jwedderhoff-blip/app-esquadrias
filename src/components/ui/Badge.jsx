import { ETAPAS } from '../../lib/constants'

const colors = {
  pedido: 'bg-gray-100 text-gray-700',
  contrato: 'bg-blue-100 text-blue-700',
  compra_material: 'bg-yellow-100 text-yellow-700',
  fabricacao: 'bg-orange-100 text-orange-700',
  pronto_entrega: 'bg-purple-100 text-purple-700',
  instalacao: 'bg-indigo-100 text-indigo-700',
  pos_obra: 'bg-teal-100 text-teal-700',
  encerrado: 'bg-green-100 text-green-700',
}

export default function EtapaBadge({ etapa }) {
  const label = ETAPAS.find((e) => e.key === etapa)?.label ?? etapa
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[etapa] ?? 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  )
}
