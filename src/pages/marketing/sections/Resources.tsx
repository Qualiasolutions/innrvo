import React, { useState } from 'react';
import {
  Palette,
  Key,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Image,
  Video,
  Type,
  BookOpen,
} from 'lucide-react';
import { Section } from '../components/Section';
import { EditableField } from '../components/EditableField';
import { MarketingHubData, Asset, Credential, Template } from '../types';
import { generateId } from '../data/initialData';

interface ResourcesProps {
  data: MarketingHubData['resources'];
  onUpdate: (updates: Partial<MarketingHubData['resources']>) => void;
}

const assetTypeIcons: Record<Asset['type'], React.ElementType> = {
  logo: Image,
  color: Palette,
  font: Type,
  guideline: BookOpen,
  screenshot: Image,
  video: Video,
  other: FileText,
};

const credentialStatusColors: Record<Credential['status'], string> = {
  active: 'bg-teal-500/20 text-teal-600',
  pending: 'bg-amber-500/20 text-amber-400',
  expired: 'bg-red-500/20 text-red-400',
};

const templateTypeColors: Record<Template['type'], string> = {
  content: 'bg-cyan-500/20 text-cyan-400',
  email: 'bg-purple-500/20 text-purple-400',
  ad: 'bg-amber-500/20 text-amber-400',
  report: 'bg-blue-500/20 text-blue-400',
  other: 'bg-slate-500/20 text-slate-500',
};

