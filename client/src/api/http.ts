import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { useUserStore } from '@/stores/user'
import { API_BASE_URL, API_TIMEOUT } from '@/constants'

// Create axios instance
const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
http.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    
    // Inject JWT token if available
    if (userStore.token && config.headers) {
      config.headers['Authorization'] = `Bearer ${userStore.token}`
    }
    
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor
http.interceptors.response.use(
  (response: AxiosResponse) => {
    // Handle successful responses
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      // Skip redirect for public API routes - they don't require auth
      // Also skip for public system endpoints
      const url = originalRequest.url || ''
      const isPublicRoute =
        url.startsWith('/public')
        || url === '/system/site-info'
        || url === '/system/access-config'
        || url === '/system/setup-status'
        || url === '/system/setup'
      
      if (!isPublicRoute) {
        const userStore = useUserStore()
        
        // Clear user data and redirect to login
        userStore.logout()
        
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
      
      return Promise.reject(error)
    }
    
    // Handle other errors
    return Promise.reject(error)
  }
)

// API wrapper
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => 
    http.get<T>(url, config).then(res => res.data),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    http.post<T>(url, data, config).then(res => res.data),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    http.put<T>(url, data, config).then(res => res.data),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    http.patch<T>(url, data, config).then(res => res.data),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => 
    http.delete<T>(url, config).then(res => res.data)
}

export default http
