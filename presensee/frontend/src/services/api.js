import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://back-end-presensee.onrender.com/api",
  timeout: 35000, // 35s para suportar o tempo de despertar (cold start) do Render/Neon
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se o token expirar ou for inválido (401), limpa e redireciona para o login (exceto na própria tela de login)
    if (error.response?.status === 401 && !window.location.pathname.includes("/login")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;