/**
 * Muso d'Autore — Core Theme Script & Animation Engine
 * Modern Vanilla JS Engine for Shopify Theme
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initMobileNav();
  initCartDrawer();
  initProductCustomizer();
  initBeforeAfterSliders();
  initAccordions();
  initPortfolioFilters();
  initQuantitySelectors();
});

/* ==========================================================================
   0. SCROLL REVEAL ANIMATION ENGINE
   ========================================================================== */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('[data-animate]');
  
  if (!('IntersectionObserver' in window)) {
    animatedElements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  animatedElements.forEach(el => observer.observe(el));
}

/* ==========================================================================
   1. MOBILE NAVIGATION DRAWER
   ========================================================================== */
function initMobileNav() {
  const toggleBtn = document.querySelector('[data-mobile-menu-toggle]');
  const mobileDrawer = document.querySelector('[data-mobile-menu]');
  const closeBtn = document.querySelector('[data-mobile-menu-close]');
  const overlay = document.querySelector('[data-mobile-menu-overlay]');

  if (!toggleBtn || !mobileDrawer) return;

  function openMenu() {
    mobileDrawer.classList.add('is-open');
    document.body.classList.add('overflow-hidden');
    if (overlay) overlay.classList.add('is-visible');
  }

  function closeMenu() {
    mobileDrawer.classList.remove('is-open');
    document.body.classList.remove('overflow-hidden');
    if (overlay) overlay.classList.remove('is-visible');
  }

  toggleBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);
}

/* ==========================================================================
   2. AJAX CART DRAWER
   ========================================================================== */
function initCartDrawer() {
  const drawer = document.querySelector('[data-cart-drawer]');
  const overlay = document.querySelector('[data-cart-drawer-overlay]');
  const closeBtns = document.querySelectorAll('[data-cart-drawer-close]');
  const openBtns = document.querySelectorAll('[data-open-cart]');

  if (!drawer) return;

  window.MusoCart = {
    open: function() {
      drawer.classList.add('is-open');
      if (overlay) overlay.classList.add('is-visible');
      document.body.classList.add('overflow-hidden');
      MusoCart.refresh();
    },
    close: function() {
      drawer.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-visible');
      document.body.classList.remove('overflow-hidden');
    },
    refresh: function() {
      const bodyEl = drawer.querySelector('.cart-drawer__body');
      if (!bodyEl) return;

      bodyEl.classList.add('is-loading');

      fetch('/cart.js')
        .then(res => res.json())
        .then(cart => {
          renderCartContent(cart);
          updateCartBadges(cart.item_count);
        })
        .catch(err => console.error('Error fetching cart:', err))
        .finally(() => {
          bodyEl.classList.remove('is-loading');
        });
    }
  };

  openBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.MusoCart.open();
    });
  });

  closeBtns.forEach(btn => {
    btn.addEventListener('click', window.MusoCart.close);
  });

  if (overlay) {
    overlay.addEventListener('click', window.MusoCart.close);
  }

  drawer.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-cart-remove]');
    if (removeBtn) {
      e.preventDefault();
      const line = removeBtn.getAttribute('data-line');
      changeCartQuantity(line, 0);
    }

    const qtyBtn = e.target.closest('[data-cart-qty-change]');
    if (qtyBtn) {
      e.preventDefault();
      const line = qtyBtn.getAttribute('data-line');
      const change = parseInt(qtyBtn.getAttribute('data-cart-qty-change'), 10);
      const currentQty = parseInt(qtyBtn.getAttribute('data-qty'), 10);
      const newQty = Math.max(0, currentQty + change);
      changeCartQuantity(line, newQty);
    }
  });
}

function changeCartQuantity(line, quantity) {
  fetch('/cart/change.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ line: parseInt(line, 10), quantity: parseInt(quantity, 10) })
  })
  .then(res => res.json())
  .then(() => {
    window.MusoCart.refresh();
  })
  .catch(err => console.error('Error updating cart quantity:', err));
}

function updateCartBadges(count) {
  const badges = document.querySelectorAll('[data-cart-count]');
  badges.forEach(b => {
    b.textContent = count;
    if (count > 0) {
      b.classList.remove('hidden');
    } else {
      b.classList.add('hidden');
    }
  });
}

