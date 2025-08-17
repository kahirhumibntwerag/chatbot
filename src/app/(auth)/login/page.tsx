"use client";
import React, { useState } from "react";
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
import Link from "next/dist/client/link";
import { Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/apiConfig";

const Login = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      // Existing jwt (if any) from cookie
      const existingJwt =
        document.cookie.match(/(?:^|;\s*)jwt=([^;]+)/)?.[1] || "";

      const response = await fetch(`${API_BASE_URL}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(existingJwt
            ? { Authorization: `Bearer ${decodeURIComponent(existingJwt)}` }
            : {}),
        },
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Login failed. Please try again.");
        return;
      }

      // Accept possible token field names
      const newToken: string | undefined =
        data.jwt || data.token || data.access_token;

      if (newToken) {
        // Persist token as cookie for later Authorization headers
        document.cookie = `jwt=${newToken}; Path=/; SameSite=Lax`;
      }

      setSuccess("Login successful!");
      router.push("/chat");
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
          <CardTitle>Login</CardTitle>
          <CardDescription>Please enter your credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
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
              <Link className="hover:underline" href="/signup">
                not registered?
              </Link>
            </div>
          </form>
        </CardContent>
        {error && <p className="text-red-500 mt-2">{error}</p>}
        {success && <p className="text-green-500 mt-2">{success}</p>}
      </Card>
    </div>
  );
};

export default Login;