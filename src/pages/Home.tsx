import { useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import FloatingNavbar from "@/components/FloatingNavbar";
import MenuDrawer from "@/components/MenuDrawer";

const Home = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const shortcuts = [
    { id: 1, title: "Protocolo Digital", icon: "📄", color: "bg-blue-500" },
    { id: 2, title: "Agendamento", icon: "📅", color: "bg-green-500" },
    { id: 3, title: "Consultas", icon: "🔍", color: "bg-purple-500" },
    { id: 4, title: "Documentos", icon: "📋", color: "bg-orange-500" },
  ];

  const highlights = [
    {
      id: 1,
      title: "Sessão Plenária Hoje",
      subtitle: "Acompanhe ao vivo",
      image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400",
    },
  ];

  const smallHighlights = [
    {
      id: 1,
      title: "Projetos em Votação",
      count: "12 novos",
      color: "bg-accent",
    },
    {
      id: 2,
      title: "Notícias Recentes",
      count: "Ver todas",
      color: "bg-primary",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-background px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              </svg>
            </div>
          </div>

          {/* Avatar */}
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-semibold"
          >
            LO
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Buscar..."
            className="pl-10 h-12 rounded-full bg-secondary border-none"
          />
        </div>
      </header>

      {/* Content */}
      <div className="px-6 pt-6">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Olá, Luana</h1>
          <p className="text-muted-foreground">O que você precisa hoje?</p>
        </div>

        {/* Shortcuts Carousel */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Atalhos</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className="min-w-[140px] aspect-square rounded-2xl bg-card border border-border p-4 flex flex-col items-center justify-center gap-2 hover:shadow-lg transition-shadow"
              >
                <div className={`w-12 h-12 ${shortcut.color} rounded-xl flex items-center justify-center text-2xl`}>
                  {shortcut.icon}
                </div>
                <p className="text-sm text-center font-medium text-foreground">{shortcut.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Highlights */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Destaques</h2>
          {highlights.map((highlight) => (
            <div
              key={highlight.id}
              className="rounded-2xl overflow-hidden bg-card border border-border mb-4 hover:shadow-lg transition-shadow"
            >
              <img
                src={highlight.image}
                alt={highlight.title}
                className="w-full h-40 object-cover"
              />
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{highlight.title}</h3>
                  <p className="text-sm text-muted-foreground">{highlight.subtitle}</p>
                </div>
                <ChevronRight className="text-muted-foreground" size={20} />
              </div>
            </div>
          ))}
        </div>

        {/* Small Highlights */}
        <div className="grid grid-cols-2 gap-3">
          {smallHighlights.map((item) => (
            <div
              key={item.id}
              className={`${item.color} rounded-2xl p-4 text-white hover:shadow-lg transition-shadow`}
            >
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm opacity-90">{item.count}</p>
            </div>
          ))}
        </div>
      </div>

      <FloatingNavbar />
      <MenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
};

export default Home;
