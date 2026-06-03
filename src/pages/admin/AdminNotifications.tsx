import { useState, useEffect } from "react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { useNotifications } from "@/contexts/NotificationsContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  Users,
  FileText,
  Bus,
  Building2,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { handleNotificationNavigation } from "@/lib/handleNotificationNavigation";
import {
  getNotificationType,
  getNotificationPriority,
  ADMIN_NOTIFICATION_TYPES,
} from "@/constants/notificationTypes";
import { NOTIFICATION_TYPE_ICONS } from "@/components/icons";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const AdminNotifications = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    // Read filter
    if (filter === "unread" && n.is_read) return false;

    // Type filter
    if (typeFilter !== "all" && n.type !== typeFilter) return false;

    // Priority filter
    if (priorityFilter !== "all" && n.priority !== priorityFilter) return false;

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(query) || n.message.toLowerCase().includes(query);
    }

    return true;
  });

  // Stats
  const stats = {
    total: notifications.length,
    unread: unreadCount,
    critical: notifications.filter((n) => n.priority === "high" && !n.is_read).length,
    newReports: notifications.filter(
      (n) => ["new_urban_report", "new_transport_report"].includes(n.type) && !n.is_read,
    ).length,
    newUsers: notifications.filter((n) => n.type === "new_user" && !n.is_read).length,
  };

  const handleNotificationClick = (notification: (typeof notifications)[0]) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    void handleNotificationNavigation(notification, navigate);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredNotifications.map((n) => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBatchMarkRead = () => {
    selectedIds.forEach((id) => markAsRead(id));
    setSelectedIds([]);
  };

  const handleBatchDelete = () => {
    selectedIds.forEach((id) => deleteNotification(id));
    setSelectedIds([]);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "new_urban_report":
        return <Building2 className="h-4 w-4" />;
      case "new_transport_report":
        return <Bus className="h-4 w-4" />;
      case "new_user":
        return <Users className="h-4 w-4" />;
      case "critical_report":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Central de Alertas
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie notificações e alertas do sistema</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchNotifications()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Bell className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.unread}</p>
                  <p className="text-xs text-muted-foreground">Não lidas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                  <p className="text-xs text-muted-foreground">Críticos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <FileText className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.newReports}</p>
                  <p className="text-xs text-muted-foreground">Novos Relatos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10">
                  <Users className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.newUsers}</p>
                  <p className="text-xs text-muted-foreground">Novos Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar notificações..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {ADMIN_NOTIFICATION_TYPES.map((type) => {
                    const TypeIcon = NOTIFICATION_TYPE_ICONS[type.value];
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        {TypeIcon && (
                          <span className="mr-1.5 inline-flex shrink-0" aria-hidden>
                            <TypeIcon size={14} />
                          </span>
                        )}
                        {type.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">Todas ({notifications.length})</TabsTrigger>
              <TabsTrigger value="unread">Não Lidas ({unreadCount})</TabsTrigger>
            </TabsList>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.length} selecionada(s)
                </span>
                <Button variant="outline" size="sm" onClick={handleBatchMarkRead}>
                  <Check className="h-4 w-4 mr-1" />
                  Marcar lidas
                </Button>
                <Button variant="outline" size="sm" onClick={handleBatchDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              </div>
            )}
          </div>

          <TabsContent value={filter} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {filter === "unread"
                      ? "Nenhuma notificação não lida"
                      : "Nenhuma notificação encontrada"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {/* Select All Header */}
                  <div className="flex items-center gap-3 p-4 bg-muted/50">
                    <Checkbox
                      checked={
                        selectedIds.length === filteredNotifications.length &&
                        filteredNotifications.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">Selecionar todas</span>
                  </div>

                  {/* Notification List */}
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 p-4 transition-colors hover:bg-secondary/50 ${
                        !notification.is_read ? "bg-primary/5" : ""
                      }`}
                    >
                      <Checkbox
                        checked={selectedIds.includes(notification.id)}
                        onCheckedChange={(checked) => handleSelectOne(notification.id, !!checked)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}

                          <Badge
                            variant="secondary"
                            className={`text-xs ${getNotificationType(notification.type).color}`}
                          >
                            {getIconForType(notification.type)}
                            <span className="ml-1">
                              {getNotificationType(notification.type).label}
                            </span>
                          </Badge>

                          {notification.priority === "high" && (
                            <Badge variant="destructive" className="text-xs">
                              Urgente
                            </Badge>
                          )}

                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>

                        <h3
                          className={`font-medium ${
                            notification.is_read ? "text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {notification.title}
                        </h3>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {!notification.is_read && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;
