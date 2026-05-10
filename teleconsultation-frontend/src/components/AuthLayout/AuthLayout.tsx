import React, { type ReactNode } from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import './AuthLayout.css';
import teleconsultLogo from '../../assets/images/Teleconsult.png';

interface FeatureItem {
  icon: React.ReactNode;
  text: string;
}

interface AuthLayoutProps {
  children: ReactNode;
  reverse?: boolean;
  label: string;
  title: string;
  subtitle: string;
  features: FeatureItem[];
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, reverse = false, label, title, subtitle, features }) => {
  const navigate = useNavigate();

  return (
    <div className={`auth-page ${reverse ? 'panel-right' : ''}`}>
      <div className="auth-left-panel">
        <div className="auth-left-content">
          <div className="auth-logo-section">
            <img
              src={teleconsultLogo}
              alt="Teleconsult"
              className="auth-logo"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/')}
            />
            <div className="auth-label-tag">{label}</div>
            <h1 className="auth-title">{title}</h1>
            <p className="auth-subtitle">{subtitle}</p>
          </div>
          
          <div className="auth-feature-cards">
            {features.map((f, i) => (
              <div key={i} className="auth-feature-card">
                <div className="auth-feature-icon">{f.icon}</div>
                <div className="auth-feature-text">{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="auth-right-panel">
        <div className="auth-top-bar">
          <a href="#" className="help-center-link">Help Center</a>
          <Button type="default" className="contact-clinic-btn">Contact Clinic</Button>
        </div>
        <div className="auth-form-area">
          <div className="auth-form-container">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
