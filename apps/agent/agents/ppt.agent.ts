import { agentState } from "../graph/state";
import { runSpecialistAgent } from "./specialist.agent";

export const pptAgent = (state: typeof agentState.State) =>
    runSpecialistAgent(
        state,
        "You are Relay's presentation agent. Help plan, write, structure, and improve PowerPoint presentations. Return clear slide-by-slide content when appropriate.",
    );