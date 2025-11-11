import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Activity, Zap } from "lucide-react";

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      name: "Free Trial",
      description: "Perfect for trying out our service",
      price: 0,
      yearlyPrice: 0,
      duration: "14 days",
      devices: "5 devices",
      features: [
        "14-day free trial",
        "Up to 5 devices",
        "Real-time monitoring",
        "Basic alerts",
        "Activity tracking",
        "Email support"
      ],
      highlighted: false,
      badge: "Trial"
    },
    {
      name: "Basic",
      description: "Great for small families",
      price: 10,
      yearlyPrice: calculateYearlyPrice(10),
      duration: billingCycle === "monthly" ? "per month" : "per year",
      devices: "5 devices",
      features: [
        "Up to 5 devices",
        "Real-time monitoring",
        "Advanced alerts",
        "Activity tracking",
        "Health insights",
        "Priority email support",
        "Data export"
      ],
      highlighted: false,
      badge: null
    },
    {
      name: "Premium",
      description: "Best for larger families and care facilities",
      price: 25,
      yearlyPrice: calculateYearlyPrice(25),
      duration: billingCycle === "monthly" ? "per month" : "per year",
      devices: "Unlimited devices",
      features: [
        "Unlimited devices",
        "Real-time monitoring",
        "Advanced alerts",
        "Activity tracking",
        "Health insights",
        "24/7 priority support",
        "Data export",
        "Custom integrations",
        "API access",
        "Dedicated account manager"
      ],
      highlighted: true,
      badge: "Most Popular"
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
              <h1 className="text-xl font-bold">SymBIoT</h1>
            </div>
            <Button onClick={() => navigate("/")} variant="outline">
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Content starts below fixed nav */}
      <main className="mt-[73px] pt-12">
        {/* Hero Section */}
        <section className="py-12 sm:py-20 px-4 text-center">
          <div className="container mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Choose the perfect plan for your family care needs
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className={`text-sm sm:text-base font-medium ${billingCycle === "monthly" ? "text-primary" : "text-muted-foreground"}`}>
                Monthly
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
                Yearly
              </span>
            </div>
            {billingCycle === "yearly" && (
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="bg-secondary/20 text-secondary">
                  <Zap className="w-3 h-3 mr-1" />
                  Save 5% with yearly billing
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
                          ${plan.price}/month billed annually
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
                      {plan.price === 0 ? "Start Free Trial" : "Get Started"}
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
              All Plans Include
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Real-time Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Track vitals 24/7
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Activity Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor daily activities
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Smart Alerts</h3>
                <p className="text-sm text-muted-foreground">
                  Instant notifications
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">
                  HIPAA compliant
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 sm:py-20 px-4">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-lg">Can I switch plans later?</h3>
                <p className="text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg">What happens after my free trial ends?</h3>
                <p className="text-muted-foreground">
                  After your 14-day trial, you can choose to continue with a paid plan. If you don't select a plan, your account will be paused until you choose one.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg">How does yearly billing work?</h3>
                <p className="text-muted-foreground">
                  With yearly billing, you pay for 12 months upfront and save 5% compared to monthly billing. The full amount is charged once per year.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-lg">What counts as a device?</h3>
                <p className="text-muted-foreground">
                  A device is any wearable or sensor connected to the SymBIoT platform for monitoring. This includes smartwatches, fitness trackers, and dedicated health monitors.
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
            © 2025 SymBIoT. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
