
"use client";

import { useState, useEffect, useCallback }
from 'react';
import type { ChatMessage, HazardCategory, HazardReportDocument, AlertDocument, MapIncident, ReportUIData, AlertDocumentWithId, AlertUrgency, GetNearbyIncidentsMapOutput } from '@/lib/types';
import { HAZARD_CATEGORIES } from '@/lib/types';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';
import { smartEmergencyAssistance } from '@/ai/flows/smart-emergency-assistance';
import { getNearbyIncidentsMap } from '@/ai/flows/incident-mapping';
import { geocodeAddress, type GeocodeAddressFlowOutput } from '@/ai/flows/geocode-address-flow';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getDistanceFromLatLonInKm } from '@/lib/utils';
import { Info, Siren } from 'lucide-react';

// Firebase imports
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  limit, 
  getDocs,
  where,
  doc,
  updateDoc,
  increment,
  type Timestamp
} from 'firebase/firestore';


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp | undefined;
let db: ReturnType<typeof getFirestore> | undefined;

try {
    if (
        firebaseConfig.apiKey &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId &&
        firebaseConfig.storageBucket &&
        firebaseConfig.messagingSenderId &&
        firebaseConfig.appId
    ) {
        if (!getApps().length) {
          firebaseApp = initializeApp(firebaseConfig);
        } else {
          firebaseApp = getApps()[0];
        }
        db = getFirestore(firebaseApp);
    } else {
        console.error("Firebase configuration is incomplete. Firebase services will not be initialized. Please check your .env.local file.");
    }
} catch (error: any) {
    console.error("Error initializing Firebase: ", error.message, error.stack);
}


type HazardReportingStage = 
  | 'idle'
  | 'awaiting_category'
  | 'awaiting_location'
  | 'awaiting_details';

interface HazardReport {
  category?: HazardCategory;
  location?: string; // Original user input
  details?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
}

const ANONYMOUS_USER_ID_KEY = 'indySafeChatAnonymousUserId';
const SIMULATED_LATITUDE = 39.7684; // Downtown Indianapolis approx.
const SIMULATED_LONGITUDE = -86.1581;
const INITIAL_WELCOME_ID = 'welcome-initial';
const WELCOME_MESSAGE = "Welcome to IndySafe Chat! I'm here to help with public safety in Indianapolis. Use the quick actions below or type your query to get started.";


type PendingCategorySelectionFor = 'report_hazard' | 'list_reports' | null;

