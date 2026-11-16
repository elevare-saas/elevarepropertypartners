/* mirror the backend's JSON (../backend/src/routes) */
import type {Listing, Mode, PropType} from '@/concierge/data';

export type Role = 'super_admin' | 'marketing_manager' | 'viewer';
export type Permission = 'listings.view' | 'listings.edit' | 'leads.view' | 'leads.edit' | 'users.manage';

/* never includes the password or its hash */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
  permissions: Permission[];
}

export interface AdminListing extends Listing {
  published: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

/* payload for creating or saving a listing */
export interface ListingInput {
  mode: Mode;
  name: string;
  area: string;
  type: PropType;
  beds: number;
  sqm: number;
  price: number;
  own?: string;
  rent?: number;
  am: string[];
  ex: string[];
  line: string;
  photo: string | null;
  hue: number;
  published: boolean;
}

export interface Credentials {
  email: string;
  password: string;
}
export interface NewTeamMember {
  email: string;
  name: string;
  role: Role;
  password: string;
}
export type TeamMemberChanges = Partial<{name: string; role: Role; active: boolean; password: string}>;
