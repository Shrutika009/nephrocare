import { useState, useEffect, useRef } from 'react'
import { features } from '../constants'
import type { Page } from '../types'
import { Icon } from './Icon'

type HeaderProps = {
  mobileOpen: boolean
  featuresOpen: boolean
  setMobileOpen: (open: boolean) => void
  setFeaturesOpen: (open: boolean) => void
  showPage: (page: Page) => void
  scrollTo: (id: string) => void
  closeMenus: () => void
  user: { name: string; email: string } | null
  onLogout: () => void
}

export function Header({ mobileOpen, featuresOpen, setMobileOpen, setFeaturesOpen, showPage, scrollTo, closeMenus, user, onLogout }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return <header className="header">
    <a className="brand" href="#top" aria-label="NephroCare home" onClick={event => { event.preventDefault(); showPage('home') }}>
      <img className="brand-photo-logo" src="/logo.png" alt="" />
      <span className="brand-text">NephroCare<small>CKD PREDICTION SYSTEM</small></span>
    </a>
    <nav className="desktop-nav" aria-label="Main navigation">
      <button className="nav-link feature-trigger" onClick={() => setFeaturesOpen(!featuresOpen)} aria-expanded={featuresOpen}>Features <span className={featuresOpen ? 'chevron up' : 'chevron'}>⌄</span></button>
      <button className="nav-link" onClick={() => scrollTo('about')}>About</button>
      <button className="nav-link" onClick={() => scrollTo('resources')}>Resources</button>
    </nav>
    <div className="header-actions">
      <button className="signup-button dashboard-tab" onClick={() => showPage('wearable')} style={{marginRight: '12px', background: '#0b7f72'}}>Wearable Twin</button>
      <button className="signup-button dashboard-tab" onClick={() => showPage('chatbot')} style={{marginRight: '12px', background: '#236d9f'}}>AI Assistant</button>
      <button className="signup-button dashboard-tab" onClick={() => showPage('dashboard')} style={{marginRight: '12px'}}>Dashboard</button>
      {user ? (
        <div className="user-profile-container" ref={dropdownRef} style={{ position: 'relative' }}>
          <div className="user-profile" onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ cursor: 'pointer', userSelect: 'none' }}>
            <div className="user-avatar" title={user.email}>
              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <span className="user-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {user.name}
              <span className="profile-chevron" style={{ fontSize: '10px', opacity: 0.6, transition: 'transform 0.2s', display: 'inline-block', transform: userMenuOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
            </span>
          </div>
          {userMenuOpen && (
            <div className="user-dropdown">
              <button 
                type="button" 
                className="dropdown-logout-btn" 
                onClick={() => {
                  onLogout();
                  setUserMenuOpen(false);
                }}
              >
                <Icon name="log-out" size={16} /> Log out
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <button type="button" className="login-button" onClick={() => showPage('login')}>Login</button>
          <button type="button" className="signup-button" onClick={() => showPage('signup')}>Sign up</button>
        </>
      )}
    </div>
    <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu"><Icon name={mobileOpen ? 'x' : 'menu'} /></button>

    {featuresOpen && <div className="mega-menu">
      <div className="mega-links">
        {features.map(feature => (
          <button 
            type="button" 
            key={feature.title} 
            onClick={() => {
              if (feature.title === 'CKD Risk Prediction') {
                showPage('ckd-prediction');
              } else if (feature.title === 'Lab Report Analysis') {
                showPage('lab-report');
              } else if (feature.title === 'Food') {
                showPage('food-tools');
              } else if (feature.title === 'Ultrasound Analysis') {
                showPage('ultrasound');
              } else if (feature.title === 'Smart Alerts') {
                showPage('alerts');
              } else if (
                feature.title === 'Monitoring Dashboard' || 
                feature.title === 'Early Warning Alerts' || 
                feature.title === 'Doctor Summary Report' || 
                feature.title === 'WhatsApp Assistant'
              ) {
                showPage('dashboard');
              } else {
                closeMenus();
              }
            }}
          >
            <span><Icon name={feature.icon} size={18} /></span>
            {feature.title}
          </button>
        ))}
      </div>
    </div>}

    {mobileOpen && <div className="mobile-panel">
      <button type="button" onClick={() => showPage('ckd-prediction')}>Risk Calculator</button>
      <button type="button" onClick={() => showPage('food-tools')}>Food Tools</button>
      <button type="button" onClick={() => showPage('ultrasound')}>Ultrasound Scan</button>
      <button type="button" onClick={() => showPage('wearable')}>Wearable Twin</button>
      <button type="button" onClick={() => showPage('dashboard')}>Dashboard</button>
      <button type="button" onClick={() => scrollTo('about')}>About</button>
      <button type="button" onClick={() => scrollTo('resources')}>Resources</button>
    </div>}
  </header>
}
