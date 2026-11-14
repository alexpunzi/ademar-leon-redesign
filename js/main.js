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
    const MOBILE_BREAKPOINT = 1200;

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
   * INICIALIZACIÓN GLOBAL
   */
  function bootstrap() {
    NavigationModule.init();
    MatchModule.init();
    RevealModule.init();
    IntegrationModalModule.init();
    FooterModule.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();