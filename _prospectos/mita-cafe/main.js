/* ═══════════════════════════════════════════════════════════
   TEMPLATE RESTAURANTE — main.js
   TODO LO QUE EL CLIENTE EDITA VIENE DE GOOGLE SHEETS.
   El agente frontend reemplaza SHEET_ID con el ID real.

   ESTRUCTURA DEL SPREADSHEET (una sola hoja, múltiples pestañas):
   CONFIG | ENTRADAS | PRINCIPALES | POSTRES | BEBIDAS

   Pestaña CONFIG: clave | valor  (dos columnas, sin encabezado)
   Pestañas MENÚ: nombre | descripción | precio
═══════════════════════════════════════════════════════════ */

const SHEET_ID = '1-08Z4NvhbpczIz0DoXkWFxpPktxOSeAnmtfqelxKnJA';
// gid fijo de la pestaña CONFIG en el template original. Al copiar el Sheets
// desde Drive, Google conserva los gids de cada pestaña, así que este valor
// es estable para todos los clientes. Se usa como respaldo cuando obtenerGids()
// no puede leer los gids reales (por ejemplo, por CORS en localhost).
const CONFIG_GID_FALLBACK = '1940972291';

// API_BASE: Google Apps Script Web App que lee el Sheet con SpreadsheetApp y
// devuelve JSON. Se usa en vez de docs.google.com/export porque Google NO
// envía headers CORS en /export ni en /gviz/tq, por lo que un fetch() desde
// cualquier hosting (Five Server, dominio propio, etc.) siempre fallaba con
// "Failed to fetch". El Apps Script Web App sí devuelve CORS correctamente.
const API_BASE = 'https://script.google.com/macros/s/AKfycbw7IQmJjk7bz6xi7168juz0_GrgqzkNt5qt7OyaNkarRWqkZ24Hj3eN5qYM4L1k4gTi/exec';

function sheetUrl(sheetName, gid) {
  const cacheBuster = Date.now();
  if (gid) {
    return `${API_BASE}?id=${SHEET_ID}&gid=${gid}&_=${cacheBuster}`;
  }
  return `${API_BASE}?id=${SHEET_ID}&sheet=${encodeURIComponent(sheetName)}&_=${cacheBuster}`;
}

