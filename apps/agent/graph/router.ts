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
  | "imageGen"
  | "pdfRag"
  | "imageRag";

const validAgents: AgentName[] = [
  "auto",
  "chat",
  "search",
  "coding",
  "pdf",
  "ppt",
  "imageGen",
  "pdfRag",
  "imageRag",
];

export const router = async (
  state: typeof agentState.State
) => {
  if (state.agent && state.agent !== "auto" && validAgents.includes(state.agent as AgentName)) {
    return state;
  }

  // An attached file decides the agent without needing the LLM router.
  if (state.fileType === "pdf" || state.agent === "pdfRag") {
    return { ...state, agent: "pdfRag" as AgentName };
  }
  if (state.fileType === "image" || state.agent === "imageRag") {
    return { ...state, agent: "imageRag" as AgentName };
  }

  if (!state.prompt || typeof state.prompt !== "string" || state.prompt.trim() === "") {
    return { ...state, agent: "chat" as AgentName };
  }

  let llm;
  try {
    llm = await getModel("router");
  } catch (err) {
    console.error("Router: failed to load model, falling back to chat:", err);
    return { ...state, agent: "chat" as AgentName };
  }

  let rawAgent = "";
  try {
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
    rawAgent = response.content.toString().trim();
  } catch (err) {
    console.error("Router: llm.invoke failed, falling back to chat:", err);
    return { ...state, agent: "chat" as AgentName };
  }

  const agent =
    validAgents.find(
      (name) => name.toLowerCase() === rawAgent.toLowerCase()
    ) ?? "chat";

  return {
    ...state,
    agent,
  };
};