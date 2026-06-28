import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { api, assetUrl, type ApiResponse } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/app-layout';
import { Badge, Card, Spinner } from '@/components/ui/card';

interface MemberDetail {
  id: number;
  name: string;
  email: string | null;
  mobile: string | null;
  userType: string;
  isVerified: boolean;
  isActive: boolean;
  isBlocked: boolean;
  referralCode: string | null;
  createdAt: string;
  photoUrl: string | null;
  aboutMe: string | null;
  gender: string | null;
  completionPercent: number;
  fullAddress: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  docStatus: string;
  educations: string[];
  professions: { category: string; company: string | null }[];
  hobbies: string[];
  contacts: { type: string; value: string }[];
  services: string[];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value || '—'}</span>
    </div>
  );
}

const routeApi = getRouteApi('/authenticated/members/$id');

export function MemberDetailPage() {
  const params = routeApi.useParams() as { id?: string };
  // Prefer the router param; fall back to the URL's last segment so it works even if the
  // param isn't resolved yet for any reason.
  const id = params.id ?? window.location.pathname.split('/').filter(Boolean).pop();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['member', id],
    enabled: !!id,
    queryFn: async () => (await api.get<ApiResponse<MemberDetail>>(`/admin/members/${id}`)).data.data,
  });

  return (
    <div>
      <button
        onClick={() => window.history.back()}
        className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      {isLoading ? (
        <Spinner />
      ) : isError || !data ? (
        <Card className="py-16 text-center text-gray-400">Member not found</Card>
      ) : (
        <>
          <PageHeader breadcrumb="Admin › Members" title={data.name} subtitle={data.email ?? data.mobile ?? ''} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
            {/* Left: identity */}
            <div className="space-y-5">
              <Card className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-2xl font-bold text-brand-600">
                    {data.photoUrl ? (
                      <img src={assetUrl(data.photoUrl)} alt={data.name} className="h-16 w-16 rounded-full object-cover" />
                    ) : (
                      data.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-lg font-bold text-gray-900">{data.name}</div>
                    <Badge tone={data.userType === 'service_provider' ? 'success' : 'neutral'}>
                      {data.userType === 'service_provider' ? 'Service Provider' : 'Resident'}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.isVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}
                  {data.isBlocked ? <Badge tone="danger">Blocked</Badge> : data.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}
                </div>
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <Row label="Email" value={data.email} />
                  <Row label="Mobile" value={data.mobile} />
                  <Row label="Gender" value={data.gender} />
                  <Row label="Referral code" value={data.referralCode} />
                  <Row label="Joined" value={formatDate(data.createdAt)} />
                  <Row
                    label="Profile"
                    value={
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-16 overflow-hidden rounded-full bg-gray-100">
                          <span className="block h-full rounded-full bg-brand-500" style={{ width: `${data.completionPercent}%` }} />
                        </span>
                        {data.completionPercent}%
                      </span>
                    }
                  />
                </div>
              </Card>

              <Section title="Address">
                <Row label="Address" value={data.fullAddress} />
                <Row label="Area" value={data.area} />
                <Row label="City" value={[data.city, data.state].filter(Boolean).join(', ')} />
                <Row label="Proof" value={<span className="capitalize">{data.docStatus}</span>} />
              </Section>
            </div>

            {/* Right: profile content */}
            <div className="space-y-5">
              {data.aboutMe && (
                <Section title="About">
                  <p className="text-sm text-gray-600">{data.aboutMe}</p>
                </Section>
              )}

              {data.userType === 'service_provider' && (
                <Section title="Services">
                  {data.services.length ? (
                    <div className="flex flex-wrap gap-2">
                      {data.services.map((s, i) => <Badge key={i} tone="success">{s}</Badge>)}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">None</p>
                  )}
                </Section>
              )}

              <Section title="Profession">
                {data.professions.length ? (
                  <ul className="space-y-1.5 text-sm">
                    {data.professions.map((p, i) => (
                      <li key={i} className="text-gray-800">
                        <span className="font-medium">{p.category}</span>
                        {p.company ? <span className="text-gray-500"> — {p.company}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">None</p>
                )}
              </Section>

              <Section title="Education">
                {data.educations.length ? (
                  <ul className="space-y-1.5 text-sm text-gray-800">
                    {data.educations.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">None</p>
                )}
              </Section>

              <Section title="Contacts">
                {data.contacts.length ? (
                  <ul className="space-y-1.5 text-sm text-gray-800">
                    {data.contacts.map((c, i) => (
                      <li key={i}><span className="capitalize text-gray-500">{c.type}:</span> {c.value}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">None</p>
                )}
              </Section>

              {data.hobbies.length > 0 && (
                <Section title="Hobbies">
                  <div className="flex flex-wrap gap-2">
                    {data.hobbies.map((h, i) => <Badge key={i}>{h}</Badge>)}
                  </div>
                </Section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
