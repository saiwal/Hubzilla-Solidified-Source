import { registerModule } from '@/shared/lib/module-registry';
import { useI18n } from '@/i18n';
import { usePageNick } from '@/shared/store/site-config';
import { currentPageTemplateId } from './store';

registerModule({
  id: 'webpages',
  pageTemplate: () => currentPageTemplateId() ?? undefined,
  routes: [
    { path: '/webpages/:nick/new',       component: () => import('./views/WebpageEditorView') },
    { path: '/webpages/:nick/menus',     component: () => import('./views/MenusView') },
    { path: '/webpages/:nick/layouts',   component: () => import('./views/LayoutTemplatesView') },
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
