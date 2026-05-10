import adminApi from './adminAxios'

export const adminLogin = (email: string, password: string) =>
  adminApi.post('/auth/admin/login', { email, password })

export const getPendingDoctors = () =>
  adminApi.get('/admin/doctors/pending')

export const getAllDoctors = (status?: string) =>
  adminApi.get('/admin/doctors', { params: status ? { status } : {} })

export const getDoctorDocs = (doctorId: number | string) =>
  adminApi.get(`/admin/doctors/${doctorId}/docs`)

export const verifyDoctor = (
  doctorId: number | string,
  action: 'APPROVE' | 'REJECT',
  rejectionReason?: string
) =>
  adminApi.patch(`/admin/doctors/${doctorId}/verify`, { action, rejectionReason })

export const suspendDoctor = (doctorId: number | string) =>
  adminApi.patch(`/admin/doctors/${doctorId}/suspend`)
