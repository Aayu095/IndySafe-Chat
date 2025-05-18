
"use client";

import type { ChatMessage, HazardCategory, ReportUIData } from '@/lib/types';
import MessageBubble from './MessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef } from 'react';

interface ChatWindowProps {
  messages: ChatMessage[];
  onCategorySelect?: (category: HazardCategory | '/cancel') => void;
  onUpvoteReport?: (reportId: string) => void;
  onDownvoteReport?: (reportId: string) => void;
}

export default function ChatWindow({ messages, onCategorySelect, onUpvoteReport, onDownvoteReport }: ChatWindowProps) {
  const lastMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastMessageRef.current) {
      // The message bubble animation is 300ms.
      // Scrolling after the animation helps ensure it scrolls to the correct final position.
      const timer = setTimeout(() => {
        lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 350); 

      return () => clearTimeout(timer);
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-grow p-3 md:p-4 bg-background rounded-t-lg">
       <div className="h-full space-y-1"> {/* Removed viewportRef, direct child of ScrollArea's viewport */}
        {messages.map((msg, index) => (
          <MessageBubble 
            key={msg.id} 
            ref={index === messages.length - 1 ? lastMessageRef : null}
            message={msg} 
            onCategorySelect={onCategorySelect}
            onUpvoteReport={onUpvoteReport}
            onDownvoteReport={onDownvoteReport}
          />
        ))}
       </div>
    </ScrollArea>
  );
}
