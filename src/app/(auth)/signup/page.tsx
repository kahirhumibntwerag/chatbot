'use client';
import {useState} from 'react';
import React from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/dist/client/link";
import { Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/apiConfig"; // added


const Signup = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/signup`, { // changed
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, username, password }),
        credentials: "include", // optional if backend sets cookies
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError("Username already exists. Please choose a different username.");
        } else {
          setError(data.message || "Signup failed. Please try again.");
        }
        return;
      }

      setSuccess("Signup successful!");
      router.push('/login');
    } catch (error) {
      setError("Signup failed. Please try again.");
      console.error("Error during signup:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen w-full bg-neon"
      style={{ ["--neon-accent" as any]: "rgb(124 91 242)", ["--ring" as any]: "rgb(124 91 242)" }}
    >
      <Card className="w-full max-w-md p-6 bg-white/10 backdrop-blur-md border border-transparent shadow-xl neon-border-animated rounded-xl">
        <CardHeader>
          <CardTitle>Signup</CardTitle>
          <CardDescription>please enter your details</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Label htmlFor="username">Username</Label>
            <Input id="username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)} />
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input id="confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <div className="flex items-center space-x-4 mt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Signing up...' : 'Sign up'}
              </Button>
              <Link className="hover:underline" href="/login">
                already registered?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {success && <p className="text-green-500 mt-4">{success}</p>}
    </div>
  );
};

export default Signup;
