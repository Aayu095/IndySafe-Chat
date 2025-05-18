
"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SendHorizonal, ShieldAlert, MapIcon, ClipboardList, FileText, Zap, Mic, MicOff, Paperclip, XCircle, RefreshCw } from 'lucide-react';
import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface ChatInputProps {
  onSendMessage: (message: string | {
    text: string;
    uploadedImageUri?: string;
    uploadedImageLatitude?: number;
    uploadedImageLongitude?: number;
  }) => void;
  isLoading: boolean;
  placeholderText?: string;
}

interface QuickAction {
  label: string;
  command: string;
  icon: React.ElementType;
  ariaLabel: string;
}

const quickActions: QuickAction[] = [
  { label: "Report Hazard", command: "/report hazard", icon: ShieldAlert, ariaLabel: "Report a new public safety hazard. You will be asked for category, location, and details." },
  { label: "Map Area", command: "/map", icon: MapIcon, ariaLabel: "View map with incidents. Example: /map 39.7 -86.1 or just /map for current location." },
  { label: "Reports by Type", command: "/list_hazards", icon: ClipboardList, ariaLabel: "View existing hazard reports filtered by a category you select." },
  { label: "My Recent Reports", command: "/my_recent_reports", icon: FileText, ariaLabel: "View your recently submitted reports from this session." },
  { label: "Create Mock Alert", command: "/create_mock_alert", icon: Zap, ariaLabel: "Create a mock critical system alert for testing notifications." },
];

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

