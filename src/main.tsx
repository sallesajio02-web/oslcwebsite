import { BrandLoading } from "./loading";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PublicSite } from "./public";
const Admin = React.lazy(() =>
  import("./admin").then((module) => ({ default: module.Admin })),
);
const Editor = React.lazy(() => import("./editor/Editor").then(module => ({ default: module.Editor })));
import "./styles.css";
import "./motion.css";
import "./creative.css";
import "./dropdowns.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/editor/*" element={<React.Suspense fallback={<BrandLoading label="Loading HTML Studio..." />}><Editor /></React.Suspense>} />
        <Route
          path="/admin/*"
          element={
            <React.Suspense
              fallback={<BrandLoading label="Loading administration..." />}
            >
              <Admin />
            </React.Suspense>
          }
        />
        <Route path="*" element={<PublicSite />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
