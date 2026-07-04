import { registerModule } from '@/shared/lib/module-registry';
import { useI18n } from '@/i18n';
import { usePageNick } from '@/shared/store/site-config';

registerModule({
  id: 'webpages',
  routes: [
    { path: '/webpages/:nick/new',       component: () => import('./views/WebpageEditorView') },
    { path: '/webpages/:nick/edit/:iid', component: () => import('./views/WebpageEditorView') },
    { path: '/webpages',                 component: () => import('./views/WebpagesView') },
    { path: '/webpages/:nick',           component: () => import('./views/WebpagesView') },
    { path: '/page/:nick/*path',         component: () => import('./views/PageView') },
  ],
  navItem: {
    label: () => useI18n().t('nav.webpages'),
    icon: 'webpages',
    path: '/webpages',
    href: () => `/webpages/${usePageNick()()}`,
    context: 'all',
  },
  permissions: [],
  appName: "Webpages",
});
