import { GoogleGenAI, Type } from "@google/genai";
import { 
  TIKZ_GEOMETRY_PROMPT, 
  TIKZ_TABLE_PROMPT, 
  TIKZ_GRAPH_PROMPT, 
  TIKZ_VISION_PROMPT,
  TIKZ_EDITOR_PROMPT
} from "../constants";
import { AppTab, TikZResponse } from "../types";

const getAiClient = () => {
  // Hỗ trợ lấy key từ cả process.env (được define trong vite.config.ts)
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please check Vercel Environment Variables (Key: API_KEY).");
  }
  return new GoogleGenAI({ apiKey });
};

const cleanJson = (text: string): string => {
  // Remove markdown code blocks (```json ... ``` or just ``` ... ```)
  let cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
  return cleaned.trim();
};

const getSystemInstruction = (mode: AppTab): string => {
  const BASE_INSTRUCTION = `
OUTPUT FORMAT:
Return ONLY valid JSON. No markdown, no explanations outside JSON.
Structure:
{
  "tikzCode": "Complete LaTeX code...",
  "svgPreview": "<svg>... visual proxy ...</svg>",
  "explanation": "Short summary"
}
  `;

  let specializedPrompt = "";
  switch (mode) {
    case AppTab.VARIATION_TABLE:
      specializedPrompt = TIKZ_TABLE_PROMPT;
      break;
    case AppTab.FUNCTION_GRAPH:
      specializedPrompt = TIKZ_GRAPH_PROMPT;
      break;
    case AppTab.IMAGE_TO_TIKZ:
      specializedPrompt = TIKZ_VISION_PROMPT;
      break;
    case AppTab.TIKZ_PREVIEW:
      specializedPrompt = TIKZ_EDITOR_PROMPT;
      break;
    case AppTab.TEXT_TO_TIKZ:
    default:
      specializedPrompt = TIKZ_GEOMETRY_PROMPT;
      break;
  }

  return `${specializedPrompt}\n\n${BASE_INSTRUCTION}`;
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    tikzCode: {
      type: Type.STRING,
      description: "The valid LaTeX TikZ code."
    },
    svgPreview: {
      type: Type.STRING,
      description: "A standalone SVG string. CRITICAL: This must be a manually calculated visual proxy using basic SVG shapes, NOT embedded LaTeX."
    },
    explanation: {
      type: Type.STRING,
      description: "Brief explanation."
    }
  },
  required: ["tikzCode", "svgPreview"]
};

export const generateTikZFromText = async (prompt: string, currentTikZ?: string, mode: AppTab = AppTab.TEXT_TO_TIKZ): Promise<TikZResponse> => {
  const ai = getAiClient();
  const model = "gemini-2.5-flash";

  // Select the correct specialized prompt
  const systemInstruction = getSystemInstruction(mode);

  let fullPrompt = `User Request: ${prompt}`;
  
  if (currentTikZ) {
    fullPrompt += `\n\nExisting TikZ Code:\n${currentTikZ}\n\nTask: Refine this code based on the request and REGENERATE the SVG manually to match the changes.`;
  }

  const response = await ai.models.generateContent({
    model,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.2, // Low temperature for code precision
    },
    contents: fullPrompt
  });

  if (!response.text) throw new Error("No response from AI");
  
  try {
    const cleanedText = cleanJson(response.text);
    return JSON.parse(cleanedText) as TikZResponse;
  } catch (e) {
    console.error("Failed to parse JSON:", response.text);
    throw new Error("AI returned invalid JSON format. Please try again.");
  }
};

export const generateTikZFromImage = async (base64Image: string, instruction?: string): Promise<TikZResponse> => {
  const ai = getAiClient();
  const model = "gemini-2.5-flash"; 

  const systemInstruction = getSystemInstruction(AppTab.IMAGE_TO_TIKZ);

  const promptText = instruction 
    ? `Analyze this image. ${instruction}. Reconstruct it in TikZ and generate a matching SVG visual.` 
    : "Analyze this image. Reconstruct it in TikZ code and generate a matching SVG visual.";

  const response = await ai.models.generateContent({
    model,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.2,
    },
    contents: {
      parts: [
        { inlineData: { mimeType: "image/png", data: base64Image } },
        { text: promptText }
      ]
    }
  });

  if (!response.text) throw new Error("No response from AI");
  
  try {
    const cleanedText = cleanJson(response.text);
    return JSON.parse(cleanedText) as TikZResponse;
  } catch (e) {
     console.error("Failed to parse JSON:", response.text);
     throw new Error("AI returned invalid JSON format.");
  }
};

export const previewTikZ = async (tikzCode: string, refinement?: string): Promise<TikZResponse> => {
  const ai = getAiClient();
  const model = "gemini-2.5-flash";

  // Use Editor Prompt
  const systemInstruction = getSystemInstruction(AppTab.TIKZ_PREVIEW);

  let prompt = `Render this TikZ code into an accurate SVG visual proxy.`;
  if (refinement) {
    prompt += ` Also, apply this refinement: ${refinement}.`;
  }
  prompt += `\n\nTikZ Code:\n${tikzCode}`;

  const response = await ai.models.generateContent({
    model,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.1,
    },
    contents: prompt
  });

  if (!response.text) throw new Error("No response from AI");

  try {
    const cleanedText = cleanJson(response.text);
    return JSON.parse(cleanedText) as TikZResponse;
  } catch (e) {
     console.error("Failed to parse JSON:", response.text);
     throw new Error("AI returned invalid JSON format.");
  }
};