export default function ChatInput({
  onSendMessage,
  isLoading,
  placeholderText = 'Ask a question or use a quick action...',
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageLocation, setImageLocation] = useState<{latitude: number, longitude: number} | null>(null);

  const toastAlreadyShownRef = useRef<{[key: string]: boolean}>({});

  const speechOnError = useCallback((errorMessage: string) => {
    if (!toastAlreadyShownRef.current[errorMessage]) {
      toast({
        variant: 'destructive',
        title: 'Speech Recognition Error',
        description: errorMessage,
      });
      toastAlreadyShownRef.current[errorMessage] = true;
    }
  }, [toast]);

  const speechOnListeningChange = useCallback((listening: boolean) => {
    if (!listening) {
      // Reset toast shown flags when listening stops
      Object.keys(toastAlreadyShownRef.current).forEach(key => {
        toastAlreadyShownRef.current[key] = false;
      });
    }
  }, []);


  const {
    isListening,
    transcript,
    isSupported: speechIsSupported,
    startListening,
    stopListening,
    setTranscript: setSpeechTranscript,
  } = useSpeechToText({
    onError: speechOnError,
    onListeningChange: speechOnListeningChange,
  });

  useEffect(() => {
    if (isListening) {
      setInputValue(transcript);
    }
  }, [transcript, isListening]);


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please select a PNG, JPG, or JPEG image.',
        });
        return;
      }
      setSelectedFile(file);
      setImageLocation(null); // Reset location when new file is selected
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Attempt to get geolocation for the image
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setImageLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            toast({
              title: "Image Location Tagged",
              description: `Image will be tagged with current location: Lat ${position.coords.latitude.toFixed(3)}, Lon ${position.coords.longitude.toFixed(3)}`,
              duration: 3000,
            });
          },
          (error) => {
            console.warn("Error getting image geolocation:", error);
            toast({
              variant: "default", // Changed to default to be less intrusive
              title: "Image Location Notice",
              description: "Could not get current location for image. Location permission might be denied or unavailable.",
              duration: 4000,
            });
          }
        );
      }
    }
    // Reset file input value to allow selecting the same file again
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = useCallback(() => {
    setSelectedFile(null);
    setImagePreview(null);
    setImageLocation(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isListening) {
      stopListening(); 
      return; 
    }

    const messageText = inputValue.trim();
    if ((messageText || selectedFile) && !isLoading) {
      if (selectedFile && imagePreview) {
        onSendMessage({
          text: messageText,
          uploadedImageUri: imagePreview,
          uploadedImageLatitude: imageLocation?.latitude,
          uploadedImageLongitude: imageLocation?.longitude,
        });
      } else {
        onSendMessage(messageText);
      }
      setInputValue('');
      handleRemoveImage();
      setSpeechTranscript(''); 
    }
  }, [isListening, inputValue, selectedFile, isLoading, imagePreview, imageLocation, onSendMessage, stopListening, setInputValue, handleRemoveImage, setSpeechTranscript]);


  const handleQuickAction = (command: string) => {
    if (!isLoading) {
      if (isListening) { 
        stopListening();
      }
      onSendMessage(command);
      setInputValue('');
      setSpeechTranscript(''); 
      handleRemoveImage();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      setInputValue(''); 
      setSpeechTranscript(''); 
      handleRemoveImage(); 
      startListening();
    }
  };

  const prevIsListeningRef = useRef(isListening);
  useEffect(() => {
    if (prevIsListeningRef.current && !isListening && transcript.trim()) {
      onSendMessage(transcript.trim());
      setInputValue(''); 
      setSpeechTranscript(''); 
    }
    prevIsListeningRef.current = isListening;
  }, [isListening, transcript, onSendMessage, setInputValue, setSpeechTranscript]);


  return (
    <div className="border-t border-border bg-card p-3 md:p-4 rounded-b-lg shadow-sm">
      <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.command}
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction(action.command)}
            disabled={isLoading}
            className="text-xs sm:text-sm flex-grow justify-start text-left h-auto py-2 px-2.5 sm:px-3 whitespace-normal leading-tight shadow-sm hover:shadow-md transition-shadow group"
            title={action.label}
            aria-label={action.ariaLabel}
          >
            <action.icon className="mr-1.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-accent-foreground" />
            {action.label}
          </Button>
        ))}
      </div>
       {imagePreview && (
        <div className="mb-2.5 p-2.5 border border-border/70 rounded-lg relative bg-muted/30 shadow-inner">
          <Image src={imagePreview} alt="Selected preview" width={80} height={80} className="rounded-md object-contain" data-ai-hint="selected image preview"/>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive rounded-full"
            onClick={handleRemoveImage}
            aria-label="Remove image"
          >
            <XCircle className="h-5 w-5" />
          </Button>
          {selectedFile && <p className="text-xs text-muted-foreground mt-1.5">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</p>}
          {imageLocation && <p className="text-xs text-muted-foreground mt-0.5">Geo-tagged: Lat {imageLocation.latitude.toFixed(3)}, Lon {imageLocation.longitude.toFixed(3)}</p>}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
             if (isListening) { 
                stopListening();
             }
          }}
          placeholder={isListening ? "Listening..." : (selectedFile ? "Add a caption or send..." : placeholderText) }
          className="flex-grow focus-visible:ring-1 focus-visible:ring-ring h-10 text-sm"
          disabled={isLoading}
          aria-label="Chat message input"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          className="hidden"
          aria-label="Attach image file"
          id="chat-file-input"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isListening} 
          className="rounded-full w-10 h-10 shadow-sm hover:shadow-md transition-shadow"
          aria-label="Attach image"
          aria-controls="chat-file-input"
          title="Attach an image"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        {speechIsSupported && (
          <Button
            type="button"
            size="icon"
            variant={isListening ? "destructive" : "outline"}
            onClick={toggleListening}
            disabled={isLoading && !isListening} 
            className="rounded-full w-10 h-10 shadow-sm hover:shadow-md transition-shadow"
            aria-label={isListening ? "Stop listening" : "Start voice input"}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
        )}
        <Button
          type="submit"
          size="icon"
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full w-10 h-10 shadow-sm hover:shadow-md transition-shadow"
          disabled={isLoading || (!inputValue.trim() && !selectedFile && !isListening) } 
          aria-label="Send message"
          title="Send message"
        >
          <SendHorizonal className="h-5 w-5" />
        </Button>
      </form>
       {!speechIsSupported && (
          <p className="text-xs text-muted-foreground mt-1.5 text-center">
            Speech recognition not supported by your browser.
          </p>
      )}
    </div>
  );
}

    