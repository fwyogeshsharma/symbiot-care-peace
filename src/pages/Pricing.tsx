import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Activity, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  // Calculate yearly price with 5% discount
  const calculateYearlyPrice = (monthlyPrice: number) => {
    const yearlyTotal = monthlyPrice * 12;
    const discountedPrice = yearlyTotal * 0.95; // 5% off
    return discountedPrice;
  };

  const plans = [
    {
      name: t('pricing.plans.freeTrial.name'),
      description: t('pricing.plans.freeTrial.description'),
      price: 0,
      yearlyPrice: 0,
      duration: t('pricing.plans.freeTrial.duration'),
      devices: t('pricing.plans.freeTrial.devices'),
      features: [
        t('pricing.plans.features.freeTrial14'),
        t('pricing.plans.features.upTo5Devices'),
        t('pricing.plans.features.realTimeMonitoring'),
        t('pricing.plans.features.basicAlerts'),
        t('pricing.plans.features.activityTracking'),
        t('pricing.plans.features.emailSupport')
      ],
      highlighted: false,
      badge: t('pricing.plans.freeTrial.badge')
    },
    {
      name: t('pricing.plans.basic.name'),
      description: t('pricing.plans.basic.description'),
      price: 10,
      yearlyPrice: calculateYearlyPrice(10),
      duration: billingCycle === "monthly" ? t('pricing.perMonth') : t('pricing.perYear'),
      devices: t('pricing.plans.basic.devices'),
      features: [
        t('pricing.plans.features.upTo5Devices'),
        t('pricing.plans.features.realTimeMonitoring'),
        t('pricing.plans.features.advancedAlerts'),
        t('pricing.plans.features.activityTracking'),
        t('pricing.plans.features.healthInsights'),
        t('pricing.plans.features.priorityEmailSupport'),
        t('pricing.plans.features.dataExport')
      ],
      highlighted: false,
      badge: null
    },
    {
      name: t('pricing.plans.premium.name'),
      description: t('pricing.plans.premium.description'),
      price: 25,
      yearlyPrice: calculateYearlyPrice(25),
      duration: billingCycle === "monthly" ? t('pricing.perMonth') : t('pricing.perYear'),
      devices: t('pricing.plans.premium.devices'),
      features: [
        t('pricing.plans.features.unlimitedDevices'),
        t('pricing.plans.features.realTimeMonitoring'),
        t('pricing.plans.features.advancedAlerts'),
        t('pricing.plans.features.activityTracking'),
        t('pricing.plans.features.healthInsights'),
        t('pricing.plans.features.support247'),
        t('pricing.plans.features.dataExport'),
        t('pricing.plans.features.customIntegrations'),
        t('pricing.plans.features.apiAccess'),
        t('pricing.plans.features.dedicatedManager')
      ],
      highlighted: true,
      badge: t('pricing.plans.premium.badge')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <Activity className="w-8 h-8 text-primary" />
              <h1 className="text-xl font-bold">{t('common.symbiot')}</h1>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button onClick={() => navigate("/")} variant="outline">
                {t('nav.home')}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content starts below fixed nav */}
      <main className="mt-[73px] pt-12">
        {/* Hero Section */}
        <section className="py-12 sm:py-20 px-4 text-center">
          <div className="container mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              {t('pricing.heroTitle')}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              {t('pricing.heroSubtitle')}
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className={`text-sm sm:text-base font-medium ${billingCycle === "monthly" ? "text-primary" : "text-muted-foreground"}`}>
                {t('pricing.monthly')}
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  billingCycle === "yearly" ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-background transition-transform ${
                    billingCycle === "yearly" ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
              <span className={`text-sm sm:text-base font-medium ${billingCycle === "yearly" ? "text-primary" : "text-muted-foreground"}`}>
                {t('pricing.yearly')}
              </span>
            </div>
            {billingCycle === "yearly" && (
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                  <Zap className="w-3 h-3 mr-1" />
                  {t('pricing.saveWithYearly')}
                </Badge>
              </div>
            )}
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-8 sm:py-12 px-4 pb-20">
          <div className="container mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
              {plans.map((plan, index) => (
                <Card
                  key={index}
                  className={`p-6 sm:p-8 hover:shadow-healthcare transition-all duration-300 relative ${
                    plan.highlighted
                      ? "border-primary border-2 shadow-lg scale-105"
                      : ""
                  }`}
                >
                  {plan.badge && (
                    <Badge className="absolute top-4 right-4 bg-primary">
                      {plan.badge}
                    </Badge>
                  )}

                  <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-2xl sm:text-3xl font-bold mb-2">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-0 mb-8">
                    <div className="mb-6">
                      {plan.price === 0 ? (
                        <div className="mb-2">
                          <span className="text-4xl sm:text-5xl font-bold">Free</span>
                        </div>
                      ) : (
                        <div className="mb-2">
                          <span className="text-4xl sm:text-5xl font-bold">
                            ${billingCycle === "monthly" ? plan.price : Math.round(plan.yearlyPrice)}
                          </span>
                          <span className="text-lg text-muted-foreground ml-2">
                            {plan.duration}
                          </span>
                        </div>
                      )}
                      {billingCycle === "yearly" && plan.price > 0 && (
                        <p className="text-sm text-muted-foreground">
                          ${plan.price}{t('pricing.billedAnnually')}
                        </p>
                      )}
                      <p className="text-sm font-medium text-primary mt-2">
                        {plan.devices}
                      </p>
                    </div>

                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex gap-2 items-start">
                          <Check className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                          <span className="text-sm sm:text-base">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="p-0">
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? "default" : "outline"}
                      onClick={handleGetStarted}
                    >
                      {plan.price === 0 ? t('pricing.startFreeTrial') : t('pricing.getStarted')}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Comparison Note */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6">
              {t('pricing.allPlansInclude')}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{t('pricing.realTimeMonitoring')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('pricing.trackVitals')}
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{t('pricing.activityTracking')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('pricing.monitorActivities')}
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{t('pricing.smartAlerts')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('pricing.instantNotifications')}
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{t('pricing.securePrivate')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('pricing.hipaaCompliant')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 sm:py-20 px-4">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
              {t('pricing.faq.title')}
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-lg">{t('pricing.faq.switchPlans.question')}</h3>
                <p className="text-muted-foreground">
                  {t('pricing.faq.switchPlans.answer')}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg">{t('pricing.faq.trialEnds.question')}</h3>
                <p className="text-muted-foreground">
                  {t('pricing.faq.trialEnds.answer')}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg">{t('pricing.faq.yearlyBilling.question')}</h3>
                <p className="text-muted-foreground">
                  {t('pricing.faq.yearlyBilling.answer')}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg">{t('pricing.faq.whatIsDevice.question')}</h3>
                <p className="text-muted-foreground">
                  {t('pricing.faq.whatIsDevice.answer')}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 sm:py-12 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p className="text-sm sm:text-base">
            {t('pricing.footer')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
