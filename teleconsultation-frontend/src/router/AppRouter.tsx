import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAdminAuth } from '../context/AdminAuthContext'
import type { ReactElement } from 'react'

import Login from '../pages/Login/Login'
import Register from '../pages/Register/Register'
import VerifyCode from '../pages/VerifyCode/VerifyCode'
import ForgotPassword from '../pages/ForgotPassword/ForgotPassword'
import SetNewPassword from '../pages/SetNewPassword/SetNewPassword'
import OAuthCallback from '../pages/OAuthCallback/OAuthCallback'
import Home from '../pages/home/home'

import PatientLayout from '../layouts/PatientLayout'
import DoctorLayout from '../layouts/DoctorLayout'
import AdminLayout from '../layouts/AdminLayout'

import PatientDashboard from '../pages/patient/Dashboard/Dashboard'
import FindDoctor from '../pages/patient/FindDoctor/FindDoctor'
import BookAppointment from '../pages/patient/BookAppointment/BookAppointment'
import PatientAppointments from '../pages/patient/MyAppointments/MyAppointments'
import PatientConsultations from '../pages/patient/MyConsultations/MyConsultations'
import PatientConsultationDetail from '../pages/patient/ConsultationDetail/ConsultationDetail'
import PatientNotifications from '../pages/patient/Notifications/Notifications'
import PatientWaitingRoom from '../pages/patient/WaitingRoom/WaitingRoom'
import PatientVideoConsultation from '../pages/patient/VideoConsultation/VideoConsultation'
import PatientProfile from '../pages/patient/Profile/Profile'
import PatientMessages from '../pages/patient/Messages/Messages'

import DoctorDashboard from '../pages/doctor/Dashboard/Dashboard'
import DoctorAppointments from '../pages/doctor/MyAppointments/MyAppointments'
import MyPatients from '../pages/doctor/MyPatients/MyPatients'
import PatientDetail from '../pages/doctor/PatientDetail/PatientDetail'
import DoctorConsultations from '../pages/doctor/MyConsultations/MyConsultations'
import DoctorConsultationDetail from '../pages/doctor/ConsultationDetail/ConsultationDetail'
import PostConsultationForm from '../pages/doctor/PostConsultationForm/PostConsultationForm'
import DoctorWaitingRoom from '../pages/doctor/WaitingRoom/WaitingRoom'
import DoctorVideoConsultation from '../pages/doctor/VideoConsultation/VideoConsultation'
import DoctorMessages from '../pages/doctor/Messages/Messages'
import DoctorNotifications from '../pages/doctor/Notifications/Notifications'
import Schedule from '../pages/doctor/Schedule/Schedule'
import DoctorProfile from '../pages/doctor/Profile/Profile'

import AdminLogin from '../pages/admin/AdminLogin'
import AdminDashboard from '../pages/admin/Dashboard'
import AdminVerifications from '../pages/admin/Verifications'
import AdminAllDoctors from '../pages/admin/AllDoctors'


const ProtectedRoute = ({ children, allowedType }: {
  children: ReactElement
  allowedType: 'PATIENT' | 'DOCTOR'
}) => {
  const { isAuthenticated, userType } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (userType !== allowedType) return <Navigate to="/login" replace />
  return children
}

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<VerifyCode />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/set-new-password" element={<SetNewPassword />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        <Route element={<ProtectedRoute allowedType="PATIENT"><PatientLayout /></ProtectedRoute>}>
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/patient/find-doctor" element={<FindDoctor />} />
          <Route path="/patient/book/:doctorId" element={<BookAppointment />} />
          <Route path="/patient/appointments" element={<PatientAppointments />} />
          <Route path="/patient/consultations" element={<PatientConsultations />} />
          <Route path="/patient/consultations/:id" element={<PatientConsultationDetail />} />
          <Route path="/patient/notifications" element={<PatientNotifications />} />
          <Route path="/patient/messages" element={<PatientMessages />} />
          <Route path="/patient/waiting-room/:appointmentId" element={<PatientWaitingRoom />} />
          <Route path="/patient/consultation/:appointmentId" element={<PatientVideoConsultation />} />
          <Route path="/patient/profile" element={<PatientProfile />} />
        </Route>

        <Route element={<ProtectedRoute allowedType="DOCTOR"><DoctorLayout /></ProtectedRoute>}>
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/appointments" element={<DoctorAppointments />} />
          <Route path="/doctor/patients" element={<MyPatients />} />
          <Route path="/doctor/patients/:id" element={<PatientDetail />} />
          <Route path="/doctor/consultations" element={<DoctorConsultations />} />
          <Route path="/doctor/consultations/:id" element={<DoctorConsultationDetail />} />
          <Route path="/doctor/consultations/:id/post" element={<PostConsultationForm />} />
          <Route path="/doctor/waiting-room/:appointmentId" element={<DoctorWaitingRoom />} />
          <Route path="/doctor/consultation/:appointmentId" element={<DoctorVideoConsultation />} />
          <Route path="/doctor/notifications" element={<DoctorNotifications />} />
          <Route path="/doctor/messages" element={<DoctorMessages />} />
          <Route path="/doctor/schedule" element={<Schedule />} />
          <Route path="/doctor/profile" element={<DoctorProfile />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/verifications" element={<AdminVerifications />} />
          <Route path="/admin/doctors" element={<AdminAllDoctors />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter

