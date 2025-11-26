import { useState, useEffect } from "react";

type FontSize = "small" | "medium" | "large";

interface AccessibilitySettings {
  fontSize: FontSize;
  readingMode: boolean;
  textSpacing: boolean;
}

export const useAccessibility = () => {
  const [fontSize, setFontSizeState] = useState<FontSize>("medium");
  const [readingMode, setReadingMode] = useState(false);
  const [textSpacing, setTextSpacing] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem("accessibilitySettings");
    if (savedSettings) {
      const settings: AccessibilitySettings = JSON.parse(savedSettings);
      setFontSizeState(settings.fontSize);
      setReadingMode(settings.readingMode);
      setTextSpacing(settings.textSpacing);
      applySettings(settings);
    }
  }, []);

  const applySettings = (settings: AccessibilitySettings) => {
    const root = document.documentElement;
    
    // Font size
    const fontSizeMap = {
      small: "14px",
      medium: "16px",
      large: "18px",
    };
    root.style.fontSize = fontSizeMap[settings.fontSize];

    // Reading mode (high contrast)
    if (settings.readingMode) {
      root.classList.add("reading-mode");
    } else {
      root.classList.remove("reading-mode");
    }

    // Text spacing
    if (settings.textSpacing) {
      root.classList.add("text-spacing");
    } else {
      root.classList.remove("text-spacing");
    }
  };

  const saveSettings = (settings: AccessibilitySettings) => {
    localStorage.setItem("accessibilitySettings", JSON.stringify(settings));
    applySettings(settings);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    saveSettings({ fontSize: size, readingMode, textSpacing });
  };

  const toggleReadingMode = () => {
    const newValue = !readingMode;
    setReadingMode(newValue);
    saveSettings({ fontSize, readingMode: newValue, textSpacing });
  };

  const toggleTextSpacing = () => {
    const newValue = !textSpacing;
    setTextSpacing(newValue);
    saveSettings({ fontSize, readingMode, textSpacing: newValue });
  };

  return {
    fontSize,
    readingMode,
    textSpacing,
    setFontSize,
    toggleReadingMode,
    toggleTextSpacing,
  };
};
