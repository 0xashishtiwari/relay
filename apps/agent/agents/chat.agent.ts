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

  const history =  await getMemory(state.conversationId);
  
  const messages: BaseMessage[] = [new SystemMessage(chatSystemPrompt)];

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