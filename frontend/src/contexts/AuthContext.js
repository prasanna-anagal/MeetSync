import { createContext, useContext } from "react";
import axios from "axios";

export const AuthContext = createContext();

const client = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api/v1/users",
});

export const AuthProvider = ({ children }) => {
  const register = async (name, username, password) => {
    const response = await client.post("/register", { name, username, password });
    return response.data;
  };

  const login = async (username, password) => {
    const response = await client.post("/login", { username, password });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }
    return response.data;
  };

  return (
    <AuthContext.Provider value={{ register, login }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
