import axios from 'axios'
import config from '../config/global.config'

const ADMIN_TOKEN_KEY = 'admin_token'

const adminApi = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

adminApi.interceptors.request.use(
  (requestConfig) => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY)
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`
    }
    return requestConfig
  },
  (error) => Promise.reject(error)
)

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY)
      localStorage.removeItem('admin_user')
      window.location.href = '/admin/login'
    }
    return Promise.reject(error)
  }
)

export default adminApi
