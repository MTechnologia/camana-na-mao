import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Check, ExternalLink, AlertTriangle, Users, FileText, Bus, Building2 } from 'lucide-react';
import { getNotificationType } from '@/constants/notificationTypes';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type NotificationDropdownProps = {
  triggerClassName?: string;
};

export const NotificationDropdown = ({ triggerClassName }: NotificationDropdownProps) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  // Get only the 5 most recent notifications
  const recentNotifications = notifications.slice(0, 5);

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    setOpen(false);
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const formatCount = (count: number) => {
    if (count > 99) return '99+';
    return count.toString();
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'new_urban_report':
        return <Building2 className="h-3 w-3" />;
      case 'new_transport_report':
        return <Bus className="h-3 w-3" />;
      case 'new_user':
        return <Users className="h-3 w-3" />;
      case 'critical_report':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative h-9 w-9', triggerClassName)}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs"
            >
              {formatCount(unreadCount)}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto py-1 px-2 text-xs"
              onClick={() => markAllAsRead()}
            >
              Marcar todas
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        {recentNotifications.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            Nenhuma notificação
          </div>
        ) : (
          <>
            {recentNotifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-center gap-2 w-full">
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getNotificationType(notification.type).color}`}
                  >
                    {getIconForType(notification.type)}
                    <span className="ml-1">{getNotificationType(notification.type).label}</span>
                  </Badge>
                  {notification.priority === 'high' && (
                    <Badge variant="destructive" className="text-xs">!</Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(notification.created_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                </div>
                
                <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                  {notification.title}
                </p>
                
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {notification.message}
                </p>
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          className="justify-center text-primary cursor-pointer"
          onClick={() => {
            setOpen(false);
            navigate('/admin/notifications');
          }}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Ver todas as notificações
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
