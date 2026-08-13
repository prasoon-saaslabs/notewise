import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SiteShell } from "./components/SiteShell";
import { HomePage } from "./pages/HomePage";
import { FeaturesPage } from "./pages/FeaturesPage";
import { DocsIndexPage, DocPage } from "./pages/DocsPage";
import { StoriesPage } from "./pages/StoriesPage";
import { DownloadPage } from "./pages/DownloadPage";
import { OpenSourcePage } from "./pages/OpenSourcePage";
import { PrivacyPage } from "./pages/PrivacyPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteShell />}>
          <Route index element={<HomePage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="docs" element={<DocsIndexPage />} />
          <Route path="docs/:topic" element={<DocPage />} />
          <Route path="stories" element={<StoriesPage />} />
          <Route path="download" element={<DownloadPage />} />
          <Route path="open-source" element={<OpenSourcePage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
