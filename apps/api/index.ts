import express from "express";
import app from "./src/server.js";

const server = express().disable("x-powered-by");

server.use((req, _res, next) => {
  // Strip /index.ts prefix if Vercel appended it during rewrite
  if (req.url.startsWith("/index.ts")) {
    const rest = req.url.slice("/index.ts".length);
    req.url = rest ? (rest.startsWith("/") ? rest : "/" + rest) : "/";
  }
  // Also check x-matched-path header from Vercel
  const matched = req.headers["x-matched-path"];
  if (typeof matched === "string" && matched && !matched.includes("index.ts")) {
    req.url = matched;
  }
  next();
});

server.use(app);

export default server;
