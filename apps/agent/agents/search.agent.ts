import { agentState } from "../graph/state";
import { imageSearchTool, searchTool } from "../config/tavily";
import { getMemory } from "../config/memory";

const requestsImages = (prompt: string, history: Array<{ role?: string; content?: string }>) => {
    const recentConversation = history
        .filter((message) => message.role === "user")
        .slice(-4)
        .map((message) => message.content ?? "")
        .join(" ");
    const directVisualRequest =
        /\b(images?|photos?|pictures?|gallery|visuals?|screenshots?|show me|look like|display)\b/i.test(
            prompt,
        );
    const visualFollowUp =
        /\b(show|display|see|more|another|similar|different)\b/i.test(prompt) &&
        /\b(images?|photos?|pictures?|visuals?|gallery)\b/i.test(recentConversation);

    return directVisualRequest || visualFollowUp;
};

export const searchAgent = async (params: typeof agentState.State) => {
    try {
        const history = await getMemory(params.conversationId);
        const useImageSearch = requestsImages(params.prompt, history);
        const result = await (useImageSearch ? imageSearchTool : searchTool).invoke({
            query: params.prompt,
        });

        const searchResults = Array.isArray(result.results)
            ? result.results
            : [];
        const images = Array.isArray(result.images)
            ? result.images.filter(
                (image: unknown): image is string => typeof image === "string",
            )
            : [];

        return {
            ...params,
            searchResults,
            searchAnswer: typeof result.answer === "string" ? result.answer : "",
            images: useImageSearch ? images : [],
        }

    } catch (err) {
        console.error("Error in searchAgent:", err);
        return {
            ...params,
            searchResults: [],
            searchAnswer: "",
            images: [],
        }
    }
}