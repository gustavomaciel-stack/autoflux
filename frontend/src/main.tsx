import { EmpresaProvider } from "./context/EmpresaContext";
import { AuthProvider } from "./context/AuthContext";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./components/ActionStandards.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider><EmpresaProvider><App /></EmpresaProvider></AuthProvider>
  </React.StrictMode>,
);
