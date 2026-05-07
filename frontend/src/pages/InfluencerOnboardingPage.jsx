import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, instagramApi } from '../api';
import { useAuth } from '../context/AuthContext';
import ProfileCompletionRing from '../components/ProfileCompletionRing';

const CATEGORIES = ['lifestyle','fitness','food','tech','fashion','travel','beauty','gaming','education','finance','health','entertainment','sports','music','art','photography','parenting','business','skincare','other'];

const TC_TEXT = `MICROFLUENCE — INFLUENCER TERMS & CONDITIONS
Last updated: May 2026

1. ELIGIBILITY & ACCOUNT
You must be 18+ with a genuine Instagram presence. One account per person. You are responsible for all activity on your account.

2. PROFILE ACCURACY
All information—followers, engagement, category, pricing—must be truthful. Misrepresentation leads to immediate suspension.

3. CAMPAIGN CONDUCT
You may only express interest in campaigns that match your niche and capabilities. Accepting a contract is a binding commitment to deliver the agreed deliverables on time.

4. ESCROW & PAYMENTS
When escrow is selected, MicroFluence holds payment on your behalf until work is verified. Without escrow, payment is between you and the business. MicroFluence is not liable for non-payment in non-escrow arrangements.

5. CONTENT OWNERSHIP
You retain copyright of your content. By publishing brand content, you grant the business a non-exclusive licence to repost/use it for the period agreed in the contract.

6. PROHIBITED CONDUCT
No fraudulent engagement, fake followers, deceptive stats, or harassment. Violations result in permanent ban and potential legal action.

7. DISPUTES
Disputes are first handled between parties. Unresolved disputes go to MicroFluence admin. Admin decisions on escrow funds are final.

8. PLATFORM FEES
MicroFluence charges a platform fee on completed escrow contracts. Current fee schedule is displayed at payment time.

9. DATA & PRIVACY
Your Instagram data (fetched via OAuth) is used solely to verify your profile and display metrics to potential business partners. We never sell your data.

10. MODIFICATIONS
We may update these terms with 14 days notice via email. Continued use constitutes acceptance.

By clicking "I Agree", you confirm you have read, understood, and agree to these Terms & Conditions.`;

