import axios from "axios";

const api = axios.create({
  // Utiliza a variável de ambiente VITE_API_URL. 
  // Se não estiver definida no .env, usa a nuvem (Render) por padrão de segurança.
  baseURL: import.meta.env.VITE_API_URL || "https://back-end-presensee.onrender.com/api" 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;