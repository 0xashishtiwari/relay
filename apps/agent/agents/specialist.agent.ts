import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModel } from "../config/llmModels";
import { agentState } from "../graph/state";

export const runSpecialistAgent = async (
  state: typeof agentState.State,
  instructions: string,
) => {
  const llm = await getModel(state.agent);
  const response = await llm.invoke([
    new SystemMessage(instructions),
    new HumanMessage(state.prompt),
  ]);

  return {
    ...state,
    aiResponse: response.content.toString(),
  };
};