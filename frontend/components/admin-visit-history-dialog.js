"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminText } from "./admin-i18n";
import styles from "./admin-visit-journeys.module.css";

export default function AdminVisitHistoryDialog({ closeHref, visitor, children }) {
  const dialogRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function close() {
    dialogRef.current.close();
    router.replace(closeHref, { scroll: false });
  }

  return (
    <dialog ref={dialogRef} className={styles.historyDialog} aria-labelledby="visit-history-title"
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
      }}>
      <header className={styles.dialogHeader}>
        <h2 id="visit-history-title"><AdminText i18nKey="visitJourney.history" fallback="Visit history" /> · {visitor}</h2>
        <button type="button" onClick={close} autoFocus className={styles.dialogClose}>
          <AdminText i18nKey="visitJourney.close" fallback="Close" />
        </button>
      </header>
      <div className={styles.dialogContent}>{children}</div>
    </dialog>
  );
}
