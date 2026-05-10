import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { AuthProvider } from './context/AuthContext'
import { AdminAuthProvider } from './context/AdminAuthContext'
import App from './App'
import './index.css'
import './App.css'

const theme = {
  token: {
    colorPrimary: '#1479FF',
    colorSuccess: '#22C55E',
    colorError: '#EF4444',
    colorWarning: '#F59E0B',
    fontFamily: 'Manrope, sans-serif',
    borderRadius: 8,
    colorBgContainer: '#ffffff',
    colorBgLayout: '#F6F8F8',
    colorBorder: '#E5E7EB',
    colorText: '#111827',
    colorTextSecondary: '#6B7280',
    fontSize: 14,
  },
  components: {
    Button: { borderRadius: 8, fontWeight: 600 },
    Card: { borderRadius: 12 },
    Input: { borderRadius: 8 },
    Select: { borderRadius: 8 },
    Table: { borderRadius: 12 },
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <AdminAuthProvider>
          <App />
        </AdminAuthProvider>
      </AuthProvider>
    </ConfigProvider>
  </React.StrictMode>
)

