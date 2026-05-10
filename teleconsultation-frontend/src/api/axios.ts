import axios from 'axios'
import config from '../config/global.config'

const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (requestConfig) => {
    const token = localStorage.getItem(config.TOKEN_KEY)
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`
    }
    return requestConfig
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(config.TOKEN_KEY)
      localStorage.removeItem(config.USER_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
