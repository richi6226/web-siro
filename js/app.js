/**
 * SIRO Inmobiliaria - Main Application Logic
 * Implements premium transitions, mobile menu injections, scroll behaviors, and micro-animations.
 */

document.addEventListener("DOMContentLoaded", () => {
  initScrollBehavior();
  initMobileMenu();
  initLinkTracking();
});

/**
 * Manages premium navbar states on scroll events.
 * Adds background glassmorphism shift and shadow refinements when scrolled.
 */
function initScrollBehavior() {
  const nav = document.querySelector("nav") || document.querySelector("header.fixed");
  if (!nav) return;

  const handleScroll = () => {
    if (window.scrollY > 20) {
      nav.classList.add("shadow-md", "glass-effect");
      nav.classList.remove("shadow-sm", "bg-surface/95");
    } else {
      nav.classList.remove("shadow-md", "glass-effect");
      nav.classList.add("shadow-sm", "bg-surface/95");
    }
  };

  window.addEventListener("scroll", handleScroll);
  // Run once initially
  handleScroll();
}

/**
 * Dynamically builds, injects, and controls a beautiful mobile drawer navigation menu.
 * Ensures the layout is pure and Separation of Concerns is maintained.
 */
function initMobileMenu() {
  // Find mobile toggles
  const toggles = document.querySelectorAll("button.md\\:hidden, nav button:not(.hidden)");
  if (!toggles.length) return;

  // Extract navigation items from the desktop navbar to ensure zero maintenance desyncs
  const desktopLinks = document.querySelectorAll("nav a, header.fixed nav a");
  const menuItems = [];
  
  desktopLinks.forEach(link => {
    if (link.textContent.trim()) {
      menuItems.push({
        text: link.textContent.trim(),
        href: link.getAttribute("href"),
        isActive: link.classList.contains("text-primary") || link.getAttribute("aria-current") === "page"
      });
    }
  });

  // If no items found, define default fallback pages
  if (menuItems.length === 0) {
    menuItems.push(
      { text: "Inicio", href: "index.html", isActive: window.location.pathname.endsWith("index.html") || window.location.pathname === "/" },
      { text: "Servicios", href: "servicios.html", isActive: window.location.pathname.endsWith("servicios.html") },
      { text: "Propiedades", href: "propiedades.html", isActive: window.location.pathname.endsWith("propiedades.html") },
      { text: "Contacto", href: "contacto.html", isActive: window.location.pathname.endsWith("contacto.html") }
    );
  }

  // Create mobile drawer overlay container
  const drawer = document.createElement("div");
  drawer.id = "mobile-navigation-drawer";
  drawer.className = "fixed inset-0 z-50 bg-[#131b2e]/98 backdrop-blur-xl transform translate-x-full transition-transform duration-500 ease-in-out flex flex-col justify-center items-center";
  
  // Create close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "absolute top-6 right-6 text-white p-2 focus:outline-none";
  closeBtn.innerHTML = '<span class="material-symbols-outlined text-[36px]">close</span>';
  drawer.appendChild(closeBtn);

  // Create links container
  const navContainer = document.createElement("div");
  navContainer.className = "flex flex-col gap-8 text-center w-full px-8";
  
  menuItems.forEach(item => {
    const link = document.createElement("a");
    link.href = item.href;
    link.className = `text-2xl font-bold tracking-wide transition-all duration-300 ${
      item.isActive 
        ? "text-[#d4b26f] scale-105" 
        : "text-white/80 hover:text-white hover:scale-105"
    }`;
    link.textContent = item.text;
    navContainer.appendChild(link);
  });

  // Create premium CTA for mobile drawer
  const ctaBtn = document.createElement("a");
  ctaBtn.href = "contacto.html";
  ctaBtn.className = "mt-8 inline-block btn-gold px-8 py-4 rounded font-bold text-lg transition-all transform hover:scale-105 shadow-lg max-w-[240px] mx-auto";
  ctaBtn.textContent = "Contáctanos";
  navContainer.appendChild(ctaBtn);

  drawer.appendChild(navContainer);
  document.body.appendChild(drawer);

  // Toggle events
  const openDrawer = () => {
    drawer.classList.remove("translate-x-full");
    document.body.style.overflow = "hidden"; // Prevent background scroll
  };

  const closeDrawer = () => {
    drawer.classList.add("translate-x-full");
    document.body.style.overflow = ""; // Restore background scroll
  };

  toggles.forEach(toggle => {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      openDrawer();
    });
  });

  closeBtn.addEventListener("click", closeDrawer);
  
  // Close drawer on clicking links
  drawer.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeDrawer);
  });
}

/**
 * Tracks and animates navbar link markers dynamically based on path location.
 */
function initLinkTracking() {
  const currentPath = window.location.pathname.split("/").pop();
  const allNavLinks = document.querySelectorAll("nav a, header.fixed nav a");
  
  allNavLinks.forEach(link => {
    // Skip tracking for logo links or anchors that contain an image
    if (link.classList.contains("logo-link") || link.querySelector("img")) return;
    
    const href = link.getAttribute("href");
    if (href === currentPath || (currentPath === "" && href === "index.html")) {
      link.classList.add("text-primary", "font-bold", "border-b-2", "border-tertiary-container", "scale-95");
      link.classList.remove("text-on-surface-variant", "font-medium");
    }
  });
}
