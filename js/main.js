/**
 * ==========================================================================
 * NEXO | ABANCA Ademar León - Rediseño Conceptual
 * Archivo: js/main.js
 * Arquitectura: Vanilla ES6+ modular (IIFE / módulos funcionales desacoplados)
 * ==========================================================================
 */

(() => {
  'use strict';

  // Marca en <html> que JS está activo para habilitar revelados progresivos sin ocultar contenido si falla JS
  document.documentElement.classList.add('js-enabled');

  /**
   * Utilidades compartidas
   */
  const Utils = {
    prefersReducedMotion() {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    getHeaderOffset() {
      const header = document.querySelector('.site-header');
      return header ? header.offsetHeight : 0;
    },

    padZero(value) {
      return String(Math.max(0, Math.floor(value))).padStart(2, '0');
    }
  };

  /**
   * 1. MÓDULO DE NAVEGACIÓN, HEADER Y MENÚ MÓVIL
   */
  const NavigationModule = (() => {
    const header = document.querySelector('.site-header');
    const nav = document.getElementById('main-navigation');
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    const navLinks = nav ? Array.from(nav.querySelectorAll('a[href^="#"]')) : [];
    const MOBILE_BREAKPOINT = 1201;

    let isMenuOpen = false;

    function setMenuState(open) {
      if (!nav || !toggleBtn) return;
      isMenuOpen = Boolean(open);

      nav.classList.toggle('is-open', isMenuOpen);
      toggleBtn.setAttribute('aria-expanded', String(isMenuOpen));
      toggleBtn.setAttribute(
        'aria-label',
        isMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
      );
      document.body.classList.toggle('has-overlay-open', isMenuOpen);

      if (isMenuOpen && navLinks.length > 0) {
        navLinks[0].focus();
      }
    }

    function closeMenu(restoreFocus = false) {
      if (!isMenuOpen) return;
      setMenuState(false);
      if (restoreFocus && toggleBtn) {
        toggleBtn.focus();
      }
    }

    function handleHeaderScroll() {
      if (!header) return;
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    }

    function setupSmoothAnchors() {
      const anchorLinks = document.querySelectorAll('a[href^="#"]:not([href="#"])');

      anchorLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
          const targetId = link.getAttribute('href');
          if (!targetId) return;

          const targetElement = document.querySelector(targetId);
          if (!targetElement) return;

          event.preventDefault();
          closeMenu(false);

          const offset = Utils.getHeaderOffset();
          const targetTop =
            targetElement.getBoundingClientRect().top + window.scrollY - offset + 1;

          window.scrollTo({
            top: Math.max(0, targetTop),
            behavior: Utils.prefersReducedMotion() ? 'auto' : 'smooth'
          });

          if (history.pushState) {
            history.pushState(null, '', targetId);
          }
        });
      });
    }

    function setupActiveSectionObserver() {
      if (!('IntersectionObserver' in window) || navLinks.length === 0) return;

      const sectionMap = new Map();
      navLinks.forEach((link) => {
        const id = link.getAttribute('href')?.slice(1);
        const section = id ? document.getElementById(id) : null;
        if (section) {
          sectionMap.set(section, link);
        }
      });

      if (sectionMap.size === 0) return;

      const setActiveLink = (activeLink) => {
        navLinks.forEach((link) => {
          const isCurrent = link === activeLink;
          link.classList.toggle('is-active', isCurrent);
          if (isCurrent) {
            link.setAttribute('aria-current', 'page');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      };

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const link = sectionMap.get(entry.target);
              if (link) setActiveLink(link);
            }
          });
        },
        {
          rootMargin: '-35% 0px -55% 0px',
          threshold: 0
        }
      );

      sectionMap.forEach((_, section) => observer.observe(section));
    }

    function init() {
      if (toggleBtn && nav) {
        toggleBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          setMenuState(!isMenuOpen);
        });

        // Cierre al hacer clic fuera del header/menú
        document.addEventListener('click', (event) => {
          if (!isMenuOpen) return;
          const target = event.target;
          if (header && target instanceof Node && !header.contains(target)) {
            closeMenu(false);
          }
        });

        // Cierre con tecla Escape
        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' && isMenuOpen) {
            closeMenu(true);
          }
        });

        // Sincronizar estado si se redimensiona a escritorio
        window.addEventListener('resize', () => {
          if (window.innerWidth >= MOBILE_BREAKPOINT && isMenuOpen) {
            closeMenu(false);
          }
        });
      }

      window.addEventListener('scroll', handleHeaderScroll, { passive: true });
      handleHeaderScroll();
      setupSmoothAnchors();
      setupActiveSectionObserver();
    }

    return { init };
  })();

  /**
   * 2. MÓDULO DE PRÓXIMO PARTIDO Y CUENTA ATRÁS
   * Gestiona estados reales según la fecha ISO en <time datetime="...">:
   * - Próximo (.is-upcoming): muestra cuenta atrás en días, horas y minutos.
   * - En curso (.is-live): ventana estimada de 95 min desde el saque inicial.
   * - Finalizado (.is-finished): una vez concluido el encuentro.
   */
  const MatchModule = (() => {
    const MATCH_DURATION_MS = 95 * 60 * 1000; // Duración estimada de partido oficial de balonmano
    let intervalId = null;

    function renderCountdown(container, diffMs) {
      const totalMinutes = Math.floor(diffMs / 60000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      container.innerHTML = `
        <span class="countdown-unit">
          <span class="countdown-value">${Utils.padZero(days)}</span>
          <span class="countdown-label">Días</span>
        </span>
        <span class="countdown-sep" aria-hidden="true">/</span>
        <span class="countdown-unit">
          <span class="countdown-value">${Utils.padZero(hours)}</span>
          <span class="countdown-label">Horas</span>
        </span>
        <span class="countdown-sep" aria-hidden="true">/</span>
        <span class="countdown-unit">
          <span class="countdown-value">${Utils.padZero(minutes)}</span>
          <span class="countdown-label">Min</span>
        </span>
      `;
    }

    function init() {
      const matchCard = document.querySelector('[data-match-card]');
      if (!matchCard) return;

      const timeEl = matchCard.querySelector('.match-date[datetime]');
      const statusEl = matchCard.querySelector('.match-status');
      const countdownEl = matchCard.querySelector('[data-countdown]');

      if (!timeEl || !statusEl) return;

      const isoString = timeEl.getAttribute('datetime');
      const matchTimestamp = isoString ? Date.parse(isoString) : NaN;

      // Si no existe una fecha ISO válida, respetamos el marcado estático sin inventar datos
      if (Number.isNaN(matchTimestamp)) {
        if (countdownEl) countdownEl.hidden = true;
        return;
      }

      const updateMatchState = () => {
        const now = Date.now();
        const diff = matchTimestamp - now;

        matchCard.classList.remove('is-upcoming', 'is-live', 'is-finished');

        if (diff > 0) {
          matchCard.classList.add('is-upcoming');
          statusEl.textContent = 'VS';
          if (countdownEl) {
            countdownEl.hidden = false;
            renderCountdown(countdownEl, diff);
          }
        } else if (now <= matchTimestamp + MATCH_DURATION_MS) {
          matchCard.classList.add('is-live');
          statusEl.textContent = 'EN JUEGO';
          if (countdownEl) countdownEl.hidden = true;
        } else {
          matchCard.classList.add('is-finished');
          statusEl.textContent = 'FINALIZADO';
          if (countdownEl) countdownEl.hidden = true;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      };

      updateMatchState();
      intervalId = window.setInterval(updateMatchState, 15000);
    }

    return { init };
  })();

  /**
   * 3. MÓDULO DE ANIMACIONES EDITORIALES AL HACER SCROLL
   */
  const RevealModule = (() => {
    function init() {
      const revealElements = document.querySelectorAll('[data-reveal]');
      if (revealElements.length === 0) return;

      if (Utils.prefersReducedMotion() || !('IntersectionObserver' in window)) {
        revealElements.forEach((el) => el.classList.add('is-revealed'));
        return;
      }

      const observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              obs.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.12,
          rootMargin: '0px 0px -40px 0px'
        }
      );

      revealElements.forEach((el) => observer.observe(el));
    }

    return { init };
  })();

  /**
   * 4. MÓDULO DE GESTIÓN DE INTEGRACIONES PENDIENTES (MODAL EDITORIAL)
   * Evita enlaces muertos (#) sin simular transacciones ni datos falsos.
   */
  const IntegrationModalModule = (() => {
    const modal = document.getElementById('nexo-info-modal');
    const titleEl = document.getElementById('nexo-modal-title');
    const bodyEl = document.getElementById('nexo-modal-body');

    let lastFocusedElement = null;

    const INTEGRATION_MESSAGES = {
      ticketing: {
        title: 'Taquilla Oficial ABANCA Ademar León',
        body: 'Este acceso conectará directamente con la pasarela oficial de venta de entradas y gestión de localidades del club.'
      },
      'match-preview': {
        title: 'Previa del Encuentro',
        body: 'La ficha completa del partido, convocatoria y estadísticas previas se sincronizarán con el gestor de contenidos (CMS) y datos oficiales ASOBAL.'
      },
      'news-article': {
        title: 'Actualidad del Club',
        body: 'Vista de detalle de noticia pendiente de vinculación con el CMS editorial del ABANCA Ademar León.'
      },
      'news-archive': {
        title: 'Hemeroteca y Noticias',
        body: 'El archivo completo de actualidad y comunicados oficiales requiere conexión con la base de datos editorial del club.'
      },
      'club-history': {
        title: 'Historia y Palmarés',
        body: 'Sección monográfica sobre la trayectoria histórica del ABANCA Ademar León en preparación para la siguiente fase del proyecto NEXO.'
      },
      membership: {
        title: 'Campaña de Abonados',
        body: 'El alta online de nuevos socios y renovación de abonos se integrará con el portal oficial de abonados del club.'
      },
      supporters: {
        title: 'Peñas Oficiales',
        body: 'Directorio oficial de peñas ademaristas y canales de contacto en proceso de integración.'
      },
      store: {
        title: 'Tienda Oficial',
        body: 'Acceso directo al comercio electrónico oficial de equipaciones y merchandising del ABANCA Ademar León.'
      },
      social: {
        title: 'Canales Oficiales',
        body: 'Enlace pendiente de asignación a la URL verificada del perfil oficial del ABANCA Ademar León.'
      },
      default: {
        title: 'Módulo en fase de integración',
        body: 'Esta sección forma parte de la arquitectura prevista por NEXO y requiere conexión con los servicios oficiales del ABANCA Ademar León.'
      }
    };

    function openModal(type, triggerElement) {
      if (!modal || !titleEl || !bodyEl) return;

      lastFocusedElement = triggerElement || document.activeElement;
      const content = INTEGRATION_MESSAGES[type] || INTEGRATION_MESSAGES.default;

      titleEl.textContent = content.title;
      bodyEl.textContent = content.body;

      modal.hidden = false;
      document.body.classList.add('has-overlay-open');

      const closeButton = modal.querySelector('.nexo-modal-close');
      if (closeButton) closeButton.focus();
    }

    function closeModal() {
      if (!modal || modal.hidden) return;

      modal.hidden = true;
      document.body.classList.remove('has-overlay-open');

      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
    }

    function init() {
      if (!modal) return;

      document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const closeTrigger = target.closest('[data-modal-close]');
        if (closeTrigger && modal.contains(closeTrigger)) {
          event.preventDefault();
          closeModal();
          return;
        }

        const integrationTrigger = target.closest('[data-integration]');
        if (integrationTrigger) {
          event.preventDefault();
          const type = integrationTrigger.getAttribute('data-integration') || 'default';
          openModal(type, integrationTrigger);
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.hidden) {
          closeModal();
        }
      });
    }

    return { init };
  })();

  /**
   * 5. MÓDULO DE FOOTER Y UTILIDADES GENERALES
   */
  const FooterModule = (() => {
    function init() {
      const yearTarget = document.querySelector('[data-current-year]');
      if (yearTarget) {
        yearTarget.textContent = String(new Date().getFullYear());
      }
    }

    return { init };
  })();

  /**
   * 6. MÓDULO DE DATOS EDITORIALES
   * Los JSON son la fuente en servidor; el objeto de respaldo permite abrir el prototipo con file://.
   */
  const DataModule = (() => {
    const DATA_FILES = {
      clasificacion: 'data/clasificacion.json',
      partidos: 'data/partidos.json',
      plantilla: 'data/plantilla.json',
      noticias: 'data/noticias.json'
    };

    let data = {};

    function escapeHtml(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]);
    }

    function formatDate(value, options = {}) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return 'Fecha por confirmar';
      return new Intl.DateTimeFormat('es-ES', options).format(date);
    }

    function getFallbackData() {
      const fallback = window.NEXO_DATA_FALLBACK;
      if (!fallback) {
        throw new Error('No se encontró el respaldo local de datos (js/data-fallback.js).');
      }
      return fallback;
    }

    async function loadOne(key, path, fallback) {
      if (window.location.protocol === 'file:') return fallback[key];

      try {
        const response = await fetch(path, {
          cache: 'no-store',
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} al cargar ${path}`);
        }
        return await response.json();
      } catch (error) {
        console.warn(`No se pudo cargar ${path}; se utilizará el respaldo local.`, error);
        return fallback[key];
      }
    }

    function teamMark(name, logo) {
      if (logo) {
        return `<img class="team-shield" src="${escapeHtml(logo)}" alt="" loading="lazy">`;
      }
      const initials = name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('');
      return `<span class="team-shield team-shield-placeholder" aria-hidden="true">${escapeHtml(initials)}</span>`;
    }

    function renderUpcomingMatch(match, target, homepage = false) {
      if (!match || !target) return;
      const matchDate = formatDate(match.fecha, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
      if (homepage) {
        target.innerHTML = `
          <div class="match-team">${teamMark(match.local, match.escudoLocal)}<span class="team-name">${escapeHtml(match.local)}</span></div>
          <div class="match-details">
            <span class="match-competition">Jornada ${escapeHtml(match.jornada)} · ${escapeHtml(match.competicion)}</span>
            <time class="match-date" datetime="${escapeHtml(match.fecha)}">${escapeHtml(matchDate)}</time>
            <p class="match-venue">${escapeHtml(match.pabellon)} · ${escapeHtml(match.ciudad)}</p>
            <p class="match-status">VS</p>
            <div class="match-countdown" data-countdown aria-live="polite"></div>
          </div>
          <div class="match-team">${teamMark(match.visitante, match.escudoVisitante)}<span class="team-name">${escapeHtml(match.visitante)}</span></div>`;
        return;
      }

      target.innerHTML = `
        <p class="match-branding">PRÓXIMO ENCUENTRO · JORNADA ${escapeHtml(match.jornada)}</p>
        <div class="match-teams-large">
          <div class="team">${teamMark(match.local, match.escudoLocal)}<span>${escapeHtml(match.local)}</span></div>
          <p class="vs" aria-label="contra">VS</p>
          <div class="team">${teamMark(match.visitante, match.escudoVisitante)}<span>${escapeHtml(match.visitante)}</span></div>
        </div>
        <div class="match-meta-elite">
          <p class="info">${escapeHtml(match.competicion)} · ${escapeHtml(matchDate)}</p>
          <p class="info">${escapeHtml(match.pabellon)} · ${escapeHtml(match.ciudad)}</p>
        </div>
        <a href="ficha-partido.html?id=${encodeURIComponent(match.id)}" class="btn-elite">Ficha del partido</a>
        ${match.ciudad === 'León' ? `<a href="entradas.html?partido=${encodeURIComponent(match.id)}" class="btn-elite btn-elite-red">Solicitar entradas</a>` : ''}`;
    }

    function renderCalendarRow(match) {
      const date = formatDate(match.fecha, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      const score = match.marcador
        ? `<strong>${escapeHtml(match.marcador.local)}–${escapeHtml(match.marcador.visitante)}</strong>`
        : '';
      return `<article class="calendar-row">
        <time class="date" datetime="${escapeHtml(match.fecha)}">${escapeHtml(date)}</time>
        <span class="competition">${escapeHtml(match.competicion)} · J${escapeHtml(match.jornada)}</span>
        <span class="teams">${escapeHtml(match.local)} ${score || '—'} ${escapeHtml(match.visitante)}</span>
        <a class="status" href="ficha-partido.html?id=${encodeURIComponent(match.id)}">${match.estado === 'finalizado' ? 'CRÓNICA' : 'DETALLES'}</a>
      </article>`;
    }

    function renderClassification() {
      const standings = data.clasificacion;
      if (!standings || !standings.equipo) return;
      const team = standings.equipo;
      const values = {
        puesto: `${String(team.puesto).padStart(2, '0')}.º`,
        puntos: team.puntos,
        victorias: team.victorias,
        derrotas: team.derrotas,
        golesFavor: team.golesFavor,
        golesContra: team.golesContra,
        diferencia: team.golesFavor - team.golesContra,
        maximoGoleador: team.maximoGoleador,
        golesMaximoGoleador: team.golesMaximoGoleador
      };
      document.querySelectorAll('[data-standing]').forEach((element) => {
        const value = values[element.getAttribute('data-standing')];
        if (value !== undefined) element.textContent = String(value);
      });
      const caption = document.querySelector('[data-standing-caption]');
      if (caption) caption.textContent = `${standings.competicion} · TRAS ${standings.jornadaActual} JORNADAS`;
    }

    function newsCard(item, featured = false) {
      const date = formatDate(item.fecha, { day: '2-digit', month: 'short', year: 'numeric' });
      const image = `<img src="${escapeHtml(item.imagen)}" alt="${escapeHtml(item.textoAlternativo)}" loading="lazy">`;
      if (featured) {
        return `<div class="span-8"><article class="news-main card-elite"><a href="noticia.html?id=${encodeURIComponent(item.id)}">${image}<div class="p-md"><span class="tag-red">${escapeHtml(item.categoria)} · ${escapeHtml(date)}</span><h3 class="text-title-sm text-white">${escapeHtml(item.titulo)}</h3><p class="text-white opacity-80">${escapeHtml(item.resumen)}</p></div></a></article></div>`;
      }
      return `<div class="span-4"><article class="news-item-sm card-elite"><a href="noticia.html?id=${encodeURIComponent(item.id)}">${image}<span class="date text-red">${escapeHtml(date)} · ${escapeHtml(item.categoria)}</span><h3 class="text-white">${escapeHtml(item.titulo)}</h3><p class="text-white opacity-80">${escapeHtml(item.resumen)}</p></a></article></div>`;
    }

    function renderHomeNews() {
      const target = document.querySelector('[data-home-news]');
      if (!target) return;
      const news = data.noticias.noticias;
      if (!news || news.length === 0) {
        target.innerHTML = '<p>No hay noticias disponibles.</p>';
        return;
      }
      target.innerHTML = news.slice(0, 4).map((item, index) => newsCard(item, index === 0)).join('');
    }

    function renderNewsArchive() {
      const target = document.querySelector('[data-news-list]');
      if (!target) return;
      const news = data.noticias.noticias || [];
      const categoryFilter = document.querySelector('[data-news-category]');
      const yearFilter = document.querySelector('[data-news-year]');
      const years = [...new Set(news.map((item) => item.fecha.slice(0, 4)))].sort().reverse();
      if (yearFilter) {
        yearFilter.innerHTML = '<option value="">Todos los años</option>' +
          years.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join('');
      }
      const render = () => {
        const category = categoryFilter ? categoryFilter.value : '';
        const year = yearFilter ? yearFilter.value : '';
        const visible = news.filter((item) =>
          (!category || item.categoria === category) && (!year || item.fecha.startsWith(year))
        );
        target.innerHTML = visible.length
          ? visible.map((item) => newsCard(item)).join('')
          : '<p>No hay noticias para los filtros seleccionados.</p>';
      };
      if (categoryFilter) categoryFilter.addEventListener('change', render);
      if (yearFilter) yearFilter.addEventListener('change', render);
      render();
    }

    function renderNewsDetail() {
      const target = document.querySelector('[data-news-detail]');
      if (!target) return;
      const id = new URLSearchParams(window.location.search).get('id');
      const item = (data.noticias.noticias || []).find((entry) => entry.id === id);
      if (!item) {
        target.innerHTML = '<p class="tag-red">NOTICIA NO DISPONIBLE</p><h1 class="text-title">NO ENCONTRAMOS ESTA NOTICIA</h1><a class="view-all-link" href="noticias.html">Volver a noticias <span aria-hidden="true">→</span></a>';
        return;
      }
      const date = formatDate(item.fecha, { day: 'numeric', month: 'long', year: 'numeric' });
      target.innerHTML = `<a class="view-all-link" href="noticias.html">← Todas las noticias</a>
        <p class="tag-red">${escapeHtml(item.categoria)} · ${escapeHtml(date)}</p>
        <h1 class="text-title">${escapeHtml(item.titulo)}</h1>
        <img class="news-detail-image" src="${escapeHtml(item.imagen)}" alt="${escapeHtml(item.textoAlternativo)}">
        <p class="lead-elite">${escapeHtml(item.resumen)}</p>
        <div class="news-detail-copy">${item.contenido.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div>`;
    }

    function renderMatchDetail() {
      const target = document.querySelector('[data-match-detail]');
      if (!target) return;
      const id = new URLSearchParams(window.location.search).get('id');
      const match = data.partidos.partidos.find((entry) => entry.id === id);
      if (!match) {
        target.innerHTML = '<p class="tag-red">FICHA NO DISPONIBLE</p><h1 class="text-title">NO ENCONTRAMOS ESTE PARTIDO</h1><a class="view-all-link" href="partidos.html">Volver al calendario <span aria-hidden="true">→</span></a>';
        return;
      }
      const date = formatDate(match.fecha, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const score = match.marcador
        ? `<div class="match-score" aria-label="Resultado ${escapeHtml(match.marcador.local)} a ${escapeHtml(match.marcador.visitante)}">${escapeHtml(match.marcador.local)} <span>—</span> ${escapeHtml(match.marcador.visitante)}</div>`
        : '<div class="match-score">VS</div>';
      target.innerHTML = `<a class="view-all-link" href="partidos.html">← Todos los partidos</a>
        <p class="tag-red">${escapeHtml(match.competicion)} · JORNADA ${escapeHtml(match.jornada)}</p>
        <h1 class="text-title">${escapeHtml(match.local)}<br>${escapeHtml(match.visitante)}</h1>
        <div class="match-detail-score">${score}<p>${escapeHtml(date)}</p></div>
        <div class="match-detail-columns">
          <section><h2 class="text-title-sm">CRÓNICA</h2><p>${escapeHtml(match.cronica)}</p></section>
          <section><h2 class="text-title-sm">ACTA BÁSICA</h2><dl class="match-acta">
            <div><dt>Árbitros</dt><dd>${escapeHtml(match.acta.arbitros)}</dd></div>
            <div><dt>Exclusiones</dt><dd>${escapeHtml(match.acta.exclusiones)}</dd></div>
            <div><dt>Máximos goleadores</dt><dd>${escapeHtml(match.acta.maximosGoleadores)}</dd></div>
          </dl></section>
          <section><h2 class="text-title-sm">PABELLÓN</h2><p>${escapeHtml(match.pabellon)} · ${escapeHtml(match.ciudad)}</p></section>
        </div>
        ${match.estado === 'proximo' && match.ciudad === 'León' ? `<a class="btn-elite btn-elite-red" href="entradas.html?partido=${encodeURIComponent(match.id)}">Solicitar entradas</a>` : ''}`;
    }

    function calculateAge(birthDate) {
      if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return 'Edad no disponible';
      const [year, month, day] = birthDate.split('-').map(Number);
      const today = new Date();
      let age = today.getFullYear() - year;
      if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
      return age >= 0 ? `${age} años` : 'Edad no disponible';
    }

    function renderRoster() {
      const target = document.querySelector('[data-roster-list]');
      if (!target) return;
      const players = data.plantilla.jugadores || [];
      const filters = document.querySelector('[data-roster-filters]');
      let selectedPosition = 'Todos';
      const render = () => {
        const visible = players.filter((player) => selectedPosition === 'Todos' || player.posicion === selectedPosition);
        target.innerHTML = visible.map((player) => {
          const photo = player.foto || 'assets/images/player-silhouette.svg';
          return `<article class="player-card card-elite span-4">
            <button type="button" class="player-card-button" data-player-id="${escapeHtml(player.id)}" aria-label="Ver ficha de ${escapeHtml(player.nombre)}">
              <img class="player-photo" src="${escapeHtml(photo)}" alt="Retrato de ${escapeHtml(player.nombre)}" loading="lazy">
              <div class="player-info"><span class="player-number">${escapeHtml(String(player.dorsal).padStart(2, '0'))}</span><h3>${escapeHtml(player.nombre)}</h3><p class="stats-mini">${escapeHtml(player.posicion)}</p></div>
            </button>
          </article>`;
        }).join('');
      };
      if (filters) {
        filters.addEventListener('click', (event) => {
          const button = event.target.closest('[data-position-filter]');
          if (!button) return;
          selectedPosition = button.getAttribute('data-position-filter') || 'Todos';
          filters.querySelectorAll('[data-position-filter]').forEach((filterButton) => {
            const active = filterButton === button;
            filterButton.classList.toggle('is-active', active);
            filterButton.setAttribute('aria-pressed', String(active));
          });
          render();
        });
      }
      render();
      renderStaff();
      bindPlayerDialog(players);
    }

    function renderStaff() {
      const target = document.querySelector('[data-staff-list]');
      if (!target) return;
      target.innerHTML = (data.plantilla.cuerpoTecnico || []).map((member) =>
        `<article class="span-6 card-elite staff-card"><span class="staff-role">${escapeHtml(member.cargo)}</span><h3>${escapeHtml(member.nombre)}</h3></article>`
      ).join('');
    }

    function bindPlayerDialog(players) {
      const dialog = document.querySelector('[data-player-dialog]');
      const detail = document.querySelector('[data-player-detail]');
      if (!dialog || !detail) return;
      document.querySelector('[data-roster-list]').addEventListener('click', (event) => {
        const button = event.target.closest('[data-player-id]');
        if (!button) return;
        const player = players.find((item) => item.id === button.getAttribute('data-player-id'));
        if (!player) return;
        const photo = player.foto || 'assets/images/player-silhouette.svg';
        const socials = Object.entries(player.redes || {}).filter(([, url]) => /^https:\/\//.test(url));
        detail.innerHTML = `<img class="player-detail-photo" src="${escapeHtml(photo)}" alt="Retrato de ${escapeHtml(player.nombre)}">
          <p class="tag-red">PRIMER EQUIPO · TEMPORADA ${escapeHtml(data.plantilla.temporada)}</p>
          <h2 class="text-title" id="player-dialog-title">${escapeHtml(player.nombre)}</h2>
          <dl class="player-facts">
            <div><dt>Dorsal</dt><dd>${escapeHtml(player.dorsal)}</dd></div>
            <div><dt>Posición</dt><dd>${escapeHtml(player.posicion)}</dd></div>
            <div><dt>Edad</dt><dd>${escapeHtml(calculateAge(player.fechaNacimiento))}</dd></div>
            <div><dt>Nacionalidad</dt><dd>${escapeHtml(player.nacionalidad || 'Por confirmar')}</dd></div>
            <div><dt>Ciudad natal</dt><dd>${escapeHtml(player.ciudadNatal || 'Por confirmar')}</dd></div>
          </dl>
          ${socials.length ? `<ul class="player-socials">${socials.map(([network, url]) => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(network)}</a></li>`).join('')}</ul>` : '<p>Redes sociales no disponibles.</p>'}`;
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      });
      const closeButton = dialog.querySelector('[data-player-close]');
      if (closeButton) closeButton.addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
    }

    function populateTicketSelect() {
      const select = document.querySelector('[data-ticket-match]');
      if (!select) return;
      const matches = data.partidos.partidos.filter((match) =>
        match.estado === 'proximo' && match.local === 'ABANCA Ademar León'
      );
      select.innerHTML = '<option value="">Selecciona un partido</option>' + matches.map((match) =>
        `<option value="${escapeHtml(match.id)}">${escapeHtml(match.local)} — ${escapeHtml(match.visitante)} · J${escapeHtml(match.jornada)}</option>`
      ).join('');
      const requestedMatch = new URLSearchParams(window.location.search).get('partido');
      if (requestedMatch && matches.some((match) => match.id === requestedMatch)) select.value = requestedMatch;
    }

    function renderDynamicViews() {
      renderClassification();
      renderHomeNews();
      renderNewsArchive();
      renderNewsDetail();
      renderMatchDetail();
      renderRoster();
      populateTicketSelect();

      const matches = data.partidos.partidos || [];
      const nextMatch = matches.find((match) => match.estado === 'proximo');
      renderUpcomingMatch(nextMatch, document.querySelector('[data-next-match-card]'), true);
      renderUpcomingMatch(nextMatch, document.querySelector('[data-calendar-next]'));
      const upcoming = document.querySelector('[data-fixtures-upcoming]');
      if (upcoming) {
        const list = matches.filter((match) => match.estado === 'proximo');
        upcoming.innerHTML = list.length ? list.map(renderCalendarRow).join('') : '<p>No hay próximos partidos publicados.</p>';
      }
      const results = document.querySelector('[data-fixtures-results]');
      if (results) {
        const list = matches.filter((match) => match.estado === 'finalizado')
          .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
        results.innerHTML = list.length ? list.map(renderCalendarRow).join('') : '<p>No hay resultados disponibles.</p>';
      }
    }

    async function init() {
      const fallback = getFallbackData();
      const entries = await Promise.all(Object.entries(DATA_FILES).map(async ([key, path]) => [
        key,
        await loadOne(key, path, fallback)
      ]));
      data = Object.fromEntries(entries);
      renderDynamicViews();
    }

    return { init };
  })();

  /**
   * 7. FORMULARIOS DE PROTOTIPO
   * No almacena datos personales ni presenta una solicitud como enviada sin un backend conectado.
   */
  const LocalFormModule = (() => {
    function init() {
      document.querySelectorAll('[data-local-form]').forEach((form) => {
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const feedback = form.querySelector('[data-form-feedback]');
          if (!feedback) return;
          feedback.textContent = 'No se ha enviado ni guardado esta solicitud. El formulario necesita un canal de recepción del club.';
          feedback.classList.add('is-error');
        });
      });
    }

    return { init };
  })();

  /**
   * INICIALIZACIÓN GLOBAL
   */
  function bootstrap() {
    NavigationModule.init();
    RevealModule.init();
    IntegrationModalModule.init();
    FooterModule.init();
    LocalFormModule.init();
    DataModule.init()
      .then(() => MatchModule.init())
      .catch((error) => {
        console.error('No se pudieron inicializar los datos del sitio.', error);
        document.querySelectorAll('.data-message').forEach((message) => {
          message.textContent = 'No se pudo cargar este contenido. Inténtalo más tarde.';
        });
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();