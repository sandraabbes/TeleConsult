import api from './axios'

// ─── PATIENT AUTH ───────────────────────────────────────
export const patientLogin = (email: string, password: string) =>
  api.post('/auth/login', { email, password })

export const patientVerify2FA = (userId: string, code: string) =>
  api.post('/auth/verify-2fa', { userId, code })

export const patientResend2FA = (userId: string) =>
  api.post('/auth/resend-2fa-code', { userId })

export const patientForgotPassword = (email: string) =>
  api.post('/auth/password/request-reset', { email })

export const patientVerifyResetCode = (email: string, resetCode: string) =>
  api.post('/auth/password/verify-code', { email, resetCode })

export const patientResetPassword = (
  email: string,
  resetCode: string,
  newPassword: string,
  confirmPassword: string
) => api.post('/auth/password/reset', { email, resetCode, newPassword, confirmPassword })

// ─── PATIENT REGISTER ───────────────────────────────────
// ✅ CORRECT ENDPOINT: /users/register NOT /auth/register
export const patientRegister = (data: {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  phone?: string
  birthdate?: string
  gender?: string
  acceptPrivacyPolicy?: boolean
}) => api.post('/users/register', data)

// ─── DOCTOR AUTH ────────────────────────────────────────
export const doctorLogin = (email: string, password: string) =>
  api.post('/auth/doctor/login-dr', { email, password })

export const doctorVerify = (email: string, code: string) =>
  api.post('/auth/doctor/verify', { email, code })

export const doctorResendCode = (email: string) =>
  api.post('/auth/doctor/resend-code', { email })

export const doctorForgotPassword = (email: string) =>
  api.post('/auth/doctor/request-reset', { email })

export const doctorResetPassword = (
  email: string,
  code: string,
  newPassword: string,
  confirmNewPassword: string
) => api.post('/auth/doctor/reset-password', { email, code, newPassword, confirmNewPassword })

export const doctorLogout = () =>
  api.post('/auth/doctor/logout')

// ─── DOCTOR REGISTER ────────────────────────────────────
export const doctorRegister = (formData: FormData) =>
  api.post('/register-doctors', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

// ─── OAUTH (patient only) ───────────────────────────────
export const googleLogin = () => {
  window.location.href = 'http://localhost:3045/api/auth/google/login'
}

export const facebookLogin = () => {
  window.location.href = 'http://localhost:3045/api/auth/facebook/login'
}
