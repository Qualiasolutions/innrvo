import { Target, Mail, FileText, Plus, Trash2 } from 'lucide-react';
import { MarketingHubData, ValueProp, CompetitorRow, SEOArticle, SocialContent, EmailDay } from '../types';
import { Section, SectionGrid } from '../components/Section';
import { ChecklistItem, SimpleCheckbox } from '../components/ChecklistItem';
import { EditableField, EditableNumber } from '../components/EditableField';
import { PersonaCard } from '../components/PersonaCard';
import { StatusSelect, StatusBadge } from '../components/StatusBadge';
import { generateId } from '../hooks/useMarketingData';

interface Phase1FoundationProps {
  data: MarketingHubData['phase1'];
  onUpdate: (updates: Partial<MarketingHubData['phase1']>) => void;
}

export function Phase1Foundation({ data, onUpdate }: Phase1FoundationProps) {
  // Helper to update nested positioning
  const updatePositioning = (updates: Partial<MarketingHubData['phase1']['positioning']>) => {
    onUpdate({ positioning: { ...data.positioning, ...updates } });
  };

  // Helper to update nested conversion
  const updateConversion = (updates: Partial<MarketingHubData['phase1']['conversion']>) => {
    onUpdate({ conversion: { ...data.conversion, ...updates } });
  };

  // Helper to update nested content
  const updateContent = (updates: Partial<MarketingHubData['phase1']['content']>) => {
    onUpdate({ content: { ...data.content, ...updates } });
  };

  return (
    <div className="space-y-8">
      {/* Section 1.1: Positioning & Messaging */}
      <Section
        title="1.1 Positioning & Messaging"
        description="Define your value proposition and target personas"
        icon={<Target size={20} />}
      >
        <div className="space-y-6">
          {/* Primary Value Proposition */}
          <ChecklistItem
            checked={data.positioning.primaryValuePropDefined}
            onCheckedChange={(checked) => updatePositioning({ primaryValuePropDefined: checked })}
            title="Core Value Proposition Defined"
            expandable
            defaultExpanded
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Primary Value Proposition</label>
                <EditableField
                  value={data.positioning.primaryValueProp}
                  onChange={(primaryValueProp) => updatePositioning({ primaryValueProp })}
                  placeholder="Your main value proposition..."
                  className="text-lg font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-400">Alternative Value Props to Test</label>
                  <button
                    onClick={() => {
                      const newProp: ValueProp = { id: generateId(), text: '', isWinner: false };
                      updatePositioning({
                        alternativeValueProps: [...data.positioning.alternativeValueProps, newProp],
                      });
                    }}
                    className="flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {data.positioning.alternativeValueProps.map((prop, index) => (
                    <div key={prop.id} className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const updated = data.positioning.alternativeValueProps.map((p) =>
                            p.id === prop.id ? { ...p, isWinner: !p.isWinner } : { ...p, isWinner: false }
                          );
                          updatePositioning({ alternativeValueProps: updated });
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          prop.isWinner
                            ? 'bg-teal-500/20 text-teal-400'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        {prop.isWinner ? '★ Winner' : 'Mark Winner'}
                      </button>
                      <EditableField
                        value={prop.text}
                        onChange={(text) => {
                          const updated = data.positioning.alternativeValueProps.map((p) =>
                            p.id === prop.id ? { ...p, text } : p
                          );
                          updatePositioning({ alternativeValueProps: updated });
                        }}
                        placeholder={`Alternative #${index + 1}`}
                        className="flex-1"
                      />
                      <button
                        onClick={() => {
                          const updated = data.positioning.alternativeValueProps.filter((p) => p.id !== prop.id);
                          updatePositioning({ alternativeValueProps: updated });
                        }}
                        className="p-1 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ChecklistItem>

          {/* Competitor Differentiation */}
          <ChecklistItem
            checked={data.positioning.competitorDifferentiationClear}
            onCheckedChange={(checked) => updatePositioning({ competitorDifferentiationClear: checked })}
            title="Competitor Differentiation Clear"
            expandable
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Feature</th>
                    <th className="text-left py-2 px-3 text-teal-400 font-medium">INrVO</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Calm</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Headspace</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Insight Timer</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.positioning.competitorComparison.map((row) => (
                    <tr key={row.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                      <td className="py-2 px-3">
                        <EditableField
                          value={row.feature}
                          onChange={(feature) => {
                            const updated = data.positioning.competitorComparison.map((r) =>
                              r.id === row.id ? { ...r, feature } : r
                            );
                            updatePositioning({ competitorComparison: updated });
                          }}
                          placeholder="Feature name"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <EditableField
                          value={row.inrvo}
                          onChange={(inrvo) => {
                            const updated = data.positioning.competitorComparison.map((r) =>
                              r.id === row.id ? { ...r, inrvo } : r
                            );
                            updatePositioning({ competitorComparison: updated });
                          }}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <EditableField
                          value={row.calm}
                          onChange={(calm) => {
                            const updated = data.positioning.competitorComparison.map((r) =>
                              r.id === row.id ? { ...r, calm } : r
                            );
                            updatePositioning({ competitorComparison: updated });
                          }}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <EditableField
                          value={row.headspace}
                          onChange={(headspace) => {
                            const updated = data.positioning.competitorComparison.map((r) =>
                              r.id === row.id ? { ...r, headspace } : r
                            );
                            updatePositioning({ competitorComparison: updated });
                          }}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <EditableField
                          value={row.insightTimer}
                          onChange={(insightTimer) => {
                            const updated = data.positioning.competitorComparison.map((r) =>
                              r.id === row.id ? { ...r, insightTimer } : r
                            );
                            updatePositioning({ competitorComparison: updated });
                          }}
                        />
                      </td>
                      <td className="py-2 px-1">
                        <button
                          onClick={() => {
                            const updated = data.positioning.competitorComparison.filter((r) => r.id !== row.id);
                            updatePositioning({ competitorComparison: updated });
                          }}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={() => {
                  const newRow: CompetitorRow = {
                    id: generateId(),
                    feature: '',
                    inrvo: '',
                    calm: '',
                    headspace: '',
                    insightTimer: '',
                  };
                  updatePositioning({
                    competitorComparison: [...data.positioning.competitorComparison, newRow],
                  });
                }}
                className="mt-3 flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300"
              >
                <Plus size={14} /> Add Row
              </button>
            </div>
          </ChecklistItem>

          {/* Persona Messaging */}
          <ChecklistItem
            checked={data.positioning.personaMessagingComplete}
            onCheckedChange={(checked) => updatePositioning({ personaMessagingComplete: checked })}
            title="Persona Messaging Complete"
            expandable
            defaultExpanded
          >
            <div className="space-y-4">
              {data.positioning.personas.map((persona) => (
                <PersonaCard
                  key={persona.id}
                  persona={persona}
                  onUpdate={(updates) => {
                    const updated = data.positioning.personas.map((p) =>
                      p.id === persona.id ? { ...p, ...updates } : p
                    );
                    updatePositioning({ personas: updated });
                  }}
                />
              ))}
            </div>
          </ChecklistItem>
        </div>
      </Section>

      {/* Section 1.2: Conversion Infrastructure */}
      <Section
        title="1.2 Conversion Infrastructure"
        description="Set up your landing pages, email capture, and analytics"
        icon={<Mail size={20} />}
      >
        <div className="space-y-6">
          {/* Landing Page */}
          <ChecklistItem
            checked={data.conversion.landingPageComplete}
            onCheckedChange={(checked) => updateConversion({ landingPageComplete: checked })}
            title="Landing Page"
            expandable
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Status</label>
                <StatusSelect
                  value={data.conversion.landingPage.status}
                  onChange={(status) =>
                    updateConversion({
                      landingPage: { ...data.conversion.landingPage, status: status as any },
                    })
                  }
                  options={['not_started', 'in_progress', 'live']}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">URL</label>
                <EditableField
                  value={data.conversion.landingPage.url}
                  onChange={(url) =>
                    updateConversion({
                      landingPage: { ...data.conversion.landingPage, url },
                    })
                  }
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Conversion Rate</label>
                <EditableNumber
                  value={data.conversion.landingPage.conversionRate}
                  onChange={(conversionRate) =>
                    updateConversion({
                      landingPage: { ...data.conversion.landingPage, conversionRate },
                    })
                  }
                  suffix="%"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Notes</label>
                <EditableField
                  value={data.conversion.landingPage.notes}
                  onChange={(notes) =>
                    updateConversion({
                      landingPage: { ...data.conversion.landingPage, notes },
                    })
                  }
                  placeholder="Any notes..."
                  multiline
                />
              </div>
            </div>
          </ChecklistItem>

          {/* Email Capture */}
          <ChecklistItem
            checked={data.conversion.emailCaptureComplete}
            onCheckedChange={(checked) => updateConversion({ emailCaptureComplete: checked })}
            title="Email Capture"
            expandable
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Lead Magnet</label>
                <EditableField
                  value={data.conversion.emailCapture.leadMagnet}
                  onChange={(leadMagnet) =>
                    updateConversion({
                      emailCapture: { ...data.conversion.emailCapture, leadMagnet },
                    })
                  }
                  placeholder="What are you offering in exchange for email?"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Form Locations</label>
                <div className="flex flex-wrap gap-2">
                  {['Homepage', 'Landing Page', 'Blog', 'Exit Intent'].map((location) => (
                    <label
                      key={location}
                      className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
                        data.conversion.emailCapture.locations.includes(location)
                          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/50'
                          : 'bg-slate-700 text-slate-400 border border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={data.conversion.emailCapture.locations.includes(location)}
                        onChange={(e) => {
                          const locations = e.target.checked
                            ? [...data.conversion.emailCapture.locations, location]
                            : data.conversion.emailCapture.locations.filter((l) => l !== location);
                          updateConversion({
                            emailCapture: { ...data.conversion.emailCapture, locations },
                          });
                        }}
                      />
                      {location}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <EditableNumber
                  value={data.conversion.emailCapture.subscribers}
                  onChange={(subscribers) =>
                    updateConversion({
                      emailCapture: { ...data.conversion.emailCapture, subscribers },
                    })
                  }
                  label="Current Subscribers:"
                />
              </div>
            </div>
          </ChecklistItem>

          {/* Welcome Email Sequence */}
          <ChecklistItem
            checked={data.conversion.welcomeSequenceComplete}
            onCheckedChange={(checked) => updateConversion({ welcomeSequenceComplete: checked })}
            title="Welcome Email Sequence"
            expandable
          >
            <div className="space-y-3">
              {data.conversion.emailSequence.map((email) => (
                <div
                  key={email.id}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-medium">
                        {email.day}
                      </span>
                      <div>
                        <h5 className="font-medium text-white">{email.title}</h5>
                        <p className="text-xs text-slate-400">Day {email.day}</p>
                      </div>
                    </div>
                    <StatusSelect
                      value={email.status}
                      onChange={(status) => {
                        const updated = data.conversion.emailSequence.map((e) =>
                          e.id === email.id ? { ...e, status: status as any } : e
                        );
                        updateConversion({ emailSequence: updated });
                      }}
                      options={['draft', 'written', 'live']}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <EditableField
                      value={email.subjectLine}
                      onChange={(subjectLine) => {
                        const updated = data.conversion.emailSequence.map((e) =>
                          e.id === email.id ? { ...e, subjectLine } : e
                        );
                        updateConversion({ emailSequence: updated });
                      }}
                      placeholder="Subject line..."
                      label="Subject:"
                    />
                    <EditableField
                      value={email.previewText}
                      onChange={(previewText) => {
                        const updated = data.conversion.emailSequence.map((e) =>
                          e.id === email.id ? { ...e, previewText } : e
                        );
                        updateConversion({ emailSequence: updated });
                      }}
                      placeholder="Preview text..."
                      label="Preview:"
                    />
                    <EditableField
                      value={email.cta}
                      onChange={(cta) => {
                        const updated = data.conversion.emailSequence.map((e) =>
                          e.id === email.id ? { ...e, cta } : e
                        );
                        updateConversion({ emailSequence: updated });
                      }}
                      placeholder="Call to action..."
                      label="CTA:"
                    />
                  </div>
                </div>
              ))}
            </div>
          </ChecklistItem>

          {/* Analytics Setup */}
          <ChecklistItem
            checked={data.conversion.analyticsComplete}
            onCheckedChange={(checked) => updateConversion({ analyticsComplete: checked })}
            title="Analytics Setup"
            expandable
          >
            <div className="space-y-2">
              <SimpleCheckbox
                checked={data.conversion.analytics.ga4Installed}
                onCheckedChange={(ga4Installed) =>
                  updateConversion({
                    analytics: { ...data.conversion.analytics, ga4Installed },
                  })
                }
                label="Google Analytics 4 installed"
              />
              <SimpleCheckbox
                checked={data.conversion.analytics.eventTracking}
                onCheckedChange={(eventTracking) =>
                  updateConversion({
                    analytics: { ...data.conversion.analytics, eventTracking },
                  })
                }
                label="Event tracking for key actions (sign up, first meditation, voice clone, upgrade)"
              />
              <SimpleCheckbox
                checked={data.conversion.analytics.funnelVisualization}
                onCheckedChange={(funnelVisualization) =>
                  updateConversion({
                    analytics: { ...data.conversion.analytics, funnelVisualization },
                  })
                }
                label="Funnel visualization configured"
              />
              <SimpleCheckbox
                checked={data.conversion.analytics.utmTracking}
                onCheckedChange={(utmTracking) =>
                  updateConversion({
                    analytics: { ...data.conversion.analytics, utmTracking },
                  })
                }
                label="UTM parameter tracking"
              />
              <SimpleCheckbox
                checked={data.conversion.analytics.conversionGoals}
                onCheckedChange={(conversionGoals) =>
                  updateConversion({
                    analytics: { ...data.conversion.analytics, conversionGoals },
                  })
                }
                label="Conversion goals set up"
              />
            </div>
          </ChecklistItem>
        </div>
      </Section>

      {/* Section 1.3: Content Foundation */}
      <Section
        title="1.3 Content Foundation"
        description="Plan your SEO content and social media strategy"
        icon={<FileText size={20} />}
      >
        <div className="space-y-6">
          {/* SEO Content Plan */}
          <ChecklistItem
            checked={data.content.seoContentPlanComplete}
            onCheckedChange={(checked) => updateContent({ seoContentPlanComplete: checked })}
            title="SEO Content Plan"
            expandable
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">#</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Target Keyword</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Volume</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Difficulty</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Status</th>
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">URL</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.seoArticles.map((article, index) => (
                    <tr key={article.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-slate-500">{index + 1}</td>
                      <td className="py-2 px-3">
                        <EditableField
                          value={article.keyword}
                          onChange={(keyword) => {
                            const updated = data.content.seoArticles.map((a) =>
                              a.id === article.id ? { ...a, keyword } : a
                            );
                            updateContent({ seoArticles: updated });
                          }}
                          placeholder="Keyword..."
                        />
                      </td>
                      <td className="py-2 px-3">
                        <EditableField
                          value={article.searchVolume}
                          onChange={(searchVolume) => {
                            const updated = data.content.seoArticles.map((a) =>
                              a.id === article.id ? { ...a, searchVolume } : a
                            );
                            updateContent({ seoArticles: updated });
                          }}
                          placeholder="-"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <EditableField
                          value={article.difficulty}
                          onChange={(difficulty) => {
                            const updated = data.content.seoArticles.map((a) =>
                              a.id === article.id ? { ...a, difficulty } : a
                            );
                            updateContent({ seoArticles: updated });
                          }}
                          placeholder="-"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <StatusSelect
                          value={article.status}
                          onChange={(status) => {
                            const updated = data.content.seoArticles.map((a) =>
                              a.id === article.id ? { ...a, status: status as any } : a
                            );
                            updateContent({ seoArticles: updated });
                          }}
                          options={['idea', 'outlined', 'draft', 'published', 'ranking']}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <EditableField
                          value={article.url}
                          onChange={(url) => {
                            const updated = data.content.seoArticles.map((a) =>
                              a.id === article.id ? { ...a, url } : a
                            );
                            updateContent({ seoArticles: updated });
                          }}
                          placeholder="URL..."
                        />
                      </td>
                      <td className="py-2 px-1">
                        <button
                          onClick={() => {
                            const updated = data.content.seoArticles.filter((a) => a.id !== article.id);
                            updateContent({ seoArticles: updated });
                          }}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={() => {
                  const newArticle: SEOArticle = {
                    id: generateId(),
                    keyword: '',
                    searchVolume: '',
                    difficulty: '',
                    status: 'idea',
                    url: '',
                  };
                  updateContent({ seoArticles: [...data.content.seoArticles, newArticle] });
                }}
                className="mt-3 flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300"
              >
                <Plus size={14} /> Add Article
              </button>
            </div>
          </ChecklistItem>

          {/* Hero Social Content */}
          <ChecklistItem
            checked={data.content.heroSocialContentComplete}
            onCheckedChange={(checked) => updateContent({ heroSocialContentComplete: checked })}
            title="Hero Social Content"
            expandable
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.content.heroContent.map((content) => (
                <div
                  key={content.id}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs uppercase">
                      {content.contentType}
                    </span>
                    <StatusSelect
                      value={content.status}
                      onChange={(status) => {
                        const updated = data.content.heroContent.map((c) =>
                          c.id === content.id ? { ...c, status: status as any } : c
                        );
                        updateContent({ heroContent: updated });
                      }}
                      options={['idea', 'scripted', 'filmed', 'edited', 'posted']}
                    />
                  </div>
                  <EditableField
                    value={content.hook}
                    onChange={(hook) => {
                      const updated = data.content.heroContent.map((c) =>
                        c.id === content.id ? { ...c, hook } : c
                      );
                      updateContent({ heroContent: updated });
                    }}
                    placeholder="Hook..."
                    className="font-medium mb-2"
                  />
                  <EditableField
                    value={content.concept}
                    onChange={(concept) => {
                      const updated = data.content.heroContent.map((c) =>
                        c.id === content.id ? { ...c, concept } : c
                      );
                      updateContent({ heroContent: updated });
                    }}
                    placeholder="Concept description..."
                    multiline
                    className="text-sm"
                  />
                  {content.status === 'posted' && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-4 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-white">{content.views.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">Views</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{content.likes.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">Likes</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{content.saves.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">Saves</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{content.shares.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">Shares</div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      const updated = data.content.heroContent.filter((c) => c.id !== content.id);
                      updateContent({ heroContent: updated });
                    }}
                    className="mt-3 text-xs text-slate-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newContent: SocialContent = {
                    id: generateId(),
                    contentType: 'reel',
                    hook: '',
                    concept: '',
                    scriptOutline: '',
                    status: 'idea',
                    views: 0,
                    likes: 0,
                    saves: 0,
                    shares: 0,
                    link: '',
                  };
                  updateContent({ heroContent: [...data.content.heroContent, newContent] });
                }}
                className="p-4 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center gap-2 text-slate-400 hover:text-teal-400 hover:border-teal-500/50 transition-colors"
              >
                <Plus size={20} />
                Add Content
              </button>
            </div>
          </ChecklistItem>
        </div>
      </Section>
    </div>
  );
}
