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

	// Throttling/debouncing for auth checks on focus/visibility
	const checkingRef = useRef(false);
	const lastCheckRef = useRef(0);
	const scheduledRef = useRef<number | null>(null);
	const debounceRef = useRef<number | null>(null);
	const MIN_GAP_MS = 1500; // minimum gap between checks
	const DEBOUNCE_MS = 300; // debounce for rapid focus/visibility bursts

	const runCheck = () => {
		if (checkingRef.current) return;
		checkingRef.current = true;
		silentCheckAuth().finally(() => {
			checkingRef.current = false;
			lastCheckRef.current = Date.now();
		});
	};

	const requestCheck = () => {
		const now = Date.now();
		const elapsed = now - lastCheckRef.current;
		if (elapsed >= MIN_GAP_MS) {
			runCheck();
		} else {
			if (scheduledRef.current) clearTimeout(scheduledRef.current);
			scheduledRef.current = window.setTimeout(() => {
				scheduledRef.current = null;
				runCheck();
			}, Math.max(0, MIN_GAP_MS - elapsed));
		}
	};

	const onFocusThrottled = () => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = window.setTimeout(() => {
			requestCheck();
		}, DEBOUNCE_MS);
	};

	const onVisibilityThrottled = () => {
		if (document.visibilityState === "visible") onFocusThrottled();
	};

	useEffect(() => {
		if (didFetchRef.current) return;
		didFetchRef.current = true;
		fetchMe();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Periodic and focus/visibility-based checks to catch token expiry mid-session
	useEffect(() => {
	if (!requireAuth) return;
		let intervalId: number | null = null;
		window.addEventListener("focus", onFocusThrottled);
		document.addEventListener("visibilitychange", onVisibilityThrottled);
		intervalId = window.setInterval(() => requestCheck(), 2 * 60 * 1000);
		return () => {
			window.removeEventListener("focus", onFocusThrottled);
			document.removeEventListener("visibilitychange", onVisibilityThrottled);
			if (intervalId) clearInterval(intervalId);
			if (scheduledRef.current) { clearTimeout(scheduledRef.current); scheduledRef.current = null; }
			if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
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
