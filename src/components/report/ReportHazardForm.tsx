
"use client";

import type { ChangeEvent, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { HAZARD_CATEGORIES, type HazardCategory, type HazardReportDocument } from '@/lib/types';
import { geocodeAddress, type GeocodeAddressFlowOutput } from '@/ai/flows/geocode-address-flow';
import { cn } from '@/lib/utils';


// Firebase imports
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp,
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
        console.warn("Firebase configuration is incomplete for ReportHazardForm. Firebase services will not be initialized. Please check your .env.local file.");
    }
} catch (error) {
    console.error("Error initializing Firebase in ReportHazardForm: ", error);
}

const ANONYMOUS_USER_ID_KEY = 'indySafeChatAnonymousUserId';
const SIMULATED_LATITUDE = 39.7684; // Downtown Indianapolis approx.
const SIMULATED_LONGITUDE = -86.1581;

const reportSchema = z.object({
  category: z.enum(HAZARD_CATEGORIES, {
    required_error: 'Please select a hazard category.',
  }),
  location: z.string().min(1, { message: 'Location cannot be empty.' }).max(200, { message: 'Location is too long (max 200 characters).' }),
  details: z.string().min(1, { message: 'Details cannot be empty.' }).max(1000, { message: 'Details are too long (max 1000 characters).' }),
});

type ReportFormValues = z.infer<typeof reportSchema>;

type FormSubmissionState = "idle" | "geocoding" | "submitting" | "submitted";

