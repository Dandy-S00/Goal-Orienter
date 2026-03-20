
import { GoogleGenAI, Type } from "@google/genai";
import { Task, WorkspaceSummary, WebResource } from "./types";

const API_KEY = process.env.API_KEY || "";

export const generateIntelligentPlan = async (
  goal: string,
  screenshotBase64?: string
): Promise<{ tasks: Task[]; summary: WorkspaceSummary }> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const systemPrompt = `
    You are an advanced Goal-to-Action engine.
    1. Analyze the user's "Goal".
    2. If a workspace image is provided, identify open applications and browser tabs to understand current progress and tools.
    3. Use Google Search to find at least 3 high-quality web resources (tools, documentation, or guides) that would help achieve this specific goal.
    4. Generate a structured plan with 5-6 actionable tasks, each with micro-steps.
    
    Categorize tasks naturally (e.g., 'Setup', 'Execution', 'Review').
  `;

  const userPrompt = `Goal: "${goal}"${screenshotBase64 ? "\n\nI have attached a snapshot of my current workspace. Please analyze what's open." : ""}`;

  const contents: any = {
    parts: [{ text: userPrompt }]
  };

  if (screenshotBase64) {
    contents.parts.push({
      inlineData: {
        data: screenshotBase64,
        mimeType: 'image/png'
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents,
    config: {
      systemInstruction: systemPrompt,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.OBJECT,
            properties: {
              detectedApps: { type: Type.ARRAY, items: { type: Type.STRING } },
              intent: { type: Type.STRING, description: "A brief professional interpretation of the current focus" },
              recommendedResources: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    uri: { type: Type.STRING }
                  },
                  required: ["title", "uri"]
                }
              }
            },
            required: ["detectedApps", "intent", "recommendedResources"]
          },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                category: { type: Type.STRING },
                steps: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["id", "title", "description", "category", "steps"]
            }
          }
        },
        required: ["summary", "tasks"]
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  
  // Extract URLs from grounding metadata if JSON didn't include enough, 
  // though we asked for them in the schema.
  const groundingResources: WebResource[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web) {
        groundingResources.push({
          title: chunk.web.title || "Reference",
          uri: chunk.web.uri
        });
      }
    });
  }

  // Merge resources
  const finalResources = [...(result.summary.recommendedResources || []), ...groundingResources]
    .filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i)
    .slice(0, 6);

  return {
    tasks: (result.tasks || []).map((t: any) => ({ ...t, status: 'pending' })),
    summary: {
      detectedApps: result.summary.detectedApps,
      intent: result.summary.intent,
      resources: finalResources
    }
  };
};
