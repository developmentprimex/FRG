"use client";

import { useState } from "react";

const copy = {
  de: {
    title: "Wie war unser Service?",
    intro: "Ihre Meinung hilft uns. Die Umfrage dauert etwa eine Minute.",
    resolved: "Ist Ihr Problem gelöst?",
    resolution: ["Ja", "Zum Teil", "Nein"],
    speed: "Wie schnell haben wir Ihnen geholfen?",
    speedRatings: ["Sehr langsam", "Langsam", "Okay", "Schnell", "Sehr schnell"],
    communication: "War es einfach, mit uns zu sprechen?",
    communicationRatings: ["Sehr schwer", "Schwer", "Okay", "Einfach", "Sehr einfach"],
    overall: "Wie war unser Service insgesamt?",
    overallRatings: ["Sehr schlecht", "Schlecht", "Okay", "Gut", "Sehr gut"],
    comment: "Was können wir besser machen?",
    optional: "Kommentar (freiwillig)",
    send: "Bewertung absenden", sending: "Wird gesendet…",
    thanks: "Vielen Dank für Ihre Rückmeldung!", thanksDetail: "Ihre Bewertung wurde gespeichert.",
    answered: "Vielen Dank. Sie haben diese Bewertung bereits abgegeben.",
    unavailable: "Dieser Bewertungslink ist abgelaufen oder nicht mehr verfügbar.",
    error: "Die Bewertung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
  },
  en: {
    title: "How was our service?",
    intro: "Your opinion helps us improve. This takes about one minute.",
    resolved: "Did we solve your problem?",
    resolution: ["Yes", "Partly", "No"],
    speed: "How quickly did we help you?",
    speedRatings: ["Very slow", "Slow", "Okay", "Fast", "Very fast"],
    communication: "Was it easy to talk to us?",
    communicationRatings: ["Very hard", "Hard", "Okay", "Easy", "Very easy"],
    overall: "Overall, how was our service?",
    overallRatings: ["Very bad", "Bad", "Okay", "Good", "Very good"],
    comment: "What can we do better?",
    optional: "Optional comment",
    send: "Send feedback", sending: "Sending…",
    thanks: "Thank you for your feedback!", thanksDetail: "Your response has been saved.",
    answered: "Thank you. You have already submitted this feedback.",
    unavailable: "This feedback link has expired or is no longer available.",
    error: "We could not save your feedback. Please try again.",
  },
};

function RatingQuestion({ name, question, labels }) {
  return <fieldset className="question"><legend>{question}</legend><div className="choices rating-choices">
    {labels.map((label, index) => <label className="choice" key={label}>
      <input type="radio" name={name} value={index + 1} required />
      <span className="choice-number">{index + 1}</span><span>{label}</span>
    </label>)}
  </div></fieldset>;
}

export function ClaimFeedbackForm({ token, state }) {
  const [language, setLanguage] = useState("de");
  const [status, setStatus] = useState(state);
  const [error, setError] = useState("");
  const t = copy[language];

  async function submit(event) {
    event.preventDefault();
    if (status !== "available") return;
    setStatus("submitting"); setError("");
    const values = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/claim-feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, resolved: values.get("resolved"), speedRating: Number(values.get("speed")), communicationRating: Number(values.get("communication")), overallRating: Number(values.get("overall")), comment: values.get("comment") }),
      });
      if (response.ok) { setStatus("success"); return; }
      if (response.status === 410) { setStatus("unavailable"); return; }
      throw new Error("save failed");
    } catch {
      setError(t.error); setStatus("available");
    }
  }

  return <main className="feedback-page" lang={language}>
    <div className="feedback-shell">
      <header className="feedback-header"><strong className="brand">fragmento<span>.</span></strong><div className="language" aria-label="Language / Sprache"><button type="button" aria-pressed={language === "de"} onClick={() => setLanguage("de")}>Deutsch</button><button type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button></div></header>
      <section className="feedback-card">
        {status === "available" || status === "submitting" ? <>
          <span className="eyebrow">Fragmento Service</span><h1>{t.title}</h1><p className="intro">{t.intro}</p>
          <form onSubmit={submit}>
            <fieldset className="question"><legend>{t.resolved}</legend><div className="choices resolution-choices">
              {["YES", "PARTLY", "NO"].map((value, index) => <label className="choice" key={value}><input type="radio" name="resolved" value={value} required /><span>{t.resolution[index]}</span></label>)}
            </div></fieldset>
            <RatingQuestion name="speed" question={t.speed} labels={t.speedRatings} />
            <RatingQuestion name="communication" question={t.communication} labels={t.communicationRatings} />
            <RatingQuestion name="overall" question={t.overall} labels={t.overallRatings} />
            <label className="comment-label" htmlFor="feedback-comment">{t.comment}<small>{t.optional}</small></label>
            <textarea id="feedback-comment" name="comment" maxLength={1000} rows={4} />
            {error ? <p className="error" role="alert">{error}</p> : null}
            <button className="submit" type="submit" disabled={status === "submitting"}>{status === "submitting" ? t.sending : t.send}</button>
          </form>
        </> : <div className="message" role="status"><h1>{status === "success" ? t.thanks : status === "answered" ? t.answered : t.unavailable}</h1>{status === "success" ? <p>{t.thanksDetail}</p> : null}</div>}
      </section>
    </div>
  </main>;
}
