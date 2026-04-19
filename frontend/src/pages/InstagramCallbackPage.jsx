import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { instagramApi, authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

function InstagramCallbackPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { replaceUser, user, loading: authLoading } = useAuth();

    const [status, setStatus] = useState('Verifying your Instagram account...');
    const [error, setError] = useState(null);

    // Use a ref to prevent strict-mode double-firing
    const processed = useRef(false);

    useEffect(() => {
        if (processed.current || authLoading) return;

        if (!user) {
            setError('Your app session expired before Instagram returned. Log in again and retry verification.');
            processed.current = true;
            return;
        }

        processed.current = true;

        async function processCallback() {
            const params = new URLSearchParams(location.search);
            const code = params.get('code');
            const errorParam = params.get('error');

            if (errorParam) {
                setError('You denied the Instagram connection request.');
                return;
            }

            if (!code) {
                setError('No authorization code found in the URL.');
                return;
            }

            try {
                setStatus('Fetching your followers, analytics, and demographics... This might take a few seconds.');
                await instagramApi.callback(code);

                // Success! Refetch the full user profile to get the new stats
                const updatedUser = await authApi.me();
                replaceUser(updatedUser);

                setStatus('Verification complete! Redirecting...');

                setTimeout(() => {
                    navigate('/dashboard/account');
                }, 1500);

            } catch (err) {
                console.error('Instagram Callback Error', err);
                setError(err.detail || err.error || 'Failed to verify account. The code may have expired.');
            }
        }

        processCallback();
    }, [authLoading, location.search, navigate, replaceUser, user]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-100">
            <div className="w-full max-w-md space-y-8 rounded-3xl border border-slate-800 bg-slate-900 p-10 shadow-xl">
                <div className="flex justify-center">
                    <BrandLogo className="h-16 animate-float" />
                </div>

                <h2 className="text-2xl font-bold">Instagram Verification</h2>

                {error ? (
                    <div className="space-y-6">
                        <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-red-400">
                            <p className="font-semibold">Verification Failed</p>
                            <p className="mt-1 text-sm">{error}</p>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard/account')}
                            className="w-full rounded-lg bg-indigo-600 py-3 font-bold transition hover:bg-indigo-500"
                        >
                            Return to Account
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-fuchsia-500" />
                        <p className="text-sm font-medium text-slate-400">{status}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default InstagramCallbackPage;
