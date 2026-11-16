import { useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import './App.css'

const API_URL = 'https://nike-hostels-and-livings.onrender.com'

const getTodayDate = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ---------------- SECURITY QR SCANNER ----------------

function SecurityScanner() {
  const [result, setResult] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [manualToken, setManualToken] = useState('')

  const verifyToken = async (token) => {
    if (!token) {
      setResult({ valid: false, message: 'Please enter a QR token.' })
      return
    }
    try {
      setScanning(false)
      const response = await fetch(`${API_URL}/api/security/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Verification error:', error)
      setResult({ valid: false, message: 'Unable to connect to backend.' })
    }
  }

  const startScanner = () => {
    setResult(null)
    setScanning(true)
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      }, false)
      scanner.render((decodedText) => {
        scanner.clear()
        setScanning(false)
        verifyToken(decodedText)
      }, () => {})
    }, 100)
  }

  return (
    <div className="security-workspace">
      <section className="security-hero">
        <div>
          <span className="panel-kicker">CAMPUS ENTRY CONTROL</span>
          <h2>Security Verification</h2>
          <p>Scan a student's approved gate pass QR code or enter its token manually to verify authorization.</p>
        </div>
        <div className="security-hero-icon" aria-hidden="true">⌑</div>
      </section>

      <div className="security-tools-grid">
        <section className="security-tool-card">
          <div className="security-tool-heading">
            <span className="security-tool-icon">▦</span>
            <div>
              <h3>Scan QR Code</h3>
              <p>Use the device camera to scan the gate pass.</p>
            </div>
          </div>

          <button
            className="primary-button scanner-start-button"
            type="button"
            onClick={startScanner}
            disabled={scanning}
          >
            {scanning ? 'Scanner Active' : 'Start Camera Scanner →'}
          </button>

          {scanning && (
            <div className="scanner-frame">
              <div id="qr-reader" />
            </div>
          )}

          {!scanning && (
            <div className="scanner-placeholder">
              <span>▦</span>
              <strong>Camera scanner ready</strong>
              <small>Start the scanner and position the QR code inside the frame.</small>
            </div>
          )}
        </section>

        <section className="security-tool-card">
          <div className="security-tool-heading">
            <span className="security-tool-icon manual-icon">⌨</span>
            <div>
              <h3>Manual Verification</h3>
              <p>Enter the QR token if camera scanning is unavailable.</p>
            </div>
          </div>

          <label className="security-label" htmlFor="manual-qr-token">
            QR token
          </label>

          <input
            id="manual-qr-token"
            className="security-token-input"
            type="text"
            placeholder="Paste gate pass token here"
            value={manualToken}
            onChange={(event) => setManualToken(event.target.value)}
          />

          <button
            className="primary-button scanner-start-button"
            type="button"
            onClick={() => verifyToken(manualToken.trim())}
            disabled={!manualToken.trim()}
          >
            Verify Gate Pass →
          </button>

          <div className="security-note">
            <span>ⓘ</span>
            Only approved and active gate passes should be accepted at the gate.
          </div>
        </section>
      </div>

      {result && (
        <section className={`verification-result ${result.valid ? 'is-valid' : 'is-invalid'}`}>
          <div className="verification-result-heading">
            <span className="verification-result-icon">
              {result.valid ? '✓' : '!'}
            </span>
            <div>
              <small>VERIFICATION RESULT</small>
              <h3>{result.valid ? 'Valid Gate Pass' : 'Verification Failed'}</h3>
              <p>{result.message}</p>
            </div>
          </div>

          {result.valid && result.data && (
            <div className="verification-student-grid">
              <div><small>STUDENT NAME</small><strong>{result.data.studentName}</strong></div>
              <div><small>ROLL NUMBER</small><strong>{result.data.rollNumber}</strong></div>
              <div><small>ROOM NUMBER</small><strong>{result.data.roomNumber}</strong></div>
              <div><small>DEPARTMENT</small><strong>{result.data.department}</strong></div>
              <div><small>REASON</small><strong>{result.data.reason}</strong></div>
              <div><small>GATE PASS ID</small><strong>#{result.data.id}</strong></div>
              <div><small>DEPARTURE</small><strong>{result.data.departureDate} · {result.data.departureTime}</strong></div>
              <div><small>EXPECTED RETURN</small><strong>{result.data.returnDate} · {result.data.returnTime}</strong></div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

// ---------------- STUDENT AUTHENTICATION ----------------



function StudentAuth({ onLogin }) {
  const [authMode, setAuthMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  })

  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    rollNumber: '',
    roomNumber: '',
    department: '',
  })

  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLoginData((previous) => ({ ...previous, [name]: value }))
  }

  const handleRegisterChange = (event) => {
    const { name, value } = event.target
    setRegisterData((previous) => ({ ...previous, [name]: value }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed.')
      }

      onLogin(data.token, data.user)
    } catch (error) {
      setMessage(error.message || 'Unable to connect to backend.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setMessage('')

    if (registerData.phone && !/^[0-9]{10}$/.test(registerData.phone)) {
      setMessage('Please enter a valid 10-digit phone number.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.')
      }

      setMessage('Registration successful! Please log in.')
      setAuthMode('login')
      setLoginData({
        email: registerData.email,
        password: '',
      })
    } catch (error) {
      setMessage(error.message || 'Unable to connect to backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">

      {/* LEFT BRANDING PANEL */}
      <section className="auth-brand-panel">

        <div className="auth-brand">
          <div className="auth-brand-logo">N</div>
          <div>
            <strong>NIKE HOSTELS</strong>
            <span>AND LIVINGS</span>
          </div>
        </div>

        <div className="auth-decoration auth-decoration-one" />
        <div className="auth-decoration auth-decoration-two" />

        <div className="auth-brand-content">
          <span className="auth-eyebrow">SMART HOSTEL MANAGEMENT</span>

          <h1>
            Your hostel life,
            <br />
            <span>made simpler.</span>
          </h1>

          <p>
            A smarter way to manage your hostel experience.
            Request gate passes, track approvals, and stay
            connected with your hostel administration.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature">
              <span>✓</span>
              <div>
                <strong>Easy Gate Pass Requests</strong>
                <small>Submit outing requests in seconds.</small>
              </div>
            </div>

            <div className="auth-feature">
              <span>✓</span>
              <div>
                <strong>Quick Approval Updates</strong>
                <small>Keep track of your request status.</small>
              </div>
            </div>

            <div className="auth-feature">
              <span>✓</span>
              <div>
                <strong>Secure Campus Access</strong>
                <small>QR-based gate pass verification.</small>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-brand-footer">
          <span>SMARTER LIVING. BETTER MANAGEMENT.</span>
          <span>© 2026 NIKE HOSTELS</span>
        </div>
      </section>

      {/* RIGHT AUTHENTICATION PANEL */}
      <section className="auth-form-panel">

        <div className="auth-mobile-brand">
          <div className="auth-brand-logo">N</div>
          <div>
            <strong>NIKE HOSTELS</strong>
            <span>AND LIVINGS</span>
          </div>
        </div>

        <div className="auth-card">

          <div className="auth-card-heading">
            <span className="auth-card-kicker">
              STUDENT PORTAL
            </span>

            <h2>
              {authMode === 'login'
                ? 'Welcome back!'
                : 'Create your account'}
            </h2>

            <p>
              {authMode === 'login'
                ? 'Sign in to access your hostel dashboard.'
                : 'Register to get started with your hostel account.'}
            </p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === 'login' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => {
                setAuthMode('login')
                setMessage('')
              }}
            >
              Sign In
            </button>

            <button
              type="button"
              className={authMode === 'register' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => {
                setAuthMode('register')
                setMessage('')
              }}
            >
              Register
            </button>
          </div>

          {authMode === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin}>

              <div className="auth-field">
                <label htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="login-password">Password</label>

                <div className="auth-password-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="auth-show-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                className="auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In to Dashboard'}
                {!loading && <span>→</span>}
              </button>
            </form>
          ) : (
            <form
              className="auth-form auth-register-form"
              onSubmit={handleRegister}
            >

              <div className="auth-field">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={registerData.name}
                  onChange={handleRegisterChange}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="auth-field">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="auth-register-grid">
                <div className="auth-field">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Minimum 8 characters"
                    value={registerData.password}
                    onChange={handleRegisterChange}
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="auth-field">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="10-digit number"
                    value={registerData.phone}
                    onChange={handleRegisterChange}
                    maxLength={10}
                  />
                </div>

                <div className="auth-field">
                  <label>Roll Number</label>
                  <input
                    type="text"
                    name="rollNumber"
                    placeholder="Your roll number"
                    value={registerData.rollNumber}
                    onChange={handleRegisterChange}
                    required
                  />
                </div>

                <div className="auth-field">
                  <label>Room Number</label>
                  <input
                    type="text"
                    name="roomNumber"
                    placeholder="Your room"
                    value={registerData.roomNumber}
                    onChange={handleRegisterChange}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label>Department</label>
                <select
                  name="department"
                  value={registerData.department}
                  onChange={handleRegisterChange}
                  required
                >
                  <option value="">Select your department</option>
                  <option value="CSE">Computer Science (CSE)</option>
                  <option value="IT">Information Technology (IT)</option>
                  <option value="ECE">Electronics (ECE)</option>
                  <option value="EEE">Electrical (EEE)</option>
                  <option value="MECH">Mechanical</option>
                  <option value="CIVIL">Civil</option>
                  <option value="MCA">MCA</option>
                  <option value="MBA">MBA</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <button
                className="auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Student Account'}
                {!loading && <span>→</span>}
              </button>
            </form>
          )}

          {message && (
            <div
              className={`auth-message ${
                message.toLowerCase().includes('successful')
                  ? 'success'
                  : 'error'
              }`}
              role="status"
            >
              {message}
            </div>
          )}

          <div className="auth-security-note">
            <span>🔒</span>
            <span>
              Your account information is protected.
              Secure access to your hostel services.
            </span>
          </div>
        </div>

        <p className="auth-bottom-text">
          Need assistance? Contact your hostel administration.
        </p>

      </section>
    </div>
  )
}


// ---------------- WARDEN PORTAL ----------------

function WardenPortal({ token }) {
  const [gatePasses, setGatePasses] = useState([])
  const [students, setStudents] = useState([])
  const [activeTab, setActiveTab] = useState('gatepasses')
  const [loading, setLoading] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [studentSearch, setStudentSearch] = useState('')

  const loadGatePasses = async () => {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_URL}/api/gatepasses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to load requests.')
      setGatePasses(Array.isArray(data) ? data : [])
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async () => {
    setStudentsLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to load students.')
      setStudents(Array.isArray(data.data) ? data.data : [])
    } catch (error) {
      setMessage(error.message)
    } finally {
      setStudentsLoading(false)
    }
  }

  const updateGatePass = async (id, action) => {
    try {
      const response = await fetch(`${API_URL}/api/gatepass/${id}/${action}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to update request.')
      setMessage(data.message || `Gate pass ${action} successful.`)
      await loadGatePasses()
    } catch (error) {
      setMessage(error.message)
    }
  }

  const filteredStudents = students.filter((student) => {
    const search = studentSearch.trim().toLowerCase()
    return !search ||
      (student.name || '').toLowerCase().includes(search) ||
      (student.rollNumber || '').toLowerCase().includes(search) ||
      (student.email || '').toLowerCase().includes(search) ||
      (student.roomNumber || '').toLowerCase().includes(search)
  })

  const pendingCount = gatePasses.filter((pass) => pass.status === 'PENDING').length
  const approvedCount = gatePasses.filter((pass) => pass.status === 'APPROVED').length
  const rejectedCount = gatePasses.filter((pass) => pass.status === 'REJECTED').length

  return (
    <div className="warden-workspace">
      <section className="warden-hero">
        <div>
          <span className="panel-kicker">HOSTEL ADMINISTRATION</span>
          <h2>Warden Dashboard</h2>
          <p>Review student outing requests, manage approvals, and access student records.</p>
        </div>
        <div className="warden-hero-mark" aria-hidden="true">⌂</div>
      </section>

      <div className="warden-stats-grid">
        <article className="warden-stat-card">
          <span className="warden-stat-icon pending-icon">◷</span>
          <div>
            <small>PENDING REQUESTS</small>
            <strong>{pendingCount}</strong>
            <span>Awaiting your review</span>
          </div>
        </article>

        <article className="warden-stat-card">
          <span className="warden-stat-icon approved-icon">✓</span>
          <div>
            <small>APPROVED</small>
            <strong>{approvedCount}</strong>
            <span>Approved gate passes</span>
          </div>
        </article>

        <article className="warden-stat-card">
          <span className="warden-stat-icon rejected-icon">×</span>
          <div>
            <small>REJECTED</small>
            <strong>{rejectedCount}</strong>
            <span>Declined requests</span>
          </div>
        </article>

        <article className="warden-stat-card">
          <span className="warden-stat-icon students-icon">♙</span>
          <div>
            <small>REGISTERED STUDENTS</small>
            <strong>{students.length}</strong>
            <span>Student accounts loaded</span>
          </div>
        </article>
      </div>

      <section className="warden-panel">
        <div className="warden-panel-top">
          <div>
            <span className="panel-kicker">MANAGEMENT CENTER</span>
            <h3>Hostel Records</h3>
            <p>Choose a workspace to review requests or student information.</p>
          </div>

          <div className="warden-tabs" role="tablist" aria-label="Warden sections">
            <button
              className={activeTab === 'gatepasses' ? 'warden-tab active' : 'warden-tab'}
              type="button"
              onClick={() => {
                setActiveTab('gatepasses')
                loadGatePasses()
              }}
            >
              <span>▤</span> Gate Pass Requests
            </button>

            <button
              className={activeTab === 'students' ? 'warden-tab active' : 'warden-tab'}
              type="button"
              onClick={() => {
                setActiveTab('students')
                loadStudents()
              }}
            >
              <span>♙</span> All Students
            </button>
          </div>
        </div>

        {message && <p className="message warden-message" role="status">{message}</p>}

        {activeTab === 'gatepasses' && (
          <div className="warden-section">
            <div className="section-toolbar">
              <div>
                <h4>Outing requests</h4>
                <p>Review the details and take action on pending requests.</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={loadGatePasses}
                disabled={loading}
              >
                {loading ? 'Loading…' : '↻ Refresh'}
              </button>
            </div>

            {loading && <div className="warden-loading">Loading gate pass requests…</div>}

            {!loading && gatePasses.length === 0 && (
              <div className="warden-empty">
                <span>▤</span>
                <strong>No gate pass requests</strong>
                <p>New student requests will appear here.</p>
              </div>
            )}

            <div className="warden-request-grid">
              {gatePasses.map((pass) => (
                <article className="request-card" key={pass.id}>
                  <div className="request-card-head">
                    <div>
                      <small>REQUEST ID</small>
                      <strong>#{pass.id}</strong>
                    </div>
                    <span className={`status-pill ${String(pass.status || '').toLowerCase()}`}>
                      {pass.status}
                    </span>
                  </div>

                  <div className="request-student">
                    <div className="request-avatar">
                      {(pass.studentName || 'S').slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <strong>{pass.studentName}</strong>
                      <span>{pass.rollNumber || 'No roll number'} · Room {pass.roomNumber || '—'}</span>
                    </div>
                  </div>

                  <div className="request-details">
                    <div>
                      <small>DEPARTMENT</small>
                      <strong>{pass.department || '—'}</strong>
                    </div>
                    <div>
                      <small>CONTACT</small>
                      <strong>{pass.contactNumber || '—'}</strong>
                    </div>
                    <div>
                      <small>REASON</small>
                      <strong>{pass.reason || '—'}</strong>
                    </div>
                    <div>
                      <small>DEPARTURE</small>
                      <strong>{pass.departureDate} · {pass.departureTime}</strong>
                    </div>
                    <div>
                      <small>EXPECTED RETURN</small>
                      <strong>{pass.returnDate} · {pass.returnTime}</strong>
                    </div>
                    <div className="request-description">
                      <small>DESCRIPTION</small>
                      <p>{pass.description || 'No additional description provided.'}</p>
                    </div>
                  </div>

                  <div className="request-actions">
                    {pass.status === 'PENDING' ? (
                      <>
                        <button
                          className="approve-button"
                          type="button"
                          onClick={() => updateGatePass(pass.id, 'approve')}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="reject-button"
                          type="button"
                          onClick={() => updateGatePass(pass.id, 'reject')}
                        >
                          ✕ Reject
                        </button>
                      </>
                    ) : pass.status === 'APPROVED' ? (
                      <a
                        className="download-pass-link"
                        href={`${API_URL}/api/gatepass/${pass.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download approved pass ↗
                      </a>
                    ) : (
                      <span className="request-closed-label">Request reviewed</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
                {activeTab === 'students' && (
          <div className="warden-section">
            <div className="section-toolbar student-toolbar">
              <div>
                <h4>
                  Registered students <span className="count-chip">{students.length}</span>
                </h4>
                <p>Search student records by name, roll number, email, or room.</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={loadStudents}
                disabled={studentsLoading}
              >
                {studentsLoading ? 'Loading…' : '↻ Refresh'}
              </button>
            </div>

            <div className="student-search-wrap">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Search students…"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
              />
            </div>

            {studentsLoading && (
              <div className="warden-loading">Loading student records…</div>
            )}

            {!studentsLoading && filteredStudents.length === 0 && (
              <div className="warden-empty">
                <span>♙</span>
                <strong>No students found</strong>
                <p>Try a different search term or refresh the list.</p>
              </div>
            )}

            {!studentsLoading && filteredStudents.length > 0 && (
              <div className="student-table-wrap">
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>STUDENT</th>
                      <th>ROLL NUMBER</th>
                      <th>ROOM</th>
                      <th>DEPARTMENT</th>
                      <th>CONTACT</th>
                      <th>REGISTERED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <div className="table-student">
                            <span>{(student.name || 'S').slice(0, 1).toUpperCase()}</span>
                            <div>
                              <strong>{student.name}</strong>
                              <small>{student.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>{student.rollNumber || '—'}</td>
                        <td>{student.roomNumber || '—'}</td>
                        <td>{student.department || '—'}</td>
                        <td>{student.phone || '—'}</td>
                        <td>
                          {student.createdAt
                            ? new Date(student.createdAt).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------- MAIN APPLICATION ----------------

function App() {
  const [auth, setAuth] = useState(() => {
    const savedAuth = localStorage.getItem('hostelAuth')
    return savedAuth ? JSON.parse(savedAuth) : null
  })

  const [page, setPage] = useState(() => {
    const savedAuth = localStorage.getItem('hostelAuth')
    if (!savedAuth) return 'student'

    try {
      const saved = JSON.parse(savedAuth)
      if (saved.user?.role === 'WARDEN' || saved.user?.role === 'ADMIN') {
        return 'warden'
      }
      if (saved.user?.role === 'SECURITY') return 'security'
      return 'student'
    } catch {
      return 'student'
    }
  })

  const [profile, setProfile] = useState(null)
  const [gatePasses, setGatePasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const isWarden =
    auth?.user?.role === 'WARDEN' || auth?.user?.role === 'ADMIN'

  const isStudent = auth?.user?.role === 'STUDENT'

  const canUseSecurity =
    isWarden || auth?.user?.role === 'SECURITY'

  const handleLogin = (token, user) => {
    const authData = { token, user }
    localStorage.setItem('hostelAuth', JSON.stringify(authData))
    setAuth(authData)

    if (user.role === 'WARDEN' || user.role === 'ADMIN') {
      setPage('warden')
    } else if (user.role === 'SECURITY') {
      setPage('security')
    } else {
      setPage('student')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('hostelAuth')
    setAuth(null)
    setProfile(null)
    setGatePasses([])
    setMessage('')
    setPage('student')
  }

  const loadProfile = async () => {
    if (!auth?.token) return

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load profile.')
      }

      setProfile(data.user || data)
    } catch (error) {
      setMessage(error.message)
    }
  }

  const loadMyGatePasses = async () => {
    if (!auth?.token) return

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/my-gatepasses`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load gate pass history.')
      }

      setGatePasses(Array.isArray(data) ? data : data.data || [])
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    contactNumber: '',
    departureDate: getTodayDate(),
    departureTime: '',
    returnDate: getTodayDate(),
    returnTime: '',
  })

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleGatePassSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    if (!/^[0-9]{10}$/.test(formData.contactNumber)) {
      setMessage('Please enter a valid 10-digit contact number.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/gatepass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Gate pass request failed.')
      }

      setMessage(data.message || 'Gate pass request submitted successfully.')

      setFormData({
        reason: '',
        description: '',
        contactNumber: profile?.phone || '',
        departureDate: getTodayDate(),
        departureTime: '',
        returnDate: getTodayDate(),
        returnTime: '',
      })

      await loadMyGatePasses()
    } catch (error) {
      setMessage(error.message || 'Unable to connect to backend.')
    } finally {
      setLoading(false)
    }
  }

  // Load student data after student login.
  useState(() => {
    if (auth && isStudent) {
      loadProfile()
      loadMyGatePasses()
    }
  }, [auth?.token])

  const renderStudentPortal = () => (
    <div className="student-workspace">
      <section className="student-hero">
        <div>
          <span className="panel-kicker">STUDENT SERVICES</span>
          <h2>Welcome, {profile?.name || auth?.user?.name || 'Student'}</h2>
          <p>Manage your hostel outing requests and track your gate pass status.</p>
        </div>
        <div className="student-hero-mark">🎓</div>
      </section>

      <div className="student-overview-grid">
        <article className="student-overview-card">
          <span className="overview-icon">▤</span>
          <div>
            <small>TOTAL REQUESTS</small>
            <strong>{gatePasses.length}</strong>
          </div>
        </article>
        <article className="student-overview-card">
          <span className="overview-icon approved-overview">✓</span>
          <div>
            <small>APPROVED</small>
            <strong>{gatePasses.filter((pass) => pass.status === 'APPROVED').length}</strong>
          </div>
        </article>
        <article className="student-overview-card">
          <span className="overview-icon pending-overview">◷</span>
          <div>
            <small>PENDING</small>
            <strong>{gatePasses.filter((pass) => pass.status === 'PENDING').length}</strong>
          </div>
        </article>
      </div>

      <div className="student-content-grid">
        <section className="student-form-panel">
          <div className="section-heading">
            <span className="panel-kicker">NEW APPLICATION</span>
            <h3>Request an Outing</h3>
            <p>Fill in your outing details and submit the request to your warden.</p>
          </div>

          <form onSubmit={handleGatePassSubmit} className="outing-form">
            <label>Reason for outing</label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleFormChange}
              required
            >
              <option value="">Select reason</option>
              <option value="Personal Work">Personal Work</option>
              <option value="Medical">Medical</option>
              <option value="Family Visit">Family Visit</option>
              <option value="Shopping">Shopping</option>
              <option value="College Work">College Work</option>
              <option value="Other">Other</option>
            </select>

            <label>Additional details</label>
            <textarea
              name="description"
              placeholder="Provide a brief description..."
              value={formData.description}
              onChange={handleFormChange}
              rows="3"
            />

            <label>Contact number</label>
            <input
              type="tel"
              name="contactNumber"
              placeholder="10-digit mobile number"
              value={formData.contactNumber}
              onChange={handleFormChange}
              maxLength="10"
              required
            />

            <div className="form-two-columns">
              <div>
                <label>Departure date</label>
                <input
                  type="date"
                  name="departureDate"
                  min={getTodayDate()}
                  value={formData.departureDate}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div>
                <label>Departure time</label>
                <input
                  type="time"
                  name="departureTime"
                  value={formData.departureTime}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div>
                <label>Return date</label>
                <input
                  type="date"
                  name="returnDate"
                  min={formData.departureDate || getTodayDate()}
                  value={formData.returnDate}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div>
                <label>Return time</label>
                <input
                  type="time"
                  name="returnTime"
                  value={formData.returnTime}
                  onChange={handleFormChange}
                  required
                />
              </div>
            </div>

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Outing Request →'}
            </button>
          </form>

          {message && <p className="message">{message}</p>}
        </section>

        <section className="student-history-panel">
          <div className="section-heading history-heading">
            <div>
              <span className="panel-kicker">ACTIVITY</span>
              <h3>My Gate Passes</h3>
              <p>Track the status of your submitted requests.</p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={loadMyGatePasses}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>

          {loading && <p className="empty-state">Loading your requests...</p>}

          {!loading && gatePasses.length === 0 && (
            <div className="empty-state">
              <span>▤</span>
              <strong>No requests yet</strong>
              <p>Your outing requests will appear here.</p>
            </div>
          )}

          <div className="student-history-list">
            {gatePasses.map((pass) => (
              <article className="student-pass-card" key={pass.id}>
                <div className="pass-card-top">
                  <div>
                    <small>GATE PASS #{pass.id}</small>
                    <strong>{pass.reason}</strong>
                  </div>
                  <span className={`status-pill ${String(pass.status || '').toLowerCase()}`}>
                    {pass.status}
                  </span>
                </div>

                <div className="pass-card-dates">
                  <div>
                    <small>DEPARTURE</small>
                    <strong>{pass.departureDate} · {pass.departureTime}</strong>
                  </div>
                  <div>
                    <small>RETURN</small>
                    <strong>{pass.returnDate} · {pass.returnTime}</strong>
                  </div>
                </div>

                {pass.status === 'APPROVED' && (
                  <a
                    className="download-pass-link"
                    href={`${API_URL}/api/gatepass/${pass.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download Gate Pass PDF ↗
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )

  return (
    <div className="portal-shell">
      {auth && (
        <aside className="portal-sidebar">
          <div className="portal-brand">
            <div className="portal-brand-mark">HG</div>
            <div>
              <strong>HOSTEL GATE</strong>
              <span>PASS MANAGEMENT</span>
            </div>
          </div>

          <div className="sidebar-section-label">WORKSPACE</div>

          <nav className="portal-navigation">
            {isStudent && (
              <button
                className={page === 'student' ? 'nav-link active' : 'nav-link'}
                onClick={() => setPage('student')}
                type="button"
              >
                <span>▦</span> Student Portal
              </button>
            )}

            {isWarden && (
              <button
                className={page === 'warden' ? 'nav-link active' : 'nav-link'}
                onClick={() => setPage('warden')}
                type="button"
              >
                <span>▤</span> Warden Portal
              </button>
            )}

            {canUseSecurity && (
              <button
                className={page === 'security' ? 'nav-link active' : 'nav-link'}
                onClick={() => setPage('security')}
                type="button"
              >
                <span>⌑</span> Security Scanner
              </button>
            )}
          </nav>

          <div className="sidebar-bottom">
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {(auth.user?.name || 'U').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <strong>{auth.user?.name || 'User'}</strong>
                <span>{auth.user?.role || 'USER'}</span>
              </div>
            </div>

            <button className="logout-button" onClick={handleLogout} type="button">
              ⇥ Logout
            </button>
          </div>
        </aside>
      )}

      <main className="portal-main">
        {!auth ? (
          <StudentAuth onLogin={handleLogin} />
        ) : (
          <>
            <header className="portal-topbar">
              <div>
                <span className="panel-kicker">SMART HOSTEL MANAGEMENT</span>
                <h1>
                  {page === 'warden'
                    ? 'Warden Workspace'
                    : page === 'security'
                    ? 'Security Workspace'
                    : 'Student Workspace'}
                </h1>
              </div>
              <div className="topbar-user">
                <span className="topbar-status-dot" />
                <span>{auth.user?.name}</span>
              </div>
            </header>

            <div className="portal-content">
              {isWarden && page === 'warden' ? (
                <WardenPortal token={auth.token} />
              ) : canUseSecurity && page === 'security' ? (
                <SecurityScanner />
              ) : isStudent && page === 'student' ? (
                renderStudentPortal()
              ) : (
                <div className="access-denied">
                  <h2>Access Denied</h2>
                  <p>You do not have permission to access this workspace.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App