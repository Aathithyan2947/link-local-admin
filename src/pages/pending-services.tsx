import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api';
import { PageHeader } from '@/components/layout/app-layout';
import { Card, Spinner, Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PendingService {
  id: number;
  name: string;
  category: string;
  providers: number;
}

export function PendingServicesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['pending-services'],
    queryFn: async () => (await api.get<ApiResponse<PendingService[]>>('/admin/pending-services')).data.data,
  });

  const approve = useMutation({
    mutationFn: (id: number) => api.post(`/admin/pending-services/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-services'] }),
  });

  return (
    <div>
      <PageHeader
        breadcrumb="Admin"
        title="Service Approvals"
        subtitle="New service types submitted by providers, awaiting approval to the master list"
      />
      {isLoading ? (
        <Spinner />
      ) : !data?.length ? (
        <Card className="py-16 text-center text-gray-400">No services awaiting approval</Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <Card key={s.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{s.name}</div>
                  <div className="text-sm text-gray-500">{s.category}</div>
                </div>
                <Badge tone="warning">Pending</Badge>
              </div>
              <div className="text-xs text-gray-400">{s.providers} provider(s) requested this</div>
              <Button size="sm" loading={approve.isPending} onClick={() => approve.mutate(s.id)}>
                Approve & add to master
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
