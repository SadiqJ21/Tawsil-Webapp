import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { createClient } from '../utils/supabase/client';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onRegisterSuccess: () => void;
}

export function RegisterForm({ onSwitchToLogin, onRegisterSuccess }: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // handle form submission to register a new user
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // client-side password validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // call edge function /server/signup (protected by anon key) to create user
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email, password, name }),
        }
      );

      const data = await response.json();

      // handle server-side errors from the function
      if (!response.ok) {
        console.log(`Error during registration: ${data.error}`);
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      // on success, try to sign the user in immediately
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // if auto-login fails, show a green success hint then switch to login screen
      if (loginError) {
        console.log(`Error during auto-login after registration: ${loginError.message}`);
        setError('Account created! Please login.');
        setLoading(false);
        setTimeout(() => onSwitchToLogin(), 2000);
      } else {
        onRegisterSuccess();
      }
    } catch (err) {
      console.log(`Unexpected error during registration: ${err}`);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="mb-6 text-center">Create Account</h2>

      <form onSubmit={handleRegister} className="space-y-4">
        {/* status banner (red for errors, green when account created but login failed) */}
        {error && (
          <div
            className={`p-3 rounded ${
              error.includes('created')
                ? 'bg-green-50 border border-green-200 text-green-600'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}
          >
            {error}
          </div>
        )}

        {/* name */}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Jone"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* password */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="*********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* confirm password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="*********"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {/* submit */}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </Button>

        {/* switch to login */}
        <p className="text-center text-gray-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:underline"
          >
            Sign in
          </button>
        </p>
      </form>
    </div>
  );
}