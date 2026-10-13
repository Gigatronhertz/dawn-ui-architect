import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Brand fonts, bundled rather than pulled from Google Fonts at runtime.
import "@fontsource/anton/400.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "@fontsource/jost/600.css";
import "@fontsource/jost/700.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
