/**
 * BLOC CULTURE — STREETWEAR ECOMMERCE
 * Main JavaScript: Navigation, Carousels, Cart, Scroll Animations
 * Pure vanilla JS, no dependencies.
 * Modular structure for easy WordPress integration.
 */

(function () {
  'use strict';

  /* ============================================================
     1. UTILITY HELPERS
     ============================================================ */
  const qs  = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const on  = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  /* ============================================================
     2. NAVIGATION
     ============================================================ */
  const Nav = {
    hamburger:  qs('#hamburger'),
    overlay:    qs('#navOverlay'),
    navEl:      qs('#nav'),
    overlayLinks: qsa('.nav__overlay-link'),
    isOpen: false,

    init() {
      if (!this.hamburger) return;

      on(this.hamburger, 'click', () => this.toggle());

      // Close on overlay link click
      this.overlayLinks.forEach(link =>
        on(link, 'click', () => this.close())
      );

      // Scroll: add scrolled class
      on(window, 'scroll', () => this.handleScroll(), { passive: true });
    },

    toggle() {
      this.isOpen ? this.close() : this.open();
    },

    open() {
      this.isOpen = true;
      this.hamburger.classList.add('nav__hamburger--open');
      this.overlay.classList.add('nav__overlay--open');
      this.hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      const canvas = document.getElementById('heroCanvas');
      if (canvas) canvas.style.display = 'none';
    },

    close() {
      this.isOpen = false;
      this.hamburger.classList.remove('nav__hamburger--open');
      this.overlay.classList.remove('nav__overlay--open');
      this.hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      const canvas = document.getElementById('heroCanvas');
      if (canvas) canvas.style.display = 'block';
    },

    handleScroll() {
      const scrolled = window.scrollY > 20;
      this.navEl.classList.toggle('nav--scrolled', scrolled);
    }
  };

  /* ============================================================
     3. CAROUSEL
     Creates a reusable carousel for any .carousel__track element.
     Supports touch/drag, dot navigation, auto-play.
     ============================================================ */
  class Carousel {
    constructor(config) {
      this.track       = qs(config.trackId);
      this.prevBtn     = qs(config.prevId);
      this.nextBtn     = qs(config.nextId);
      this.dotsEl      = qs(config.dotsId);
      this.autoplay    = config.autoplay || false;
      this.autoplayMs  = config.autoplayMs || 4000;
      this.loop        = config.loop !== undefined ? config.loop : true;

      if (!this.track) return;

      this.slides      = [...this.track.children];
      this.currentIdx  = 0;
      this.slideWidth  = 0;
      this.gap         = 20; // Must match CSS gap (2rem = 20px at default 62.5%)
      this.isDragging  = false;
      this.startX      = 0;
      this.currentX    = 0;
      this.dragDelta   = 0;
      this.autoplayTimer = null;

      this._init();
    }

    _init() {
      this._calcDimensions();
      this._buildDots();
      this._updateButtons();
      this._bindEvents();
      if (this.autoplay) this._startAutoplay();

      // Re-calculate on resize
      let resizeTimer;
      on(window, 'resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this._calcDimensions();
          this._goTo(this.currentIdx, false);
        }, 150);
      });
    }

    _calcDimensions() {
      if (!this.slides.length) return;
      const style = getComputedStyle(this.track);
      this.gap = parseInt(style.gap) || 20;
      this.slideWidth = this.slides[0].offsetWidth + this.gap;
    }

    _buildDots() {
      if (!this.dotsEl) return;
      this.dotsEl.innerHTML = '';
      this.slides.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.className = 'carousel__dot';
        btn.setAttribute('aria-label', `Go to slide ${i + 1}`);
        if (i === 0) btn.classList.add('carousel__dot--active');
        on(btn, 'click', () => this._goTo(i));
        this.dotsEl.appendChild(btn);
      });
    }

    _updateDots() {
      if (!this.dotsEl) return;
      qsa('.carousel__dot', this.dotsEl).forEach((dot, i) => {
        dot.classList.toggle('carousel__dot--active', i === this.currentIdx);
      });
    }

    _updateButtons() {
      if (this.loop) return; // buttons always active when looping
      if (this.prevBtn) this.prevBtn.disabled = this.currentIdx === 0;
      if (this.nextBtn) this.nextBtn.disabled = this.currentIdx >= this.slides.length - 1;
    }

    _getOffset(idx) {
      return idx * this.slideWidth * -1;
    }

    _goTo(idx, animate = true) {
      const max = this.slides.length - 1;

      if (this.loop) {
        if (idx < 0) idx = max;
        if (idx > max) idx = 0;
      } else {
        idx = Math.max(0, Math.min(idx, max));
      }

      this.currentIdx = idx;
      const offset = this._getOffset(idx);

      this.track.style.transition = animate ? 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none';
      this.track.style.transform = `translateX(${offset}px)`;

      this._updateDots();
      this._updateButtons();

      // Highlight active testimonial card
      this.slides.forEach((s, i) => {
        s.classList.toggle('testimonial-card--active', i === this.currentIdx);
      });
    }

    _bindEvents() {
      if (this.prevBtn) on(this.prevBtn, 'click', () => { this._goTo(this.currentIdx - 1); this._resetAutoplay(); });
      if (this.nextBtn) on(this.nextBtn, 'click', () => { this._goTo(this.currentIdx + 1); this._resetAutoplay(); });

      // Touch / mouse drag
      const vp = this.track.parentElement;

      on(vp, 'mousedown',  e => this._dragStart(e.clientX));
      on(vp, 'touchstart', e => this._dragStart(e.touches[0].clientX), { passive: true });

      on(window, 'mousemove',  e => this._dragMove(e.clientX));
      on(window, 'touchmove',  e => this._dragMove(e.touches[0].clientX), { passive: true });

      on(window, 'mouseup',  () => this._dragEnd());
      on(window, 'touchend', () => this._dragEnd());
    }

    _dragStart(x) {
      this.isDragging = true;
      this.startX = x;
      this.dragDelta = 0;
      this.track.style.transition = 'none';
    }

    _dragMove(x) {
      if (!this.isDragging) return;
      this.dragDelta = x - this.startX;
      const baseOffset = this._getOffset(this.currentIdx);
      this.track.style.transform = `translateX(${baseOffset + this.dragDelta}px)`;
    }

    _dragEnd() {
      if (!this.isDragging) return;
      this.isDragging = false;
      const threshold = this.slideWidth * 0.3;

      if (this.dragDelta < -threshold) {
        this._goTo(this.currentIdx + 1);
      } else if (this.dragDelta > threshold) {
        this._goTo(this.currentIdx - 1);
      } else {
        this._goTo(this.currentIdx); // snap back
      }
      this._resetAutoplay();
    }

    _startAutoplay() {
      this.autoplayTimer = setInterval(() => this._goTo(this.currentIdx + 1), this.autoplayMs);
    }

    _resetAutoplay() {
      if (!this.autoplay) return;
      clearInterval(this.autoplayTimer);
      this._startAutoplay();
    }
  }

  /* ============================================================
     4. CART SYSTEM
     ============================================================ */
  const Cart = {
    count: 0,
    countEl: qs('#cartCount'),
    toastEl: qs('#cartToast'),
    toastMsgEl: qs('#cartToastMsg'),
    toastTimer: null,

    init() {
      qsa('.btn--add-cart').forEach(btn => {
        on(btn, 'click', (e) => {
          const name  = btn.dataset.name  || 'Item';
          const price = btn.dataset.price || '';
          this.add(name, price, btn);
        });
      });
    },

    add(name, price, btn) {
      this.count++;
      this._updateCount();
      this._showToast(`${name} agregado al carrito`);
      this._animateBtn(btn);
    },

    _updateCount() {
      if (!this.countEl) return;
      this.countEl.textContent = this.count;
      this.countEl.classList.toggle('nav__cart-count--visible', this.count > 0);
    },

    _showToast(msg) {
      if (!this.toastEl) return;
      if (this.toastMsgEl) this.toastMsgEl.textContent = msg;
      this.toastEl.classList.add('cart-toast--visible');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toastEl.classList.remove('cart-toast--visible');
      }, 2800);
    },

    _animateBtn(btn) {
      btn.textContent = '✓';
      btn.style.background = '#00cc66';
      setTimeout(() => {
        btn.textContent = '+';
        btn.style.background = '';
      }, 1200);
      // Mensaje en español gestionado desde el HTML (data-name)
    }
  };

  /* ============================================================
     5. NEWSLETTER FORM
     ============================================================ */
  const Newsletter = {
    input:  qs('.newsletter__input'),
    submitBtn: qs('#newsletterSubmit'),

    init() {
      if (!this.submitBtn) return;
      on(this.submitBtn, 'click', () => this.submit());
      on(this.input, 'keydown', e => {
        if (e.key === 'Enter') this.submit();
      });
    },

    submit() {
      if (!this.input) return;
      const email = this.input.value.trim();

      if (!this._isValid(email)) {
        this._shake(this.input);
        return;
      }

      // Success state — in WP, replace with AJAX call to your email list
      this.submitBtn.textContent = '¡Ya sos parte! ✓';
      this.submitBtn.style.background = '#00cc66';
      this.submitBtn.style.color = '#0a0a0a';
      this.submitBtn.disabled = true;
      this.input.value = '';
      this.input.placeholder = '¡Gracias por unirte a la cultura!';
      this.input.disabled = true;
    },

    _isValid(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    _shake(el) {
      el.style.animation = 'none';
      el.getBoundingClientRect(); // force reflow
      el.style.borderColor = '#ff3333';
      el.style.animation = 'shake 0.4s ease';
      setTimeout(() => {
        el.style.borderColor = '';
        el.style.animation = '';
      }, 500);
    }
  };

  /* ============================================================
     6. SCROLL REVEAL ANIMATION
     ============================================================ */
  const ScrollReveal = {
    elements: [],
    observer: null,

    init() {
      // Add reveal class to target elements
      const targets = qsa([
        '.section-header',
        '.category-card',
        '.brand__text-block',
        '.brand__visual',
        '.brand__stat',
        '.product-card--grid',
        '.social-feed__item',
        '.newsletter__content',
        '.footer__brand',
        '.footer__nav-col',
      ].join(', '));

      targets.forEach((el, i) => {
        el.classList.add('reveal');
        // Stagger grid items
        const delay = (i % 4) * 0.1;
        el.style.transitionDelay = `${delay}s`;
      });

      this.elements = qsa('.reveal');

      if (!('IntersectionObserver' in window)) {
        // Fallback for old browsers
        this.elements.forEach(el => el.classList.add('reveal--visible'));
        return;
      }

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            this.observer.unobserve(entry.target); // animate once
          }
        });
      }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
      });

      this.elements.forEach(el => this.observer.observe(el));
    }
  };

  /* ============================================================
     7. SMOOTH ANCHOR SCROLL
     Handles nav link clicks with offset for fixed header.
     ============================================================ */
  const SmoothScroll = {
    init() {
      qsa('a[href^="#"]').forEach(link => {
        on(link, 'click', (e) => {
          const href = link.getAttribute('href');
          if (href === '#' || href === '#!') return;
          const target = qs(href);
          if (!target) return;
          e.preventDefault();

          const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 70;
          const top = target.getBoundingClientRect().top + window.scrollY - navHeight;

          window.scrollTo({ top, behavior: 'smooth' });
        });
      });
    }
  };

  /* ============================================================
     8. SHAKE ANIMATION (CSS injection for newsletter)
     ============================================================ */
  function injectShakeKeyframe() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%       { transform: translateX(-6px); }
        40%       { transform: translateX(6px); }
        60%       { transform: translateX(-4px); }
        80%       { transform: translateX(4px); }
      }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
     9. INIT ALL MODULES
     ============================================================ */
  function init() {
    injectShakeKeyframe();

    Nav.init();

    // Featured Products Carousel
    new Carousel({
      trackId:   '#featuredTrack',
      prevId:    '#featuredPrev',
      nextId:    '#featuredNext',
      dotsId:    '#featuredDots',
      autoplay:  true,
      autoplayMs: 4500,
      loop:      true,
    });

    // Testimonials Carousel
    new Carousel({
      trackId:   '#testimonialsTrack',
      prevId:    '#testimonialsPrev',
      nextId:    '#testimonialsNext',
      dotsId:    '#testimonialsDots',
      autoplay:  true,
      autoplayMs: 5000,
      loop:      true,
    });

    Cart.init();
    Newsletter.init();
    ScrollReveal.init();
    SmoothScroll.init();
  }

  /* Run on DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

/* ============================================================
   HERO CANVAS — fallback si el video no carga
   ============================================================ */
