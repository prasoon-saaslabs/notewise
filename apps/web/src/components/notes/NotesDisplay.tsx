import { plainTextToDisplayBlocks } from "./notesFormat";

type Props = Readonly<{
  value: string;
  className?: string;
}>;

export function NotesDisplay({ value, className = "" }: Props) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const blocks = plainTextToDisplayBlocks(trimmed);
  if (!blocks.length) {
    return (
      <p
        className={`m-0 whitespace-pre-wrap text-sm leading-relaxed text-[var(--nw-ink-2)] ${className}`}
      >
        {trimmed}
      </p>
    );
  }

  return (
    <div
      className={`nw-notes-display space-y-3 text-sm leading-relaxed text-[var(--nw-ink-2)] ${className}`}
    >
      {blocks.map((block, index) => {
        if (block.type === "bullet") {
          return (
            <ul key={index} className="m-0 list-disc space-y-1 pl-5">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ordered") {
          return (
            <ol key={index} className="m-0 list-decimal space-y-1 pl-5">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={index} className="m-0 whitespace-pre-wrap">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
