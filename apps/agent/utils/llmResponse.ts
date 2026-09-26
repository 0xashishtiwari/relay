/** Extract plain text from any LangChain message content shape. */
export function responseToText(content: unknown): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .map((block) =>
                typeof block === "string"
                    ? block
                    : block && typeof block === "object" && "text" in block && typeof (block as { text: unknown }).text === "string"
                        ? (block as { text: string }).text
                        : ""
            )
            .join("");
    }
    return "";
}
