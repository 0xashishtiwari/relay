import { getModel } from "../config/llmModels";
import { agentState } from "../graph/state";
import { chatSystemPrompt } from "../prompts/chat.prompt";

export const chatAgent = async (
  state: typeof agentState.State
) => {
  const llm = await getModel("chat");

  const response = await llm.invoke([
    {
      role: "system",
      content: chatSystemPrompt,
    },
    {
      role: "human",
      content: state.prompt,
    },
  ]);

  return {
    ...state,
    aiResponse: response.content,
  };
};