export default function ReportHazardForm() {
  const { toast } = useToast();
  const [submissionState, setSubmissionState] = useState<FormSubmissionState>("idle");
  const [anonymousUserId, setAnonymousUserId] = useState<string | null>(null);

  useEffect(() => {
    let storedUserId = localStorage.getItem(ANONYMOUS_USER_ID_KEY);
    if (!storedUserId) {
      storedUserId = `anon-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(ANONYMOUS_USER_ID_KEY, storedUserId);
    }
    setAnonymousUserId(storedUserId);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      category: undefined,
      location: '',
      details: '',
    }
  });

  const selectedCategory = watch('category');

  const onSubmit = async (data: ReportFormValues) => {
    if (!db) {
      toast({
        title: 'Error Submitting Report',
        description: 'Database connection is not available. Please ensure Firebase is configured correctly and try again.',
        variant: 'destructive',
      });
      setSubmissionState("idle");
      return;
    }
    if (!anonymousUserId) {
      toast({
        title: 'Error Submitting Report',
        description: 'Could not identify user session. Please refresh the page and try again.',
        variant: 'destructive',
      });
      setSubmissionState("idle");
      return;
    }

    setSubmissionState("geocoding");
    toast({ title: "Processing Report", description: "Attempting to geocode location..." });

    let geocodedLat: number | undefined;
    let geocodedLon: number | undefined;
    let geocodedFormattedAddress: string | undefined;

    const geoapifyApiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    if (!geoapifyApiKey) {
        console.warn("Geoapify API key not configured. Geocoding will be approximated for form submission.");
        geocodedLat = SIMULATED_LATITUDE;
        geocodedLon = SIMULATED_LONGITUDE;
        geocodedFormattedAddress = `${data.location} (Location approximated; Geocoding service not configured)`;
        toast({ title: "Geocoding Service Not Configured", description: "Coordinates approximated." });
    } else {
        try {
          const geocodeResult: GeocodeAddressFlowOutput = await geocodeAddress({ address: data.location });
          if (geocodeResult.error && geocodeResult.error.includes("not configured")){
              geocodedLat = SIMULATED_LATITUDE;
              geocodedLon = SIMULATED_LONGITUDE;
              geocodedFormattedAddress = `${data.location} (Location approximated; Geocoding service misconfigured)`;
              toast({ title: "Geocoding Service Misconfigured", description: `Coordinates approximated. ${geocodeResult.error}` });
          } else if (geocodeResult.latitude && geocodeResult.longitude) {
            geocodedLat = geocodeResult.latitude;
            geocodedLon = geocodeResult.longitude;
            geocodedFormattedAddress = geocodeResult.formattedAddress || data.location;
            toast({ title: "Geocoding Successful", description: `Location identified as: ${geocodedFormattedAddress}` });
          } else {
            geocodedLat = SIMULATED_LATITUDE;
            geocodedLon = SIMULATED_LONGITUDE;
            geocodedFormattedAddress = `${data.location} (Location approximated)`;
            toast({
              title: "Geocoding Issue",
              description: geocodeResult.error || `Could not find precise coordinates. Using approximate location for "${data.location}".`,
              variant: "default",
            });
          }
        } catch (error) {
          console.error("Geocoding flow error on form:", error);
          geocodedLat = SIMULATED_LATITUDE;
          geocodedLon = SIMULATED_LONGITUDE;
          geocodedFormattedAddress = `${data.location} (Location approximated due to error)`;
          toast({ title: "Geocoding Error", description: "An error occurred during geocoding. Using approximate location.", variant: "destructive" });
        }
    }

    setSubmissionState("submitting");
    toast({ title: "Submitting Report", description: "Please wait..." });
    
    const reportData: Partial<HazardReportDocument> = {
      category: data.category,
      location: data.location, 
      details: data.details,
      userId: anonymousUserId,
      timestamp: serverTimestamp() as Timestamp,
      upvotes: 0,
      downvotes: 0,
    };
    
    if (geocodedFormattedAddress && geocodedFormattedAddress.trim() !== '') {
      reportData.formattedAddress = geocodedFormattedAddress;
    } else {
      reportData.formattedAddress = data.location; 
    }

    if (geocodedLat !== undefined && typeof geocodedLat === 'number') {
      reportData.latitude = geocodedLat;
    }
    if (geocodedLon !== undefined && typeof geocodedLon === 'number') {
      reportData.longitude = geocodedLon;
    }
    
    const reportToSave = reportData as HazardReportDocument;
    console.log("Attempting to save hazard report (Form):", JSON.stringify(reportToSave, null, 2));


    try {
      const docRef = await addDoc(collection(db, "hazard_reports"), reportToSave);
      toast({
        title: 'Hazard Reported Successfully!',
        description: `Category: ${data.category}, Location: ${reportData.formattedAddress}. Report ID: ${docRef.id.substring(0,10)}...`,
      });
      reset(); 
      setValue('category', undefined); 
      setSubmissionState("submitted");
    } catch (error) {
      console.error("Error saving hazard report from form: ", error);
      toast({
        title: 'Error Submitting Report',
        description: `An unexpected error occurred: ${(error as Error).message}. Please try again.`,
        variant: 'destructive',
      });
      setSubmissionState("idle");
    }
  };

  const getButtonText = () => {
    switch (submissionState) {
      case "geocoding":
        return "Geocoding Location...";
      case "submitting":
        return "Submitting Report...";
      case "submitted":
        return "Report Submitted!";
      default:
        return "Submit Report";
    }
  };

  const isSubmitting = submissionState === "geocoding" || submissionState === "submitting";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6 bg-card rounded-xl shadow-xl border border-border/70">
      <div className="space-y-1.5">
        <Label htmlFor="category" className={cn("font-medium", errors.category ? 'text-destructive' : '')}>Hazard Category</Label>
        <Select
          onValueChange={(value: HazardCategory) => setValue('category', value, { shouldValidate: true })}
          value={selectedCategory}
          disabled={isSubmitting}
        >
          <SelectTrigger 
            id="category" 
            className={cn("h-11 text-sm", errors.category ? 'border-destructive ring-destructive/50 focus-visible:ring-destructive' : '')} 
            aria-invalid={!!errors.category} 
            aria-label="Select hazard category"
          >
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {HAZARD_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-sm">
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && <p className="text-sm text-destructive pt-1">{errors.category.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location" className={cn("font-medium", errors.location ? 'text-destructive' : '')}>Location (Address or Cross-Streets)</Label>
        <Input
          id="location"
          {...register('location')}
          placeholder="e.g., Corner of Main St and 1st Ave, or near City Park"
          disabled={isSubmitting}
          className={cn("h-11 text-sm",errors.location ? 'border-destructive ring-destructive/50 focus-visible:ring-destructive' : '')}
          aria-invalid={!!errors.location}
        />
        {errors.location && <p className="text-sm text-destructive pt-1">{errors.location.message}</p>}
         <p className="text-xs text-muted-foreground pt-0.5">The system will attempt to geocode this location for accuracy.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="details" className={cn("font-medium", errors.details ? 'text-destructive' : '')}>Details</Label>
        <Textarea
          id="details"
          {...register('details')}
          placeholder="Describe the hazard in as much detail as possible..."
          rows={5}
          disabled={isSubmitting}
          className={cn("text-sm", errors.details ? 'border-destructive ring-destructive/50 focus-visible:ring-destructive' : '')}
          aria-invalid={!!errors.details}
        />
        {errors.details && <p className="text-sm text-destructive pt-1">{errors.details.message}</p>}
      </div>

      <Button type="submit" className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-shadow" disabled={isSubmitting || submissionState === "submitted"}>
        {getButtonText()}
      </Button>
    </form>
  );
}
