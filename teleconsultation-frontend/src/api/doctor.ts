import api from './axios'

export interface DoctorProfile {
  id: string
  fullName: string
  email: string
  phone: string
  specialty: string
  experience: number
  practicePlace: string
  country: string
  city: string
  clinicAddress: string
  licenceImg: string
  identityImg: string
  role: string
  bio?: string
  consultationPrice?: number
  profilePhotoUrl?: string
  verificationStatus?: string
}

const BASE_PATH = '/register-doctors'

export const doctorApi = {
  getProfile: async (id: string | number) => {
    const response = await api.get<DoctorProfile>(`${BASE_PATH}/${id}`)
    return response.data
  },

  updateProfile: async (id: string | number, data: FormData | any) => {
    // Note: ms-doctors update expects FormData, as mapped in gateway
    const isFormData = data instanceof FormData
    const response = await api.patch<DoctorProfile>(
      `${BASE_PATH}/${id}`, 
      data,
      isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}
    )
    return response.data
  },

  deleteAccount: async (id: string | number) => {
    const response = await api.delete(`${BASE_PATH}/${id}`)
    return response.data
  },


}
