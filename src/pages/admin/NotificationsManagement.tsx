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
import { Bell, Send, Clock, Eye, MousePointer } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface NotificationHistory {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  user_id: string;
  is_read: boolean;
  read_at: string | null;
}

const NotificationsManagement = () => {
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    read: 0,
    unread: 0,
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

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
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
      // Get all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        toast.error('Nenhum usuário encontrado');
        return;
      }

      // Create notifications for all users
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'success': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'warning': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'error': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'info': return 'Informação';
      case 'success': return 'Sucesso';
      case 'warning': return 'Aviso';
      case 'error': return 'Erro';
      default: return type;
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
        <div className="flex items-center justify-between">
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
                        <SelectItem value="info">Informação</SelectItem>
                        <SelectItem value="success">Sucesso</SelectItem>
                        <SelectItem value="warning">Aviso</SelectItem>
                        <SelectItem value="error">Erro</SelectItem>
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
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={sendNotificationToAll} className="w-full">
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

        {/* Histórico */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Histórico de Notificações</h3>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma notificação encontrada</p>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 20).map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getTypeColor(notification.type)}>
                        {getTypeLabel(notification.type)}
                      </Badge>
                      {notification.is_read ? (
                        <Badge variant="secondary">Lida</Badge>
                      ) : (
                        <Badge variant="outline">Não lida</Badge>
                      )}
                    </div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(notification.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default NotificationsManagement;
