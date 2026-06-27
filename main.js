/* ═══════════════════════════════════════════════════════════
   TEMPLATE RESTAURANTE — main.js
   TODO LO QUE EL CLIENTE EDITA VIENE DE GOOGLE SHEETS.
   El agente frontend reemplaza SHEET_ID con el ID real.

   ESTRUCTURA DEL SPREADSHEET (una sola hoja, múltiples pestañas):
   CONFIG | ENTRADAS | PRINCIPALES | POSTRES | BEBIDAS

   Pestaña CONFIG: clave | valor  (dos columnas, sin encabezado)
   Pestañas MENÚ: nombre | descripción | precio
═══════════════════════════════════════════════════════════ */

const SHEET_ID = '1HxC_VN6s2UbG1U1SxNIk-pmWv5xR0QeZtPLc4JoLrkA';

const MENU_TABS = [
  { key: 'ENTRADAS',    label: 'Entradas' },
  { key: 'PRINCIPALES', label: 'Principales' },
  { key: 'POSTRES',     label: 'Postres' },
  { key: 'BEBIDAS',     label: 'Bebidas' },
];

function sheetUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function parseCsv(text) {
  const rows = [];
  const lines = text.trim().split('\n');
  for (const line of lines) {
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    rows.push(cols);
  }
  return rows;
}

async function fetchSheet(sheetName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(sheetUrl(sheetName), { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return parseCsv(text);
  } catch (e) {
    console.warn(`No se pudo cargar la pestaña "${sheetName}":`, e.message);
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
    const redes = [];
    if (cfg.instagram) redes.push({ url: cfg.instagram, label: 'IG' });
    if (cfg.facebook)  redes.push({ url: cfg.facebook,  label: 'FB' });
    if (cfg.tiktok)    redes.push({ url: cfg.tiktok,    label: 'TK' });
    socialWrap.innerHTML = redes.map(r => `
      <a class="footer__social-link" href="${r.url}" target="_blank" rel="noopener" aria-label="${r.label}">${r.label}</a>
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

async function renderMenu() {
  const tabsEl      = document.getElementById('menu-tabs');
  const contenidoEl = document.getElementById('menu-contenido');
  if (!tabsEl || !contenidoEl) return;

  contenidoEl.innerHTML = '<p class="menu__loading">Cargando la carta...</p>';

  let primeraActiva = false;

  for (const tab of MENU_TABS) {
    const rows = await fetchSheet(tab.key);
    if (!rows || rows.length < 2) continue;

    const btnTab = document.createElement('button');
    btnTab.className = 'menu__tab' + (!primeraActiva ? ' activo' : '');
    btnTab.textContent = tab.label;
    btnTab.setAttribute('role', 'tab');
    btnTab.setAttribute('aria-controls', `panel-${tab.key}`);
    btnTab.dataset.panel = tab.key;
    tabsEl.appendChild(btnTab);

    const panel = document.createElement('div');
    panel.className = 'menu__panel' + (!primeraActiva ? ' activo' : '');
    panel.id = `panel-${tab.key}`;
    panel.setAttribute('role', 'tabpanel');

    const platos = rows.slice(1).filter(r => r[0]);
    panel.innerHTML = platos.map(r => `
      <div class="plato">
        <div class="plato__info">
          <p class="plato__nombre">${escapeHtml(r[0] || '')}</p>
          ${r[1] ? `<p class="plato__descripcion">${escapeHtml(r[1])}</p>` : ''}
        </div>
        ${r[2] ? `<span class="plato__precio">${escapeHtml(r[2])}</span>` : ''}
      </div>
    `).join('');

    contenidoEl.appendChild(panel);
    primeraActiva = true;
  }

  if (!primeraActiva) {
    contenidoEl.innerHTML = '<p class="menu__loading">La carta se actualizará pronto.</p>';
    return;
  }

  const loadingEl = contenidoEl.querySelector('.menu__loading');
  if (loadingEl) loadingEl.remove();

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.menu__tab');
    if (!btn) return;
    tabsEl.querySelectorAll('.menu__tab').forEach(b => b.classList.remove('activo'));
    contenidoEl.querySelectorAll('.menu__panel').forEach(p => p.classList.remove('activo'));
    btn.classList.add('activo');
    const panel = document.getElementById(`panel-${btn.dataset.panel}`);
    if (panel) panel.classList.add('activo');
  });
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

async function init() {
  initNavbar();

  const configRows = await fetchSheet('CONFIG');
  if (configRows) {
    const cfg = {};
    for (const row of configRows) {
      if (row[0] && row[1]) cfg[row[0].toLowerCase().trim()] = row[1].trim();
    }
    applyConfig(cfg);
  }

  await renderMenu();
}

document.addEventListener('DOMContentLoaded', init);