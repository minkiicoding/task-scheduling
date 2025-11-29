import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, User, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onSignIn: (employeeCodeOrEmail: string, password: string) => Promise<{ error?: any }>;
}

export const LoginScreen = ({ onSignIn }: LoginScreenProps) => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const result = await onSignIn(employeeCode, password);
      if (result?.error) {
        setError('Invalid employee code or password');
      }
    } catch (err) {
      setError('Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-animated-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10 space-y-0">
        {/* System Title Header */}
        <div className="bg-gradient-primary rounded-t-2xl px-6 py-4 shadow-lg-custom">
          <h1 className="text-white text-xl font-bold text-center tracking-wide">
            Audit Task Scheduling System
          </h1>
        </div>

        <Card className="shadow-xl-custom glass backdrop-blur-2xl border-white/30 dark:border-white/10 rounded-t-none animate-scale-in border-t-0">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-primary p-4 rounded-2xl shadow-lg-custom relative hover-lift">
                <Lock className="w-10 h-10 text-white" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full animate-ping"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full"></div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Audit Task Scheduling
            </CardTitle>
            <CardDescription className="text-base flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Sign in with your employee code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="animate-fade-in shadow-md-custom">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="employeeCode" className="text-sm font-medium">Employee Code / Username</Label>
              <div className="relative group">
                <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-smooth" />
                <Input
                  id="employeeCode"
                  type="text"
                  className="pl-11 h-12 transition-smooth focus:shadow-md-custom"
                  placeholder="Enter your employee code, email, or 'admin'"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-smooth" />
                <Input
                  id="password"
                  type="password"
                  className="pl-11 h-12 transition-smooth focus:shadow-md-custom"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
            </div>

            <Button
              onClick={handleLogin}
              className="w-full h-12 bg-gradient-primary hover:shadow-lg-custom transition-all duration-300 text-base font-medium relative overflow-hidden group"
              disabled={isLoading}
            >
              <span className="relative z-10">
                {isLoading ? (
                  <>
                    <div className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </>
                ) : 'Sign In'}
              </span>
              <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-6 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
              Use your employee code, email, or 'admin' username to sign in
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
