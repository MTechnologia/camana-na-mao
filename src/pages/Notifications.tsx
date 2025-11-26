import FloatingNavbar from "@/components/FloatingNavbar";
import PageHeader from "@/components/ui/page-header";

const Notifications = () => {

  const notifications = [
    {
      id: 1,
      title: "Sessão Plenária Hoje",
      message: "A sessão plenária começará às 14h",
      time: "Há 1 hora",
      unread: true,
    },
    {
      id: 2,
      title: "Documento Aprovado",
      message: "Seu protocolo #1234 foi aprovado",
      time: "Há 3 horas",
      unread: true,
    },
    {
      id: 3,
      title: "Novo Projeto em Votação",
      message: "Projeto de Lei 456/2024 entrou em votação",
      time: "Ontem",
      unread: false,
    },
    {
      id: 4,
      title: "Agendamento Confirmado",
      message: "Seu atendimento está marcado para amanhã às 10h",
      time: "2 dias atrás",
      unread: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Notificações" />

      {/* Notifications List */}
      <div className="divide-y divide-border">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`px-6 py-4 hover:bg-secondary transition-colors ${
              notification.unread ? "bg-secondary/50" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              {notification.unread && (
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3
                  className={`font-semibold text-foreground mb-1 ${
                    notification.unread ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {notification.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-1">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground">{notification.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <FloatingNavbar />
    </div>
  );
};

export default Notifications;
