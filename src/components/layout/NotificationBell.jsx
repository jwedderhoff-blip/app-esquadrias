import { useRef } from 'react'
import { BellIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationsContext'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'

const AREA_COLOR = {
  Comercial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Financeiro: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Compras: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
}

export default function NotificationBell() {
  const { notifications, pendencias, markAsRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const totalBadge = notifications.length + pendencias.length

  function handleNotifClick(n) {
    markAsRead(n.id)
    setOpen(false)
    navigate(`/projetos/${n.project_id}`)
  }

  function handlePendenciaClick(p) {
    setOpen(false)
    navigate(`/projetos/${p.id}`)
  }

  const MAX_VISIBLE = 5
  const pendenciasVisiveis = pendencias.slice(0, MAX_VISIBLE)
  const pendenciasResto = pendencias.length - MAX_VISIBLE

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <BellIcon className="w-6 h-6" />
        {totalBadge > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Notificações</span>
              {notifications.length > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="max-h-[420px] overflow-y-auto">

              {/* Seção pendências */}
              {pendencias.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 dark:bg-amber-900/15 border-b border-amber-100 dark:border-amber-800/30">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Pendências ({pendencias.length})
                    </span>
                  </div>
                  <div className="divide-y divide-amber-50 dark:divide-amber-900/20">
                    {pendenciasVisiveis.map((p) => (
                      <button
                        key={`${p.id}:${p._area}`}
                        onClick={() => handlePendenciaClick(p)}
                        className="w-full text-left px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/15 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          {p._area && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${AREA_COLOR[p._area] || ''}`}>
                              {p._area}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                              {p.numero_pedido ? `#${p.numero_pedido} · ` : ''}{p.titulo || p.cliente || 'Sem título'}
                            </p>
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 leading-tight">{p.motivo}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {pendenciasResto > 0 && (
                      <button
                        onClick={() => { setOpen(false); navigate('/') }}
                        className="w-full text-center py-2 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium transition-colors"
                      >
                        +{pendenciasResto} mais — ver todas
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Seção notificações do sistema */}
              {notifications.length > 0 && (
                <div>
                  {pendencias.length > 0 && (
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-y border-gray-100 dark:border-gray-700">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Alertas do sistema</span>
                    </div>
                  )}
                  <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{n.mensagem}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(n.criado_em), { addSuffix: true, locale: ptBR })}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Vazio */}
              {notifications.length === 0 && pendencias.length === 0 && (
                <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">Nenhuma notificação</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
