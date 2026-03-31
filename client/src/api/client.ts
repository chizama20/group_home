import axios from 'axios'

const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL,
  withCredentials: true, // Send httpOnly cookie on every request
})

// Redirect to /login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) window.location.href = '/login'
    return Promise.reject(err)
  }
)

export default api
