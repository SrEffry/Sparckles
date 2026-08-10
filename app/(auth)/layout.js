import Image from "next/image";
import styles from "./auth.module.css";

// Layout de autenticación: panel oscuro de alto completo a la izquierda (login/registro)
// con el video de marca ocupando la zona derecha.
export default function AuthLayout({ children }) {
  return (
    <div className={styles.shell}>
      <div className={styles.videoZone}>
        <video
          className={styles.bgVideo}
          src="/video/mvp-login.webm"
          poster="/img/mvp-login-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      </div>

      <aside className={styles.authPanel}>
        <div className={styles.topBlock}>
          <div className={styles.brandBlock}>
            <span className={styles.logoBadge}>
              <Image src="/img/Logo.png" alt="Sparkles" width={34} height={34} priority />
            </span>
            <span className={styles.brandName}>Sparkles</span>
          </div>
        </div>

        <div className={styles.formWrap}>{children}</div>

        <p className={styles.soporte}>Soporte | Contacto | Políticas</p>
      </aside>
    </div>
  );
}
