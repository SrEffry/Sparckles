import Image from "next/image";
import Aurora from "./Aurora";
import LiveInvoice from "./LiveInvoice";
import styles from "./auth.module.css";

// Escena editorial: héroe tipográfico + factura viva (izq) + tarjeta de vidrio
// (der), sobre una sola aurora burdeos viva. Sin panel muerto en blanco.
export default function AuthLayout({ children }) {
  return (
    <div className={styles.shell}>
      <Aurora />

      <div className={styles.scene}>
        <section className={styles.hero}>
          <span className={styles.brandRow}>
            <span className={styles.brandBadge}>
              <Image
                src="/img/Logo.png"
                alt="Sparkles"
                width={36}
                height={36}
                className={styles.brandLogo}
                priority
              />
            </span>
            <span className={styles.brandWord}>Sparkles</span>
          </span>

          <h1 className={styles.heroTitle}>
            Tu contabilidad y tus impuestos,{" "}
            <span className={styles.accent}>siempre en orden.</span>
          </h1>

          <p className={styles.heroSub}>
            La plataforma contable y tributaria hecha para Colombia. Factura, concilia y cumple
            con la DIAN desde un solo lugar.
          </p>

          <LiveInvoice />
        </section>

        <section className={styles.formCol}>{children}</section>
      </div>

      <p className={styles.footer}>Hecho para Colombia · DIAN &amp; NIIF</p>
    </div>
  );
}
