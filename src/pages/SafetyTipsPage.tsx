import { useState, useEffect, useCallback } from 'react';
import {
  Lightbulb, Shield, Car, HeartPulse, ShieldAlert, Globe,
  Siren, Moon, Mountain, UserCheck, Smartphone, Search, Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, Input, Badge, EmptyState } from '@/components/ui';
import {
  categoryLabel, categoryIcon, cn,
} from '@/lib/utils';
import type { SafetyTip, SafetyTipCategory } from '@/lib/types';

const ICONS: Record<string, typeof Shield> = {
  Shield, Car, HeartPulse, ShieldAlert, Globe, Siren, Moon, Mountain, UserCheck, Smartphone,
};

const CATEGORIES: SafetyTipCategory[] = [
  'general', 'transportation', 'health', 'crime', 'culture',
  'emergency', 'nightlife', 'outdoor', 'women_safety', 'digital',
];

export function SafetyTipsPage() {
  const [tips, setTips] = useState<SafetyTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<SafetyTipCategory | 'all'>('all');

  const fetchTips = useCallback(async () => {
    const { data } = await supabase
      .from('safety_tips')
      .select('*')
      .order('priority', { ascending: false });
    setTips((data as SafetyTip[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  const filtered = tips.filter((t) => {
    const matchCategory = activeCategory === 'all' || t.category === activeCategory;
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Safety Tips & Recommendations</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Expert travel safety guidance powered by AI — browse by category or search
        </p>
      </div>

      {/* AI badge */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 text-white">
        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold">AI-Powered Recommendations</h3>
          <p className="text-sm text-teal-100">
            Tips are ranked by relevance to your current situation when live tracking is active.
          </p>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Search safety tips..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        icon={<Search className="w-4 h-4" />}
      />

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all',
            activeCategory === 'all'
              ? 'bg-teal-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300',
          )}
        >
          All Categories
        </button>
        {CATEGORIES.map((cat) => {
          const Icon = ICONS[categoryIcon(cat)] ?? Shield;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
                activeCategory === cat
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {categoryLabel(cat)}
            </button>
          );
        })}
      </div>

      {/* Tips grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading safety tips...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Lightbulb className="w-7 h-7" />}
            title="No tips found"
            description="Try a different search or category filter."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tip) => {
            const Icon = ICONS[categoryIcon(tip.category)] ?? Shield;
            return (
              <Card key={tip.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{tip.title}</h3>
                    </div>
                    <Badge className="bg-slate-100 text-slate-600">
                      {categoryLabel(tip.category)}
                    </Badge>
                  </div>
                  {tip.priority >= 9 && (
                    <Badge className="bg-amber-100 text-amber-700">
                      <ShieldAlert className="w-3 h-3" />
                      High Priority
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{tip.content}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
