
import { config } from 'dotenv';
config(); // Load environment variables from .env file

// Diagnostic check for GEOAPIFY_API_KEY specifically for the Genkit server environment
if (!process.env.GEOAPIFY_API_KEY) {
  console.error(
    "\n🔴 CRITICAL GEOAPIFY KEY NOT LOADED FOR GENKIT SERVER 🔴\n" +
    "-----------------------------------------------------------------\n" +
    "The GEOAPIFY_API_KEY was NOT found in the Genkit server's environment (process.env) \n" +
    "after attempting to load it from the .env file via dotenv.config() in src/ai/dev.ts.\n\n" +
    "Please ensure:\n" +
    "1. Your .env file exists in the project root directory (the same level as package.json).\n" +
    "2. The .env file contains the line: GEOAPIFY_API_KEY=your_actual_api_key_here\n" +
    "   (replace 'your_actual_api_key_here' with your real key, no quotes needed around the key itself).\n" +
    "3. You have RESTARTED the Genkit development server (e.g., 'npm run genkit:dev' or 'npm run genkit:watch') \n" +
    "   AFTER saving changes to the .env file.\n" +
    "-----------------------------------------------------------------\n"
  );
} else {
  console.log(
    "\n🟢 SUCCESS: GEOAPIFY_API_KEY loaded for Genkit server. 🟢\n" +
    `   Value starts with: ${process.env.GEOAPIFY_API_KEY.substring(0, 5)}...\n` // Log a snippet for confirmation
  );
}

import '@/ai/flows/incident-mapping.ts';
import '@/ai/flows/smart-emergency-assistance.ts';
import '@/ai/flows/geocode-address-flow.ts';
