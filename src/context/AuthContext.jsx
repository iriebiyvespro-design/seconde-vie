import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  JWT_STORAGE_KEY,
  USER_STORAGE_KEY,
  getStoredJwt,
  loginStrapi,
  registerStrapi,
  fetchCurrentUserStrapi,
  updateUserStrapi,
  forgotPasswordStrapi,
  resetPasswordStrapi,
  STRAPI_API_URL
} from '../services/strapi';
import { notifyPasswordReset } from '../services/notifications';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [jwt, setJwt] = useState(() => getStoredJwt());
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(Boolean(getStoredJwt()));

  // Synchronisation automatique du profil et du rôle réel avec Strapi au chargement
  useEffect(() => {
    const syncUserWithStrapi = async () => {
      const token = getStoredJwt();
      if (!token) {
        setInitializing(false);
        return;
      }

      try {
        const freshUser = await fetchCurrentUserStrapi(token);
        if (freshUser) {
          setUser((prev) => {
            const merged = {
              ...prev,
              ...freshUser,
              phone: freshUser.phone !== '+2250700000000' ? freshUser.phone : prev?.phone || freshUser.phone,
              commune: prev?.commune || freshUser.commune,
              quartier: prev?.quartier || freshUser.quartier
            };
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        console.warn('Session Strapi expirée ou invalide :', err.message);
        if (err.status === 401 || err.status === 403) {
          localStorage.removeItem(JWT_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
          setJwt(null);
          setUser(null);
        }
      } finally {
        setInitializing(false);
      }
    };

    syncUserWithStrapi();
  }, []);

  /**
   * Connexion réelle Strapi (POST /auth/local)
   */
  const login = async (identifier, password) => {
    setLoading(true);
    try {
      const { jwt: newJwt, user: authenticatedUser } = await loginStrapi(identifier, password);
      setJwt(newJwt);
      setUser(authenticatedUser);
      return { success: true, user: authenticatedUser };
    } catch (err) {
      let friendlyMsg = err.message;
      if (err.message === 'Failed to fetch') {
        friendlyMsg = `Serveur Strapi injoignable sur ${STRAPI_API_URL}. Vérifiez qu'il est bien démarré.`;
      } else if (err.message?.toLowerCase().includes('invalid identifier or password')) {
        friendlyMsg = 'Identifiant (email ou pseudo) ou mot de passe incorrect.';
      }
      return { success: false, error: friendlyMsg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inscription réelle Strapi (POST /auth/local/register)
   */
  const signup = async ({ username, email, password, full_name, phone, commune, quartier }) => {
    setLoading(true);
    try {
      const { jwt: newJwt, user: registeredUser } = await registerStrapi({
        username,
        email,
        password,
        full_name,
        phone,
        commune,
        quartier
      });
      setJwt(newJwt);
      setUser(registeredUser);
      return { success: true, user: registeredUser };
    } catch (err) {
      let friendlyMsg = err.message;
      if (err.message === 'Failed to fetch') {
        friendlyMsg = `Serveur Strapi injoignable sur ${STRAPI_API_URL}.`;
      } else if (err.message?.toLowerCase().includes('already taken')) {
        friendlyMsg = 'Cet email ou nom d’utilisateur est déjà utilisé.';
      }
      return { success: false, error: friendlyMsg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Déconnexion complète
   */
  const logout = () => {
    localStorage.removeItem(JWT_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setJwt(null);
    setUser(null);
  };

  /**
   * Mise à jour du profil utilisateur
   */
  const updateProfile = async (updates) => {
    const updatedLocal = { ...user, ...updates };
    setUser(updatedLocal);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedLocal));

    if (jwt && user?.id) {
      try {
        const remoteUpdated = await updateUserStrapi(user.id, updates, jwt);
        const merged = { ...updatedLocal, ...remoteUpdated };
        setUser(merged);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(merged));
        return { success: true, user: merged };
      } catch (err) {
        console.warn('Mise à jour Strapi partielle (champs personnalisés conservés localement) :', err.message);
      }
    }
    return { success: true, user: updatedLocal };
  };

  /**
   * Demande de réinitialisation de mot de passe par E-mail (POST /auth/forgot-password)
   */
  const requestPasswordResetEmail = async (email) => {
    setLoading(true);
    try {
      await forgotPasswordStrapi(email.trim());
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const notif = await notifyPasswordReset({
        channel: 'email',
        email: email.trim(),
        resetCode: 'Lien Strapi',
        resetUrl: `${origin}/?code=STRAPI_TOKEN`,
      });
      return { success: true, channel: 'email', notification: notif };
    } catch (err) {
      let friendlyMsg = err.message;
      if (err.message === 'Failed to fetch') {
        friendlyMsg = `Serveur Strapi injoignable sur ${STRAPI_API_URL}.`;
      }
      return { success: false, error: friendlyMsg };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Demande de réinitialisation de mot de passe par WhatsApp (service de notifications)
   */
  const requestPasswordResetWhatsApp = async (phone) => {
    setLoading(true);
    try {
      const code = `SV-${Math.floor(100000 + Math.random() * 900000)}`;
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const resetUrl = `${origin}/?code=${encodeURIComponent(code)}`;
      const notif = await notifyPasswordReset({
        channel: 'whatsapp',
        phone: phone.trim(),
        resetCode: code,
        resetUrl,
      });
      return {
        success: true,
        channel: 'whatsapp',
        resetCode: code,
        resetUrl,
        notification: notif,
      };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Réinitialisation finale avec le code (?code=...) via POST /auth/reset-password
   */
  const resetPassword = async ({ code, password, passwordConfirmation }) => {
    setLoading(true);
    try {
      const res = await resetPasswordStrapi({ code, password, passwordConfirmation });
      if (res?.jwt) {
        setJwt(res.jwt);
        setUser(res.user);
      }
      return { success: true, user: res?.user || null };
    } catch (err) {
      let friendlyMsg = err.message;
      if (err.message === 'Failed to fetch') {
        friendlyMsg = `Serveur Strapi injoignable sur ${STRAPI_API_URL}.`;
      } else if (err.message?.toLowerCase().includes('incorrect code')) {
        friendlyMsg = 'Code de réinitialisation invalide ou expiré.';
      }
      return { success: false, error: friendlyMsg };
    } finally {
      setLoading(false);
    }
  };

  // Détermination dynamique des permissions selon le rôle réel Strapi ou l'e-mail Super Admin
  const isSuperAdmin = checkIsSuperAdminUser(user);
  const isAdmin = isSuperAdmin || checkIsAdminUser(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        jwt,
        isAdmin,
        isSuperAdmin,
        loading,
        initializing,
        login,
        signup,
        logout,
        updateProfile,
        requestPasswordResetEmail,
        requestPasswordResetWhatsApp,
        resetPassword,
        isAuthenticated: Boolean(user && jwt)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const SUPER_ADMIN_EMAIL = 'fdigitalet@gmail.com';

export function checkIsSuperAdminUser(u) {
  if (!u) return false;
  const email = (u.email || '').trim().toLowerCase();
  if (email === SUPER_ADMIN_EMAIL) return true;
  const roleType = (u.roleType || u.role || '').toLowerCase();
  const roleName = (u.roleName || '').toLowerCase();
  return (
    ['super_admin', 'super_administrateur'].includes(roleType) ||
    ['super_admin', 'super admin', 'super administrateur', 'super_administrateur'].includes(roleName)
  );
}

export function checkIsAdminUser(u) {
  if (!u) return false;
  if (checkIsSuperAdminUser(u)) return true;
  const roleType = (u.roleType || u.role || '').toLowerCase();
  const roleName = (u.roleName || '').toLowerCase();
  return (
    ['admin', 'administrateur', 'super_admin', 'super_administrateur', 'administrator', 'moderator', 'moderateur'].includes(roleType) ||
    ['admin', 'administrateur', 'super admin', 'super administrateur', 'administrator', 'moderateur', 'moderator'].includes(roleName)
  );
}

export const useAuth = () => useContext(AuthContext);
