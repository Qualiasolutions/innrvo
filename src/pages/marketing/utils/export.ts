import { MarketingHubData } from '../types';

export function exportToMarkdown(data: MarketingHubData): string {
  const lines: string[] = [];

  // Header
  lines.push('# INrVO Marketing Hub Export');
  lines.push(`**Exported:** ${new Date().toLocaleString()}`);
  lines.push('');

  // Phase 1: Foundation
  lines.push('## Phase 1: Foundation');
  lines.push('');

  // Positioning
  lines.push('### Positioning & Messaging');
  lines.push('');
  lines.push(`**Primary Value Proposition:** ${data.phase1.positioning.primaryValueProp || 'Not defined'}`);
  lines.push('');

  if (data.phase1.positioning.alternativeValueProps.length > 0) {
    lines.push('**Alternative Value Props:**');
    data.phase1.positioning.alternativeValueProps.forEach((vp) => {
      lines.push(`- ${vp.text}${vp.isWinner ? ' ⭐ (Winner)' : ''}`);
    });
    lines.push('');
  }

  // Personas
  if (data.phase1.positioning.personas.length > 0) {
    lines.push('**Target Personas:**');
    lines.push('');
    data.phase1.positioning.personas.forEach((persona) => {
      lines.push(`#### ${persona.name} (${persona.status})`);
      lines.push(`- **Age Range:** ${persona.ageRange}`);
      lines.push(`- **Primary Pain:** ${persona.primaryPain}`);
      lines.push(`- **Key Message:** ${persona.keyMessage}`);
      if (persona.hookExamples) {
        lines.push(`- **Hook Examples:** ${persona.hookExamples}`);
      }
      lines.push('');
    });
  }

  // Competitor Comparison
  if (data.phase1.positioning.competitorComparison.length > 0) {
    lines.push('**Competitor Comparison:**');
    lines.push('');
    lines.push('| Feature | INrVO | Calm | Headspace | Insight Timer |');
    lines.push('|---------|-------|------|-----------|---------------|');
    data.phase1.positioning.competitorComparison.forEach((row) => {
      lines.push(`| ${row.feature} | ${row.inrvo} | ${row.calm} | ${row.headspace} | ${row.insightTimer} |`);
    });
    lines.push('');
  }

  // Conversion Infrastructure
  lines.push('### Conversion Infrastructure');
  lines.push('');
  lines.push(`**Landing Page:** ${data.phase1.conversion.landingPage.url || 'Not set'} (${data.phase1.conversion.landingPage.status})`);
  lines.push(`**Conversion Rate:** ${data.phase1.conversion.landingPage.conversionRate}%`);
  lines.push('');
  lines.push(`**Lead Magnet:** ${data.phase1.conversion.emailCapture.leadMagnet || 'Not defined'}`);
  lines.push(`**Subscribers:** ${data.phase1.conversion.emailCapture.subscribers}`);
  lines.push('');

  // Email Sequence
  if (data.phase1.conversion.emailSequence.length > 0) {
    lines.push('**Welcome Email Sequence:**');
    lines.push('');
    data.phase1.conversion.emailSequence.forEach((email) => {
      lines.push(`- **Day ${email.day}:** ${email.title} (${email.status})`);
      lines.push(`  - Subject: ${email.subjectLine}`);
      lines.push(`  - CTA: ${email.cta}`);
    });
    lines.push('');
  }

  // SEO Articles
  if (data.phase1.content.seoArticles.length > 0) {
    lines.push('### SEO Content');
    lines.push('');
    lines.push('| Keyword | Search Volume | Difficulty | Status | URL |');
    lines.push('|---------|---------------|------------|--------|-----|');
    data.phase1.content.seoArticles.forEach((article) => {
      lines.push(`| ${article.keyword} | ${article.searchVolume} | ${article.difficulty} | ${article.status} | ${article.url || '-'} |`);
    });
    lines.push('');
  }

  // Phase 2: Validation
  lines.push('## Phase 2: Validation');
  lines.push('');

  // Paid Acquisition
  lines.push('### Paid Acquisition');
  lines.push(`**Total Budget:** $${data.phase2.paidAcquisition.totalBudget}`);
  lines.push('');

  if (data.phase2.paidAcquisition.campaigns.length > 0) {
    lines.push('**Campaigns:**');
    lines.push('');
    data.phase2.paidAcquisition.campaigns.forEach((campaign) => {
      lines.push(`#### ${campaign.name}${campaign.isWinner ? ' ⭐' : ''}`);
      lines.push(`- **Platform:** ${campaign.platform}`);
      lines.push(`- **Budget:** $${campaign.budget}`);
      lines.push(`- **Status:** ${campaign.status}`);
      lines.push(`- **Audience:** ${campaign.audience}`);
      lines.push(`- **Creative Angle:** ${campaign.creativeAngle}`);
      lines.push(`- **Metrics:** ${campaign.impressions} impressions, ${campaign.clicks} clicks, ${campaign.conversions} conversions`);
      lines.push(`- **ROAS:** ${campaign.roas}x`);
      if (campaign.notes) {
        lines.push(`- **Notes:** ${campaign.notes}`);
      }
      lines.push('');
    });
  }

  // Influencers
  if (data.phase2.influencers.length > 0) {
    lines.push('### Influencer Tracking');
    lines.push('');
    lines.push('| Name | Platform | Followers | Status | Cost | Performance |');
    lines.push('|------|----------|-----------|--------|------|-------------|');
    data.phase2.influencers.forEach((inf) => {
      lines.push(`| ${inf.name} | ${inf.platform} | ${inf.followers} | ${inf.status} | ${inf.cost} | ${inf.performance} |`);
    });
    lines.push('');
  }

  // Phase 3: Scale
  lines.push('## Phase 3: Scale');
  lines.push('');

  // Winning Playbook
  lines.push('### Winning Playbook');
  lines.push('');
  lines.push(`**Best Message:** ${data.phase3.winningPlaybook.bestMessage || 'Not defined'}`);
  lines.push(`**Best Audience:** ${data.phase3.winningPlaybook.bestAudience || 'Not defined'}`);
  lines.push(`**Best Channel:** ${data.phase3.winningPlaybook.bestChannel || 'Not defined'}`);
  lines.push('');
  lines.push('**Unit Economics:**');
  lines.push(`- Current CAC: $${data.phase3.winningPlaybook.currentCAC}`);
  lines.push(`- Target CAC: $${data.phase3.winningPlaybook.targetCAC}`);
  lines.push(`- LTV: $${data.phase3.winningPlaybook.ltv}`);
  const ltvCac = data.phase3.winningPlaybook.currentCAC > 0
    ? (data.phase3.winningPlaybook.ltv / data.phase3.winningPlaybook.currentCAC).toFixed(1)
    : 'N/A';
  lines.push(`- LTV:CAC Ratio: ${ltvCac}x`);
  lines.push('');

  // Scale Plan
  lines.push('### Scale Plan');
  lines.push(`**Monthly Budget:** $${data.phase3.scalePlan.monthlyBudget}`);
  lines.push('');
  lines.push('**Channel Allocation:**');
  Object.entries(data.phase3.scalePlan.channelAllocation).forEach(([channel, pct]) => {
    const amount = Math.round((pct / 100) * data.phase3.scalePlan.monthlyBudget);
    lines.push(`- ${channel}: ${pct}% ($${amount})`);
  });
  lines.push('');

  // Notes
  if (data.notes.ideasParkingLot.length > 0) {
    lines.push('## Ideas Parking Lot');
    lines.push('');
    data.notes.ideasParkingLot
      .sort((a, b) => b.votes - a.votes)
      .forEach((idea) => {
        lines.push(`- [${idea.votes} votes] ${idea.content}${idea.movedTo ? ` → ${idea.movedTo}` : ''}`);
      });
    lines.push('');
  }

  if (data.notes.questions.length > 0) {
    lines.push('## Open Questions');
    lines.push('');
    data.notes.questions.forEach((q) => {
      const status = q.resolved ? '✅' : '❓';
      lines.push(`${status} **${q.question}**`);
      if (q.answer) {
        lines.push(`   Answer: ${q.answer}`);
      }
      lines.push('');
    });
  }

  return lines.join('\n');
}

export function downloadMarkdown(data: MarketingHubData): void {
  const content = exportToMarkdown(data);
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `inrvo-marketing-hub-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJSON(data: MarketingHubData): void {
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `inrvo-marketing-hub-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
