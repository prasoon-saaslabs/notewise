type MarketingArticleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function MarketingArticle({
  eyebrow,
  title,
  description,
  children,
  className,
}: MarketingArticleProps) {
  return (
    <div className={className ?? "mx-auto max-w-3xl px-4 pb-16 md:px-6 md:pb-24"}>
      {eyebrow ? (
        <p className="text-sm font-medium tracking-wide text-teal">{eyebrow}</p>
      ) : null}
      <h1 className="mt-2 font-display text-4xl tracking-tight text-ink md:text-5xl">{title}</h1>
      {description ? (
        <p className="mt-4 text-lg leading-relaxed text-ink-secondary">{description}</p>
      ) : null}
      <div className="marketing-prose mt-10">{children}</div>
    </div>
  );
}
