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
    <style jsx global>{`
      .feedback-page { min-height: 100vh; background: #f7f4f0; color: #302923; font-family: Arial, sans-serif; padding: 24px; box-sizing: border-box; }
      .feedback-page .feedback-shell { max-width: 760px; margin: 0 auto; }
      .feedback-page .feedback-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
      .feedback-page .brand { font-size: 27px; letter-spacing: -.05em; }.feedback-page .brand span { color: #b69a68; }
      .feedback-page .language { display: flex; padding: 3px; border: 1px solid #ddd3c8; border-radius: 9px; background: white; }
      .feedback-page .language button { border: 0; border-radius: 6px; padding: 8px 11px; background: transparent; color: #594b41; cursor: pointer; }
      .feedback-page .language button[aria-pressed=true] { background: #76543c; color: white; }
      .feedback-page .feedback-card { padding: 32px; background: white; border: 1px solid #e7dfd6; border-radius: 18px; box-shadow: 0 8px 30px rgba(48,41,35,.05); }
      .feedback-page .eyebrow { color: #76543c; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
      .feedback-page h1 { margin: 10px 0; font-size: 28px; line-height: 1.2; }
      .feedback-page .intro, .feedback-page .message p { color: #665b52; line-height: 1.6; }
      .feedback-page form { display: grid; gap: 20px; margin-top: 28px; }
      .feedback-page .question { border: 0; padding: 0; margin: 0; min-width: 0; }
      .feedback-page legend, .feedback-page .comment-label { margin-bottom: 12px; padding: 0; font-size: 15px; font-weight: 700; line-height: 1.4; }
      .feedback-page .choices { display: grid; gap: 8px; }.feedback-page .resolution-choices { grid-template-columns: repeat(3, minmax(0, 1fr)); }.feedback-page .rating-choices { grid-template-columns: repeat(5, minmax(0, 1fr)); }
      .feedback-page .choice { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; min-height: 70px; padding: 9px 6px; border: 1px solid #d9cec2; border-radius: 10px; text-align: center; font-size: 12px; line-height: 1.3; cursor: pointer; box-sizing: border-box; }
      .feedback-page .choice input { position: absolute; opacity: 0; }.feedback-page .choice:has(input:checked) { border: 2px solid #76543c; background: #f7f0e9; color: #57391f; }.feedback-page .choice:has(input:focus-visible) { outline: 3px solid #caa778; outline-offset: 2px; }
      .feedback-page .choice-number { font-size: 19px; font-weight: 800; }.feedback-page .comment-label { display: grid; gap: 4px; margin-bottom: -12px; }.feedback-page .comment-label small { color: #766a60; font-size: 12px; font-weight: 400; }
      .feedback-page textarea { width: 100%; border: 1px solid #d9cec2; border-radius: 10px; padding: 12px; font: inherit; resize: vertical; box-sizing: border-box; }
      .feedback-page .submit { width: fit-content; min-height: 44px; padding: 10px 20px; border: 0; border-radius: 9px; background: #76543c; color: white; font-weight: 700; cursor: pointer; }.feedback-page .submit:disabled { opacity: .6; }
      .feedback-page .error { color: #a51b28; margin: 0; }.feedback-page .message { padding: 30px 0; }
      @media (max-width: 650px) { .feedback-page { padding: 14px; }.feedback-page .feedback-card { padding: 22px 16px; }.feedback-page .rating-choices { grid-template-columns: minmax(0, 1fr); }.feedback-page .rating-choices .choice { flex-direction: row; justify-content: flex-start; min-height: 48px; padding: 10px 14px; gap: 14px; text-align: left; }.feedback-page .choice-number { width: 20px; }.feedback-page .resolution-choices .choice { min-height: 55px; } .feedback-page h1 { font-size: 24px; } }
    `}</style>
  </main>;
}
