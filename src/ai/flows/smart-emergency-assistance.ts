
// Use server directive.
'use server';

/**
 * @fileOverview A smart emergency assistance AI agent.
 *
 * - smartEmergencyAssistance - A function that handles the emergency assistance process.
 * - SmartEmergencyAssistanceInput - The input type for the smartEmergencyAssistance function.
 * - SmartEmergencyAssistanceOutput - The return type for the smartEmergencyAssistance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { findPlaceTool } from '@/ai/tools/find-place-tool'; // Import the new tool

// Internal Zod schema for the flow's input
const SmartEmergencyAssistanceInputSchema = z.object({
  query: z.string().describe('The query about what to do in an emergency situation or a request to find a facility.'),
  latitude: z.number().optional().describe("User's current latitude, if known (e.g., from a general location query)."),
  longitude: z.number().optional().describe("User's current longitude, if known (e.g., from a general location query)."),
  imageDataUri: z.string().optional().describe(
    "Optional: A user-uploaded image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
  uploadedImageLatitude: z.number().optional().describe("Optional: Latitude where the image was uploaded from, if available."),
  uploadedImageLongitude: z.number().optional().describe("Optional: Longitude where the image was uploaded from, if available."),
});
export type SmartEmergencyAssistanceInput = z.infer<
  typeof SmartEmergencyAssistanceInputSchema
>;

// Internal Zod schema for the flow's output
const SmartEmergencyAssistanceOutputSchema = z.object({
  advice: z.string().describe('The advice for the emergency situation. If a tool was used, summarize its findings here.'),
});
export type SmartEmergencyAssistanceOutput = z.infer<
  typeof SmartEmergencyAssistanceOutputSchema
>;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function smartEmergencyAssistance(
  input: SmartEmergencyAssistanceInput
): Promise<SmartEmergencyAssistanceOutput> {
  try {
    return await smartEmergencyAssistanceFlow(input);
  } catch (e: any) {
    console.error("[IndySafe] Error in smartEmergencyAssistance flow:", e.message, e.stack);
    // Re-throw a simpler error to be caught by the client
    throw new Error(`Smart assistance service encountered an issue. Please try again. Details: ${e.message}`);
  }
}

const prompt = ai.definePrompt({
  name: 'smartEmergencyAssistancePrompt',
  input: {schema: SmartEmergencyAssistanceInputSchema},
  output: {schema: SmartEmergencyAssistanceOutputSchema},
  tools: [findPlaceTool],
  system: `You are a public safety assistant for Indianapolis.
Respond to the user's query with smart, helpful suggestions.

If the user asks to find a nearby facility (e.g., 'nearest police station', 'where is a hospital'), use the 'findPlace' tool.
- To use the 'findPlace' tool, you **MUST** have latitude and longitude.
- If the user's query includes coordinates or an address, try to infer latitude and longitude.
- If coordinates are provided in input.latitude and input.longitude (user's general location) OR input.uploadedImageLatitude and input.uploadedImageLongitude (location where image was uploaded), prioritize using those if relevant to the search.
- If no location information is directly available in the input fields and the user asks for a nearby facility, **YOU MUST ASK THE USER FOR THEIR CURRENT LOCATION (e.g., "To find a nearby facility, I need your current latitude and longitude, or an address/intersection. Could you please provide that?") BEFORE attempting to use the tool.** Do not try to guess coordinates if not enough information is provided.
- If you ask for location and the user provides it in a subsequent message, this prompt will be called again with their original query and the new location details.
- If the 'findPlace' tool is used, your \`advice\` **MUST** include the name and address of the place found. For example: 'The nearest police station I found is [Name from tool] at [Address from tool].' If the tool indicates no results were found (e.g., the 'name' field in the tool's output contains 'No results' or similar), or if an error occurred (e.g., the 'name' field mentions 'API Error' or 'Service Error'), clearly state that in your advice. For example: 'I couldn't find a [place type] nearby with the information provided.' or 'There was an issue searching for the [place type], the service reported: [tool's error message or notes if available].'

If the user provides an image:
- Acknowledge it in your response (e.g., "Thank you for the image.").
- If coordinates for the image upload are available (uploadedImageLatitude, uploadedImageLongitude), mention that you are aware the image was provided from approximately that location. E.g., "I see you've uploaded an image from near latitude X, longitude Y."
- You can describe what you see in the image if relevant to the query, but prioritize safety advice.
- Do not attempt to perform complex image analysis unless the query specifically asks for it in a way that aligns with public safety.
- **Do NOT attempt to verify if the image is "fake" or "real". You are not equipped for image authenticity analysis.**

For general safety advice, provide guidance directly. Be concise and clear in your responses.

Here are some predefined safety guides for common emergencies. Prioritize this information if the user's query matches one of these topics:

What to do in a House Fire:
1.  **Evacuate Immediately:** Get everyone out of the house. Don't stop to collect belongings.
2.  **Stay Low:** If there's smoke, stay low to the ground where the air is cleaner. Crawl if necessary.
3.  **Check Doors:** Before opening a door, feel it with the back of your hand. If it's hot, don't open it; find another way out.
4.  **Call 911:** Once you are safely outside, call 911 from a neighbor's phone or your cell phone.
5.  **Meeting Point:** Have a pre-arranged meeting point outside so you know everyone is safe.
6.  **Never Go Back Inside:** Do not re-enter a burning building for any reason.

What to do during an Earthquake:
1. **DROP, COVER, AND HOLD ON:**
    *   **DROP** to your hands and knees.
    *   **COVER** your head and neck with your arms. If a sturdy table or desk is nearby, crawl beneath it for shelter.
    *   **HOLD ON** to your shelter (or to your head and neck) until the shaking stops.
2.  **Indoors:** Stay away from windows, glass, and anything that could fall (like light fixtures or furniture).
3.  **Outdoors:** Move away from buildings, streetlights, and utility wires.
4.  **In a Vehicle:** Pull over to a clear location (away from buildings, trees, overpasses, utility wires) and stop. Stay in the vehicle with your seatbelt fastened until the shaking stops.
5.  **After Shaking:** Be prepared for aftershocks. Check for injuries and damage.

What to do for a Medical Emergency (Basic First Aid Pointers - Call 911 first for serious situations):
1.  **Assess for Danger:** Ensure the scene is safe for you before approaching the injured person.
2.  **Call 911:** For any serious injury or illness, call emergency services immediately. Provide your location and details about the situation.
3.  **Check for Responsiveness:** Gently tap the person and shout, "Are you okay?"
4.  **Check for Breathing:** Look, listen, and feel for signs of normal breathing for no more than 10 seconds.
5.  **Control Severe Bleeding:** Apply direct, firm pressure to the wound using a clean cloth or your hands.
6.  **For Burns (Minor):** Cool the burn with cool (not ice-cold) running water for 10-15 minutes. Cover loosely with a sterile dressing.
7.  **For Choking (Conscious Adult/Child):** Perform the Heimlich maneuver (abdominal thrusts).
8.  **Do Not Move:** If you suspect a head, neck, or back injury, do not move the person unless they are in immediate danger.
(Disclaimer: This is very basic advice. Proper first aid training is recommended.)

If the query is general and not covered by specific guides or the 'findPlace' tool, use your general knowledge to provide helpful public safety advice relevant to Indianapolis. **When giving advice or instructions, please use markdown \`**key phrase**\` to bold important headings, actions, or keywords for better readability.**
`,
  prompt: `User query: {{query}}
{{#if latitude}}User's known general latitude: {{latitude}}{{/if}}
{{#if longitude}}User's known general longitude: {{longitude}}{{/if}}
{{#if imageDataUri}}User has also provided an image{{#if uploadedImageLatitude}} (uploaded from approx. lat: {{uploadedImageLatitude}}, lon: {{uploadedImageLongitude}}){{/if}}: {{media url=imageDataUri}}{{/if}}`,
});

const smartEmergencyAssistanceFlow = ai.defineFlow(
  {
    name: 'smartEmergencyAssistanceFlow',
    inputSchema: SmartEmergencyAssistanceInputSchema,
    outputSchema: SmartEmergencyAssistanceOutputSchema,
  },
  async (input) => {
    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        console.log(`[IndySafe] Attempt ${attempt + 1} for smartEmergencyAssistanceFlow with query: ${input.query.substring(0,50)}...`);
        const {output} = await prompt(input);
        if (!output || !output.advice) {
            // This case should ideally be handled by Genkit or the model provider,
            // but as a safeguard:
            console.error("[IndySafe] AI model did not return the expected output structure (missing output or advice).", output);
            throw new Error("AI model did not return the expected output structure.");
        }
        return output;
      } catch (error: any) {
        attempt++;
        console.warn(`[IndySafe] Attempt ${attempt} failed for smartEmergencyAssistanceFlow. Error: ${error.message}`);
        if (attempt >= maxRetries) {
          console.error(`[IndySafe] All ${maxRetries} attempts failed for smartEmergencyAssistanceFlow. Last error:`, error.message, error.stack);
          throw error; // Re-throw the last error if all retries fail
        }
        // Optional: Check if the error message indicates an overload (e.g., includes "503" or "overloaded")
        // and only retry for specific errors. For now, retrying on any error.
        const delayTime = Math.pow(2, attempt) * 100; // Exponential backoff (e.g., 200ms, 400ms, 800ms)
        console.log(`[IndySafe] Retrying smartEmergencyAssistanceFlow in ${delayTime}ms...`);
        await delay(delayTime);
      }
    }
    // This part should ideally not be reached if retries are handled correctly
    // but as a fallback for the while loop exiting unexpectedly.
    throw new Error("Smart assistance flow failed after multiple retries.");
  }
);

