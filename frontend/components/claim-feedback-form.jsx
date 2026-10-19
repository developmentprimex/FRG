"use client";

import { useEffect, useRef, useState } from "react";

const copy = {
  de: {
    title: "Wie war unser Service?",
    intro: "Ihre Meinung ist uns wichtig. Die Bewertung dauert nur etwa eine Minute.",
    resolved: "Ist Ihr Problem gelöst?",
    resolution: ["Ja", "Teilweise", "Nein"],
    speed: "Wie zufrieden waren Sie mit der Bearbeitungsdauer?",
    communication: "Wie zufrieden waren Sie mit unserer Kommunikation?",
    overall: "Wie zufrieden waren Sie insgesamt mit unserem Service?",
    ratings: ["Sehr unzufrieden", "Unzufrieden", "Neutral", "Zufrieden", "Sehr zufrieden"],
    unresolved: "Möchten Sie uns mitteilen, was noch offen ist?",
    unresolvedPlaceholder: "Ihr Kommentar (optional)",
    comment: "Möchten Sie uns noch etwas mitteilen?",
    optional: "Kommentar (optional)",
    commentPlaceholder: "Was hat Ihnen gefallen? Was können wir verbessern?",
    send: "Bewertung absenden", sending: "Wird gesendet…",
    thanks: "Vielen Dank für Ihr Feedback!",
    thanksDetail: "Ihre Bewertung wurde erfolgreich übermittelt. Ihr Feedback hilft uns, unseren Service weiter zu verbessern.",
    answered: "Vielen Dank. Sie haben diese Bewertung bereits abgegeben.",
    unavailable: "Dieser Bewertungslink ist abgelaufen, wurde bereits verwendet oder ist nicht mehr verfügbar.",
    error: "Die Bewertung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    incomplete: "Bitte beantworten Sie alle vier Fragen. Die Kommentarfelder sind optional.",
    privacy: "Die Teilnahme ist freiwillig. Ihre Angaben werden Ihrer Reklamation zugeordnet und zur Auswertung und Verbesserung unseres Kundenservice verwendet. Bitte geben Sie keine sensiblen persönlichen Daten an.",
    privacyLink: "Datenschutzhinweise",
  },
  en: {
    title: "How was our service?",
    intro: "Your opinion matters to us. The review takes about one minute.",
    resolved: "Is your problem resolved?",
    resolution: ["Yes", "Partly", "No"],
    speed: "How satisfied were you with the time taken to handle your complaint?",
    communication: "How satisfied were you with our communication?",
    overall: "How satisfied were you with our service overall?",
    ratings: ["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"],
    unresolved: "Would you like to tell us what is still unresolved?",
    unresolvedPlaceholder: "Your comment (optional)",
    comment: "Is there anything else you would like to tell us?",
    optional: "Comment (optional)",
    commentPlaceholder: "What did you like? What could we improve?",
    send: "Send feedback", sending: "Sending…",
    thanks: "Thank you for your feedback!",
    thanksDetail: "Your review was submitted successfully. Your feedback helps us keep improving our service.",
    answered: "Thank you. You have already submitted this feedback.",
    unavailable: "This feedback link has expired, has already been used, or is no longer available.",
    error: "We could not save your feedback. Please try again.",
    incomplete: "Please answer all four questions. Both comment fields are optional.",
    privacy: "Taking part is voluntary. Your answers are linked to your complaint and used to evaluate and improve our customer service. Please do not include sensitive personal information.",
    privacyLink: "Privacy notice",
  },
};

function RatingQuestion({ name, question, labels }) {
  return <fieldset className="question"><legend>{question}</legend><div className="choices rating-choices">
    {labels.map((label, index) => <label className="choice" key={index}>
      <input type="radio" name={name} value={index + 1} required />
      <span className="choice-number">{index + 1}</span><span>{label}</span>
    </label>)}
  </div></fieldset>;
}

