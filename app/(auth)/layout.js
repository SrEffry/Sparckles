import Image from "next/image";
import styles from "./auth.module.css";

// Layout de autenticación: panel de marca (izquierda) + formulario (derecha),
// recuperando el diseño de dos paneles del sitio original.
export default function AuthLayout({ children }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.brandPanel}>
        <div className={styles.brandTop}>
          <Image src="/img/Logo.png" alt="Sparkles" width={64} height={64} className={styles.brandLogo} priority />
          <h1>Sparkles</h1>
          <p className={styles.desc}>
            Software contable, tributario,
            <br />
            confiable y fácil de usar
          </p>
        </div>

        <div className={styles.ilustracion}>
          <Image src="/img/nina.png" alt="" width={420} height={420} className={styles.ilustracionImg} />
        </div>

        <div className={styles.soporte}>Soporte | Contacto | Políticas</div>
      </aside>

      <main className={styles.formPanel}>{children}</main>
    </div>
  );
}
