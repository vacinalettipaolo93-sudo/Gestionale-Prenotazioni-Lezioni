import React, { useState } from 'react';
import { XIcon } from './icons';

interface LoginModalProps {
    onClose: () => void;
    onLoginSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (username === 'vacio93' && password === '1234Paolo') {
            onLoginSuccess();
        } else {
            setError('Username o password non validi.');
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
                        <label className="block text-neutral-400 text-sm font-bold mb-2" htmlFor="username">
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
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
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
                        >
                            Accedi
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;