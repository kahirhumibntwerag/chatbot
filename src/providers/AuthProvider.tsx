"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/apiConfig";

type AuthUser = {
	username?: string;
	[id: string]: any;
} | null;

type AuthContextValue = {
	user: AuthUser;
	isAuthLoading: boolean;
	authError: string | null;
	refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getToken(): string | null {
	if (typeof document === "undefined") return null;
	const raw = document.cookie
		.split(";")
		.find((c) => c.trim().startsWith("jwt="));
	return raw ? raw.split("=")[1] : null;
}

export function AuthProvider({ children, requireAuth = false }: { children: React.ReactNode; requireAuth?: boolean }) {
	const router = useRouter();
	const [user, setUser] = useState<AuthUser>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(false);
	const [authError, setAuthError] = useState<string | null>(null);
	const didFetchRef = useRef(false);

	const fetchMe = async () => {
		setIsAuthLoading(true);
		setAuthError(null);
		try {
			const token = getToken();
			const res = await fetch(`${API_BASE_URL}/users/me/`, {
				credentials: "include",
				headers: {
					...(token ? { Authorization: `Bearer ${token}` } : {}),
					Accept: "application/json",
				},
			});
			if (!res.ok) throw new Error("unauth");
			const data = await res.json();
			setUser(data || {});
		} catch (e) {
			setUser(null);
			setAuthError("unauth");
			if (requireAuth) router.replace("/login");
		} finally {
			setIsAuthLoading(false);
		}
	};

	useEffect(() => {
		if (didFetchRef.current) return;
		didFetchRef.current = true;
		fetchMe();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const value = useMemo<AuthContextValue>(
		() => ({ user, isAuthLoading, authError, refreshAuth: fetchMe }),
		[user, isAuthLoading, authError]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