export function Resources({ data, onUpdate }: ResourcesProps) {
  const { brandAssets, credentials, templates } = data;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Asset helpers
  const addAsset = (type: Asset['type']) => {
    const newAsset: Asset = {
      id: generateId(),
      name: `New ${type}`,
      type,
      url: '',
      value: type === 'color' ? '#000000' : undefined,
    };
    onUpdate({ brandAssets: [...brandAssets, newAsset] });
  };

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    const assets = brandAssets.map((a) => (a.id === id ? { ...a, ...updates } : a));
    onUpdate({ brandAssets: assets });
  };

  const deleteAsset = (id: string) => {
    onUpdate({ brandAssets: brandAssets.filter((a) => a.id !== id) });
  };

  // Credential helpers
  const addCredential = () => {
    const newCredential: Credential = {
      id: generateId(),
      name: 'New Account',
      platform: '',
      status: 'pending',
      url: '',
    };
    onUpdate({ credentials: [...credentials, newCredential] });
  };

  const updateCredential = (id: string, updates: Partial<Credential>) => {
    const creds = credentials.map((c) => (c.id === id ? { ...c, ...updates } : c));
    onUpdate({ credentials: creds });
  };

  const deleteCredential = (id: string) => {
    onUpdate({ credentials: credentials.filter((c) => c.id !== id) });
  };

  // Template helpers
  const addTemplate = (type: Template['type']) => {
    const newTemplate: Template = {
      id: generateId(),
      name: `New ${type} template`,
      type,
      url: '',
    };
    onUpdate({ templates: [...templates, newTemplate] });
  };

  const updateTemplate = (id: string, updates: Partial<Template>) => {
    const temps = templates.map((t) => (t.id === id ? { ...t, ...updates } : t));
    onUpdate({ templates: temps });
  };

  const deleteTemplate = (id: string) => {
    onUpdate({ templates: templates.filter((t) => t.id !== id) });
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Group assets by type
  const assetsByType = brandAssets.reduce((acc, asset) => {
    if (!acc[asset.type]) acc[asset.type] = [];
    acc[asset.type].push(asset);
    return acc;
  }, {} as Record<Asset['type'], Asset[]>);

  return (
    <div className="space-y-6">
      {/* Brand Assets Section */}
      <Section
        title="Brand Assets"
        description="Logos, colors, fonts, and brand guidelines"
        icon={<Palette size={20} />}
        defaultExpanded={true}
      >
        {/* Colors */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Colors</h4>
            <button
              onClick={() => addAsset('color')}
              className="text-sm text-teal-600 hover:text-teal-500 flex items-center gap-1"
            >
              <Plus size={14} />
              Add Color
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(assetsByType.color || []).map((asset) => (
              <div key={asset.id} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-lg border border-slate-200"
                    style={{ backgroundColor: asset.value || '#000' }}
                  />
                  <div className="flex-1 min-w-0">
                    <EditableField
                      value={asset.name}
                      onChange={(name) => updateAsset(asset.id, { name })}
                      className="font-medium text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={asset.value || '#000000'}
                    onChange={(e) => updateAsset(asset.id, { value: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <code className="text-xs text-slate-500 flex-1">{asset.value}</code>
                  <button
                    onClick={() => copyToClipboard(asset.value || '', asset.id)}
                    className="p-1 text-slate-500 hover:text-slate-900"
                  >
                    {copiedId === asset.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => deleteAsset(asset.id)}
                    className="p-1 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logos & Images */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Logos & Images</h4>
            <button
              onClick={() => addAsset('logo')}
              className="text-sm text-teal-600 hover:text-teal-500 flex items-center gap-1"
            >
              <Plus size={14} />
              Add Logo
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...(assetsByType.logo || []), ...(assetsByType.screenshot || [])].map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onUpdate={(updates) => updateAsset(asset.id, updates)}
                onDelete={() => deleteAsset(asset.id)}
              />
            ))}
          </div>
        </div>

        {/* Fonts */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Fonts</h4>
            <button
              onClick={() => addAsset('font')}
              className="text-sm text-teal-600 hover:text-teal-500 flex items-center gap-1"
            >
              <Plus size={14} />
              Add Font
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(assetsByType.font || []).map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onUpdate={(updates) => updateAsset(asset.id, updates)}
                onDelete={() => deleteAsset(asset.id)}
              />
            ))}
          </div>
        </div>

        {/* Guidelines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900">Brand Guidelines</h4>
            <button
              onClick={() => addAsset('guideline')}
              className="text-sm text-teal-600 hover:text-teal-500 flex items-center gap-1"
            >
              <Plus size={14} />
              Add Guideline
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(assetsByType.guideline || []).map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onUpdate={(updates) => updateAsset(asset.id, updates)}
                onDelete={() => deleteAsset(asset.id)}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Platform Credentials Section */}
      <Section
        title="Platform Credentials"
        description="Quick access to your marketing platforms"
        icon={<Key size={20} />}
        defaultExpanded={true}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Platform</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Account Name</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Status</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium">Link</th>
                <th className="text-right py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((cred) => (
                <tr key={cred.id} className="border-b border-slate-200 hover:bg-white">
                  <td className="py-3 px-2">
                    <EditableField
                      value={cred.platform}
                      onChange={(platform) => updateCredential(cred.id, { platform })}
                      placeholder="e.g., Meta Ads"
                      className="font-medium"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <EditableField
                      value={cred.name}
                      onChange={(name) => updateCredential(cred.id, { name })}
                      placeholder="Account name"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <select
                      value={cred.status}
                      onChange={(e) =>
                        updateCredential(cred.id, { status: e.target.value as Credential['status'] })
                      }
                      className={`text-xs rounded px-2 py-1 ${credentialStatusColors[cred.status]}`}
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="expired">Expired</option>
                    </select>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <EditableField
                        value={cred.url}
                        onChange={(url) => updateCredential(cred.id, { url })}
                        placeholder="https://..."
                        className="text-xs"
                      />
                      {cred.url && (
                        <a
                          href={cred.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-slate-500 hover:text-teal-600"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button
                      onClick={() => deleteCredential(cred.id)}
                      className="p-1 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={addCredential}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:border-slate-500 transition-colors mt-4"
        >
          <Plus size={20} />
          Add Platform
        </button>
      </Section>

      {/* Templates Section */}
      <Section
        title="Templates & Documents"
        description="Reusable templates for content, emails, ads, and reports"
        icon={<FileText size={20} />}
        defaultExpanded={true}
      >
        {/* Template Type Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(['content', 'email', 'ad', 'report', 'other'] as Template['type'][]).map((type) => (
            <button
              key={type}
              onClick={() => addTemplate(type)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${templateTypeColors[type]} hover:opacity-80 transition-opacity`}
            >
              <Plus size={14} />
              <span className="capitalize">{type}</span>
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs px-2 py-1 rounded capitalize ${templateTypeColors[template.type]}`}>
                  {template.type}
                </span>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="p-1 text-slate-500 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <EditableField
                value={template.name}
                onChange={(name) => updateTemplate(template.id, { name })}
                className="font-medium mb-2"
              />

              <div className="flex items-center gap-2">
                <EditableField
                  value={template.url}
                  onChange={(url) => updateTemplate(template.id, { url })}
                  placeholder="Link to template..."
                  className="text-xs text-slate-500 flex-1"
                />
                {template.url && (
                  <a
                    href={template.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-500 hover:text-teal-600"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// Asset Card Component
interface AssetCardProps {
  key?: React.Key;
  asset: Asset;
  onUpdate: (updates: Partial<Asset>) => void;
  onDelete: () => void;
}

function AssetCard({ asset, onUpdate, onDelete }: AssetCardProps) {
  const Icon = assetTypeIcons[asset.type];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
          <Icon size={20} className="text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <EditableField
            value={asset.name}
            onChange={(name) => onUpdate({ name })}
            className="font-medium"
          />
          <div className="flex items-center gap-2 mt-2">
            <EditableField
              value={asset.url}
              onChange={(url) => onUpdate({ url })}
              placeholder="Link to asset..."
              className="text-xs text-slate-500 flex-1"
            />
            {asset.url && (
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-slate-500 hover:text-teal-600"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
        <button onClick={onDelete} className="p-1 text-slate-500 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
