import React, { useState } from 'react';
import { Input, Button, message, Select, Upload, DatePicker, Checkbox } from 'antd';
import { TeamOutlined, CalendarOutlined, SafetyOutlined, ArrowLeftOutlined, CheckCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { patientRegister, doctorRegister } from '../../api/auth';
import teleconsultLogo from '../../assets/images/Teleconsult.png';
import type { Dayjs } from 'dayjs';
import './Register.css';
 
const { Option } = Select;

const features = [
  { icon: <TeamOutlined />, text: "Access 200+ certified specialists" },
  { icon: <CalendarOutlined />, text: "Book appointments at anytime" },
  { icon: <SafetyOutlined />, text: "Your data is 100% secure and private" },
];

const requirements = [
  { text: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { text: 'At least one uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { text: 'At least one number', test: (p: string) => /[0-9]/.test(p) },
];

const Register: React.FC = () => {
  const [userType, setUserType] = useState<'PATIENT' | 'DOCTOR'>('PATIENT');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Patient State
  const [patientData, setPatientData] = useState({
    firstName: '', lastName: '', email: '', phone: '', birthdate: null as Dayjs | null, gender: '', password: '', confirmPassword: '', acceptPrivacyPolicy: false
  });

  // Doctor State: Step 1
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  // Doctor State: Step 2
  const [specialty, setSpecialty] = useState('');
  const [experience, setExperience] = useState<number>(0);
  const [practicePlace, setPracticePlace] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');

  // Doctor State: Step 3
  const [licenceFile, setLicenceFile] = useState<File | null>(null);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePatientContinue = () => {
    const { firstName, lastName, email: pEmail } = patientData;
    if (!firstName || !lastName || !pEmail) {
      message.error('Please fill in all required fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(pEmail)) {
      message.error('Please enter a valid email address');
      return;
    }
    setStep(2);
  };

  const handlePatientRegister = async () => {
    const { firstName, lastName, email: pEmail, phone, birthdate, gender, password: pPassword, confirmPassword: pConfirmPassword, acceptPrivacyPolicy } = patientData;
    
    if (!pPassword || !pConfirmPassword) {
      message.error('Please fill in all required fields');
      return;
    }
    if (pPassword !== pConfirmPassword) {
      message.error('Passwords do not match');
      return;
    }
    const allPassed = requirements.every(r => r.test(pPassword));
    if (!allPassed) {
      message.error('Password does not meet all requirements');
      return;
    }
    if (!birthdate) {
      message.error('Birthdate is required');
      return;
    }
    if (!acceptPrivacyPolicy) {
      message.error('You must accept the Privacy Policy to register');
      return;
    }

    setLoading(true);
    try {
      await patientRegister({
        firstName,
        lastName,
        email: pEmail,
        password: pPassword,
        confirmPassword: pConfirmPassword,
        phone,
        birthdate: birthdate.format('YYYY-MM-DD'),
        gender,
        acceptPrivacyPolicy
      });
      message.success('Account created successfully! Please sign in.');
      navigate('/login');
    } catch (err: any) {
      message.error(err.response?.data?.message || err.response?.data || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorStep1 = () => {
    if (!fullName || !email || !phone) {
      message.error('Please fill in all required fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      message.error('Please enter a valid email address');
      return;
    }
    setStep(2);
  };

  const handleDoctorStep2 = () => {
    if (!specialty || !practicePlace || !clinicAddress) {
      message.error('Please fill in all required fields');
      return;
    }
    setStep(3);
  };

  const handleDoctorRegister = async () => {
    if (!licenceFile || !identityFile) {
      message.error('Please upload both licence and identity documents');
      return;
    }
    if (!password || !confirmPassword) {
      message.error('Please enter your password');
      return;
    }
    if (password !== confirmPassword) {
      message.error('Passwords do not match');
      return;
    }
    const allPassed = requirements.every(r => r.test(password));
    if (!allPassed) {
      message.error('Password does not meet all requirements');
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);
      formData.append('specialty', specialty);
      formData.append('experience', String(experience));
      formData.append('practicePlace', practicePlace);
      formData.append('country', country);
      formData.append('city', city);
      formData.append('clinicAddress', clinicAddress);
      formData.append('licenceImg', licenceFile);
      formData.append('identityImg', identityFile);

      await doctorRegister(formData);
      message.success('Registration submitted! Your documents will be reviewed.');
      navigate('/login');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLicenceUpload = (file: File) => {
    setLicenceFile(file);
    return false;
  };

  const handleIdentityUpload = (file: File) => {
    setIdentityFile(file);
    return false;
  };

  return (
    <div className="register-page">
      <div className="register-left-panel">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div>
            <img
              src={teleconsultLogo}
              alt="Teleconsult"
              style={{ cursor: 'pointer', filter: 'brightness(0) invert(1)', maxWidth: 180, width: '100%', marginBottom: 32 }}
              onClick={() => navigate('/')}
            />
            <div style={{ color: '#FFF', opacity: 0.7, textTransform: 'uppercase', letterSpacing: 2, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>JOIN US</div>
            <h1 style={{ color: '#FFF', fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 12 }}>Join TeleConsult today</h1>
            <p style={{ color: '#FFF', opacity: 0.75, fontSize: 13, marginBottom: 32 }}>Create your account and start your healthcare journey with certified professionals.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(8px)' }}>
                <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: 'white' }}>{f.icon}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="register-right-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 48px', flexShrink: 0 }}>
          <a href="#" style={{ color: '#6B7280', fontSize: 14, fontWeight: 500 }}>Help Center</a>
          <Button type="default" style={{ color: '#1479FF', borderColor: '#1479FF', borderRadius: 24, fontWeight: 600, background: 'transparent' }}>Contact Clinic</Button>
        </div>
        <div className="register-form-area">
          <div className="register-form-container">
            <div className="register-type-header" key={userType}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1479FF', marginBottom: 4 }}>
                {userType === 'PATIENT' ? 'Create your account' : 'Join as a Doctor'}
              </h1>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
                {userType === 'PATIENT'
                  ? (step === 1 ? "Let's start with your basic information" : "Now set up your login credentials")
                  : (step === 1 ? "Start with your personal information" : step === 2 ? "Tell us about your medical practice" : "Upload your documents and set your password")}
              </p>

              <div className="register-steps" style={{ marginBottom: 16 }}>
                {userType === 'PATIENT' ? (
                  <>
                    <div className={`register-step-dot ${step === 1 ? 'active' : 'done'}`} />
                    <div className={`register-step-dot ${step === 2 ? 'active' : ''}`} />
                  </>
                ) : (
                  <>
                    <div className={`register-step-dot ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`} />
                    <div className={`register-step-dot ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`} />
                    <div className={`register-step-dot ${step === 3 ? 'active' : ''}`} />
                  </>
                )}
              </div>
            </div>

            <div
              className={`auth-toggle ${userType === 'DOCTOR' ? 'auth-toggle--doctor' : ''}`}
              style={{ marginBottom: 16 }}
            >
              <span className="auth-toggle-thumb" aria-hidden />
              <button
                type="button"
                className={`auth-toggle-btn ${userType === 'PATIENT' ? 'active' : ''}`}
                onClick={() => { setUserType('PATIENT'); setStep(1); }}
              >
                Patient
              </button>
              <button
                type="button"
                className={`auth-toggle-btn ${userType === 'DOCTOR' ? 'active' : ''}`}
                onClick={() => { setUserType('DOCTOR'); setStep(1); }}
              >
                Doctor
              </button>
            </div>

            <div className="form-fade-in" key={`${userType}-${step}`}>
              {userType === 'PATIENT' && step === 1 && (
                <>
                  <div className="form-row">
                    <div className="input-group half">
                      <label className="auth-label">First Name</label>
                      <Input style={{ height: 38 }} value={patientData.firstName} onChange={e => setPatientData({...patientData, firstName: e.target.value})} />
                    </div>
                    <div className="input-group half">
                      <label className="auth-label">Last Name</label>
                      <Input style={{ height: 38 }} value={patientData.lastName} onChange={e => setPatientData({...patientData, lastName: e.target.value})} />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="auth-label">Email Address</label>
                    <Input style={{ height: 38 }} value={patientData.email} onChange={e => setPatientData({...patientData, email: e.target.value})} />
                  </div>

                  <div className="input-group">
                    <label className="auth-label">Phone Number</label>
                    <Input style={{ height: 38 }} value={patientData.phone} onChange={e => setPatientData({...patientData, phone: e.target.value})} />
                  </div>

                  <div className="form-row">
                    <div className="input-group half">
                      <label className="auth-label">Date of Birth</label>
                      <DatePicker 
                        style={{ height: 38, width: '100%' }}
                        format="YYYY-MM-DD"
                        value={patientData.birthdate}
                        onChange={date => setPatientData({...patientData, birthdate: date})}
                      />
                    </div>
                    <div className="input-group half">
                      <label className="auth-label">Gender</label>
                      <Select 
                        style={{ height: 38, width: '100%' }}
                        value={patientData.gender || undefined}
                        placeholder="Select Gender"
                        onChange={val => setPatientData({...patientData, gender: val})}
                      >
                        <Option value="Male">Male</Option>
                        <Option value="Female">Female</Option>
                      </Select>
                    </div>
                  </div>

                  <Button className="auth-primary-btn" type="primary" onClick={handlePatientContinue}>
                    Continue &rarr;
                  </Button>
                  
                  <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
                    <span style={{ color: '#6B7280' }}>Already have an account? </span>
                    <Link to="/login" style={{ color: '#1479FF', fontWeight: 600 }}>Sign in</Link>
                  </div>
                </>
              )}

              {userType === 'PATIENT' && step === 2 && (
                <>
                  <div className="input-group">
                    <label className="auth-label">Password</label>
                    <Input.Password style={{ height: 38 }} value={patientData.password} onChange={e => setPatientData({...patientData, password: e.target.value})} />
                  </div>

                  <div className="input-group">
                    <label className="auth-label">Confirm Password</label>
                    <Input.Password style={{ height: 38 }} value={patientData.confirmPassword} onChange={e => setPatientData({...patientData, confirmPassword: e.target.value})} />
                  </div>

                  <div className="password-checklist">
                    {requirements.map((req, index) => {
                      const passed = req.test(patientData.password);
                      return (
                        <div key={index} className={`checklist-item ${passed ? 'passed' : ''}`}>
                          <div className={`checklist-dot ${passed ? 'passed' : ''}`}>
                            {passed && <CheckCircleOutlined className="check-icon-small" />}
                          </div>
                          <span>{req.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="input-group" style={{ marginBottom: 16, marginTop: 10 }}>
                    <Checkbox 
                      checked={patientData.acceptPrivacyPolicy} 
                      onChange={e => setPatientData({...patientData, acceptPrivacyPolicy: e.target.checked})}
                      style={{ fontSize: 12 }}
                    >
                      I accept the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                    </Checkbox>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <Button
                      onClick={() => setStep(1)}
                      style={{
                        height: 42,
                        borderRadius: 10,
                        background: '#F3F4F6',
                        border: 'none',
                        color: '#6B7280',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '0 20px',
                        flexShrink: 0
                      }}
                    >
                      <ArrowLeftOutlined /> Back
                    </Button>
                    <Button
                      onClick={handlePatientRegister}
                      loading={loading}
                      className="auth-create-btn"
                    >
                      Create Account
                    </Button>
                  </div>
                  
                  <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
                    <span style={{ color: '#6B7280' }}>Already have an account? </span>
                    <Link to="/login" style={{ color: '#1479FF', fontWeight: 600 }}>Sign in</Link>
                  </div>
                </>
              )}

              {userType === 'DOCTOR' && step === 1 && (
                <>
                  <div className="input-group">
                    <label className="auth-label">Full Name</label>
                    <Input style={{ height: 38 }} value={fullName} onChange={e => setFullName(e.target.value)} />
                  </div>

                  <div className="input-group">
                    <label className="auth-label">Email Address</label>
                    <Input style={{ height: 38 }} value={email} onChange={e => setEmail(e.target.value)} />
                  </div>

                  <div className="input-group">
                    <label className="auth-label">Phone Number</label>
                    <Input style={{ height: 38 }} value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>

                  <div className="form-row">
                    <div className="input-group half">
                      <label className="auth-label">Country</label>
                      <Input style={{ height: 38 }} value={country} onChange={e => setCountry(e.target.value)} />
                    </div>
                    <div className="input-group half">
                      <label className="auth-label">City</label>
                      <Input style={{ height: 38 }} value={city} onChange={e => setCity(e.target.value)} />
                    </div>
                  </div>

                  <Button className="auth-primary-btn" type="primary" onClick={handleDoctorStep1}>
                    Continue &rarr;
                  </Button>
                  
                  <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
                    <span style={{ color: '#6B7280' }}>Already have an account? </span>
                    <Link to="/login" style={{ color: '#1479FF', fontWeight: 600 }}>Sign in</Link>
                  </div>
                </>
              )}

              {userType === 'DOCTOR' && step === 2 && (
                <>
                  <div className="input-group">
                    <label className="auth-label">Specialty</label>
                    <Select style={{ height: 38, width: '100%' }} value={specialty || undefined} onChange={val => setSpecialty(val)}>
                      <Option value="Cardiology">Cardiology</Option>
                      <Option value="General Medicine">General Medicine</Option>
                      <Option value="Dermatology">Dermatology</Option>
                      <Option value="Neurology">Neurology</Option>
                      <Option value="Pediatrics">Pediatrics</Option>
                      <Option value="Psychiatry">Psychiatry</Option>
                      <Option value="Ophthalmology">Ophthalmology</Option>
                      <Option value="Orthopedics">Orthopedics</Option>
                    </Select>
                  </div>

                  <div className="form-row">
                    <div className="input-group half">
                      <label className="auth-label">Experience (Years)</label>
                      <Input style={{ height: 38 }} type="number" value={experience} onChange={e => setExperience(Number(e.target.value))} />
                    </div>
                    <div className="input-group half">
                      <label className="auth-label">Practice Place</label>
                      <Input style={{ height: 38 }} value={practicePlace} onChange={e => setPracticePlace(e.target.value)} />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="auth-label">Clinic Address</label>
                    <Input style={{ height: 38 }} value={clinicAddress} onChange={e => setClinicAddress(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <Button
                      onClick={() => setStep(1)}
                      style={{
                        height: 42,
                        borderRadius: 10,
                        background: '#F3F4F6',
                        border: 'none',
                        color: '#6B7280',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '0 20px',
                        flexShrink: 0
                      }}
                    >
                      <ArrowLeftOutlined /> Back
                    </Button>
                    <Button
                      onClick={handleDoctorStep2}
                      className="auth-continue-btn" 
                    >
                      Continue &rarr;
                    </Button>
                  </div>
                </>
              )}

              {userType === 'DOCTOR' && step === 3 && (
                <>
                  <div className="input-group">
                    <label className="auth-label">Medical Licence</label>
                    <Upload
                      name="ant-upload-wrapper" maxCount={1} accept="image/*" beforeUpload={handleLicenceUpload} onRemove={() => setLicenceFile(null)}
                    >
                      <Button name='ant-upload-drag' icon={<UploadOutlined />}>
                        Upload
                      </Button>
                    </Upload>
                  </div>

                  <div className="input-group">
                    <label className="auth-label">Identity Document</label>
                     <Upload
                      name="ant-upload-wrapper" maxCount={1} accept="image/*" beforeUpload={handleIdentityUpload} onRemove={() => setIdentityFile(null)}
                    >
                      <Button name='ant-upload-drag' icon={<UploadOutlined />}>
                        Upload
                      </Button>
                    </Upload>
                  </div>

                  <div className="form-row">
                    <div className="input-group half">
                      <label className="auth-label">Password</label>
                      <Input.Password style={{ height: 38 }} value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <div className="input-group half">
                      <label className="auth-label">Confirm Password</label>
                      <Input.Password style={{ height: 38 }} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <Button
                      onClick={() => setStep(2)}
                      style={{
                        height: 42,
                        borderRadius: 10,
                        background: '#F3F4F6',
                        border: 'none',
                        color: '#6B7280',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '0 20px',
                        flexShrink: 0
                      }}
                    >
                      <ArrowLeftOutlined /> Back
                    </Button>
                    <Button
                      onClick={handleDoctorRegister}
                      loading={loading}
                      className="auth-submit-btn"
                    >
                      Submit Registration
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
