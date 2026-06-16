import { Bell } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const notifications = [
  { id: '1', type: 'update',    title: 'Procedure Updated',   body: 'ICU Sepsis Management Protocol has been updated to v3. Review before next clinical use.', time: '2026-06-16T08:32:00Z', read: false },
  { id: '2', type: 'approval',  title: 'Approval Requested',  body: 'ICU Ventilator Weaning Protocol requires your approval before publication.', time: '2026-06-16T07:15:00Z', read: false },
  { id: '3', type: 'emergency', title: 'Emergency Query',      body: 'Stream A emergency query received via WhatsApp. Patient directed to Emergency Dept.', time: '2026-06-16T09:44:00Z', read: false },
  { id: '4', type: 'published', title: 'Procedure Published',  body: 'Haemorrhage Control Protocol v3.2 has been approved and published to all channels.', time: '2026-06-15T16:30:00Z', read: true  },
  { id: '5', type: 'update',    title: 'AI Model Updated',     body: 'R-Agent retrieval model updated to v2.4. Confidence scores improved by 3%.', time: '2026-06-15T09:00:00Z', read: true  },
  { id: '6', type: 'approval',  title: 'Approval Completed',   body: 'Blood Transfusion SOP v4 has been fully approved and is pending publication.', time: '2026-06-14T11:45:00Z', read: true  },
]

const dotColor: Record<string, string> = {
  update:    'bg-hgd-blue',
  approval:  'bg-hgd-orange',
  emergency: 'bg-clin-red',
  published: 'bg-clin-green',
}

export default function NotificationsPage() {
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Bell size={22} className="text-hgd-blue" />
        <div>
          <h1 className="text-2xl font-bold text-text-pri">Notifications</h1>
          <p className="text-sm text-text-sec mt-0.5">
            {unread} unread · {notifications.length} total
          </p>
        </div>
        {unread > 0 && (
          <button className="ml-auto text-xs text-hgd-blue hover:underline font-medium">
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`bg-white rounded-lg shadow-card px-5 py-4 flex gap-4 transition-colors ${
              !n.read ? 'border-l-4 border-l-hgd-blue' : ''
            }`}
          >
            <div className="flex-shrink-0 mt-1.5">
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${dotColor[n.type]}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm font-bold text-text-pri ${!n.read ? '' : 'font-medium'}`}>
                  {n.title}
                </p>
                <span className="text-xs text-text-sec whitespace-nowrap">{formatDateTime(n.time)}</span>
              </div>
              <p className="text-xs text-text-sec mt-1 leading-relaxed">{n.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
