/**
 * SIRO Inmobiliaria - Properties Catalog & Real-time Filter System
 * Provides simulated high-end property search in Gipuzkoa with modern responsive layouts.
 */

// Comprehensive portfolio of premium mock properties in Gipuzkoa
const PROPORTIES_PORTFOLIO = [
  {
    id: 1,
    title: "Villa Horizon | Vistas al Cantábrico",
    type: "chalet",
    typeLabel: "Chalet / Villa de Lujo",
    location: "zarautz",
    locationLabel: "Zarautz, Gipuzkoa",
    price: 1450000,
    priceStr: "1.450.000 €",
    beds: 4,
    baths: 4,
    size: 320,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDUQNGg5Xklf3jOGIoSgxlGU2ENIal7BlzCvpbtFrpR-Qjn-yXK2piw1eSYzwyKFw1TXfvKUI6UVUL7SqyAggkQPA-vAA2FbBYaqojqM6eA5cy8CW56rlMfo5DQzGBaWbanaxEyk6h8nxL6gby1sq--wfqT735rlka6L5RI8is2mt4DuIvb7fDhvjf7FVDJBA7J1rL0C-V9lrxPNol9O3_8McpQm6WY_SIJN6PgqhsSmiKVbMGVRVsaWXcePMRKoWN6rWzhNgpajjk",
    tag: "Exclusivo"
  },
  {
    id: 2,
    title: "Ático Miracruz | Terraza Panorámica",
    type: "atico",
    typeLabel: "Ático Premium",
    location: "donostia",
    locationLabel: "Donostia - San Sebastián",
    price: 890000,
    priceStr: "890.000 €",
    beds: 3,
    baths: 2,
    size: 140,
    image: "https://lh3.googleusercontent.com/aida/ADBb0ugZaUl9Sz4EWCU5Zs-0S_ZX8aynCRBsOcGONQAprTYWtNDF7pJ9TedIYPrjG_irCPdtHrU0Jg79U7UY0xw6bUpAYDcU5Fi0pxjwK2JK0Bi8yKludeNC6Zkb3qvz9BQbthD9_fXRJbIVc2dGGAtjLf_DcU6rCvLosQ4D5-6wnNll267ZgCL1mliDMezkxapngdQg-cTdARFB8mhRkvPHCZ95YRtueML2ZxmBWgjHc_Q7knTcYLpT67ANT7s",
    tag: "Vendido"
  },
  {
    id: 3,
    title: "Apartamento Kursaal | Frente al Mar",
    type: "piso",
    typeLabel: "Apartamento Contemporáneo",
    location: "donostia",
    locationLabel: "Donostia - San Sebastián",
    price: 480000,
    priceStr: "480.000 €",
    beds: 2,
    baths: 2,
    size: 95,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDpIUSHI-cg0404LLJv9ioM0OuiD5a16aUB4Huvvl4Zqz58AgvgMdipyIqdlBfpBMwP4avteyrgYq8lWKZbkw68xpaIHXj0M0hPg03Fakm8KNciQWRh5MTvNSiq5fRm84myASBe_9vwoCFvvnUrqKTKQjl1Dy2Q-I8qMWaBi6y5zYnYX_OtI9QIPMMB9tyBDXmDV7EUlM8GFYDL33Vyt5by0XZEk0LKp0nhk_g133kL-USzD9_LFDEaPbuBVz_ueNPUhJYS2n9Hlas",
    tag: "Novedad"
  },
  {
    id: 4,
    title: "Hacienda Jaizkibel | Serenidad Natural",
    type: "chalet",
    typeLabel: "Villa de Campo Premium",
    location: "hondarribia",
    locationLabel: "Hondarribia, Gipuzkoa",
    price: 1800000,
    priceStr: "1.800.000 €",
    beds: 5,
    baths: 5,
    size: 450,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBWH9HnWGTlbTlAFo_3yd232oHNevrBYS3FqCrJrIDIVFbszkSe8EjZ2dAIyL0Ty7O5HG-kS3G6Bcvn_EfyEwlkgtf6jz-FZfNg-HtSFeLFD5TK8EdfwVbACfmLiX-qxEOk1jixZOga1ev0_po3kmw7nJLxHRW5ekga7Nf1KF8K6EUxjmrKk7W7IyT8Khlyc4Vvmv-hmRr1j0O9W_TfaoOtqDzLvHw0JXYSHOn1dUmU3izTUx-buSlF1rAmzVkUHkySn1LwjKLNh9A",
    tag: "Exclusivo"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  const filterForm = document.querySelector("form");
  const catalogSection = document.querySelector("main section.pb-stack-lg");
  
  if (!catalogSection) return;

  // Let's set up the properties catalog dynamic wrapper
  catalogSection.id = "properties-catalog";
  catalogSection.innerHTML = `
    <div id="catalog-container" class="w-full flex flex-col gap-12">
      <!-- Active Results Counter -->
      <div class="flex justify-between items-center border-b border-outline-variant/30 pb-4">
        <p class="font-body-md text-on-surface-variant" id="results-counter">Mostrando 4 propiedades exclusivas</p>
        <div class="flex gap-2">
          <button class="p-2 border border-outline-variant rounded bg-surface hover:bg-secondary-container/30 transition-all">
            <span class="material-symbols-outlined text-[20px]">grid_view</span>
          </button>
        </div>
      </div>

      <!-- Properties Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter" id="properties-grid">
        <!-- Rendered dynamically -->
      </div>

      <!-- Empty/Placeholder State -->
      <div id="empty-state" class="hidden text-center flex-col items-center max-w-lg mx-auto bg-surface-container-low p-stack-lg rounded-xl border border-outline-variant/20 shadow-sm py-16">
        <span class="material-symbols-outlined text-6xl text-on-tertiary-container mb-stack-sm" style="font-variation-settings: 'FILL' 0;">real_estate_agent</span>
        <h2 class="font-headline-lg text-headline-lg text-primary mb-base">Sin resultados exactos</h2>
        <p class="font-body-md text-body-md text-on-surface-variant mb-stack-md" id="empty-state-text">
          Actualmente estamos curando nuestro portfolio. No hay propiedades que coincidan exactamente con sus criterios de filtrado.
        </p>
        <button id="reset-filters" class="bg-primary text-on-primary px-6 py-3 rounded hover:bg-inverse-surface transition-colors font-label-md text-label-md">
          Restablecer Filtros
        </button>
      </div>
    </div>
  `;

  // Filter elements
  const typeSelect = document.getElementById("property-type");
  const locationSelect = document.getElementById("location");
  const priceSelect = document.getElementById("price");
  const searchBtn = filterForm.querySelector("button");

  // Initial render
  renderProperties(PROPORTIES_PORTFOLIO);

  // Search button event
  if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      applyFilters();
    });
  }

  // Live filter changes for premium responsiveness
  [typeSelect, locationSelect, priceSelect].forEach(select => {
    if (select) {
      select.addEventListener("change", applyFilters);
    }
  });

  // Reset filters button event
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "reset-filters") {
      if (typeSelect) typeSelect.value = "";
      if (locationSelect) locationSelect.value = "";
      if (priceSelect) priceSelect.value = "";
      applyFilters();
    }
  });

  /**
   * Evaluates filter values and updates properties listing.
   */
  function applyFilters() {
    const selectedType = typeSelect ? typeSelect.value : "";
    const selectedLocation = locationSelect ? locationSelect.value : "";
    const selectedPriceRange = priceSelect ? priceSelect.value : "";

    let filtered = PROPORTIES_PORTFOLIO;

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(p => p.type === selectedType);
    }

    // Filter by location
    if (selectedLocation) {
      filtered = filtered.filter(p => p.location === selectedLocation);
    }

    // Filter by price range
    if (selectedPriceRange) {
      if (selectedPriceRange === "0-500k") {
        filtered = filtered.filter(p => p.price <= 500000);
      } else if (selectedPriceRange === "500k-1m") {
        filtered = filtered.filter(p => p.price > 500000 && p.price <= 1000000);
      } else if (selectedPriceRange === "1m+") {
        filtered = filtered.filter(p => p.price > 1000000);
      }
    }

    renderProperties(filtered);
  }

  /**
   * Dynamic template generation and rendering inside grid.
   */
  function renderProperties(properties) {
    const grid = document.getElementById("properties-grid");
    const resultsCounter = document.getElementById("results-counter");
    const emptyState = document.getElementById("empty-state");

    if (!grid) return;

    // Clear grid
    grid.innerHTML = "";

    // Update Counter
    if (resultsCounter) {
      resultsCounter.textContent = `Mostrando ${properties.length} propiedad${properties.length === 1 ? "" : "es"} exclusiva${properties.length === 1 ? "" : "es"}`;
    }

    if (properties.length === 0) {
      grid.classList.add("hidden");
      if (emptyState) emptyState.classList.remove("hidden");
      return;
    }

    grid.classList.remove("hidden");
    if (emptyState) emptyState.classList.add("hidden");

    properties.forEach(p => {
      const card = document.createElement("div");
      card.className = "bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group opacity-0 scale-95 transform";
      
      // Let's force an animation trigger
      setTimeout(() => {
        card.classList.remove("opacity-0", "scale-95");
        card.classList.add("opacity-100", "scale-100");
      }, 50);

      card.innerHTML = `
        <div class="relative overflow-hidden h-64 bg-secondary-container">
          <img src="${p.image}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <span class="absolute top-4 left-4 bg-[#131b2e] text-[#e9c176] font-bold text-xs uppercase px-3 py-1 rounded tracking-wider shadow">
            ${p.tag}
          </span>
          <span class="absolute bottom-4 right-4 bg-white/90 backdrop-blur text-primary font-headline-md font-bold text-sm px-3 py-1 rounded">
            ${p.priceStr}
          </span>
        </div>
        <div class="p-6 flex-grow flex flex-col justify-between gap-4">
          <div class="flex flex-col gap-2">
            <span class="text-xs font-bold text-on-surface-variant/80 uppercase tracking-widest">${p.typeLabel}</span>
            <h3 class="font-headline-md text-headline-md text-primary tracking-tight leading-snug">${p.title}</h3>
            <div class="flex items-center gap-1 text-on-surface-variant text-sm mt-1">
              <span class="material-symbols-outlined text-[16px]">location_on</span>
              <span>${p.locationLabel}</span>
            </div>
          </div>
          
          <div class="flex justify-between items-center pt-4 border-t border-outline-variant/20 text-on-surface-variant/90 text-sm">
            <div class="flex items-center gap-1">
              <span class="material-symbols-outlined text-[18px]">bed</span>
              <span>${p.beds} Hab.</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="material-symbols-outlined text-[18px]">bathtub</span>
              <span>${p.baths} Baños</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="material-symbols-outlined text-[18px]">square_foot</span>
              <span>${p.size} m²</span>
            </div>
          </div>
          
          <a href="contacto.html" class="mt-2 w-full text-center inline-flex items-center justify-center py-3 bg-[#e9c176] hover:bg-[#d4ae6a] text-[#131b2e] font-bold font-label-md text-label-md rounded transition-colors shadow-sm">
            Solicitar Información
          </a>
        </div>
      `;

      grid.appendChild(card);
    });
  }
});
