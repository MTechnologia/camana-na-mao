import { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Send, Clock, Eye, Search, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { UnifiedFilterBar } from '@/components/filters/UnifiedFilterBar';
import { useFilters } from '@/hooks/useFilters';
import { FilterConfig, DateRangeValue } from '@/components/filters/types';
import { 
  getNotificationType, 
  getNotificationPriority,
  NOTIFICATION_TYPE_OPTIONS,
  NOTIFICATION_PRIORITY_OPTIONS,
  NOTIFICATION_STATUS_OPTIONS 
} from '@/constants/notificationTypes';

interface NotificationHistory {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  created_at: string;
  user_id: string;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
}

interface NotificationFilters {
  search: string;
  type: string;
  status: string;
  priority: string;
  dateRange: DateRangeValue;
}

const defaultFilters: NotificationFilters = {
  search: '',
  type: 'all',
  status: 'all',
  priority: 'all',
  dateRange: { from: undefined, to: undefined },
};

const filterConfig: FilterConfig<NotificationFilters> = {
  fields: [
    { 
      key: 'search', 
      type: 'search', 
      label: 'Buscar', 
      placeholder: 'Título ou mensagem...',
      colSpan: 2
    },
    { 
      key: 'type', 
      type: 'select', 
      label: 'Tipo', 
      options: [{ value: 'all', label: 'Todos os tipos' }, ...NOTIFICATION_TYPE_OPTIONS],
      clearable: true
    },
    { 
      key: 'status', 
      type: 'select', 
      label: 'Status', 
      options: NOTIFICATION_STATUS_OPTIONS,
      clearable: true
    },
    { 
      key: 'priority', 
      type: 'select', 
      label: 'Prioridade', 
      options: [{ value: 'all', label: 'Todas' }, ...NOTIFICATION_PRIORITY_OPTIONS],
      clearable: true
    },
    { 
      key: 'dateRange', 
      type: 'daterange', 
      label: 'Período',
      colSpan: 2
    },
  ],
  showActiveCount: true,
};

const NotificationsManagement = () => {
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    read: 0,
    unread: 0,
  });

  const { 
    filters, 
    setFilter, 
    clearAll, 
    activeCount,
    debouncedFilters 
  } = useFilters<NotificationFilters>({
    defaultValues: defaultFilters,
    debounceKeys: ['search'],
    debounceMs: 300,
  });

  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'normal',
    action_url: '',
  });

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [debouncedFilters, notifications]);

  const applyFilters = () => {
    let result = [...notifications];

    // Search filter
    if (debouncedFilters.search) {
      const searchLower = debouncedFilters.search.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(searchLower) ||
        n.message.toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (debouncedFilters.type && debouncedFilters.type !== 'all') {
      result = result.filter(n => n.type === debouncedFilters.type);
    }

    // Status filter
    if (debouncedFilters.status && debouncedFilters.status !== 'all') {
      if (debouncedFilters.status === 'read') {
        result = result.filter(n => n.is_read);
      } else if (debouncedFilters.status === 'unread') {
        result = result.filter(n => !n.is_read);
      }
    }

    // Priority filter
    if (debouncedFilters.priority && debouncedFilters.priority !== 'all') {
      result = result.filter(n => n.priority === debouncedFilters.priority);
    }

    // Date range filter
    if (debouncedFilters.dateRange?.from) {
      result = result.filter(n => new Date(n.created_at) >= debouncedFilters.dateRange.from!);
    }
    if (debouncedFilters.dateRange?.to) {
      result = result.filter(n => new Date(n.created_at) <= debouncedFilters.dateRange.to!);
    }

    setFilteredNotifications(result);
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setNotifications(data || []);
      setFilteredNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: total } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });

      const { count: read } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', true);

      const { count: unread } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      setStats({
        total: total || 0,
        read: read || 0,
        unread: unread || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const sendNotificationToAll = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        toast.error('Nenhum usuário encontrado');
        return;
      }

      const notificationsToInsert = profiles.map((profile) => ({
        user_id: profile.id,
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        priority: newNotification.priority,
        action_url: newNotification.action_url || null,
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);

      if (insertError) throw insertError;

      toast.success(`Notificação enviada para ${profiles.length} usuários`);
      setDialogOpen(false);
      setNewNotification({ title: '', message: '', type: 'info', priority: 'normal', action_url: '' });
      fetchNotifications();
      fetchStats();
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Erro ao enviar notificações');
    }
  };

  const KPICard = ({ icon: Icon, title, value, color }: any) => (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );

  const readRate = stats.total > 0 ? Math.round((stats.read / stats.total) * 100) : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gestão de Notificações</h1>
            <p className="text-muted-foreground">Gerencie notificações enviadas aos usuários</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Nova Notificação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar Notificação em Massa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                    placeholder="Título da notificação"
                  />
                </div>
                <div>
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    value={newNotification.message}
                    onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                    placeholder="Conteúdo da notificação"
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="action_url">URL de Ação (opcional)</Label>
                  <Input
                    id="action_url"
                    value={newNotification.action_url}
                    onChange={(e) => setNewNotification({ ...newNotification, action_url: e.target.value })}
                    placeholder="/audiencias ou https://exemplo.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Link para onde o usuário será direcionado ao clicar na notificação
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={newNotification.type}
                      onValueChange={(value) => setNewNotification({ ...newNotification, type: value })}
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTIFICATION_TYPE_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select
                      value={newNotification.priority}
                      onValueChange={(value) => setNewNotification({ ...newNotification, priority: value })}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTIFICATION_PRIORITY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={sendNotificationToAll} 
                  className="w-full"
                  disabled={!newNotification.title || !newNotification.message}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para Todos
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            icon={Send}
            title="Total Enviadas"
            value={stats.total}
            color="bg-primary/10 text-primary"
          />
          <KPICard
            icon={Eye}
            title="Taxa de Leitura"
            value={`${readRate}%`}
            color="bg-green-500/10 text-green-600"
          />
          <KPICard
            icon={Bell}
            title="Não Lidas"
            value={stats.unread}
            color="bg-yellow-500/10 text-yellow-600"
          />
        </div>

        {/* Filtros */}
        <UnifiedFilterBar
          config={filterConfig}
          filters={filters}
          onChange={setFilter}
          onClearAll={clearAll}
          activeCount={activeCount}
        />

        {/* Histórico */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Histórico de Notificações
              {activeCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({filteredNotifications.length} de {notifications.length})
                </span>
              )}
            </h3>
          </div>
          
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {activeCount > 0 
                  ? 'Nenhuma notificação encontrada com os filtros aplicados'
                  : 'Nenhuma notificação encontrada'
                }
              </p>
              {activeCount > 0 && (
                <Button variant="link" onClick={clearAll} className="mt-2">
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const typeConfig = getNotificationType(notification.type);
                const priorityConfig = getNotificationPriority(notification.priority);
                
                return (
                  <div
                    key={notification.id}
                    className="flex items-start justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={typeConfig.color}>
                          {typeConfig.icon} {typeConfig.label}
                        </Badge>
                        <Badge className={priorityConfig.color}>
                          {priorityConfig.label}
                        </Badge>
                        {notification.is_read ? (
                          <Badge variant="secondary">Lida</Badge>
                        ) : (
                          <Badge variant="outline">Não lida</Badge>
                        )}
                      </div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                      {notification.action_url && (
                        <p className="text-xs text-primary truncate">
                          → {notification.action_url}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(notification.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default NotificationsManagement;
