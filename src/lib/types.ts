
import type { Timestamp } from 'firebase/firestore';

export type Sender = 'user' | 'bot' | 'system';

export interface ReportUIData {
  id: string;
  category: HazardCategory;
  location: string; // Original user input for location
  details: string;
  upvotes: number;
  downvotes: number;
  timestamp?: number; // JS timestamp for display if needed
  distanceKm?: number; // Optional, for nearby reports
  formattedAddress?: string; // Geocoded address
  latitude?: number; // Geocoded latitude
  longitude?: number; // Geocoded longitude
}

export interface ChatMessage {
  id:string;
  sender: Sender;
  text: string; // General text for the message, or a header for a list
  timestamp: number;
  type?: 'text' | 'image' | 'category_selector' | 'location_request' | 'error' | 'report_list';
  imageUrl?: string; // For AI-generated map images or direct map URLs
  uploadedImageUri?: string; // For user-uploaded images
  uploadedImageLatitude?: number; // Optional: latitude where image was uploaded
  uploadedImageLongitude?: number; // Optional: longitude where image was uploaded
  data?: {
    categories?: HazardCategory[];
    reports?: ReportUIData[];
  };
  isLoading?: boolean;
}

export const HAZARD_CATEGORIES = [
  'Fire',
  'Medical Emergency',
  'Road Hazard',
  'Suspicious Activity',
  'Utility Issue',
  'Weather Alert',
  'Other',
] as const;

export type HazardCategory = typeof HAZARD_CATEGORIES[number];

// Firestore document types
export interface HazardReportDocument {
  id?: string; // Firestore document ID
  category: HazardCategory;
  location: string; // Original user input for location
  details: string;
  timestamp: Timestamp; // Firestore Timestamp
  userId: string;
  latitude?: number; // Geocoded or simulated
  longitude?: number; // Geocoded or simulated
  formattedAddress?: string; // Optional: from geocoding
  upvotes: number;
  downvotes: number;
}

export type AlertUrgency = 'low' | 'medium' | 'high' | 'critical';

export interface AlertDocument {
  id?: string; // Firestore document ID
  title: string;
  text: string;
  timestamp: Timestamp; // Firestore Timestamp
  urgency?: AlertUrgency;
  latitude?: number; // Optional: for precise location of the alert
  longitude?: number; // Optional: for precise location of the alert
}
export interface AlertDocumentWithId extends AlertDocument {
    id: string;
}

// For passing incident data to the map generation flow
export interface MapIncident {
    category: HazardCategory;
    location: string; // Text description of location
    latitude?: number; // Optional
    longitude?: number; // Optional
}

// Input for the getNearbyIncidentsMap flow
export interface GetNearbyIncidentsMapInput {
  latitude: number;
  longitude: number;
  incidents?: MapIncident[];
}

// Output for the getNearbyIncidentsMap flow
export interface GetNearbyIncidentsMapOutput {
  mapUrl: string; // URL to the generated map image
}
