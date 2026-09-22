import { agentState } from "../graph/state";
import { runSpecialistAgent } from "./specialist.agent";

export const pdfAgent = (state: typeof agentState.State) =>
    runSpecialistAgent(
        state,
        "You are Relay's PDF agent. Help the user analyze, summarize, extract, or transform PDF content. Explain what information is needed when no PDF content is provided.",
    );