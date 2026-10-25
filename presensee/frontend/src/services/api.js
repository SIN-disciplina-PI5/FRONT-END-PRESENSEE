import axios from "axios"

const api = axios.create({
  // Conexão direta com o back-end real e o Neon DB na nuvem
  baseURL: "https://back-end-presensee.onrender.com/api" 
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api