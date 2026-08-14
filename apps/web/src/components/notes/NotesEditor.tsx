import { useEffect, useRef, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { List, ListOrdered } from "lucide-react";
import { docJsonToPlainText, plainTextToHtml } from "./notesFormat";

export type NotesEditorVariant = "page" | "capture" | "compact" | "field";

type Props = Readonly<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  variant?: NotesEditorVariant;
  className?: string;
  minHeight?: number | string;
  height?: number | string;
  id?: string;
  onBlur?: () => void;
  "aria-label"?: string;
}>;

function variantShellClass(variant: NotesEditorVariant) {
  switch (variant) {
    case "page":
      return "nw-notes-editor--page";
    case "capture":
      return "nw-notes-editor--capture nw-capture-pad";
    case "compact":
      return "nw-notes-editor--compact";
    case "field":
    default:
      return "nw-notes-editor--field";
  }
}

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: Readonly<{
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      className={`nw-notes-editor-tool grid h-7 w-7 place-items-center rounded-md transition ${
        active
          ? "bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]"
          : "text-[var(--nw-ink-4)] hover:bg-[var(--nw-surface-2)] hover:text-[var(--nw-ink)]"
      }`}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function NotesEditor({
  value,
  onChange,
  placeholder = "Write notes…",
  disabled = false,
  variant = "field",
  className = "",
  minHeight,
  height,
  id,
  onBlur,
  "aria-label": ariaLabel,
}: Props) {
  const lastEmittedRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bold: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        strike: false,
        underline: false,
        link: false,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: plainTextToHtml(value),
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      const next = docJsonToPlainText(ed.getJSON());
      lastEmittedRef.current = next;
      onChangeRef.current(next);
    },
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: "nw-notes-editor-content outline-none",
        "aria-label": ariaLabel ?? placeholder,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    editor.commands.setContent(plainTextToHtml(value), { emitUpdate: false });
  }, [editor, value]);

  const shellStyle =
    minHeight != null || height != null
      ? {
          ...(minHeight != null
            ? {
                minHeight:
                  typeof minHeight === "number" ? `${minHeight}px` : minHeight,
              }
            : {}),
          ...(height != null
            ? {
                height: typeof height === "number" ? `${height}px` : height,
              }
            : {}),
        }
      : undefined;

  return (
    <div
      className={`nw-notes-editor ${variantShellClass(variant)} ${
        disabled ? "is-disabled" : ""
      } ${className}`}
      style={shellStyle}
    >
      <div className="nw-notes-editor-toolbar flex items-center gap-0.5 border-b border-[var(--nw-border)] px-1.5 py-1">
        <ToolbarButton
          active={Boolean(editor?.isActive("bulletList"))}
          label="Bullet list"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={Boolean(editor?.isActive("orderedList"))}
          label="Numbered list"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent
        editor={editor}
        className="nw-notes-editor-body min-h-0 flex-1"
      />
    </div>
  );
}
