import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi, instagramApi } from '../api';

function AccountInfoPage() {
  const { user, login } = useAuth(); // using login internally to update the AuthContext
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

  if (!user) {
    return <div className="flex h-48 items-center justify-center text-slate-400">Loading…</div>;
  }

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Send the PATCH request to update the profile
      const updatedUser = await authApi.updateProfile(form);
      // Update global context with the fresh full user object
      login(updatedUser);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile', err);
      alert('Failed to save profile changes. Please try again.');
    } finally {
      setSaving(false);
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

    </section>
  );
}

export default AccountInfoPage;