async function fetchSheet(sheetName, gid = null) {
  const url = sheetUrl(sheetName, gid);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error de la API');
    return (data.rows || [])
      .map(r => r.map(c => (c === null || c === undefined) ? '' : String(c).trim()))
      .filter(r => r.some(c => c !== ''));
  } catch (e) {
    console.warn(`Error cargando "${sheetName}":`, e.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function applyConfig(cfg) {
  if (cfg.color_principal) {
    document.documentElement.style.setProperty('--color-primary', cfg.color_principal);
    document.documentElement.style.setProperty('--color-primary-dark', darkenHex(cfg.color_principal, 20));
  }
  if (cfg.color_acento) {
    document.documentElement.style.setProperty('--color-accent', cfg.color_acento);
  }

  const nombre = cfg.nombre_restaurante || 'Restaurante';
  document.title = nombre;
  setContent('page-title', nombre);

  const metaDesc = document.getElementById('meta-description');
  if (metaDesc) metaDesc.setAttribute('content', cfg.tagline || '');

  // Favicon y Open Graph: usa logo si existe, sino la imagen del hero como fallback
  const iconoUrl = cfg.logo_url || cfg.hero_imagen || '';
  const favicon = document.getElementById('favicon');
  if (favicon && iconoUrl) favicon.href = iconoUrl;

  const appleIcon = document.getElementById('apple-icon');
  if (appleIcon && iconoUrl) appleIcon.href = iconoUrl;

  const ogTitle = document.getElementById('og-title');
  if (ogTitle) ogTitle.setAttribute('content', nombre);

  const ogDescription = document.getElementById('og-description');
  if (ogDescription) ogDescription.setAttribute('content', cfg.tagline || '');

  const ogImage = document.getElementById('og-image');
  if (ogImage && (cfg.hero_imagen || cfg.logo_url)) {
    ogImage.setAttribute('content', cfg.hero_imagen || cfg.logo_url);
  }

  const navNombre = document.getElementById('nav-nombre');
  if (cfg.logo_url && navNombre) {
    const logoWrap = document.getElementById('nav-logo');
    logoWrap.innerHTML = `<img src="${cfg.logo_url}" alt="${nombre}" />`;
  } else {
    setContent('nav-nombre', nombre);
  }

  if (cfg.hero_imagen) {
    document.querySelector('.hero').style.backgroundImage = `url('${cfg.hero_imagen}')`;
  }
  setContent('hero-nombre', nombre);
  setContent('hero-tagline', cfg.tagline || '');
  if (cfg.tipo_cocina) setContent('hero-eyebrow', cfg.tipo_cocina);

  setContent('nosotros-titulo', cfg.nosotros_titulo || 'Quiénes somos');
  setContent('nosotros-p1', cfg.nosotros_p1 || '');
  setContent('nosotros-p2', cfg.nosotros_p2 || '');
  const nosotrosImg = document.getElementById('nosotros-imagen');
  if (nosotrosImg) {
    nosotrosImg.src = cfg.nosotros_imagen || '';
    nosotrosImg.alt = `Interior de ${nombre}`;
    if (!cfg.nosotros_imagen) nosotrosImg.closest('.nosotros__imagen-wrap').style.display = 'none';
  }

  const badgesWrap = document.getElementById('nosotros-badges');
  if (badgesWrap) {
    const badges = [];
    if (cfg.anos_experiencia) badges.push({ n: cfg.anos_experiencia, label: 'años' });
    if (cfg.num_platos)       badges.push({ n: cfg.num_platos,       label: 'platos' });
    badgesWrap.innerHTML = badges.map(b => `
      <div class="badge">
        <span class="badge__numero">${b.n}</span>
        <span class="badge__label">${b.label}</span>
      </div>
    `).join('');
  }

  setContent('ubicacion-direccion', cfg.direccion || '');
  setContent('ubicacion-horario', cfg.horario || '');

  const telEl = document.getElementById('ubicacion-tel');
  if (telEl && cfg.telefono) {
    telEl.textContent = cfg.telefono;
    telEl.href = `tel:${cfg.telefono.replace(/\s/g, '')}`;
  }

  const mapaIframe = document.getElementById('mapa-iframe');
  if (mapaIframe && cfg.maps_embed) {
    mapaIframe.src = cfg.maps_embed;
  }

  const btnLlegar = document.getElementById('btn-como-llegar');
  if (btnLlegar && cfg.maps_link) {
    btnLlegar.href = cfg.maps_link;
  } else if (btnLlegar && cfg.direccion) {
    btnLlegar.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cfg.direccion)}`;
  }

  const waNumber = cfg.whatsapp || '';
  const waBase   = `https://wa.me/${waNumber.replace(/\D/g, '')}`;

  const btnFloat = document.getElementById('whatsapp-float');
  if (btnFloat) btnFloat.href = `${waBase}?text=${encodeURIComponent('Hola, me gustaría hacer una consulta 👋')}`;

  const btnWaContacto = document.getElementById('btn-whatsapp-contacto');
  if (btnWaContacto) btnWaContacto.href = `${waBase}?text=${encodeURIComponent('Hola, quiero reservar una mesa 🍽️')}`;

  const btnDelivery = document.getElementById('btn-delivery');
  if (btnDelivery) btnDelivery.href = `${waBase}?text=${encodeURIComponent('Hola, quiero hacer un pedido a domicilio 🛵')}`;

  const btnEmail = document.getElementById('btn-email-contacto');
  if (btnEmail && cfg.email) btnEmail.href = `mailto:${cfg.email}`;

  setContent('footer-nombre', nombre);
  setContent('footer-tagline-bottom', cfg.tagline || '');
  const copyEl = document.getElementById('footer-copy');
  if (copyEl) copyEl.textContent = `© ${new Date().getFullYear()} ${nombre} · Todos los derechos reservados`;

  const socialWrap = document.getElementById('footer-social');
  if (socialWrap) {
    const socialUrl = (value) => {
      const url = (value || '').trim();
      return /^https?:\/\//i.test(url) ? url : '';
    };

    const redes = [];
    const instagramUrl = socialUrl(cfg.instagram);
    const facebookUrl  = socialUrl(cfg.facebook);
    const xUrl          = socialUrl(cfg.x) || socialUrl(cfg.twitter);
    const tiktokUrl     = socialUrl(cfg.tiktok);

    if (instagramUrl) redes.push({ url: instagramUrl, label: 'Instagram', icon: 'instagram' });
    if (facebookUrl)  redes.push({ url: facebookUrl,  label: 'Facebook',  icon: 'facebook' });
    if (xUrl)         redes.push({ url: xUrl,         label: 'X',         icon: 'x' });
    if (tiktokUrl)    redes.push({ url: tiktokUrl,    label: 'TikTok',    icon: 'tiktok' });
    socialWrap.innerHTML = redes.map(r => `
      <a class="footer__social-link" href="${r.url}" target="_blank" rel="noopener" aria-label="${r.label}">${socialIcon(r.icon)}</a>
    `).join('');
  }

  initForm(waBase, nombre);
}

function initForm(waBase, nombreRestaurante) {
  const form = document.getElementById('contacto-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre  = document.getElementById('form-nombre').value.trim();
    const mensaje = document.getElementById('form-mensaje').value.trim();
    if (!nombre || !mensaje) return;
    const texto = `Hola ${nombreRestaurante}, soy ${nombre}. ${mensaje}`;
    window.open(`${waBase}?text=${encodeURIComponent(texto)}`, '_blank');
  });
}

