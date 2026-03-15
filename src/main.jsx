import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Blueprint from "./Blueprint.jsx";

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<Blueprint />
	</StrictMode>,
);
