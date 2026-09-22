import { getModel } from "../config/llmModels";
import { agentState } from "./state";
import { routerSystemPrompt } from "../prompts/router.prompt";

type AgentName =
  | "auto"
  | "chat"
  | "search"
  | "coding"
  | "pdf"
  | "ppt"
  | "imageGen";

const validAgents: AgentName[] = [
  "auto",
  "chat",
  "search",
  "coding",
  "pdf",
  "ppt",
  "imageGen",
];

export const router = async (
  state: typeof agentState.State
) => {
  if (state.agent && state.agent !== "auto" && validAgents.includes(state.agent as AgentName)) {
    return state;
  }

  const llm = await getModel("router");

  const response = await llm.invoke([
    {
      role: "system",
      content: routerSystemPrompt,
    },
    {
      role: "user",
      content: state.prompt,
    },
  ]);

  const rawAgent = response.content
    .toString()
    .trim();

  const agent =
    validAgents.find(
      (name) => name.toLowerCase() === rawAgent.toLowerCase()
    ) ?? "chat";

  return {
    ...state,
    agent,
  };
};