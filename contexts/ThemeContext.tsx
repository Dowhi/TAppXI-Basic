import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeName = "azul" | "esmeralda" | "ambar" | "fucsia";

interface ThemeContextType {
    isDark: boolean;
    themeName: ThemeName;
    highContrast: boolean;
    toggleTheme: () => void;
    setTheme: (isDark: boolean) => void;
    setThemeName: (name: ThemeName) => void;
    toggleHighContrast: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isDark, setIsDark] = useState<boolean>(() => {
        const saved = typeof window !== "undefined" ? localStorage.getItem("temaOscuro") : null;
        return saved === "true" || saved === null;
    });

    const [themeName, setThemeNameState] = useState<ThemeName>(() => {
        if (typeof window === "undefined") return "azul";
        const saved = localStorage.getItem("temaColor") as ThemeName | null;
        return saved || "azul";
    });

    const [highContrast, setHighContrast] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        const saved = localStorage.getItem("altoContraste");
        return saved === "true";
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add("dark");
            document.body.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
            document.body.classList.remove("dark");
        }
        localStorage.setItem("temaOscuro", isDark.toString());
    }, [isDark]);

    useEffect(() => {
        document.documentElement.dataset.theme = themeName;
        localStorage.setItem("temaColor", themeName);
    }, [themeName]);

    useEffect(() => {
        document.documentElement.dataset.highContrast = highContrast ? "true" : "false";
        localStorage.setItem("altoContraste", highContrast.toString());
    }, [highContrast]);

    const toggleTheme = () => {
        setIsDark((prev) => !prev);
    };

    const setTheme = (dark: boolean) => {
        setIsDark(dark);
    };

    const setThemeName = (name: ThemeName) => {
        setThemeNameState(name);
    };

    const toggleHighContrast = () => {
        setHighContrast((prev) => !prev);
    };

    return (
        <ThemeContext.Provider
            value={{
                isDark,
                themeName,
                highContrast,
                toggleTheme,
                setTheme,
                setThemeName,
                toggleHighContrast,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};

