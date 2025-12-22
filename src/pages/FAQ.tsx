import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQ = () => {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const categoryKeys = [
    'gettingStarted',
    'ilqScore',
    'healthMonitoring',
    'dataSharing',
    'alertsNotifications',
    'locationTracking',
    'medicationManagement',
    'reports',
    'accountSettings',
    'troubleshooting'
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{t('faq.title')}</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <p className="text-lg text-muted-foreground">
            {t('faq.subtitle')}{' '}
            <a href="mailto:symbiot.doc@gmail.com" className="text-primary hover:underline">
              symbiot.doc@gmail.com
            </a>
          </p>
        </div>

        <div className="space-y-8">
          {categoryKeys.map((categoryKey, categoryIndex) => {
            const questionKeys = t(`faq.categories.${categoryKey}.questionKeys`, { returnObjects: true }) as string[];

            return (
              <div key={categoryIndex} className="space-y-4">
                <h2 className="text-2xl font-bold text-primary border-b pb-2">
                  {t(`faq.categories.${categoryKey}.title`)}
                </h2>

                <Accordion type="single" collapsible className="w-full">
                  {questionKeys && Array.isArray(questionKeys) && questionKeys.map((questionKey: string, questionIndex: number) => (
                    <AccordionItem
                      key={questionIndex}
                      value={`item-${categoryIndex}-${questionIndex}`}
                      className="border rounded-lg mb-2 px-4"
                    >
                      <AccordionTrigger className="text-left hover:no-underline">
                        <span className="font-semibold">
                          {t(`faq.categories.${categoryKey}.questions.${questionKey}.question`)}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pt-2 pb-4">
                        {t(`faq.categories.${categoryKey}.questions.${questionKey}.answer`)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            );
          })}
        </div>

        <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-lg">
          <h3 className="text-xl font-bold mb-2">{t('faq.stillHaveQuestions')}</h3>
          <p className="text-muted-foreground mb-4">
            {t('faq.contactMessage')}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild>
              <a href="mailto:symbiot.doc@gmail.com">{t('faq.contactSupport')}</a>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard">{t('faq.goToDashboard')}</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