export function ClaimFeedbackForm({ token, state }) {
  const [language, setLanguage] = useState("de");
  const [status, setStatus] = useState(state);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const message = useRef(null);
  const t = copy[language];

  useEffect(() => {
    if (["success", "answered", "unavailable"].includes(status)) message.current?.focus();
  }, [status]);

  async function submit(event) {
    event.preventDefault();
    if (status !== "available" || submitting.current) return;
    const values = new FormData(event.currentTarget);
    const missing = ["resolved", "speed", "communication", "overall"].find((name) => !values.get(name));
    if (missing) {
      setError(t.incomplete);
      event.currentTarget.elements.namedItem(missing)?.[0]?.focus();
      return;
    }
    submitting.current = true;
    setStatus("submitting"); setError("");
    try {
      const response = await fetch("/api/claim-feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, resolved: values.get("resolved"),
          speedRating: Number(values.get("speed")), communicationRating: Number(values.get("communication")), overallRating: Number(values.get("overall")),
          comment: values.get("comment"),
          unresolvedComment: values.get("resolved") === "YES" ? null : values.get("unresolvedComment"),
        }),
      });
      const result = await response.json();
      if (response.ok && result.success === true) { setStatus("success"); return; }
      if (response.status === 410) { setStatus("unavailable"); return; }
      setError(response.status === 400 && language === "de" && typeof result.error === "string" ? result.error : t.error);
      setStatus("available");
    } catch {
      setError(t.error); setStatus("available");
    } finally {
      submitting.current = false;
    }
  }

  return <main className="feedback-page" lang={language}>
    <div className="feedback-shell">
      <header className="feedback-header"><strong className="brand">fragmento<span>.</span></strong><div className="language" aria-label="Language / Sprache"><button type="button" aria-pressed={language === "de"} onClick={() => setLanguage("de")}>Deutsch</button><button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button></div></header>
      <section className="feedback-card">
        {status === "available" || status === "submitting" ? <>
          <span className="eyebrow">Fragmento Service</span><h1>{t.title}</h1><p className="intro">{t.intro}</p>
          <form onSubmit={submit} noValidate aria-busy={status === "submitting"} aria-describedby={error ? "feedback-error" : undefined}>
            <fieldset className="answer-fields" disabled={status === "submitting"}>
              <fieldset className="question"><legend>{t.resolved}</legend><div className="choices resolution-choices">
                {["YES", "PARTLY", "NO"].map((value, index) => <label className="choice" key={value}><input type="radio" name="resolved" value={value} checked={resolution === value} onChange={() => setResolution(value)} required /><span>{t.resolution[index]}</span></label>)}
              </div></fieldset>
              {resolution === "PARTLY" || resolution === "NO" ? <div className="conditional-comment">
                <label htmlFor="feedback-unresolved">{t.unresolved}</label>
                <textarea id="feedback-unresolved" name="unresolvedComment" placeholder={t.unresolvedPlaceholder} maxLength={1000} rows={3} />
              </div> : null}
              <RatingQuestion name="speed" question={t.speed} labels={t.ratings} />
              <RatingQuestion name="communication" question={t.communication} labels={t.ratings} />
              <RatingQuestion name="overall" question={t.overall} labels={t.ratings} />
              <label className="comment-label" htmlFor="feedback-comment">{t.comment}<small>{t.optional}</small></label>
              <textarea id="feedback-comment" name="comment" placeholder={t.commentPlaceholder} maxLength={1000} rows={4} />
            </fieldset>
            <p className="privacy-notice">{t.privacy} <a href="/datenschutz" target="_blank" rel="noopener noreferrer">{t.privacyLink}</a></p>
            {error ? <p id="feedback-error" className="error" role="alert">{error}</p> : null}
            <button className="submit" type="submit" disabled={status === "submitting"}>{status === "submitting" ? t.sending : t.send}</button>
          </form>
        </> : <div className="message" role="status" tabIndex={-1} ref={message}><h1>{status === "success" ? t.thanks : status === "answered" ? t.answered : t.unavailable}</h1>{status === "success" ? <p>{t.thanksDetail}</p> : null}</div>}
      </section>
    </div>
  </main>;
}
