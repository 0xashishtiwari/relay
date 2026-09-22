import { getModel } from "../config/llmModels";
import { agentState } from "../graph/state";
import { chatSystemPrompt } from "../prompts/chat.prompt";
import { getMemory } from "../config/memory";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";

export const chatAgent = async (
  state: typeof agentState.State
) => {
  const llm = await getModel("chat");

  const history = await getMemory(state.conversationId);

  const searchContext = state.searchResults?.length
    ? `\n\nSearch Results:\n${state.searchResults
      .map(
        (result, index) =>
          `${index + 1}. ${result.title ?? "Untitled"}: ${
            result.snippet ?? result.content ?? ""
          }${state.images?.length && result.url ? "" : result.url ? ` (Source: ${result.url})` : ""}`,
      )
      .join("\n")}`
    : "";

  const searchAnswer = state.searchAnswer
    ? `\n\nTavily Answer:\n${state.searchAnswer}`
    : "";

  const messages: BaseMessage[] = [new SystemMessage(chatSystemPrompt)];


  if (searchContext || searchAnswer) {
    messages.push(new SystemMessage(`${searchAnswer}${searchContext}`));
  }

  if (state.images?.length) {
    messages.push(
      new SystemMessage(
        "Visual search results are being shown separately in the interface. Do not include image URLs, hyperlinks, markdown links, or a source-link list in the final response. Briefly describe the images only if useful.",
      ),
    );
  }

  history.forEach((message: any) => {
    if (message.role === "user") {
      messages.push(new HumanMessage(message.content));
    } else if (message.role === "assistant") {
      messages.push(new AIMessage(message.content));
    }
  });


  // Add the current prompt as a HumanMessage
  messages.push(new HumanMessage(state.prompt));

  const response = await llm.invoke(messages);

  return {
    ...state,
    aiResponse: response.content,
  };
};