import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import AgentHeader from "./AgentHeader";
import ChatSidebar from "./ChatSidebar";
import AgentChatArea from "./AgentChatArea";

const AgentChatLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[280px] xl:w-[320px] 2xl:w-[360px] border-r border-border bg-muted/30 shrink-0">
        <ChatSidebar onConversationClick={() => {}} />
      </aside>

      {/* Main Chat Area */}
      <main className="flex flex-col flex-1 min-w-0 h-full relative">
        {/* Header fixo para o título "Câmara na Mão" permanecer visível com teclado aberto no app */}
        <AgentHeader />
        <div className="flex-1 flex flex-col min-h-0 pt-14">
          <AgentChatArea />
        </div>

        {/* Mobile Conversations Sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="right" className="w-[280px] p-0">
            <ChatSidebar onConversationClick={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
};

export default AgentChatLayout;