import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { sendMessageToServer } from "./src/services/gemini.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route for chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { history } = req.body;
      if (!history) {
        return res.status(400).json({ error: "History is required" });
      }
      const response = await sendMessageToServer(history);
      res.json(response);
    } catch (error: any) {
      console.error("Chat API Error:", error);
      
      // Check for 429/Resource Exhausted
      if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED") || error.status === 429) {
        return res.status(429).json({ 
          error: "He agotado mi cuota de consultas gratuitas por ahora. Para tener acceso ilimitado, puede configurar una clave de API de nivel 'Paid' (con facturación) en el panel de Configuración > Secretos de AI Studio.",
          details: error.message 
        });
      }

      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:\${PORT}`);
  });
}

startServer();