function wordMatch(raw, standards) {
  const tokensRaw = new Set(raw.toLowerCase().split(/\s+/));
  let best = 'other', bestScore = 0;
  for (const cat of standards) {
    const tokensCat = new Set(cat.toLowerCase().split(/[\s_]+/));
    const inter = [...tokensRaw].filter(t => tokensCat.has(t)).length;
    const union = new Set([...tokensRaw, ...tokensCat]).size;
    const score = union ? inter / union : 0;
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return bestScore >= 0.25 ? best : 'other';
}

function calcPct(profile) {
  const checks = [
    !!profile?.instagram_handle,
    !!profile?.category,
    !!profile?.locality,
    !!profile?.bio,
    profile?.price_min != null && profile?.price_max != null,
    !!profile?.is_verified,
  ];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

export default function InfluencerOnboardingPage() {
  const { user, replaceUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=T&C, 2=Insta, 3=Profile, 4=Payout
  const [tcScrolled, setTcScrolled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [instaLoading, setInstaLoading] = useState(false);

  const profile = user?.influencer_profile;
  const pct = calcPct(profile);

  const [form, setForm] = useState({
    category: profile?.category || '',
    customCategory: profile?.custom_category || '',
    useCustom: false,
    locality: profile?.locality || '',
    price_min: profile?.price_min || '',
    price_max: profile?.price_max || '',
    bio: profile?.bio || '',
    upi_id: profile?.upi_id || '',
    bank_account_number: profile?.bank_account_number || '',
    bank_ifsc_code: profile?.bank_ifsc_code || '',
    bank_account_holder_name: profile?.bank_account_holder_name || '',
  });

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleTcAgree = async () => {
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({ terms_accepted: true });
      replaceUser(updated);
      setStep(2);
    } catch { setError('Failed to save. Please retry.'); }
    finally { setSaving(false); }
  };

  const handleInstaConnect = async () => {
    setInstaLoading(true);
    try {
      const { auth_url } = await instagramApi.getAuthUrl();
      window.location.href = auth_url;
    } catch { setError('Could not get Instagram auth URL.'); setInstaLoading(false); }
  };

  const handleSkipInsta = () => setStep(3);

  const handleProfileSave = async () => {
    setError(''); setSaving(true);
    try {
      const payload = {
        locality: form.locality,
        price_min: form.price_min || null,
        price_max: form.price_max || null,
        bio: form.bio,
      };
      if (form.useCustom && form.customCategory) {
        payload.custom_category = form.customCategory;
        payload.category = wordMatch(form.customCategory, CATEGORIES);
      } else {
        payload.category = form.category;
      }
      const updated = await authApi.updateProfile(payload);
      replaceUser(updated);
      setStep(4);
    } catch { setError('Failed to save profile. Please check all fields.'); }
    finally { setSaving(false); }
  };

  const handlePayoutSave = async () => {
    setError(''); setSaving(true);
    try {
      const payload = {};
      if (form.upi_id) payload.upi_id = form.upi_id;
      if (form.bank_account_number) payload.bank_account_number = form.bank_account_number;
      if (form.bank_ifsc_code) payload.bank_ifsc_code = form.bank_ifsc_code;
      if (form.bank_account_holder_name) payload.bank_account_holder_name = form.bank_account_holder_name;
      if (Object.keys(payload).length) await authApi.updateProfile(payload);
      navigate('/dashboard/home');
    } catch { setError('Failed to save. Please retry.'); }
    finally { setSaving(false); }
  };

  const steps = ['Terms', 'Instagram', 'Profile', 'Payout'];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12 font-sans animate-fade-in">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <ProfileCompletionRing percentage={pct} size={64} strokeWidth={6} />
          </div>
          <h1 className="text-3xl font-extrabold text-white">Complete Your Profile</h1>
          <p className="mt-2 text-slate-400">Step {step} of 4 — {steps[step - 1]}</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i + 1 < step ? 'bg-emerald-500 text-white' :
                i + 1 === step ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20' :
                'bg-slate-800 text-slate-500'
              }`}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-8 rounded-full transition-all ${i + 1 < step ? 'bg-emerald-500' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-fade-in">{error}</div>
        )}

        {/* Step 1: Terms & Conditions */}
        {step === 1 && (
          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">📋 Terms & Conditions</h2>
              <p className="text-sm text-slate-400 mt-1">Please read and agree before continuing</p>
            </div>
            <div
              className="h-72 overflow-y-auto px-6 py-4 text-xs text-slate-400 leading-relaxed whitespace-pre-line custom-scrollbar"
              onScroll={e => {
                const el = e.target;
                if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) setTcScrolled(true);
              }}
            >
              {TC_TEXT}
            </div>
            <div className="px-6 py-5 border-t border-slate-800 bg-slate-900/40">
              {!tcScrolled && (
                <p className="text-xs text-amber-400 text-center mb-3">👆 Scroll to the bottom to enable agreement</p>
              )}
              <button
                onClick={handleTcAgree}
                disabled={!tcScrolled || saving}
                className="w-full rounded-2xl bg-indigo-600 py-4 text-sm font-bold text-white transition-all hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : '✓ I Agree — Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Instagram */}
        {step === 2 && (
          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">📸 Instagram Verification</h2>
              <p className="text-sm text-slate-400 mt-1">Connect your Instagram to auto-fill your stats and get the verified badge</p>
            </div>
            <div className="px-6 py-8 space-y-4">
              {profile?.is_verified ? (
                <div className="rounded-2xl bg-emerald-900/20 border border-emerald-500/30 p-5 flex items-center gap-4">
                  <span className="text-3xl">✅</span>
                  <div>
                    <p className="font-bold text-emerald-400">Instagram Connected!</p>
                    <p className="text-sm text-slate-400 mt-0.5">@{profile.instagram_handle} · {Number(profile.followers_count).toLocaleString('en-IN')} followers</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl bg-indigo-900/20 border border-indigo-500/20 p-4 space-y-2">
                    {['Auto-fill followers, handle & engagement stats', 'Get the blue ✓ verified badge on your profile', 'Businesses trust verified influencers more'].map(t => (
                      <p key={t} className="text-xs text-slate-300 flex items-center gap-2">
                        <span className="text-indigo-400">→</span>{t}
                      </p>
                    ))}
                  </div>
                  <button
                    onClick={handleInstaConnect}
                    disabled={instaLoading}
                    className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 py-4 text-sm font-bold text-white shadow-lg hover:from-pink-500 hover:to-purple-500 transition-all disabled:opacity-60"
                  >
                    {instaLoading ? 'Redirecting...' : '📸 Connect Instagram Account'}
                  </button>
                </>
              )}
              <button
                onClick={() => profile?.is_verified ? setStep(3) : handleSkipInsta()}
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/50 py-3 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all"
              >
                {profile?.is_verified ? 'Continue →' : 'Skip for now (you can connect later)'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Profile Info */}
        {step === 3 && (
          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">👤 Profile Details</h2>
              <p className="text-sm text-slate-400 mt-1">This is what businesses will see about you</p>
            </div>
            <div className="px-6 py-5 space-y-5">

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Content Category *</label>
                <div className="flex gap-2 mb-2">
                  <button onClick={() => setForm(p => ({ ...p, useCustom: false }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${!form.useCustom ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    Choose Category
                  </button>
                  <button onClick={() => setForm(p => ({ ...p, useCustom: true }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.useCustom ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    Type Custom
                  </button>
                </div>
                {!form.useCustom ? (
                  <div className="relative">
                    <select name="category" value={form.category} onChange={handleChange}
                      className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                      <option value="">Select category...</option>
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900 capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">▾</div>
                  </div>
                ) : (
                  <div>
                    <input name="customCategory" value={form.customCategory} onChange={handleChange}
                      placeholder="e.g. makeup tutorials, street photography..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                    {form.customCategory && (
                      <p className="mt-1 text-xs text-indigo-400">
                        Auto-matched: <strong>{wordMatch(form.customCategory, CATEGORIES)}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Locality */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">City / Locality *</label>
                <input name="locality" value={form.locality} onChange={handleChange} placeholder="e.g. Mumbai, Delhi..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Min Price (₹) *</label>
                  <input name="price_min" type="number" value={form.price_min} onChange={handleChange} placeholder="500"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Max Price (₹) *</label>
                  <input name="price_max" type="number" value={form.price_max} onChange={handleChange} placeholder="5000"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Bio / Introduction *</label>
                <textarea name="bio" value={form.bio} onChange={handleChange} rows={4}
                  placeholder="Tell businesses about yourself, your niche, audience, and style..."
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>

              <button onClick={handleProfileSave} disabled={saving || !form.locality || !form.bio || (!form.category && !form.customCategory)}
                className="w-full rounded-2xl bg-indigo-600 py-4 text-sm font-bold text-white transition-all hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? 'Saving...' : 'Save & Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Payout Details */}
        {step === 4 && (
          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">💳 Payout Details</h2>
              <p className="text-sm text-slate-400 mt-1">Optional — only required if you use Escrow protection</p>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="rounded-2xl bg-slate-800/40 border border-slate-700/50 p-4 text-xs text-slate-400 leading-relaxed">
                🛡️ These details are only used to transfer your escrow earnings. They are encrypted and never shared with businesses.
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">UPI ID</label>
                <input name="upi_id" value={form.upi_id} onChange={handleChange} placeholder="name@upi or 9876543210@paytm"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Account Holder Name</label>
                <input name="bank_account_holder_name" value={form.bank_account_holder_name} onChange={handleChange} placeholder="Full name as per bank"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Account Number</label>
                  <input name="bank_account_number" value={form.bank_account_number} onChange={handleChange} placeholder="1234567890"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">IFSC Code</label>
                  <input name="bank_ifsc_code" value={form.bank_ifsc_code} onChange={handleChange} placeholder="SBIN0001234"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => navigate('/dashboard/home')} className="flex-1 rounded-2xl border border-slate-700 bg-slate-800/50 py-3.5 text-sm font-semibold text-slate-400 hover:bg-slate-700 transition-all">
                  Skip for now
                </button>
                <button onClick={handlePayoutSave} disabled={saving} className="flex-1 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 transition-all disabled:opacity-60">
                  {saving ? 'Saving...' : '🎉 Finish Setup'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
