
"use client";

import type { ChatMessage, HazardCategory, ReportUIData } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, AlertTriangle, ThumbsUp, ThumbsDown, Tag, CalendarDays, LocateFixed, Image as ImageIcon, MapPin, Map as MapIconLucide, Siren, ClipboardList, FileTextIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import React, { useState, useEffect } from 'react';

interface MessageBubbleProps {
  message: ChatMessage;
  onCategorySelect?: (category: HazardCategory | '/cancel') => void;
  onUpvoteReport?: (reportId: string) => void;
  onDownvoteReport?: (reportId: string) => void;
}

const MessageBubble = React.forwardRef<HTMLDivElement, MessageBubbleProps>(({ message, onCategorySelect, onUpvoteReport, onDownvoteReport }, ref) => {
  const isUser = message.sender === 'user';
  const isBot = message.sender === 'bot';
  const [clientFormattedTimestamp, setClientFormattedTimestamp] = useState<string | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    // This ensures that toLocaleTimeString (which can vary) is only called client-side.
    if (message.timestamp) {
      setClientFormattedTimestamp(
        new Date(message.timestamp).toLocaleTimeString([], { day: 'numeric', month:'short', hour: '2-digit', minute: '2-digit' })
      );
    }
  }, [message.timestamp]);
  
  const formatTextForDisplay = (text: string | undefined): (React.ReactNode)[] | null => {
    if (!text) return null;

    const lines = text.split('\n');
    const result: React.ReactNode[] = [];

    lines.forEach((line, lineIndex) => {
      // Regex to split by **...** but keep the delimiters for further processing
      const parts = line.split(/(\*\*.*?\*\*)/g).filter(part => part.length > 0);
      
      parts.forEach((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          result.push(<strong key={`bold-${lineIndex}-${partIndex}`}>{part.substring(2, part.length - 2)}</strong>);
        } else {
          result.push(part);
        }
      });

      if (lineIndex < lines.length - 1) {
        result.push(<br key={`br-${lineIndex}`} />);
      }
    });
    return result;
  };


  return (
    <div
      ref={ref}
      className={cn(
        'flex w-full items-end gap-2.5 py-2.5 animate-in fade-in-50 slide-in-from-bottom-2 duration-300',
        isUser ? 'justify-end pl-10 sm:pl-16' : 'justify-start pr-10 sm:pr-16'
      )}
    >
      {isBot && (
        <Avatar className={cn("h-9 w-9 self-start shadow-sm")}>
          <AvatarFallback className={cn(
            "bg-primary/80 text-primary-foreground", 
            message.type === 'image' && "bg-secondary",
            message.data?.alertDetails?.isCritical && "bg-destructive text-destructive-foreground"
            )}>
            {message.type === 'image' ? <MapIconLucide size={20} /> : (message.data?.alertDetails?.isCritical ? <Siren size={20} /> :<Bot size={20} />) }
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[80%] sm:max-w-[75%] rounded-xl px-4 py-3 shadow-md break-words',
          isUser ? 'bg-primary text-primary-foreground rounded-br-lg' : '',
          isBot ? 'bg-card text-card-foreground rounded-bl-lg' : '',
          message.type === 'error' ? 'bg-destructive/10 text-destructive border border-destructive/30 text-sm text-center w-full max-w-full rounded-lg py-2.5 px-3.5' : '',
          isBot && message.data?.alertDetails?.isCritical ? 'bg-destructive/15 border border-destructive/40' : ''
        )}
      >
        {message.isLoading && !message.text ? (
          <div className="flex items-center space-x-1.5 py-1">
            <Skeleton className="h-2.5 w-2.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
            <Skeleton className="h-2.5 w-2.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
            <Skeleton className="h-2.5 w-2.5 rounded-full bg-current animate-bounce" />
          </div>
        ) : (
          <>
            {message.type === 'error' && (
              <div className="flex items-center gap-2 justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <span className="text-sm text-destructive">{message.text}</span>
              </div>
            )}
            
            {message.uploadedImageUri && (
              <div className="mt-1 mb-1.5 overflow-hidden rounded-lg border border-border/50 bg-muted/20 p-1">
                <Image
                  src={message.uploadedImageUri}
                  alt="User uploaded image"
                  width={250}
                  height={200}
                  className="object-contain max-h-[250px] w-auto rounded-md mx-auto"
                  data-ai-hint="hazard incident"
                />
                 {message.uploadedImageLatitude && message.uploadedImageLongitude && (
                  <p className={cn(
                    "text-xs mt-1.5 p-1 text-center rounded-b-md",
                    isUser ? "text-primary-foreground/80 bg-black/40" : "text-muted-foreground bg-muted/50"
                    )}>
                    <MapPin size={12} className="inline-block mr-1" />
                    Approx. Loc: {message.uploadedImageLatitude.toFixed(3)}, {message.uploadedImageLongitude.toFixed(3)}
                  </p>
                )}
              </div>
            )}

            {(message.type !== 'error' && message.text) && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {formatTextForDisplay(message.text)}
                </p>
            )}
            
            {message.type === 'image' && message.imageUrl && ( 
              <div className="mt-2 overflow-hidden rounded-lg border border-border/50 shadow-sm">
                <Image
                  src={message.imageUrl}
                  alt="Generated map or image from bot"
                  width={600} 
                  height={400} 
                  className="object-cover w-full" 
                  data-ai-hint="map incident"
                />
              </div>
            )}

             {message.data?.alertDetails?.isCritical && (
              <p className="mt-2 text-xs italic text-destructive-foreground/80 bg-destructive/80 p-1.5 rounded-md shadow-inner">
                SYSTEM MESSAGE: This is a critical alert. If Twilio SMS were fully integrated, an SMS notification would be dispatched to subscribed users regarding '{message.data.alertDetails.title}'.
              </p>
            )}


            {message.type === 'category_selector' && message.data?.categories && onCategorySelect && (
              <div className="mt-2.5 space-y-2">
                {message.data.categories.map((category: HazardCategory) => (
                  <Button
                    key={category}
                    variant="outline"
                    size="sm"
                    className="bg-background hover:bg-accent hover:text-accent-foreground w-full justify-start text-left h-auto py-2 px-3 shadow-sm hover:shadow-md transition-shadow"
                    onClick={() => onCategorySelect(category)}
                    aria-label={`Select category: ${category}`}
                  >
                    {category}
                  </Button>
                ))}
                 <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive w-full justify-start text-left h-auto py-2 px-3 mt-1 shadow-sm hover:shadow-md transition-shadow"
                    onClick={() => onCategorySelect('/cancel')}
                    aria-label="Cancel category selection"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Cancel
                  </Button>
              </div>
            )}

            {message.type === 'report_list' && message.data?.reports && (
              <div className="mt-2.5 space-y-3.5">
                {message.data.reports.map((report: ReportUIData) => (
                  <div key={report.id} className="p-3 border border-border/70 rounded-lg bg-background/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs py-0.5 px-2 font-medium">
                           <Tag size={13} className="mr-1.5 opacity-80"/> {report.category}
                        </Badge>
                        {report.distanceKm !== undefined && (
                             <Badge variant="outline" className="text-xs py-0.5 px-2">
                                <LocateFixed size={13} className="mr-1.5 opacity-80"/> {report.distanceKm.toFixed(1)} km away
                             </Badge>
                        )}
                    </div>
                    <p className="text-sm font-medium text-foreground mb-0.5">Location:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-1">{report.formattedAddress || report.location}</p>
                    { (report.latitude && report.longitude && report.formattedAddress && report.formattedAddress !== report.location) &&
                       <p className="text-xs text-muted-foreground/80 mb-1">(Original input: {report.location})</p>
                    }
                     <p className="text-sm font-medium text-foreground mb-0.5">Details:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.details}</p>
                     { (report.latitude && report.longitude) &&
                       <p className="text-xs text-muted-foreground/80 mt-1">Coords: {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</p>
                    }
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-dashed border-border/50">
                      <div className="flex items-center text-xs text-muted-foreground/80">
                        <CalendarDays size={13} className="mr-1.5 opacity-80"/>
                        {clientFormattedTimestamp || '...'} 
                      </div>
                      <div className="flex items-center gap-0.5">
                        <span className="text-xs text-muted-foreground px-1">
                           (👍<span className="font-medium text-foreground">{report.upvotes}</span>&nbsp;/&nbsp;👎<span className="font-medium text-foreground">{report.downvotes}</span>)
                        </span>
                        {onUpvoteReport && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-green-600" onClick={() => onUpvoteReport(report.id)} aria-label={`Upvote report ${report.id.substring(0,6)}`}>
                            <ThumbsUp size={15} />
                          </Button>
                        )}
                        {onDownvoteReport && (
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => onDownvoteReport(report.id)} aria-label={`Downvote report ${report.id.substring(0,6)}`}>
                            <ThumbsDown size={15} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div
              className={cn(
                'mt-1.5 text-xs',
                 isUser ? 'text-primary-foreground/70' : 'text-muted-foreground/80',
                 (message.type === 'error') ? 'text-center w-full' : (isUser ? 'text-right' : 'text-left')
              )}
            >
             {clientFormattedTimestamp || 'Sending...'}
            </div>
          </>
        )}
      </div>
      {isUser && (
         <Avatar className="h-9 w-9 self-start shadow-sm">
           <AvatarFallback className="bg-accent text-accent-foreground">
            {message.uploadedImageUri ? <ImageIcon size={18} /> : <User size={18} />}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';
export default MessageBubble;

