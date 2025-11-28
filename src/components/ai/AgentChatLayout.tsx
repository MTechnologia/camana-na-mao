import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import AgentHeader from "./AgentHeader";
import ChatSidebar from "./ChatSidebar";
import AgentChatArea from "./AgentChatArea";

const AgentChatLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[280px] border-r border-border bg-muted/30">
        <ChatSidebar onConversationClick={() => {}} />
      </aside>

      {/* Main Chat Area */}
      <main className="flex flex-col flex-1 min-w-0">
        {/* Minimalist Header */}
        <AgentHeader />

        {/* Chat Area */}
        <AgentChatArea />

        {/* Mobile Conversations Button - Fixed */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button 
              variant="secondary" 
              size="icon" 
              className="fixed bottom-24 right-4 rounded-full shadow-lg z-40 h-12 w-12"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] p-0">
            <ChatSidebar onConversationClick={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
};

export default AgentChatLayout;
