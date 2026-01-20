import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { useEffect } from 'react';

const CookiePolicy = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <h1 className="text-2xl font-bold">{t('footer.cookiePolicy')}</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('cookiePolicy.whatAreCookies.title')}</h2>
            <p className="text-muted-foreground">
              {t('cookiePolicy.whatAreCookies.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('cookiePolicy.howWeUseCookies.title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('cookiePolicy.howWeUseCookies.intro')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('cookiePolicy.typesOfCookies.title')}</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">{t('cookiePolicy.typesOfCookies.essential.title')}</h3>
                <p className="text-muted-foreground mb-2">
                  {t('cookiePolicy.typesOfCookies.essential.description')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>{t('cookiePolicy.typesOfCookies.essential.items.authentication')}</li>
                  <li>{t('cookiePolicy.typesOfCookies.essential.items.security')}</li>
                  <li>{t('cookiePolicy.typesOfCookies.essential.items.preferences')}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">{t('cookiePolicy.typesOfCookies.functional.title')}</h3>
                <p className="text-muted-foreground mb-2">
                  {t('cookiePolicy.typesOfCookies.functional.description')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>{t('cookiePolicy.typesOfCookies.functional.items.language')}</li>
                  <li>{t('cookiePolicy.typesOfCookies.functional.items.dashboard')}</li>
                  <li>{t('cookiePolicy.typesOfCookies.functional.items.accessibility')}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">{t('cookiePolicy.typesOfCookies.performance.title')}</h3>
                <p className="text-muted-foreground mb-2">
                  {t('cookiePolicy.typesOfCookies.performance.description')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>{t('cookiePolicy.typesOfCookies.performance.items.analytics')}</li>
                  <li>{t('cookiePolicy.typesOfCookies.performance.items.usage')}</li>
                  <li>{t('cookiePolicy.typesOfCookies.performance.items.errors')}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">{t('cookiePolicy.typesOfCookies.targeting.title')}</h3>
                <p className="text-muted-foreground mb-2">
                  {t('cookiePolicy.typesOfCookies.targeting.description')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>{t('cookiePolicy.typesOfCookies.targeting.items.marketing')}</li>
                  <li>{t('cookiePolicy.typesOfCookies.targeting.items.social')}</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('cookiePolicy.thirdPartyCookies.title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('cookiePolicy.thirdPartyCookies.content')}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>{t('cookiePolicy.thirdPartyCookies.items.analytics')}</li>
              <li>{t('cookiePolicy.thirdPartyCookies.items.maps')}</li>
              <li>{t('cookiePolicy.thirdPartyCookies.items.payments')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('cookiePolicy.manageCookies.title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('cookiePolicy.manageCookies.content')}
            </p>
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</p>
              <p><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</p>
              <p><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</p>
              <p><strong>Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies</p>
            </div>
            <p className="text-muted-foreground mt-4 text-sm">
              {t('cookiePolicy.manageCookies.warning')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('cookiePolicy.doNotTrack.title')}</h2>
            <p className="text-muted-foreground">
              {t('cookiePolicy.doNotTrack.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('cookiePolicy.changes.title')}</h2>
            <p className="text-muted-foreground">
              {t('cookiePolicy.changes.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('cookiePolicy.contact.title')}</h2>
            <p className="text-muted-foreground mb-2">
              {t('cookiePolicy.contact.content')}
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold">{t('common.symbiot')}</p>
              <p className="text-muted-foreground">
                {t('cookiePolicy.contact.email')}: <a href="mailto:symbiot.doc@gmail.com" className="text-primary hover:underline">symbiot.doc@gmail.com</a>
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicy;
