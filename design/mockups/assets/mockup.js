(function () {
  const STORAGE_KEY = 'umetrica-mockup-theme';

  const NAV = [
    { key: 'home', href: 'home.html', icon: 'lucide:home', label: 'Главная' },
    { key: 'insights', href: 'insights.html', icon: 'lucide:sparkles', label: 'AI-инсайты' },
    { key: 'dashboards', href: 'dashboards-list.html', icon: 'lucide:layout-dashboard', label: 'Дашборды' },
    { key: 'semantic', href: 'semantic-list.html', icon: 'lucide:layers', label: 'Семантика' },
    { key: 'team', href: 'team.html', icon: 'lucide:users', label: 'Команда' },
    { key: 'settings', href: 'settings.html', icon: 'lucide:settings', label: 'Настройки' },
  ];

  const TAB_NAV = [
    { key: 'home', href: 'home.html', icon: 'lucide:home', label: 'Главная' },
    { key: 'insights', href: 'insights.html', icon: 'lucide:sparkles', label: 'Инсайты' },
    { key: 'dashboards', href: 'dashboards-list.html', icon: 'lucide:layout-dashboard', label: 'Дашборды' },
    { key: 'team', href: 'team.html', icon: 'lucide:users', label: 'Команда' },
  ];

  function loadIconify() {
    if (document.querySelector('script[data-iconify]')) return Promise.resolve();
    return new Promise(function (resolve) {
      var script = document.createElement('script');
      script.src = 'https://code.iconify.design/iconify-icon/2.3.0/iconify-icon.min.js';
      script.dataset.iconify = '1';
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });
  }

  function applyTheme(nextTheme) {
    theme = nextTheme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);

    document.querySelectorAll('[data-theme-label]').forEach(function (el) {
      el.textContent = theme === 'dark' ? 'Светлая' : 'Тёмная';
    });

    document.querySelectorAll('[data-theme-set]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-theme-set') === theme);
    });

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#191919' : '#ffffff');
    }
  }

  function initTheme() {
    var stored = localStorage.getItem(STORAGE_KEY);
    var initial =
      stored === 'dark' || stored === 'light'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    applyTheme(initial);
    return initial;
  }

  var theme = initTheme();

  document.addEventListener('click', function (event) {
    var themeBtn = event.target.closest('[data-theme-set]');
    if (themeBtn) {
      applyTheme(themeBtn.getAttribute('data-theme-set'));
      return;
    }

    var toggle = event.target.closest('[data-theme-toggle]');
    if (toggle) {
      applyTheme(theme === 'dark' ? 'light' : 'dark');
      return;
    }

    var dropdownToggle = event.target.closest('[data-dropdown-toggle]');
    if (dropdownToggle) {
      event.stopPropagation();
      var dropdown = dropdownToggle.closest('.dropdown');
      var willOpen = !dropdown.classList.contains('is-open');
      closeDropdowns();
      if (willOpen) {
        dropdown.classList.add('is-open');
        dropdownToggle.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    if (!event.target.closest('.dropdown')) {
      closeDropdowns();
    }
  });

  function closeDropdowns() {
    document.querySelectorAll('.dropdown.is-open').forEach(function (dropdown) {
      dropdown.classList.remove('is-open');
      var toggle = dropdown.querySelector('[data-dropdown-toggle]');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  }

  function renderSidebar(active) {
    var navItems = NAV.map(function (item) {
      return (
        '<a class="nav__item' +
        (item.key === active ? ' is-active' : '') +
        '" href="' +
        item.href +
        '">' +
        '<iconify-icon icon="' +
        item.icon +
        '" class="nav__icon"></iconify-icon>' +
        '<span class="nav__label">' +
        item.label +
        '</span></a>'
      );
    }).join('');

    return (
      '<aside class="sidebar">' +
      '<div class="sidebar__top">' +
      '<a href="home.html" class="sidebar-app-link">' +
      '<span class="brand__mark">u</span>' +
      '<span class="brand__name">umetrica</span>' +
      '</a>' +
      '<div class="dropdown dropdown--block">' +
      '<button type="button" class="workspace-switcher" data-dropdown-toggle aria-expanded="false" aria-haspopup="menu">' +
      '<span class="workspace-switcher__icon"><iconify-icon icon="lucide:building-2"></iconify-icon></span>' +
      '<span class="workspace-switcher__body">' +
      '<span class="workspace-switcher__name">Acme Analytics</span>' +
      '<span class="workspace-switcher__hint">Компания</span>' +
      '</span>' +
      '<iconify-icon icon="lucide:chevron-down" class="workspace-switcher__chev"></iconify-icon>' +
      '</button>' +
      '<div class="dropdown__menu" role="menu">' +
      '<button type="button" class="menu-item is-active" role="menuitem"><iconify-icon icon="lucide:building-2"></iconify-icon> Acme Analytics</button>' +
      '<button type="button" class="menu-item" role="menuitem"><iconify-icon icon="lucide:building-2"></iconify-icon> Beta Corp</button>' +
      '<div class="dropdown__divider"></div>' +
      '<button type="button" class="menu-item menu-item--muted" role="menuitem"><iconify-icon icon="lucide:plus"></iconify-icon> Новая компания</button>' +
      '</div></div>' +
      '</div>' +
      '<div class="sidebar__scroll">' +
      '<p class="sidebar__section-label">Навигация</p>' +
      '<nav class="nav">' +
      navItems +
      '</nav>' +
      '</div>' +
      '<div class="sidebar__footer">' +
      '<div class="sidebar-user">' +
      '<span class="sidebar-user__avatar">Е</span>' +
      '<div class="sidebar-user__meta">' +
      '<span class="sidebar-user__name">Егор</span>' +
      '<span class="sidebar-user__role">Владелец</span>' +
      '</div>' +
      '<button type="button" class="sidebar-user__action" aria-label="Выйти">' +
      '<iconify-icon icon="lucide:log-out"></iconify-icon>' +
      '</button>' +
      '</div>' +
      '</div>' +
      '</aside>'
    );
  }

  function renderTabbar(active) {
    var items = TAB_NAV.map(function (item) {
      return (
        '<a class="tabbar__item' +
        (item.key === active ? ' is-active' : '') +
        '" href="' +
        item.href +
        '">' +
        '<iconify-icon icon="' +
        item.icon +
        '" class="tabbar__icon"></iconify-icon>' +
        '<span>' +
        item.label +
        '</span></a>'
      );
    }).join('');

    return (
      '<nav class="tabbar" aria-label="Основная навигация">' +
      '<div class="tabbar__inner">' +
      items +
      '</div></nav>'
    );
  }

  function mountShell() {
    document.querySelectorAll('[data-app-sidebar]').forEach(function (el) {
      var active = el.getAttribute('data-app-sidebar') || 'home';
      el.outerHTML = renderSidebar(active);
    });

    document.querySelectorAll('[data-app-tabbar]').forEach(function (el) {
      var active = el.getAttribute('data-app-tabbar') || 'home';
      el.outerHTML = renderTabbar(active);
    });

    applyTheme(theme);
  }

  function authAmbientHtml() {
    return (
      '<div class="auth-ambient" aria-hidden="true">' +
      '<span class="auth-orb auth-orb--1"></span>' +
      '<span class="auth-orb auth-orb--2"></span>' +
      '<span class="auth-orb auth-orb--3"></span>' +
      '<span class="auth-orb auth-orb--spark"></span>' +
      '<span class="auth-orb auth-orb--mesh"></span>' +
      '<div class="auth-chart auth-chart--grid"></div>' +
      '<div class="auth-chart auth-chart--area">' +
      '<svg class="auth-chart__svg" viewBox="0 0 120 48" fill="none" aria-hidden="true">' +
      '<defs><linearGradient id="auth-area-grad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#4f46e5" stop-opacity="0.2"/>' +
      '<stop offset="100%" stop-color="#4f46e5" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<path class="auth-chart__fill" d="M4 40 L24 32 L44 36 L64 20 L84 24 L104 14 L116 10 L116 48 L4 48 Z" fill="url(#auth-area-grad)"/>' +
      '<path class="auth-chart__stroke" pathLength="100" d="M4 40 L24 32 L44 36 L64 20 L84 24 L104 14 L116 10" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg></div>' +
      '<div class="auth-chart auth-chart--donut">' +
      '<svg class="auth-chart__svg auth-chart__svg--donut" viewBox="0 0 80 80" fill="none" aria-hidden="true">' +
      '<circle cx="40" cy="40" r="26" stroke="rgba(37,99,235,0.1)" stroke-width="8"/>' +
      '<circle cx="40" cy="40" r="26" stroke="#4f46e5" stroke-width="8" stroke-linecap="round" stroke-dasharray="95 168" transform="rotate(-90 40 40)"/>' +
      '<circle cx="40" cy="40" r="26" stroke="#f97316" stroke-width="8" stroke-linecap="round" stroke-dasharray="48 215" stroke-dashoffset="-100" transform="rotate(-90 40 40)"/>' +
      '</svg></div>' +
      '<div class="auth-chart auth-chart--line">' +
      '<svg class="auth-chart__svg" viewBox="0 0 140 52" fill="none" aria-hidden="true">' +
      '<path class="auth-chart__stroke" pathLength="100" d="M6 38 L30 30 L54 34 L78 18 L102 22 L126 10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle class="auth-chart__dot" cx="126" cy="10" r="3.5" fill="currentColor"/>' +
      '</svg></div>' +
      '<div class="auth-chart auth-chart--bars">' +
      '<div class="auth-chart__bars">' +
      '<span class="auth-chart__bar" style="--h:48%"></span>' +
      '<span class="auth-chart__bar" style="--h:72%"></span>' +
      '<span class="auth-chart__bar" style="--h:58%"></span>' +
      '<span class="auth-chart__bar" style="--h:88%"></span>' +
      '<span class="auth-chart__bar" style="--h:64%"></span>' +
      '</div></div>' +
      '<div class="auth-chart auth-chart--hbar">' +
      '<span class="auth-chart__hbar" style="--w:82%"></span>' +
      '<span class="auth-chart__hbar" style="--w:54%"></span>' +
      '<span class="auth-chart__hbar" style="--w:24%"></span>' +
      '</div>' +
      '</div>'
    );
  }

  function initAuthAmbient() {
    var desktopSplit = window.matchMedia('(min-width: 900px)').matches;

    document.querySelectorAll('.auth-brand-panel').forEach(function (panel) {
      var ambient = panel.querySelector('.auth-ambient');
      if (!ambient) {
        panel.insertAdjacentHTML('afterbegin', authAmbientHtml());
      } else if (!ambient.querySelector('.auth-chart__stroke')) {
        ambient.outerHTML = authAmbientHtml();
      }
    });

    document.querySelectorAll('.auth-form-panel').forEach(function (panel) {
      var frame = panel.closest('.auth-frame');
      var hasBrandPanel = frame && frame.querySelector('.auth-brand-panel');
      if (desktopSplit && hasBrandPanel) return;
      var ambient = panel.querySelector('.auth-ambient');
      if (!ambient) {
        panel.insertAdjacentHTML('afterbegin', authAmbientHtml());
      } else if (!ambient.querySelector('.auth-chart__stroke')) {
        ambient.outerHTML = authAmbientHtml();
      }
    });
  }

  function initWidgetEditor() {
    var root = document.querySelector('[data-widget-editor]');
    if (!root) return;

    function show(kind) {
      root.querySelectorAll('[data-widget-panel]').forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-widget-panel') !== kind;
      });
      root.querySelectorAll('[data-widget-preview]').forEach(function (preview) {
        preview.hidden = preview.getAttribute('data-widget-preview') !== kind;
      });
      root.querySelectorAll('[data-widget-kind]').forEach(function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-widget-kind') === kind);
      });
    }

    root.querySelectorAll('[data-widget-kind]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        show(btn.getAttribute('data-widget-kind'));
      });
    });

    var params = new URLSearchParams(window.location.search);
    var kind = params.get('kind') || 'chart';
    if (['chart', 'filter', 'time', 'text'].indexOf(kind) === -1) kind = 'chart';
    show(kind);
  }

  var SEMANTIC_PREVIEW = {
    'cube:orders': {
      member: 'Orders',
      type: 'куб · 3 меры · 3 измерения',
      sql: 'SELECT * FROM public.orders',
      sample: '—',
      widgets: ['<li><a href="dashboard-detail.html">6 виджетов</a></li>'],
      query: '{\n  "meta": "cube Orders"\n}',
    },
    'source:orders': {
      member: 'public.orders',
      type: 'таблица · PostgreSQL',
      sql: '6 колонок',
      sample: '1 284 строк',
      widgets: ['<li class="text-muted">Источник для куба Orders</li>'],
      query: '{\n  "source": "Production Postgres"\n}',
    },
    'measure:revenue': {
      member: 'Orders.revenue',
      type: 'sum · currency',
      sql: 'amount',
      sample: '1 240 000 ₽',
      widgets: [
        '<li><a href="dashboard-detail.html">Выручка (7д)</a></li>',
        '<li><a href="dashboard-detail.html">Выручка по дням</a></li>',
        '<li><a href="home.html">KPI на главной</a></li>',
        '<li class="text-muted">+ ещё 1</li>',
      ],
      query:
        '{\n  "measures": ["Orders.revenue"],\n  "timeDimensions": [{\n    "dimension": "Orders.createdAt",\n    "dateRange": "last 7 days"\n  }]\n}',
    },
    'measure:count': {
      member: 'Orders.count',
      type: 'count',
      sql: '—',
      sample: '318',
      widgets: ['<li><a href="dashboard-detail.html">Заказы (7д)</a></li>'],
      query: '{\n  "measures": ["Orders.count"],\n  "timeDimensions": [{\n    "dimension": "Orders.createdAt",\n    "dateRange": "last 7 days"\n  }]\n}',
    },
    'measure:avgOrder': {
      member: 'Orders.avgOrder',
      type: 'avg · currency',
      sql: 'amount',
      sample: '3 899 ₽',
      widgets: ['<li><a href="dashboard-detail.html">Средний чек</a></li>'],
      query: '{\n  "measures": ["Orders.avgOrder"]\n}',
    },
    'measure:new': {
      member: '—',
      type: 'новая мера',
      sql: '—',
      sample: '—',
      widgets: ['<li class="text-muted">Пока не используется</li>'],
      query: '{\n  "measures": ["Orders.<name>"]\n}',
    },
    'dimension:status': {
      member: 'Orders.status',
      type: 'string',
      sql: 'status',
      sample: 'completed, processing…',
      widgets: ['<li><a href="dashboard-detail.html">Статусы заказов</a></li>'],
      query: '{\n  "dimensions": ["Orders.status"],\n  "measures": ["Orders.count"]\n}',
    },
    'dimension:createdAt': {
      member: 'Orders.createdAt',
      type: 'time',
      sql: 'created_at',
      sample: '2026-06-14',
      widgets: ['<li><a href="dashboard-detail.html">Выручка по дням</a></li>', '<li class="text-muted">+ ещё 3</li>'],
      query: '{\n  "timeDimensions": [{\n    "dimension": "Orders.createdAt",\n    "granularity": "day"\n  }]\n}',
    },
    'dimension:tenantId': {
      member: 'Orders.tenantId',
      type: 'string · системное',
      sql: 'tenant_id',
      sample: 'org_…',
      widgets: ['<li class="text-muted">Не показывается в UI</li>'],
      query: '{\n  "filters": [{\n    "member": "Orders.tenantId",\n    "operator": "equals"\n  }]\n}',
    },
    'dimension:new': {
      member: '—',
      type: 'новое измерение',
      sql: '—',
      sample: '—',
      widgets: ['<li class="text-muted">Пока не используется</li>'],
      query: '{\n  "dimensions": ["Orders.<name>"]\n}',
    },
  };

  var SEMANTIC_EDGES = [
    { from: 'source:orders', fromPort: 'out', to: 'cube:orders', toPort: 'in' },
    { from: 'cube:orders', fromPort: 'out', to: 'measure:revenue', toPort: 'in' },
    { from: 'cube:orders', fromPort: 'out', to: 'measure:count', toPort: 'in' },
    { from: 'cube:orders', fromPort: 'out', to: 'measure:avgOrder', toPort: 'in' },
    { from: 'cube:orders', fromPort: 'out', to: 'dimension:status', toPort: 'in' },
    { from: 'cube:orders', fromPort: 'out-bottom', to: 'dimension:createdAt', toPort: 'in' },
    { from: 'source:orders', fromPort: 'out-bottom', to: 'dimension:tenantId', toPort: 'in', dashed: true },
  ];

  function layoutSemanticEdges(stage) {
    if (!stage) return [];

    var svg = stage.querySelector('.node-edges');
    if (!svg) return [];

    var w = stage.offsetWidth;
    var h = stage.offsetHeight;
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.innerHTML = '';

    var stageRect = stage.getBoundingClientRect();
    var paths = [];

    function portPoint(nodeId, portName) {
      var node = stage.querySelector('[data-semantic-node="' + nodeId + '"]');
      if (!node) return null;
      var port = node.querySelector('[data-port="' + portName + '"]');
      if (!port) return null;
      var rect = port.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - stageRect.left,
        y: rect.top + rect.height / 2 - stageRect.top,
      };
    }

    function edgePath(a, b) {
      var mx = (a.x + b.x) / 2;
      return 'M ' + a.x + ' ' + a.y + ' C ' + mx + ' ' + a.y + ', ' + mx + ' ' + b.y + ', ' + b.x + ' ' + b.y;
    }

    SEMANTIC_EDGES.forEach(function (edge, index) {
      var from = portPoint(edge.from, edge.fromPort);
      var to = portPoint(edge.to, edge.toPort);
      if (!from || !to) return;

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', edgePath(from, to));
      path.dataset.edgeTarget = edge.to;
      if (edge.dashed) path.classList.add('is-dashed');
      svg.appendChild(path);
      paths.push({ el: path, target: edge.to, source: edge.from });
    });

    return paths;
  }

  function initSemanticEditor() {
    var root = document.querySelector('[data-semantic-editor]');
    if (!root) return;

    var previewBody = root.querySelector('[data-semantic-preview-body]');
    var stage = root.querySelector('.node-canvas__stage');
    var edgePaths = [];
    var selectedId = 'measure:revenue';

    function updatePreview(id) {
      if (!previewBody) return;
      var data = SEMANTIC_PREVIEW[id];
      if (!data) return;
      previewBody.innerHTML =
        '<p class="inspector-preview__member">' +
        data.member +
        '</p>' +
        '<div class="inspector-preview__grid">' +
        '<span>Тип</span><span>' +
        data.type +
        '</span>' +
        '<span>SQL</span><span><code>' +
        data.sql +
        '</code></span>' +
        '<span>Пример</span><strong>' +
        data.sample +
        '</strong></div>' +
        '<ul class="inspector-preview__widgets">' +
        data.widgets.join('') +
        '</ul>' +
        '<pre class="inspector-preview__query">' +
        data.query +
        '</pre>' +
        '<button class="btn btn--ghost btn--sm inspector-preview__run" type="button">' +
        '<iconify-icon icon="lucide:play"></iconify-icon> Выполнить preview</button>';
      normalizeIcons(previewBody);
    }

    function highlightEdges(id) {
      edgePaths.forEach(function (item) {
        var active = item.target === id || item.source === id;
        item.el.classList.toggle('is-active', active);
      });
    }

    function show(id) {
      selectedId = id;
      root.querySelectorAll('[data-semantic-panel]').forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-semantic-panel') !== id;
      });
      root.querySelectorAll('[data-semantic-select]').forEach(function (btn) {
        if (btn.disabled) return;
        btn.classList.toggle('is-active', btn.getAttribute('data-semantic-select') === id);
      });
      root.querySelectorAll('[data-semantic-node]').forEach(function (node) {
        node.classList.toggle('is-selected', node.getAttribute('data-semantic-node') === id);
      });
      highlightEdges(id);
      updatePreview(id);
    }

    root.querySelectorAll('[data-semantic-node]').forEach(function (node) {
      node.addEventListener('click', function () {
        show(node.getAttribute('data-semantic-node'));
      });
      node.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          show(node.getAttribute('data-semantic-node'));
        }
      });
    });

    root.querySelectorAll('[data-semantic-select]').forEach(function (btn) {
      if (btn.disabled) return;
      btn.addEventListener('click', function () {
        show(btn.getAttribute('data-semantic-select'));
      });
    });

    window.addEventListener('resize', function () {
      edgePaths = layoutSemanticEdges(stage);
      highlightEdges(selectedId);
    });

    var params = new URLSearchParams(window.location.search);
    var select = params.get('member') || 'measure:revenue';
    if (!SEMANTIC_PREVIEW[select]) select = 'measure:revenue';
    requestAnimationFrame(function () {
      edgePaths = layoutSemanticEdges(stage);
      show(select);
    });
  }

  function normalizeIcons(root) {
    (root || document).querySelectorAll('iconify-icon').forEach(function (el) {
      if (!el.getAttribute('stroke-width')) {
        el.setAttribute('stroke-width', '2');
      }
    });
  }

  function initConnectionTest() {
    var btn = document.querySelector('[data-connection-test]');
    var result = document.querySelector('[data-connection-result]');
    if (!btn || !result) return;
    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = 'Проверяем…';
      setTimeout(function () {
        btn.disabled = false;
        btn.innerHTML = '<iconify-icon icon="lucide:plug-zap"></iconify-icon> Проверить';
        result.hidden = false;
        normalizeIcons();
      }, 900);
    });
  }

  function boot() {
    mountShell();
    initAuthAmbient();
    initWidgetEditor();
    initSemanticEditor();
    initConnectionTest();
    applyTheme(theme);
    normalizeIcons();
  }

  loadIconify().then(boot);
})();
