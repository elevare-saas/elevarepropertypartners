/* mirror the backend's JSON (../backend/src/routes) */
import type {Listing, Mode, PropType} from '@/concierge/data';

/* dashboard pages a role can grant (backend/src/lib/roles.ts → PAGES); Account management is always open */
export type PageKey = 'properties' | 'employees';

export interface RoleRef {
  id: string;
  name: string;
  /* the built-in Super Admin role: every page, can't be edited or deleted */
  system: boolean;
  pages: PageKey[];
}

/* a role as the CEO manages it under Roles & access */
export interface Role extends RoleRef {
  description: string;
  members: number;
}
export interface PageInfo {
  key: PageKey;
  label: string;
  description: string;
}

/* never includes the password or its hash */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  active: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
  roles: RoleRef[];
  superAdmin: boolean;
  /* the pages this user may open */
  pages: PageKey[];
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
  roleIds: string[];
  password: string;
}
export type TeamMemberChanges = Partial<{name: string; roleIds: string[]; active: boolean; password: string}>;
export interface RoleInput {
  name: string;
  description: string;
  pages: PageKey[];
}
