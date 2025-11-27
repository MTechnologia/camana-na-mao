import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ChatSidebar from "./ChatSidebar";
import ChatArea from "./ChatArea";
import { cn } from "@/lib/utils";

const ChatLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[280px] border-r border-border bg-muted/30">
        <ChatSidebar />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <ChatSidebar onConversationClick={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <main className="flex flex-col flex-1 min-w-0">
        {/* Header with Menu Toggle */}
        <header className="flex items-center h-14 px-4 border-b border-border bg-card">
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <h1 className="ml-2 text-lg font-semibold">CMSP Connect - Assistente IA</h1>
        </header>

        {/* Chat Area */}
        <ChatArea />
      </main>
    </div>
  );
};

export default ChatLayout;
