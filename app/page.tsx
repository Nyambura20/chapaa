"use client";

import App from "../src/App";
import { LanguageProvider } from "../src/lib/i18n";

export default function Page() {
  return (
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
}
