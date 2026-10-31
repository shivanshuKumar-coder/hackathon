import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HOME_BY_ROLE, useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/authService.js';

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  let script = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
  if (!script) {
    script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    document.head.appendChild(script);
  }
  return new Promise((resolve, reject) => {
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', reject, { once: true });
  });
}

// "Sign in with Google". Shows nothing when GOOGLE_CLIENT_ID is not set on the server.
export default function GoogleButton({ text = 'signin_with', redirectTo }) {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const box = useRef(null);
  const [clientId, setClientId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    authService
      .config()
      .then((c) => setClientId(c.googleClientId))
      .catch(() => setClientId(null));
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !box.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            setError('');
            try {
              const user = await googleLogin(credential);
              navigate(redirectTo || HOME_BY_ROLE[user.role], { replace: true });
            } catch (err) {
              setError(err.message);
            }
          },
        });
        window.google.accounts.id.renderButton(box.current, {
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          width: box.current.offsetWidth || 320,
        });
      })
      .catch(() => setError('Could not load Google sign-in'));
    return () => {
      cancelled = true;
    };
  }, [clientId, googleLogin, navigate, redirectTo, text]);

  if (!clientId) return null;
  return (
    <div className="google-signin">
      <div className="divider">
        <span>or</span>
      </div>
      <div ref={box} className="google-button" />
      {error && <p className="error">{error}</p>}
    </div>
  );
}
