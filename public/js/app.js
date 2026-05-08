(function () {
  const payload = window.SiteTemplatePayload || {};
  const storageKey = 'github-ejs-template-cart';
  const themeKey = 'github-ejs-template-theme';
  const selectedTemplateKey = 'github-ejs-template-selected';
  const templateStatesKey = 'github-ejs-template-session-states';

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveCart(cart) {
    localStorage.setItem(storageKey, JSON.stringify(cart));
  }

  function loadTemplateStates() {
    try {
      return JSON.parse(sessionStorage.getItem(templateStatesKey) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveTemplateStates(states) {
    sessionStorage.setItem(templateStatesKey, JSON.stringify(states));
  }

  function clone(value) {
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(value);
      } catch (error) {
        // Vue reactive proxies cannot always be structured-cloned in browsers.
      }
    }

    return JSON.parse(JSON.stringify(value));
  }

  function titleFromKey(key) {
    return String(key || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function slugify(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'page';
  }

  function walkPages(pages, visitor, depth = 0) {
    pages.forEach((page) => {
      visitor(page, depth);
      walkPages(page.children || [], visitor, depth + 1);
      walkPages(page.subpages || [], visitor, depth + 1);
    });
  }

  function findPage(pages, id) {
    let found = null;
    walkPages(pages, (page) => {
      if (page.id === id) {
        found = page;
      }
    });
    return found;
  }

  function buildRootPage(site, template) {
    return {
      id: 'home',
      title: 'Home',
      path: '/home',
      layoutTemplate: template,
      children: [],
      subpages: []
    };
  }

  function normalizePageCollections(page) {
    page.children = Array.isArray(page.children) ? page.children.map(normalizePageCollections) : [];
    page.subpages = Array.isArray(page.subpages)
      ? page.subpages.map((subpage) => {
        const normalized = normalizePageCollections(subpage);
        normalized.type = 'subpage';
        return normalized;
      })
      : [];
    return page;
  }

  function normalizeRootPage(site, template, page) {
    const root = page ? clone(page) : buildRootPage(site, template);
    root.id = 'home';
    root.title = 'Home';
    root.path = '/home';
    root.layoutTemplate = template;
    normalizePageCollections(root);
    return root;
  }

  function makeTemplateState(page) {
    return JSON.parse(JSON.stringify(page));
  }

  function removePageById(pages, id) {
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      if (page.id === id) {
        pages.splice(index, 1);
        return true;
      }

      if (removePageById(page.children || [], id)) {
        return true;
      }

      if (removePageById(page.subpages || [], id)) {
        return true;
      }
    }

    return false;
  }

  function countPages(page) {
    let count = (page.children?.length || 0) + (page.subpages?.length || 0);
    (page.children || []).forEach((child) => {
      count += countPages(child);
    });
    (page.subpages || []).forEach((subpage) => {
      count += countPages(subpage);
    });
    return count;
  }

  function formEndpoint(type) {
    return {
      contact: '/api/forms/contact',
      login: '/api/auth/login',
      signup: '/api/auth/signup'
    }[type];
  }

  if (!window.Vue) {
    document.querySelectorAll('[v-cloak]').forEach((node) => node.removeAttribute('v-cloak'));
    return;
  }

  const { createApp } = window.Vue;
  const site = payload.site || {};
  const layoutTemplates = [
    {
      key: 'engine-blank',
      label: 'Template Engine 1',
      className: 'engine-clean',
      description: 'Clean single-column page with wide content sections.'
    },
    {
      key: 'engine-stack',
      label: 'Template Engine 2',
      className: 'engine-stack',
      description: 'Stacked editorial flow with large section spacing.'
    },
    {
      key: 'engine-grid',
      label: 'Template Engine 3',
      className: 'engine-grid',
      description: 'Grid layout for selected content cards.'
    },
    {
      key: 'engine-sidebar',
      label: 'Template Engine 4',
      className: 'engine-sidebar',
      description: 'Sidebar layout with nested page structure.'
    },
    {
      key: 'engine-commerce',
      label: 'Template Engine 5',
      className: 'engine-commerce',
      description: 'Commerce-style layout for product-heavy pages.'
    }
  ];

  const app = createApp({
    data() {
      const componentCatalog = payload.componentCatalog || [];
      const savedTemplate = sessionStorage.getItem(selectedTemplateKey);
      const savedTemplateIsValid = layoutTemplates.some((layout) => layout.key === savedTemplate);
      const initialTemplate = savedTemplateIsValid ? savedTemplate : layoutTemplates[0].key;
      const templateStates = loadTemplateStates();

      return {
        site,
        dashboard: payload.dashboard || { metrics: [], recent: [] },
        componentCatalog,
        layoutTemplates,
        templateStates,
        templateSelected: savedTemplateIsValid,
        previewMode: false,
        layoutTemplate: initialTemplate,
        rootPage: normalizeRootPage(site, initialTemplate, templateStates[initialTemplate]),
        activePageId: 'home',
        activeWorkspaceId: 'home',
        activePreviewPageId: 'home',
        newSubpageName: '',
        dataPanelOpen: false,
        dataPanelParentId: '',
        templateMenuOpen: false,
        previewSubpageMenuOpen: false,
        cart: loadCart(),
        cartOpen: false,
        theme: localStorage.getItem(themeKey) || document.documentElement.dataset.theme || 'light'
      };
    },
    computed: {
      cartCount() {
        return Object.values(this.cart).reduce((sum, quantity) => sum + Number(quantity || 0), 0);
      },
      cartItems() {
        const products = this.site.catalog?.items || [];
        return Object.entries(this.cart)
          .map(([id, quantity]) => {
            const product = products.find((item) => String(item.id) === String(id));
            if (!product) {
              return null;
            }
            return {
              ...product,
              quantity: Number(quantity || 0),
              price: Number(product.price || 0)
            };
          })
          .filter((item) => item && item.quantity > 0);
      },
      cartTotal() {
        const total = this.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return Number.isInteger(total) ? total : total.toFixed(2);
      },
      cartCurrency() {
        return this.cartItems[0]?.currency || this.site.catalog?.items?.[0]?.currency || '';
      },
      homeTitle() {
        return this.site.header?.title || this.site.navbar?.brand || 'Home';
      },
      dataCards() {
        return this.componentCatalog.filter((component) => Boolean(this.site[component.key]));
      },
      selectedTemplateLabel() {
        const template = this.layoutTemplates.find((layout) => layout.key === this.layoutTemplate);
        return template?.label || titleFromKey(this.layoutTemplate);
      },
      selectedLayoutClass() {
        const template = this.layoutTemplates.find((layout) => layout.key === this.layoutTemplate);
        return template?.className || 'engine-clean';
      },
      subpages() {
        return this.rootPage.subpages || [];
      },
      activePage() {
        return findPage([this.rootPage], this.activePageId) || this.rootPage;
      },
      activeWorkspacePage() {
        return findPage([this.rootPage], this.activeWorkspaceId) || this.rootPage;
      },
      activeWorkspaceKind() {
        return this.activeWorkspacePage.id === this.rootPage.id ? 'Home' : 'Subpage';
      },
      dataPanelParent() {
        return findPage([this.rootPage], this.dataPanelParentId) || this.rootPage;
      },
      activePreviewPage() {
        return findPage([this.rootPage], this.activePreviewPageId) || this.rootPage;
      },
      activePreviewTitle() {
        return this.activePreviewPage.id === this.rootPage.id ? this.homeTitle : this.activePreviewPage.title;
      },
      activePreviewSections() {
        return this.activePreviewPage.children || [];
      },
      selectedCount() {
        return countPages(this.rootPage);
      },
      themeLabel() {
        return this.theme === 'dark' ? 'Use light theme' : 'Use dark theme';
      }
    },
    watch: {
      cart: {
        deep: true,
        handler(value) {
          saveCart(value);
          this.refreshCartBadges();
        }
      },
      rootPage: {
        deep: true,
        handler() {
          this.saveCurrentTemplateState();
        }
      },
      theme(value) {
        document.documentElement.dataset.theme = value;
        localStorage.setItem(themeKey, value);
      }
    },
    mounted() {
      document.documentElement.dataset.theme = this.theme;
      this.updateVisualMode();
      document.addEventListener('click', this.handleDocumentClick);
      document.addEventListener('submit', this.handleDocumentSubmit);
      window.addEventListener('beforeunload', this.saveCurrentTemplateState);
      this.refreshCartBadges();
    },
    methods: {
      saveCurrentTemplateState() {
        if (!this.templateSelected || !this.layoutTemplate) {
          return;
        }

        this.templateStates[this.layoutTemplate] = makeTemplateState(this.rootPage);
        saveTemplateStates(this.templateStates);
        sessionStorage.setItem(selectedTemplateKey, this.layoutTemplate);
      },
      toggleTemplateMenu() {
        this.templateMenuOpen = !this.templateMenuOpen;
      },
      selectTemplate(key) {
        if (!key) {
          return;
        }

        if (this.templateSelected && this.layoutTemplate) {
          this.saveCurrentTemplateState();
        }

        const savedState = this.templateStates[key];
        this.layoutTemplate = key;
        this.rootPage = normalizeRootPage(this.site, key, savedState);
        this.activePageId = this.rootPage.id;
        this.activeWorkspaceId = this.rootPage.id;
        this.activePreviewPageId = this.rootPage.id;
        this.templateSelected = true;
        this.previewMode = false;
        this.dataPanelOpen = false;
        this.dataPanelParentId = this.rootPage.id;
        this.templateMenuOpen = false;
        this.previewSubpageMenuOpen = false;
        sessionStorage.setItem(selectedTemplateKey, key);
        this.saveCurrentTemplateState();
        this.updateVisualMode();

        if (window.location.pathname !== '/home') {
          window.history.pushState({}, '', '/home');
        }
      },
      resetTemplateSelection() {
        this.templateSelected = false;
        this.previewMode = false;
        this.dataPanelOpen = false;
        this.templateMenuOpen = false;
        this.previewSubpageMenuOpen = false;
        sessionStorage.removeItem(selectedTemplateKey);
        this.updateVisualMode();

        if (window.location.pathname !== '/') {
          window.history.pushState({}, '', '/');
        }
      },
      templateSummary(key) {
        const section = this.site[key] || {};
        if (section.subtitle) {
          return section.subtitle;
        }
        if (section.description) {
          return section.description;
        }
        if (Array.isArray(section.items)) {
          return `${section.items.length} items from data.json`;
        }
        if (key === 'dashboard') {
          return 'Runtime content overview';
        }
        if (key === 'login' || key === 'signup') {
          return `${titleFromKey(key)} form`;
        }
        if (key === 'cart') {
          return 'Shopping cart from catalog data';
        }
        return 'Reusable EJS/Vue template';
      },
      workspaceForPage(id) {
        if (!id || id === this.rootPage.id) {
          return this.rootPage.id;
        }

        const subpage = this.subpages.find((page) => findPage([page], id));
        return subpage?.id || this.rootPage.id;
      },
      selectPage(id) {
        if (findPage([this.rootPage], id)) {
          this.activePageId = id;
          this.activeWorkspaceId = this.workspaceForPage(id);
        }
      },
      selectHomeWorkspace() {
        this.activeWorkspaceId = this.rootPage.id;
        this.activePageId = this.rootPage.id;
      },
      uniqueSubpagePath(title) {
        const basePath = `${this.rootPage.path.replace(/\/$/, '')}/${slugify(title)}`;
        const existingPaths = new Set(this.subpages.map((page) => page.path));
        let path = basePath;
        let suffix = 2;

        while (existingPaths.has(path)) {
          path = `${basePath}-${suffix}`;
          suffix += 1;
        }

        return path;
      },
      addSubpage() {
        const fallbackTitle = `Subpage ${this.subpages.length + 1}`;
        const title = this.newSubpageName.trim() || fallbackTitle;
        const subpage = {
          id: `subpage-${Date.now()}`,
          type: 'subpage',
          title,
          path: this.uniqueSubpagePath(title),
          children: []
        };

        this.rootPage.subpages = this.rootPage.subpages || [];
        this.rootPage.subpages.push(subpage);
        this.newSubpageName = '';
        this.openDataPanel(subpage.id);
        this.saveCurrentTemplateState();
      },
      editSubpage(id) {
        if (!findPage(this.subpages, id)) {
          return;
        }

        this.openDataPanel(id);
      },
      removeSubpage(id) {
        if (removePageById(this.rootPage.subpages || [], id)) {
          if (!findPage([this.rootPage], this.activeWorkspaceId)) {
            this.activeWorkspaceId = this.rootPage.id;
          }
          if (!findPage([this.rootPage], this.activePageId)) {
            this.activePageId = this.activeWorkspaceId;
          }
          if (!findPage([this.rootPage], this.dataPanelParentId)) {
            this.dataPanelParentId = this.activeWorkspaceId;
          }
          if (!findPage([this.rootPage], this.activePreviewPageId)) {
            this.activePreviewPageId = this.rootPage.id;
          }
          this.saveCurrentTemplateState();
        }
      },
      openDataPanel(parentId) {
        this.dataPanelParentId = parentId || this.rootPage.id;
        this.activePageId = this.dataPanelParentId;
        this.activeWorkspaceId = this.workspaceForPage(this.dataPanelParentId);
        this.dataPanelOpen = true;
      },
      closeDataPanel() {
        this.dataPanelOpen = false;
      },
      parentHasTemplate(key) {
        return Boolean((this.dataPanelParent?.children || []).find((page) => page.template === key));
      },
      addDataCard(key) {
        const parent = findPage([this.rootPage], this.dataPanelParentId);
        const component = this.componentCatalog.find((item) => item.key === key);
        if (!parent || !component) {
          return;
        }

        parent.children = parent.children || [];
        const siblingCount = parent.children.filter((child) => child.template === key).length;
        const title = siblingCount ? `${component.label} ${siblingCount + 1}` : component.label;
        const parentPath = parent.path || this.rootPage.path;
        const page = {
          id: `${key}-${Date.now()}`,
          title,
          path: `${parentPath.replace(/\/$/, '')}/${slugify(title)}`,
          template: key,
          children: []
        };

        parent.children.push(page);
        this.activePageId = page.id;
        this.activeWorkspaceId = this.workspaceForPage(parent.id);
        this.saveCurrentTemplateState();
      },
      removePage(id) {
        if (id === this.rootPage.id) {
          return;
        }

        removePageById(this.rootPage.children || [], id);
        removePageById(this.rootPage.subpages || [], id);
        if (!findPage([this.rootPage], this.activeWorkspaceId)) {
          this.activeWorkspaceId = this.rootPage.id;
        }
        if (!findPage([this.rootPage], this.activePageId)) {
          this.activePageId = this.activeWorkspaceId;
        }
        if (!findPage([this.rootPage], this.dataPanelParentId)) {
          this.dataPanelParentId = this.activeWorkspaceId;
        }
        if (!findPage([this.rootPage], this.activePreviewPageId)) {
          this.activePreviewPageId = this.rootPage.id;
        }
        this.saveCurrentTemplateState();
      },
      startPreview() {
        if (!this.selectedCount) {
          return;
        }

        this.saveCurrentTemplateState();
        this.previewMode = true;
        this.dataPanelOpen = false;
        this.templateMenuOpen = false;
        this.previewSubpageMenuOpen = false;
        this.activePreviewPageId = this.rootPage.children.length || !this.subpages.length ? this.rootPage.id : this.subpages[0].id;
        this.updateVisualMode();

        if (window.location.pathname !== '/preview') {
          window.history.pushState({}, '', '/preview');
        }
      },
      backToEdit() {
        this.previewMode = false;
        this.previewSubpageMenuOpen = false;
        this.updateVisualMode();

        if (window.location.pathname !== '/home') {
          window.history.pushState({}, '', '/home');
        }
      },
      updateVisualMode() {
        document.body.classList.toggle('preview-mode', this.previewMode);
        document.body.classList.toggle('builder-mode', !this.previewMode);
      },
      toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
      },
      togglePreviewSubpageMenu() {
        this.previewSubpageMenuOpen = !this.previewSubpageMenuOpen;
      },
      selectPreviewPage(id) {
        const page = findPage([this.rootPage], id);
        if (!page || (page.id !== this.rootPage.id && page.type !== 'subpage')) {
          return;
        }

        this.activePreviewPageId = page.id;
        this.previewSubpageMenuOpen = false;
      },
      addToCart(productOrId) {
        const id = typeof productOrId === 'object' ? productOrId.id : productOrId;
        if (id === undefined || id === null) {
          return;
        }

        const key = String(id);
        this.cart[key] = Number(this.cart[key] || 0) + 1;
        this.cartOpen = true;
      },
      incrementCart(id) {
        const key = String(id);
        this.cart[key] = Number(this.cart[key] || 0) + 1;
      },
      decrementCart(id) {
        const key = String(id);
        const next = Number(this.cart[key] || 0) - 1;
        if (next <= 0) {
          delete this.cart[key];
          return;
        }
        this.cart[key] = next;
      },
      refreshCartBadges() {
        document.querySelectorAll('.js-cart-count').forEach((node) => {
          node.textContent = String(this.cartCount);
        });
      },
      handleDocumentClick(event) {
        const cartOpener = event.target.closest('.js-open-cart');
        if (cartOpener) {
          this.cartOpen = true;
          return;
        }

        const addButton = event.target.closest('[data-cart-action="add"]');
        if (addButton) {
          this.addToCart(addButton.dataset.productId);
        }
      },
      async handleDocumentSubmit(event) {
        const form = event.target.closest('.js-api-form');
        if (!form) {
          return;
        }

        const endpoint = formEndpoint(form.dataset.apiForm);
        if (!endpoint) {
          return;
        }

        event.preventDefault();
        const status = form.querySelector('.js-form-status');
        if (status) {
          status.textContent = 'Sending...';
        }

        try {
          const body = Object.fromEntries(new FormData(form).entries());
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          });
          const result = await response.json();

          if (!response.ok || !result.ok) {
            throw new Error(result.message || 'Request failed');
          }

          form.reset();
          if (status) {
            status.textContent = `${titleFromKey(form.dataset.apiForm)} received.`;
          }
        } catch (error) {
          if (status) {
            status.textContent = error.message;
          }
        }
      }
    }
  });

  app.component('page-node', {
    name: 'page-node',
    props: {
      page: { type: Object, required: true },
      depth: { type: Number, default: 0 },
      activeId: { type: String, default: '' }
    },
    emits: ['select-page', 'open-panel', 'remove-page'],
    template: `
      <div class="page-node" :style="{ paddingLeft: (depth * 14) + 'px' }">
        <div class="page-node-row" :class="{ 'is-active': activeId === page.id }">
          <button class="page-select" type="button" @click="$emit('select-page', page.id)">
            <span>{{ page.title }}</span>
            <small>{{ page.template || 'home' }}</small>
          </button>
          <button type="button" @click="$emit('open-panel', page.id)" aria-label="Add nested card">+</button>
          <button type="button" @click="$emit('remove-page', page.id)" aria-label="Remove selected card">×</button>
        </div>
        <page-node
          v-for="child in page.children"
          :key="child.id"
          :page="child"
          :depth="depth + 1"
          :active-id="activeId"
          @select-page="$emit('select-page', $event)"
          @open-panel="$emit('open-panel', $event)"
          @remove-page="$emit('remove-page', $event)"
        ></page-node>
      </div>
    `
  });

  app.component('page-preview', {
    props: {
      page: { type: Object, required: true },
      site: { type: Object, required: true },
      dashboard: { type: Object, required: true }
    },
    emits: ['add-to-cart'],
    template: `
      <section class="preview-page">
        <dynamic-section
          :entry="{ id: page.id, key: page.template }"
          :site="site"
          :dashboard="dashboard"
          @add-to-cart="$emit('add-to-cart', $event)"
        ></dynamic-section>
        <div class="preview-subpages" v-if="page.children?.length">
          <page-preview
            v-for="child in page.children"
            :key="child.id"
            :page="child"
            :site="site"
            :dashboard="dashboard"
            @add-to-cart="$emit('add-to-cart', $event)"
          ></page-preview>
        </div>
      </section>
    `
  });

  app.component('dynamic-section', {
    props: {
      entry: { type: Object, required: true },
      site: { type: Object, required: true },
      dashboard: { type: Object, required: true },
      removable: { type: Boolean, default: false }
    },
    emits: ['remove', 'add-to-cart'],
    computed: {
      componentName() {
        return {
          about: 'section-about',
          services: 'section-services',
          catalog: 'section-catalog',
          comparison: 'section-comparison',
          calendar: 'section-calendar',
          dashboard: 'section-dashboard',
          contact: 'section-contact',
          login: 'section-login',
          signup: 'section-signup',
          cart: 'section-cart'
        }[this.entry.key] || 'section-fallback';
      },
      sectionData() {
        return this.site[this.entry.key] || {};
      }
    },
    template: `
      <div class="dynamic-section-shell">
        <div class="dynamic-section-head" v-if="removable">
          <button class="button secondary icon-only" type="button" @click="$emit('remove', entry.id)" aria-label="Remove section">×</button>
        </div>
        <component
          :is="componentName"
          :section="sectionData"
          :site="site"
          :dashboard="dashboard"
          @add-to-cart="$emit('add-to-cart', $event)"
        ></component>
      </div>
    `
  });

  app.component('section-about', {
    props: ['section'],
    template: `
      <section class="content-section">
        <p class="eyebrow" v-if="section.label">{{ section.label }}</p>
        <div class="section-heading">
          <h2>{{ section.title }}</h2>
          <p v-if="section.description">{{ section.description }}</p>
        </div>
        <p class="callout" v-if="section.mission">{{ section.mission }}</p>
        <div class="card-grid three" v-if="section.values?.length">
          <article class="feature-card" v-for="value in section.values" :key="value.title">
            <span class="icon-token">{{ value.icon || '+' }}</span>
            <h3>{{ value.title }}</h3>
            <p>{{ value.description }}</p>
          </article>
        </div>
      </section>
    `
  });

  app.component('section-services', {
    props: ['section'],
    template: `
      <section class="content-section">
        <p class="eyebrow" v-if="section.label">{{ section.label }}</p>
        <div class="section-heading">
          <h2>{{ section.title }}</h2>
          <p v-if="section.subtitle">{{ section.subtitle }}</p>
        </div>
        <div class="card-grid three">
          <article class="feature-card" v-for="item in section.items || []" :key="item.id || item.title">
            <span class="icon-token">{{ item.icon || item.id || '+' }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
            <div class="tag-row" v-if="item.tags?.length">
              <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
            </div>
          </article>
        </div>
      </section>
    `
  });

  app.component('section-catalog', {
    props: ['section'],
    emits: ['add-to-cart'],
    template: `
      <section class="content-section">
        <p class="eyebrow" v-if="section.label">{{ section.label }}</p>
        <div class="section-heading">
          <h2>{{ section.title }}</h2>
          <p v-if="section.subtitle">{{ section.subtitle }}</p>
        </div>
        <div class="card-grid two">
          <article class="product-card" v-for="item in section.items || []" :key="item.id">
            <div class="product-head">
              <div>
                <span class="badge" v-if="item.badge">{{ item.badge }}</span>
                <h3>{{ item.name }}</h3>
              </div>
              <strong>{{ item.currency }}{{ item.price }}</strong>
            </div>
            <p>{{ item.description }}</p>
            <div class="tag-row" v-if="item.tags?.length">
              <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
            </div>
            <button class="button primary" type="button" @click="$emit('add-to-cart', item)">
              <span class="button-symbol">+</span>
              <span>Add to cart</span>
            </button>
          </article>
        </div>
      </section>
    `
  });

  app.component('section-comparison', {
    props: ['section'],
    template: `
      <section class="content-section">
        <p class="eyebrow" v-if="section.label">{{ section.label }}</p>
        <div class="section-heading">
          <h2>{{ section.title }}</h2>
          <p v-if="section.subtitle">{{ section.subtitle }}</p>
        </div>
        <div class="table-wrap">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th v-for="plan in section.plans || []" :key="plan" :class="{ recommended: section.recommended === plan }">{{ plan }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="feature in section.features || []" :key="feature.name">
                <th>{{ feature.name }}</th>
                <td v-for="value in feature.values" :key="value">{{ value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    `
  });

  app.component('section-calendar', {
    props: ['section'],
    template: `
      <section class="content-section">
        <p class="eyebrow" v-if="section.label">{{ section.label }}</p>
        <div class="section-heading">
          <h2>{{ section.title }}</h2>
          <p v-if="section.subtitle">{{ section.subtitle }}</p>
        </div>
        <div class="timeline">
          <article class="timeline-item" v-for="event in section.events || []" :key="event.id">
            <time :datetime="event.date">{{ event.date }} · {{ event.time }} {{ event.timezone }}</time>
            <h3>{{ event.title }}</h3>
            <p>{{ event.description }}</p>
            <span>{{ event.location }}</span>
          </article>
        </div>
      </section>
    `
  });

  app.component('section-dashboard', {
    props: ['dashboard'],
    template: `
      <section class="content-section">
        <p class="eyebrow">Runtime dashboard</p>
        <div class="section-heading">
          <h2>GitHub content overview</h2>
          <p>Counts and recent entries are derived from the fetched JSON payload.</p>
        </div>
        <div class="metric-grid">
          <article class="metric-card" v-for="metric in dashboard.metrics || []" :key="metric.key">
            <strong>{{ metric.value }}</strong>
            <span>{{ metric.key }}</span>
          </article>
        </div>
        <div class="activity-list" v-if="dashboard.recent?.length">
          <article v-for="item in dashboard.recent" :key="item.title">
            <span>{{ item.label }}</span>
            <strong>{{ item.title }}</strong>
            <em v-if="item.detail">{{ item.detail }}</em>
          </article>
        </div>
      </section>
    `
  });

  app.component('section-contact', {
    props: ['section'],
    template: `
      <section class="content-section contact-section">
        <p class="eyebrow" v-if="section.label">{{ section.label }}</p>
        <div class="section-heading">
          <h2>{{ section.title }}</h2>
          <p v-if="section.subtitle">{{ section.subtitle }}</p>
        </div>
        <div class="contact-grid">
          <div class="contact-details">
            <a v-if="section.email" :href="'mailto:' + section.email">{{ section.email }}</a>
            <a v-if="section.phone" :href="'tel:' + section.phone">{{ section.phone }}</a>
            <p v-if="section.address">{{ section.address }}</p>
          </div>
          <form class="form-grid js-api-form" data-api-form="contact">
            <label v-for="field in section.form?.fields || []" :key="field.name" :class="{ 'full-span': field.type === 'textarea' }">
              <span>{{ field.label }}</span>
              <textarea v-if="field.type === 'textarea'" :name="field.name" :required="field.required"></textarea>
              <select v-else-if="field.type === 'select'" :name="field.name" :required="field.required">
                <option v-for="option in field.options || []" :key="option" :value="option">{{ option }}</option>
              </select>
              <input v-else :type="field.type" :name="field.name" :required="field.required">
            </label>
            <button class="button primary" type="submit">{{ section.form?.submit || 'Submit' }}</button>
            <p class="form-status js-form-status" aria-live="polite"></p>
          </form>
        </div>
      </section>
    `
  });

  app.component('section-login', {
    props: ['site'],
    template: `
      <section class="content-section auth-section">
        <p class="eyebrow">{{ site.navbar?.brand || 'Account' }}</p>
        <div class="section-heading"><h2>Login</h2></div>
        <form class="auth-form js-api-form" data-api-form="login">
          <label><span>Email</span><input type="email" name="email" autocomplete="email" required></label>
          <label><span>Password</span><input type="password" name="password" autocomplete="current-password" required></label>
          <button class="button primary" type="submit">Login</button>
          <p class="form-status js-form-status" aria-live="polite"></p>
        </form>
      </section>
    `
  });

  app.component('section-signup', {
    props: ['site'],
    template: `
      <section class="content-section auth-section">
        <p class="eyebrow">{{ site.navbar?.brand || 'Account' }}</p>
        <div class="section-heading"><h2>Signup</h2></div>
        <form class="auth-form js-api-form" data-api-form="signup">
          <label><span>Name</span><input type="text" name="name" autocomplete="name" required></label>
          <label><span>Email</span><input type="email" name="email" autocomplete="email" required></label>
          <label><span>Password</span><input type="password" name="password" autocomplete="new-password" required></label>
          <button class="button primary" type="submit">Signup</button>
          <p class="form-status js-form-status" aria-live="polite"></p>
        </form>
      </section>
    `
  });

  app.component('section-cart', {
    props: ['site'],
    emits: ['add-to-cart'],
    template: `
      <section class="content-section">
        <p class="eyebrow">{{ site.catalog?.label }}</p>
        <div class="section-heading">
          <h2>{{ site.catalog?.title }}</h2>
          <p v-if="site.catalog?.subtitle">{{ site.catalog.subtitle }}</p>
        </div>
        <div class="cart-product-list">
          <article class="cart-product" v-for="item in site.catalog?.items || []" :key="item.id">
            <div>
              <strong>{{ item.name }}</strong>
              <span>{{ item.currency }}{{ item.price }} {{ item.billing }}</span>
            </div>
            <button class="button primary" type="button" @click="$emit('add-to-cart', item)">
              <span class="button-symbol">+</span>
              <span>Add</span>
            </button>
          </article>
        </div>
      </section>
    `
  });

  app.component('section-fallback', {
    props: ['section'],
    template: `
      <section class="content-section">
        <div class="section-heading">
          <h2>{{ section.title || section.label || 'Section' }}</h2>
        </div>
      </section>
    `
  });

  app.mount('#builder-app');
})();
