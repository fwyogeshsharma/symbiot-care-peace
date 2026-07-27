import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Heart,
  Activity,
  MapPin,
  Bell,
  Shield,
  Users,
  TrendingUp,
  Smartphone,
  BarChart3,
  Lock,
  Zap,
  Globe,
  Home,
  AlertTriangle,
  DollarSign,
  Clock,
  Brain,
  Wifi,
  Phone,
  Ban,
  XCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  LineChart,
  Network
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Footer } from "@/components/Footer";

const InvestorInfo = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const problems = [
    {
      icon: AlertTriangle,
      title: t('investorInfo.problem.delayedResponse.title'),
      description: t('investorInfo.problem.delayedResponse.description')
    },
    {
      icon: DollarSign,
      title: t('investorInfo.problem.escalatingCosts.title'),
      description: t('investorInfo.problem.escalatingCosts.description')
    },
    {
      icon: Clock,
      title: t('investorInfo.problem.caregiverBurnout.title'),
      description: t('investorInfo.problem.caregiverBurnout.description')
    },
    {
      icon: Users,
      title: t('investorInfo.problem.fragmentedInfo.title'),
      description: t('investorInfo.problem.fragmentedInfo.description')
    }
  ];

  const currentSolutions = [
    {
      solution: t('investorInfo.currentSolutions.medicalAlerts.title'),
      limitations: t('investorInfo.currentSolutions.medicalAlerts.limitations', { returnObjects: true }) as string[]
    },
    {
      solution: t('investorInfo.currentSolutions.homeHealthAides.title'),
      limitations: t('investorInfo.currentSolutions.homeHealthAides.limitations', { returnObjects: true }) as string[]
    },
    {
      solution: t('investorInfo.currentSolutions.nursingHomes.title'),
      limitations: t('investorInfo.currentSolutions.nursingHomes.limitations', { returnObjects: true }) as string[]
    },
    {
      solution: t('investorInfo.currentSolutions.fitnessTrackers.title'),
      limitations: t('investorInfo.currentSolutions.fitnessTrackers.limitations', { returnObjects: true }) as string[]
    }
  ];

  const ourSolution = [
    {
      icon: Heart,
      title: t('investorInfo.solution.vitalMonitoring.title'),
      description: t('investorInfo.solution.vitalMonitoring.description'),
      improvement: t('investorInfo.solution.vitalMonitoring.improvement')
    },
    {
      icon: Activity,
      title: t('investorInfo.solution.activityRecognition.title'),
      description: t('investorInfo.solution.activityRecognition.description'),
      improvement: t('investorInfo.solution.activityRecognition.improvement')
    },
    {
      icon: MapPin,
      title: t('investorInfo.solution.tracking.title'),
      description: t('investorInfo.solution.tracking.description'),
      improvement: t('investorInfo.solution.tracking.improvement')
    },
    {
      icon: Bell,
      title: t('investorInfo.solution.smartAlerts.title'),
      description: t('investorInfo.solution.smartAlerts.description'),
      improvement: t('investorInfo.solution.smartAlerts.improvement')
    },
    {
      icon: BarChart3,
      title: t('investorInfo.solution.analytics.title'),
      description: t('investorInfo.solution.analytics.description'),
      improvement: t('investorInfo.solution.analytics.improvement')
    },
    {
      icon: Users,
      title: t('investorInfo.solution.coordination.title'),
      description: t('investorInfo.solution.coordination.description'),
      improvement: t('investorInfo.solution.coordination.improvement')
    }
  ];

  const techEnablers = [
    {
      icon: Brain,
      title: t('investorInfo.technology.ai.title'),
      description: t('investorInfo.technology.ai.description')
    },
    {
      icon: Wifi,
      title: t('investorInfo.technology.iot.title'),
      description: t('investorInfo.technology.iot.description')
    },
    {
      icon: Network,
      title: t('investorInfo.technology.5g.title'),
      description: t('investorInfo.technology.5g.description')
    },
    {
      icon: Shield,
      title: t('investorInfo.technology.cloud.title'),
      description: t('investorInfo.technology.cloud.description')
    }
  ];

  const benefits = [
    {
      category: t('investorInfo.impact.costSavings.title'),
      icon: DollarSign,
      items: [
        {
          title: t('investorInfo.impact.costSavings.lowerCost.title'),
          description: t('investorInfo.impact.costSavings.lowerCost.description')
        },
        {
          title: t('investorInfo.impact.costSavings.reduceReadmissions.title'),
          description: t('investorInfo.impact.costSavings.reduceReadmissions.description')
        },
        {
          title: t('investorInfo.impact.costSavings.optimizeCaregiver.title'),
          description: t('investorInfo.impact.costSavings.optimizeCaregiver.description')
        },
        {
          title: t('investorInfo.impact.costSavings.insurance.title'),
          description: t('investorInfo.impact.costSavings.insurance.description')
        }
      ]
    },
    {
      category: t('investorInfo.impact.qualityOfLife.title'),
      icon: Heart,
      items: [
        {
          title: t('investorInfo.impact.qualityOfLife.ageInPlace.title'),
          description: t('investorInfo.impact.qualityOfLife.ageInPlace.description')
        },
        {
          title: t('investorInfo.impact.qualityOfLife.peaceOfMind.title'),
          description: t('investorInfo.impact.qualityOfLife.peaceOfMind.description')
        },
        {
          title: t('investorInfo.impact.qualityOfLife.fasterResponse.title'),
          description: t('investorInfo.impact.qualityOfLife.fasterResponse.description')
        },
        {
          title: t('investorInfo.impact.qualityOfLife.dignity.title'),
          description: t('investorInfo.impact.qualityOfLife.dignity.description')
        }
      ]
    }
  ];

  const marketStats = [
    {
      stat: t('investorInfo.market.adults65.stat'),
      label: t('investorInfo.market.adults65.label'),
      context: t('investorInfo.market.adults65.context')
    },
    {
      stat: t('investorInfo.market.marketSize.stat'),
      label: t('investorInfo.market.marketSize.label'),
      context: t('investorInfo.market.marketSize.context')
    },
    {
      stat: t('investorInfo.market.ageAtHome.stat'),
      label: t('investorInfo.market.ageAtHome.label'),
      context: t('investorInfo.market.ageAtHome.context')
    },
    {
      stat: t('investorInfo.market.caregivers.stat'),
      label: t('investorInfo.market.caregivers.label'),
      context: t('investorInfo.market.caregivers.context')
    }
  ];

  const whyNow = [
    {
      title: t('investorInfo.whyNow.techConvergence.title'),
      description: t('investorInfo.whyNow.techConvergence.description')
    },
    {
      title: t('investorInfo.whyNow.demographic.title'),
      description: t('investorInfo.whyNow.demographic.description')
    },
    {
      title: t('investorInfo.whyNow.regulatory.title'),
      description: t('investorInfo.whyNow.regulatory.description')
    },
    {
      title: t('investorInfo.whyNow.covid.title'),
      description: t('investorInfo.whyNow.covid.description')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50 dark:from-blue-950 dark:via-blue-900 dark:to-blue-950">
      {/* Navigation */}
      <nav className="border-b bg-white/95 dark:bg-blue-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-blue-950/80 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">{t('common.symbiot')}</span>
          </div>
          <div className="flex gap-4 items-center">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={() => navigate("/")}>
              {t('nav.home')}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/pricing")}>
              {t('nav.pricing')}
            </Button>
            <Button onClick={() => navigate("/auth")}>
              {t('nav.getStarted')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block mb-4 px-4 py-2 bg-primary text-white rounded-full shadow-md">
            <span className="font-semibold">{t('investorInfo.badge.investorOverview')}</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
            {t('investorInfo.hero.title')} <span className="text-primary">{t('investorInfo.hero.titleAccent')}</span>
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
            {t('investorInfo.hero.subtitle')}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" className="gap-2" onClick={() => window.location.href = "mailto:info@faberwork.com?subject=Schedule a Demo - SymBIoT"}>
              {t('investorInfo.hero.scheduleDemo')} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              const problemSection = document.getElementById('problem');
              problemSection?.scrollIntoView({ behavior: 'smooth' });
            }}>
              {t('investorInfo.hero.readFullStory')}
            </Button>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section id="problem" className="container mx-auto px-4 py-16 bg-white dark:bg-blue-900/30 rounded-3xl my-16 shadow-lg border border-red-100 dark:border-red-900/30">
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-2 bg-red-600 text-white rounded-full">
            <span className="font-semibold">{t('investorInfo.badge.theProblem')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            {t('investorInfo.problem.title')}
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            {t('investorInfo.problem.subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <Card key={index} className="border-red-200 dark:border-red-900 bg-white dark:bg-blue-950 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-2">{problem.title}</CardTitle>
                      <CardDescription className="text-base">{problem.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Current Solutions & Limitations */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-2 bg-orange-600 text-white rounded-full">
            <span className="font-semibold">{t('investorInfo.badge.currentSolutions')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            {t('investorInfo.currentSolutions.title')}
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            {t('investorInfo.currentSolutions.subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {currentSolutions.map((item, index) => (
            <Card key={index} className="border-orange-200 dark:border-orange-900 bg-white dark:bg-blue-950 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <XCircle className="h-5 w-5 text-orange-600" />
                  {item.solution}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {item.limitations.map((limitation, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                      <Ban className="h-4 w-4 text-orange-500 flex-shrink-0 mt-1" />
                      <span className="text-sm">{limitation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Our Solution */}
      <section className="container mx-auto px-4 py-16 bg-white dark:bg-blue-900/30 rounded-3xl my-16 shadow-lg border border-green-100 dark:border-green-900/30">
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-2 bg-green-600 text-white rounded-full">
            <span className="font-semibold">{t('investorInfo.badge.ourSolution')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('investorInfo.solution.title')}
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            {t('investorInfo.solution.subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {ourSolution.map((solution, index) => {
            const Icon = solution.icon;
            return (
              <Card key={index} className="border-green-200 dark:border-green-900 bg-white dark:bg-blue-950 shadow-md hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-lg">{solution.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{solution.description}</p>
                  <div className="pt-2 border-t">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      {solution.improvement}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Technology Enablers - Why Now */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-2 bg-blue-600 text-white rounded-full">
            <span className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {t('investorInfo.badge.techInnovation')}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('investorInfo.technology.title')}
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            {t('investorInfo.technology.subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {techEnablers.map((tech, index) => {
            const Icon = tech.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow border-blue-200 dark:border-blue-900 bg-white dark:bg-blue-950 shadow-md">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-2">{tech.title}</CardTitle>
                      <CardDescription className="text-base">{tech.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Benefits & ROI */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-br from-primary via-blue-600 to-blue-700 rounded-3xl my-16 text-white shadow-2xl">
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-2 bg-white text-primary rounded-full shadow-md">
            <span className="font-semibold">{t('investorInfo.badge.theImpact')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            {t('investorInfo.impact.title')}
          </h2>
          <p className="text-white/95 max-w-3xl mx-auto text-lg">
            {t('investorInfo.impact.subtitle')}
          </p>
        </div>
        {benefits.map((benefit, categoryIndex) => {
          const CategoryIcon = benefit.icon;
          return (
            <div key={categoryIndex} className="mb-12 last:mb-0">
              <div className="flex items-center gap-3 mb-6 justify-center">
                <CategoryIcon className="h-8 w-8" />
                <h3 className="text-2xl font-bold">{benefit.category}</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
                {benefit.items.map((item, itemIndex) => (
                  <Card key={itemIndex} className="bg-white/15 border-white/30 backdrop-blur-sm hover:bg-white/20 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-lg text-white font-bold">{item.title}</CardTitle>
                      <CardDescription className="text-white/90 text-base">{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        <div className="mt-12 text-center bg-white/20 backdrop-blur-sm rounded-2xl p-8 max-w-3xl mx-auto border-2 border-white/40 shadow-xl">
          <p className="text-4xl font-bold mb-2 text-white">{t('investorInfo.impact.savingsHighlight')}</p>
          <p className="text-white/95 text-lg">
            {t('investorInfo.impact.savingsDescription')}
          </p>
        </div>
      </section>

      {/* Market Opportunity */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-2 bg-primary text-white rounded-full">
            <span className="font-semibold">{t('investorInfo.badge.marketOpportunity')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">{t('investorInfo.market.title')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {t('investorInfo.market.subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {marketStats.map((item, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow bg-white dark:bg-blue-950 shadow-md">
              <CardHeader>
                <CardTitle className="text-4xl font-bold text-primary mb-2">
                  {item.stat}
                </CardTitle>
                <CardDescription className="font-semibold text-lg text-foreground">
                  {item.label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.context}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Why Now */}
      <section className="container mx-auto px-4 py-16 bg-white dark:bg-blue-900/30 rounded-3xl my-16 shadow-lg">
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-2 bg-purple-600 text-white rounded-full">
            <span className="font-semibold">{t('investorInfo.badge.perfectTiming')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">{t('investorInfo.whyNow.title')}</h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            {t('investorInfo.whyNow.subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {whyNow.map((item, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow bg-white dark:bg-blue-950 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Business Model Quick Overview */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block mb-4 px-4 py-2 bg-emerald-600 text-white rounded-full">
              <span className="font-semibold">{t('investorInfo.badge.businessModel')}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">{t('investorInfo.businessModel.title')}</h2>
            <p className="text-muted-foreground text-lg">
              {t('investorInfo.businessModel.subtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center hover:shadow-lg transition-shadow border-emerald-200 dark:border-emerald-800 bg-white dark:bg-blue-950 shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">{t('investorInfo.businessModel.b2c.title')}</CardTitle>
                <CardDescription>{t('investorInfo.businessModel.b2c.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary mb-2">{t('investorInfo.businessModel.b2c.price')}</p>
                <p className="text-sm text-muted-foreground">{t('investorInfo.businessModel.b2c.period')}</p>
              </CardContent>
            </Card>
            <Card className="text-center border-primary border-2 hover:shadow-xl transition-shadow relative bg-white dark:bg-blue-950 shadow-md">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-semibold">
                {t('investorInfo.businessModel.b2b.badge')}
              </div>
              <CardHeader className="pt-8">
                <CardTitle className="text-2xl text-foreground">{t('investorInfo.businessModel.b2b.title')}</CardTitle>
                <CardDescription>{t('investorInfo.businessModel.b2b.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary mb-2">{t('investorInfo.businessModel.b2b.price')}</p>
                <p className="text-sm text-muted-foreground">{t('investorInfo.businessModel.b2b.period')}</p>
              </CardContent>
            </Card>
            <Card className="text-center hover:shadow-lg transition-shadow border-emerald-200 dark:border-emerald-800 bg-white dark:bg-blue-950 shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">{t('investorInfo.businessModel.b2b2c.title')}</CardTitle>
                <CardDescription>{t('investorInfo.businessModel.b2b2c.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary mb-2">{t('investorInfo.businessModel.b2b2c.price')}</p>
                <p className="text-sm text-muted-foreground">{t('investorInfo.businessModel.b2b2c.period')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 text-white border-none shadow-2xl">
          <CardContent className="py-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              {t('investorInfo.cta.title')}
            </h2>
            <p className="text-xl mb-8 text-white/95 max-w-2xl mx-auto">
              {t('investorInfo.cta.subtitle')}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                size="lg"
                className="gap-2 bg-white text-emerald-700 hover:bg-gray-100 font-semibold shadow-lg"
                onClick={() => window.location.href = "mailto:info@faberwork.com?subject=Schedule a Demo - SymBIoT"}
              >
                {t('investorInfo.cta.scheduleDemo')} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/15 text-white border-white/40 hover:bg-white/25 font-semibold shadow-lg"
                onClick={() => window.location.href = "mailto:info@faberwork.com?subject=Investment Inquiry - SymBIoT"}
              >
                {t('investorInfo.cta.contactInvestment')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default InvestorInfo;
