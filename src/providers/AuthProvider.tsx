"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
	// no longer needed; kept for potential future use
	return null;
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
			const res = await fetch(`/api/auth/me`, { credentials: "include" });
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

	// Silent auth check to avoid UI flicker; used on interval/focus/visibility
	const silentCheckAuth = async () => {
		try {
			const res = await fetch(`/api/auth/me`, { credentials: "include" });
			if (!res.ok) throw new Error("unauth");
			const data = await res.json();
			setUser(data || {});
			setAuthError(null);
		} catch {
			setUser(null);
			setAuthError("unauth");
			if (requireAuth) router.replace("/login");
		}
	};

	useEffect(() => {
		if (didFetchRef.current) return;
		didFetchRef.current = true;
		let callback = setTimeout(fetchMe, 300) ;
		return () => clearTimeout(callback);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Periodic and focus/visibility-based checks to catch token expiry mid-session
	useEffect(() => {
		if (!requireAuth) return;
		let intervalId: number | null = null;
		const onFocus = () => silentCheckAuth();
		const onVisibility = () => {
			if (document.visibilityState === "visible") silentCheckAuth();
		};
		window.addEventListener("focus", onFocus);
		document.addEventListener("visibilitychange", onVisibility);
		intervalId = window.setInterval(() => silentCheckAuth(), 2 * 60 * 1000);
		return () => {
			window.removeEventListener("focus", onFocus);
			document.removeEventListener("visibilitychange", onVisibility);
			if (intervalId) clearInterval(intervalId);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [requireAuth]);

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
