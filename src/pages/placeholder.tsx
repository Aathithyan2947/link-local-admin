import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader breadcrumb="Admin" title={title} />
      <Card className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="rounded-2xl bg-brand-50 p-4 text-brand-500">
          <Construction className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800">{title} module</h3>
        <p className="max-w-sm text-sm text-gray-500">
          This section is wired into navigation and the API layer, and is ready for its detailed
          screens in the next iteration.
        </p>
      </Card>
    </div>
  );
}
