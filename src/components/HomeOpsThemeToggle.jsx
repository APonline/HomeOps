import { useEffect, useState } from "react";

const MoonIcon = () => (
    <svg className="homeops-theme-toggle__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 14.7A8.2 8.2 0 0 1 9.3 3a7 7 0 1 0 11.7 11.7Z" />
    </svg>
);

const SunIcon = () => (
    <svg className="homeops-theme-toggle__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
    </svg>
);

export default function HomeOpsThemeToggle({ className = "" }) {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("homeops-theme") || "dark";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("homeops-theme", theme);
    }, [theme]);

    return (
        <button
            type="button"
            className={`homeops-theme-toggle ${className}`.trim()}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
        >
            <span className={`homeops-theme-toggle__chip ${theme === "dark" ? "active" : ""}`}>
                <MoonIcon />
            </span>
            <span className={`homeops-theme-toggle__chip ${theme === "light" ? "active" : ""}`}>
                <SunIcon />
            </span>
        </button>
    );
}
