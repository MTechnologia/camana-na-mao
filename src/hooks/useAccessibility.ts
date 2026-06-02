import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type FontSize = "small" | "medium" | "large";

interface AccessibilitySettings {
  fontSize: FontSize;
  readingMode: boolean;
  textSpacing: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: "medium",
  readingMode: false,
  textSpacing: false,
};

export const useAccessibility = () => {
  const [fontSize, setFontSizeState] = useState<FontSize>("medium");
  const [readingMode, setReadingMode] = useState(false);
  const [textSpacing, setTextSpacing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const applySettings = useCallback((settings: AccessibilitySettings) => {
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
  }, []);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);

      // If user is logged in, load from database
      if (user) {
        try {
          const { data, error } = await supabase
            .from("user_preferences")
            .select("font_size, reading_mode, text_spacing")
            .eq("user_id", user.id)
            .single();

          if (!error && data) {
            const settings: AccessibilitySettings = {
              fontSize: (data.font_size as FontSize) || "medium",
              readingMode: data.reading_mode || false,
              textSpacing: data.text_spacing || false,
            };
            setFontSizeState(settings.fontSize);
            setReadingMode(settings.readingMode);
            setTextSpacing(settings.textSpacing);
            applySettings(settings);

            // Sync to localStorage as cache
            localStorage.setItem("accessibilitySettings", JSON.stringify(settings));
          } else {
            // No preferences in DB, try localStorage
            loadFromLocalStorage();
          }
        } catch (err) {
          console.error("Error loading accessibility settings:", err);
          loadFromLocalStorage();
        }
      } else {
        // Not logged in - use localStorage
        loadFromLocalStorage();
      }

      setIsLoading(false);
    };

    const loadFromLocalStorage = () => {
      const savedSettings = localStorage.getItem("accessibilitySettings");
      if (savedSettings) {
        try {
          const settings: AccessibilitySettings = JSON.parse(savedSettings);
          setFontSizeState(settings.fontSize);
          setReadingMode(settings.readingMode);
          setTextSpacing(settings.textSpacing);
          applySettings(settings);
        } catch {
          applySettings(DEFAULT_SETTINGS);
        }
      } else {
        applySettings(DEFAULT_SETTINGS);
      }
    };

    loadSettings();
  }, [user, applySettings]);

  const saveSettings = useCallback(
    async (settings: AccessibilitySettings) => {
      // Always save to localStorage as cache/fallback
      localStorage.setItem("accessibilitySettings", JSON.stringify(settings));
      applySettings(settings);

      // If user is logged in, persist to database
      if (user) {
        try {
          const { error } = await supabase.from("user_preferences").upsert(
            {
              user_id: user.id,
              font_size: settings.fontSize,
              reading_mode: settings.readingMode,
              text_spacing: settings.textSpacing,
            },
            {
              onConflict: "user_id",
            },
          );

          if (error) {
            console.error("Error saving accessibility settings:", error);
          }
        } catch (err) {
          console.error("Error persisting accessibility settings:", err);
        }
      }
    },
    [user, applySettings],
  );

  const setFontSize = useCallback(
    (size: FontSize) => {
      setFontSizeState(size);
      saveSettings({ fontSize: size, readingMode, textSpacing });
    },
    [readingMode, textSpacing, saveSettings],
  );

  const toggleReadingMode = useCallback(() => {
    const newValue = !readingMode;
    setReadingMode(newValue);
    saveSettings({ fontSize, readingMode: newValue, textSpacing });
  }, [fontSize, readingMode, textSpacing, saveSettings]);

  const toggleTextSpacing = useCallback(() => {
    const newValue = !textSpacing;
    setTextSpacing(newValue);
    saveSettings({ fontSize, readingMode, textSpacing: newValue });
  }, [fontSize, readingMode, textSpacing, saveSettings]);

  return {
    fontSize,
    readingMode,
    textSpacing,
    isLoading,
    setFontSize,
    toggleReadingMode,
    toggleTextSpacing,
  };
};
