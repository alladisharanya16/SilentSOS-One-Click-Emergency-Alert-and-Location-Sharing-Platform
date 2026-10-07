import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  // ==========================================
  // AUTHENTICATION
  // ==========================================

  const [token, setToken] = useState(
    localStorage.getItem("silentSOS_token")
  );

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("silentSOS_user");

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState("login");

  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [authStatus, setAuthStatus] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // ==========================================
  // DASHBOARD STATE
  // ==========================================

  const [contacts, setContacts] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [systemStatus, setSystemStatus] =
    useState("Checking...");

  // ==========================================
  // AUTH HEADERS
  // ==========================================

  const getAuthHeaders = () => {
    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  // ==========================================
  // REGISTER
  // ==========================================

  const registerUser = async (event) => {
    event.preventDefault();

    setAuthStatus("");

    if (
      !authName.trim() ||
      !authEmail.trim() ||
      !authPassword.trim() ||
      !confirmPassword.trim()
    ) {
      setAuthStatus("Please fill in all fields.");
      return;
    }

    if (authPassword.length < 6) {
      setAuthStatus(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (authPassword !== confirmPassword) {
      setAuthStatus("Passwords do not match.");
      return;
    }

    try {
      setAuthLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: authName.trim(),
            email: authEmail.trim(),
            password: authPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed."
        );
      }

      setAuthStatus(
        "Registration successful. Please login."
      );

      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
      setConfirmPassword("");

      setAuthMode("login");
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      setAuthStatus(
        error.message ||
          "Could not create account."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // ==========================================
  // LOGIN
  // ==========================================

  const loginUser = async (event) => {
    event.preventDefault();

    setAuthStatus("");

    if (
      !authEmail.trim() ||
      !authPassword.trim()
    ) {
      setAuthStatus(
        "Please enter email and password."
      );
      return;
    }

    try {
      setAuthLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: authEmail.trim(),
            password: authPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed."
        );
      }

      localStorage.setItem(
        "silentSOS_token",
        data.token
      );

      localStorage.setItem(
        "silentSOS_user",
        JSON.stringify(data.user)
      );

      setToken(data.token);
      setUser(data.user);

      setAuthEmail("");
      setAuthPassword("");
      setAuthStatus("");
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setAuthStatus(
        error.message ||
          "Could not login."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const logoutUser = () => {
    localStorage.removeItem(
      "silentSOS_token"
    );

    localStorage.removeItem(
      "silentSOS_user"
    );

    setToken(null);
    setUser(null);

    setContacts([]);
    setAlerts([]);
    setStatus("");
  };

  // ==========================================
  // VERIFY LOGIN
  // ==========================================

  const verifyUser = async () => {
    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/auth/profile`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        throw new Error("Session expired");
      }

      const data = await response.json();

      setUser(data.user);

      localStorage.setItem(
        "silentSOS_user",
        JSON.stringify(data.user)
      );
    } catch (error) {
      console.error(
        "Authentication verification error:",
        error
      );

      logoutUser();
    }
  };

  // ==========================================
  // LOAD CONTACTS
  // ==========================================

  const loadContacts = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/contacts`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load contacts"
        );
      }

      const data = await response.json();

      setContacts(data);
    } catch (error) {
      console.error(
        "Contact loading error:",
        error
      );
    }
  };

  // ==========================================
  // LOAD SOS HISTORY
  // ==========================================

  const loadAlerts = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/sos`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load SOS history"
        );
      }

      const data = await response.json();

      setAlerts(data);
    } catch (error) {
      console.error(
        "SOS history error:",
        error
      );
    }
  };

  // ==========================================
  // SYSTEM HEALTH CHECK
  // ==========================================

  const checkSystemStatus = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/health`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Health check failed: ${response.status}`
        );
      }

      const data = await response.json();

      if (
        data.status === "online" &&
        data.database === "connected"
      ) {
        setSystemStatus("Online");
      } else if (
        data.status === "online"
      ) {
        setSystemStatus("Partial");
      } else {
        setSystemStatus("Offline");
      }
    } catch (error) {
      console.error(
        "System health check error:",
        error
      );

      setSystemStatus("Offline");
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    if (!token) {
      return;
    }

    verifyUser();
    loadContacts();
    loadAlerts();
    checkSystemStatus();

    const interval = setInterval(() => {
      checkSystemStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  // ==========================================
  // ADD CONTACT
  // ==========================================

  const addContact = async (event) => {
    event.preventDefault();

    setStatus("");

    if (!name.trim() || !phone.trim()) {
      setStatus(
        "Please enter both name and phone number."
      );
      return;
    }

    if (!consent) {
      setStatus(
        "Please provide consent before saving the contact."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/contacts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            consent,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to save contact"
        );
      }

      setStatus(
        "Contact saved successfully."
      );

      setName("");
      setPhone("");
      setConsent(false);

      await loadContacts();
      await checkSystemStatus();
    } catch (error) {
      console.error(
        "Add contact error:",
        error
      );

      setStatus(
        error.message ||
          "Could not save contact."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // TEST SOS
  // ==========================================

  const testSOS = () => {
    setStatus("");

    if (!navigator.geolocation) {
      setStatus(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    setLoading(true);
    setStatus(
      "Getting demo location..."
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;

        try {
          const response = await fetch(
            `${API_URL}/api/sos`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                ...getAuthHeaders(),
              },
              body: JSON.stringify({
                latitude,
                longitude,
              }),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.message ||
                "Failed to save SOS"
            );
          }

          setStatus(
            "Demo request saved to MongoDB. Nobody was notified."
          );

          await loadAlerts();
          await checkSystemStatus();
        } catch (error) {
          console.error(
            "SOS error:",
            error
          );

          setStatus(
            error.message ||
              "Could not save demo SOS request."
          );
        } finally {
          setLoading(false);
        }
      },

      (error) => {
        console.error(
          "Geolocation error:",
          error
        );

        setStatus(
          "Unable to get your location. Please allow location access."
        );

        setLoading(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // ==========================================
  // ACKNOWLEDGE SOS
  // DEMO ONLY
  // ==========================================

  const acknowledgeSOS = async (alertId) => {
    try {
      setStatus(
        "Acknowledging demo SOS..."
      );

      const response = await fetch(
        `${API_URL}/api/sos/${alertId}/acknowledge`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to acknowledge SOS"
        );
      }

      setStatus(
        "Demo SOS acknowledged successfully."
      );

      await loadAlerts();
    } catch (error) {
      console.error(
        "Acknowledge SOS error:",
        error
      );

      setStatus(
        error.message ||
          "Unable to acknowledge demo SOS."
      );
    }
  };

  // ==========================================
  // RESOLVE SOS
  // DEMO ONLY
  // ==========================================

  const resolveSOS = async (alertId) => {
    try {
      setStatus(
        "Resolving demo SOS..."
      );

      const response = await fetch(
        `${API_URL}/api/sos/${alertId}/resolve`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to resolve SOS"
        );
      }

      setStatus(
        "Demo SOS resolved successfully."
      );

      await loadAlerts();
    } catch (error) {
      console.error(
        "Resolve SOS error:",
        error
      );

      setStatus(
        error.message ||
          "Unable to resolve demo SOS."
      );
    }
  };

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Unknown time";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Unknown time";
    }

    return date.toLocaleString();
  };

  // ==========================================
  // VIEW LOCATION
  // ==========================================

  const viewLocation = (
    latitude,
    longitude
  ) => {
    const mapsUrl =
      `https://www.google.com/maps?q=${latitude},${longitude}`;

    window.open(
      mapsUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // ==========================================
  // ACTIVITY DASHBOARD
  // ==========================================

  const activities = [
    ...alerts.map((alert) => ({
      id: `sos-${alert._id}`,
      type: "sos",
      title: "Demo SOS recorded",
      description:
        "Location captured and saved to MongoDB",
      time: new Date(alert.createdAt),
    })),

    ...contacts.map((contact) => ({
      id: `contact-${contact._id}`,
      type: "contact",
      title: "Emergency contact added",
      description:
        `${contact.name} was saved successfully`,
      time: new Date(
        contact.createdAt ||
          parseInt(
            contact._id
              ?.toString()
              .substring(0, 8),
            16
          ) * 1000
      ),
    })),
  ];

  activities.sort(
    (a, b) => b.time - a.time
  );

  const recentActivities =
    activities.slice(0, 6);

  const latestSOS =
    alerts.length > 0
      ? alerts[0]
      : null;

  // ==========================================
  // AUTH SCREEN
  // ==========================================

  if (!token || !user) {
    return (
      <div className="auth-page">

        <div className="auth-card shadow-lg">

          <div className="auth-header">

            <div className="auth-logo">
              🛡️
            </div>

            <h1>SilentSOS</h1>

            <p>
              Silent Emergency Assistance
            </p>

            <span className="demo-badge">
              ACADEMIC DEMO
            </span>

          </div>

          {authMode === "login" ? (
            <form
              className="auth-form"
              onSubmit={loginUser}
            >

              <h2>Welcome Back</h2>

              <p className="auth-subtitle">
                Login to access your dashboard.
              </p>

              <div className="form-group">

                <label>Email</label>

                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter your email"
                  value={authEmail}
                  onChange={(e) =>
                    setAuthEmail(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="form-group">

                <label>Password</label>

                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter your password"
                  value={authPassword}
                  onChange={(e) =>
                    setAuthPassword(
                      e.target.value
                    )
                  }
                />

              </div>

              {authStatus && (
                <div className="auth-status">
                  {authStatus}
                </div>
              )}

              <button
                type="submit"
                className="primary-button auth-button btn btn-primary"
                disabled={authLoading}
              >
                {authLoading
                  ? "Logging in..."
                  : "Login"}
              </button>

              <p className="auth-switch">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setAuthStatus("");
                  }}
                >
                  Create Account
                </button>
              </p>

            </form>
          ) : (
            <form
              className="auth-form"
              onSubmit={registerUser}
            >

              <h2>Create Account</h2>

              <p className="auth-subtitle">
                Register for your SilentSOS dashboard.
              </p>

              <div className="form-group">

                <label>Full Name</label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter your name"
                  value={authName}
                  onChange={(e) =>
                    setAuthName(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="form-group">

                <label>Email</label>

                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter your email"
                  value={authEmail}
                  onChange={(e) =>
                    setAuthEmail(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="form-group">

                <label>Password</label>

                <input
                  type="password"
                  className="form-control"
                  placeholder="Minimum 6 characters"
                  value={authPassword}
                  onChange={(e) =>
                    setAuthPassword(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="form-group">

                <label>Confirm Password</label>

                <input
                  type="password"
                  className="form-control"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                />

              </div>

              {authStatus && (
                <div className="auth-status">
                  {authStatus}
                </div>
              )}

              <button
                type="submit"
                className="primary-button auth-button btn btn-primary"
                disabled={authLoading}
              >
                {authLoading
                  ? "Creating Account..."
                  : "Create Account"}
              </button>

              <p className="auth-switch">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthStatus("");
                  }}
                >
                  Login
                </button>
              </p>

            </form>
          )}

          <div className="auth-footer">
            🔒 Demo authentication • No real emergency notifications
          </div>

        </div>

      </div>
    );
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  return (
    <div className="app">

      {/* HEADER */}

      <header className="header">

        <div className="header-content">

          <div>
            <h1>SilentSOS</h1>

            <p>
              Silent Emergency Assistance

              <span className="demo-badge">
                ACADEMIC DEMO
              </span>
            </p>
          </div>

          <div className="header-right">

            <div className="user-info">
              👤 {user.name}
            </div>

            <div className="header-status">

              <span
                className={`status-dot ${
                  systemStatus === "Online"
                    ? "online"
                    : "offline"
                }`}
              ></span>

              <span>
                {systemStatus}
              </span>

            </div>

            <button
              className="logout-button btn btn-outline-light"
              onClick={logoutUser}
            >
              Logout
            </button>

          </div>

        </div>

      </header>

      {/* DASHBOARD */}

      <main className="dashboard container-fluid py-4">

        {/* SUMMARY CARDS */}

        <section className="summary-grid row g-3">

          <div className="summary-card col-12 col-sm-6 col-xl-3">

            <div className="summary-icon">
              👥
            </div>

            <div>
              <span>Total Contacts</span>

              <strong>
                {contacts.length}
              </strong>
            </div>

          </div>

          <div className="summary-card col-12 col-sm-6 col-xl-3">

            <div className="summary-icon">
              🚨
            </div>

            <div>
              <span>Total SOS Tests</span>

              <strong>
                {alerts.length}
              </strong>
            </div>

          </div>

          <div className="summary-card col-12 col-sm-6 col-xl-3">

            <div className="summary-icon">
              📍
            </div>

            <div>
              <span>Latest SOS</span>

              <strong className="latest-sos">
                {latestSOS
                  ? formatDate(
                      latestSOS.createdAt
                    )
                  : "No tests yet"}
              </strong>
            </div>

          </div>

          <div className="summary-card col-12 col-sm-6 col-xl-3">

            <div className="summary-icon">
              {systemStatus === "Online"
                ? "🟢"
                : "🔴"}
            </div>

            <div>
              <span>System Status</span>

              <strong>
                {systemStatus}
              </strong>
            </div>

          </div>

        </section>

        {/* STATUS */}

        {status && (
          <div className="status-box mt-3">
            {status}
          </div>
        )}

        {/* TEST SOS */}

        <section className="card sos-card mt-3">

          <div className="section-heading">

            <div>
              <h2>Test SilentSOS</h2>

              <p>
                Capture your browser location
                and store a demo request.
              </p>
            </div>

          </div>

          <button
            className="sos-button btn btn-danger"
            onClick={testSOS}
            disabled={loading}
          >
            {loading
              ? "PROCESSING..."
              : "TEST SOS"}
          </button>

          <p className="demo-warning">
            ⚠️ Academic demonstration only.
            No real emergency notification
            will be sent.
          </p>

        </section>

        {/* ADD CONTACT */}

        <section className="card mt-3">

          <div className="section-heading">

            <div>
              <h2>Emergency Contacts</h2>

              <p>
                Store consent-based emergency
                contact information.
              </p>
            </div>

          </div>

          <form
            className="contact-form row g-3"
            onSubmit={addContact}
          >

            <div className="form-group col-md-6">

              <label>Contact Name</label>

              <input
                type="text"
                className="form-control"
                placeholder="Enter name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
              />

            </div>

            <div className="form-group col-md-6">

              <label>Phone Number</label>

              <input
                type="tel"
                className="form-control"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
              />

            </div>

            <label className="consent-label col-12">

              <input
                type="checkbox"
                checked={consent}
                onChange={(e) =>
                  setConsent(
                    e.target.checked
                  )
                }
              />

              <span>
                I have permission to store
                this contact information.
              </span>

            </label>

            <div className="col-12">

              <button
                type="submit"
                className="primary-button btn btn-primary"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : "Add Contact"}
              </button>

            </div>

          </form>

        </section>

        {/* SAVED CONTACTS */}

        <section className="card mt-3">

          <div className="section-heading">

            <div>
              <h2>Saved Contacts</h2>

              <p>
                Contacts currently stored
                in MongoDB.
              </p>
            </div>

          </div>

          {contacts.length === 0 ? (

            <div className="empty-state">

              <div>👤</div>

              <p>
                No emergency contacts
                added yet.
              </p>

            </div>

          ) : (

            <div className="contact-list">

              {contacts.map(
                (contact) => (

                  <div
                    className="contact-item"
                    key={contact._id}
                  >

                    <div className="contact-avatar">
                      {contact.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="contact-info">

                      <strong>
                        {contact.name}
                      </strong>

                      <span>
                        {contact.phone}
                      </span>

                      <small>
                        Added:{" "}
                        {formatDate(
                          contact.createdAt
                        )}
                      </small>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* ACTIVITY */}

        <section className="card activity-card mt-3">

          <div className="section-heading">

            <div>
              <h2>Recent Activity</h2>

              <p>
                Latest activity recorded
                by the application.
              </p>
            </div>

            <button
              className="secondary-button btn btn-outline-secondary"
              onClick={() => {
                loadContacts();
                loadAlerts();
                checkSystemStatus();
              }}
            >
              Refresh Activity
            </button>

          </div>

          {recentActivities.length === 0 ? (

            <div className="activity-empty">

              <div className="activity-empty-icon">
                📊
              </div>

              <p>
                No recent activity.
              </p>

            </div>

          ) : (

            <div className="activity-list">

              {recentActivities.map(
                (activity) => (

                  <div
                    className="activity-item"
                    key={activity.id}
                  >

                    <div
                      className={`activity-icon ${
                        activity.type === "sos"
                          ? "activity-sos"
                          : "activity-contact"
                      }`}
                    >
                      {activity.type === "sos"
                        ? "🚨"
                        : "👤"}
                    </div>

                    <div className="activity-content">

                      <strong>
                        {activity.title}
                      </strong>

                      <p>
                        {activity.description}
                      </p>

                    </div>

                    <div className="activity-time">
                      {formatDate(
                        activity.time
                      )}
                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* SOS HISTORY */}

        <section className="card mt-3">

          <div className="section-heading">

            <div>
              <h2>SOS History</h2>

              <p>
                Demo SOS requests stored in MongoDB.
              </p>
            </div>

          </div>

          {alerts.length === 0 ? (

            <div className="empty-state">

              <div>🚨</div>

              <p>
                No SOS tests recorded yet.
              </p>

            </div>

          ) : (

            <div className="alert-list">

              {alerts.map((alert) => (

                <div
                  className="alert-item"
                  key={alert._id}
                >

                  <div className="alert-icon">
                    🚨
                  </div>

                  <div className="alert-info">

                    <strong>
                      Demo SOS Request
                    </strong>

                    <span>
                      {formatDate(alert.createdAt)}
                    </span>

                    <small>
                      Latitude: {alert.latitude}
                      <br />
                      Longitude: {alert.longitude}
                    </small>

                    <small>
                      Status:{" "}

                      <strong>
                        {alert.status || "SENT"}
                      </strong>
                    </small>

                    {alert.responseTimeSeconds !== null &&
                      alert.responseTimeSeconds !== undefined && (
                        <small>
                          Response Time:{" "}
                          {alert.responseTimeSeconds} seconds
                        </small>
                      )}

                  </div>

                  <div className="alert-actions">

                    <span className="demo-status">
                      DEMO ONLY
                    </span>

                    <button
                      className="location-button btn btn-primary"
                      onClick={() =>
                        viewLocation(
                          alert.latitude,
                          alert.longitude
                        )
                      }
                    >
                      View Location
                    </button>

                    {alert.status === "SENT" && (

                      <button
                        className="primary-button btn btn-primary"
                        onClick={() =>
                          acknowledgeSOS(alert._id)
                        }
                      >
                        Acknowledge
                      </button>

                    )}

                    {alert.status === "ACKNOWLEDGED" && (

                      <button
                        className="primary-button btn btn-primary"
                        onClick={() =>
                          resolveSOS(alert._id)
                        }
                      >
                        Resolve
                      </button>

                    )}

                    {alert.status === "RESOLVED" && (

                      <span className="resolved-status">
                        ✓ RESOLVED
                      </span>

                    )}

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

      </main>

      {/* FOOTER */}

      <footer className="footer">

        <p>
          SilentSOS — Academic Project
        </p>

        <p>
          DEMO MODE • No real emergency
          notifications are sent.
        </p>

      </footer>

    </div>
  );
}

export default App;