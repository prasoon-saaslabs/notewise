import type { JSONContent } from "@tiptap/core";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineToText(node: JSONContent | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(inlineToText).join("");
}

function blockToPlainLines(node: JSONContent): string[] {
  if (node.type === "paragraph") {
    const text = inlineToText(node);
    return text ? [text] : [];
  }
  if (node.type === "bulletList") {
    return (node.content ?? []).flatMap((item: JSONContent) => {
      const text = inlineToText(item.content?.[0]);
      return text ? [`- ${text}`] : [];
    });
  }
  if (node.type === "orderedList") {
    return (node.content ?? []).flatMap((item: JSONContent, index: number) => {
      const text = inlineToText(item.content?.[0]);
      return text ? [`${index + 1}. ${text}`] : [];
    });
  }
  return [];
}

/** Serialize TipTap document JSON to markdown-lite plain text for API storage. */
export function docJsonToPlainText(json: JSONContent): string {
  const blocks = (json.content ?? []).flatMap((node: JSONContent) => {
    const lines = blockToPlainLines(node);
    return lines.length ? [lines.join("\n")] : [];
  });
  return blocks.join("\n\n");
}

function isBulletBlock(lines: string[]) {
  return lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line));
}

function isOrderedBlock(lines: string[]) {
  return lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line));
}

/** Parse stored plain text into minimal HTML for TipTap. */
export function plainTextToHtml(text: string): string {
  const trimmed = text.replace(/\r\n/g, "\n");
  if (!trimmed.trim()) return "<p></p>";

  const blocks = trimmed.split(/\n\n+/);
  const htmlParts: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((line, index, arr) => {
      if (line.trim()) return true;
      return index > 0 && index < arr.length - 1;
    });

    if (isBulletBlock(lines)) {
      const items = lines
        .map((line) => line.replace(/^[-*]\s+/, ""))
        .map((line) => `<li><p>${escapeHtml(line)}</p></li>`);
      htmlParts.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (isOrderedBlock(lines)) {
      const items = lines
        .map((line) => line.replace(/^\d+\.\s+/, ""))
        .map((line) => `<li><p>${escapeHtml(line)}</p></li>`);
      htmlParts.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraph = lines.map(escapeHtml).join("<br>").trim();
    htmlParts.push(`<p>${paragraph || "<br>"}</p>`);
  }

  return htmlParts.join("") || "<p></p>";
}

export function plainTextToDisplayBlocks(
  text: string
): Array<
  | { type: "paragraph"; text: string }
  | { type: "bullet"; items: string[] }
  | { type: "ordered"; items: string[] }
> {
  const trimmed = text.replace(/\r\n/g, "\n");
  if (!trimmed.trim()) return [];

  const blocks: Array<
    | { type: "paragraph"; text: string }
    | { type: "bullet"; items: string[] }
    | { type: "ordered"; items: string[] }
  > = [];

  for (const block of trimmed.split(/\n\n+/)) {
    const lines = block.split("\n").filter(Boolean);
    if (isBulletBlock(lines)) {
      blocks.push({
        type: "bullet",
        items: lines.map((line) => line.replace(/^[-*]\s+/, "")),
      });
      continue;
    }
    if (isOrderedBlock(lines)) {
      blocks.push({
        type: "ordered",
        items: lines.map((line) => line.replace(/^\d+\.\s+/, "")),
      });
      continue;
    }
    blocks.push({ type: "paragraph", text: block });
  }

  return blocks;
}
