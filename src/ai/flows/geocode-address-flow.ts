
'use server';
/**
 * @fileOverview A Genkit flow for geocoding addresses.
 * This flow wraps the geocodeAddressTool.
 */

import {ai} from '@/ai/genkit';
// Import the actual Zod schema objects and the types from the tool
import {
  geocodeAddressTool,
  GeocodeAddressInputSchema,
  type GeocodeAddressInput,
  GeocodeAddressOutputSchema,
  type GeocodeAddressOutput,
} from '@/ai/tools/geocode-address-tool';

// Export only the TypeScript types for the flow's input and output
export type { GeocodeAddressInput as GeocodeAddressFlowInput };
export type { GeocodeAddressOutput as GeocodeAddressFlowOutput };

// The exported function that Next.js components will call
export async function geocodeAddress(
  input: GeocodeAddressInput
): Promise<GeocodeAddressOutput> {
  return geocodeAddressFlow(input);
}

// Define the Genkit flow
const geocodeAddressFlow = ai.defineFlow(
  {
    name: 'geocodeAddressFlow',
    inputSchema: GeocodeAddressInputSchema, 
    outputSchema: GeocodeAddressOutputSchema, 
  },
  async (input) => { 
    const toolResult = await geocodeAddressTool(input);
    return toolResult;
  }
);
