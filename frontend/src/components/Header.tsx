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
}

export function Header({ mobileOpen, featuresOpen, setMobileOpen, setFeaturesOpen, showPage, scrollTo, closeMenus }: HeaderProps) {
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
      <button className="login-button">Login</button>
      <button className="signup-button">Sign up</button>
    </div>
    <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu"><Icon name={mobileOpen ? 'x' : 'menu'} /></button>

    {featuresOpen && <div className="mega-menu">
      <div className="mega-links">{features.map(feature => <button type="button" key={feature.title} onClick={feature.title === 'CKD Risk Prediction' ? () => showPage('ckd-prediction') : feature.title === 'Food' ? () => showPage('food-tools') : closeMenus}><span><Icon name={feature.icon} size={18} /></span>{feature.title}</button>)}</div>
    </div>}

    {mobileOpen && <div className="mobile-panel">
      <button type="button" onClick={() => showPage('ckd-prediction')}>Features</button><button onClick={() => scrollTo('about')}>About</button><button onClick={() => showPage('food-tools')}>Food tools</button><button onClick={() => scrollTo('resources')}>Resources</button>
    </div>}
  </header>
}
