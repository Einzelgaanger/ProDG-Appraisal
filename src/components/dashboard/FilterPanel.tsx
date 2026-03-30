import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterState } from '@/types/appraisal';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  uniqueManagers: string[];
  uniqueRelationships: string[];
}

export default function FilterPanel({
  filters,
  setFilters,
  uniqueManagers,
  uniqueRelationships,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'managers' | 'relationships'>('managers');

  const activeFiltersCount = filters.managers.length + filters.relationships.length;

  const toggleManager = (manager: string) => {
    setFilters({
      ...filters,
      managers: filters.managers.includes(manager)
        ? filters.managers.filter(m => m !== manager)
        : [...filters.managers, manager],
    });
  };

  const toggleRelationship = (rel: string) => {
    setFilters({
      ...filters,
      relationships: filters.relationships.includes(rel)
        ? filters.relationships.filter(r => r !== rel)
        : [...filters.relationships, rel],
    });
  };

  const clearFilters = () => {
    setFilters({
      managers: [],
      relationships: [],
      scoreRange: [1, 4],
    });
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'gap-2',
          activeFiltersCount > 0 && 'border-primary text-primary'
        )}
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeFiltersCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
            {activeFiltersCount}
          </span>
        )}
        <ChevronDown className={cn(
          'w-4 h-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full right-0 mt-2 w-80 glass-card shadow-2xl z-50"
            >
              {/* Header */}
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <h4 className="font-semibold">Filter Data</h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all
                  </Button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border/50">
                <button
                  onClick={() => setActiveTab('managers')}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium transition-colors',
                    activeTab === 'managers'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  Managers ({filters.managers.length})
                </button>
                <button
                  onClick={() => setActiveTab('relationships')}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium transition-colors',
                    activeTab === 'relationships'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  Relationships ({filters.relationships.length})
                </button>
              </div>

              {/* Content */}
              <div className="max-h-64 overflow-y-auto scrollbar-thin p-2">
                {activeTab === 'managers' && (
                  <div className="space-y-1">
                    {uniqueManagers.map(manager => (
                      <button
                        key={manager}
                        onClick={() => toggleManager(manager)}
                        className={cn(
                          'w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors',
                          filters.managers.includes(manager)
                            ? 'bg-primary/20 text-primary'
                            : 'hover:bg-secondary/50'
                        )}
                      >
                        <span className="truncate">{manager}</span>
                        {filters.managers.includes(manager) && (
                          <Check className="w-4 h-4 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'relationships' && (
                  <div className="space-y-1">
                    {uniqueRelationships.map(rel => (
                      <button
                        key={rel}
                        onClick={() => toggleRelationship(rel)}
                        className={cn(
                          'w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors text-left',
                          filters.relationships.includes(rel)
                            ? 'bg-primary/20 text-primary'
                            : 'hover:bg-secondary/50'
                        )}
                      >
                        <span className="truncate">{rel}</span>
                        {filters.relationships.includes(rel) && (
                          <Check className="w-4 h-4 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}