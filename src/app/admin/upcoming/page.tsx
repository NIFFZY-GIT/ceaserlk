"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';

type AdminSettingsResponse = {
  success: boolean;
  upcomingEnabled: boolean;
  baseCount: number;
  dbCount: number;
  totalCount: number;
  tshirtReleaseAt: string;
  movieReleaseAt: string;
  logoImageUrl: string;
  backgroundMode: 'video' | 'slider';
  backgroundVideoUrl: string | null;
  backgroundSliderImages: string[];
  waitingListEntries?: Array<{
    id: number;
    phoneNumber: string;
    createdAt: string;
  }>;
  message?: string;
  error?: string;
};

function toDateTimeInputValue(isoDate: string): string {
  const date = new Date(isoDate);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - timezoneOffset);
  return localDate.toISOString().slice(0, 16);
}

function toIsoFromDateTimeInput(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

export default function AdminUpcomingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [baseCount, setBaseCount] = useState(0);
  const [upcomingEnabled, setUpcomingEnabled] = useState(true);
  const [dbCount, setDbCount] = useState(0);
  const [tshirtReleaseAt, setTshirtReleaseAt] = useState('');
  const [movieReleaseAt, setMovieReleaseAt] = useState('');
  const [logoImageUrl, setLogoImageUrl] = useState('');
  const [backgroundMode, setBackgroundMode] = useState<'video' | 'slider'>('slider');
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState<string | null>(null);
  const [backgroundSliderImages, setBackgroundSliderImages] = useState<string[]>([]);
  const [waitingListEntries, setWaitingListEntries] = useState<Array<{ id: number; phoneNumber: string; createdAt: string }>>([]);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundVideoFile, setBackgroundVideoFile] = useState<File | null>(null);
  const [sliderImageFiles, setSliderImageFiles] = useState<File[]>([]);

  const totalCount = useMemo(() => baseCount + dbCount, [baseCount, dbCount]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setError(null);
        const response = await fetch('/api/admin/upcoming-settings', {
          cache: 'no-store',
          credentials: 'include',
        });

        const data = (await response.json()) as AdminSettingsResponse;

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load settings');
        }

        setBaseCount(Number(data.baseCount ?? 0));
        setUpcomingEnabled(data.upcomingEnabled !== false);
        setDbCount(Number(data.dbCount ?? 0));
        setTshirtReleaseAt(toDateTimeInputValue(data.tshirtReleaseAt));
        setMovieReleaseAt(toDateTimeInputValue(data.movieReleaseAt));
        setLogoImageUrl(data.logoImageUrl || '');
        setBackgroundMode(data.backgroundMode || 'slider');
        setBackgroundVideoUrl(data.backgroundVideoUrl || null);
        setBackgroundSliderImages(Array.isArray(data.backgroundSliderImages) ? data.backgroundSliderImages : []);
        setWaitingListEntries(Array.isArray(data.waitingListEntries) ? data.waitingListEntries : []);
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setError(null);
      setSuccessMessage(null);
      setIsSaving(true);

      const formData = new FormData();
      formData.append('baseCount', String(baseCount));
      formData.append('upcomingEnabled', String(upcomingEnabled));
      formData.append('tshirtReleaseAt', toIsoFromDateTimeInput(tshirtReleaseAt));
      formData.append('movieReleaseAt', toIsoFromDateTimeInput(movieReleaseAt));
      formData.append('backgroundMode', backgroundMode);

      if (logoFile) {
        formData.append('logoFile', logoFile);
      }

      if (backgroundVideoFile) {
        formData.append('backgroundVideoFile', backgroundVideoFile);
      }

      sliderImageFiles.forEach((file) => {
        formData.append('backgroundSliderImages', file);
      });

      const response = await fetch('/api/admin/upcoming-settings', {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      });

      const data = (await response.json()) as AdminSettingsResponse;

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setDbCount(Number(data.dbCount ?? 0));
      setBaseCount(Number(data.baseCount ?? 0));
      setUpcomingEnabled(data.upcomingEnabled !== false);
      setTshirtReleaseAt(toDateTimeInputValue(data.tshirtReleaseAt));
      setMovieReleaseAt(toDateTimeInputValue(data.movieReleaseAt));
      setLogoImageUrl(data.logoImageUrl || '');
      setBackgroundMode(data.backgroundMode || 'slider');
      setBackgroundVideoUrl(data.backgroundVideoUrl || null);
      setBackgroundSliderImages(Array.isArray(data.backgroundSliderImages) ? data.backgroundSliderImages : []);
      setWaitingListEntries(Array.isArray(data.waitingListEntries) ? data.waitingListEntries : []);

      setLogoFile(null);
      setBackgroundVideoFile(null);
      setSliderImageFiles([]);
      setSuccessMessage(data.message || 'Settings saved');
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const runAdminAction = async (
    action: 'reset-settings' | 'clear-waiting-list' | 'reset-all',
    confirmText: string
  ) => {
    if (!window.confirm(confirmText)) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setIsRunningAction(true);

      const response = await fetch('/api/admin/upcoming-settings', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = (await response.json()) as AdminSettingsResponse;

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run action');
      }

      setDbCount(Number(data.dbCount ?? 0));
      setBaseCount(Number(data.baseCount ?? 0));
      setUpcomingEnabled(data.upcomingEnabled !== false);
      setTshirtReleaseAt(toDateTimeInputValue(data.tshirtReleaseAt));
      setMovieReleaseAt(toDateTimeInputValue(data.movieReleaseAt));
      setLogoImageUrl(data.logoImageUrl || '');
      setBackgroundMode(data.backgroundMode || 'slider');
      setBackgroundVideoUrl(data.backgroundVideoUrl || null);
      setBackgroundSliderImages(Array.isArray(data.backgroundSliderImages) ? data.backgroundSliderImages : []);
      setWaitingListEntries(Array.isArray(data.waitingListEntries) ? data.waitingListEntries : []);

      setLogoFile(null);
      setBackgroundVideoFile(null);
      setSliderImageFiles([]);
      setSuccessMessage(data.message || 'Action completed');
    } catch (actionError) {
      console.error(actionError);
      setError(actionError instanceof Error ? actionError.message : 'Failed to run action');
    } finally {
      setIsRunningAction(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-lg bg-white p-6 shadow-md">Loading upcoming launch settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upcoming Launch</h1>
        <p className="mt-2 text-sm text-gray-600">Manage waiting list counters and release countdown targets.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm sm:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Upcoming Page Status</p>
          <p className={`mt-2 text-2xl font-bold ${upcomingEnabled ? 'text-emerald-600' : 'text-red-600'}`}>
            {upcomingEnabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Starting Base Count</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{baseCount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">DB Join Count</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{dbCount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Displayed Total</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalCount.toLocaleString()}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Upcoming Page Visibility</label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={upcomingEnabled}
              onChange={(event) => setUpcomingEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gray-900"
            />
            <span className="text-sm text-gray-700">Enable upcoming page</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            When disabled, the upcoming page is hidden and waiting-list registrations are blocked.
          </p>
        </div>

        <div>
          <label htmlFor="baseCount" className="mb-2 block text-sm font-medium text-gray-700">Starting Base Count</label>
          <input
            id="baseCount"
            type="number"
            min={0}
            step={1}
            value={baseCount}
            onChange={(event) => setBaseCount(Math.max(0, Number(event.target.value) || 0))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none transition focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="tshirtReleaseAt" className="mb-2 block text-sm font-medium text-gray-700">T-Shirt Release Date & Time</label>
          <input
            id="tshirtReleaseAt"
            type="datetime-local"
            value={tshirtReleaseAt}
            onChange={(event) => setTshirtReleaseAt(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none transition focus:border-primary"
            required
          />
        </div>

        <div>
          <label htmlFor="movieReleaseAt" className="mb-2 block text-sm font-medium text-gray-700">Movie Release Date & Time</label>
          <input
            id="movieReleaseAt"
            type="datetime-local"
            value={movieReleaseAt}
            onChange={(event) => setMovieReleaseAt(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none transition focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Header Logo Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              setLogoFile(file);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          {logoImageUrl ? (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoImageUrl} alt="Current logo" className="h-14 w-auto rounded border" />
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="backgroundMode" className="mb-2 block text-sm font-medium text-gray-700">Background Mode</label>
          <select
            id="backgroundMode"
            value={backgroundMode}
            onChange={(event) => setBackgroundMode(event.target.value === 'video' ? 'video' : 'slider')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none transition focus:border-primary"
          >
            <option value="slider">Image Slider (up to 5 images)</option>
            <option value="video">Video Background</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Background Video {backgroundMode === 'video' ? '(required)' : '(optional)'}</label>
          <input
            type="file"
            accept="video/*"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              setBackgroundVideoFile(file);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          {backgroundVideoUrl ? <p className="mt-2 text-xs text-gray-600">Current video: {backgroundVideoUrl}</p> : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Background Slider Images (max 5)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              const pickedFiles = Array.from(event.target.files || []);
              setSliderImageFiles((currentFiles) => {
                const combined = [...currentFiles, ...pickedFiles];
                return combined.slice(0, 5);
              });
              event.currentTarget.value = '';
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />

          <p className="mt-2 text-xs text-gray-500">
            You can pick multiple at once or add more in separate selections. Maximum 5 images.
          </p>

          {sliderImageFiles.length > 0 ? (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Selected New Images ({sliderImageFiles.length}/5)</p>
                <button
                  type="button"
                  onClick={() => setSliderImageFiles([])}
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Clear Selected
                </button>
              </div>
              <div className="space-y-1">
                {sliderImageFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between text-xs text-gray-700">
                    <span className="truncate pr-3">{file.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSliderImageFiles((currentFiles) => currentFiles.filter((_, currentIndex) => currentIndex !== index))
                      }
                      className="font-semibold text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {backgroundSliderImages.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {backgroundSliderImages.slice(0, 5).map((imageUrl, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`${imageUrl}-${index}`} src={imageUrl} alt={`Slide ${index + 1}`} className="h-20 w-full rounded border object-cover" />
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {successMessage ? <p className="text-sm text-emerald-600">{successMessage}</p> : null}
      </form>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <p className="mt-1 text-sm text-gray-600">Reset settings to default values, clear waiting list entries, or do both.</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isRunningAction || isSaving}
            onClick={() => runAdminAction('reset-settings', 'Reset all upcoming settings to defaults?')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset Settings
          </button>

          <button
            type="button"
            disabled={isRunningAction || isSaving}
            onClick={() => runAdminAction('clear-waiting-list', 'Delete all registered waiting-list phone numbers?')}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete Waiting List
          </button>

          <button
            type="button"
            disabled={isRunningAction || isSaving}
            onClick={() => runAdminAction('reset-all', 'Reset settings and delete all waiting-list entries?')}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset Everything
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Registered Waiting List Phone Numbers</h2>
          <span className="text-sm text-gray-500">{waitingListEntries.length} total</span>
        </div>

        {waitingListEntries.length === 0 ? (
          <p className="text-sm text-gray-500">No waiting list registrations yet.</p>
        ) : (
          <div className="max-h-[480px] overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Phone Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Joined At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {waitingListEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{entry.phoneNumber}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(entry.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
