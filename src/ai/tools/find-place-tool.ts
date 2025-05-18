
/**
 * @fileOverview A Genkit tool for finding nearby places of a specified type using Geoapify Places API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const FindPlaceToolInputSchema = z.object({
  placeType: z
    .string()
    .describe(
      'The type of place to find (e.g., "police station", "hospital", "fire station").'
    ),
  latitude: z
    .number()
    .describe('The latitude of the location to search near.'),
  longitude: z
    .number()
    .describe('The longitude of the location to search near.'),
});
export type FindPlaceToolInput = z.infer<typeof FindPlaceToolInputSchema>;

export const FindPlaceToolOutputSchema = z.object({
  name: z.string().describe('The name of the found place.'),
  address: z.string().describe('The address of the found place.'),
  notes: z
    .string()
    .optional()
    .describe('Additional notes, like source of data or if no results found.'),
});
export type FindPlaceToolOutput = z.infer<typeof FindPlaceToolOutputSchema>;

// Helper function to map user-friendly place types to Geoapify categories
function getGeoapifyCategory(placeType: string): string | null {
  const typeLower = placeType.toLowerCase();
  if (typeLower.includes('police')) {
    return 'service.police';
  } else if (typeLower.includes('hospital') || typeLower.includes('clinic') || typeLower.includes('doctor')) {
    return 'healthcare.hospital,healthcare.clinic,healthcare.doctor'; // Search multiple relevant categories
  } else if (typeLower.includes('fire station') || typeLower.includes('fire department')) {
    return 'amenity.fire_station';
  }
  // Add more mappings as needed
  return null; // Or a more generic category if appropriate
}

export const findPlaceTool = ai.defineTool(
  {
    name: 'findPlace',
    description:
      'Finds a nearby place like a police station, hospital, or fire station based on type and location coordinates using Geoapify Places API.',
    inputSchema: FindPlaceToolInputSchema,
    outputSchema: FindPlaceToolOutputSchema,
  },
  async (input) => {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      console.error("GEOAPIFY_API_KEY is not set for findPlaceTool.");
      return {
        name: "Service Not Configured",
        address: "Places API key is missing.",
        notes: "Geoapify API key not found in server environment. Please contact an administrator.",
      };
    }

    const geoapifyCategory = getGeoapifyCategory(input.placeType);
    if (!geoapifyCategory) {
      return {
        name: `No specific category mapping for "${input.placeType}"`,
        address: 'Please try a more common term like "hospital" or "police station".',
        notes: `Could not map "${input.placeType}" to a specific Geoapify category.`,
      };
    }

    const radiusMeters = 10000; // Search within a 10km radius, adjust as needed
    const limit = 1; // Get the closest one

    // Geoapify Places API endpoint
    const url = `https://api.geoapify.com/v2/places?categories=${geoapifyCategory}&filter=circle:${input.longitude},${input.latitude},${radiusMeters}&bias=proximity:${input.longitude},${input.latitude}&limit=${limit}&apiKey=${apiKey}`;

    try {
      console.log(`[findPlaceTool] Calling Geoapify Places API: ${url.replace(apiKey, "REDACTED_API_KEY")}`);
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.message || `Geoapify Places API error: ${response.statusText} (Status: ${response.status})`;
        console.error('[findPlaceTool] Geoapify API Error:', errorMessage, data);
        return {
          name: 'API Error',
          address: `Could not retrieve data from Geoapify: ${response.statusText}`,
          notes: errorMessage,
        };
      }

      if (data.features && data.features.length > 0) {
        const place = data.features[0].properties;
        return {
          name: place.name || place.address_line1 || 'Name not available',
          address: place.formatted || place.address_line2 || 'Address not available',
          notes: `Data from Geoapify. Searched for "${input.placeType}" near ${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)}.`,
        };
      } else {
        return {
          name: `No "${input.placeType}" found nearby.`,
          address: `No results within ${radiusMeters / 1000}km.`,
          notes: `Geoapify found no matching places for category "${geoapifyCategory}" near the provided coordinates.`,
        };
      }
    } catch (err: any) {
      console.error('[findPlaceTool] Error calling Geoapify Places API:', err);
      return {
        name: 'Service Error',
        address: 'Failed to connect to the places service.',
        notes: `An unexpected error occurred: ${err.message}`,
      };
    }
  }
);
