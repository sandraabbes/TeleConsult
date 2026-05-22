import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import {
  LockOutlined,
  VideoCameraOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  TwitterOutlined,
  LinkedinOutlined,
  FacebookOutlined,
  ArrowRightOutlined,
  MessageOutlined,
  SearchOutlined,
  CalendarOutlined,
  DesktopOutlined,
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import logo from '../../assets/images/Teleconsult.png';
import aboutImage from '../../assets/images/La-teleconsultation-comment-ca-marche.jpg';
import ctaImage from '../../assets/images/teleimage2.jpg';
import './home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const aboutRef = useRef<HTMLDivElement>(null);
  const specialtiesRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    {
      icon: <LockOutlined />,
      title: 'Privacy Guaranteed',
      desc: 'End-to-end encrypted consultations with full medical confidentiality for every session.',
    },
    {
      icon: <VideoCameraOutlined />,
      title: 'Seamless Connectivity',
      desc: 'Crystal clear, lag-free video and audio with real-time HD quality.',
    },
    {
      icon: <SafetyCertificateOutlined />,
      title: 'Certified Experts',
      desc: 'Access verified, board-certified medical professionals from any location.',
    },
  ];

  const specialties = [
    {
      icon: <span className="material-symbols-outlined">stethoscope</span>,
      title: 'General Medicine',
      desc: 'Consult with primary care physicians for everyday health concerns and routine checkups.',
    },
    {
      icon: <span className="material-symbols-outlined">psychology</span>,
      title: 'Mental Health',
      desc: 'Professional therapy and psychiatric support in a secure, private digital environment.',
    },
    {
      icon: <span className="material-symbols-outlined">pediatrics</span>,
      title: 'Pediatrics',
      desc: "Quick, reliable medical advice for your children without the stress of a waiting room.",
    },
    {
      icon: <span className="material-symbols-outlined">dermatology</span>,
      title: 'Dermatology',
      desc: 'High-definition video allows for clear skin assessments and treatment plans.',
    },
    {
      icon: <span className="material-symbols-outlined">cardiology</span>,
      title: 'Cardiology',
      desc: 'Specialized heart health monitoring and follow-up consultations with experts.',
    },
    {
      icon: <span className="material-symbols-outlined">health_and_beauty</span>,
      title: 'Nutrition & Dietetics',
      desc: 'Work with certified nutritionists to build personalized meal and wellness plans.',
    },
  ];



  const reviews = [
    {
      name: 'Sarah Johnson',
      role: 'Patient',
      rating: 5,
      comment:
        'The teleconsultation experience was seamless. I connected with a specialist within minutes and received excellent care without leaving my home.',
    },
    {
      name: 'David Lee',
      role: 'Patient',
      rating: 5,
      comment:
        'Incredible platform! The doctors are professional and thorough. The video quality was perfect and the follow-up was prompt.',
    },
    {
      name: 'Nora Martinez',
      role: 'Patient',
      rating: 4,
      comment:
        'Very convenient and reliable. I was able to get a prescription right after my consultation. Highly recommend for anyone with a busy schedule.',
    },
  ];

  return (
    <div className="home-page">
      {/* ─── NAVBAR ─── */}
      <nav className="home-navbar">
        <div className="home-navbar-inner">
          <div className="home-navbar-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={logo} alt="Teleconsult" />
          </div>
          <ul className="home-navbar-links">
            <li onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Home</li>
            <li onClick={() => scrollTo(aboutRef)}>About</li>
            <li onClick={() => scrollTo(specialtiesRef)}>My Plans</li>
            <li onClick={() => scrollTo(contactRef)}>Contact</li>
          </ul>
          <div className="home-navbar-actions">
            <Button className="home-btn-login" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button type="primary" className="home-btn-register" onClick={() => navigate('/register')}>
              Register
            </Button>
          </div>
          <button
            className="home-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
          </button>
        </div>
        {/* Mobile Drawer */}
        <div className={`home-mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}> 
          <ul className="mobile-drawer-links">
            <li onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenuOpen(false); }}>Home</li>
            <li onClick={() => { scrollTo(aboutRef); setMobileMenuOpen(false); }}>About</li>
            <li onClick={() => { scrollTo(specialtiesRef); setMobileMenuOpen(false); }}>My Plans</li>
            <li onClick={() => { scrollTo(contactRef); setMobileMenuOpen(false); }}>Contact</li>
          </ul>
          <div className="mobile-drawer-actions">
            <Button className="home-btn-login" block onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}>
              Login
            </Button>
            <Button type="primary" className="home-btn-register" block onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}>
              Register
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-content">
            <h1>
              Consult a doctor<br />
              <span className="hero-gradient-text">online anytime.</span>
            </h1>
            <p>
              Secure video consultations with certified doctors. Get expert advice and prescriptions from the comfort of home.
            </p>
            <Button
              type="primary"
              size="large"
              className="home-hero-cta"
              onClick={() => navigate('/register')}
            >
              Start Consultation <ArrowRightOutlined />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="home-features">
        <div className="home-features-inner">
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ABOUT ─── */}
      <section className="home-about" ref={aboutRef}>
        <div className="home-about-inner">
          <div className="about-image-side">
            <div className="about-image-box">
              <img src={aboutImage} alt="Teleconsultation" className="about-real-img" />
            </div>
          </div>
          <div className="about-text-side">
            <span className="about-label">About us</span>
            <h2>
              We Bring Expert Healthcare<br />
              <span>Directly to You</span>
            </h2>
            <p>
              Experience quality healthcare from anywhere. Our teleconsultation platform connects you with certified doctors on-demand, eliminating travel, long wait times, and unnecessary clinic visits.
            </p>
            <div className="about-features">
              <div className="about-feature-item">
                <div className="about-feature-icon"><VideoCameraOutlined /></div>
                <div>
                  <h4>Virtual Consultations</h4>
                  <p>Speak with a real doctor face-to-face from your home via secure video call.</p>
                </div>
              </div>
              <div className="about-feature-item">
                <div className="about-feature-icon"><MessageOutlined /></div>
                <div>
                  <h4>Secure Messaging</h4>
                  <p>Chat with your doctor anytime. Share prescriptions, test results, and follow-up notes.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SPECIALTIES ─── */}
      <section className="home-specialties" ref={specialtiesRef}>
        <div className="home-specialties-inner">
          <h2>Our Medical Specialties</h2>
          <p className="section-subtitle">
            Access expert care across a wide range of medical fields from your home.
          </p>
          <div className="specialties-grid">
            {specialties.map((s, i) => (
              <div className="specialty-card" key={i}>
                <div className="specialty-icon">{s.icon}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
                <span className="specialty-cta">Explore now <ArrowRightOutlined /></span>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="home-cta-banner">
        <div className="home-cta-inner">
          <div className="cta-text-side">
            <h2>
              Making expert medical<br />
              advice <span className="cta-underline">accessible</span> to all.
            </h2>
            <p>
              From basic consultations and chronic disease management to mental health support, we provide a full range of telehealth services for patients of all ages, ensuring that proper medical care is accessible, affordable, and convenient for everyone.
            </p>
          </div>
          <div className="cta-image-side">
            <img src={ctaImage} alt="Teleconsultation" className="cta-real-img" />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="home-how-it-works" ref={howItWorksRef}>
        <div className="home-hiw-inner">
          <h2>How It Works</h2>
          <p className="section-subtitle">
            Start your journey to better health in three simple steps.
          </p>

          <div className="hiw-steps-container">
            <div className="hiw-connecting-line"></div>

            <div className="hiw-step">
              <div className="hiw-icon-circle">
                <SearchOutlined />
              </div>
              <div className="hiw-step-number">01</div>
              <h3>Choose a doctor</h3>
              <p>
                Browse through our list of certified specialists. View their
                profiles, ratings, and areas of expertise to find the perfect
                match for your health needs.
              </p>
            </div>

            <div className="hiw-step">
              <div className="hiw-icon-circle">
                <CalendarOutlined />
              </div>
              <div className="hiw-step-number">02</div>
              <h3>Make an Appointment</h3>
              <p>
                Select a date and time that fits your schedule. Our automated
                system syncs with the doctor's dashboard to confirm your booking
                instantly.
              </p>
            </div>

            <div className="hiw-step">
              <div className="hiw-icon-circle">
                <DesktopOutlined />
              </div>
              <div className="hiw-step-number">03</div>
              <h3>Start Consultation</h3>
              <p>
                Join your secure, high-definition video call with a single
                click. Receive a professional diagnosis, digital prescriptions,
                and follow-up care from home.
              </p>
            </div>
          </div>

          <div className="hiw-cta-container">
            <Button
              type="primary"
              size="large"
              className="home-hiw-cta"
              onClick={() => navigate('/register')}
            >
              Book a virtual visit <ArrowRightOutlined />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── REVIEWS ─── */}
      <section className="home-reviews">
        <div className="home-reviews-inner">
          <h2>Reviews From Our Patients.</h2>
          <p className="section-subtitle">
            Our platform has been trusted by thousands of patients worldwide, delivering quality healthcare and improving lives every single day.
          </p>
          <div className="reviews-grid">
            {reviews.map((r, i) => (
              <div className="review-card-home" key={i}>
                <div className="review-stars">
                  {[...Array(r.rating)].map((_, j) => (
                    <StarFilled key={j} />
                  ))}
                </div>
                <p className="review-text">"{r.comment}"</p>
                <div className="review-author">
                  <div className="review-avatar">{r.name.charAt(0)}</div>
                  <div>
                    <span className="review-name">{r.name}</span>
                    <span className="review-role">{r.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="home-footer" ref={contactRef}>
        <div className="home-footer-inner">
          <div className="footer-brand">
            <img src={logo} alt="Teleconsult" className="footer-logo" />
            <p>
              Connecting patients with certified doctors for seamless, secure teleconsultations from anywhere in the world.
            </p>
            <div className="footer-social">
              <TwitterOutlined />
              <LinkedinOutlined />
              <FacebookOutlined />
            </div>
          </div>
          <div className="footer-links-col">
            <h4>For Patients</h4>
            <ul>
              <li>Find a Doctor</li>
              <li>Book appointment</li>
              <li>Medical FAQ</li>
              <li>Patient Help</li>
            </ul>
          </div>
          <div className="footer-links-col">
            <h4>For Doctors</h4>
            <ul>
              <li>Join as a Doctor</li>
              <li>Manage Schedule</li>
              <li>Reviews</li>
              <li>Support</li>
            </ul>
          </div>
          <div className="footer-links-col">
            <h4>Connect</h4>
            <ul>
              <li><MailOutlined /> info@teleconsult.com</li>
              <li><PhoneOutlined /> +216 71 123 456</li>
              <li><EnvironmentOutlined /> Tunis, Tunisia</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Teleconsult. All rights reserved. Secure & HIPAA Compliant.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
