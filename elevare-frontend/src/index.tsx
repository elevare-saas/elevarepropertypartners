/* pages load on demand, so the public site never downloads admin code */
import ReactDOM from 'react-dom/client';
import {initAnalytics} from './lib/analytics';
import {idFromPath} from './lib/seo';
import {loadListings} from './pages/home/loadListings';
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
  import('./routes/AdminRoutes').then(({default: AdminRoutes}) => root.render(<AdminRoutes />));
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
    import('./pages/not-found/NotFoundPage').then(({default: NotFoundPage}) => root.render(<NotFoundPage />));
  }
}
