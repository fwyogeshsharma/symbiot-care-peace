import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEffect } from 'react';

const LiabilityDisclaimer = () => {
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
          <h1 className="text-2xl font-bold">{t('liabilityDisclaimer.title')}</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <Alert className="mb-8 border-yellow-500">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-semibold">
              {t('liabilityDisclaimer.acknowledgment')}
            </AlertDescription>
          </Alert>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('liabilityDisclaimer.generalDisclaimer.title')}</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">{t('liabilityDisclaimer.generalDisclaimer.notSubstitute.title')}</h3>
                <p className="text-muted-foreground mb-2">
                  {t('liabilityDisclaimer.generalDisclaimer.notSubstitute.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>{t('liabilityDisclaimer.generalDisclaimer.notSubstitute.items.medical')}</li>
                  <li>{t('liabilityDisclaimer.generalDisclaimer.notSubstitute.items.caregiving')}</li>
                  <li>{t('liabilityDisclaimer.generalDisclaimer.notSubstitute.items.emergency')}</li>
                  <li>{t('liabilityDisclaimer.generalDisclaimer.notSubstitute.items.advice')}</li>
                  <li>{t('liabilityDisclaimer.generalDisclaimer.notSubstitute.items.healthcare')}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">{t('liabilityDisclaimer.generalDisclaimer.supplementary.title')}</h3>
                <p className="text-muted-foreground">
                  {t('liabilityDisclaimer.generalDisclaimer.supplementary.content')}
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('liabilityDisclaimer.medicalDisclaimer.title')}</h2>
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
                <h3 className="text-xl font-semibold mb-2 text-red-800 dark:text-red-200">{t('liabilityDisclaimer.medicalDisclaimer.notMedicalDevice.title')}</h3>
                <p className="text-red-700 dark:text-red-300">
                  {t('liabilityDisclaimer.medicalDisclaimer.notMedicalDevice.content')}
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">{t('liabilityDisclaimer.medicalDisclaimer.vitalSignsLimitations.title')}</h3>
                <p className="text-muted-foreground mb-2">
                  {t('liabilityDisclaimer.medicalDisclaimer.vitalSignsLimitations.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>{t('liabilityDisclaimer.medicalDisclaimer.vitalSignsLimitations.items.accuracy')}</li>
                  <li>{t('liabilityDisclaimer.medicalDisclaimer.vitalSignsLimitations.items.decisions')}</li>
                  <li>{t('liabilityDisclaimer.medicalDisclaimer.vitalSignsLimitations.items.informational')}</li>
                  <li>{t('liabilityDisclaimer.medicalDisclaimer.vitalSignsLimitations.items.variance')}</li>
                  <li>{t('liabilityDisclaimer.medicalDisclaimer.vitalSignsLimitations.items.confirmation')}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">{t('liabilityDisclaimer.medicalDisclaimer.seekAdvice.title')}</h3>
                <p className="text-muted-foreground mb-2">{t('liabilityDisclaimer.medicalDisclaimer.seekAdvice.intro')}</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>{t('liabilityDisclaimer.medicalDisclaimer.seekAdvice.items.consult')}</li>
                  <li>{t('liabilityDisclaimer.medicalDisclaimer.seekAdvice.items.emergency')}</li>
                  <li>{t('liabilityDisclaimer.medicalDisclaimer.seekAdvice.items.noDelay')}</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('liabilityDisclaimer.deviceLimitations.title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('liabilityDisclaimer.deviceLimitations.intro')}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>{t('liabilityDisclaimer.deviceLimitations.items.hardware')}</li>
              <li>{t('liabilityDisclaimer.deviceLimitations.items.stopFunctioning')}</li>
              <li>{t('liabilityDisclaimer.deviceLimitations.items.inaccurate')}</li>
              <li>{t('liabilityDisclaimer.deviceLimitations.items.battery')}</li>
              <li>{t('liabilityDisclaimer.deviceLimitations.items.disconnect')}</li>
              <li>{t('liabilityDisclaimer.deviceLimitations.items.damage')}</li>
            </ul>
            <p className="font-semibold text-muted-foreground">
              {t('liabilityDisclaimer.deviceLimitations.liability')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('liabilityDisclaimer.dataAccuracy.title')}</h2>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {t('liabilityDisclaimer.dataAccuracy.intro')}
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>{t('liabilityDisclaimer.dataAccuracy.items.accuracy')}</li>
                <li>{t('liabilityDisclaimer.dataAccuracy.items.completeness')}</li>
                <li>{t('liabilityDisclaimer.dataAccuracy.items.timeliness')}</li>
                <li>{t('liabilityDisclaimer.dataAccuracy.items.reliability')}</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('liabilityDisclaimer.alertSystems.title')}</h2>
            <div className="space-y-4">
              <p className="text-muted-foreground mb-2">{t('liabilityDisclaimer.alertSystems.intro')}</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>{t('liabilityDisclaimer.alertSystems.items.failToTrigger')}</li>
                <li>{t('liabilityDisclaimer.alertSystems.items.falsePositive')}</li>
                <li>{t('liabilityDisclaimer.alertSystems.items.falseNegative')}</li>
                <li>{t('liabilityDisclaimer.alertSystems.items.delayed')}</li>
                <li>{t('liabilityDisclaimer.alertSystems.items.failToDeliver')}</li>
              </ul>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mt-4">
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                  {t('liabilityDisclaimer.alertSystems.noGuarantee')}
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('liabilityDisclaimer.networkConnectivity.title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('liabilityDisclaimer.networkConnectivity.intro')}
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>{t('liabilityDisclaimer.networkConnectivity.items.isp')}</li>
              <li>{t('liabilityDisclaimer.networkConnectivity.items.wifi')}</li>
              <li>{t('liabilityDisclaimer.networkConnectivity.items.cellular')}</li>
              <li>{t('liabilityDisclaimer.networkConnectivity.items.cloud')}</li>
              <li>{t('liabilityDisclaimer.networkConnectivity.items.server')}</li>
            </ul>
            <p className="font-semibold text-muted-foreground mt-4">
              {t('liabilityDisclaimer.networkConnectivity.responsibility')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('liabilityDisclaimer.locationTracking.title')}</h2>
            <p className="text-muted-foreground mb-4">{t('liabilityDisclaimer.locationTracking.intro')}</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>{t('liabilityDisclaimer.locationTracking.items.inaccurate')}</li>
              <li>{t('liabilityDisclaimer.locationTracking.items.affected')}</li>
              <li>{t('liabilityDisclaimer.locationTracking.items.unavailable')}</li>
              <li>{t('liabilityDisclaimer.locationTracking.items.satellite')}</li>
            </ul>
            <p className="font-semibold text-muted-foreground mt-4">
              {t('liabilityDisclaimer.locationTracking.liability')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('liabilityDisclaimer.emergencyResponse.title')}</h2>
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-4">
              <h3 className="text-xl font-semibold mb-2 text-red-800 dark:text-red-200">{t('liabilityDisclaimer.emergencyResponse.notEmergencyService.title')}</h3>
              <p className="text-red-700 dark:text-red-300 mb-2">
                {t('liabilityDisclaimer.emergencyResponse.notEmergencyService.intro')}
              </p>
              <ul className="list-disc pl-6 text-red-700 dark:text-red-300 space-y-1">
                <li>{t('liabilityDisclaimer.emergencyResponse.notEmergencyService.items.noContact')}</li>
                <li>{t('liabilityDisclaimer.emergencyResponse.notEmergencyService.items.noDispatch')}</li>
                <li>{t('liabilityDisclaimer.emergencyResponse.notEmergencyService.items.noGuarantee')}</li>
                <li>{t('liabilityDisclaimer.emergencyResponse.notEmergencyService.items.noReplace')}</li>
              </ul>
            </div>

            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
              <h4 className="font-bold text-red-900 dark:text-red-100 mb-2">{t('liabilityDisclaimer.emergencyResponse.protocol.title')}</h4>
              <ol className="list-decimal pl-6 text-red-800 dark:text-red-200 space-y-1">
                <li className="font-semibold">{t('liabilityDisclaimer.emergencyResponse.protocol.step1')}</li>
                <li>{t('liabilityDisclaimer.emergencyResponse.protocol.step2')}</li>
                <li>{t('liabilityDisclaimer.emergencyResponse.protocol.step3')}</li>
              </ol>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('liabilityDisclaimer.userResponsibilities.title')}</h2>
            <p className="text-muted-foreground mb-4">{t('liabilityDisclaimer.userResponsibilities.intro')}</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>{t('liabilityDisclaimer.userResponsibilities.items.setup')}</li>
              <li>{t('liabilityDisclaimer.userResponsibilities.items.placement')}</li>
              <li>{t('liabilityDisclaimer.userResponsibilities.items.charging')}</li>
              <li>{t('liabilityDisclaimer.userResponsibilities.items.alertSettings')}</li>
              <li>{t('liabilityDisclaimer.userResponsibilities.items.testing')}</li>
              <li>{t('liabilityDisclaimer.userResponsibilities.items.directCare')}</li>
              <li>{t('liabilityDisclaimer.userResponsibilities.items.responding')}</li>
              <li>{t('liabilityDisclaimer.userResponsibilities.items.security')}</li>
            </ul>
            <p className="font-semibold text-muted-foreground mt-4">
              {t('liabilityDisclaimer.userResponsibilities.failure')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('liabilityDisclaimer.limitationOfLiability.title')}</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">{t('liabilityDisclaimer.limitationOfLiability.maxLiability.title')}</h3>
                <p className="text-muted-foreground">
                  {t('liabilityDisclaimer.limitationOfLiability.maxLiability.content')}
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">{t('liabilityDisclaimer.limitationOfLiability.exclusionDamages.title')}</h3>
                <p className="text-muted-foreground mb-2">{t('liabilityDisclaimer.limitationOfLiability.exclusionDamages.intro')}</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>{t('liabilityDisclaimer.limitationOfLiability.exclusionDamages.items.indirect')}</li>
                  <li>{t('liabilityDisclaimer.limitationOfLiability.exclusionDamages.items.profits')}</li>
                  <li>{t('liabilityDisclaimer.limitationOfLiability.exclusionDamages.items.data')}</li>
                  <li>{t('liabilityDisclaimer.limitationOfLiability.exclusionDamages.items.business')}</li>
                  <li>{t('liabilityDisclaimer.limitationOfLiability.exclusionDamages.items.injury')}</li>
                  <li>{t('liabilityDisclaimer.limitationOfLiability.exclusionDamages.items.emotional')}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">{t('liabilityDisclaimer.limitationOfLiability.noWarranty.title')}</h3>
                <p className="text-muted-foreground mb-2">
                  {t('liabilityDisclaimer.limitationOfLiability.noWarranty.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>{t('liabilityDisclaimer.limitationOfLiability.noWarranty.items.merchantability')}</li>
                  <li>{t('liabilityDisclaimer.limitationOfLiability.noWarranty.items.fitness')}</li>
                  <li>{t('liabilityDisclaimer.limitationOfLiability.noWarranty.items.nonInfringement')}</li>
                  <li>{t('liabilityDisclaimer.limitationOfLiability.noWarranty.items.accuracy')}</li>
                  <li>{t('liabilityDisclaimer.limitationOfLiability.noWarranty.items.continuous')}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">{t('liabilityDisclaimer.limitationOfLiability.assumptionOfRisk.title')}</h3>
                <p className="text-muted-foreground">
                  {t('liabilityDisclaimer.limitationOfLiability.assumptionOfRisk.intro')}
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>{t('liabilityDisclaimer.limitationOfLiability.assumptionOfRisk.items.limitations')}</li>
                  <li>{t('liabilityDisclaimer.limitationOfLiability.assumptionOfRisk.items.deviceFailure')}</li>
                  <li>{t('liabilityDisclaimer.limitationOfLiability.assumptionOfRisk.items.alerts')}</li>
                  <li>{t('liabilityDisclaimer.limitationOfLiability.assumptionOfRisk.items.outages')}</li>
                  <li>{t('liabilityDisclaimer.limitationOfLiability.assumptionOfRisk.items.security')}</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('liabilityDisclaimer.importantNotice.title')}</h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4">
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                {t('liabilityDisclaimer.importantNotice.intro')}
              </p>
              <ul className="list-disc pl-6 text-blue-800 dark:text-blue-200 space-y-1">
                <li>{t('liabilityDisclaimer.importantNotice.items.notMedical')}</li>
                <li>{t('liabilityDisclaimer.importantNotice.items.limitations')}</li>
                <li>{t('liabilityDisclaimer.importantNotice.items.directCare')}</li>
                <li>{t('liabilityDisclaimer.importantNotice.items.call911')}</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">{t('liabilityDisclaimer.contactInfo.title')}</h2>
            <p className="text-muted-foreground mb-2">
              {t('liabilityDisclaimer.contactInfo.intro')}
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold">{t('common.symbiot')}</p>
              <p className="text-muted-foreground">
                {t('liabilityDisclaimer.contactInfo.email')}: <a href="mailto:symbiot.doc@gmail.com" className="text-primary hover:underline">symbiot.doc@gmail.com</a>
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LiabilityDisclaimer;
