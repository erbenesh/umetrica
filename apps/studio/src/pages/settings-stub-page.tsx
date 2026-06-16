import { DocBlock } from '@/components/doc/doc-block';
import { DocPage } from '@/components/doc/doc-page';
import { DocCallout } from '@/components/doc/doc-callout';

export function SettingsStubPage({
  title,
  lead,
}: {
  title: string;
  lead?: string;
}) {
  return (
    <DocPage title={title} lead={lead} back="auto">
      <DocBlock>
        <DocCallout>
          Экран в разработке — макет уже готов в <code className="text-foreground">design/mockups/</code>.
          Функциональность появится в следующих волнах переноса.
        </DocCallout>
      </DocBlock>
    </DocPage>
  );
}
