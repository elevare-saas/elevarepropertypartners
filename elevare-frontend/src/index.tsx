/* pages load on demand, so the public site never downloads admin code.
   Website settings (areas, market estimates, contact details) come from the database before anything renders. */
import ReactDOM from 'react-dom/client';
import {initAnalytics} from './lib/analytics';
import {idFromPath} from './lib/seo';
import {loadSettings} from './lib/siteSettings';
import {loadListings as loadListingsOnly} from './pages/home/loadListings';

/* listings and settings load side by side */
const loadListings = () => Promise.all([loadListingsOnly(), loadSettings()]);
import {adminPathFor} from './routes/paths';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

const url = location.hash.startsWith('#/') ? new URL(location.hash.slice(1), location.origin) : new URL(location.href);
const adminPath = adminPathFor(url.pathname);
const path = location.pathname.replace(/\/+$/, '') || '/';
const listingId = idFromPath(path);

if (adminPath) {
  if (adminPath + url.search !== location.pathname + location.search || location.hash)
    history.replaceState(null, '', adminPath + url.search);
  Promise.all([import('./routes/AdminRoutes'), loadSettings()]).then(([{default: AdminRoutes}]) =>
    root.render(<AdminRoutes />)
  );
} else {
  initAnalytics();
  if (path === '/properties' || path === '/properties/for-rent' || path === '/properties/for-sale')
    history.replaceState(null, '', '/' + location.hash);
  if (location.pathname === '/') {
    loadListings()
      .then(() => import('./pages/home/HomePage'))
      .then(({default: HomePage}) => root.render(<HomePage />));
  } else if (listingId) {
    loadListings().then(async () => {
      const {fetchAndOpenListing} = await import('./concierge/actions');
      const result = await fetchAndOpenListing(listingId);
      if (result === 'gone') {
        const {default: NotFoundPage} = await import('./pages/not-found/NotFoundPage');
        return root.render(<NotFoundPage property />);
      }
      if (result === 'offline') history.replaceState(null, '', '/');
      const {default: HomePage} = await import('./pages/home/HomePage');
      root.render(<HomePage />);
      if (result === 'offline') alert('We couldn’t load this home just now. Please try again in a moment.');
    });
  } else {
    Promise.all([import('./pages/not-found/NotFoundPage'), loadSettings()]).then(([{default: NotFoundPage}]) =>
      root.render(<NotFoundPage />)
    );
  }
}
