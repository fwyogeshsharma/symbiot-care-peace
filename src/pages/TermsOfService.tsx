import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { useEffect } from 'react';

const TermsOfService = () => {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
          <h1 className="text-2xl font-bold">{t('footer.termsOfService')}</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.acceptance.title')}</h2>
            <p className="text-muted-foreground">
              {t('termsOfService.acceptance.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.description.title')}</h2>
            <p className="text-muted-foreground">
              {t('termsOfService.description.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.userAccounts.title')}</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{t('termsOfService.userAccounts.items.accurate')}</li>
              <li>{t('termsOfService.userAccounts.items.confidential')}</li>
              <li>{t('termsOfService.userAccounts.items.responsible')}</li>
              <li>{t('termsOfService.userAccounts.items.notify')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.acceptableUse.title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('termsOfService.acceptableUse.intro')}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{t('termsOfService.acceptableUse.items.lawful')}</li>
              <li>{t('termsOfService.acceptableUse.items.authorized')}</li>
              <li>{t('termsOfService.acceptableUse.items.noInterference')}</li>
              <li>{t('termsOfService.acceptableUse.items.noHarm')}</li>
              <li>{t('termsOfService.acceptableUse.items.noImpersonation')}</li>
              <li>{t('termsOfService.acceptableUse.items.noUnauthorizedAccess')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.medicalDisclaimer.title')}</h2>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-4">
              <p className="text-muted-foreground font-semibold">
                {t('termsOfService.medicalDisclaimer.warning')}
              </p>
            </div>
            <p className="text-muted-foreground">
              {t('termsOfService.medicalDisclaimer.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.dataAccuracy.title')}</h2>
            <p className="text-muted-foreground">
              {t('termsOfService.dataAccuracy.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.intellectualProperty.title')}</h2>
            <p className="text-muted-foreground">
              {t('termsOfService.intellectualProperty.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.payment.title')}</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{t('termsOfService.payment.items.fees')}</li>
              <li>{t('termsOfService.payment.items.billing')}</li>
              <li>{t('termsOfService.payment.items.refunds')}</li>
              <li>{t('termsOfService.payment.items.cancellation')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.termination.title')}</h2>
            <p className="text-muted-foreground">
              {t('termsOfService.termination.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.limitation.title')}</h2>
            <p className="text-muted-foreground">
              {t('termsOfService.limitation.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.indemnification.title')}</h2>
            <p className="text-muted-foreground">
              {t('termsOfService.indemnification.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.changes.title')}</h2>
            <p className="text-muted-foreground">
              {t('termsOfService.changes.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.governingLaw.title')}</h2>
            <p className="text-muted-foreground">
              {t('termsOfService.governingLaw.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('termsOfService.contact.title')}</h2>
            <p className="text-muted-foreground mb-2">
              {t('termsOfService.contact.content')}
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold">{t('common.symbiot')}</p>
              <p className="text-muted-foreground">
                {t('termsOfService.contact.email')}: <a href="mailto:symbiot.doc@gmail.com" className="text-primary hover:underline">symbiot.doc@gmail.com</a>
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
