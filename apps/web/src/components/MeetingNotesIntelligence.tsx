import type { ReactNode } from "react";
import {
  CheckSquare,
  FileText,
  ListChecks,
  Sparkles,
  StickyNote,
} from "lucide-react";
import type { NotesPayload } from "@notewise/api-client";
import { ClaimLine } from "./Receipts";
import { NotesEditor } from "./notes/NotesEditor";
import { NotesDisplay } from "./notes/NotesDisplay";
import type { UserNotesSaveHint } from "./notes/usePersistedUserNotes";

type SectionAccent = "teal" | "amber" | "rose" | "slate" | "violet";

function SectionCard({
  icon,
  title,
  accent,
  delay = 0,
  children,
  empty,
}: {
  icon: ReactNode;
  title: string;
  accent: SectionAccent;
  delay?: number;
  children: ReactNode;
  empty?: boolean;
}) {
  const accents: Record<SectionAccent, string> = {
    teal: "from-[rgb(var(--nw-accent-rgb)_/_0.12)] via-[var(--nw-surface-solid)] to-[var(--nw-surface-solid)] border-[rgb(var(--nw-accent-rgb)_/_0.18)]",
    amber:
      "from-[rgb(217_119_6_/_0.1)] via-[var(--nw-surface-solid)] to-[var(--nw-surface-solid)] border-[rgb(217_119_6_/_0.2)]",
    rose: "from-[rgb(225_29_72_/_0.08)] via-[var(--nw-surface-solid)] to-[var(--nw-surface-solid)] border-[rgb(225_29_72_/_0.16)]",
    slate:
      "from-[rgb(100_116_139_/_0.08)] via-[var(--nw-surface-solid)] to-[var(--nw-surface-solid)] border-[var(--nw-border)]",
    violet:
      "from-[rgb(79_70_229_/_0.08)] via-[var(--nw-surface-solid)] to-[var(--nw-surface-solid)] border-[rgb(79_70_229_/_0.16)]",
  };
  const iconBg: Record<SectionAccent, string> = {
    teal: "bg-[rgb(var(--nw-accent-rgb)_/_0.12)] text-[var(--nw-accent-dark)]",
    amber: "bg-[rgb(217_119_6_/_0.12)] text-[rgb(180_83_9)]",
    rose: "bg-[rgb(225_29_72_/_0.1)] text-[rgb(190_18_60)]",
    slate: "bg-[var(--nw-surface-2)] text-[var(--nw-ink-3)]",
    violet: "bg-[rgb(79_70_229_/_0.1)] text-[rgb(67_56_202)]",
  };
  return (
    <section
      className={`nw-intel-card rounded-2xl border bg-gradient-to-br p-4 shadow-[0_1px_0_rgb(15_23_42_/_0.03)] ${
        accents[accent]
      } ${empty ? "opacity-80" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="mb-3 flex items-center gap-2">
        <span
          className={`grid h-8 w-8 place-items-center rounded-xl ${iconBg[accent]}`}
        >
          {icon}
        </span>
        <h3 className="m-0 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
          {title}
        </h3>
      </header>
      {children}
    </section>
  );
}

function DocumentSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="m-0 mb-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--nw-ink-4)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="m-0 min-w-0 list-disc space-y-1.5 break-words pl-5">
      {items.map((item, i) => (
        <li key={`${item}-${i}`} className="[overflow-wrap:anywhere]">
          {item}
        </li>
      ))}
    </ul>
  );
}

function UserNotesSection({
  userNotes,
  userNotesEditable,
  onUserNotesChange,
  userNotesSaveHint,
  layout,
  sectionClassName = "",
}: {
  userNotes?: string | null;
  userNotesEditable?: boolean;
  onUserNotesChange?: (value: string) => void;
  userNotesSaveHint?: UserNotesSaveHint;
  layout: "cards" | "document";
  sectionClassName?: string;
}) {
  if (userNotesEditable) {
    if (layout === "document") {
      return (
        <section className={sectionClassName}>
          <div className="mb-2.5 flex items-baseline justify-between gap-2">
            <h2 className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--nw-ink-4)]">
              Your notes
            </h2>
            {userNotesSaveHint === "saving" ? (
              <span className="text-[0.65rem] text-[var(--nw-ink-4)]">
                Saving…
              </span>
            ) : userNotesSaveHint === "error" ? (
              <span className="text-[0.65rem] text-[var(--nw-danger)]">
                Could not save
              </span>
            ) : null}
          </div>
          <NotesEditor
            variant="field"
            minHeight={120}
            placeholder="Add your notes…"
            value={userNotes ?? ""}
            onChange={onUserNotesChange!}
            aria-label="Your notes"
          />
        </section>
      );
    }

    return (
      <SectionCard
        icon={<StickyNote className="h-4 w-4" />}
        title="Your notes"
        accent="amber"
        delay={40}
      >
        {userNotesSaveHint === "saving" ? (
          <p className="m-0 mb-2 text-[0.65rem] text-[var(--nw-ink-4)]">
            Saving…
          </p>
        ) : userNotesSaveHint === "error" ? (
          <p className="m-0 mb-2 text-[0.65rem] text-[var(--nw-danger)]">
            Could not save
          </p>
        ) : null}
        <NotesEditor
          variant="field"
          minHeight={120}
          placeholder="Add your notes…"
          value={userNotes ?? ""}
          onChange={onUserNotesChange!}
          aria-label="Your notes"
        />
      </SectionCard>
    );
  }

  if (!userNotes?.trim()) return null;

  if (layout === "document") {
    return (
      <DocumentSection title="Your notes" className={sectionClassName}>
        <NotesDisplay value={userNotes.trim()} />
      </DocumentSection>
    );
  }

  return (
    <SectionCard
      icon={<StickyNote className="h-4 w-4" />}
      title="Your notes"
      accent="amber"
      delay={40}
    >
      <NotesDisplay value={userNotes.trim()} />
    </SectionCard>
  );
}

export function MeetingNotesIntelligence({
  notes,
  userNotes,
  userNotesEditable = false,
  onUserNotesChange,
  userNotesSaveHint,
  onJump,
  showTitleInSummary = true,
  summarySectionTitle = "Call summary",
  userNotesPlacement = "first",
  emptySummaryMessage = "Summary will appear after processing.",
  layout = "cards",
}: {
  notes: NotesPayload | null;
  userNotes?: string | null;
  userNotesEditable?: boolean;
  onUserNotesChange?: (value: string) => void;
  userNotesSaveHint?: UserNotesSaveHint;
  onJump?: (lineId?: string, startMs?: number | null) => void;
  showTitleInSummary?: boolean;
  summarySectionTitle?: string;
  userNotesPlacement?: "first" | "last";
  emptySummaryMessage?: string;
  layout?: "cards" | "document";
}) {
  const actions = notes?.actions ?? [];
  const takeaways = notes?.takeaways ?? [];
  const questions = notes?.openQuestions ?? [];
  const decisions = notes?.decisions ?? [];
  const objections = notes?.objections ?? [];
  const hasSummary = Boolean(notes?.executiveSummary || notes?.title);

  const userNotesSection = (
    <UserNotesSection
      userNotes={userNotes}
      userNotesEditable={userNotesEditable}
      onUserNotesChange={onUserNotesChange}
      userNotesSaveHint={userNotesSaveHint}
      layout={layout}
      sectionClassName={
        layout === "document" && userNotesPlacement === "last" ? "mt-8" : ""
      }
    />
  );

  if (layout === "document") {
    const actionItems = actions.map((a) => a.text).filter(Boolean);
    const decisionItems = decisions.map((d) => d.text).filter(Boolean);
    const objectionItems = objections.map((o) => o.text).filter(Boolean);

    return (
      <article className="min-w-0 break-words text-sm leading-relaxed text-[var(--nw-ink-2)]">
        {userNotesPlacement === "first" ? userNotesSection : null}

        {notes?.executiveSummary ? (
          <p className="m-0 whitespace-pre-wrap">{notes.executiveSummary}</p>
        ) : (
          <p className="m-0 text-[var(--nw-ink-4)]">{emptySummaryMessage}</p>
        )}

        {actionItems.length > 0 ? (
          <DocumentSection title="Action items" className="mt-8">
            <BulletList items={actionItems} />
          </DocumentSection>
        ) : null}

        {objectionItems.length > 0 ? (
          <DocumentSection title="Objections" className="mt-8">
            <BulletList items={objectionItems} />
          </DocumentSection>
        ) : null}

        {decisionItems.length > 0 ? (
          <DocumentSection title="Decisions" className="mt-8">
            <BulletList items={decisionItems} />
          </DocumentSection>
        ) : null}

        {takeaways.length > 0 ? (
          <DocumentSection title="Takeaways" className="mt-8">
            <BulletList items={takeaways} />
          </DocumentSection>
        ) : null}

        {questions.length > 0 ? (
          <DocumentSection title="Open questions" className="mt-8">
            <BulletList items={questions} />
          </DocumentSection>
        ) : null}

        {notes?.followUpEmail ? (
          <DocumentSection title="Follow-up email" className="mt-8">
            <p className="m-0 whitespace-pre-wrap">{notes.followUpEmail}</p>
          </DocumentSection>
        ) : null}

        {userNotesPlacement === "last" ? userNotesSection : null}
      </article>
    );
  }

  const intelligenceSections = (
    <>
      <SectionCard
        icon={<Sparkles className="h-4 w-4" />}
        title={summarySectionTitle}
        accent="teal"
        delay={80}
        empty={!hasSummary}
      >
        {showTitleInSummary && notes?.title ? (
          <p className="mb-2 mt-0 text-base font-semibold tracking-tight text-[var(--nw-ink)]">
            {notes.title}
          </p>
        ) : null}
        {notes?.executiveSummary ? (
          <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed text-[var(--nw-ink-2)]">
            {notes.executiveSummary}
          </p>
        ) : (
          <p className="m-0 text-sm text-[var(--nw-ink-4)]">
            {emptySummaryMessage}
          </p>
        )}
      </SectionCard>

      {objections.length > 0 ? (
        <SectionCard
          icon={<FileText className="h-4 w-4" />}
          title="Objections"
          accent="rose"
          delay={100}
        >
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {objections.map((o) => (
              <ClaimLine key={o.id} claim={o} onJump={onJump} />
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {decisions.length > 0 ? (
        <SectionCard
          icon={<ListChecks className="h-4 w-4" />}
          title="Decisions"
          accent="violet"
          delay={110}
        >
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {decisions.map((d) => (
              <ClaimLine key={d.id} claim={d} onJump={onJump} />
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SectionCard
        icon={<CheckSquare className="h-4 w-4" />}
        title="Action items"
        accent="rose"
        delay={120}
        empty={actions.length === 0}
      >
        {actions.length === 0 ? (
          <p className="m-0 text-sm text-[var(--nw-ink-4)]">
            No action items detected yet.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {actions.map((a, i) => (
              <li
                key={`${a.text}-${i}`}
                className="nw-action-row flex items-start gap-3 rounded-xl border border-[rgb(225_29_72_/_0.12)] bg-[var(--nw-glass-bg-strong)] px-3 py-2.5"
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[rgb(225_29_72_/_0.1)] text-[0.65rem] font-bold text-[rgb(190_18_60)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-medium leading-snug text-[var(--nw-ink)]">
                    {a.text}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {a.owner ? (
                      <span className="rounded-full bg-[rgb(var(--nw-accent-rgb)_/_0.1)] px-2 py-0.5 text-[0.6rem] font-bold uppercase text-[var(--nw-accent-dark)]">
                        {a.owner}
                      </span>
                    ) : null}
                    {onJump ? (
                      <button
                        type="button"
                        className="rounded-full bg-[rgb(var(--nw-accent-rgb)_/_0.12)] px-1.5 py-0.5 text-[0.6rem] font-bold text-[var(--nw-accent-dark)]"
                        onClick={() => onJump(a.lineIds?.[0], a.startMs)}
                      >
                        receipt
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {notes?.followUpEmail ? (
        <SectionCard
          icon={<FileText className="h-4 w-4" />}
          title="Follow-up email"
          accent="slate"
          delay={140}
        >
          <p className="m-0 whitespace-pre-wrap text-sm">
            {notes.followUpEmail}
          </p>
        </SectionCard>
      ) : null}

      {takeaways.length > 0 ? (
        <SectionCard
          icon={<ListChecks className="h-4 w-4" />}
          title="Takeaways"
          accent="violet"
          delay={160}
        >
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {takeaways.map((t) => (
              <li
                key={t}
                className="relative pl-4 text-sm leading-relaxed text-[var(--nw-ink-2)] before:absolute before:left-0 before:top-[0.55em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-[rgb(79_70_229)]"
              >
                {t}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {questions.length > 0 ? (
        <SectionCard
          icon={<FileText className="h-4 w-4" />}
          title="Open questions"
          accent="slate"
          delay={200}
        >
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {questions.map((q) => (
              <li
                key={q}
                className="rounded-lg bg-[var(--nw-glass-bg)] px-3 py-2 text-sm text-[var(--nw-ink-2)]"
              >
                {q}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      {userNotesPlacement === "first" ? userNotesSection : null}
      {intelligenceSections}
      {userNotesPlacement === "last" ? userNotesSection : null}
    </div>
  );
}
