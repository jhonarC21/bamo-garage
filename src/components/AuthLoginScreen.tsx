import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  User,
  Car,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Shield,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { useParking } from '../context/ParkingContext';
import { AppUser } from '../types';

export const AuthLoginScreen: React.FC = () => {
  const { users, currentUser, login, settings } = useParking();

  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    const adminUser = users.find((u) => u.role === 'admin') || users[0];
    return currentUser?.id || adminUser?.id || 'usr_admin';
  });

  const [usernameInput, setUsernameInput] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [mode, setMode] = useState<'card' | 'manual'>('card');

  // Selected user object
  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];

  useEffect(() => {
    if (selectedUser) {
      setUsernameInput(selectedUser.username);
    }
  }, [selectedUserId, selectedUser]);

  const handleKeypadPress = (digit: string) => {
    if (pinInput.length < 8) {
      const updated = pinInput + digit;
      setPinInput(updated);
      setErrorMessage(null);
      if (updated.length === 8) {
        // Auto-attempt login on 8th digit
        attemptLogin(selectedUser?.username || usernameInput, updated);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleKeypadClear = () => {
    setPinInput('');
    setErrorMessage(null);
  };

  const attemptLogin = (uname: string, pin: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    setTimeout(() => {
      const result = login(uname, pin);
      if (!result.success) {
        setErrorMessage(
          result.message ||
            'Clave incorrecta. Recuerde que la clave del Administrador es del 1 al 8 (12345678).'
        );
        setIsSubmitting(false);
      }
    }, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput) {
      setErrorMessage('Por favor ingrese la clave de 8 dígitos.');
      return;
    }
    const targetUsername = mode === 'card' ? selectedUser?.username : usernameInput;
    attemptLogin(targetUsername, pinInput);
  };

  const handleUseAdminShortcut = () => {
    const admin = users.find((u) => u.role === 'admin') || users[0];
    if (admin) {
      setSelectedUserId(admin.id);
      setUsernameInput(admin.username);
      setPinInput('12345678');
      setErrorMessage(null);
      attemptLogin(admin.username, '12345678');
    }
  };

  return (
    <div className="min-h-screen bg-[#07080E] text-zinc-100 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Decorative Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-10 w-[250px] h-[250px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-[#0F111A]/95 border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative z-10 space-y-6">
        
        {/* Garage Logo & Identity */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 p-0.5 shadow-xl shadow-indigo-600/30 ring-4 ring-indigo-500/20 mb-1">
            <div className="w-full h-full bg-[#0E1019] rounded-[14px] flex items-center justify-center">
              <Car className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {settings.parkingName || 'Bamo Garage SpA'}
            </h1>
            <p className="text-xs text-zinc-400 font-medium flex items-center justify-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sistema de Control y Gestión Protegido</span>
            </p>
          </div>
        </div>

        {/* User Selection Carousel / Switcher */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold text-zinc-300">Seleccionar Usuario:</span>
            <span className="text-[11px] text-indigo-400">1 Usuario Administrador Activo</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {users.map((user) => {
              const isSelected = selectedUserId === user.id;
              const isAdmin = user.role === 'admin';
              return (
                <button
                  key={user.id}
                  type="button"
                  id={`btn-user-select-${user.username}`}
                  onClick={() => {
                    setSelectedUserId(user.id);
                    setUsernameInput(user.username);
                    setPinInput('');
                    setErrorMessage(null);
                  }}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-950/80 to-zinc-900 border-indigo-500 shadow-md shadow-indigo-950/50 ring-1 ring-indigo-500/30'
                      : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-850 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isAdmin
                          ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-md'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                        {user.name}
                        {isAdmin && (
                          <span className="bg-amber-950 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-700/50 uppercase">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        Usuario: <span className="text-zinc-300 font-semibold">{user.username}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-700" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PIN Entry Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                <span>Clave de Acceso (8 Dígitos)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
              >
                {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPin ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </div>

            {/* Visual 8-Digit Indicator Display */}
            <div className="relative">
              <input
                id="input-auth-pin"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setPinInput(val);
                  setErrorMessage(null);
                  if (val.length === 8) {
                    attemptLogin(selectedUser?.username || usernameInput, val);
                  }
                }}
                placeholder="••••••••"
                autoFocus
                className="w-full bg-[#090A10] border border-zinc-700/80 rounded-2xl py-3 px-4 text-center font-mono text-xl tracking-[0.4em] text-indigo-300 font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition outline-none"
              />
              <div className="text-[10px] text-zinc-500 text-center mt-1">
                {pinInput.length}/8 dígitos ingresados
              </div>
            </div>

            {/* Error Display */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Quick On-Screen Keypad for Touch Terminals */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                id={`btn-keypad-${num}`}
                onClick={() => handleKeypadPress(String(num))}
                className="h-11 bg-zinc-900 hover:bg-zinc-800 active:bg-indigo-900/60 border border-zinc-800/80 hover:border-zinc-700 rounded-xl text-base font-bold text-zinc-200 hover:text-white transition flex items-center justify-center shadow-sm"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              id="btn-keypad-clear"
              onClick={handleKeypadClear}
              className="h-11 bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-rose-300 rounded-xl transition flex items-center justify-center"
            >
              Borrar
            </button>
            <button
              type="button"
              id="btn-keypad-0"
              onClick={() => handleKeypadPress('0')}
              className="h-11 bg-zinc-900 hover:bg-zinc-800 active:bg-indigo-900/60 border border-zinc-800/80 hover:border-zinc-700 rounded-xl text-base font-bold text-zinc-200 hover:text-white transition flex items-center justify-center shadow-sm"
            >
              0
            </button>
            <button
              type="button"
              id="btn-keypad-backspace"
              onClick={handleKeypadBackspace}
              className="h-11 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-200 rounded-xl transition flex items-center justify-center"
            >
              ⌫
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="btn-auth-submit"
            disabled={isSubmitting || pinInput.length < 8}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-[0.98] ${
              pinInput.length === 8
                ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-600/30'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-750'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>{isSubmitting ? 'Verificando Clave...' : 'Desbloquear y Acceder'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Administrator Shortcut Chip */}
        <div className="pt-2 border-t border-zinc-850">
          <button
            type="button"
            id="btn-quick-admin-login"
            onClick={handleUseAdminShortcut}
            className="w-full p-2.5 bg-gradient-to-r from-amber-950/30 to-indigo-950/30 border border-amber-500/30 hover:border-amber-500/60 rounded-xl text-xs flex items-center justify-between text-amber-200 hover:text-white transition group"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
              <span className="font-semibold">Acceso Rápido Administrador</span>
            </div>
            <span className="font-mono font-bold bg-amber-900/60 px-2 py-0.5 rounded text-[11px] text-amber-300 border border-amber-700/50">
              12345678
            </span>
          </button>
        </div>

        {/* System Footnote */}
        <div className="text-center text-[11px] text-zinc-500">
          <span>Bamo Garage SpA • RUT: {settings.rut || '78.084.649-6'}</span>
          <br />
          <span>Calama, Región de Antofagasta, Chile</span>
        </div>
      </div>
    </div>
  );
};
