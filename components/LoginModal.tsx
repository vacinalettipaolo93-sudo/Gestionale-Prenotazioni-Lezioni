
import React, { useState } from 'react';
import { XIcon } from './icons';
import { auth } from '../firebaseConfig';

interface LoginModalProps {
    onClose: () => void;
    onLoginSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!auth) {
            setError("Errore di configurazione: Firebase non è inizializzato.");
            setIsLoading(false);
            return;
        }

        try {
            await auth.signInWithEmailAndPassword(email, password);
            onLoginSuccess();
        } catch (error: any) {
            console.error("Login failed:", error);
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                     setError('Email o password non validi.');
                    break;
                case 'auth/invalid-email':
                    setError('Formato email non valido.');
                    break;
                default:
                    setError('Si è verificato un errore durante il login.');
                    break;
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-neutral-50 rounded-lg shadow-xl p-8 w-full max-w-sm m-4 relative border border-neutral-200">
                <button 
                    onClick={onClose} 
                    className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-600 transition-colors"
                    aria-label="Chiudi"
                >
                    <XIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-center text-neutral-800 mb-6">Accesso Amministratore</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-neutral-400 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="shadow-inner appearance-none bg-neutral-100 border border-neutral-200 rounded w-full py-2 px-3 text-neutral-800 leading-tight focus:outline-none focus:shadow-outline focus:border-primary"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-neutral-400 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="shadow-inner appearance-none bg-neutral-100 border border-neutral-200 rounded w-full py-2 px-3 text-neutral-800 mb-3 leading-tight focus:outline-none focus:shadow-outline focus:border-primary"
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-xs italic mb-4 text-center">{error}</p>
                    )}

                    <div className="flex items-center justify-center">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors disabled:bg-neutral-400 flex items-center justify-center"
                        >
                             {isLoading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>}
                             {isLoading ? 'Accesso...' : 'Accedi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;