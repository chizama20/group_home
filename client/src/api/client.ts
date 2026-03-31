import axios from 'axios'

const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL,
  withCredentials: true, // Send httpOnly cookie on every request
})

// Redirect to /login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const path = window.location.pathname
      const publicPaths = ['/login', '/forgot-password', '/request-access']
      const isPublic = publicPaths.includes(path)
        || path.startsWith('/reset-password/')
        || path.startsWith('/invite/')
      if (path.startsWith('/admin') && path !== '/admin/login') {
        window.location.href = '/admin/login'
      } else if (!path.startsWith('/admin') && !isPublic) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
