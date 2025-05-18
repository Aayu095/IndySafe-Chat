
/**
 * @fileOverview A Genkit tool for geocoding addresses using Geoapify API.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const GeocodeAddressInputSchema = z.object({
  address: z.string().describe('The street address or place to geocode.'),
});
export type GeocodeAddressInput = z.infer<typeof GeocodeAddressInputSchema>;

export const GeocodeAddressOutputSchema = z.object({
  latitude: z.number().optional().describe('The geocoded latitude.'),
  longitude: z.number().optional().describe('The geocoded longitude.'),
  formattedAddress: z
    .string()
    .optional()
    .describe('The formatted address returned by the geocoding service.'),
  error: z.string().optional().describe('An error message if geocoding failed.'),
});
export type GeocodeAddressOutput = z.infer<typeof GeocodeAddressOutputSchema>;

export const geocodeAddressTool = ai.defineTool(
  {
    name: 'geocodeAddressWithGeoapify',
    description: 'Geocodes a given address string to latitude and longitude coordinates using Geoapify API.',
    inputSchema: GeocodeAddressInputSchema,
    outputSchema: GeocodeAddressOutputSchema,
  },
  async (input) => {
    const geoapifyApiKey = process.env.GEOAPIFY_API_KEY;
    if (!geoapifyApiKey) {
      console.error(
        "🔴 GEOAPIFY_API_KEY ERROR IN TOOL: The GEOAPIFY_API_KEY is missing from the Genkit server's environment (process.env) " +
        "when the geocodeAddressTool was executed. " +
        "Please check the Genkit server console output when it starts (look for messages from src/ai/dev.ts) " +
        "and ensure your .env file is correctly set up and the Genkit server was restarted."
      );
      return { error: 'Geocoding service is not configured (Geoapify API key missing from server environment). Please contact an administrator.' };
    }

    const encodedAddress = encodeURIComponent(input.address);
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodedAddress}&apiKey=${geoapifyApiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data?.message || `Geoapify API error: ${response.statusText}`;
        console.error('Geoapify API Error:', errorMessage, data);
        return { error: errorMessage };
      }

      if (data.features && data.features.length > 0) {
        const bestMatch = data.features[0];
        return {
          latitude: bestMatch.properties.lat,
          longitude: bestMatch.properties.lon,
          formattedAddress: bestMatch.properties.formatted,
        };
      } else {
        return { error: `No results found for address: ${input.address}.` };
      }
    } catch (err: any) {
      console.error('Error calling Geoapify API:', err);
      return { error: `Failed to geocode address due to an unexpected error: ${err.message}` };
    }
  }
);