(function () {
  const video  = document.querySelector('.hero__video');
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  // Si el video carga bien, no usamos el canvas
  if (video) {
    video.addEventListener('canplay', () => {
      canvas.style.display = 'none';
    });
    video.addEventListener('error', activateCanvas);
    // Si en 2s el video no responde, activamos canvas
    setTimeout(() => {
      if (video.readyState === 0) activateCanvas();
    }, 2000);
  } else {
    activateCanvas();
  }

  function activateCanvas() {
    canvas.style.display = 'block';

  const ctx = canvas.getContext('2d');
  let W, H, animId;
  let tick = 0;
  const particles = [];
  const PARTICLE_COUNT = 55;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 2.2 + 0.4,
        speed: Math.random() * 0.55 + 0.12,
        opacity: Math.random() * 0.3 + 0.04,
        drift: (Math.random() - 0.5) * 0.35,
      });
    }
  }

  function drawFrame() {
    tick++;

    // Dark base with subtle film flicker
    const flicker = 0.97 + Math.random() * 0.06;
    const base = Math.floor(9 * flicker);
    ctx.fillStyle = `rgb(${base},${base},${base})`;
    ctx.fillRect(0, 0, W, H);

    // Scan lines
    ctx.save();
    for (let y = 0; y < H; y += 4) {
      ctx.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.02})`;
      ctx.fillRect(0, y, W, 1);
    }
    ctx.restore();

    // Abstract urban silhouette shapes
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const phase = (tick * 0.007 + i * 1.3) % (Math.PI * 2);
      const x = W * 0.1 + (W * 0.8 / 5) * i + Math.sin(phase + i) * 16;
      const y = H * 0.38 + Math.cos(phase * 0.65 + i * 0.9) * 28;
      const size = 55 + Math.sin(phase + i * 0.5) * 18;
      const gray = Math.floor(22 + Math.random() * 14);

      ctx.globalAlpha = 0.055 + Math.sin(phase) * 0.025;
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;

      if (i % 3 === 0) {
        ctx.fillRect(x - size * 0.35, y - size * 1.4, size * 0.7, size * 1.4);
      } else if (i % 3 === 1) {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.55, y);
        ctx.lineTo(x - size * 0.55, y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y - size * 0.5, size * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Sweeping spotlight
    ctx.save();
    const rayPhase = (tick * 0.011) % (Math.PI * 2);
    const rayX = W * 0.5 + Math.sin(rayPhase) * W * 0.38;
    const grad = ctx.createRadialGradient(rayX, -50, 0, rayX, -50, H * 1.1);
    grad.addColorStop(0, 'rgba(255,255,255,0.048)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.012)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Particles
    ctx.save();
    particles.forEach(p => {
      p.y -= p.speed;
      p.x += p.drift;
      if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
      if (p.x < -5 || p.x > W + 5) p.x = Math.random() * W;
      ctx.globalAlpha = Math.min(p.opacity * (0.7 + Math.random() * 0.5), 0.45);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // Film grain (sampled for perf)
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 16) {
      const n = (Math.random() - 0.5) * 36;
      d[i]   = Math.min(255, Math.max(0, d[i]   + n));
      d[i+1] = Math.min(255, Math.max(0, d[i+1] + n));
      d[i+2] = Math.min(255, Math.max(0, d[i+2] + n));
    }
    ctx.putImageData(img, 0, 0);

    // Glitch line
    if (Math.random() < 0.035) {
      ctx.save();
      ctx.globalAlpha = 0.1 + Math.random() * 0.1;
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.floor(Math.random() * W), Math.floor(Math.random() * H), 1, Math.floor(Math.random() * 70 + 15));
      ctx.restore();
    }
  }

  function loop() {
    drawFrame();
    animId = requestAnimationFrame(loop);
  }

  function start() {
    resize();
    initParticles();
    loop();
  }

  window.addEventListener('resize', () => { resize(); initParticles(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    document.hidden ? cancelAnimationFrame(animId) : loop();
  });

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', start)
    : start();
  } // fin activateCanvas

})();