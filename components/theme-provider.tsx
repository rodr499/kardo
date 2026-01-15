"use client";

import { useEffect } from "react";

export default function ThemeProvider() {
  useEffect(() => {
    // Load theme preference from localStorage on mount
    const savedTheme = localStorage.getItem("theme") || "light";
    const html = document.documentElement;
    html.setAttribute("data-theme", savedTheme);
  }, []);

  return null;
}
