import { type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
export function Permissao({ codigo, children }: { codigo: string; children: ReactNode }) {
 const { pode } = useAuth();
 return pode(codigo) ? <>{children}</> : null;
}
