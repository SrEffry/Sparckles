"use client";

import EmpresaWizard from "@/components/EmpresaWizard";
import { crearEmpresa } from "@/lib/empresasApi";

export default function NuevaEmpresaPage() {
  return <EmpresaWizard titulo="Registrar Nueva Empresa" onGuardar={crearEmpresa} />;
}
