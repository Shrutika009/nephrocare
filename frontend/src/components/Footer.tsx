import type { Page } from '../types'

type FooterProps = {
  showPage: (page: Page) => void
  scrollTo: (id: string) => void
}

export function Footer({ showPage, scrollTo }: FooterProps) {
  return <footer id="resources">
    <div className="footer-main">
      <div className="footer-intro">
        <a className="brand footer-brand" href="#top" onClick={event => { event.preventDefault(); showPage('home') }}>
          <img className="footer-logo" src="/logo.png" alt="" />
          <span className="brand-text">NephroCare<small>CKD PREDICTION SYSTEM</small></span>
        </a>
        <p>Kidney health screening support for patients and care conversations.</p>
      </div>
      <nav className="footer-links" aria-label="Footer navigation">
        <button type="button" onClick={() => showPage('home')}>Home</button>
        <button type="button" onClick={() => scrollTo('about')}>About CKD</button>
        <button type="button" onClick={() => showPage('ckd-prediction')}>Check CKD risk</button>
      </nav>
      <p className="footer-care-note">Screening results are not a diagnosis. Please discuss health concerns and next steps with a qualified clinician.</p>
    </div>
    <div className="footer-bottom">
      <span>© 2026 NephroCare</span>
      <span>Privacy · Terms · Medical disclaimer</span>
    </div>
  </footer>
}
