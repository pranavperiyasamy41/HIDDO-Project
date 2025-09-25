import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/theme-provider";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form schemas
const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Landing() {
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [emailSent, setEmailSent] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      const response = await apiRequest("POST", "/api/auth/signup-email", data);
      return response.json();
    },
    onSuccess: (response: any) => {
      setEmailSent(true);
      toast({
        title: "Verification email sent!",
        description: response.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Signup failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAuth = (provider: 'google' | 'email') => {
    if (provider === 'google') {
      window.location.href = '/api/login';
    } else if (authMode === 'login') {
      // For login, still use Replit auth for now
      window.location.href = '/api/login';
    }
  };

  const onSubmit = (data: SignupForm) => {
    if (authMode === 'signup') {
      signupMutation.mutate(data);
    }
  };

  const resetModal = () => {
    setAuthModal(false);
    setEmailSent(false);
    form.reset();
    setAuthMode('login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative z-10 px-4 py-6">
        <nav className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-compass text-primary-foreground text-xl"></i>
            </div>
            <span className="text-2xl font-bold text-primary">Hiddo</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
              className="p-2"
            >
              {theme === 'dark' ? (
                <i className="fas fa-sun text-lg"></i>
              ) : (
                <i className="fas fa-moon text-lg"></i>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAuthMode('login');
                setAuthModal(true);
              }}
              data-testid="button-login"
            >
              Log In
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setAuthMode('signup');
                setAuthModal(true);
              }}
              data-testid="button-signup"
            >
              Signup
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-primary/10 to-chart-2/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                Turn Moments Into Memories
Hiddo
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Capture moments, share journeys, explore together
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthModal(true);
                  }}
                  data-testid="button-get-started"
                >
                  Get Started
                </Button>
              </div>
            </div>
            
            {/* Sample Mobile Interface */}
            <div className="relative mx-auto">
              <Card className="w-80 h-[600px] rounded-[3rem] border-8 border-muted p-6 shadow-2xl">
                <CardContent className="p-0 h-full">
                  {/* Sample Stories */}
                  <div className="flex space-x-3 mb-4 overflow-x-auto">
                    <div className="flex-shrink-0 text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-destructive via-chart-3 to-chart-5 p-1">
                        <div className="w-full h-full bg-card rounded-full flex items-center justify-center">
                          <i className="fas fa-plus text-muted-foreground"></i>
                        </div>
                      </div>
                      <span className="text-xs mt-1 block">Your Story</span>
                    </div>
                    <div className="flex-shrink-0 text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-destructive via-chart-3 to-chart-5 p-1">
                        <div className="w-full h-full bg-muted rounded-full"></div>
                      </div>
                      <span className="text-xs mt-1 block">Sarah</span>
                    </div>
                    <div className="flex-shrink-0 text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-destructive via-chart-3 to-chart-5 p-1">
                        <div className="w-full h-full bg-muted rounded-full"></div>
                      </div>
                      <span className="text-xs mt-1 block">Mike</span>
                    </div>
                  </div>
                  
                  {/* Sample Post */}
                  <Card className="overflow-hidden shadow-sm">
                    <div className="p-4 flex items-center space-x-3">
                      <div className="w-12 h-12 bg-muted rounded-full"></div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">emma_explores</h4>
                        <p className="text-xs text-muted-foreground flex items-center">
                          <i className="fas fa-map-marker-alt mr-1"></i>
                          Central Park, NYC
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <i className="fas fa-ellipsis-h"></i>
                      </Button>
                    </div>
                    
                    <div className="w-full h-48 bg-gradient-to-br from-chart-2 to-primary"></div>
                    
                    <div className="p-4">
                      <div className="flex items-center space-x-4 mb-3">
                        <Button variant="ghost" size="sm" className="text-destructive p-0">
                          <i className="fas fa-heart text-lg mr-1"></i>
                          <span className="text-sm font-medium">124</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="p-0">
                          <i className="fas fa-comment text-lg mr-1"></i>
                          <span className="text-sm">12</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="p-0">
                          <i className="fas fa-share text-lg"></i>
                        </Button>
                        <Button variant="ghost" size="sm" className="ml-auto p-0">
                          <i className="fas fa-bookmark text-lg"></i>
                        </Button>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold">emma_explores</span> Morning magic in Central Park ✨ There's something special about watching the city wake up...
                      </p>
                    </div>
                  </Card>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Everything You Need to Explore</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-map-marked-alt text-2xl text-primary"></i>
              </div>
              <h3 className="text-xl font-semibold mb-4">Interactive Maps</h3>
              <p className="text-muted-foreground">Discover posts and stories on an interactive map. Find hidden gems and popular spots near you.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-chart-2/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-users text-2xl text-chart-2"></i>
              </div>
              <h3 className="text-xl font-semibold mb-4">Connect with Explorers</h3>
              <p className="text-muted-foreground">Find and connect with fellow adventurers. Share experiences and discover through your network.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-clock text-2xl text-destructive"></i>
              </div>
              <h3 className="text-xl font-semibold mb-4">Stories & Moments</h3>
              <p className="text-muted-foreground">Share temporary moments that disappear after 24 hours. Perfect for spontaneous discoveries.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Authentication Modal */}
      <Dialog open={authModal} onOpenChange={setAuthModal}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-auth">
          <DialogHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto">
              <i className="fas fa-compass text-primary-foreground text-2xl"></i>
            </div>
            <DialogTitle className="text-2xl font-bold">
              {authMode === 'login' ? 'Welcome Back' : 'Join Hiddo'}
            </DialogTitle>
            <p className="text-muted-foreground">
              {authMode === 'login' 
                ? 'Sign in to continue your exploration'
                : 'Start discovering amazing places'
              }
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            <Button
              className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => handleAuth('google')}
              data-testid="button-google-signin"
            >
              <i className="fab fa-google mr-2"></i>
              {authMode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
            </Button>
            
            <div className="relative">
              <Separator className="my-4" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="px-4 bg-background text-muted-foreground text-sm">or</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {authMode === 'signup' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      type="text" 
                      placeholder="First name" 
                      data-testid="input-firstname"
                    />
                    <Input 
                      type="text" 
                      placeholder="Last name"
                      data-testid="input-lastname" 
                    />
                  </div>
                  <Input 
                    type="text" 
                    placeholder="Username"
                    data-testid="input-username" 
                  />
                  <Select>
                    <SelectTrigger data-testid="select-gender">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              
              <Input 
                type="email" 
                placeholder="Email address"
                data-testid="input-email" 
              />
              <Input 
                type="password" 
                placeholder="Password"
                data-testid="input-password" 
              />
              
              <Button 
                className="w-full"
                onClick={() => handleAuth('email')}
                data-testid="button-email-auth"
              >
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
              
              <p className="text-center text-sm text-muted-foreground">
                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-medium"
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  data-testid="button-toggle-auth"
                >
                  {authMode === 'login' ? 'Sign up' : 'Sign in'}
                </Button>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
