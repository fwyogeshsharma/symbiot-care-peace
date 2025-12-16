import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEffect } from 'react';

const LiabilityDisclaimer = () => {
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
          <h1 className="text-2xl font-bold">Liability Disclaimer</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <Alert className="mb-8 border-yellow-500">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-semibold">
              BY USING THE SYMBIOT PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THIS LIABILITY DISCLAIMER.
            </AlertDescription>
          </Alert>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">1. General Disclaimer</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">1.1 Not a Substitute for Professional Care</h3>
                <p className="text-muted-foreground mb-2">
                  SymBIoT is a monitoring and tracking platform designed to assist caregivers and family members. It is NOT a replacement for:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Professional medical care or supervision</li>
                  <li>In-person caregiving</li>
                  <li>Emergency medical services</li>
                  <li>Professional medical advice, diagnosis, or treatment</li>
                  <li>Licensed healthcare providers</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">1.2 Supplementary Tool</h3>
                <p className="text-muted-foreground">
                  This platform should be used as a supplementary monitoring tool only. Users must continue to provide appropriate levels of direct care, supervision, and professional medical oversight as required by the individual's condition.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">2. Medical Disclaimer</h2>
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
                <h3 className="text-xl font-semibold mb-2 text-red-800 dark:text-red-200">2.1 Not a Medical Device</h3>
                <p className="text-red-700 dark:text-red-300">
                  SymBIoT and its associated devices are NOT medical-grade equipment and have not been evaluated or approved by regulatory bodies (FDA, CE, etc.) for medical diagnosis or treatment purposes.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">2.2 Vital Signs Monitoring Limitations</h3>
                <p className="text-muted-foreground mb-2">
                  Vital signs data (heart rate, blood pressure, oxygen saturation, temperature, glucose levels, etc.) displayed on the platform:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>May not be medically accurate</li>
                  <li>Should not be used for medical decision-making without professional verification</li>
                  <li>Are for informational and monitoring purposes only</li>
                  <li>May vary significantly from medical-grade equipment readings</li>
                  <li>Should be confirmed by medical-grade equipment before any medical action is taken</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">2.3 Seek Professional Medical Advice</h3>
                <p className="text-muted-foreground mb-2">Users must:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Consult with qualified healthcare providers for all medical decisions</li>
                  <li>Seek immediate emergency medical attention (call 911 or local emergency services) in case of any medical emergency</li>
                  <li>Not delay seeking medical care based on information from this platform</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">3. Device and Equipment Limitations</h2>
            <p className="text-muted-foreground mb-4">
              Connected devices (wearables, sensors, trackers, panic buttons, etc.) may:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Fail to capture data due to hardware malfunctions</li>
              <li>Stop functioning without warning</li>
              <li>Provide inaccurate readings due to calibration issues</li>
              <li>Lose power due to battery depletion</li>
              <li>Disconnect from the network unexpectedly</li>
              <li>Experience physical damage affecting functionality</li>
            </ul>
            <p className="font-semibold text-muted-foreground">
              The Company is NOT liable for any consequences resulting from device failures, malfunctions, or inaccurate readings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">4. Data Accuracy and Reliability</h2>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                The Company makes NO WARRANTIES OR GUARANTEES regarding:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Accuracy of any data displayed on the platform</li>
                <li>Completeness of data collection</li>
                <li>Timeliness of data transmission</li>
                <li>Reliability of data storage</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">5. Alert and Notification Systems</h2>
            <div className="space-y-4">
              <p className="text-muted-foreground mb-2">The alert system may:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Fail to trigger when conditions warrant an alert</li>
                <li>Generate false positive alerts (alerts when no actual issue exists)</li>
                <li>Generate false negative alerts (fail to alert when issues exist)</li>
                <li>Be delayed in notification delivery</li>
                <li>Fail to deliver notifications due to device settings, network issues, or app permissions</li>
              </ul>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mt-4">
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                  The Company does NOT guarantee any specific response time for alerts, real-time delivery, or that alerts will reach all designated recipients.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">6. Network and Connectivity</h2>
            <p className="text-muted-foreground mb-4">
              The platform requires active internet connection and stable network connectivity. Data transmission and platform functionality may be interrupted by:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Internet service provider (ISP) outages</li>
              <li>Wi-Fi router failures or configuration issues</li>
              <li>Cellular network outages or poor signal strength</li>
              <li>Cloud service outages or maintenance downtime</li>
              <li>Server failures or network congestion</li>
            </ul>
            <p className="font-semibold text-muted-foreground mt-4">
              Users are responsible for maintaining reliable internet connectivity and ensuring devices remain connected.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">7. Location Tracking Services</h2>
            <p className="text-muted-foreground mb-4">GPS tracking may be:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Inaccurate by several meters to hundreds of meters</li>
              <li>Affected by atmospheric conditions, building structures, or tree cover</li>
              <li>Unavailable in indoor environments</li>
              <li>Subject to satellite availability and signal quality</li>
            </ul>
            <p className="font-semibold text-muted-foreground mt-4">
              The Company is NOT liable for inaccurate location information or failure to detect geofence violations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">8. Emergency Response</h2>
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-4">
              <h3 className="text-xl font-semibold mb-2 text-red-800 dark:text-red-200">Not an Emergency Response Service</h3>
              <p className="text-red-700 dark:text-red-300 mb-2">
                SymBIoT is NOT an emergency response system. The platform:
              </p>
              <ul className="list-disc pl-6 text-red-700 dark:text-red-300 space-y-1">
                <li>Does NOT automatically contact emergency services (911, police, ambulance)</li>
                <li>Does NOT provide emergency dispatch services</li>
                <li>Does NOT guarantee that emergency situations will be detected</li>
                <li>Does NOT replace the need to call emergency services directly</li>
              </ul>
            </div>

            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
              <h4 className="font-bold text-red-900 dark:text-red-100 mb-2">Emergency Protocol:</h4>
              <ol className="list-decimal pl-6 text-red-800 dark:text-red-200 space-y-1">
                <li className="font-semibold">CALL 911 OR LOCAL EMERGENCY SERVICES IMMEDIATELY</li>
                <li>Do not rely solely on the SymBIoT platform for emergency response</li>
                <li>Alert notifications are for informational purposes only</li>
              </ol>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">9. User Responsibilities</h2>
            <p className="text-muted-foreground mb-4">Users are responsible for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Properly setting up and configuring devices</li>
              <li>Ensuring devices are worn or placed correctly</li>
              <li>Charging devices regularly and monitoring battery levels</li>
              <li>Regularly reviewing and updating alert settings</li>
              <li>Testing the system regularly to ensure it is functioning</li>
              <li>Providing appropriate levels of direct care and supervision</li>
              <li>Responding appropriately to alerts and unusual data patterns</li>
              <li>Maintaining account security with strong passwords</li>
            </ul>
            <p className="font-semibold text-muted-foreground mt-4">
              Failure to fulfill these responsibilities may result in system malfunction, inaccurate data, or missed alerts.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">10. Limitation of Liability</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">Maximum Liability</h3>
                <p className="text-muted-foreground">
                  To the fullest extent permitted by law, the Company's total liability for any claims arising from or related to the use of the SymBIoT platform shall not exceed the total amount paid by the user for the service in the twelve (12) months preceding the claim.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">Exclusion of Consequential Damages</h3>
                <p className="text-muted-foreground mb-2">The Company shall NOT be liable for:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Indirect, incidental, special, or consequential damages</li>
                  <li>Loss of profits or revenue</li>
                  <li>Loss of data or information</li>
                  <li>Business interruption</li>
                  <li>Personal injury or death</li>
                  <li>Emotional distress</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">No Warranty</h3>
                <p className="text-muted-foreground mb-2">
                  THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Warranties of merchantability</li>
                  <li>Fitness for a particular purpose</li>
                  <li>Non-infringement</li>
                  <li>Accuracy or reliability</li>
                  <li>Continuous, uninterrupted, or secure access</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">User Assumption of Risk</h3>
                <p className="text-muted-foreground">
                  By using the SymBIoT platform, users ACKNOWLEDGE AND ASSUME ALL RISKS associated with:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Remote monitoring technology limitations</li>
                  <li>Potential for device failure or inaccurate data</li>
                  <li>Delayed or missed alerts</li>
                  <li>System outages or downtime</li>
                  <li>Data security and privacy risks</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">Important Notice</h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4">
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                You understand that:
              </p>
              <ul className="list-disc pl-6 text-blue-800 dark:text-blue-200 space-y-1">
                <li>This is NOT a medical device or emergency response system</li>
                <li>The platform has significant limitations that may result in missed emergencies, inaccurate data, or system failures</li>
                <li>You must continue to provide appropriate direct care and medical oversight</li>
                <li>You should call emergency services (911) immediately in any emergency situation</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-3xl font-bold mb-4 text-primary">Contact Information</h2>
            <p className="text-muted-foreground mb-2">
              If you have questions about this liability disclaimer, please contact us:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-semibold">{t('common.symbiot')}</p>
              <p className="text-muted-foreground">
                Email: <a href="mailto:symbiot.doc@gmail.com" className="text-primary hover:underline">symbiot.doc@gmail.com</a>
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
