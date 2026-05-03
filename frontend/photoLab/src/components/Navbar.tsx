// components/Navbar.tsx

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import "./Navbar.css";

const Navbar: React.FC = () => {
  const { user, loading, signInGoogle, signOutUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInGoogle();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <nav className="navbar">
      {/* Brand */}
      <a href="/" className="navbar__brand">
        <span className="navbar__logo">
          {/* Camera aperture icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3.5" />
            <line x1="12" y1="2.5" x2="12" y2="8.5" />
            <line x1="19.8" y1="7" x2="14.6" y2="10" />
            <line x1="19.8" y1="17" x2="14.6" y2="14" />
            <line x1="12" y1="21.5" x2="12" y2="15.5" />
            <line x1="4.2" y1="17" x2="9.4" y2="14" />
            <line x1="4.2" y1="7" x2="9.4" y2="10" />
          </svg>
        </span>
        <span className="navbar__name">PhotoLab Studio</span>
      </a>

      {/* Nav links */}
      <ul className="navbar__links">
        <li>
          <a href="/" className="navbar__link navbar__link--active">
            Studio
          </a>
        </li>
        <li>
          <a href="/pricing" className="navbar__link">
            Pricing
          </a>
        </li>
        <li>
          <a href="/guide" className="navbar__link">
            Guide
          </a>
        </li>
      </ul>

      {/* Auth area */}
      <div className="navbar__auth">
        {loading ? (
          <div className="navbar__avatar-skeleton" />
        ) : user ? (
          <div className="navbar__user" onMouseLeave={() => setMenuOpen(false)}>
            <button
              className="navbar__avatar-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="User menu"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? "User"}
                  className="navbar__avatar"
                />
              ) : (
                <span className="navbar__avatar navbar__avatar--initials">
                  {user.displayName?.[0] ?? user.email?.[0] ?? "?"}
                </span>
              )}
              <svg
                className="navbar__chevron"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {menuOpen && (
              <div className="navbar__dropdown">
                <div className="navbar__dropdown-header">
                  <p className="navbar__dropdown-name">
                    {user.displayName ?? "User"}
                  </p>
                  <p className="navbar__dropdown-email">{user.email}</p>
                </div>
                <hr className="navbar__dropdown-divider" />
                <a href="/account" className="navbar__dropdown-item">
                  Account settings
                </a>
                <a href="/usage" className="navbar__dropdown-item">
                  Usage & quota
                </a>
                <hr className="navbar__dropdown-divider" />
                <button
                  className="navbar__dropdown-item navbar__dropdown-item--danger"
                  onClick={signOutUser}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="navbar__signin-btn"
            onClick={handleSignIn}
            disabled={signingIn}
          >
            {signingIn ? (
              <span className="navbar__spinner" />
            ) : (
              // Google "G" icon
              <svg className="navbar__google-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {signingIn ? "Signing in…" : "Sign in with Google"}
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
