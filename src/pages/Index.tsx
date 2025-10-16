import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Activity, Heart, Shield, Bell, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-healthcare.jpg";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Toolbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">SymBIoT</h1>
                <p className="text-xs text-muted-foreground">Peace of Mind</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!user && (
                <Button variant="outline" onClick={() => navigate("/auth")}>
                  Login
                </Button>
              )}
              <Button onClick={handleGetStarted}>{user ? "Go to Dashboard" : "Get Started"}</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden mt-[73px]">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(0, 149, 219, 0.9), rgba(0, 188, 212, 0.85)), url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <div className="relative z-10 container mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-3xl">
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Peace of Mind for Your Loved Ones
            </h1>
            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Advanced IoT health monitoring that keeps families connected and elderly loved ones safe, independent, and
              thriving at home.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" variant="secondary" className="shadow-lg" onClick={handleGetStarted}>
                {user ? "Go to Dashboard" : "Start Free Trial"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Comprehensive Care, Simplified</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Monitor health, activity, and environment with AI-powered insights that alert you to what matters most.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-8 hover:shadow-healthcare transition-all duration-300">
              <div className="w-12 h-12 rounded-xl gradient-healthcare flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-Time Vitals</h3>
              <p className="text-muted-foreground">
                Monitor heart rate, blood pressure, oxygen levels, and more with wearable and non-invasive sensors.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-healthcare transition-all duration-300">
              <div className="w-12 h-12 rounded-xl gradient-wellness flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Activity Tracking</h3>
              <p className="text-muted-foreground">
                Automatic detection of daily routines, movement patterns, and activity levels to spot changes early.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-healthcare transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Alerts</h3>
              <p className="text-muted-foreground">
                Intelligent notifications for falls, missed medications, irregular vitals, or unusual behavior patterns.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-healthcare transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Privacy First</h3>
              <p className="text-muted-foreground">
                HIPAA and GDPR compliant with encrypted data storage and role-based access control for family members.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-healthcare transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Predictive Analytics</h3>
              <p className="text-muted-foreground">
                AI-powered insights that predict potential health issues before they become emergencies.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-healthcare transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-warning flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Family Collaboration</h3>
              <p className="text-muted-foreground">
                Coordinate care with family members, caregivers, and healthcare providers on one secure platform.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 gradient-healthcare">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Ready to Bring Peace of Mind Home?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of families who trust SymBIoT to keep their loved ones safe and independent.
          </p>
          <Button size="lg" variant="secondary" className="shadow-lg" onClick={handleGetStarted}>
            {user ? "Go to Dashboard" : "Get Started Today"}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 SymBIoT. All rights reserved. Version: 1.0.2</p>
          <p className="mt-2">Bringing families and technology together for better care.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
