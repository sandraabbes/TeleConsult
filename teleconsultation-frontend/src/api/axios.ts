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

// Track whether a refresh is in progress to avoid multiple simultaneous refreshes
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

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
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip the forced redirect to /login when the user is on a video consultation page.
      // Those pages handle API errors gracefully (try-catch) and should not lose
      // the active session mid-call.  Also skip if the request was explicitly
      // marked as "skipAuthRedirect" (e.g. the medical-record existence check).
      const onConsultationPage = window.location.pathname.includes('/consultation/')
      const skipRedirect = originalRequest._skipAuthRedirect === true

      // Try to refresh the token if we have a refresh token (doctor flow)
      const refreshToken = localStorage.getItem(config.REFRESH_TOKEN_KEY)
      const userRaw = localStorage.getItem(config.USER_KEY)
      const user = userRaw ? JSON.parse(userRaw) : null
      const isDoctor = user?.userType === 'DOCTOR'

      if (refreshToken && isDoctor) {
        if (isRefreshing) {
          // Another refresh is in progress — queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              originalRequest._retry = true
              return api(originalRequest)
            })
            .catch((err) => Promise.reject(err))
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const response = await axios.post(
            `${config.API_BASE_URL}/auth/doctor/refresh`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          )

          const { accessToken: newToken, refreshToken: newRefreshToken } = response.data

          // Update stored tokens
          localStorage.setItem(config.TOKEN_KEY, newToken)
          if (newRefreshToken) {
            localStorage.setItem(config.REFRESH_TOKEN_KEY, newRefreshToken)
          }

          // Update the Authorization header for the failed request
          originalRequest.headers.Authorization = `Bearer ${newToken}`

          processQueue(null, newToken)

          return api(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError, null)

          // Refresh failed — clear tokens and redirect (unless on consultation page)
          if (!onConsultationPage && !skipRedirect) {
            localStorage.removeItem(config.TOKEN_KEY)
            localStorage.removeItem(config.REFRESH_TOKEN_KEY)
            localStorage.removeItem(config.USER_KEY)
            window.location.href = '/login'
          }

          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      // No refresh token available — fall back to old behavior
      if (!onConsultationPage && !skipRedirect) {
        localStorage.removeItem(config.TOKEN_KEY)
        localStorage.removeItem(config.REFRESH_TOKEN_KEY)
        localStorage.removeItem(config.USER_KEY)
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
