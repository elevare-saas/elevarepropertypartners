import {createContext} from 'react';

export interface RouterLocation {
  pathname: string;
  search: string;
}
export interface NavigateOptions {
  /* replace the history entry instead of pushing (redirects) */
  replace?: boolean;
}
export interface RouterValue {
  location: RouterLocation;
  navigate: (to: string, options?: NavigateOptions) => void;
}

export const RouterContext = createContext<RouterValue | null>(null);
