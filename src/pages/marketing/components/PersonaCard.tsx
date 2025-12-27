import React, { useState } from 'react';
import { ChevronDown, ChevronRight, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Persona, PersonaStatus } from '../types';
import { EditableField } from './EditableField';
import { StatusSelect } from './StatusBadge';

interface PersonaCardProps {
  key?: React.Key;
  persona: Persona;
  onUpdate: (updates: Partial<Persona>) => void;
}

export function PersonaCard({ persona, onUpdate }: PersonaCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors: Record<PersonaStatus, string> = {
    draft: 'border-slate-300',
    in_review: 'border-amber-400',
    approved: 'border-teal-500',
  };

  return (
    <div className={`border-2 ${statusColors[persona.status]} rounded-lg overflow-hidden bg-white transition-colors shadow-sm`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
          <User size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-slate-900 truncate">{persona.name}</h4>
          <p className="text-sm text-slate-500">Age {persona.ageRange}</p>
        </div>
        <StatusSelect
          value={persona.status}
          onChange={(status) => onUpdate({ status: status as PersonaStatus })}
          options={['draft', 'in_review', 'approved']}
          className="mr-2"
        />
        {isExpanded ? (
          <ChevronDown size={20} className="text-slate-400" />
        ) : (
          <ChevronRight size={20} className="text-slate-400" />
        )}
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-100"
          >
            <div className="p-4 space-y-4 bg-slate-50">
              {/* Age Range */}
              <div>
                <label className="block text-sm text-slate-500 mb-1">Age Range</label>
                <EditableField
                  value={persona.ageRange}
                  onChange={(ageRange) => onUpdate({ ageRange })}
                  placeholder="e.g., 35-50"
                />
              </div>

              {/* Primary Pain */}
              <div>
                <label className="block text-sm text-slate-500 mb-1">Primary Pain Point</label>
                <EditableField
                  value={persona.primaryPain}
                  onChange={(primaryPain) => onUpdate({ primaryPain })}
                  placeholder="What's their main frustration?"
                  multiline
                />
              </div>

              {/* Key Message */}
              <div>
                <label className="block text-sm text-slate-500 mb-1">Key Message</label>
                <EditableField
                  value={persona.keyMessage}
                  onChange={(keyMessage) => onUpdate({ keyMessage })}
                  placeholder="The core message that resonates with them"
                  multiline
                />
              </div>

              {/* Hook Examples */}
              <div>
                <label className="block text-sm text-slate-500 mb-1">Hook Examples</label>
                <EditableField
                  value={persona.hookExamples}
                  onChange={(hookExamples) => onUpdate({ hookExamples })}
                  placeholder="Ad hooks and content ideas for this persona..."
                  multiline
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
