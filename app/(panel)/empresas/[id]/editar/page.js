"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EmpresaWizard from "@/components/EmpresaWizard";
import { obtenerEmpresa, actualizarEmpresa } from "@/lib/empresasApi";

export default function EditarEmpresaPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [empresa, setEmpresa] = useState(undefined); // undefined = cargando

  useEffect(() => {
    let activo = true;
    obtenerEmpresa(id).then((e) => {
      if (!activo) return;
      if (!e) {
        router.replace("/empresas");
        return;
      }
      setEmpresa(e);
    });
    return () => {
      activo = false;
    };
  }, [id, router]);

  if (empresa === undefined) return null;

  return (
    <EmpresaWizard
      titulo="Editar Empresa"
      inicial={empresa}
      onGuardar={(payload) => actualizarEmpresa(id, payload)}
    />
  );
}
