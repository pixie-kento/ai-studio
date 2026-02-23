import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, Save, Sparkles, Copy, User, Upload, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCharacter, useUpdateCharacter, useDeleteCharacter, useGeneratePrompts } from '../../hooks/useCharacters.js';
import useWorkspaceStore from '../../stores/workspaceStore.js';
import { getPBFileUrl, cn } from '../../lib/utils.js';
import { CharacterProductionPanel } from '../../components/production/CharacterProductionPanel.jsx';

const TABS = ['Profile', 'ComfyUI Prompts', 'Production'];
const TRAITS = ['Brave', 'Curious', 'Kind', 'Funny', 'Shy', 'Energetic', 'Creative', 'Stubborn', 'Loyal', 'Silly', 'Smart', 'Clumsy', 'Adventurous', 'Gentle', 'Mischievous'];

export default function CharacterDetail() {
  const { showId, characterId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();
  const { data: character, isLoading } = useCharacter(activeWorkspace?.id, showId, characterId);
  const updateChar = useUpdateCharacter(activeWorkspace?.id, showId, characterId);
  const deleteChar = useDeleteCharacter(activeWorkspace?.id, showId);
  const genPrompts = useGeneratePrompts(activeWorkspace?.id, showId, characterId);
  const [tab, setTab] = useState('Profile');
  const [form, setForm] = useState({});
  const [dirty, setDirty] = useState(false);
  const [referenceImageFile, setReferenceImageFile] = useState(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState('');

  useEffect(() => {
    if (character) {
      setForm({ ...character });
      setDirty(false);
      setReferenceImageFile(null);
      setReferenceImagePreview('');
    }
  }, [character]);

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
  const toggleTrait = (t) => update('personality_traits',
    (form.personality_traits || []).includes(t) ? (form.personality_traits || []).filter(x => x !== t) : [...(form.personality_traits || []), t]);

  const handleSave = async () => {
    const fields = [
      'name', 'role', 'age', 'personality_traits', 'speech_style', 'catchphrases',
      'fears', 'relationships', 'visual_description', 'clothing_description',
      'growth_rules', 'backstory', 'comfyui_positive_prompt', 'comfyui_negative_prompt',
      'master_seed', 'lora_file', 'sort_order', 'is_active',
    ];

    let payload = {};
    if (referenceImageFile) {
      payload = new FormData();
      const appendField = (key, value) => {
        if (value === undefined || value === null || value === '') return;
        if (Array.isArray(value)) {
          payload.append(key, JSON.stringify(value));
          return;
        }
        payload.append(key, String(value));
      };

      for (const field of fields) appendField(field, form[field]);
      payload.append('reference_image', referenceImageFile);
    } else {
      const jsonPayload = {};
      for (const field of fields) {
        if (form[field] !== undefined) jsonPayload[field] = form[field];
      }
      payload = jsonPayload;
    }

    await updateChar.mutateAsync(payload);
    setDirty(false);
    toast.success('Character saved');
  };

  const handleDeleteCharacter = async () => {
    const ok = window.confirm(`Archive character "${character?.name || 'this character'}"?`);
    if (!ok) return;
    await deleteChar.mutateAsync(characterId);
    navigate(`/shows/${showId}/characters`);
  };

  const avatarUrl = referenceImagePreview || (character?.reference_image ? getPBFileUrl(character, character.reference_image, '300x300') : null);

  const handleReferenceImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceImageFile(file);
    setReferenceImagePreview(URL.createObjectURL(file));
    setDirty(true);
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-slate-300" /></div>;
  if (!character) return <div className="text-center py-20 text-slate-400">Character not found</div>;

  const ROLE_COLORS = { main: 'bg-purple-100 text-purple-700', supporting: 'bg-blue-100 text-blue-700', recurring: 'bg-green-100 text-green-700', background: 'bg-gray-100 text-gray-600' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0">
          {avatarUrl ? <img src={avatarUrl} alt={character.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User size={36} className="text-slate-300" /></div>}
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-400 mb-1">
            <Link to={`/shows/${showId}`} className="hover:text-brand-purple">Show</Link> / Characters / {character.name}
          </p>
          <h1 className="text-2xl font-black text-slate-900">{character.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn('badge', ROLE_COLORS[character.role] || ROLE_COLORS.background)}>{character.role}</span>
            {character.age && <span className="text-sm text-slate-500">Age {character.age}</span>}
          </div>
          <label className="inline-flex items-center gap-1 mt-3 text-xs text-brand-purple font-medium cursor-pointer">
            <Upload size={12} />
            Upload reference image
            <input type="file" accept="image/*" className="hidden" onChange={handleReferenceImageChange} />
          </label>
        </div>
        {dirty && (
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={updateChar.isPending} className="btn-primary">
              {updateChar.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save
            </button>
            <button onClick={handleDeleteCharacter} disabled={deleteChar.isPending} className="btn-danger">
              {deleteChar.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Archive
            </button>
          </div>
        )}
        {!dirty && (
          <button onClick={handleDeleteCharacter} disabled={deleteChar.isPending} className="btn-danger">
            {deleteChar.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Archive
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors', tab === t ? 'border-brand-purple text-brand-purple' : 'border-transparent text-slate-500 hover:text-slate-900')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && (
        <div className="card space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input value={form.name || ''} onChange={e => update('name', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Age</label>
              <input value={form.age || ''} onChange={e => update('age', e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Personality Traits</label>
            <div className="flex flex-wrap gap-2">
              {TRAITS.map(t => (
                <button key={t} type="button" onClick={() => toggleTrait(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${(form.personality_traits || []).includes(t) ? 'bg-brand-purple text-white border-brand-purple' : 'bg-white border-slate-200 text-slate-600'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Speech Style</label>
            <input value={form.speech_style || ''} onChange={e => update('speech_style', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Catchphrases (one per line)</label>
            <textarea value={(form.catchphrases || []).join('\n')} onChange={e => update('catchphrases', e.target.value.split('\n').filter(Boolean))} className="input min-h-20 resize-none" />
          </div>
          <div>
            <label className="label">Visual Description</label>
            <textarea value={form.visual_description || ''} onChange={e => update('visual_description', e.target.value)} className="input min-h-24 resize-none" />
          </div>
          <div>
            <label className="label">Clothing Description</label>
            <textarea value={form.clothing_description || ''} onChange={e => update('clothing_description', e.target.value)} className="input min-h-20 resize-none" />
          </div>
          <div>
            <label className="label">Backstory</label>
            <textarea value={form.backstory || ''} onChange={e => update('backstory', e.target.value)} className="input min-h-20 resize-none" />
          </div>
          <div>
            <label className="label">Fears (one per line)</label>
            <textarea value={(form.fears || []).join('\n')} onChange={e => update('fears', e.target.value.split('\n').filter(Boolean))} className="input min-h-16 resize-none" />
          </div>
        </div>
      )}

      {tab === 'ComfyUI Prompts' && (
        <div className="card space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">ComfyUI Prompts</h2>
            <button onClick={() => genPrompts.mutate()} disabled={genPrompts.isPending} className="btn-secondary text-sm">
              {genPrompts.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Regenerate with AI
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Positive Prompt</label>
              <button onClick={() => { navigator.clipboard.writeText(form.comfyui_positive_prompt || ''); toast.success('Copied!'); }} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <Copy size={12} /> Copy
              </button>
            </div>
            <textarea value={form.comfyui_positive_prompt || ''} onChange={e => update('comfyui_positive_prompt', e.target.value)} className="input min-h-32 resize-none font-mono text-xs" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Negative Prompt</label>
              <button onClick={() => { navigator.clipboard.writeText(form.comfyui_negative_prompt || ''); toast.success('Copied!'); }} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <Copy size={12} /> Copy
              </button>
            </div>
            <textarea value={form.comfyui_negative_prompt || ''} onChange={e => update('comfyui_negative_prompt', e.target.value)} className="input min-h-24 resize-none font-mono text-xs" />
          </div>
          <div>
            <label className="label">Master Seed</label>
            <input type="number" value={form.master_seed || ''} onChange={e => update('master_seed', Number(e.target.value))} className="input" placeholder="Random seed for consistent appearance" />
          </div>
          <div>
            <label className="label">LoRA File</label>
            <input value={form.lora_file || ''} onChange={e => update('lora_file', e.target.value)} className="input" placeholder="path/to/character.safetensors" />
          </div>
          {dirty && (
            <button onClick={handleSave} disabled={updateChar.isPending} className="btn-primary">
              {updateChar.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          )}
        </div>
      )}

      {tab === 'Production' && (
        <CharacterProductionPanel
          workspaceId={activeWorkspace?.id}
          showId={showId}
          characterId={characterId}
        />
      )}
    </div>
  );
}
