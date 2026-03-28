import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi, instagramApi } from '../api';

function AccountInfoPage() {
  const { user, replaceUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Initialize form with existing profile data
  const isInfluencer = user?.role === 'influencer';
  const profile = user?.influencer_profile || user?.business_profile || {};

  const [form, setForm] = useState({
    instagram_handle: profile.instagram_handle || '',
    category: profile.category || 'lifestyle',
    locality: profile.locality || '',
    followers_count: profile.followers_count || '',
    price_min: profile.price_min || '',
    price_max: profile.price_max || '',
    bio: profile.bio || '',

    // Business fields
    company_name: profile.company_name || '',
    industry: profile.industry || 'other',
    website_url: profile.website_url || '',
  });

  // Separate state for payout details so it saves independently
  const [payoutForm, setPayoutForm] = useState({
    upi_id: profile.upi_id || '',
    bank_account_number: profile.bank_account_number || '',
    bank_ifsc_code: profile.bank_ifsc_code || '',
    bank_account_holder_name: profile.bank_account_holder_name || '',
  });
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutSaved, setPayoutSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!user) {
    return <div className="flex h-48 items-center justify-center text-slate-400">Loading…</div>;
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const updatedUser = await authApi.uploadProfilePicture(file);
      replaceUser(updatedUser);
    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Send the PATCH request to update the profile
      const updatedUser = await authApi.updateProfile(form);
      // Update global context with the fresh full user object
      replaceUser(updatedUser);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile', err);
      alert('Failed to save profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePayoutSave = async (e) => {
    e.preventDefault();
    setSavingPayout(true);
    setPayoutSaved(false);
    try {
      const updatedUser = await authApi.updateProfile(payoutForm);
      replaceUser(updatedUser);
      setPayoutSaved(true);
      setTimeout(() => setPayoutSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save payout details', err);
      alert('Could not save payout details. Please try again.');
    } finally {
      setSavingPayout(false);
    }
  };

  const handleInstagramVerify = async () => {
    setVerifying(true);
    try {
      const { auth_url } = await instagramApi.getAuthUrl();
      // Redirect the user to the Instagram OAuth consent screen
      window.location.href = auth_url;
    } catch (err) {
      console.error('Failed to start Instagram Auth', err);
      alert('Could not start Instagram verification. Check backend settings.');
      setVerifying(false); // only reset if failed; otherwise we leave page
    }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6 animate-fade-in">

      {/* Header section with buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-white">Account Info</h2>
          <p className="mt-1 text-slate-400">
            Your live profile from the database — visible to {isInfluencer ? 'brands' : 'influencers'}.
          </p>
        </div>
        <div className="flex gap-3">
          {isInfluencer && !profile.is_verified && (
            <button
              onClick={handleInstagramVerify} disabled={verifying}
              className="rounded-lg bg-gradient-to-r from-fuchsia-600 to-amber-500 px-5 py-2.5 font-bold text-white transition hover:from-fuchsia-500 hover:to-amber-400 disabled:opacity-50"
            >
              {verifying ? 'Connecting...' : 'Verify with Instagram'}
            </button>
          )}

          <button
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
                // Reset form on cancel
                setForm({
                  ...form,
                  instagram_handle: profile.instagram_handle || '',
                  followers_count: profile.followers_count || '',
                  locality: profile.locality || '',
                  company_name: profile.company_name || ''
                });
              } else {
                setIsEditing(true);
              }
            }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-700"
          >
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 border-b border-slate-800 pb-8">
          <img 
            src={user.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
            alt="Profile Avatar" 
            className="w-24 h-24 rounded-full border-4 border-slate-800 object-cover bg-slate-950"
          />
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-medium text-white mb-2">Profile Picture</h3>
            <label className="cursor-pointer inline-block rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 sm:py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700">
              {uploading ? 'Uploading...' : 'Upload New Picture'}
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
            </label>
            <p className="mt-2 text-xs text-slate-500">JPG, PNG or GIF. Fits best as a square.</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">

          {/* Read-only fields that apply to everyone */}
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-500 uppercase tracking-wide">Email Address (Login)</span>
            <input type="text" value={user.email} disabled
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-400 outline-none" />
          </label>

          {isInfluencer ? (
            <>
              {/* Influencer Fields */}
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-500 uppercase tracking-wide flex items-center gap-2">
                  Instagram Handle
                  {profile.is_verified && <span className="text-blue-500 normal-case text-xs bg-blue-500/10 px-2 py-0.5 rounded">Verified</span>}
                </span>
                <input type="text" name="instagram_handle" value={form.instagram_handle} onChange={handleChange} disabled={!isEditing}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 disabled:opacity-60 disabled:bg-slate-950 disabled:border-slate-800" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-500 uppercase tracking-wide">Category</span>
                <select name="category" value={form.category} onChange={handleChange} disabled={!isEditing}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-950 disabled:border-slate-800">
                  {['lifestyle', 'fitness', 'food', 'tech', 'fashion', 'travel', 'beauty', 'gaming', 'other'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-500 uppercase tracking-wide">Locality (City)</span>
                <input type="text" name="locality" value={form.locality} onChange={handleChange} disabled={!isEditing}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 disabled:opacity-60 disabled:bg-slate-950 disabled:border-slate-800" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-500 uppercase tracking-wide flex items-center gap-2">
                  Followers Count
                  {profile.is_verified && <span title="Auto-synced from Instagram" className="text-slate-400 border border-slate-700 rounded px-1 text-xs">Auto</span>}
                </span>
                <input type="number" name="followers_count" value={form.followers_count} onChange={handleChange}
                  disabled={!isEditing || profile.is_verified} // locked if verified
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 disabled:opacity-60 disabled:bg-slate-950 disabled:border-slate-800" />
              </label>

              <div className="sm:col-span-2 grid grid-cols-2 gap-6 p-4 rounded-xl border border-slate-800 bg-slate-950">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-500 uppercase tracking-wide">Min Price (₹)</span>
                  <input type="number" name="price_min" value={form.price_min} onChange={handleChange} disabled={!isEditing}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 disabled:opacity-60 disabled:bg-slate-900 disabled:border-slate-800" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-500 uppercase tracking-wide">Max Price (₹)</span>
                  <input type="number" name="price_max" value={form.price_max} onChange={handleChange} disabled={!isEditing}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 disabled:opacity-60 disabled:bg-slate-900 disabled:border-slate-800" />
                </label>
              </div>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-500 uppercase tracking-wide">Bio / Intro</span>
                <textarea name="bio" value={form.bio} onChange={handleChange} disabled={!isEditing} rows="3"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 disabled:opacity-60 disabled:bg-slate-950 disabled:border-slate-800" />
              </label>

              {/* Instagram Specific Stats (Read only display) */}
              {profile.is_verified && (
                <div className="sm:col-span-2 mt-4 space-y-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/10 p-5">
                  <h3 className="text-sm font-bold text-fuchsia-400 uppercase tracking-wider">Instagram Analytics Data</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Avg Reach</p>
                      <p className="font-semibold text-slate-200">{profile.avg_reach?.toLocaleString() || '--'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Gender Demo</p>
                      <p className="font-semibold text-slate-200">
                        {profile.follower_gender_ratio?.female || '--'}%F · {profile.follower_gender_ratio?.male || '--'}%M
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500">Top Audience Locality</p>
                      <p className="font-semibold text-slate-200">{profile.top_audience_locality || '--'}</p>
                    </div>
                  </div>
                </div>
              )}

            </>
          ) : (
            <>
              {/* Business Fields */}
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-500 uppercase tracking-wide">Company Name</span>
                <input type="text" name="company_name" value={form.company_name} onChange={handleChange} disabled={!isEditing}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 disabled:opacity-60 disabled:bg-slate-950 disabled:border-slate-800" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-500 uppercase tracking-wide">Industry</span>
                <select name="industry" value={form.industry} onChange={handleChange} disabled={!isEditing}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-950 disabled:border-slate-800">
                  {['tech', 'fitness', 'skincare', 'clothing', 'finance', 'other'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-500 uppercase tracking-wide">Locality (City/HQ)</span>
                <input type="text" name="locality" value={form.locality} onChange={handleChange} disabled={!isEditing}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 disabled:opacity-60 disabled:bg-slate-950 disabled:border-slate-800" />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-500 uppercase tracking-wide">Website URL</span>
                <input type="url" name="website_url" value={form.website_url} onChange={handleChange} disabled={!isEditing}
                  placeholder="https://"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 disabled:opacity-60 disabled:bg-slate-950 disabled:border-slate-800" />
              </label>
            </>
          )}
        </div>

        {isEditing && (
          <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsEditing(false)} disabled={saving}
              className="rounded-lg px-5 py-2.5 font-semibold text-slate-400 hover:text-white transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-indigo-600 px-8 py-2.5 font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/20">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>

      {/* ── Payout Details (influencers only) ─────────────────────── */}
      {isInfluencer && (
        <form onSubmit={handlePayoutSave} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">💳 Payout Details</h3>
              <p className="mt-0.5 text-sm text-slate-400">
                Add your UPI or bank details so we know where to transfer your earnings.
              </p>
            </div>
            {payoutSaved && (
              <span className="rounded-full bg-emerald-900/50 px-3 py-1 text-xs font-semibold text-emerald-400">✓ Saved</span>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* UPI */}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-500 uppercase tracking-wide">UPI ID</span>
              <input
                type="text"
                name="upi_id"
                value={payoutForm.upi_id}
                onChange={(e) => setPayoutForm(p => ({ ...p, upi_id: e.target.value }))}
                placeholder="yourname@paytm  or  9876543210@upi"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </label>

            {/* Bank Account Holder */}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-500 uppercase tracking-wide">Account Holder Name</span>
              <input
                type="text"
                name="bank_account_holder_name"
                value={payoutForm.bank_account_holder_name}
                onChange={(e) => setPayoutForm(p => ({ ...p, bank_account_holder_name: e.target.value }))}
                placeholder="Name exactly as on bank account"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </label>

            {/* Account Number */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-500 uppercase tracking-wide">Bank Account Number</span>
              <input
                type="text"
                name="bank_account_number"
                value={payoutForm.bank_account_number}
                onChange={(e) => setPayoutForm(p => ({ ...p, bank_account_number: e.target.value }))}
                placeholder="e.g. 00110012345678"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </label>

            {/* IFSC */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-500 uppercase tracking-wide">IFSC Code</span>
              <input
                type="text"
                name="bank_ifsc_code"
                value={payoutForm.bank_ifsc_code}
                onChange={(e) => setPayoutForm(p => ({ ...p, bank_ifsc_code: e.target.value.toUpperCase() }))}
                placeholder="e.g. SBIN0001234"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </label>
          </div>

          {/* Security note */}
          <div className="mt-4 rounded-lg bg-amber-900/20 border border-amber-700/30 px-4 py-3 text-xs text-amber-300">
            🔒 Your payout details are stored securely and only visible to the MicroFluence admin team. They will never be shared with businesses.
          </div>

          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={savingPayout}
              className="rounded-lg bg-indigo-600 px-8 py-2.5 font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/20">
              {savingPayout ? 'Saving…' : 'Save Payout Details'}
            </button>
          </div>
        </form>
      )}

    </section>
  );
}

export default AccountInfoPage;
