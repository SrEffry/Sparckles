"use client";

import { createContext, useContext } from "react";

const UsuarioContext = createContext(null);

export function UsuarioProvider({ usuario, children }) {
  return (
    <UsuarioContext.Provider value={usuario}>{children}</UsuarioContext.Provider>
  );
}

// Devuelve el usuario de la sesión actual (garantizado dentro del panel).
export function useUsuario() {
  return useContext(UsuarioContext);
}
