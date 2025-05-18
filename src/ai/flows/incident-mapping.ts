
'use server';

/**
 * @fileOverview A flow to integrate with Geoapify Static Maps API to display nearby incidents on a map.
 *
 * - getNearbyIncidentsMap - A function that takes a location and returns a map URL.
 * - GetNearbyIncidentsMapInput - The input type for the getNearbyIncidentsMap function.
 * - GetNearbyIncidentsMapOutput - The return type for the getNearbyIncidentsMap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { GetNearbyIncidentsMapInput, GetNearbyIncidentsMapOutput, HazardCategory } from '@/lib/types';

// Zod schemas for flow input and output, matching the TypeScript types
const GetNearbyIncidentsMapInputSchema = z.object({
  latitude: z.number().describe('The latitude for the center of the map.'),
  longitude: z.number().describe('The longitude for the center of the map.'),
  incidents: z.array(z.object({
    category: z.string().describe('The category of the incident (e.g., Fire, Road Hazard).'),
    location: z.string().describe('The textual description of the incident location.'),
    latitude: z.number().optional().describe('The latitude of the incident.'),
    longitude: z.number().optional().describe('The longitude of the incident.')
  })).optional().describe('An optional list of incidents to mark on the map.')
});

const GetNearbyIncidentsMapOutputSchema = z.object({
  mapUrl: z.string().describe('A URL to the map image with nearby incidents marked.'),
});


export async function getNearbyIncidentsMap(
  input: GetNearbyIncidentsMapInput
): Promise<GetNearbyIncidentsMapOutput> {
  try {
    return await getNearbyIncidentsMapFlow(input);
  } catch (e: any) {
    console.error("[IndySafe] Error in getNearbyIncidentsMap flow:", e.message, e.stack);
    throw new Error(`Map generation service encountered an issue. Please try again. Details: ${e.message}`);
  }
}

// Helper to get marker color based on category
function getMarkerColor(category: HazardCategory): string {
  switch (category) {
    case 'Fire': return 'red';
    case 'Medical Emergency': return 'orange';
    case 'Road Hazard': return 'yellow';
    case 'Suspicious Activity': return 'purple';
    case 'Utility Issue': return 'blue';
    case 'Weather Alert': return 'darkblue';
    default: return 'grey';
  }
}

const getNearbyIncidentsMapFlow = ai.defineFlow(
  {
    name: 'getNearbyIncidentsMapFlow',
    inputSchema: GetNearbyIncidentsMapInputSchema,
    outputSchema: GetNearbyIncidentsMapOutputSchema,
  },
  async (input): Promise<GetNearbyIncidentsMapOutput> => {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      console.error("[IndySafe] GEOAPIFY_API_KEY is not set for map generation.");
      throw new Error("Map service is not configured (API key missing).");
    }

    const mapWidth = 600;
    const mapHeight = 400;
    const zoom = 14; // Adjust zoom level as needed

    let markersString = "";
    if (input.incidents && input.incidents.length > 0) {
      const validIncidents = input.incidents.filter(inc => inc.latitude != null && inc.longitude != null);
      markersString = validIncidents.map(inc => {
        const color = getMarkerColor(inc.category as HazardCategory);
        return `lonlat:${inc.longitude},${inc.latitude};color:${color};size:medium`;
      }).join('|');
    }

    const mapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-carto&width=${mapWidth}&height=${mapHeight}&center=lonlat:${input.longitude},${input.latitude}&zoom=${zoom}${markersString ? `&marker=${markersString}` : ''}&apiKey=${apiKey}`;
    
    // Validate the constructed URL by making a HEAD request
    try {
        console.log(`[IndySafe] Validating Geoapify map URL: ${mapUrl}`);
        const response = await fetch(mapUrl, { method: 'HEAD' }); 
        if (!response.ok) {
            let errorDetails = `Geoapify API returned status ${response.status} for URL.`;
            // Try to get text, though HEAD might not have a body.
            try {
                 const errorText = await response.text(); 
                 if(errorText && errorText.trim() !== "") errorDetails += ` Details: ${errorText}`;
            } catch (_) { /* ignore if text extraction fails */ }
            console.error(`[IndySafe] Geoapify static map URL validation failed. ${errorDetails}`);
            throw new Error(`Failed to validate map URL with Geoapify. ${errorDetails}`);
        }
        console.log("[IndySafe] Geoapify map URL validated successfully.");
    } catch (fetchError: any) {
        console.error(`[IndySafe] Network error while validating map URL: ${fetchError.message}. URL: ${mapUrl}`);
        throw new Error(`Network error while validating map URL. Ensure the Geoapify service is reachable and the API key is valid. Details: ${fetchError.message}`);
    }

    return { mapUrl };
  }
);

