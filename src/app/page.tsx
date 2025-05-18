
"use client"; 

import ChatInterface from '@/components/chat/ChatInterface';
import IndySafeLogo from '@/components/icons/IndySafeLogo';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import HelpGuideDialog from '@/components/help/HelpGuideDialog';
import { useState } from 'react';
import { HelpCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function HomePage() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [chatResetKey, setChatResetKey] = useState(0);
  const { toast } = useToast();

  const handleResetChat = () => {
    setChatResetKey(prevKey => prevKey + 1);
    toast({
      title: "Chat Reset",
      description: "The chat history has been cleared.",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-muted/50">
      <header className="bg-card text-card-foreground p-3 md:p-4 shadow-md sticky top-0 z-50 border-b border-border">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IndySafeLogo className="h-9 w-9 md:h-10 md:w-10 text-primary" />
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">IndySafe Chat</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetChat} 
              className="shadow-sm hover:shadow-md transition-shadow"
              aria-label="Reset chat"
              title="Reset Chat"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsHelpOpen(true)} 
              className="shadow-sm hover:shadow-md transition-shadow"
              aria-label="Open help guide"
              title="Help"
            >
              <HelpCircle className="mr-1.5 h-4 w-4" />
              Help
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-2 sm:p-4 overflow-hidden flex justify-center items-start md:items-center">
        <ChatInterface key={chatResetKey} resetTrigger={chatResetKey} />
      </main>
       <footer className="text-center p-3 text-xs text-muted-foreground bg-card border-t border-border">
        IndySafe Chat - Empowering Indianapolis Communities
        <span className="mx-1.5">|</span>
        <Link href="/report" className="hover:underline text-primary font-medium">
            Report Hazard via Form
        </Link>
      </footer>
      <HelpGuideDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </div>
  );
}
