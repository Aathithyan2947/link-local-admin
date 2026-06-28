import { Badge } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { MasterCrudConfig } from './master-crud';

const activeCell = (r: { isActive?: boolean }) =>
  r.isActive === false ? <Badge>Inactive</Badge> : <Badge tone="success">Active</Badge>;

// Indian states/UTs for the Cities master state dropdown.
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
  'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep',
].map((s) => ({ value: s, label: s }));

// Allowed address-proof document types (mirrors the backend's documented values).
const DOC_TYPES = [
  { value: 'utility_bill', label: 'Utility bill' },
  { value: 'rental_agreement', label: 'Rental agreement' },
  { value: 'govt_id', label: 'Government ID' },
  { value: 'bank_statement', label: 'Bank statement' },
  { value: 'employment_letter', label: 'Employment letter' },
  { value: 'other', label: 'Other' },
];

// Controlled referral-source keys (mirrors the backend's documented values).
const REFERRAL_SOURCES = [
  { value: 'social_media', label: 'Social media' },
  { value: 'friends_family', label: 'Friends & family' },
  { value: 'print_media', label: 'Print media' },
  { value: 'neighbourhood_poster', label: 'Neighbourhood poster' },
  { value: 'user_id', label: 'Referred by a user' },
  { value: 'event_id', label: 'From an event' },
  { value: 'other', label: 'Other' },
];

// Known permission actions (the matrix is stored only; not yet enforced in the app).
const PERMISSION_ACTIONS = [
  'post_create', 'post_comment', 'event_create', 'event_edit', 'event_delete',
  'group_create', 'group_post', 'message_send', 'service_offer', 'referral_share',
].map((a) => ({ value: a, label: a }));

const DOC_TYPE_LABELS: Record<string, string> = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));

export const masterConfigs: Record<string, MasterCrudConfig> = {
  cities: {
    title: 'Whitelisted Cities',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Cities where our services are active',
    endpoint: '/masters/cities',
    queryKey: 'm-cities',
    searchPlaceholder: 'Search cities...',
    softDelete: true, // cities are deactivated, not deleted (they have linked members/addresses)
    columns: [
      { header: 'Name', cell: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
      { header: 'State', cell: (r) => r.state ?? '—' },
      { header: 'Status', cell: activeCell },
    ],
    fields: [
      { name: 'name', label: 'City name', type: 'text', required: true },
      { name: 'state', label: 'State', type: 'select', options: INDIAN_STATES },
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
    title: 'Education',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Education master data',
    endpoint: '/masters/education',
    queryKey: 'm-education',
    searchPlaceholder: 'Search degree, college, university...',
    approvable: true,
    columns: [
      { header: 'Degree', cell: (r) => <span className="font-medium text-gray-900">{r.degree ?? '—'}</span> },
      { header: 'School', cell: (r) => r.schoolName ?? '—' },
      { header: 'College', cell: (r) => r.collegeName ?? '—' },
      { header: 'University', cell: (r) => r.university ?? '—' },
    ],
    fields: [
      { name: 'degree', label: 'Degree', type: 'text' },
      { name: 'schoolName', label: 'School name', type: 'text' },
      { name: 'schoolCity', label: 'School city', type: 'text' },
      { name: 'collegeName', label: 'College name', type: 'text' },
      { name: 'collegeCity', label: 'College city', type: 'text' },
      { name: 'university', label: 'University', type: 'text' },
      { name: 'isActive', label: 'Active (approved & shown in app)', type: 'checkbox' },
    ],
  },

  professions: {
    title: 'Professions',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Profession categories members can choose',
    endpoint: '/masters/professions',
    queryKey: 'm-professions',
    searchPlaceholder: 'Search professions...',
    approvable: true,
    columns: [
      { header: 'Profession', cell: (r) => <span className="font-medium text-gray-900">{r.category}</span> },
    ],
    fields: [
      { name: 'category', label: 'Profession', type: 'text', required: true },
      { name: 'isActive', label: 'Active (approved & shown in app)', type: 'checkbox' },
    ],
  },

  schools: {
    title: 'Schools',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Curated schools members can choose (independent of degree & college)',
    endpoint: '/masters/schools',
    queryKey: 'm-schools',
    searchPlaceholder: 'Search schools...',
    approvable: true,
    columns: [
      { header: 'School', cell: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
      { header: 'City', cell: (r) => r.city ?? '—' },
    ],
    fields: [
      { name: 'name', label: 'School name', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'isActive', label: 'Active (approved & shown in app)', type: 'checkbox' },
    ],
  },

  colleges: {
    title: 'Colleges',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Curated colleges members can choose (independent of degree & school)',
    endpoint: '/masters/colleges',
    queryKey: 'm-colleges',
    searchPlaceholder: 'Search colleges...',
    approvable: true,
    columns: [
      { header: 'College', cell: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
      { header: 'City', cell: (r) => r.city ?? '—' },
    ],
    fields: [
      { name: 'name', label: 'College name', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'isActive', label: 'Active (approved & shown in app)', type: 'checkbox' },
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
      { header: 'Document Type', cell: (r) => <span className="font-medium">{DOC_TYPE_LABELS[r.docType] ?? r.docType}</span> },
      { header: 'City', cell: (r) => r.city?.name ?? '—' },
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
      { name: 'docType', label: 'Document type', type: 'select', required: true, options: DOC_TYPES },
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
      { name: 'source', label: 'Source', type: 'select', required: true, options: REFERRAL_SOURCES },
      { name: 'label', label: 'Label', type: 'text' },
    ],
  },

  permissions: {
    title: 'Permissions',
    breadcrumb: 'Admin › Masters & Controls',
    subtitle: 'Controls what residents vs service providers are allowed to do in the app (e.g. create events/posts). Stored centrally here; enforcement in the mobile app is a separate step.',
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
      { name: 'action', label: 'Action', type: 'select', required: true, options: PERMISSION_ACTIONS },
      { name: 'isAllowed', label: 'Allowed', type: 'checkbox' },
    ],
  },
};
