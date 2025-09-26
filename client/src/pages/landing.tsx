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

// Form schemas for different steps
const emailSignupSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const otpVerificationSchema = z.object({
  email: z.string().email(),
  token: z.string().regex(/^[0-9]{6}$/, "Verification code must be exactly 6 digits"),
});

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

const accountSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  displayName: z.string().min(1, "Display name is required").max(50, "Display name must be less than 50 characters").optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  location: z.string().max(100, "Location must be less than 100 characters").optional(),
  gender: z.enum(["male", "female", "non-binary", "prefer-not-to-say"]).optional(),
});

type EmailSignupForm = z.infer<typeof emailSignupSchema>;
type OTPVerificationForm = z.infer<typeof otpVerificationSchema>;
type ProfileForm = z.infer<typeof profileSchema>;
type AccountForm = z.infer<typeof accountSchema>;

type SignupStep = 'options' | 'email' | 'verification' | 'profile' | 'account';

export default function Landing() {
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>('options');
  const [userEmail, setUserEmail] = useState('');
  const [verificationSession, setVerificationSession] = useState('');
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  // Form instances for each step
  const emailForm = useForm<EmailSignupForm>({
    resolver: zodResolver(emailSignupSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<OTPVerificationForm>({
    resolver: zodResolver(otpVerificationSchema),
    defaultValues: { email: "", token: "" },
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { 
      firstName: "", 
      lastName: ""
    },
  });

  const accountForm = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: { 
      username: "",
      displayName: "",
      bio: "",
      location: ""
    },
  });

  // Step 1: Email signup mutation
  const emailSignupMutation = useMutation({
    mutationFn: async (data: EmailSignupForm) => {
      const response = await apiRequest("POST", "/api/auth/signup-email", data);
      return response.json();
    },
    onSuccess: (response: any) => {
      const email = emailForm.getValues().email;
      setUserEmail(email);
      otpForm.setValue('email', email);
      setSignupStep('verification');
      toast({
        title: "Verification code sent!",
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

  // Step 2: Email verification mutation
  const verifyEmailMutation = useMutation({
    mutationFn: async (data: OTPVerificationForm) => {
      const response = await apiRequest("POST", "/api/auth/verify-email", data);
      return response.json();
    },
    onSuccess: (response: any) => {
      setVerificationSession(response.verificationSession);
      setSignupStep('profile');
      toast({
        title: "Email verified!",
        description: response.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Step 3: Profile completion mutation
  const completeProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await apiRequest("POST", "/api/auth/complete-profile", data);
      return response.json();
    },
    onSuccess: (response: any) => {
      setSignupStep('account');
      toast({
        title: "Profile completed!",
        description: response.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Profile completion failed",
        description: error.message || "Failed to complete profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Step 4: Account completion mutation
  const completeAccountMutation = useMutation({
    mutationFn: async (data: AccountForm) => {
      const response = await apiRequest("POST", "/api/auth/complete-account", data);
      return response.json();
    },
    onSuccess: (response: any) => {
      toast({
        title: "Account created!",
        description: "Welcome to Hiddo! Your account has been created successfully.",
      });
      resetModal();
      // Redirect to app or refresh page
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Account creation failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAuth = (provider: 'google' | 'email') => {
    if (authMode === 'login') {
      // For login, use Replit auth
      window.location.href = '/api/login';
    } else if (provider === 'google') {
      // For Google signup, use Replit auth
      window.location.href = '/api/login';
    }
    // For email signup, the modal will handle the form flow
  };

  // Submit handlers for each step
  const onEmailSubmit = (data: EmailSignupForm) => {
    emailSignupMutation.mutate(data);
  };

  const onOTPSubmit = (data: OTPVerificationForm) => {
    verifyEmailMutation.mutate(data);
  };

  const onProfileSubmit = (data: ProfileForm) => {
    completeProfileMutation.mutate({
      firstName: data.firstName,
      lastName: data.lastName,
      verificationSession,
    } as any);
  };

  const onAccountSubmit = (data: AccountForm) => {
    completeAccountMutation.mutate({
      username: data.username,
      displayName: data.displayName,
      bio: data.bio,
      location: data.location,
      gender: data.gender,
      verificationSession,
    } as any);
  };

  const resetModal = () => {
    setAuthModal(false);
    setSignupStep('options');
    setUserEmail('');
    setVerificationSession('');
    emailForm.reset();
    otpForm.reset();
    profileForm.reset();
    accountForm.reset();
    setAuthMode('login');
  };

  const goBackStep = () => {
    switch (signupStep) {
      case 'email':
        setSignupStep('options');
        break;
      case 'verification':
        setSignupStep('email');
        break;
      case 'profile':
        setSignupStep('verification');
        break;
      case 'account':
        setSignupStep('profile');
        break;
    }
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
              {authMode === 'login' ? 'Welcome Back' : 
               signupStep === 'options' ? 'Join Hiddo' :
               signupStep === 'email' ? 'Sign up with Email' :
               signupStep === 'verification' ? 'Verify Email' :
               signupStep === 'profile' ? 'Complete Profile' :
               'Create Account'}
            </DialogTitle>
            <p className="text-muted-foreground">
              {authMode === 'login' 
                ? 'Sign in to continue your exploration'
                : signupStep === 'options' ? 'Choose how you\'d like to get started'
                : signupStep === 'email' ? 'Enter your email to get started'
                : signupStep === 'verification' ? `We sent a verification code to ${userEmail}`
                : signupStep === 'profile' ? 'Tell us a bit about yourself'
                : 'Almost there! Choose your username'
              }
            </p>
          </DialogHeader>
          
          {authMode === 'login' ? (
            // Login form
            <div className="space-y-4">
              <Button
                className="w-full"
                onClick={() => handleAuth('email')}
                data-testid="button-login-replit"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Continue with Replit
              </Button>
              
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account? 
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-medium"
                  onClick={() => {
                    setAuthMode('signup');
                    setSignupStep('options');
                  }}
                  data-testid="button-toggle-signup"
                >
                  Sign up
                </Button>
              </p>
            </div>
          ) : (
            // Multi-step signup
            <div className="space-y-4">
              {signupStep === 'options' && (
                <div className="space-y-4">
                  <Button
                    className="w-full"
                    onClick={() => handleAuth('google')}
                    data-testid="button-signup-google"
                  >
                    <i className="fab fa-google mr-2"></i>
                    Sign up with Google
                  </Button>
                  
                  <div className="flex items-center">
                    <Separator className="flex-1" />
                    <span className="px-4 text-sm text-muted-foreground">or</span>
                    <Separator className="flex-1" />
                  </div>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSignupStep('email')}
                    data-testid="button-signup-email"
                  >
                    <i className="fas fa-envelope mr-2"></i>
                    Sign up with Email
                  </Button>
                  
                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account? 
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-medium"
                      onClick={() => {
                        setAuthMode('login');
                        setSignupStep('options');
                      }}
                      data-testid="button-toggle-login"
                    >
                      Log in
                    </Button>
                  </p>
                </div>
              )}

              {signupStep === 'email' && (
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Enter your email"
                              data-testid="input-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={emailSignupMutation.isPending}
                      data-testid="button-send-verification"
                    >
                      {emailSignupMutation.isPending ? "Sending..." : "Send Verification Code"}
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={goBackStep}
                      data-testid="button-back-to-options"
                    >
                      Back
                    </Button>
                  </form>
                </Form>
              )}

              {signupStep === 'verification' && (
                <div className="space-y-4">
                  <Form {...otpForm}>
                    <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-4">
                      <FormField
                        control={otpForm.control}
                        name="token"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Verification Code</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter the code from your email"
                                data-testid="input-verification-code"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={verifyEmailMutation.isPending}
                        data-testid="button-verify-email"
                      >
                        {verifyEmailMutation.isPending ? "Verifying..." : "Verify Email"}
                      </Button>
                    </form>
                  </Form>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={goBackStep}
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                </div>
              )}

              {signupStep === 'profile' && (
                <div className="space-y-4">
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="First name"
                                  data-testid="input-firstname"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Last name"
                                  data-testid="input-lastname"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={completeProfileMutation.isPending}
                        data-testid="button-complete-profile"
                      >
                        {completeProfileMutation.isPending ? "Saving..." : "Continue"}
                      </Button>
                    </form>
                  </Form>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={goBackStep}
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                </div>
              )}

              {signupStep === 'account' && (
                <div className="space-y-4">
                  <Form {...accountForm}>
                    <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
                      <FormField
                        control={accountForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Choose a username"
                                data-testid="input-username"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={accountForm.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Name (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="How should others see your name?"
                                data-testid="input-display-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={accountForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Tell us about yourself"
                                data-testid="input-bio"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={accountForm.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-gender">
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="non-binary">Non-binary</SelectItem>
                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={completeAccountMutation.isPending}
                        data-testid="button-create-account"
                      >
                        {completeAccountMutation.isPending ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={goBackStep}
                    data-testid="button-back"
                  >
                    Back
                  </Button>
                </div>
              )}
              
              <p className="text-center text-sm text-muted-foreground">
                Already have an account? 
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-medium"
                  onClick={() => setAuthMode('login')}
                  data-testid="button-toggle-login"
                >
                  Sign in
                </Button>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