function construirMenuTabs(cfg) {
  const raw = cfg.secciones_menu || 'ENTRADAS, PRINCIPALES, POSTRES, BEBIDAS';
  return raw.split(',')
    .map(nombre => nombre.trim())
    .filter(nombre => nombre.length > 0)
    .map(nombre => ({ key: nombre, label: nombre }));
}

async function obtenerGids() {
  try {
    const res = await fetch(
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/htmlview`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return {};
    const html = await res.text();
    const gids = {};
    const regex = /#gid=(\d+)[^>]*>([^<]+)</g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const gid = match[1];
      const nombre = match[2].trim();
      if (nombre && gid) gids[nombre] = gid;
    }
    return gids;
  } catch (e) {
    console.warn('No se pudo obtener gids:', e.message);
    return {};
  }
}

async function renderMenu(menuTabs, gids = {}) {
  const tabsEl      = document.getElementById('menu-tabs');
  const contenidoEl = document.getElementById('menu-contenido');
  if (!tabsEl || !contenidoEl) return;

  contenidoEl.innerHTML = '<p class="menu__loading">Cargando la carta...</p>';
  tabsEl.innerHTML = '';

  let primeraActiva = false;
  const secciones = [];

  function agruparPorSubcategoria(platos) {
    const grupos = [];
    let grupoActual = { subcategoria: null, items: [] };

    for (const r of platos) {
      const nombre = r[0] || '';
      const precio = r.length > 1 ? r[r.length - 1] : '';
      const descripcion = r.length > 2 ? r.slice(1, r.length - 1).join(', ') : '';
      const esSubcategoria = nombre && !descripcion && !precio;

      if (esSubcategoria) {
        if (grupoActual.items.length > 0 || grupoActual.subcategoria) {
          grupos.push(grupoActual);
        }
        grupoActual = { subcategoria: nombre, items: [] };
      } else {
        grupoActual.items.push({ nombre, descripcion, precio });
      }
    }
    if (grupoActual.items.length > 0 || grupoActual.subcategoria) {
      grupos.push(grupoActual);
    }
    return grupos;
  }

  console.log('GIDs obtenidos:', gids);
  for (const tab of menuTabs) {
    // DESPUÉS — usa gid si existe, sino fallback por nombre:
    const rows = await fetchSheet(tab.key, gids[tab.key] || null);
    if (!rows || rows.length < 2) continue;

    // Si no hay gid (htmlview bloqueado por CORS en localhost),
    // validar que los datos son realmente una pestaña de menú y no CONFIG.
    // CONFIG tiene 2 columnas, las pestañas de menú tienen 3.
    if (!gids[tab.key]) {
      // Verificar que tiene la fila de cabecera de menú: NOMBRE | DESCRIPCIÓN | PRECIO
      // CONFIG tiene CLAVE | VALOR | DESCRIPCIÓN — nunca pasa esta validación
      const tieneHeaderMenu = rows.some(r =>
        r.length >= 3 &&
        r[0].toLowerCase().includes('nombre') &&
        r[1].toLowerCase().includes('descripci') &&
        r[2].toLowerCase().includes('precio')
      );
      if (!tieneHeaderMenu) continue;
    }

    const CABECERAS = ['nombre', 'descripción', 'precio', 'podés agregar', 'no toques'];
    function esFilaCabecera(row) {
      return row.some(col => CABECERAS.some(cab => col.toLowerCase().includes(cab)));
    }

    const primerFilaDatos = rows.findIndex((r, i) => i > 0 && r[0] && !esFilaCabecera(r));
    if (primerFilaDatos === -1) continue;

    const platos = rows.slice(primerFilaDatos).filter(r => r[0] && !esFilaCabecera(r));
    if (!platos.length) continue;

    const sectionId = `seccion-${tab.key}`;
    const tabId = `tab-${tab.key}`;

    const btnTab = document.createElement('button');
    btnTab.className = 'menu__tab' + (!primeraActiva ? ' activo' : '');
    btnTab.id = tabId;
    btnTab.textContent = tab.label;
    btnTab.setAttribute('role', 'tab');
    btnTab.setAttribute('aria-controls', sectionId);
    btnTab.setAttribute('aria-selected', String(!primeraActiva));
    btnTab.dataset.section = sectionId;
    btnTab.dataset.key = tab.key;
    tabsEl.appendChild(btnTab);

    const panel = document.createElement('section');
    panel.className = 'menu__panel';
    panel.id = sectionId;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
    panel.dataset.menuSection = tab.key;

    const grupos = agruparPorSubcategoria(platos);

    panel.innerHTML = `
      <h3 class="menu__seccion-titulo">${escapeHtml(tab.label)}</h3>
      ${grupos.map(grupo => `
        ${grupo.subcategoria ? `<h4 class="menu__subcategoria">${escapeHtml(grupo.subcategoria)}</h4>` : ''}
        <div class="menu__grid">
          ${grupo.items.map(item => `
            <div class="plato">
              <div class="plato__info">
                <p class="plato__nombre">${escapeHtml(item.nombre)}</p>
                ${item.descripcion ? `<p class="plato__descripcion">${escapeHtml(item.descripcion)}</p>` : ''}
              </div>
              ${item.precio ? `<span class="plato__precio">${escapeHtml(item.precio)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      `).join('')}
    `;

    contenidoEl.appendChild(panel);
    secciones.push(panel);
    primeraActiva = true;
  }

  if (!primeraActiva) {
    contenidoEl.innerHTML = '<p class="menu__loading">La carta se actualizará pronto.</p>';
    return;
  }

  const loadingEl = contenidoEl.querySelector('.menu__loading');
  if (loadingEl) loadingEl.remove();

  const setActiveTab = (key) => {
    tabsEl.querySelectorAll('.menu__tab').forEach(btn => {
      const isActive = btn.dataset.key === key;
      btn.classList.toggle('activo', isActive);
      btn.setAttribute('aria-selected', String(isActive));

      if (isActive) {
        // Centrar el tab activo dentro del scroll horizontal del contenedor
        const tabRect = btn.getBoundingClientRect();
        const containerRect = tabsEl.getBoundingClientRect();
        const scrollOffset = tabRect.left - containerRect.left - (containerRect.width / 2) + (tabRect.width / 2);

        tabsEl.scrollBy({
          left: scrollOffset,
          behavior: 'smooth',
        });
      }
    });
  };

  const getStickyOffset = () => {
    const navbarHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-h')) || 68;
    return navbarHeight + tabsEl.offsetHeight + 16;
  };

  const updateScrollMargins = () => {
    const offset = `${getStickyOffset()}px`;
    secciones.forEach(section => { section.style.scrollMarginTop = offset; });
  };

  updateScrollMargins();

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.menu__tab');
    if (!btn) return;

    const section = document.getElementById(btn.dataset.section);
    if (!section) return;

    setActiveTab(btn.dataset.key);
    updateScrollMargins();
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  if ('IntersectionObserver' in window) {
    let scrollSpyObserver;
    let resizeTimer;

    // BUGFIX (detectado en MADRIZ MADRID Rock Bar, julio 2026): el botón de tab
    // activo quedaba marcado en una sección (ej. ENTRADAS) mientras la sección
    // realmente visible en pantalla era otra (ej. PRINCIPALES).
    //
    // Causa raíz: el array `entries` que recibe el callback de un
    // IntersectionObserver NO contiene todas las secciones actualmente
    // visibles — contiene solo los targets cuyo estado de intersección
    // CAMBIÓ desde la última vez que se disparó el callback (cruzaron el
    // threshold hacia adentro o hacia afuera). Si el usuario scrollea rápido,
    // o si una sección es muy corta (pocos platos) y entra y sale del
    // threshold entre dos disparos del callback, esa sección nunca aparece
    // en `entries` en el momento exacto en que es la más visible, y el tab
    // activo se queda "pegado" en la última sección que sí disparó un
    // cambio, aunque ya no sea la que está en pantalla.
    //
    // Fix: mantener un mapa persistente con el estado de intersección de
    // TODAS las secciones (no solo las que cambiaron en este disparo del
    // callback), actualizarlo con lo que venga en `entries`, y elegir la
    // sección activa evaluando siempre el mapa completo. Así nunca se pierde
    // el estado de una sección que no participó en el último callback.
    const estadoSecciones = new Map();

    // BUGFIX #2 (mismo síntoma, causa distinta — visto de nuevo en MADRIZ
    // MADRID Rock Bar tras el fix de arriba): un IntersectionObserver dispara
    // su callback UNA VEZ INMEDIATAMENTE al llamar a .observe(), reportando el
    // estado inicial de la página, sin que el usuario haya hecho scroll
    // todavía. Si la primera sección (ENTRADAS) es corta, ese disparo inicial
    // puede calcular que la segunda sección (PRINCIPALES) está más cerca del
    // offset sticky, y le roba el estado "activo" a ENTRADAS apenas carga la
    // página, antes de que el usuario mueva el mouse o el scroll.
    //
    // Fix: ignorar explícitamente ese primer disparo (que no representa una
    // acción real del usuario) y dejar que la primera pestaña siga siendo la
    // que ya se marcó como activa al construir los tabs. El scrollspy recién
    // empieza a mover el tab activo a partir de que el usuario haga scroll de
    // verdad (evento 'scroll' real detectado en window).
    let usuarioHizoScroll = false;
    window.addEventListener('scroll', () => { usuarioHizoScroll = true; }, { once: true, passive: true });

    const createScrollSpy = () => {
      if (scrollSpyObserver) scrollSpyObserver.disconnect();
      estadoSecciones.clear();

      scrollSpyObserver = new IntersectionObserver((entries) => {
        const offset = getStickyOffset();

        entries.forEach(entry => {
          estadoSecciones.set(entry.target, {
            top: entry.boundingClientRect.top,
            visible: entry.isIntersecting,
          });
        });

        if (!usuarioHizoScroll) return;

        const visibles = Array.from(estadoSecciones.entries())
          .filter(([, estado]) => estado.visible)
          .sort((a, b) => Math.abs(a[1].top - offset) - Math.abs(b[1].top - offset));

        if (visibles[0]) setActiveTab(visibles[0][0].dataset.menuSection);
      }, {
        rootMargin: `-${getStickyOffset()}px 0px -20% 0px`,
        threshold: 0.2,
      });

      secciones.forEach(section => scrollSpyObserver.observe(section));
    };

    createScrollSpy();

    window.addEventListener('resize', () => {
      updateScrollMargins();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(createScrollSpy, 150);
    }, { passive: true });
  } else {
    window.addEventListener('scroll', () => {
      const offset = getStickyOffset();
      const activa = secciones
        .map(section => ({ section, distance: Math.abs(section.getBoundingClientRect().top - offset) }))
        .sort((a, b) => a.distance - b.distance)[0];

      if (activa) setActiveTab(activa.section.dataset.menuSection);
    }, { passive: true });
  }
}

function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('nav-toggle');
  const links  = document.getElementById('nav-links');

  const onScroll = () => { navbar.classList.toggle('scrolled', window.scrollY > 60); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toggle.addEventListener('click', () => { links.classList.toggle('abierto'); });
  links.querySelectorAll('.navbar__link').forEach(link => {
    link.addEventListener('click', () => links.classList.remove('abierto'));
  });
}

function setContent(id, text) {
  const el = document.getElementById(id);
  if (el && text) el.textContent = text;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function darkenHex(hex, amount) {
  let col = hex.replace('#', '');
  if (col.length === 3) col = col.split('').map(c => c + c).join('');
  const num = parseInt(col, 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function socialIcon(icon) {
  const icons = {
    instagram: '<svg class="footer__social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></svg>',
    facebook: '<svg class="footer__social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14.2 8.1V6.4c0-.8.3-1.2 1.3-1.2h1.4V2.4c-.7-.1-1.5-.2-2.2-.2-2.6 0-4.3 1.6-4.3 4.5v1.4H7.9v3.1h2.5v10.6h3.8V11.2h2.6l.4-3.1h-3z"/></svg>',
    x: '<svg class="footer__social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.9 2.8h3.3l-7.3 8.3 8.6 11.3h-6.7l-5.2-6.8-6 6.8H2.3l7.8-8.9L1.9 2.8h6.9l4.7 6.2 5.4-6.2zm-1.2 17.6h1.8L7.8 4.7H5.9l11.8 15.7z"/></svg>',
    tiktok: '<svg class="footer__social-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M15.8 3c.4 2.5 1.8 4 4.2 4.2v3.4c-1.4.1-2.7-.3-4.1-1.1v6.4c0 3.2-2.2 5.5-5.4 5.5-3.1 0-5.5-2.2-5.5-5.2 0-3.3 2.7-5.7 6-5.2v3.5c-1.5-.4-2.7.4-2.7 1.7 0 1.1.9 1.8 2 1.8 1.3 0 2.1-.8 2.1-2.5V3h3.4z"/></svg>',
  };
  return icons[icon] || '';
}

async function init() {
  initNavbar();

  // Pedimos los gids ANTES de renderizar el menú para poder acceder a cada
  // pestaña por gid (más confiable que por nombre) cuando estén disponibles.
  const gids = await obtenerGids();

  const configRows = await fetchSheet('CONFIG', gids['CONFIG'] || CONFIG_GID_FALLBACK);
  let cfg = {};
  if (configRows) {
    for (const row of configRows) {
      if (row[0] && row[1]) cfg[row[0].toLowerCase().trim()] = row[1].trim();
    }
    applyConfig(cfg);
  }

  const menuTabs = construirMenuTabs(cfg);
  await renderMenu(menuTabs, gids);
}

document.addEventListener('DOMContentLoaded', init);
