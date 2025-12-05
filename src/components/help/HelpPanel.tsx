import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, X, ExternalLink, LayoutDashboard, Activity, AlertTriangle, Wifi, MapPin, HelpCircle, ArrowRight, Play } from 'lucide-react';
import { helpTopics, quickLinks, categorizeTopics, searchHelpTopics, HelpTopic, getTranslatedHelpTopics, getTranslatedQuickLinks } from '@/data/help-content';
import { restartTour } from './OnboardingTour';
import { HelpTopicCard } from './HelpTopicCard';
import { useTranslation } from 'react-i18next';

interface HelpPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const iconMap: Record<string, any> = {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  Wifi,
  MapPin,
  HelpCircle,
};

export const HelpPanel = ({ open, onOpenChange }: HelpPanelProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  // Get translated help topics and quick links (memoized to prevent infinite loops)
  // Using i18n.language as dependency since t function changes on every render
  const translatedTopics = useMemo(() => getTranslatedHelpTopics(t), [i18n.language]);
  const translatedQuickLinks = useMemo(() => getTranslatedQuickLinks(t), [i18n.language]);

  const [filteredTopics, setFilteredTopics] = useState<HelpTopic[]>(() => getTranslatedHelpTopics(t));
  const [contextTopics, setContextTopics] = useState<HelpTopic[]>([]);

  // Get context-aware topics based on current page
  useEffect(() => {
    const currentPath = location.pathname;
    const relevant = translatedTopics.filter(topic =>
      topic.relatedPages?.includes(currentPath)
    );
    setContextTopics(relevant);
  }, [location.pathname, translatedTopics]);

  // Filter topics based on search
  useEffect(() => {
    const results = searchHelpTopics(searchQuery, translatedTopics);
    setFilteredTopics(results);
  }, [searchQuery, translatedTopics]);

  const categorizedTopics = categorizeTopics(filteredTopics);

  const handleQuickLink = (path: string) => {
    if (path === 'restart-tour') {
      restartTour();
      onOpenChange(false);
    } else {
      navigate(path);
      onOpenChange(false);
    }
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return t('help.pageTitle.dashboard');
    if (path === '/movement-dashboard') return t('help.pageTitle.activity');
    if (path === '/alerts') return t('help.pageTitle.alerts');
    if (path === '/device-status') return t('help.pageTitle.devices');
    if (path === '/tracking' || path === '/indoor-tracking') return t('help.pageTitle.tracking');
    if (path === '/data-sharing') return t('help.pageTitle.dataSharing');
    return t('help.pageTitle.default');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="text-2xl">{getPageTitle()}</SheetTitle>
          <SheetDescription>
            {t('help.description')}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('help.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-6">
            {/* Context-Aware Topics */}
            {!searchQuery && contextTopics.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold">{t('help.relevantToPage')}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {contextTopics.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {contextTopics.map((topic) => (
                    <HelpTopicCard
                      key={topic.id}
                      topic={topic}
                      onNavigate={(path) => {
                        navigate(path);
                        onOpenChange(false);
                      }}
                      highlighted
                    />
                  ))}
                </div>
                <Separator className="my-6" />
              </div>
            )}

            {/* Quick Links */}
            {!searchQuery && (
              <div>
                <h3 className="font-semibold mb-3">{t('help.quickActions')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {translatedQuickLinks.map((link) => {
                    const Icon = iconMap[link.icon || 'HelpCircle'];
                    return (
                      <Button
                        key={link.path}
                        variant="outline"
                        className="h-auto flex-col items-start p-3 text-left w-full overflow-hidden whitespace-normal"
                        onClick={() => handleQuickLink(link.path)}
                      >
                        <div className="flex items-start gap-2 mb-1 w-full">
                          {Icon && <Icon className="w-4 h-4 shrink-0 mt-0.5" />}
                          <span className="text-sm font-medium break-words leading-tight">{link.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground break-words w-full leading-tight">
                          {link.description}
                        </span>
                      </Button>
                    );
                  })}
                </div>
                <Separator className="my-6" />
              </div>
            )}

            {/* Search Results or Categorized Topics */}
            {searchQuery ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold">{t('help.searchResults')}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {filteredTopics.length}
                  </Badge>
                </div>
                {filteredTopics.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">{t('help.noResults')} "{searchQuery}"</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="mt-2"
                    >
                      {t('help.clearSearch')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTopics.map((topic) => (
                      <HelpTopicCard
                        key={topic.id}
                        topic={topic}
                        onNavigate={(path) => {
                          navigate(path);
                          onOpenChange(false);
                        }}
                        showCategory
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3 className="font-semibold mb-3">{t('help.browseByTopic')}</h3>
                <Accordion type="multiple" className="w-full">
                  {Object.entries(categorizedTopics).map(([category, topics]) => (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="text-sm font-medium hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span className="hover:underline">{category}</span>
                          <Badge variant="secondary" className="text-xs">
                            {topics.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {topics.map((topic) => (
                            <HelpTopicCard
                              key={topic.id}
                              topic={topic}
                              onNavigate={(path) => {
                                navigate(path);
                                onOpenChange(false);
                              }}
                              compact
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {/* Footer */}
            <div className="pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">{t('help.needMoreHelp')}</p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href="mailto:support@symbiot.com">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t('help.contactSupport')}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
