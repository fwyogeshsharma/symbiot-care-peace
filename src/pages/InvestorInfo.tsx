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

const InvestorInfo = () => {
  const navigate = useNavigate();

  const problems = [
    {
      icon: AlertTriangle,
      title: "Delayed Emergency Response",
      description: "Falls and medical emergencies often go undetected for hours, leading to worse outcomes and higher healthcare costs."
    },
    {
      icon: DollarSign,
      title: "Escalating Care Costs",
      description: "Nursing home care averages $100,000+/year. Families struggle to afford quality care while seniors lose independence."
    },
    {
      icon: Clock,
      title: "Caregiver Burnout",
      description: "47 million family caregivers face constant stress, unable to monitor loved ones remotely, leading to work disruption and health issues."
    },
    {
      icon: Users,
      title: "Fragmented Information",
      description: "Healthcare providers, family members, and caregivers lack a unified view of the senior's health and activity patterns."
    }
  ];

  const currentSolutions = [
    {
      solution: "Medical Alert Systems",
      limitations: [
        "Require manual activation (seniors often can't press button during falls)",
        "No predictive analytics or trend detection",
        "Limited to emergency response only",
        "No activity or vital monitoring"
      ]
    },
    {
      solution: "Home Health Aides",
      limitations: [
        "Cost $25-50/hour, $200,000+/year for 24/7 care",
        "Inconsistent care quality and high turnover",
        "No coverage during off-hours",
        "Limited to physical presence, no data insights"
      ]
    },
    {
      solution: "Nursing Homes",
      limitations: [
        "Average $100,000+/year in costs",
        "Loss of independence and familiar environment",
        "Increased depression and cognitive decline",
        "Waitlists and availability issues"
      ]
    },
    {
      solution: "Basic Fitness Trackers",
      limitations: [
        "Consumer-grade, not healthcare certified",
        "No HIPAA compliance or data sharing controls",
        "Limited alert capabilities",
        "No integration with caregiving workflows"
      ]
    }
  ];

  const ourSolution = [
    {
      icon: Heart,
      title: "Continuous Vital Monitoring",
      description: "24/7 tracking of heart rate, blood pressure, oxygen levels, and temperature with AI-powered anomaly detection.",
      improvement: "Catches health issues hours or days before they become emergencies"
    },
    {
      icon: Activity,
      title: "Intelligent Activity Recognition",
      description: "AI analyzes movement patterns, detects falls automatically, identifies behavioral changes that signal cognitive decline.",
      improvement: "No button pressing required - system detects problems automatically"
    },
    {
      icon: MapPin,
      title: "Indoor + Outdoor Tracking",
      description: "GPS tracking outdoors with custom floor plan mapping indoors. Geofencing alerts for wandering or unsafe zones.",
      improvement: "Complete location awareness unlike GPS-only or indoor-only systems"
    },
    {
      icon: Bell,
      title: "Smart Predictive Alerts",
      description: "AI learns normal patterns and alerts caregivers to deviations before they become critical. Reduces false alarms by 70%.",
      improvement: "Proactive intervention vs reactive emergency response"
    },
    {
      icon: BarChart3,
      title: "ILQ Analytics & Reporting",
      description: "Independent Living Quotient scores track trends over time. Comprehensive reports for healthcare providers and family.",
      improvement: "Data-driven care decisions vs gut feeling and anecdotal evidence"
    },
    {
      icon: Users,
      title: "Unified Care Coordination",
      description: "Role-based platform connecting seniors, family, caregivers, and doctors with secure data sharing and communication.",
      improvement: "Everyone on the same page vs fragmented phone calls and texts"
    }
  ];

  const techEnablers = [
    {
      icon: Brain,
      title: "AI & Machine Learning",
      description: "Modern AI can now recognize patterns, predict health events, and reduce false alarms - technology that didn't exist 5 years ago at this price point and accuracy."
    },
    {
      icon: Wifi,
      title: "Affordable IoT Sensors",
      description: "Medical-grade sensors are now 90% cheaper than in 2015. Wearables and home sensors can continuously monitor vitals at consumer-friendly prices."
    },
    {
      icon: Network,
      title: "5G & Edge Computing",
      description: "Real-time data processing with millisecond latency enables instant fall detection and emergency alerts impossible with older networks."
    },
    {
      icon: Shield,
      title: "Cloud Infrastructure",
      description: "HIPAA-compliant cloud platforms like Supabase enable secure, scalable data storage and real-time synchronization across devices at fraction of historical costs."
    }
  ];

  const benefits = [
    {
      category: "Cost Savings",
      icon: DollarSign,
      items: [
        {
          title: "85% Lower Than Nursing Homes",
          description: "SymBIoT subscription at $99-299/month vs $8,000+/month for nursing home care"
        },
        {
          title: "Reduce Hospital Readmissions",
          description: "Early detection prevents 40% of emergency room visits, saving $2,000-10,000 per incident"
        },
        {
          title: "Optimize Caregiver Time",
          description: "Professional caregivers visit only when needed vs scheduled visits, reducing costs by 50%"
        },
        {
          title: "Insurance Premium Reductions",
          description: "Proactive monitoring can qualify families for lower long-term care insurance premiums"
        }
      ]
    },
    {
      category: "Quality of Life",
      icon: Heart,
      items: [
        {
          title: "Age in Place Safely",
          description: "Seniors maintain independence in their own homes, proven to improve mental health and longevity"
        },
        {
          title: "Peace of Mind for Families",
          description: "Family caregivers sleep better knowing they'll be alerted immediately to any issues, reducing stress and burnout"
        },
        {
          title: "Faster Emergency Response",
          description: "Automatic fall detection and alerts reduce response time from hours to minutes, preventing complications"
        },
        {
          title: "Preserved Dignity & Autonomy",
          description: "Seniors live independently with invisible safety net vs constant supervision or institutional care"
        }
      ]
    }
  ];

  const marketStats = [
    {
      stat: "54M+",
      label: "Adults 65+ in US",
      context: "Growing by 10,000/day through 2030"
    },
    {
      stat: "$460B",
      label: "Elder Care Market",
      context: "8.5% CAGR through 2030"
    },
    {
      stat: "90%",
      label: "Want to Age at Home",
      context: "Current solutions too expensive or inadequate"
    },
    {
      stat: "47M",
      label: "Family Caregivers",
      context: "Lost productivity costs economy $500B/year"
    }
  ];

  const whyNow = [
    {
      title: "Technology Convergence",
      description: "AI, IoT, 5G, and cloud infrastructure have matured to the point where comprehensive remote monitoring is both technically feasible and economically viable for the mass market."
    },
    {
      title: "Demographic Crisis",
      description: "Baby boomers entering elder care years while younger generations have fewer children and live farther apart - traditional family caregiving model is breaking down."
    },
    {
      title: "Regulatory Momentum",
      description: "Medicare and insurance companies increasingly cover remote patient monitoring. Recent CMS reimbursement codes make our business model more attractive to healthcare providers."
    },
    {
      title: "COVID-19 Acceleration",
      description: "Pandemic normalized telehealth and remote monitoring. Families now actively seek tech solutions to stay connected with elderly loved ones."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50 dark:from-blue-950 dark:via-blue-900 dark:to-blue-950">
      {/* Navigation */}
      <nav className="border-b bg-white/95 dark:bg-blue-950/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-blue-950/80 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">SymBIoT</span>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              Home
            </Button>
            <Button variant="ghost" onClick={() => navigate("/pricing")}>
              Pricing
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block mb-4 px-4 py-2 bg-primary text-white rounded-full shadow-md">
            <span className="font-semibold">Investor Overview</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
            Transforming Elder Care with <span className="text-primary">AI & IoT</span>
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
            A comprehensive platform that enables seniors to age safely at home while reducing costs by 85%
            compared to nursing homes - powered by breakthrough AI and IoT technology.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" className="gap-2" onClick={() => window.location.href = "mailto:info@faberwork.com?subject=Schedule a Demo - SymBIoT"}>
              Schedule a Demo <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              const problemSection = document.getElementById('problem');
              problemSection?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Read Full Story
            </Button>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section id="problem" className="container mx-auto px-4 py-16 bg-white dark:bg-blue-900/30 rounded-3xl my-16 shadow-lg border border-red-100 dark:border-red-900/30">
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-2 bg-red-600 text-white rounded-full">
            <span className="font-semibold">The Problem</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            The Elder Care Crisis
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            As our population ages, families face impossible choices between affordability, safety, and independence.
            The current system is broken.
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
            <span className="font-semibold">Current Solutions</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Existing Solutions Fall Short
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            The market has tried to address these problems, but existing solutions are either too expensive,
            too limited, or compromise on independence and quality of life.
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
            <span className="font-semibold">The SymBIoT Solution</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            A Better Way to Care
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            SymBIoT combines AI-powered analytics, IoT sensors, and intelligent automation to provide
            comprehensive, affordable monitoring that keeps seniors safe at home.
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
              Technology Innovation
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How AI & IoT Make This Possible Now
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            Recent breakthroughs in artificial intelligence and Internet of Things technology enable
            comprehensive elder care monitoring at a price point that wasn't possible even 3 years ago.
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
            <span className="font-semibold">The Impact</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Cost Savings & Better Living
          </h2>
          <p className="text-white/95 max-w-3xl mx-auto text-lg">
            SymBIoT delivers measurable financial benefits while dramatically improving quality of life
            for seniors and peace of mind for families.
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
          <p className="text-4xl font-bold mb-2 text-white">$80,000+ Saved Per Year</p>
          <p className="text-white/95 text-lg">
            Average family saves by choosing SymBIoT ($299/month) over nursing home care ($8,000+/month)
            while maintaining better quality of life
          </p>
        </div>
      </section>

      {/* Market Opportunity */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-2 bg-primary text-white rounded-full">
            <span className="font-semibold">Market Opportunity</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Massive Market Opportunity</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Aging demographics and technology adoption create a perfect storm for disruption
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
            <span className="font-semibold">Perfect Timing</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Why Now?</h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            Multiple converging trends create an unprecedented opportunity for SymBIoT
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
              <span className="font-semibold">Business Model</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Scalable SaaS Model</h2>
            <p className="text-muted-foreground text-lg">
              Multiple revenue streams with strong unit economics
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center hover:shadow-lg transition-shadow border-emerald-200 dark:border-emerald-800 bg-white dark:bg-blue-950 shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">B2C</CardTitle>
                <CardDescription>Individual & Family Plans</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary mb-2">$99-299</p>
                <p className="text-sm text-muted-foreground">per month</p>
              </CardContent>
            </Card>
            <Card className="text-center border-primary border-2 hover:shadow-xl transition-shadow relative bg-white dark:bg-blue-950 shadow-md">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-semibold">
                Primary Focus
              </div>
              <CardHeader className="pt-8">
                <CardTitle className="text-2xl text-foreground">B2B</CardTitle>
                <CardDescription>Assisted Living & Healthcare</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary mb-2">$49-79</p>
                <p className="text-sm text-muted-foreground">per resident/month</p>
              </CardContent>
            </Card>
            <Card className="text-center hover:shadow-lg transition-shadow border-emerald-200 dark:border-emerald-800 bg-white dark:bg-blue-950 shadow-md">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">B2B2C</CardTitle>
                <CardDescription>Insurance & Employers</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary mb-2">$29-49</p>
                <p className="text-sm text-muted-foreground">per member/month</p>
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
              Join Us in Transforming Elder Care
            </h2>
            <p className="text-xl mb-8 text-white/95 max-w-2xl mx-auto">
              SymBIoT is positioned at the intersection of massive demographic trends and breakthrough
              technology. Let's discuss how you can be part of this transformation.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                size="lg"
                className="gap-2 bg-white text-emerald-700 hover:bg-gray-100 font-semibold shadow-lg"
                onClick={() => window.location.href = "mailto:info@faberwork.com?subject=Schedule a Demo - SymBIoT"}
              >
                Schedule a Demo <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/15 text-white border-white/40 hover:bg-white/25 font-semibold shadow-lg"
                onClick={() => window.location.href = "mailto:info@faberwork.com?subject=Investment Inquiry - SymBIoT"}
              >
                Contact Investment Team
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-white dark:bg-blue-950">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 SymBIoT. All rights reserved. Peace of Mind for Your Loved Ones.</p>
        </div>
      </footer>
    </div>
  );
};

export default InvestorInfo;