interface ChatInterfaceProps {
  resetTrigger?: number; 
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function ChatInterface({ resetTrigger }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: INITIAL_WELCOME_ID, 
      sender: 'bot', 
      text: WELCOME_MESSAGE, 
      timestamp: Date.now() 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [hazardReportingStage, setHazardReportingStage] = useState<HazardReportingStage>('idle');
  const [currentHazardReport, setCurrentHazardReport] = useState<HazardReport>({});
  const { toast } = useToast();
  const [processedAlertIds, setProcessedAlertIds] = useState<Set<string>>(new Set());
  const [anonymousUserId, setAnonymousUserId] = useState<string | null>(null);
  const [pendingCategorySelectionFor, setPendingCategorySelectionFor] = useState<PendingCategorySelectionFor>(null);


  useEffect(() => {
    let storedUserId = localStorage.getItem(ANONYMOUS_USER_ID_KEY);
    if (!storedUserId) {
      storedUserId = `anon-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(ANONYMOUS_USER_ID_KEY, storedUserId);
    }
    setAnonymousUserId(storedUserId);
  }, []);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'> & {id?: string}) => {
    setMessages((prev) => [
      ...prev,
      { ...message, id: message.id || String(Date.now() + Math.random()), timestamp: Date.now() },
    ]);
  }, []);
  
  const processHazardReportInput = useCallback( async (userInput: string) => {
    let newReport = { ...currentHazardReport };
    let nextStage: HazardReportingStage = hazardReportingStage;
    let botResponse = '';
    let currentStepBotMessageId: string | null = null; 

    if (hazardReportingStage === 'awaiting_location') {
      newReport.location = userInput; 
      const geocodingMsgId = String(Date.now() + Math.random() + "_geocoding");
      currentStepBotMessageId = geocodingMsgId;
      addMessage({id: geocodingMsgId, sender: 'bot', text: `Geocoding location: "${userInput}"...`, isLoading: true, timestamp: Date.now() });
      
      try {
        const geocodeResult: GeocodeAddressFlowOutput = await geocodeAddress({ address: userInput });
        
        if (geocodeResult.error && geocodeResult.error.toLowerCase().includes("not configured")) {
             newReport.latitude = SIMULATED_LATITUDE;
             newReport.longitude = SIMULATED_LONGITUDE;
             newReport.formattedAddress = `${userInput} (Location approximated; Geocoding service not configured)`;
             botResponse = `Geocoding service is not fully configured. Your report will use the location text you provided, and coordinates will be approximated.\n\nPlease describe the hazard in more detail.`;
             toast({title: "Geocoding Service Not Configured", description: `Using text: ${userInput}. Coordinates approximated. ${geocodeResult.error}`, variant: "default"});
        } else if (geocodeResult.latitude && geocodeResult.longitude) {
          newReport.latitude = geocodeResult.latitude;
          newReport.longitude = geocodeResult.longitude;
          newReport.formattedAddress = geocodeResult.formattedAddress || userInput; 
          botResponse = `Location understood as: "${newReport.formattedAddress}".\n(Coordinates: ${newReport.latitude.toFixed(4)}, ${newReport.longitude.toFixed(4)})\n\nPlease describe the hazard in more detail.`;
          toast({title: "Location Geocoded", description: `Address: ${newReport.formattedAddress}`});
        } else {
            newReport.latitude = SIMULATED_LATITUDE;
            newReport.longitude = SIMULATED_LONGITUDE;
            newReport.formattedAddress = `${userInput} (Location approximated)`; 
            botResponse = `Could not precisely geocode "${userInput}". Report will use the location text you provided, and coordinates will be approximated.\n\nPlease describe the hazard in more detail.`;
            toast({title: "Geocoding Issue", description: geocodeResult.error || `Could not find specific coordinates for "${userInput}". Using provided text as location, coordinates approximated.`, variant: "default"});
        }
      } catch (error: any) {
        console.error("Geocoding flow error:", error);
        newReport.latitude = SIMULATED_LATITUDE;
        newReport.longitude = SIMULATED_LONGITUDE;
        newReport.formattedAddress = `${userInput} (Location approximated due to error)`; 
        botResponse = `There was an issue geocoding the location: ${error.message}. Report will use the location text you provided, and coordinates will be approximated.\n\nPlease describe the hazard in more detail.`;
        toast({title: "Geocoding Error", description: `An error occurred during geocoding. Details: ${error.message}`, variant: "destructive"});
      }
      nextStage = 'awaiting_details';
    } else if (hazardReportingStage === 'awaiting_details') {
      newReport.details = userInput;
      const submittingMsgId = String(Date.now() + Math.random() + "_submitting");
      currentStepBotMessageId = submittingMsgId;
      addMessage({id: submittingMsgId, sender: 'bot', text: 'Submitting your report...', isLoading: true, timestamp: Date.now()});
      
      if (!anonymousUserId) {
         botResponse = "Error: Could not identify user session. Please refresh.";
         toast({ title: "Session Error", description: botResponse, variant: "destructive" });
      } else {
        const reportData: Partial<HazardReportDocument> = {
          category: newReport.category!,
          location: newReport.location!,
          details: newReport.details!,
          userId: anonymousUserId,
          timestamp: serverTimestamp() as Timestamp,
          upvotes: 0,
          downvotes: 0,
        };
  
        if (newReport.formattedAddress && newReport.formattedAddress.trim() !== '') {
          reportData.formattedAddress = newReport.formattedAddress;
        } else {
          reportData.formattedAddress = newReport.location!; 
        }
        
        if (newReport.latitude !== undefined && typeof newReport.latitude === 'number') {
          reportData.latitude = newReport.latitude;
        }
        if (newReport.longitude !== undefined && typeof newReport.longitude === 'number') {
          reportData.longitude = newReport.longitude;
        }
        
        const reportToSave = reportData as HazardReportDocument;
        console.log("Attempting to save hazard report (Chat):", JSON.stringify(reportToSave, null, 2)); 

        try {
          if (!db) throw new Error("Firestore not initialized for saving report. Check Firebase config.");
          const docRef = await addDoc(collection(db, "hazard_reports"), reportToSave);
          
          botResponse = `Thank you for your report!\n\nCategory: ${reportToSave.category}\nLocation: ${reportToSave.formattedAddress}\nDetails: ${reportToSave.details}${reportToSave.latitude ? `\n(Approx. Coordinates: ${reportToSave.latitude.toFixed(4)}, ${reportToSave.longitude?.toFixed(4)})` : ''}\nReport ID: ${docRef.id}`;
          toast({
            title: "Hazard Reported Successfully",
            description: `Category: ${reportToSave.category}, Location: ${reportToSave.formattedAddress}. Report ID: ${docRef.id}`,
            variant: "default"
          });
        } catch (error: any) {
          console.error("Error saving hazard report: ", error);
          botResponse = `There was an issue submitting your report: ${error.message}. Please try again.`;
          toast({
            title: "Error Reporting Hazard",
            description: `Could not save your report to the database: ${error.message}. Please check your Firebase configuration and data, then try again.`,
            variant: "destructive",
          });
        }
      }
      nextStage = 'idle';
      newReport = {}; 
    }
    
    setCurrentHazardReport(newReport);
    setHazardReportingStage(nextStage);

    if (currentStepBotMessageId) {
        setMessages(prev => prev.map(msg => 
            msg.id === currentStepBotMessageId ? 
            { ...msg, text: botResponse, isLoading: false, type: botResponse.startsWith("Error:") || botResponse.startsWith("There was an issue") ? 'error' : 'text', timestamp: Date.now() } 
            : msg
        ));
    } else if (botResponse) { 
        addMessage({ sender: 'bot', text: botResponse, type: botResponse.startsWith("Error:") || botResponse.startsWith("There was an issue") ? 'error' : 'text' });
    }
  }, [currentHazardReport, hazardReportingStage, addMessage, toast, anonymousUserId]);

  const _generateMapWithCoordinates = useCallback(async (latitude: number, longitude: number, botMessageIdToUpdate: string) => {
    const updateMapMessage = (text: string, isLoadingState = true, type: ChatMessage['type'] = 'text', imageUrl?: string) => {
        setMessages(prev => prev.map(msg => msg.id === botMessageIdToUpdate ? {
            ...msg, 
            text, 
            isLoading: isLoadingState, 
            type, 
            imageUrl: imageUrl || msg.imageUrl,
            timestamp: Date.now() 
        } : msg));
    };

    updateMapMessage(
        `Generating map for your area (Centered: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})...`, 
        true, 
        'text', 
        undefined 
    );
    
    await delay(500); // Delay to ensure "Generating map..." message is visible

    try {
        let fetchedIncidentsForMap: MapIncident[] = [];
        if (db) {
            try {
                const reportsQuery = query(
                    collection(db, "hazard_reports"),
                    orderBy("timestamp", "desc"),
                    limit(5)
                );
                const querySnapshot = await getDocs(reportsQuery);
                fetchedIncidentsForMap = querySnapshot.docs.map(docSnap => {
                    const data = docSnap.data() as HazardReportDocument;
                    return {
                        category: data.category,
                        location: data.formattedAddress || data.location,
                        latitude: data.latitude,
                        longitude: data.longitude,
                    };
                });
            } catch (fetchError: any) {
                console.warn("[IndySafe] Error fetching hazard reports for map:", fetchError.message);
            }
        }
        
        const mapResponse: GetNearbyIncidentsMapOutput = await getNearbyIncidentsMap({
            latitude: latitude,
            longitude: longitude,
            incidents: fetchedIncidentsForMap.length > 0 ? fetchedIncidentsForMap : undefined,
        });

        if (mapResponse && mapResponse.mapUrl) {
            updateMapMessage(
                `Here's a map of your area (Centered: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}):` + (fetchedIncidentsForMap.length > 0 ? `\n(Includes ${fetchedIncidentsForMap.length} recent report(s))` : "\n(Note: Reported incident markers depend on geocoded coordinates.)"),
                false, 
                'image', 
                mapResponse.mapUrl
            );
        } else {
            throw new Error("Map generation service returned an invalid response.");
        }

    } catch (error: any) {
        console.error('[IndySafe] Error in _generateMapWithCoordinates:', error.message, error.stack);
        const detail = (error as Error).message || 'Sorry, I couldn\'t generate the map at this time. Please try again later.';
        updateMapMessage(
            `Map generation failed: ${detail}`,
            false,
            'error'
        );
    } finally {
        setIsLoading(false); 
    }
  }, [setMessages]); 

  const handleSendMessage = useCallback(async (messageInput: string | { 
    text: string; 
    uploadedImageUri?: string;
    uploadedImageLatitude?: number;
    uploadedImageLongitude?: number;
  }) => {
    let userMessageText = '';
    let uploadedImageUri: string | undefined = undefined;
    let uploadedImageLatitude: number | undefined = undefined;
    let uploadedImageLongitude: number | undefined = undefined;
    
    if (typeof messageInput === 'string') {
      userMessageText = messageInput.trim();
    } else {
      userMessageText = messageInput.text.trim();
      uploadedImageUri = messageInput.uploadedImageUri;
      uploadedImageLatitude = messageInput.uploadedImageLatitude;
      uploadedImageLongitude = messageInput.uploadedImageLongitude;
    }

    if (!userMessageText && !uploadedImageUri) return;
    
    const parts = userMessageText.split(' ');
    const isMapQuickActionFromButton = userMessageText.toLowerCase() === '/map' && parts.length === 1;
    
    // Add user message UNLESS it's the initial '/map' from the quick action button
    if (!isMapQuickActionFromButton) {
      addMessage({ sender: 'user', text: userMessageText, uploadedImageUri, uploadedImageLatitude, uploadedImageLongitude });
    }
    
    setIsLoading(true); 
    
    if (isMapQuickActionFromButton) { 
        const geoLocLoadingMsgId = String(Date.now() + Math.random() + "_geo_loc_loading");
        addMessage({
            id: geoLocLoadingMsgId, 
            sender: 'bot', 
            text: "Attempting to get your current location for the map...", 
            isLoading: true, 
            timestamp: Date.now()
        });
        await delay(500); // Delay to ensure "Attempting..." message is visible
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              
              // Update the "Attempting..." message to "Location found."
              setMessages(prev => prev.map(msg => msg.id === geoLocLoadingMsgId ? {
                  ...msg,
                  text: "Location found.", 
                  isLoading: false, 
                  timestamp: Date.now()
              } : msg));

              // Add the user's effective command message
              addMessage({ sender: 'user', text: `/map ${latitude.toFixed(6)} ${longitude.toFixed(6)}` });
              
              // Add a NEW bot message for map generation and pass its ID
              const mapDisplayMsgId = String(Date.now() + Math.random() + "_map_display");
              addMessage({
                id: mapDisplayMsgId,
                sender: 'bot',
                text: `Generating map for your area (Centered: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})...`,
                isLoading: true,
                timestamp: Date.now()
              });
            
              await _generateMapWithCoordinates(latitude, longitude, mapDisplayMsgId); 
            },
            (geoError) => {
              console.error("Error getting geolocation:", geoError);
              setMessages(prev => prev.map(msg => msg.id === geoLocLoadingMsgId ? {
                  ...msg,
                  text: "Could not get your current location. Please provide coordinates like: /map <latitude> <longitude> (e.g., /map 39.7684 -86.1581) or allow location access.",
                  type: 'error',
                  isLoading: false,
                  timestamp: Date.now()
              } : msg));
              setIsLoading(false); 
            }
          );
        } else {
            setMessages(prev => prev.map(msg => msg.id === geoLocLoadingMsgId ? {
                ...msg,
                text: "Geolocation is not supported by your browser. Please provide coordinates like: /map <latitude> <longitude>",
                type: 'error',
                isLoading: false,
                timestamp: Date.now()
            } : msg));
            setIsLoading(false); 
        }
        return; 
    }

    // For all other commands
    const genericLoadingBotMessageId = String(Date.now() + Math.random() + "_loading");
    addMessage({ id: genericLoadingBotMessageId, sender: 'bot', text: '', isLoading: true, timestamp: Date.now() });
    
    const updateOrAddBotMessage = (update: Partial<Omit<ChatMessage, 'id' | 'timestamp' | 'sender'>>, clearLoading = true) => {
        setMessages(prev => {
            const existingMsgIndex = prev.findIndex(msg => msg.id === genericLoadingBotMessageId);
            if (existingMsgIndex !== -1) {
                return prev.map((msg, index) => 
                    index === existingMsgIndex ? 
                    { 
                        ...msg, 
                        ...update, 
                        text: (update.text !== undefined) ? update.text : (clearLoading ? "" : (msg.text || "Processing...")),
                        isLoading: !clearLoading, 
                        timestamp: clearLoading ? Date.now() : msg.timestamp 
                    } : msg
                );
            } else { 
                // This branch should ideally not be hit if genericLoadingBotMessageId was just added.
                // But as a fallback, add a new message.
                const newMsgId = String(Date.now() + Math.random());
                return [
                    ...prev.filter(msg => msg.isLoading !== true || (genericLoadingBotMessageId && msg.id !== genericLoadingBotMessageId)), 
                    { 
                        id: newMsgId,
                        sender: 'bot',
                        text: update.text || (clearLoading ? "" : "Processing..."),
                        isLoading: !clearLoading, 
                        timestamp: Date.now(),
                        ...update,
                        type: update.type || 'text', // Ensure type is set
                    }
                ];
            }
        });
    };
    
    if (pendingCategorySelectionFor && userMessageText.toLowerCase() !== '/cancel') {
      updateOrAddBotMessage({
        text: `Please select a category using the buttons above. Or type /cancel to exit ${pendingCategorySelectionFor === 'report_hazard' ? 'reporting' : 'listing'}.`,
        type: 'text',
      });
      setIsLoading(false);
      return;
    }
    if (userMessageText.toLowerCase() === '/cancel') {
        setHazardReportingStage('idle');
        setPendingCategorySelectionFor(null);
        setCurrentHazardReport({});
        updateOrAddBotMessage({ text: "Action cancelled."});
        setIsLoading(false);
        return;
    }

    if (hazardReportingStage !== 'idle' && hazardReportingStage !== 'awaiting_category') {
      // Remove the generic loading message before calling processHazardReportInput, 
      // as it manages its own specific loading/response messages.
      setMessages(prev => prev.filter(msg => msg.id !== genericLoadingBotMessageId));
      await processHazardReportInput(userMessageText);
      setIsLoading(false); 
      return;
    }

    if (userMessageText.toLowerCase().startsWith('/report hazard')) {
      if (!db) {
         updateOrAddBotMessage({
          text: 'Hazard reporting is currently unavailable. Please ensure Firebase is configured correctly.',
          type: 'error',
        });
      } else {
        setHazardReportingStage('awaiting_category');
        setPendingCategorySelectionFor('report_hazard');
        setCurrentHazardReport({});
        updateOrAddBotMessage({
          text: 'Please select a hazard category to report:',
          type: 'category_selector',
          data: { categories: HAZARD_CATEGORIES },
        });
      }
    } else if (userMessageText.toLowerCase().startsWith('/map') && parts.length === 3) { 
        const lat = parseFloat(parts[1]);
        const lon = parseFloat(parts[2]);
        if (!isNaN(lat) && !isNaN(lon)) {
           // genericLoadingBotMessageId is already added.
           // Update it to say "Generating map..." and then pass it to _generateMapWithCoordinates
           setMessages(prev => prev.map(msg => msg.id === genericLoadingBotMessageId ? {
               ...msg,
               text: `Generating map for your area (Centered: ${lat.toFixed(4)}, ${lon.toFixed(4)})...`,
               isLoading: true 
           } : msg));
           await _generateMapWithCoordinates(lat, lon, genericLoadingBotMessageId); 
        } else {
          updateOrAddBotMessage({ text: "Invalid coordinates for /map. Please use format: /map <latitude> <longitude>", type: 'error' });
        }
    } else if (userMessageText.toLowerCase().startsWith('/list_hazards')) {
        if (!db) {
            updateOrAddBotMessage({
                text: 'Hazard listing is currently unavailable. Please ensure Firebase is configured correctly.',
                type: 'error',
            });
        } else {
            const categoryQuery = parts.slice(1).join(' ').trim();
            if (!categoryQuery) { 
                setPendingCategorySelectionFor('list_reports');
                updateOrAddBotMessage({
                    text: 'Please select a category to list reports for:',
                    type: 'category_selector',
                    data: { categories: HAZARD_CATEGORIES },
                });
            } else {
                const isValidCategory = HAZARD_CATEGORIES.some(
                    (cat) => cat.toLowerCase() === categoryQuery.toLowerCase()
                );
                if (!isValidCategory) {
                    updateOrAddBotMessage({
                        text: `Invalid category: '${categoryQuery}'. Please use one of the following: ${HAZARD_CATEGORIES.join(', ')} or use the 'View Reports by Type' button.`,
                        type: 'error',
                    });
                } else {
                    const categoryToQuery = HAZARD_CATEGORIES.find(cat => cat.toLowerCase() === categoryQuery.toLowerCase()) as HazardCategory;
                    try {
                        const reportsQuery = query(
                            collection(db, "hazard_reports"),
                            where("category", "==", categoryToQuery),
                            orderBy("timestamp", "desc"),
                            limit(10)
                        );
                        const querySnapshot = await getDocs(reportsQuery);
                        if (querySnapshot.empty) {
                            updateOrAddBotMessage({
                                text: `No recent hazard reports found for the category: ${categoryToQuery}.`,
                            });
                        } else {
                            const reportsData: ReportUIData[] = querySnapshot.docs
                                .map((docSnap) => {
                                    const data = docSnap.data() as HazardReportDocument;
                                    const ts = data.timestamp as Timestamp;
                                    return {
                                        id: docSnap.id,
                                        category: data.category,
                                        location: data.location, 
                                        formattedAddress: data.formattedAddress,
                                        details: data.details,
                                        upvotes: data.upvotes || 0,
                                        downvotes: data.downvotes || 0,
                                        timestamp: ts?.toDate()?.getTime(),
                                        latitude: data.latitude,
                                        longitude: data.longitude,
                                    };
                                });
                            updateOrAddBotMessage({
                                text: `Found ${querySnapshot.size} '${categoryToQuery}' report(s):`,
                                type: 'report_list',
                                data: { reports: reportsData }
                            });
                        }
                    } catch (error: any) {
                        console.error(`Error fetching ${categoryToQuery} reports:`, error);
                        updateOrAddBotMessage({
                            text: `Sorry, I couldn't fetch reports for '${categoryToQuery}' at this time. Details: ${error.message}`,
                            type: 'error',
                        });
                    }
                }
            }
        }
    } else if (userMessageText.toLowerCase().startsWith('/nearby_hazards ')) {
        if (!db) {
            updateOrAddBotMessage({
                text: 'Nearby hazard search is currently unavailable. Please ensure Firebase is configured correctly.',
                type: 'error',
            });
        } else {
            if (parts.length < 3 || parts.length > 4) {
                updateOrAddBotMessage({
                    text: "Invalid format. Use: /nearby_hazards <latitude> <longitude> [radius_in_km]\nExample: /nearby_hazards 39.7 -86.1 5 (radius is optional, defaults to 5km)",
                    type: 'error',
                });
            } else {
                const lat = parseFloat(parts[1]);
                const lon = parseFloat(parts[2]);
                const radiusKm = parts.length === 4 ? parseFloat(parts[3]) : 5;
                if (isNaN(lat) || isNaN(lon) || isNaN(radiusKm) || radiusKm <=0) {
                    updateOrAddBotMessage({
                        text: "Invalid latitude, longitude, or radius. Please provide valid numbers.\nExample: /nearby_hazards 39.7 -86.1 5",
                        type: 'error',
                    });
                } else {
                    try {
                        const reportsQuery = query(
                            collection(db, "hazard_reports"),
                            where("latitude", "!=", null), 
                            orderBy("timestamp", "desc"),
                            limit(50) 
                        );
                        const querySnapshot = await getDocs(reportsQuery);
                        const allReportsWithCoords = querySnapshot.docs.map(docSnap => ({id: docSnap.id, ...docSnap.data()} as HazardReportDocument & {id:string}));
                        const nearbyReportsData: ReportUIData[] = allReportsWithCoords.filter(report => {
                            if (report.latitude && report.longitude) { 
                                const distance = getDistanceFromLatLonInKm(lat, lon, report.latitude, report.longitude);
                                return distance <= radiusKm;
                            }
                            return false;
                        }).map((report) => {
                             const ts = report.timestamp as Timestamp;
                             return {
                                id: report.id!,
                                category: report.category,
                                location: report.location, 
                                formattedAddress: report.formattedAddress,
                                details: report.details,
                                upvotes: report.upvotes || 0,
                                downvotes: report.downvotes || 0,
                                timestamp: ts?.toDate()?.getTime(),
                                latitude: report.latitude,
                                longitude: report.longitude,
                                distanceKm: report.latitude && report.longitude ? getDistanceFromLatLonInKm(lat, lon, report.latitude, report.longitude) : undefined
                             }
                        });
                        if (nearbyReportsData.length === 0) {
                            updateOrAddBotMessage({
                                text: `No hazard reports found within ${radiusKm}km of ${lat.toFixed(4)}, ${lon.toFixed(4)}. Ensure reports have geocoded coordinates.`,
                            });
                        } else {
                            updateOrAddBotMessage({
                                text: `Found ${nearbyReportsData.length} hazard report(s) within ${radiusKm}km of ${lat.toFixed(4)}, ${lon.toFixed(4)}:`,
                                type: 'report_list',
                                data: { reports: nearbyReportsData }
                            });
                        }
                    } catch (error: any) {
                        console.error(`Error fetching nearby reports:`, error);
                        updateOrAddBotMessage({
                            text: `Sorry, I couldn't fetch nearby reports at this time. Details: ${error.message}`,
                            type: 'error',
                        });
                    }
                }
            }
        }
    } else if (userMessageText.toLowerCase().startsWith('/alerts_near ')) {
        if (!db) {
            updateOrAddBotMessage({
                text: 'Nearby alert search is currently unavailable. Please ensure Firebase is configured correctly.',
                type: 'error',
            });
        } else {
            if (parts.length < 3 || parts.length > 4) {
                updateOrAddBotMessage({
                    text: "Invalid format. Use: /alerts_near <latitude> <longitude> [radius_in_km]\nExample: /alerts_near 39.7 -86.1 5 (radius is optional, defaults to 5km)",
                    type: 'error',
                });
            } else {
                const lat = parseFloat(parts[1]);
                const lon = parseFloat(parts[2]);
                const radiusKm = parts.length === 4 ? parseFloat(parts[3]) : 5;
                if (isNaN(lat) || isNaN(lon) || isNaN(radiusKm) || radiusKm <=0) {
                    updateOrAddBotMessage({
                        text: "Invalid latitude, longitude, or radius. Please provide valid numbers.\nExample: /alerts_near 39.7 -86.1 5",
                        type: 'error',
                    });
                } else {
                    try {
                        const alertsQuery = query(
                            collection(db, "alerts"),
                            where("latitude", "!=", null), 
                            orderBy("timestamp", "desc"),
                            limit(20) 
                        );
                        const querySnapshot = await getDocs(alertsQuery);
                        const allAlertsWithCoords = querySnapshot.docs.map(docSnap => docSnap.data() as AlertDocument);
                        const nearbyAlerts = allAlertsWithCoords.filter(alert => {
                            if (alert.latitude && alert.longitude) {
                                const distance = getDistanceFromLatLonInKm(lat, lon, alert.latitude, alert.longitude);
                                return distance <= radiusKm;
                            }
                            return false;
                        });
                        if (nearbyAlerts.length === 0) {
                            updateOrAddBotMessage({
                                text: `No official alerts with coordinates found within ${radiusKm}km of ${lat.toFixed(4)}, ${lon.toFixed(4)}. Ensure alerts in Firestore have latitude and longitude fields.`,
                            });
                        } else {
                            const alertsText = nearbyAlerts
                                .map((alert, index) => {
                                    const ts = alert.timestamp as Timestamp;
                                    const dateStr = ts && ts.toDate ? ts.toDate().toLocaleString() : 'N/A';
                                    const distance = alert.latitude && alert.longitude ? getDistanceFromLatLonInKm(lat, lon, alert.latitude, alert.longitude).toFixed(2) : 'N/A';
                                    return `${index + 1}. **${alert.title}** (${distance} km away, issued ${dateStr}): ${alert.text}`;
                                })
                                .join('\n\n');
                            updateOrAddBotMessage({
                                text: `Found ${nearbyAlerts.length} official alert(s) within ${radiusKm}km of ${lat.toFixed(4)}, ${lon.toFixed(4)}:\n${alertsText}`,
                            });
                        }
                    } catch (error: any) {
                        console.error(`Error fetching nearby alerts:`, error);
                        updateOrAddBotMessage({
                            text: `Sorry, I couldn't fetch nearby alerts at this time. Details: ${error.message}`,
                            type: 'error',
                        });
                    }
                }
            }
        }
    } else if (userMessageText.toLowerCase() === '/create_mock_alert') {
        if (!db) {
            updateOrAddBotMessage({
                text: 'Cannot create mock alert. Firebase is not configured correctly.',
                type: 'error',
            });
        } else {
            const mockAlert: Omit<AlertDocument, 'id'> = { 
                title: "Mock Critical Weather Alert",
                text: "This is a simulated CRITICAL weather alert for Marion County. Take immediate action based on official guidance.",
                timestamp: serverTimestamp() as Timestamp,
                urgency: "critical" as AlertUrgency, 
                latitude: 39.7684 + Math.random() * 0.1 - 0.05, 
                longitude: -86.1581 + Math.random() * 0.1 - 0.05,
            };
            try {
                await addDoc(collection(db, "alerts"), mockAlert);
                updateOrAddBotMessage({
                    text: "A mock 'Critical Weather Alert' has been created and saved to Firestore. It should appear as a Toast notification shortly.",
                });
                 toast({
                    title: "Mock Critical Alert Created",
                    description: "Critical Weather Alert added to Firestore.",
                });
            } catch (error: any) {
                console.error("Error creating mock alert:", error);
                updateOrAddBotMessage({
                    text: `Sorry, there was an issue creating the mock alert. Details: ${error.message}`,
                    type: 'error',
                });
                toast({
                    title: "Error Creating Mock Alert",
                    description: (error as Error).message,
                    variant: "destructive",
                });
            }
        }
    } else if (userMessageText.toLowerCase() === '/my_recent_reports') {
        if (!db || !anonymousUserId) {
            updateOrAddBotMessage({
                text: 'Cannot fetch your reports. User session or Firebase not available.',
                type: 'error',
            });
        } else {
            try {
                const reportsQuery = query(
                    collection(db, "hazard_reports"),
                    where("userId", "==", anonymousUserId),
                    orderBy("timestamp", "desc"),
                    limit(5) 
                );
                const querySnapshot = await getDocs(reportsQuery);
                if (querySnapshot.empty) {
                    updateOrAddBotMessage({
                        text: "You haven't submitted any reports in this session yet.",
                    });
                } else {
                    const reportsData: ReportUIData[] = querySnapshot.docs
                        .map((docSnap) => {
                            const data = docSnap.data() as HazardReportDocument;
                            const ts = data.timestamp as Timestamp;
                            return {
                                id: docSnap.id,
                                category: data.category,
                                location: data.location, 
                                formattedAddress: data.formattedAddress,
                                details: data.details,
                                upvotes: data.upvotes || 0,
                                downvotes: data.downvotes || 0,
                                timestamp: ts?.toDate()?.getTime(),
                                latitude: data.latitude,
                                longitude: data.longitude,
                            };
                        });
                    updateOrAddBotMessage({
                        text: `Here are your 5 most recent reports:`,
                        type: 'report_list',
                        data: { reports: reportsData }
                    });
                }
            } catch (error: any) {
                console.error(`Error fetching your reports:`, error);
                updateOrAddBotMessage({
                    text: `Sorry, I couldn't fetch your reports at this time. Details: ${error.message}`,
                    type: 'error',
                });
            }
        }
    } else if (userMessageText.toLowerCase() === '/reset_chat') {
        setMessages([
            { id: INITIAL_WELCOME_ID, sender: 'bot', text: WELCOME_MESSAGE, timestamp: Date.now() }
        ]);
        setHazardReportingStage('idle');
        setPendingCategorySelectionFor(null);
        setCurrentHazardReport({});
        toast({
            title: "Chat Reset",
            description: "The chat history has been cleared.",
        });
        setMessages(prev => prev.filter(msg => msg.id !== genericLoadingBotMessageId)); // Remove loading message
        setIsLoading(false); // Ensure isLoading is false after reset
        return; // Important: return here to prevent further processing by smartEmergencyAssistance
    }
    else { // Default to smart assistance
      try {
        const coordRegex = /(-?\d{1,2}(\.\d+)?)\s*[,]?\s*(-?\d{1,3}(\.\d+)?)/;
        const match = userMessageText.match(coordRegex);
        let assistanceInput: { 
            query: string; 
            latitude?: number; 
            longitude?: number; 
            imageDataUri?: string;
            uploadedImageLatitude?: number;
            uploadedImageLongitude?: number;
        } = { 
            query: userMessageText,
            imageDataUri: uploadedImageUri,
            uploadedImageLatitude: uploadedImageLatitude,
            uploadedImageLongitude: uploadedImageLongitude,
        };
        if (match && !assistanceInput.latitude && !assistanceInput.longitude) { 
            assistanceInput.latitude = parseFloat(match[1]);
            assistanceInput.longitude = parseFloat(match[3]);
        }
        const assistanceResponse = await smartEmergencyAssistance(assistanceInput);
        updateOrAddBotMessage({ text: assistanceResponse.advice });
      } catch (error: any) {
        console.error('Error getting smart assistance:', error);
        updateOrAddBotMessage({
          text: (error as Error).message || 'Sorry, I encountered an issue trying to respond. Please try asking differently.',
          type: 'error',
        });
      }
    }
    // Ensure isLoading is false UNLESS we are in the map geolocation flow which handles its own isLoading state.
    if (!(userMessageText.toLowerCase() === '/map' && parts.length === 1 && navigator.geolocation)) {
      setIsLoading(false);
    }
  }, [addMessage, pendingCategorySelectionFor, hazardReportingStage, processHazardReportInput, anonymousUserId, toast, _generateMapWithCoordinates, setMessages]); 
  
  const handleCategorySelect = useCallback( (category: HazardCategory | '/cancel') => {
    const currentAction = pendingCategorySelectionFor; 
    
    if (category === '/cancel') {
        addMessage({ sender: 'user', text: 'Cancel Action' }); 
        setHazardReportingStage('idle');
        setPendingCategorySelectionFor(null);
        setCurrentHazardReport({});
        addMessage({ sender: 'bot', text: "Action cancelled."}); 
        return;
    }

    if (currentAction === 'report_hazard' && hazardReportingStage === 'awaiting_category') {
      addMessage({ sender: 'user', text: `Selected category: ${category}` }); 
      setCurrentHazardReport((prev) => ({ ...prev, category }));
      setHazardReportingStage('awaiting_location');
      setPendingCategorySelectionFor(null); 
      addMessage({ 
        sender: 'bot',
        text: `You selected: **${category}** to report.\n\nPlease provide the location of the hazard (e.g., address or cross-streets).`,
        type: 'text', 
      });
    } else if (currentAction === 'list_reports') {
      setPendingCategorySelectionFor(null); 
      handleSendMessage(`/list_hazards ${category}`); 
    }
  }, [addMessage, hazardReportingStage, pendingCategorySelectionFor, handleSendMessage]);


  useEffect(() => {
    if (resetTrigger === undefined) return; 

    // Reset logic if triggered by parent (e.g. header reset button)
    setMessages([
        { id: INITIAL_WELCOME_ID, sender: 'bot', text: WELCOME_MESSAGE, timestamp: Date.now() }
    ]);
    setHazardReportingStage('idle');
    setPendingCategorySelectionFor(null);
    setCurrentHazardReport({});
    setProcessedAlertIds(new Set());
    setIsLoading(false); 
    
  }, [resetTrigger]); 

  useEffect(() => {
    if (!db) {
      return () => {}; 
    }
    let unsubscribe: (() => void) | null = null;
    try {
      const alertsCol = collection(db, 'alerts');
      const q = query(alertsCol, orderBy('timestamp', 'desc')); 

      unsubscribe = onSnapshot(q, (querySnapshot) => {
        querySnapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const alertData = { id: change.doc.id, ...change.doc.data() } as AlertDocumentWithId;
            
            if (alertData.id && !processedAlertIds.has(alertData.id)) {
              const isCritical = alertData.urgency === 'critical';
              const toastTitle = (
                  <div className="flex items-center gap-2">
                    {isCritical ? <Siren className="text-destructive-foreground h-5 w-5" /> : <Info className="text-foreground h-5 w-5" />}
                    <span>{alertData.title}</span>
                  </div>
              );

              toast({
                  title: toastTitle,
                  description: (
                    <>
                      {alertData.text}
                      {alertData.latitude && alertData.longitude && 
                        <p className="text-xs mt-1 opacity-80">
                          (Location: {alertData.latitude.toFixed(4)}, {alertData.longitude.toFixed(4)})
                        </p>
                      }
                       {isCritical && (
                        <p className="mt-2 text-xs italic text-destructive-foreground/80 bg-destructive/80 p-1.5 rounded-md shadow-inner">
                            SYSTEM MESSAGE: This is a critical alert. If Twilio SMS were integrated, a notification would be dispatched.
                        </p>
                      )}
                    </>
                  ),
                  variant: isCritical ? "destructive" : "default",
                  duration: isCritical ? 15000 : 9000, 
                });
              setProcessedAlertIds(prev => new Set(prev).add(alertData.id!));
            }
          }
        });
      }, (error: any) => {
        console.error("Error fetching alerts from Firestore: ", error.message, error.stack);
        toast({
          title: "Alert System Error",
          description: `Could not connect to the alert system. Please check the browser console for detailed Firebase error messages and verify your Firebase project setup. Error: ${error.message}`,
          variant: "destructive",
          duration: 10000,
        });
      });
    } catch (error: any) {
        console.error("Error setting up alert listener: ", error.message, error.stack);
        toast({
            title: "Alert Listener Setup Failed",
            description: `Could not initialize the listener for real-time alerts. Details: ${error.message}`,
            variant: "destructive",
            duration: 10000,
        });
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [toast, processedAlertIds, resetTrigger]); 


  const handleUpvote = async (reportId: string) => {
    if (!db) {
      toast({ title: "Error", description: "Firestore not initialized.", variant: "destructive" });
      return;
    }
    try {
      const reportRef = doc(db, "hazard_reports", reportId);
      await updateDoc(reportRef, {
        upvotes: increment(1)
      });
      toast({ title: "Upvoted!", description: `Report ${reportId.substring(0,6)}... upvoted.`, variant: "default" });
      setMessages(prevMessages => prevMessages.map(msg => {
        if (msg.data?.reports) {
          const updatedReports = msg.data.reports.map(report => 
            report.id === reportId ? { ...report, upvotes: (report.upvotes || 0) + 1 } : report
          );
          return { ...msg, data: { ...msg.data, reports: updatedReports } };
        }
        return msg;
      }));
    } catch (error) {
      console.error("Error upvoting report:", error);
      toast({ title: "Error", description: "Could not upvote report.", variant: "destructive" });
    }
  };

  const handleDownvote = async (reportId: string) => {
    if (!db) {
      toast({ title: "Error", description: "Firestore not initialized.", variant: "destructive" });
      return;
    }
    try {
      const reportRef = doc(db, "hazard_reports", reportId);
      await updateDoc(reportRef, {
        downvotes: increment(1)
      });
      toast({ title: "Downvoted!", description: `Report ${reportId.substring(0,6)}... downvoted.`, variant: "default" });
       setMessages(prevMessages => prevMessages.map(msg => {
        if (msg.data?.reports) {
          const updatedReports = msg.data.reports.map(report => 
            report.id === reportId ? { ...report, downvotes: (report.downvotes || 0) + 1 } : report
          );
          return { ...msg, data: { ...msg.data, reports: updatedReports } };
        }
        return msg;
      }));
    } catch (error) {
      console.error("Error downvoting report:", error);
      toast({ title: "Error", description: "Could not downvote report.", variant: "destructive" });
    }
  };
  
  const getPlaceholderText = () => {
    if (pendingCategorySelectionFor) {
        return 'Select a category above or type /cancel';
    }
    switch (hazardReportingStage) {
      case 'awaiting_location':
        return 'Enter hazard location (or type /cancel)';
      case 'awaiting_details':
        return 'Describe the hazard (or type /cancel)';
      default:
        return 'Ask a question or use a quick action...';
    }
  };

  return (
    <Card className="flex flex-col h-full w-full max-w-3xl mx-auto shadow-xl rounded-lg overflow-hidden border border-border">
      <ChatWindow 
        messages={messages} 
        onCategorySelect={handleCategorySelect}
        onUpvoteReport={handleUpvote}
        onDownvoteReport={handleDownvote}
      />
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholderText={getPlaceholderText()}
      />
    </Card>
  );
}

