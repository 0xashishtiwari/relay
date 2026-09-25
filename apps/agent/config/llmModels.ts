import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenRouter } from "@langchain/openrouter";

const groq = new ChatGroq({
    model: "openai/gpt-oss-120b",
});

const gemini = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
});

const openrouter = new ChatOpenRouter({
    model: "deepseek/deepseek-chat",
    temperature: 0,
    maxTokens: 2500,
})

export const getModel = async (agent: string) => {
    switch (agent) {
        case "chat":
            return groq;
        case "search":
            return gemini;
        case "coding":
            return openrouter;
        case "pdf":
            return gemini;
        case "ppt":
            return gemini;
        case "router":
            return groq;

        default:
            return groq;
    }
}