import { useState } from "react";

import PageHeader from "@/components/ui/page-header";
import { PendingRatingsBanner } from "@/components/evaluation/PendingRatingsBanner";
import { useNotifications } from "@/contexts/NotificationsContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Check, CheckCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { getNotificationType, getNotificationPriority } from "@/constants/notificationTypes";
import { NOTIFICATION_TYPE_ICONS } from "@/components/icons";

const SUBSCRIPTION_NOTIFICATION_TYPES = new Set([
  "servico_nova_avaliacao",
  "transporte_linha_relato",
  "transporte_linha_padrao",
  "audiencia_topic_alert",
  "audiencia_inscricao",
  "audiencia_lembrete_d1",
  "audiencia_lembrete_1h",
  "evaluation_reminder",
]);

const Notifications = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    isLoading,
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();
  
  const [filter, setFilter] = useState<'all' | 'unread' | 'subscriptions'>('all');

  const subscriptionNotifications = notifications.filter((n) => SUBSCRIPTION_NOTIFICATION_TYPES.has(n.type));
  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.is_read)
      : filter === 'subscriptions'
        ? subscriptionNotifications
        : notifications;

  const resolveNotificationActionUrl = (notification: typeof notifications[0]) => {
    const metadata = notification.metadata ?? {};
    const reportId =
      typeof metadata.report_id === 'string' ? metadata.report_id : undefined;
    const patternId =
      typeof metadata.pattern_id === 'string' ? metadata.pattern_id : undefined;
    const lineId =
      typeof metadata.line_id === 'string' ? metadata.line_id : undefined;

    if (notification.type === 'transporte_linha_relato' && reportId) {
      return `/transporte/meus-relatos?reportId=${encodeURIComponent(reportId)}`;
    }

    if (notification.type === 'transporte_linha_padrao' && patternId) {
      const params = new URLSearchParams({ patternId });
      if (lineId) {
        params.set('lineId', lineId);
      }
      return `/transporte/padroes?${params.toString()}`;
    }

    return notification.action_url;
  };

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    const actionUrl = resolveNotificationActionUrl(notification);
    if (actionUrl) {
      navigate(actionUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-[60px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Notificações" />

      <div className="p-4 space-y-4">
        <PendingRatingsBanner />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
            </Badge>
          </div>
          
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
              className="flex items-center gap-2"
            >
              <CheckCheck size={16} />
              Marcar todas
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread' | 'subscriptions')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todas ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">Não Lidas ({unreadCount})</TabsTrigger>
            <TabsTrigger value="subscriptions">Acompanhamento ({subscriptionNotifications.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {filter === 'unread'
                ? 'Nenhuma notificação não lida'
                : filter === 'subscriptions'
                  ? 'Nenhuma notificação de acompanhamento'
                  : 'Nenhuma notificação'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => {
              const isSubscriptionNotification = SUBSCRIPTION_NOTIFICATION_TYPES.has(notification.type);
              return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`relative p-4 rounded-lg border transition-colors cursor-pointer ${
                  notification.is_read 
                    ? 'bg-background hover:bg-secondary/50' 
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs inline-flex items-center gap-1 ${getNotificationType(notification.type).color}`}
                      >
                        {NOTIFICATION_TYPE_ICONS[notification.type] && (
                          <span className="shrink-0 inline-flex" aria-hidden>
                            {(() => {
                              const Icon = NOTIFICATION_TYPE_ICONS[notification.type];
                              return Icon ? <Icon size={12} /> : null;
                            })()}
                          </span>
                        )}
                        {getNotificationType(notification.type).label}
                      </Badge>

                      {isSubscriptionNotification && (
                        <Badge variant="outline" className="text-xs">
                          Acompanhamento
                        </Badge>
                      )}
                      
                      {notification.priority === 'high' && (
                        <Badge className={`text-xs ${getNotificationPriority('high').color}`}>
                          Urgente
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className={`font-semibold mb-1 ${
                      notification.is_read ? 'text-muted-foreground' : 'text-foreground'
                    }`}>
                      {notification.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    
                    <p className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {!notification.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <Check size={16} />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default Notifications;
