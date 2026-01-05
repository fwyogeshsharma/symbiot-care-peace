import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Activity, Heart, Shield, Bell, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-healthcare.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Footer } from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/pricing");
    }
  };

  const handleKnowMore = () => {
    const featuresSection = document.getElementById("features-section");
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  return <div className="min-h-screen">
      {/* Navigation Toolbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer"
              onMouseEnter={() => {
                const audio = new Audio('/symbiotVoice.mp3');
                audio.play().catch(err => console.log('Audio play failed:', err));
              }}
            >
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <div>
                <h1 className="text-base sm:text-xl font-bold text-foreground">{t('common.symbiot')}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">{t('index.tagline')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              {!user && <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="hidden sm:inline-flex">
                  {t('index.login')}
                </Button>}
              <Button onClick={handleGetStarted} size="sm">
                <span className="hidden sm:inline">{user ? t('index.goToDashboard') : t('nav.getStarted')}</span>
                <span className="sm:hidden">{user ? t('index.dashboard') : t('index.start')}</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden mt-[57px] sm:mt-[73px]">
        <div className="absolute inset-0 z-0" style={{
        backgroundImage: `linear-gradient(135deg, rgba(0, 149, 219, 0.9), rgba(0, 188, 212, 0.85)), url(${heroImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }} />

        <div className="relative z-10 container mx-auto px-4 py-12 sm:py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="max-w-3xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                {t('index.hero.title')}
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 leading-relaxed">
                {t('index.hero.subtitle')}
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                <Button size="default" className="shadow-lg bg-secondary text-white hover:bg-secondary/90" onClick={handleKnowMore}>
                  {t('index.hero.knowMore')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="py-12 sm:py-16 lg:py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4">{t('index.features.title')}</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('index.features.subtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="p-6 sm:p-8 hover:shadow-healthcare transition-all duration-300">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl gradient-healthcare flex items-center justify-center mb-3 sm:mb-4">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">{t('index.features.realTimeVitals.title')}</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('index.features.realTimeVitals.description')}
              </p>
            </Card>

            <Card className="p-8 hover:shadow-healthcare transition-all duration-300">
              <div className="w-12 h-12 rounded-xl gradient-wellness flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('index.features.activityTracking.title')}</h3>
              <p className="text-muted-foreground">
                {t('index.features.activityTracking.description')}
              </p>
            </Card>

            <Card className="p-8 hover:shadow-healthcare transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('index.features.smartAlerts.title')}</h3>
              <p className="text-muted-foreground">
                {t('index.features.smartAlerts.description')}
              </p>
            </Card>

            <Card className="p-8 hover:shadow-healthcare transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('index.features.privacyFirst.title')}</h3>
              <p className="text-muted-foreground">
                {t('index.features.privacyFirst.description')}
              </p>
            </Card>

            <Card className="p-8 hover:shadow-healthcare transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('index.features.predictiveAnalytics.title')}</h3>
              <p className="text-muted-foreground">
                {t('index.features.predictiveAnalytics.description')}
              </p>
            </Card>

            <Card className="p-8 hover:shadow-healthcare transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-warning flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('index.features.familyCollaboration.title')}</h3>
              <p className="text-muted-foreground">
                {t('index.features.familyCollaboration.description')}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 gradient-healthcare">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">{t('index.cta.title')}</h2>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto">
            {t('index.cta.subtitle')}
          </p>
          <Button size="default" className="shadow-lg bg-secondary text-white hover:bg-secondary/90" onClick={handleGetStarted}>
            {user ? t('index.goToDashboard') : t('index.cta.getStartedToday')}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>;
};
export default Index;