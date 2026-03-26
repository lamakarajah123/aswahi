import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Check, CheckCheck, Package, ShoppingCart, Truck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AppNotification, requestNotificationPermission } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkOneRead: (id: number) => void;
}

function getNotifIcon(type: string) {
  switch (type) {
    case 'new_order':
      return <ShoppingCart className="h-4 w-4 text-green-500" />;
    case 'order_status':
      return <Package className="h-4 w-4 text-blue-500" />;
    case 'new_delivery':
      return <Truck className="h-4 w-4 text-orange-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  unreadCount,
  onMarkAllRead,
  onMarkOneRead,
}) => {
  const [open, setOpen] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
  };

  const handleNotifClick = (notif: AppNotification) => {
    if (!notif.is_read) {
      onMarkOneRead(notif.id);
    }
    if (notif.order_id) {
      if (notif.type === 'new_order') {
        navigate('/store-dashboard');
      } else {
        navigate('/orders');
      }
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5 text-green-600 animate-pulse" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <div className="flex items-center gap-1">
            {!permissionGranted && 'Notification' in window && Notification.permission !== 'denied' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-green-600 hover:text-green-700"
                onClick={handleEnableNotifications}
              >
                Enable alerts
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={onMarkAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Read all
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((notif, idx) => (
                <React.Fragment key={notif.id}>
                  <button
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 items-start ${
                      !notif.is_read ? 'bg-green-50/50 dark:bg-green-950/20' : ''
                    }`}
                    onClick={() => handleNotifClick(notif)}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {getNotifIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${!notif.is_read ? 'font-semibold' : 'font-medium'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                  </button>
                  {idx < notifications.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};