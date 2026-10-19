import { ETAPAS } from '../../lib/constants'

const colors = {
  pedido: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  contrato: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  compra_material: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  fabricacao: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  pronto_entrega: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  instalacao: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  pos_obra: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  encerrado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export default function EtapaBadge({ etapa }) {
  const label = ETAPAS.find((e) => e.key === etapa)?.label ?? etapa
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[etapa] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
      {label}
    </span>
  )
}
