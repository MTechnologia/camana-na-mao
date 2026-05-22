type PlatformSectionHeadingProps = {
  title: string;
  description?: string;
  id?: string;
};

/** Título de bloco sem card — use quando o conteúdo abaixo já tiver seu próprio card. */
export function PlatformSectionHeading({ title, description, id }: PlatformSectionHeadingProps) {
  return (
    <div className="space-y-1">
      <h2 id={id} className="text-sm font-semibold text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
