import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  AlertCircle,
  ShieldCheck,
  Info,
  Eye,
  EyeOff,
  ArrowLeft,
  MessageCircle,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COMMUNES_ABIDJAN } from '../data/communes';

/**
 * Champ mot de passe réutilisable avec icône Œil (Afficher / Masquer)
 */
function PasswordField({
  value,
  onChange,
  placeholder = '••••••••',
  required = true,
  minLength,
  className = 'py-3',
  ariaLabel = 'Afficher ou masquer le mot de passe'
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative flex items-center">
      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className={`w-full pl-10 pr-11 ${className} bg-creme-50/50 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-eco-600 outline-none`}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={ariaLabel}
        title={visible ? 'Masquer' : 'Afficher'}
        className="absolute right-2.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function AuthModal({
  onClose,
  defaultTab = 'login',
  notice = null,
  initialResetCode = '',
  onResetComplete,
  onSuccess
}) {
  const {
    login,
    signup,
    requestPasswordResetEmail,
    requestPasswordResetWhatsApp,
    resetPassword
  } = useAuth();

  const [tab, setTab] = useState(defaultTab); // 'login' | 'signup' | 'forgot' | 'reset'

  // États Connexion / Inscription
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+225 ');
  const [commune, setCommune] = useState('Cocody');
  const [quartier, setQuartier] = useState('');

  // États Mot de passe oublié (E-mail + WhatsApp)
  const [recoveryChannel, setRecoveryChannel] = useState('email'); // 'email' | 'whatsapp'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotWhatsapp, setForgotWhatsapp] = useState('+225 ');
  const [forgotConfirmation, setForgotConfirmation] = useState(null);

  // États Réinitialisation (?code=...)
  const [resetCode, setResetCode] = useState(initialResetCode);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (initialResetCode) {
      setResetCode(initialResetCode);
    }
  }, [initialResetCode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(identifier.trim(), password);
    setLoading(false);
    if (res.success) {
      if (onSuccess) onSuccess(res.user);
      onClose();
    } else {
      setError(res.error || 'Identifiant ou mot de passe incorrect.');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password || (!username && !fullName)) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setLoading(true);
    const res = await signup({
      username: username.trim() || fullName.trim().toLowerCase().replace(/\s+/g, '_'),
      email: email.trim(),
      password,
      full_name: fullName.trim() || username.trim(),
      phone,
      commune,
      quartier
    });
    setLoading(false);
    if (res.success) {
      if (onSuccess) onSuccess(res.user);
      onClose();
    } else {
      setError(res.error || 'Impossible de créer le compte sur Strapi.');
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setForgotConfirmation(null);

    if (recoveryChannel === 'email') {
      if (!forgotEmail.trim()) {
        setError('Veuillez saisir votre adresse e-mail.');
        return;
      }
      setLoading(true);
      const res = await requestPasswordResetEmail(forgotEmail);
      setLoading(false);
      if (res.success) {
        setForgotConfirmation({
          channel: 'email',
          message: "Un lien de réinitialisation vient d'être envoyé à votre adresse e-mail.",
          detail: `Vérifiez votre boîte de réception (${forgotEmail.trim()}) ainsi que vos courriers indésirables.`,
        });
      } else {
        setError(res.error || "Impossible d'envoyer l'e-mail de réinitialisation pour le moment.");
      }
      return;
    }

    // Canal WhatsApp
    const cleaned = forgotWhatsapp.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('Veuillez saisir un numéro WhatsApp valide (+225...).');
      return;
    }

    setLoading(true);
    const res = await requestPasswordResetWhatsApp(forgotWhatsapp);
    setLoading(false);
    if (res.success) {
      const isTestPreview = res.notification?.mode === 'test_preview';
      setForgotConfirmation({
        channel: 'whatsapp',
        isTestPreview,
        resetCode: res.resetCode,
        resetUrl: res.resetUrl,
        previewText: res.notification?.preview?.message,
        message: isTestPreview
          ? 'Mode test local : lien WhatsApp généré (clé API WhatsApp non configurée dans .env).'
          : `Un lien et un code de réinitialisation ont été envoyés par WhatsApp au ${forgotWhatsapp}.`,
      });
    } else {
      setError(res.error || 'Erreur lors de la génération de la notification WhatsApp.');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!resetCode.trim()) {
      setError('Code de réinitialisation manquant.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const res = await resetPassword({
      code: resetCode.trim(),
      password: newPassword,
      passwordConfirmation: confirmNewPassword,
    });
    setLoading(false);

    if (res.success) {
      setResetDone(true);
      if (onResetComplete) onResetComplete();
    } else {
      setError(res.error || 'Impossible de réinitialiser le mot de passe.');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-0 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full h-full sm:h-auto max-w-md bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-creme-200 overflow-hidden my-auto flex flex-col justify-between sm:block">
        
        <div>
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:px-6 border-b border-creme-200 bg-creme-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-eco-800 bg-eco-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Compte Seconde Vie
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Onglets Connexion / Inscription (masqués en mode Récupération ou Reset) */}
          {(tab === 'login' || tab === 'signup') && (
            <div className="flex border-b border-creme-200">
              <button
                type="button"
                onClick={() => { setTab('login'); setError(''); }}
                className={`flex-1 py-3.5 text-sm font-bold text-center border-b-2 transition ${
                  tab === 'login'
                    ? 'border-eco-600 text-eco-800 bg-white'
                    : 'border-transparent text-slate-400 hover:text-slate-700 bg-creme-50/30'
                }`}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => { setTab('signup'); setError(''); }}
                className={`flex-1 py-3.5 text-sm font-bold text-center border-b-2 transition ${
                  tab === 'signup'
                    ? 'border-eco-600 text-eco-800 bg-white'
                    : 'border-transparent text-slate-400 hover:text-slate-700 bg-creme-50/30'
                }`}
              >
                Créer un compte
              </button>
            </div>
          )}

          {/* Corps */}
          <div className="p-5 sm:p-6 space-y-4">
            {notice && (tab === 'login' || tab === 'signup') && (
              <div className="p-3.5 rounded-xl bg-warm-50 border border-warm-200 text-warm-900 text-xs font-semibold flex items-start gap-2.5">
                <Info className="w-4 h-4 text-warm-600 flex-shrink-0 mt-0.5" />
                <span>{notice}</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* VUE 1 : CONNEXION */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email ou Nom d'utilisateur
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="votre.email@exemple.ci"
                      required
                      className="w-full pl-10 pr-3 py-3 bg-creme-50/50 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-eco-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mot de passe
                  </label>
                  <PasswordField
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setForgotConfirmation(null);
                        setTab('forgot');
                      }}
                      className="text-xs font-bold text-eco-700 hover:text-eco-800 hover:underline transition"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-eco-700 hover:bg-eco-800 text-white font-extrabold text-sm rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {loading ? 'Connexion à Strapi...' : 'Se connecter'}
                </button>
              </form>
            )}

            {/* VUE 2 : INSCRIPTION */}
            {tab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nom d'utilisateur *
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-slate-400 absolute left-3" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="jeanluc_ci"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-creme-50/50 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-eco-600 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jean-Luc Kouamé"
                      className="w-full px-3 py-2.5 bg-creme-50/50 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-eco-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email *
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jeanluc@gmail.com"
                      required
                      className="w-full pl-10 pr-3 py-2.5 bg-creme-50/50 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-eco-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Numéro WhatsApp / Téléphone *
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+225 07 00 00 00 00"
                      required
                      className="w-full pl-10 pr-3 py-2.5 bg-creme-50/50 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-eco-600 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Commune
                    </label>
                    <select
                      value={commune}
                      onChange={(e) => setCommune(e.target.value)}
                      className="w-full p-2.5 bg-creme-50/50 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none"
                    >
                      {COMMUNES_ABIDJAN.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Quartier
                    </label>
                    <input
                      type="text"
                      value={quartier}
                      onChange={(e) => setQuartier(e.target.value)}
                      placeholder="ex: Angré, Niangon..."
                      className="w-full p-2.5 bg-creme-50/50 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mot de passe *
                  </label>
                  <PasswordField
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    required
                    minLength={6}
                    className="py-2.5"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-warm-500 to-warm-600 hover:from-warm-600 hover:to-warm-700 text-white font-extrabold text-sm rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {loading ? 'Création du compte...' : 'Créer mon compte Seconde Vie'}
                </button>
              </form>
            )}

            {/* VUE 3 : MOT DE PASSE OUBLIÉ (E-MAIL + WHATSAPP) */}
            {tab === 'forgot' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setForgotConfirmation(null);
                    setTab('login');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-eco-800 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Retour à la connexion</span>
                </button>

                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Récupérer votre mot de passe
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choisissez comment recevoir votre lien ou code de réinitialisation :
                  </p>
                </div>

                {/* Choix du canal E-mail vs WhatsApp */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryChannel('email');
                      setError('');
                      setForgotConfirmation(null);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                      recoveryChannel === 'email'
                        ? 'bg-eco-50 border-eco-600 text-eco-900 ring-2 ring-eco-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>Par E-mail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryChannel('whatsapp');
                      setError('');
                      setForgotConfirmation(null);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                      recoveryChannel === 'whatsapp'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Par WhatsApp</span>
                  </button>
                </div>

                {forgotConfirmation ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                    <div className="flex items-start gap-2.5 text-emerald-900">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <p className="font-extrabold">{forgotConfirmation.message}</p>
                        {forgotConfirmation.detail && (
                          <p className="text-emerald-800">{forgotConfirmation.detail}</p>
                        )}
                      </div>
                    </div>

                    {forgotConfirmation.isTestPreview && (
                      <div className="p-3 rounded-xl bg-white border border-emerald-200 text-[11px] text-slate-700 space-y-2">
                        <p className="font-bold text-slate-900">
                          Prévisualisation locale (Mode test) :
                        </p>
                        <pre className="whitespace-pre-wrap font-mono text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                          {forgotConfirmation.previewText}
                        </pre>
                        <button
                          type="button"
                          onClick={() => {
                            setResetCode(forgotConfirmation.resetCode || '');
                            setTab('reset');
                          }}
                          className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition"
                        >
                          Saisir mon nouveau mot de passe avec ce code →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    {recoveryChannel === 'email' ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Adresse e-mail du compte *
                        </label>
                        <div className="relative flex items-center">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                          <input
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="votre.email@exemple.ci"
                            required
                            className="w-full pl-10 pr-3 py-3 bg-creme-50/50 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-eco-600 outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Numéro WhatsApp (+225...) *
                        </label>
                        <div className="relative flex items-center">
                          <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-3.5" />
                          <input
                            type="tel"
                            value={forgotWhatsapp}
                            onChange={(e) => setForgotWhatsapp(e.target.value)}
                            placeholder="+225 07 00 00 00 00"
                            required
                            className="w-full pl-10 pr-3 py-3 bg-creme-50/50 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-eco-700 hover:bg-eco-800 text-white font-extrabold text-sm rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {loading
                        ? 'Envoi en cours...'
                        : recoveryChannel === 'email'
                          ? 'Envoyer le lien par E-mail'
                          : 'Recevoir le code sur WhatsApp'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* VUE 4 : DÉFINIR UN NOUVEAU MOT DE PASSE (?code=...) */}
            {tab === 'reset' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-eco-700" />
                    Définir un nouveau mot de passe
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choisissez un mot de passe sécurisé d'au moins 6 caractères.
                  </p>
                </div>

                {resetDone ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <p className="text-sm font-extrabold text-emerald-950">
                      Mot de passe mis à jour avec succès !
                    </p>
                    <p className="text-xs text-emerald-800">
                      Vous pouvez désormais accéder à votre compte Seconde Vie.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setResetDone(false);
                        setTab('login');
                        onClose();
                      }}
                      className="w-full py-2.5 bg-eco-700 hover:bg-eco-800 text-white font-extrabold text-xs rounded-xl transition"
                    >
                      Continuer vers Seconde Vie
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Code de réinitialisation
                      </label>
                      <input
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="Code reçu par e-mail ou WhatsApp"
                        required
                        className="w-full px-3.5 py-2.5 bg-creme-50/50 rounded-xl border border-slate-200 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:border-eco-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nouveau mot de passe *
                      </label>
                      <PasswordField
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Au moins 6 caractères"
                        minLength={6}
                        required
                        className="py-2.5"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirmer le nouveau mot de passe *
                      </label>
                      <PasswordField
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Répétez le mot de passe"
                        minLength={6}
                        required
                        className="py-2.5"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-eco-700 hover:bg-eco-800 text-white font-extrabold text-sm rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {loading ? 'Mise à jour...' : 'Enregistrer le nouveau mot de passe'}
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
