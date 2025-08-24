import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

export class ModelService {
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is not set in environment variables");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }
  
  async generate(prompt: string, modelName: string = "gemini-1.5-pro", temperature: number = 0.1) {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature,
          maxOutputTokens: 3000,
        }
      });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`[ModelService] Error generating content:`, error);
      throw error;
    }
  }
}