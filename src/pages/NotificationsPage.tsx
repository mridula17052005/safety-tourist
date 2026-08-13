import {
  Bell, CheckCircle, AlertTriangle, Info, AlertCircle, Siren,
  CheckCheck,
} from 'lucide-react';
import { useNotifications } from '@/lib/notifications';
import { Card, Button, EmptyState } from '@/components/ui';
import { cn, timeAgo } from '@/lib/utils';
import type { NotificationType } from '@/lib/types';

const TYPE_CONFIG: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100' },
  alert: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
  warning: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100' },
  success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  emergency: { icon: Siren, color: 'text-red-600', bg: 'bg-red-100' },
};

export function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell className="w-7 h-7" />}
            title="No notifications"
            description="You will receive alerts here when the AI detects safety concerns or when incidents are reported."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info;
            const Icon = config.icon;
            return (
              <Card
                key={n.id}
                className={cn(
                  'p-4 cursor-pointer transition-all hover:shadow-md',
                  !n.read && 'border-l-4 border-l-teal-500',
                )}
              >
                <div
                  className="flex items-start gap-3"
                  onClick={() => !n.read && markRead(n.id)}
                >
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', config.bg)}>
                    <Icon className={cn('w-4.5 h-4.5', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 text-sm">{n.title}</h3>
                      <span className="text-xs text-slate-400 shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-2" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
