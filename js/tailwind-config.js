/**
 * SIRO Inmobiliaria - Tailwind CSS CDN Configuration
 * Centralized theme extensions, brand colors, custom font families, border radiuses, and spacings.
 */
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-error": "#ffffff",
        "tertiary-container": "#261900",
        "error": "#ba1a1a",
        "primary-fixed-dim": "#bec6e0",
        "surface-container-highest": "#d3e4fe",
        "secondary-container": "#e5e2dd",
        "on-tertiary-fixed": "#261900",
        "primary": "#000000",
        "tertiary-fixed-dim": "#e9c176",
        "on-error-container": "#93000a",
        "outline-variant": "#c6c6cd",
        "inverse-surface": "#213145",
        "surface": "#f8f9ff",
        "on-surface-variant": "#45464d",
        "surface-container-lowest": "#ffffff",
        "secondary-fixed-dim": "#c9c6c2",
        "on-tertiary": "#ffffff",
        "on-secondary": "#ffffff",
        "on-tertiary-fixed-variant": "#5d4201",
        "on-secondary-fixed-variant": "#474743",
        "on-secondary-fixed": "#1c1c19",
        "surface-dim": "#cbdbf5",
        "secondary-fixed": "#e5e2dd",
        "on-secondary-container": "#656461",
        "error-container": "#ffdad6",
        "on-primary-fixed-variant": "#3f465c",
        "outline": "#76777d",
        "on-tertiary-container": "#a17f3b",
        "on-background": "#0b1c30",
        "inverse-primary": "#bec6e0",
        "on-primary-container": "#7c839b",
        "tertiary": "#000000",
        "on-primary-fixed": "#131b2e",
        "tertiary-fixed": "#ffdea5",
        "primary-container": "#131b2e",
        "primary-fixed": "#dae2fd",
        "surface-bright": "#f8f9ff",
        "surface-container-low": "#eff4ff",
        "surface-container-high": "#dce9ff",
        "inverse-on-surface": "#eaf1ff",
        "surface-tint": "#565e74",
        "on-primary": "#ffffff",
        "surface-container": "#e5eeff",
        "on-surface": "#0b1c30",
        "surface-variant": "#d3e4fe",
        "background": "#f8f9ff",
        "secondary": "#5f5e5b"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "base": "8px",
        "stack-lg": "48px",
        "margin-desktop": "64px",
        "gutter": "24px",
        "stack-md": "24px",
        "container-max": "1280px",
        "stack-sm": "12px",
        "margin-mobile": "20px"
      },
      fontFamily: {
        "label-md": ["Inter", "sans-serif"],
        "caption": ["Inter", "sans-serif"],
        "headline-md": ["Playfair Display", "serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "display-lg": ["Playfair Display", "serif"],
        "display-lg-mobile": ["Playfair Display", "serif"],
        "headline-lg": ["Playfair Display", "serif"]
      },
      fontSize: {
        "label-md": [
          "14px",
          {
            "lineHeight": "20px",
            "letterSpacing": "0.05em",
            "fontWeight": "600"
          }
        ],
        "caption": [
          "12px",
          {
            "lineHeight": "16px",
            "fontWeight": "400"
          }
        ],
        "headline-md": [
          "24px",
          {
            "lineHeight": "32px",
            "fontWeight": "600"
          }
        ],
        "body-md": [
          "16px",
          {
            "lineHeight": "24px",
            "fontWeight": "400"
          }
        ],
        "body-lg": [
          "18px",
          {
            "lineHeight": "28px",
            "fontWeight": "400"
          }
        ],
        "display-lg": [
          "56px",
          {
            "lineHeight": "64px",
            "letterSpacing": "-0.02em",
            "fontWeight": "700"
          }
        ],
        "display-lg-mobile": [
          "40px",
          {
            "lineHeight": "48px",
            "fontWeight": "700"
          }
        ],
        "headline-lg": [
          "32px",
          {
            "lineHeight": "40px",
            "fontWeight": "600"
          }
        ]
      }
    }
  }
};
