
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Info, MessageCircle, Mic, Paperclip, ClipboardList, MapIcon, ShieldAlert, FileText, Zap, FileInputIcon, RefreshCw, MicOff } from "lucide-react";

interface HelpGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HelpGuideDialog({ open, onOpenChange }: HelpGuideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader className="pr-10">
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <Info className="h-6 w-6 text-primary" />
            IndySafe Chat Help Guide
          </DialogTitle>
          <DialogDescription>
            Learn how to use IndySafe Chat effectively.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-2 space-y-3 py-2 custom-scrollbar">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="quick-actions">
              <AccordionTrigger className="text-base font-medium hover:no-underline">
                <MessageCircle className="h-5 w-5 mr-2 text-accent" /> Quick Actions (Buttons)
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2 pl-2">
                <p>Use these buttons below the chat input for common tasks:</p>
                <ul className="list-disc list-inside space-y-1.5">
                  <li><ShieldAlert className="inline h-4 w-4 mr-1" /> <strong>Report Hazard:</strong> Start the process to report a new public safety hazard. You will be asked for category, location, and details.</li>
                  <li><MapIcon className="inline h-4 w-4 mr-1" /> <strong>Map Area:</strong> View a map of your current location (if permission given) or a specified area, showing recent incidents.</li>
                  <li><ClipboardList className="inline h-4 w-4 mr-1" /> <strong>Reports by Type:</strong> View existing hazard reports filtered by a category you select.</li>
                  <li><FileText className="inline h-4 w-4 mr-1" /> <strong>My Recent Reports:</strong> See hazard reports you've submitted in this session.</li>
                  <li><Zap className="inline h-4 w-4 mr-1" /> <strong>Create Mock Alert:</strong> For testing, creates a sample system alert.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="text-commands">
              <AccordionTrigger className="text-base font-medium hover:no-underline">
                <MessageCircle className="h-5 w-5 mr-2 text-accent" /> Text Commands & Header Actions
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2 pl-2">
                <p>You can also type commands or use header buttons:</p>
                <ul className="list-disc list-inside space-y-1.5">
                  <li><strong>Reset Chat (Header Button <RefreshCw className="inline h-3 w-3" />):</strong> Clears the current chat history and starts over. Also available by typing <code>/reset_chat</code>.</li>
                  <li><code>/report hazard</code> - Starts the hazard reporting flow.</li>
                  <li><code>/map [latitude] [longitude]</code> - Show map for coordinates. If no coordinates, it tries your current location.</li>
                  <li><code>/list_hazards [category]</code> - List reports for a specific category (e.g., <code>/list_hazards Fire</code>). If no category, prompts for selection.</li>
                  <li><code>/nearby_hazards [lat] [lon] [radius_km]</code> - List reports near coordinates (radius defaults to 5km).</li>
                  <li><code>/alerts_near [lat] [lon] [radius_km]</code> - List official alerts near coordinates.</li>
                  <li><code>/my_recent_reports</code> - View your reports.</li>
                  <li><code>/create_mock_alert</code> - Create a test alert.</li>
                  <li><code>/cancel</code> - Cancel current multi-step reporting or listing process. A "Cancel" button also appears during category selection.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="voice-input">
              <AccordionTrigger className="text-base font-medium hover:no-underline">
                <Mic className="h-5 w-5 mr-2 text-accent" /> Voice Input
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pl-2">
                <p>Click the microphone icon <Mic className="inline h-4 w-4" /> to dictate your message. Click it again <MicOff className="inline h-4 w-4 text-destructive" /> (or let it auto-stop) to stop. Your message will be sent automatically after you stop speaking.</p>
                <p>Ensure your browser has microphone permissions enabled for this site.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="image-upload">
              <AccordionTrigger className="text-base font-medium hover:no-underline">
                <Paperclip className="h-5 w-5 mr-2 text-accent" /> Image Upload
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pl-2">
                <p>Click the paperclip icon <Paperclip className="inline h-4 w-4" /> to attach an image (PNG, JPG, JPEG) to your message. You can add a caption before sending. Images may be geo-tagged with your current location if permission is granted.</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="report-form">
              <AccordionTrigger className="text-base font-medium hover:no-underline">
                <FileInputIcon className="h-5 w-5 mr-2 text-accent" /> Standalone Report Form
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pl-2">
                <p>As an alternative to reporting via chat, you can use the dedicated "Report Hazard via Form" page. This is especially useful if you prefer a form-based input or if the chat interface is experiencing issues.</p>
                <p>You can find the link to this form in the footer of the main chat page.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="general-tips">
              <AccordionTrigger className="text-base font-medium hover:no-underline">
                <Info className="h-5 w-5 mr-2 text-accent" /> General Tips
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2 pl-2">
                <ul className="list-disc list-inside space-y-1.5">
                  <li>Be clear and concise in your descriptions when reporting hazards.</li>
                  <li>If asked for location, provide an address, cross-streets, or well-known landmark. The system will attempt to geocode it.</li>
                  <li>Official alerts will appear as pop-up notifications (toasts) and will not clutter the chat.</li>
                  <li>This chatbot uses AI; always verify critical information with official sources if in doubt.</li>
                  <li>A WhatsApp interface via Twilio is planned for future updates, allowing another way to interact.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogClose asChild>
          <Button type="button" variant="outline" className="mt-4 shadow-sm">
            Close
          </Button>
        </DialogClose>
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: hsl(var(--muted) / 0.5);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: hsl(var(--border));
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: hsl(var(--accent) / 0.8);
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
