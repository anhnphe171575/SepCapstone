"use client";

import * as React from "react";
import { ThemeProvider, createTheme, CssBaseline, responsiveFontSizes } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

type Props = { children: React.ReactNode };

let theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2563eb" }, // blue-600
    secondary: { main: "#7c3aed" }, // violet-600
    background: { default: "#f7f7fb", paper: "#ffffff" },
    divider: "#e6e6ef",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`,
    fontWeightMedium: 600,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: { variant: "contained", disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 10,
        },
      },
      variants: [
        {
          props: { variant: "outlined" },
          style: { borderColor: "#e6e6ef" },
        },
      ],
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: {
          borderColor: "#e6e6ef",
          borderRadius: 14,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 14 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: "none", borderBottom: "1px solid #e6e6ef" },
      },
    },
  },
});

theme = responsiveFontSizes(theme);

export default function MuiProvider({ children }: Props) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
}


