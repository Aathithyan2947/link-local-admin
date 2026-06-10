import { Link } from '@tanstack/react-router';
import {
  MapPin,
  Briefcase,
  GraduationCap,
  TicketPercent,
  FileCheck2,
  Tags,
  Share2,
  ShieldCheck,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/app-layout';

interface MasterCard {
  title: string;
  description: string;
  to: string;
  icon: typeof MapPin;
}

const cards: MasterCard[] = [
  {
    title: 'Address Capture',
    description: 'Management cities, areas, lanes, apartments and house number formats.',
    to: '/masters/addresses',
    icon: MapPin,
  },
  {
    title: 'Service Providers Category',
    description: 'Manage categories and profile fields for service providers.',
    to: '/masters/service-categories',
    icon: Briefcase,
  },
  {
    title: 'Education & Profession',
    description: 'Manage education, school, colleges and profession master data.',
    to: '/masters/education',
    icon: GraduationCap,
  },
  {
    title: 'Coupon Codes',
    description: 'Manage Coupon codes',
    to: '/masters/coupons',
    icon: TicketPercent,
  },
  {
    title: 'Documents Verification',
    description: 'Manage documents required for address and profile verification.',
    to: '/masters/doc-types',
    icon: FileCheck2,
  },
  {
    title: 'Profile Tags Master',
    description: 'Manage tags that can be assigned to service providers.',
    to: '/masters/profile-tags',
    icon: Tags,
  },
  {
    title: 'Referral Source',
    description: 'Manage referral sources and user referrals.',
    to: '/masters/referral-sources',
    icon: Share2,
  },
  {
    title: 'Permissions',
    description: 'Manage permissions for residents and service providers.',
    to: '/masters/permissions',
    icon: ShieldCheck,
  },
  {
    title: 'Whitelisted Cities',
    description: 'Whitelisted cities where our services are active.',
    to: '/masters/cities',
    icon: Building2,
  },
];

export function MastersPage() {
  return (
    <div>
      <PageHeader
        breadcrumb="Admin"
        title="Masters & Controls"
        subtitle="Manage all master data and system control"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.to} to={c.to}>
            <Card className="group h-full p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
                  <c.icon className="h-6 w-6" />
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-500" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">{c.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{c.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
