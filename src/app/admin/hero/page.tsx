"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, ImagePlus, Loader2, Pencil, Plus, Save, Trash2, Video, X } from 'lucide-react';

type HeroSlide = {
  id: number;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  isActive: boolean;
  sortOrder: number;
};

type HeroDraft = Omit<HeroSlide, 'id'>;

const emptyDraft: HeroDraft = {
  title: '',
  description: '',
  ctaText: 'Explore the collection',
  ctaHref: '/shop',
  mediaType: 'image',
  mediaUrl: '',
  isActive: true,
  sortOrder: 0,
};

export default function AdminHeroPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [draft, setDraft] = useState<HeroDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSlides = useCallback(async () => {
    const response = await fetch('/api/admin/hero-slides', { cache: 'no-store', credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load hero slides');
    setSlides(Array.isArray(data.slides) ? data.slides : []);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/hero-slides', { cache: 'no-store', credentials: 'include' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load hero slides');
        if (mounted) setSlides(Array.isArray(data.slides) ? data.slides : []);
      })
      .catch((loadError: unknown) => {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Could not load hero slides');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!mediaFile) {
      setPreviewUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(mediaFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [mediaFile]);

  const beginEdit = (slide: HeroSlide) => {
    setEditingId(slide.id);
    setDraft({
      title: slide.title,
      description: slide.description,
      ctaText: slide.ctaText,
      ctaHref: slide.ctaHref,
      mediaType: slide.mediaType,
      mediaUrl: slide.mediaUrl,
      isActive: slide.isActive,
      sortOrder: slide.sortOrder,
    });
    setMediaFile(null);
    setError('');
    setMessage('');
  };

  const resetEditor = () => {
    setEditingId(null);
    setDraft({ ...emptyDraft, sortOrder: slides.length });
    setMediaFile(null);
    setError('');
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('title', draft.title);
      formData.append('description', draft.description);
      formData.append('ctaText', draft.ctaText);
      formData.append('ctaHref', draft.ctaHref);
      formData.append('mediaType', draft.mediaType);
      formData.append('mediaUrl', draft.mediaUrl);
      formData.append('isActive', String(draft.isActive));
      formData.append('sortOrder', String(draft.sortOrder));
      if (mediaFile) formData.append('mediaFile', mediaFile);

      const response = await fetch(editingId ? `/api/admin/hero-slides/${editingId}` : '/api/admin/hero-slides', {
        method: editingId ? 'PATCH' : 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save slide');

      await loadSlides();
      setMessage(editingId ? 'Slide updated.' : 'Slide created.');
      setEditingId(null);
      setDraft({ ...emptyDraft, sortOrder: slides.length + (editingId ? 0 : 1) });
      setMediaFile(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save slide');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (slide: HeroSlide) => {
    if (!window.confirm(`Delete “${slide.title}”?`)) return;
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/hero-slides/${slide.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete slide');
      setSlides((current) => current.filter((item) => item.id !== slide.id));
      if (editingId === slide.id) resetEditor();
      setMessage('Slide deleted.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete slide');
    }
  };

  const moveSlide = async (slide: HeroSlide, direction: -1 | 1) => {
    const sorted = [...slides].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const index = sorted.findIndex((item) => item.id === slide.id);
    const target = sorted[index + direction];
    if (!target) return;

    const firstOrder = slide.sortOrder;
    const secondOrder = target.sortOrder;
    const updateOrder = async (item: HeroSlide, sortOrder: number) => fetch(`/api/admin/hero-slides/${item.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, sortOrder }),
    });

    setError('');
    try {
      const responses = await Promise.all([
        updateOrder(slide, secondOrder),
        updateOrder(target, firstOrder),
      ]);
      if (responses.some((response) => !response.ok)) throw new Error('Could not reorder slides');
      await loadSlides();
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'Could not reorder slides');
    }
  };

  const mediaPreview = previewUrl || draft.mediaUrl;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Homepage</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Hero slides</h1>
          <p className="mt-1 text-sm text-slate-600">Manage the images, videos, copy, and links shown at the top of the homepage.</p>
        </div>
        <button
          type="button"
          onClick={resetEditor}
          className="inline-flex h-10 items-center gap-2 bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> New slide
        </button>
      </header>

      {(error || message) && (
        <div role="status" className={`border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {error || message}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section aria-label="Homepage hero slides" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Slides</h2>
            <span className="text-xs text-slate-500">{slides.filter((slide) => slide.isActive).length} active / {slides.length} total</span>
          </div>
          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading slides</div>
          ) : slides.length === 0 ? (
            <div className="border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <ImagePlus className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-800">No saved slides yet</p>
              <p className="mt-1 text-sm text-slate-500">The homepage will keep using its built-in hero until you add one.</p>
            </div>
          ) : (
            [...slides].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id).map((slide, index, orderedSlides) => (
              <article key={slide.id} className={`grid gap-4 border bg-white p-3 sm:grid-cols-[180px_minmax(0,1fr)_auto] ${editingId === slide.id ? 'border-emerald-600' : 'border-slate-200'}`}>
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  {slide.mediaType === 'video' ? (
                    <video src={slide.mediaUrl} muted playsInline className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slide.mediaUrl} alt="" className="h-full w-full object-cover" />
                  )}
                  <span className={`absolute left-2 top-2 px-2 py-1 text-[10px] font-semibold uppercase ${slide.isActive ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-white'}`}>
                    {slide.isActive ? 'Live' : 'Hidden'}
                  </span>
                </div>
                <div className="min-w-0 py-1">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    {slide.mediaType === 'video' ? <Video className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
                    <span>Slide {index + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span>{slide.mediaType}</span>
                  </div>
                  <h3 className="mt-2 truncate font-semibold text-slate-950">{slide.title}</h3>
                  <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-slate-600">{slide.description || 'No supporting text'}</p>
                  <p className="mt-2 truncate text-xs text-slate-500">{slide.ctaText ? `${slide.ctaText} · ${slide.ctaHref}` : 'No call to action'}</p>
                </div>
                <div className="flex items-center justify-end gap-1 sm:flex-col">
                  <button type="button" disabled={index === 0} onClick={() => moveSlide(slide, -1)} className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30" aria-label="Move slide up"><ChevronUp className="h-4 w-4" /></button>
                  <button type="button" disabled={index === orderedSlides.length - 1} onClick={() => moveSlide(slide, 1)} className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30" aria-label="Move slide down"><ChevronDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => beginEdit(slide)} className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100" aria-label="Edit slide"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => handleDelete(slide)} className="flex h-8 w-8 items-center justify-center text-red-700 hover:bg-red-50" aria-label="Delete slide"><Trash2 className="h-4 w-4" /></button>
                </div>
              </article>
            ))
          )}
        </section>

        <aside className="self-start border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">{editingId ? 'Edit slide' : 'New slide'}</h2>
              <p className="mt-0.5 text-xs text-slate-500">All fields preview on the homepage.</p>
            </div>
            {editingId && <button type="button" onClick={resetEditor} aria-label="Cancel editing" className="flex h-8 w-8 items-center justify-center text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
          </div>
          <form onSubmit={handleSave} className="space-y-4 p-4">
            {mediaPreview && (
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                {draft.mediaType === 'video' ? (
                  <video src={mediaPreview} controls muted className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaPreview} alt="Hero media preview" className="h-full w-full object-cover" />
                )}
              </div>
            )}

            <label className="block text-xs font-semibold text-slate-700">
              Headline
              <input required maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm font-normal text-slate-950 outline-none focus:border-emerald-700" />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Supporting text
              <textarea maxLength={500} rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-1.5 w-full resize-y border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950 outline-none focus:border-emerald-700" />
            </label>

            <div className="grid grid-cols-2 gap-2">
              {(['image', 'video'] as const).map((mediaType) => (
                <button key={mediaType} type="button" onClick={() => { setDraft({ ...draft, mediaType }); setMediaFile(null); }} aria-pressed={draft.mediaType === mediaType} className={`flex h-9 items-center justify-center gap-2 border text-xs font-semibold capitalize ${draft.mediaType === mediaType ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 text-slate-600 hover:border-slate-500'}`}>
                  {mediaType === 'image' ? <ImagePlus className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  {mediaType}
                </button>
              ))}
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Upload {draft.mediaType}
              <input key={`${editingId ?? 'new'}-${draft.mediaType}`} type="file" accept={draft.mediaType === 'image' ? 'image/jpeg,image/png,image/webp,image/avif' : 'video/mp4,video/webm,video/quicktime'} onChange={(event) => setMediaFile(event.target.files?.[0] || null)} className="mt-1.5 block w-full text-xs font-normal text-slate-600 file:mr-3 file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-800 hover:file:bg-slate-200" />
              <span className="mt-1 block text-[11px] font-normal text-slate-500">Maximum 150 MB. Or paste a hosted media URL below.</span>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Media URL
              <input value={draft.mediaUrl} onChange={(event) => setDraft({ ...draft, mediaUrl: event.target.value })} placeholder="/uploads/hero/images/..." className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm font-normal text-slate-950 outline-none focus:border-emerald-700" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-slate-700">
                Button text
                <input maxLength={80} value={draft.ctaText} onChange={(event) => setDraft({ ...draft, ctaText: event.target.value })} className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm font-normal text-slate-950 outline-none focus:border-emerald-700" />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Button link
                <input required maxLength={500} value={draft.ctaHref} onChange={(event) => setDraft({ ...draft, ctaHref: event.target.value })} placeholder="/shop" className="mt-1.5 h-10 w-full border border-slate-300 px-3 text-sm font-normal text-slate-950 outline-none focus:border-emerald-700" />
              </label>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} className="h-4 w-4 accent-emerald-700" /> Show on homepage
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                Order
                <input type="number" min={0} max={10000} value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) })} className="h-9 w-16 border border-slate-300 px-2 text-sm font-normal text-slate-950 outline-none focus:border-emerald-700" />
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={isSaving} className="inline-flex h-10 flex-1 items-center justify-center gap-2 bg-emerald-800 px-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {isSaving ? 'Saving' : editingId ? 'Save changes' : 'Create slide'}
              </button>
              {editingId && <button type="button" onClick={resetEditor} className="h-10 border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>}
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}