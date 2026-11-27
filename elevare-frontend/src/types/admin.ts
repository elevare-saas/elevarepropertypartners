/* mirror the backend's JSON (../backend/src/routes) */
import type {Listing, Mode, PropType} from '@/concierge/data';

/* dashboard pages a role can grant (backend/src/lib/roles.ts → PAGES); Account management is always open */
export type PageKey = 'properties' | 'employees' | 'settings';

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
  /* full description ('' when none) */
  description: string;
  /* private reference code, e.g. ELV-001: dashboard only, never on the website */
  refCode: string | null;
  photos: string[];
  /* waiting for review (e.g. written by AI): never on the website until published */
  draft: boolean;
  ai: ListingAi | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

/* kept with an AI-written draft: the staff notes it started from and the fields a person must check */
export interface ListingAi {
  notes: string;
  check: string[];
  model?: string;
  generatedAt?: string;
}

/* payload for creating or saving a listing */
export interface ListingInput {
  mode: Mode;
  name: string;
  area: string;
  type: PropType;
  beds: number;
  baths: number | null;
  sqm: number | null;
  living: number | null;
  land: number | null;
  refCode: string;
  price: number;
  own?: string | null;
  rent?: number | null;
  am: string[];
  ex: string[];
  line: string;
  description: string;
  /* cover first, up to 20 */
  photos: string[];
  hue: number;
  status: ListingStatus;
}

/* live: on the website · draft: work in progress or waiting for review · hidden: finished, not shown */
export type ListingStatus = 'live' | 'draft' | 'hidden';
export const statusOf = (l: Pick<AdminListing, 'published' | 'draft'>): ListingStatus =>
  l.published ? 'live' : l.draft ? 'draft' : 'hidden';

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

/* one property for Properties → Add with AI: the facts staff give; the AI writes the rest */
export interface AiDraftInput {
  /* left out → the AI reads it from the notes (the price must be written there) */
  mode?: Mode;
  type?: PropType;
  area?: string;
  price?: number;
  notes: string;
  /* '' → the next ELV-### code */
  refCode: string;
  /* uploaded photo URLs, cover first (the server loads the first few for the AI) */
  photos: string[];
}
