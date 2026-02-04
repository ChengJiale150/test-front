'use client';

import { useState } from 'react';
import { login } from '@/app/actions/auth';
import { Lock, Loader2, AlertCircle } from 'lucide-react';

interface LoginOverlayProps {
    onLogin: () => void;
}

export default function LoginOverlay({ onLogin }: LoginOverlayProps) {
    const [key, setKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim()) return;

        setLoading(true);
        setError('');

        try {
            const result = await login(key);
            if (result.success) {
                onLogin();
            } else {
                setError(result.message || 'Incorrect access key');
            }
        } catch (err) {
            setError('Failed to verify. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 shadow-inner">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Protected Project</h2>
                        <p className="text-gray-500 text-sm mt-2 text-center max-w-[260px]">
                            Please enter the access key to verify your identity and access the workspace.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="access-key" className="text-xs font-semibold text-gray-700 uppercase tracking-wider ml-1">
                                Access Key
                            </label>
                            <input
                                id="access-key"
                                type="password"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="Enter your key..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-gray-800 placeholder:text-gray-400"
                                autoFocus
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !key.trim()}
                            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <span>Unlock Access</span>
                            )}
                        </button>
                    </form>
                </div>
                <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                        Secure access verification required
                    </p>
                </div>
            </div>
        </div>
    );
}
