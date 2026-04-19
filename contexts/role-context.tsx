"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

export type Role = "dm" | "player";

const STORAGE_KEY = "scryer_role";

interface RoleContextValue {
  role: Role;
  isDM: boolean;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

export function useRoleSafe(): RoleContextValue | null {
  return useContext(RoleContext);
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("player");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dm" || stored === "player") setRoleState(stored);
  }, []);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <RoleContext.Provider value={{ role, isDM: role === "dm", setRole }}>
      {children}
    </RoleContext.Provider>
  );
}
