import React, { useEffect, useRef, useCallback, useState } from 'react';

interface LoginPageProps {
  onLogin: () => void;
}

// To prevent TypeScript errors since the 'google' object is from a script
declare const google: any;

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const googleButtonRef = useRef<HTMLDivElement>(null);
    const isGoogleReady = typeof google !== 'undefined' && google.accounts;
    const clientId = '426419412620-gb3iencb9ntn7j11d58c758og8ui86bo.apps.googleusercontent.com';

    const handleCredentialResponse = useCallback((response: any) => {
        console.log("Google Auth successful. Credential:", response.credential);
        onLogin();
    }, [onLogin]);

    const handleNativeLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }
        setError('');
        console.log('Native login successful for:', email);
        onLogin();
    };


    useEffect(() => {
        if (!isGoogleReady || !clientId) {
            return;
        }

        try {
            google.accounts.id.initialize({
                client_id: clientId,
                callback: handleCredentialResponse,
            });

            if (googleButtonRef.current) {
                google.accounts.id.renderButton(
                    googleButtonRef.current,
                    { theme: "outline", size: "large", type: 'standard', text: 'signin_with', shape: 'pill' }
                );
            }
        } catch (error) {
            console.error("Error initializing Google Sign-In:", error);
        }

        return () => {
            if (isGoogleReady) {
                google.accounts.id.disableAutoSelect();
            }
        };
    }, [handleCredentialResponse, isGoogleReady, clientId]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl border border-gray-200/80">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900">Product Idea Lab</h1>
                    <p className="mt-2 text-gray-600">From concept to creation.</p>
                </div>
                
                <form onSubmit={handleNativeLogin} className="space-y-6">
                    <div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email address"
                            required
                            className="w-full px-4 py-3 text-gray-800 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                            className="w-full px-4 py-3 text-gray-800 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <div>
                        <button
                            type="submit"
                            className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            Sign In
                        </button>
                    </div>
                </form>

                <div className="flex items-center justify-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="mx-4 text-sm text-gray-400">OR</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="flex justify-center">
                    {clientId ? (
                        <div ref={googleButtonRef}></div>
                    ) : (
                        <div className="p-4 rounded-md bg-red-100 text-red-700 border border-red-200">
                            <p className="font-semibold">Google Sign-In Not Configured</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;