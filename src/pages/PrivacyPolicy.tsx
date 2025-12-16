import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { useEffect } from 'react';

const PrivacyPolicy = () => {
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
          <h1 className="text-2xl font-bold">{t('footer.privacyPolicy')}</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('privacyPolicy.introduction.title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('privacyPolicy.introduction.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('privacyPolicy.informationWeCollect.title')}</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">{t('privacyPolicy.informationWeCollect.personalInfo.title')}</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>{t('privacyPolicy.informationWeCollect.personalInfo.items.name')}</li>
                  <li>{t('privacyPolicy.informationWeCollect.personalInfo.items.email')}</li>
                  <li>{t('privacyPolicy.informationWeCollect.personalInfo.items.phone')}</li>
                  <li>{t('privacyPolicy.informationWeCollect.personalInfo.items.address')}</li>
                  <li>{t('privacyPolicy.informationWeCollect.personalInfo.items.birthYear')}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">{t('privacyPolicy.informationWeCollect.healthData.title')}</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>{t('privacyPolicy.informationWeCollect.healthData.items.vitals')}</li>
                  <li>{t('privacyPolicy.informationWeCollect.healthData.items.activity')}</li>
                  <li>{t('privacyPolicy.informationWeCollect.healthData.items.location')}</li>
                  <li>{t('privacyPolicy.informationWeCollect.healthData.items.environmental')}</li>
                  <li>{t('privacyPolicy.informationWeCollect.healthData.items.medication')}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">{t('privacyPolicy.informationWeCollect.deviceData.title')}</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>{t('privacyPolicy.informationWeCollect.deviceData.items.deviceInfo')}</li>
                  <li>{t('privacyPolicy.informationWeCollect.deviceData.items.ipAddress')}</li>
                  <li>{t('privacyPolicy.informationWeCollect.deviceData.items.browserType')}</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('privacyPolicy.howWeUseInfo.title')}</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{t('privacyPolicy.howWeUseInfo.items.provideServices')}</li>
              <li>{t('privacyPolicy.howWeUseInfo.items.monitoring')}</li>
              <li>{t('privacyPolicy.howWeUseInfo.items.alerts')}</li>
              <li>{t('privacyPolicy.howWeUseInfo.items.analytics')}</li>
              <li>{t('privacyPolicy.howWeUseInfo.items.communication')}</li>
              <li>{t('privacyPolicy.howWeUseInfo.items.improvement')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('privacyPolicy.dataSharing.title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('privacyPolicy.dataSharing.intro')}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{t('privacyPolicy.dataSharing.items.authorizedUsers')}</li>
              <li>{t('privacyPolicy.dataSharing.items.serviceProviders')}</li>
              <li>{t('privacyPolicy.dataSharing.items.healthcare')}</li>
              <li>{t('privacyPolicy.dataSharing.items.legal')}</li>
              <li>{t('privacyPolicy.dataSharing.items.emergency')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('privacyPolicy.dataSecurity.title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('privacyPolicy.dataSecurity.content')}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{t('privacyPolicy.dataSecurity.items.encryption')}</li>
              <li>{t('privacyPolicy.dataSecurity.items.accessControls')}</li>
              <li>{t('privacyPolicy.dataSecurity.items.regularAudits')}</li>
              <li>{t('privacyPolicy.dataSecurity.items.hipaaCompliance')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('privacyPolicy.yourRights.title')}</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>{t('privacyPolicy.yourRights.items.access')}</li>
              <li>{t('privacyPolicy.yourRights.items.correction')}</li>
              <li>{t('privacyPolicy.yourRights.items.deletion')}</li>
              <li>{t('privacyPolicy.yourRights.items.portability')}</li>
              <li>{t('privacyPolicy.yourRights.items.optOut')}</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('privacyPolicy.dataRetention.title')}</h2>
            <p className="text-muted-foreground">
              {t('privacyPolicy.dataRetention.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('privacyPolicy.childrenPrivacy.title')}</h2>
            <p className="text-muted-foreground">
              {t('privacyPolicy.childrenPrivacy.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('privacyPolicy.changes.title')}</h2>
            <p className="text-muted-foreground">
              {t('privacyPolicy.changes.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('privacyPolicy.contact.title')}</h2>
            <p className="text-muted-foreground mb-2">
              {t('privacyPolicy.contact.content')}
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold">{t('common.symbiot')}</p>
              <p className="text-muted-foreground">
                {t('privacyPolicy.contact.email')}: <a href="mailto:symbiot.doc@gmail.com" className="text-primary hover:underline">symbiot.doc@gmail.com</a>
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