function renderCartContent(cart) {
  const container = document.querySelector('[data-cart-drawer-items]');
  const subtotalEl = document.querySelector('[data-cart-subtotal]');
  const shippingMeter = document.querySelector('[data-cart-shipping-meter]');
  const shippingText = document.querySelector('[data-cart-shipping-text]');

  if (subtotalEl) {
    subtotalEl.textContent = formatMoney(cart.total_price);
  }

  const freeShippingThreshold = 5000;
  if (shippingMeter && shippingText) {
    if (cart.total_price >= freeShippingThreshold) {
      shippingMeter.style.width = '100%';
      shippingText.innerHTML = '🎉 <strong>Complimenti!</strong> Hai diritto alla <strong>Spedizione Gratuita</strong>!';
    } else {
      const remaining = freeShippingThreshold - cart.total_price;
      const percentage = Math.min(100, (cart.total_price / freeShippingThreshold) * 100);
      shippingMeter.style.width = percentage + '%';
      shippingText.innerHTML = `Mancano <strong>${formatMoney(remaining)}</strong> per la Spedizione Gratuita`;
    }
  }

  if (!container) return;

  if (cart.item_count === 0) {
    container.innerHTML = `
      <div class="cart-drawer__empty">
        <div class="cart-drawer__empty-icon">🎨</div>
        <h3>Il tuo carrello è vuoto</h3>
        <p>Inizia a personalizzare il ritratto d'autore del tuo fedele compagno!</p>
        <a href="/collections/all" class="button button--secondary">Esplora Opzioni</a>
      </div>
    `;
    return;
  }

  let html = '<div class="cart-drawer__item-list">';
  cart.items.forEach((item, index) => {
    const lineIndex = index + 1;
    const propertiesHtml = renderItemProperties(item.properties);

    html += `
      <div class="cart-item">
        <div class="cart-item__image">
          <img src="${item.image || '/assets/hero-bea.png'}" alt="${escapeHtml(item.title)}">
        </div>
        <div class="cart-item__details">
          <div class="cart-item__title-row">
            <h4 class="cart-item__title">${escapeHtml(item.product_title)}</h4>
            <button type="button" class="cart-item__remove" data-cart-remove data-line="${lineIndex}" aria-label="Rimuovi item">
              &times;
            </button>
          </div>
          ${item.variant_title ? `<div class="cart-item__variant">${escapeHtml(item.variant_title)}</div>` : ''}
          ${propertiesHtml}
          <div class="cart-item__bottom">
            <div class="cart-item__qty-selector">
              <button type="button" data-cart-qty-change="-1" data-line="${lineIndex}" data-qty="${item.quantity}">-</button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-qty-change="1" data-line="${lineIndex}" data-qty="${item.quantity}">+</button>
            </div>
            <div class="cart-item__price">${formatMoney(item.final_line_price)}</div>
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderItemProperties(properties) {
  if (!properties || Object.keys(properties).length === 0) return '';
  let propsHtml = '<div class="cart-item__properties">';
  for (const [key, value] of Object.entries(properties)) {
    if (!key || key.startsWith('_')) continue;
    if (!value) continue;

    if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('/'))) {
      propsHtml += `<div class="cart-property"><strong>${escapeHtml(key)}:</strong> <a href="${value}" target="_blank" rel="noopener">Visualizza foto 📷</a></div>`;
    } else {
      propsHtml += `<div class="cart-property"><strong>${escapeHtml(key)}:</strong> ${escapeHtml(String(value))}</div>`;
    }
  }
  propsHtml += '</div>';
  return propsHtml;
}

/* ==========================================================================
   3. PRODUCT CUSTOMIZER & UPLOADER
   ========================================================================== */
function initProductCustomizer() {
  const form = document.querySelector('[data-product-customizer-form]');
  if (!form) return;

  const dropzone = form.querySelector('[data-upload-dropzone]');
  const fileInput = form.querySelector('[data-upload-input]');
  const previewArea = form.querySelector('[data-upload-preview]');
  const previewImg = form.querySelector('[data-preview-img]');
  const fileNameEl = form.querySelector('[data-file-name]');
  const removeFileBtn = form.querySelector('[data-remove-file]');

  if (dropzone && fileInput) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('is-dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        fileInput.files = files;
        handleFileSelect(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
      }
    });

    if (removeFileBtn) {
      removeFileBtn.addEventListener('click', () => {
        fileInput.value = '';
        if (previewArea) previewArea.classList.add('hidden');
        if (dropzone) dropzone.classList.remove('hidden');
      });
    }
  }

  function handleFileSelect(file) {
    if (!file) return;
    if (fileNameEl) fileNameEl.textContent = file.name;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (previewImg) previewImg.src = e.target.result;
        if (dropzone) dropzone.classList.add('hidden');
        if (previewArea) previewArea.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  }

  const variantSelect = form.querySelector('[data-variant-select]');
  const variantPills = form.querySelectorAll('[data-variant-pill]');
  const priceDisplay = form.querySelector('[data-product-price]');

  if (variantPills.length > 0 && variantSelect) {
    variantPills.forEach(pill => {
      pill.addEventListener('click', () => {
        variantPills.forEach(p => p.classList.remove('is-selected'));
        pill.classList.add('is-selected');
        const variantId = pill.getAttribute('data-variant-id');
        const variantPrice = pill.getAttribute('data-variant-price');
        
        variantSelect.value = variantId;
        if (priceDisplay && variantPrice) {
          priceDisplay.textContent = formatMoney(parseInt(variantPrice, 10));
        }
      });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
    }

    const formData = new FormData(form);

    fetch('/cart/add.js', {
      method: 'POST',
      body: formData
    })
    .then(res => {
      if (!res.ok) {
        throw new Error('Impossibile aggiungere il prodotto al carrello');
      }
      return res.json();
    })
    .then(() => {
      if (window.MusoCart) {
        window.MusoCart.open();
      } else {
        window.location.href = '/cart';
      }
    })
    .catch(err => {
      alert(err.message || 'Si è verificato un errore durante l’aggiunta al carrello.');
    })
    .finally(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
    });
  });
}

/* ==========================================================================
   4. BEFORE & AFTER COMPARISON SLIDER
   ========================================================================== */
function initBeforeAfterSliders() {
  const containers = document.querySelectorAll('[data-before-after]');
  
  containers.forEach(container => {
    const handle = container.querySelector('[data-ba-handle]');
    const afterOverlay = container.querySelector('[data-ba-after]');

    if (!handle || !afterOverlay) return;

    let isDragging = false;

    function setPosition(x) {
      const rect = container.getBoundingClientRect();
      let offsetX = x - rect.left;
      if (offsetX < 0) offsetX = 0;
      if (offsetX > rect.width) offsetX = rect.width;

      const percentage = (offsetX / rect.width) * 100;
      handle.style.left = `${percentage}%`;
      afterOverlay.style.clipPath = `polygon(0 0, ${percentage}% 0, ${percentage}% 100%, 0 100%)`;
    }

    function onStart(e) {
      isDragging = true;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      setPosition(x);
    }

    function onMove(e) {
      if (!isDragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      setPosition(x);
    }

    function onEnd() {
      isDragging = false;
    }

    handle.addEventListener('mousedown', onStart);
    container.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    handle.addEventListener('touchstart', onStart);
    container.addEventListener('touchstart', onStart);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  });
}

/* ==========================================================================
   5. ACCORDION COMPONENT
   ========================================================================== */
function initAccordions() {
  const accordions = document.querySelectorAll('[data-accordion-trigger]');

  accordions.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const parent = trigger.closest('[data-accordion-item]');
      if (!parent) return;

      const isOpen = parent.classList.contains('is-open');

      const group = parent.closest('[data-accordion-group]');
      if (group) {
        group.querySelectorAll('[data-accordion-item]').forEach(item => {
          item.classList.remove('is-open');
        });
      }

      if (!isOpen) {
        parent.classList.add('is-open');
      }
    });
  });
}

/* ==========================================================================
   6. PORTFOLIO GALLERY FILTERS
   ========================================================================== */
function initPortfolioFilters() {
  const filterBtns = document.querySelectorAll('[data-portfolio-filter]');
  const items = document.querySelectorAll('[data-portfolio-item]');

  if (filterBtns.length === 0) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const filter = btn.getAttribute('data-portfolio-filter');

      items.forEach(item => {
        const category = item.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          item.style.display = 'block';
          setTimeout(() => item.style.opacity = '1', 20);
        } else {
          item.style.opacity = '0';
          setTimeout(() => item.style.display = 'none', 300);
        }
      });
    });
  });
}

/* ==========================================================================
   7. QUANTITY SELECTOR UTILITIES
   ========================================================================== */
function initQuantitySelectors() {
  const selectors = document.querySelectorAll('.quantity-selector');
  selectors.forEach(sel => {
    const minusBtn = sel.querySelector('[data-qty-minus]');
    const plusBtn = sel.querySelector('[data-qty-plus]');
    const input = sel.querySelector('input');

    if (!input) return;

    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        const val = parseInt(input.value, 10) || 1;
        input.value = Math.max(1, val - 1);
      });
    }

    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        const val = parseInt(input.value, 10) || 1;
        input.value = val + 1;
      });
    }
  });
}

/* ==========================================================================
   HELPER UTILITIES
   ========================================================================== */
function formatMoney(cents) {
  if (typeof cents === 'string') cents = cents.replace('.', '');
  const value = (cents / 100).toFixed(2);
  return value.replace('.', ',') + ' €';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
