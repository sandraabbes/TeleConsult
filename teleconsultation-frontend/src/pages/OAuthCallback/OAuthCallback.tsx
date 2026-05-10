import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../../context/AuthContext'

const OAuthCallback = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const userParam = params.get('user')

    console.log('OAuthCallback mounted')
    console.log('token:', token ? 'found' : 'missing')
    console.log('userParam:', userParam ? 'found' : 'missing')

    if (token && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam))
        console.log('userData:', userData)

        // store directly in localStorage first
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify({
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          userType: 'PATIENT'
        }))

        // then update context
        login(token, {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          userType: 'PATIENT'
        })

        // small delay to let context update before navigating
        setTimeout(() => {
          navigate('/patient/dashboard', { replace: true })
        }, 100)

      } catch (err) {
        console.error('OAuth callback error:', err)
        navigate('/login', { replace: true })
      }
    } else {
      console.log('Missing token or user — redirecting to login')
      navigate('/login', { replace: true })
    }
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#FFFFFF',
      gap: 16,
      fontFamily: 'Manrope'
    }}>
      <Spin size="large" />
      <p style={{ color: '#6B7280', fontSize: 14 }}>Authenticating...</p>
    </div>
  )
}

export default OAuthCallback