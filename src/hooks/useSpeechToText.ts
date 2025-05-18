
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechToTextOptions {
  onError?: (error: string) => void;
  onListeningChange?: (isListening: boolean) => void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeechToText(options?: SpeechToTextOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options; // Keep optionsRef updated with the latest options
  }, [options]);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      const notSupportedMsg = "Speech recognition is not supported by your browser.";
      setError(notSupportedMsg);
      if (optionsRef.current?.onError) {
        optionsRef.current.onError(notSupportedMsg);
      }
      return;
    }

    setIsSupported(true);
    const recognitionInstance = new SpeechRecognitionAPI();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';
    recognitionRef.current = recognitionInstance;

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      let current_final_parts = "";
      let current_interim_part = "";
      for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
              current_final_parts += event.results[i][0].transcript + " ";
          } else {
              current_interim_part = event.results[i][0].transcript;
          }
      }
      setTranscript((current_final_parts + current_interim_part).trim());
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = `Speech recognition error: ${event.error}`;
      if (event.error === 'network') {
        errorMessage = 'Network error during speech recognition. Please check your connection.';
      } else if (event.error === 'no-speech') {
         errorMessage = 'No speech was detected. Microphone might have timed out or is not capturing audio.';
      } else if (event.error === 'audio-capture') {
        errorMessage = 'Microphone problem. Ensure it is enabled and working.';
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorMessage = 'Microphone access denied. Please enable microphone permissions in your browser settings.';
      }
      setError(errorMessage);
      if (optionsRef.current?.onError) {
        optionsRef.current.onError(errorMessage);
      }
      // Ensure listening state is false on error
      setIsListening(false);
      if (optionsRef.current?.onListeningChange) {
          optionsRef.current.onListeningChange(false);
      }
    };

    recognitionInstance.onend = () => {
      // This is the definitive end from the browser's perspective
      setIsListening(false);
      if (optionsRef.current?.onListeningChange) {
        optionsRef.current.onListeningChange(false);
      }
    };
    
    return () => { // Cleanup on unmount
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try {
            // Only try to abort if it's in a state that can be aborted (e.g., listening)
            // However, abort is generally safe to call.
            recognitionRef.current.abort();
        } catch (e) {
            console.error('Error aborting speech recognition on cleanup:', e);
        }
        recognitionRef.current = null;
      }
    };
  }, []); // Empty dependency array: setup only once on mount.

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) { 
      try {
        setTranscript('');
        setError(null);
        recognitionRef.current.start();
        setIsListening(true);
        if (optionsRef.current?.onListeningChange) {
          optionsRef.current.onListeningChange(true);
        }
      } catch (err: any) {
        const startErrorMsg = `Could not start speech recognition: ${err.message || 'Unknown error'}. Try refreshing.`;
        setError(startErrorMsg);
        if (optionsRef.current?.onError) {
            optionsRef.current.onError(startErrorMsg);
        }
        setIsListening(false); 
        if (optionsRef.current?.onListeningChange) {
            optionsRef.current.onListeningChange(false);
        }
      }
    }
  }, [isListening]); // isListening is needed to prevent starting if already listening

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) { 
      try {
        recognitionRef.current.stop();
        // `onend` will be triggered by the browser API, which then sets isListening to false.
      } catch (e: any) {
        console.error("Error explicitly stopping speech recognition:", e);
        const stopErrorMsg = `Error stopping mic: ${e.message || 'Unknown error'}`;
        setError(stopErrorMsg);
        if (optionsRef.current?.onError) {
            optionsRef.current.onError(stopErrorMsg);
        }
        // Force React state if stop() call itself fails, though onend should ideally handle this
        setIsListening(false); 
        if (optionsRef.current?.onListeningChange) {
            optionsRef.current.onListeningChange(false);
        }
      }
    }
  }, [isListening]); // isListening is needed to prevent stopping if not listening

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    setTranscript, // Exporting setTranscript for ChatInput to clear it
  };
}
