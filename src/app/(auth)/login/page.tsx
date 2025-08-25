"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import Link from "next/link";
import { Loader2 } from "lucide-react";

const Login = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    // Exclude Chrome/Firefox on iOS which handle fetch cookies better
    const isiOSDevice = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari\//.test(ua) && !/CriOS\//.test(ua) && !/FxiOS\//.test(ua);
    return isiOSDevice && isSafari;
  }, []);

  React.useEffect(() => {
    try {
      const err = new URLSearchParams(window.location.search).get("error");
      if (err) setError("Login failed. Please try again.");
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Login failed. Please try again.");
        return;
      }

      setSuccess("Login successful!");

      // Ensure the cookie is usable server-side before navigating
      await fetch(`/api/auth/me`, { credentials: "include", cache: "no-store" }).catch(() => {});

      // Redirect directly to returned chat thread if provided
      const target = data?.redirectTo || "/chat";
      window.location.assign(target);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error(err);
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
          <CardTitle className="text-white">Login</CardTitle>
          <CardDescription className="text-gray-300">Please enter your credentials</CardDescription>
        </CardHeader>
        <CardContent>
          {isIOS ? (
            <form className="space-y-4" action="/api/auth/login" method="POST">
              <Label htmlFor="username" className="text-white">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex items-center space-x-4 mt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
                <Link className="text-blue-300 hover:underline" href="/signup">
                  not registered?
                </Link>
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Label htmlFor="username" className="text-white">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex items-center space-x-4 mt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
                <Link className="text-blue-300 hover:underline" href="/signup">
                  not registered?
                </Link>
              </div>
            </form>
          )}
        </CardContent>
        {error && <p className="text-red-500 mt-2">{error}</p>}
        {success && <p className="text-green-500 mt-2">{success}</p>}
      </Card>
    </div>
  );
};

export default Login;