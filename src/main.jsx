import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      {({ profile, company, onSwitchCompany, onSignOut }) => (
        <App profile={profile} company={company} onSwitchCompany={onSwitchCompany} onSignOut={onSignOut} />
      )}
    </AuthGate>
  </React.StrictMode>
);
