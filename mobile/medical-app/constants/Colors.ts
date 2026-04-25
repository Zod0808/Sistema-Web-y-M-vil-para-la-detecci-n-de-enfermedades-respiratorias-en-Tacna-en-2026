/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [NativeWind](https://www.nativewind.dev/) uses Tailwind CSS.
 *
 * These constants match the Oklch values defined in globals.css but converted to Hex for React Native compatibility.
 */

const tintColorLight = "#0ea5e9" // Sky 500
const tintColorDark = "#38bdf8" // Sky 400

export const Colors = {
  light: {
    text: "#111827",
    background: "#f8fafc", // Slate 50
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    // Custom RespiCare Theme Colors
    primary: "#0891b2", // Cyan 600
    card: "#ffffff",
    border: "#e2e8f0",
    notification: "#ef4444",
  },
  dark: {
    text: "#f1f5f9", // Slate 100
    background: "#0f172a", // Slate 900
    tint: tintColorDark,
    icon: "#9ba1a6",
    tabIconDefault: "#9ba1a6",
    tabIconSelected: tintColorDark,
    // Custom RespiCare Theme Colors
    primary: "#06b6d4", // Cyan 500
    card: "#1e293b", // Slate 800
    border: "#334155", // Slate 700
    notification: "#ef4444",
  },
}
