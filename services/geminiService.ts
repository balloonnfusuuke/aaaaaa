
import { GoogleGenAI } from "@google/genai";

// Always use the required initialization pattern for the Google GenAI SDK.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGeminiResponse = async (prompt: string, context: string) => {
  try {
    // Generate content by specifying both the model and the structured prompt.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context: ${context}\n\nUser Question: ${prompt}`,
      config: {
        systemInstruction: "あなたはFirebaseとReactの権限管理（RBAC）に精通したシニアエンジニアです。簡潔で分かりやすい日本語で回答してください。技術的な質問に対して、ベストプラクティスに基づいたアドバイスを提供します。",
        temperature: 0.7,
      },
    });
    // The extracted generated text content is accessed via the .text property.
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "申し訳ありません。AIアシスタントとの通信中にエラーが発生しました。";
  }
};
