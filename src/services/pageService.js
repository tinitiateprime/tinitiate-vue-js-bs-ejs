const BASE_COMPONENTS = [
  'about',
  'services',
  'catalog',
  'comparison',
  'calendar',
  'dashboard',
  'contact',
  'login',
  'signup',
  'cart'
];

const ROUTE_ALIASES = {
  home: ['services', 'about', 'catalog', 'comparison', 'calendar', 'dashboard', 'contact'],
  pricing: ['comparison'],
  products: ['catalog'],
  shop: ['catalog', 'cart'],
  events: ['calendar'],
  signin: ['login'],
  register: ['signup']
};

function titleFromKey(key) {
  return String(key || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSectionTitle(site, key) {
  const section = site[key];
  if (section && (section.title || section.label || section.name)) {
    return section.title || section.label || section.name;
  }

  if (key === 'dashboard') {
    return `${site.navbar?.brand || site.footer?.brand || 'Site'} Dashboard`;
  }

  if (key === 'cart') {
    return `${site.catalog?.title || titleFromKey('catalog')} Cart`;
  }

  return titleFromKey(key);
}

function buildComponentCatalog(site = {}) {
  return BASE_COMPONENTS.map((key) => ({
    key,
    label: getSectionTitle(site, key),
    available: Boolean(site[key]) || ['dashboard', 'login', 'signup', 'cart'].includes(key)
  })).filter((component) => component.available);
}

function buildPageTree(site = {}) {
  const links = Array.isArray(site.navbar?.links) ? site.navbar.links : [];
  return links.map((link, index) => ({
    id: `nav-${index}`,
    title: link.name || titleFromKey(link.path || `page-${index + 1}`),
    path: link.path || '/',
    children: []
  }));
}

function buildDashboard(site = {}) {
  const comparisonPlans = Array.isArray(site.comparison?.plans) ? site.comparison.plans.length : 0;
  const footerGroups = Array.isArray(site.footer?.links) ? site.footer.links.length : 0;

  return {
    metrics: [
      { key: 'navbar.links', value: site.navbar?.links?.length || 0 },
      { key: 'services.items', value: site.services?.items?.length || 0 },
      { key: 'catalog.items', value: site.catalog?.items?.length || 0 },
      { key: 'comparison.plans', value: comparisonPlans },
      { key: 'calendar.events', value: site.calendar?.events?.length || 0 },
      { key: 'footer.groups', value: footerGroups }
    ],
    recent: [
      ...(site.services?.items || []).slice(0, 3).map((item) => ({
        label: site.services?.title,
        title: item.title,
        detail: item.id || item.icon
      })),
      ...(site.catalog?.items || []).slice(0, 3).map((item) => ({
        label: site.catalog?.title,
        title: item.name,
        detail: item.badge || item.billing
      }))
    ].filter((item) => item.title)
  };
}

function normalizeSlug(pathname = '/') {
  const clean = pathname.split('?')[0].replace(/^\/+|\/+$/g, '');
  return clean ? clean.split('/')[0].toLowerCase() : 'home';
}

function resolvePage(pathname, site = {}) {
  const slug = normalizeSlug(pathname);
  const requestedSections = ROUTE_ALIASES[slug] || [slug];
  const catalog = buildComponentCatalog(site);
  const validKeys = new Set(catalog.map((component) => component.key));
  const sections = requestedSections.filter((section) => validKeys.has(section));
  const initialSections = sections.length ? sections : ['dashboard'].filter((section) => validKeys.has(section));
  const firstSection = initialSections[0] || 'dashboard';
  const notFound = !sections.length && slug !== 'home';

  return {
    currentPath: pathname,
    initialSections,
    pageTitle: getSectionTitle(site, firstSection),
    notFound
  };
}

module.exports = {
  buildComponentCatalog,
  buildDashboard,
  buildPageTree,
  resolvePage,
  titleFromKey
};
