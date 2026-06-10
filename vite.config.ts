import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages（プロジェクトサイト）配下で配信するため base を指定する。
export default defineConfig({
  base: "/MLIT-LINKS-uav-congestion/",
  plugins: [react(), tailwindcss()],
});
