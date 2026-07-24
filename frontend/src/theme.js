import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#4f6bed",
    },
    secondary: {
      main: "#1a1a2e",
    },
    background: {
      default: "#f7f8fc",
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
});

export default theme;
