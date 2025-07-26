import { customStyles } from "./styles";
import { setupSearchFilter } from "./utils/searchFilter";

export const swaggerUiOptions = {
  explorer: true,
  customCss: customStyles,
  customSiteTitle: "LiveLink API Documentation",
  customfavIcon: "/favicon.ico",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    docExpansion: "none",
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    tagsSorter: "alpha",
    operationsSorter: "alpha",
    onComplete: () => {
      setupSearchFilter();

      const darkModeToggle = document.createElement("button");
      darkModeToggle.className = "dark-mode-toggle";
      
      const applyTheme = (theme: string) => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem("theme", theme);
        darkModeToggle.innerText = theme === "dark" ? "☀️" : "🌙";
      };

      darkModeToggle.onclick = () => {
        const currentTheme = localStorage.getItem("theme");
        applyTheme(currentTheme === "dark" ? "light" : "dark");
      };

      document.body.appendChild(darkModeToggle);

      // Apply theme on initial load
      applyTheme(localStorage.getItem("theme") || 'light');
    },
  },
};