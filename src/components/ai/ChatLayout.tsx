import { useState } from "react";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ChatSidebar from "./ChatSidebar";
import ChatArea from "./ChatArea";
import { useNavigate } from "react-router-dom";

const ChatLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[280px] border-r border-border bg-muted/30">
        <ChatSidebar />
      </aside>

      {/* Main Chat Area */}
      <main className="flex flex-col flex-1 min-w-0">
        {/* Header with Back and Conversations */}
        <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card">
          {/* Back Button - Left */}
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          {/* Title - Center */}
          <h1 className="text-lg font-semibold">Assistente IA</h1>
          
          {/* Conversations Menu - Right */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <MessageSquare className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <ChatSidebar onConversationClick={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        {/* Chat Area */}
        <ChatArea />
      </main>
    </div>
  );
};

export default ChatLayout;
