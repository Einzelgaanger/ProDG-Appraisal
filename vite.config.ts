import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = (env.VITE_SITE_URL || "https://appraisal.vgg.app").replace(/\/$/, "");

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts: [
        "three60appraisal.onrender.com",
        "appraisal.vgg.app",
        "localhost",
      ],
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      {
        name: "html-inject-site-url",
        transformIndexHtml(html: string) {
          return html.replaceAll("__PRODG_SITE_URL__", siteUrl);
        },
      },
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
