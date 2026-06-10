import { Badge } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { MasterCrudConfig } from './master-crud';

const activeCell = (r: { isActive?: boolean }) =>
  r.isActive === false ? <Badge>Inactive</Badge> : <Badge tone="success">Active</Badge>;

export const masterConfigs: Record<string, MasterCrudConfig> = {
  cities: {
    title: 'Whitelisted Cities',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Cities where our services are active',
    endpoint: '/masters/cities',
    queryKey: 'm-cities',
    searchPlaceholder: 'Search cities...',
    columns: [
      { header: 'Name', cell: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
      { header: 'State', cell: (r) => r.state ?? '—' },
      { header: 'Status', cell: activeCell },
    ],
    fields: [
      { name: 'name', label: 'City name', type: 'text', required: true },
      { name: 'state', label: 'State', type: 'text' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },

  'service-categories': {
    title: 'Service Providers Category',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Categories for service providers',
    endpoint: '/masters/service-categories',
    queryKey: 'm-service-categories',
    searchPlaceholder: 'Search categories...',
    columns: [
      { header: 'Category', cell: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
      {
        header: 'Subcategories',
        cell: (r) => (r.subcategories?.length ?? 0) + ' items',
      },
      { header: 'Status', cell: activeCell },
    ],
    fields: [
      { name: 'name', label: 'Category name', type: 'text', required: true },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },

  coupons: {
    title: 'Coupon Codes',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Manage coupon codes and discounts',
    endpoint: '/masters/coupons',
    queryKey: 'm-coupons',
    searchPlaceholder: 'Search codes...',
    columns: [
      { header: 'Code', cell: (r) => <span className="font-mono font-medium">{r.code}</span> },
      {
        header: 'Discount',
        cell: (r) =>
          r.discountType === 'percent_off' ? `${r.discountValue}%` : `₹${r.discountValue}`,
      },
      { header: 'Used', cell: (r) => `${r.usedCount ?? 0}${r.maxUses ? ` / ${r.maxUses}` : ''}` },
      { header: 'Valid To', cell: (r) => formatDate(r.validityTo) },
      { header: 'Status', cell: activeCell },
    ],
    fields: [
      { name: 'code', label: 'Coupon code', type: 'text', required: true },
      {
        name: 'discountType',
        label: 'Discount type',
        type: 'select',
        required: true,
        options: [
          { value: 'amount_off', label: 'Amount off (₹)' },
          { value: 'percent_off', label: 'Percent off (%)' },
        ],
      },
      { name: 'discountValue', label: 'Discount value', type: 'number', required: true },
      { name: 'validityFrom', label: 'Valid from', type: 'date' },
      { name: 'validityTo', label: 'Valid to', type: 'date' },
      { name: 'maxUses', label: 'Max uses (blank = unlimited)', type: 'number' },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },

  education: {
    title: 'Education & Profession',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Education master data',
    endpoint: '/masters/education',
    queryKey: 'm-education',
    searchPlaceholder: 'Search degree, college...',
    columns: [
      { header: 'Degree', cell: (r) => r.degree ?? '—' },
      { header: 'School', cell: (r) => r.schoolName ?? '—' },
      { header: 'College', cell: (r) => r.collegeName ?? '—' },
    ],
    fields: [
      { name: 'degree', label: 'Degree', type: 'text' },
      { name: 'schoolName', label: 'School name', type: 'text' },
      { name: 'schoolCity', label: 'School city', type: 'text' },
      { name: 'collegeName', label: 'College name', type: 'text' },
      { name: 'collegeCity', label: 'College city', type: 'text' },
    ],
  },

  'doc-types': {
    title: 'Documents Verification',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Allowed document types per city',
    endpoint: '/masters/doc-types',
    queryKey: 'm-doc-types',
    searchPlaceholder: 'Search document types...',
    columns: [
      { header: 'Document Type', cell: (r) => <span className="font-medium">{r.docType}</span> },
      { header: 'City ID', cell: (r) => r.cityId },
      { header: 'Status', cell: activeCell },
    ],
    fields: [
      {
        name: 'cityId',
        label: 'City',
        type: 'select',
        required: true,
        optionsEndpoint: '/masters/cities',
        optionLabel: (c) => c.name,
      },
      { name: 'docType', label: 'Document type', type: 'text', required: true },
      { name: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  },

  'profile-tags': {
    title: 'Profile Tags Master',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Tags assignable to members',
    endpoint: '/masters/profile-tags',
    queryKey: 'm-profile-tags',
    searchPlaceholder: 'Search tags...',
    columns: [{ header: 'Tag', cell: (r) => <span className="font-medium">{r.tagName}</span> }],
    fields: [{ name: 'tagName', label: 'Tag name', type: 'text', required: true }],
  },

  'referral-sources': {
    title: 'Referral Source',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Referral sources',
    endpoint: '/masters/referral-sources',
    queryKey: 'm-referral-sources',
    searchPlaceholder: 'Search sources...',
    columns: [
      { header: 'Source', cell: (r) => <span className="font-medium">{r.source}</span> },
      { header: 'Label', cell: (r) => r.label ?? '—' },
    ],
    fields: [
      { name: 'source', label: 'Source key', type: 'text', required: true },
      { name: 'label', label: 'Label', type: 'text' },
    ],
  },

  permissions: {
    title: 'Permissions',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Permission matrix for residents and service providers',
    endpoint: '/masters/permissions',
    queryKey: 'm-permissions',
    searchPlaceholder: 'Search actions...',
    columns: [
      { header: 'User Type', cell: (r) => r.userType },
      { header: 'Action', cell: (r) => <span className="font-mono text-xs">{r.action}</span> },
      {
        header: 'Allowed',
        cell: (r) => (r.isAllowed ? <Badge tone="success">Yes</Badge> : <Badge tone="danger">No</Badge>),
      },
    ],
    fields: [
      {
        name: 'userType',
        label: 'User type',
        type: 'select',
        required: true,
        options: [
          { value: 'resident', label: 'Resident' },
          { value: 'service_provider', label: 'Service Provider' },
        ],
      },
      { name: 'action', label: 'Action key', type: 'text', required: true },
      { name: 'isAllowed', label: 'Allowed', type: 'checkbox' },
    ],
  },
};
