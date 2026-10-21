import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios'

// =====================================================
// API CONFIGURATION
// =====================================================

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5003'
).replace(/\/+$/, '')

// Ensure base URL contains exactly one /api suffix
const baseURL = API_URL.endsWith('/api')
  ? API_URL
  : `${API_URL}/api`

console.log('==========================================')
console.log('API Configuration')
console.log('Environment:', import.meta.env.MODE)
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)
console.log('Base URL:', baseURL)
console.log('==========================================')

// =====================================================
// AXIOS INSTANCE
// =====================================================

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000,
})

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    console.log(
      `API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
    )

    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      data: error.response?.data,
    })

    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    // Do not attempt refresh for missing requests, repeated
    // refresh attempts, or failed login/register requests.
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')

        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        const response = await axios.post(
          `${baseURL}/auth/refresh`,
          { refreshToken },
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
            timeout: 15000,
          }
        )

        const {
          token,
          refreshToken: newRefreshToken,
        } = response.data

        if (!token) {
          throw new Error('Refresh response did not include a token')
        }

        localStorage.setItem('token', token)

        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken)
        }

        originalRequest.headers.Authorization = `Bearer ${token}`

        return api(originalRequest)
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)

        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')

        window.location.href = '/login'

        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// =====================================================
// AUTH SERVICE
// =====================================================

export const authService = {
  register: (data: {
    name: string
    email: string
    password: string
  }) => api.post('/auth/register', data),

  login: (data: {
    email: string
    password: string
  }) => api.post('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  getProfile: () => api.get('/auth/profile'),

  updateProfile: (data: any) =>
    api.put('/auth/profile', data),

  changePassword: (data: {
    currentPassword: string
    newPassword: string
  }) => api.put('/auth/change-password', data),
}

// =====================================================
// TRANSACTION SERVICE
// =====================================================

export const transactionService = {
  getAll: (params?: any) =>
    api.get('/transactions', { params }),

  create: (data: any) =>
    api.post('/transactions', data),

  update: (id: string, data: any) =>
    api.put(`/transactions/${id}`, data),

  delete: (id: string) =>
    api.delete(`/transactions/${id}`),

  uploadCSV: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    return api.post('/transactions/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  getStats: () => api.get('/transactions/stats'),
}

// =====================================================
// BUDGET SERVICE
// =====================================================

export const budgetService = {
  getAll: (params?: any) =>
    api.get('/budgets', { params }),

  create: (data: any) =>
    api.post('/budgets', data),

  update: (id: string, data: any) =>
    api.put(`/budgets/${id}`, data),

  delete: (id: string) =>
    api.delete(`/budgets/${id}`),

  getAlerts: () => api.get('/budgets/alerts'),
}

// =====================================================
// ANALYTICS SERVICE
// =====================================================

export const analyticsService = {
  getDashboard: () => api.get('/analytics/dashboard'),

  getInsights: () => api.get('/analytics/insights'),

  getCashFlow: () => api.get('/analytics/cashflow'),
}

// =====================================================
// SAVINGS SERVICE
// =====================================================

export const savingsService = {
  getAll: () => api.get('/savings/goals'),

  create: (data: any) =>
    api.post('/savings/goals', data),

  update: (id: string, data: any) =>
    api.put(`/savings/goals/${id}`, data),

  delete: (id: string) =>
    api.delete(`/savings/goals/${id}`),

  addContribution: (
    id: string,
    data: { amount: number; description: string }
  ) => api.post(`/savings/goals/${id}/contribute`, data),
}

// =====================================================
// REPORT SERVICE
// =====================================================

export const reportService = {
  generate: (params?: any) =>
    api.get('/reports/generate', { params }),

  export: (params?: any) =>
    api.get('/reports/export', {
      params,
      responseType: 'blob',
    }),

  send: (data: any) =>
    api.post('/reports/send', data),
}

export default api
