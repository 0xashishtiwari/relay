import { END, START, StateGraph } from "@langchain/langgraph";
import { agentState } from "./state";
import { router } from "./router";
import { chatAgent } from "../agents/chat.agent";
import { imageGenAgent } from "../agents/imageGen.agent";
import { pdfAgent } from "../agents/pdf.agent";
import { codingAgent } from "../agents/coding.agent";
import { searchAgent } from "../agents/search.agent";
import { pptAgent } from "../agents/ppt.agent";

const workflow = new StateGraph(agentState)
  .addNode("router", router)
  .addNode("chat", chatAgent)
  .addNode("search", searchAgent)
  .addNode("coding", codingAgent)
  .addNode("pdf", pdfAgent)
  .addNode("ppt", pptAgent)
  .addNode("imageGen", imageGenAgent)
  .addEdge(START, "router")
  .addConditionalEdges("router", (state) => {
    if (state.agent === "chat") return "chat";
    if (state.agent === "search") return "search";
    if (state.agent === "coding") return "coding";
    if (state.agent === "pdf") return "pdf";
    if (state.agent === "ppt") return "ppt";
    if (state.agent === "imageGen") return "imageGen";
    return END;
  }, ["chat", "search", "coding", "pdf", "ppt", "imageGen"])
  .addEdge("chat", END)
  .addEdge("search", END)
  .addEdge("coding", END)
  .addEdge("pdf", END)
  .addEdge("ppt", END)
  .addEdge("imageGen", END);

workflow.addEdge("search", "chat");

export const agentGraph = workflow.compile();
