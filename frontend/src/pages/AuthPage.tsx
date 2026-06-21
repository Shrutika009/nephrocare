import { useState, useEffect, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import type { Page } from '../types'

type AuthPageProps = {
  initialMode: 'login' | 'signup'
  showPage: (page: Page) => void
  onLoginSuccess: (user: { name: string; email: string }) => void
}

export function AuthPage({ initialMode, showPage, onLoginSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleSdkReady, setGoogleSdkReady] = useState(false)
  
  // Check if VITE_GOOGLE_CLIENT_ID environment variable is set
  const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Initialize real Google Identity Services if client ID exists
  useEffect(() => {
    if (!client_id) return

    const checkGoogleSdk = setInterval(() => {
      const google = (window as any).google
      if (google && google.accounts) {
        clearInterval(checkGoogleSdk)
        try {
          google.accounts.id.initialize({
            client_id: client_id,
            callback: (response: any) => {
              // Decode standard JWT credential token returned by Google
              const base64Url = response.credential.split('.')[1]
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split('')
                  .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              )
              const payload = JSON.parse(jsonPayload)

              onLoginSuccess({
                name: payload.name || payload.given_name || 'Google User',
                email: payload.email
              })
              showPage('dashboard')
            }
          })
          setGoogleSdkReady(true)
        } catch (err) {
          console.error('Google Sign-In SDK Initialization failed:', err)
        }
      }
    }, 100)

    return () => clearInterval(checkGoogleSdk)
  }, [client_id])

  // Render Google button whenever SDK is ready or mode changes
  useEffect(() => {
    if (!client_id || !googleSdkReady) return

    const google = (window as any).google
    if (google && google.accounts) {
      const timer = setTimeout(() => {
        const btnContainer = document.getElementById('real-google-btn-container')
        if (btnContainer) {
          try {
            google.accounts.id.renderButton(
              btnContainer,
              { theme: 'outline', size: 'large', width: 380, shape: 'rectangular' }
            )
          } catch (err) {
            console.error('Google Sign-In button rendering failed:', err)
          }
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [client_id, googleSdkReady, mode])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email || !password || (mode === 'signup' && !name)) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      const userName = mode === 'signup' ? name : email.split('@')[0]
      onLoginSuccess({
        name: userName.charAt(0).toUpperCase() + userName.slice(1),
        email: email
      })
      showPage('dashboard')
    }, 1000)
  }

  return (
    <main className="auth-page-container">
      <div className="auth-card-wrapper light-theme">
        <div className="auth-form-panel">
          <div className="auth-brand-logo" onClick={() => showPage('home')}>
            <img src="/logo.png" alt="NephroCare" className="auth-logo-img" />
            <span className="auth-logo-text">NephroCare</span>
          </div>

          <div className="auth-form-header">
            <div className="auth-tabs">
              <button 
                type="button"
                className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => { setMode('login'); setError(''); }}
              >
                Log In
              </button>
              <button 
                type="button"
                className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => { setMode('signup'); setError(''); }}
              >
                Sign Up
              </button>
            </div>
            <p className="auth-subtitle">
              {mode === 'login' 
                ? 'Welcome back! Log in to access your personal dashboard.' 
                : 'Create an account to track kidney function and save clinical reports.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error-msg">{error}</div>}
            
            {mode === 'signup' && (
              <div className="form-group">
                <label htmlFor="name-input">Full Name</label>
                <input 
                  id="name-input"
                  type="text" 
                  placeholder="e.g. Jane Doe" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email-input">Email Address</label>
              <input 
                id="email-input"
                type="email" 
                placeholder="e.g. jane@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password-input">Password</label>
              <input 
                id="password-input"
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {mode === 'login' && (
              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" /> Remember me
                </label>
                <button type="button" className="forgot-pwd-btn">Forgot password?</button>
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span className="auth-spinner"></span>
              ) : mode === 'login' ? (
                'Log In'
              ) : (
                'Create Account'
              )}
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            {client_id ? (
              /* Official Google Identity Services Button Container */
              <div className="gsi-container" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <div id="real-google-btn-container" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}></div>
              </div>
            ) : (
              <div className="google-fallback-wrapper" style={{ textAlign: 'center', color: '#888', fontSize: '13px', margin: '15px 0' }}>
                Google Sign-In is unavailable. Please configure VITE_GOOGLE_CLIENT_ID in your .env file.
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  )
}
