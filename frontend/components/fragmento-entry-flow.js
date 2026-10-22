"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { normalizeContractNumber } from "../lib/kitchen-contracts";
import {
  getPublicTrackingContext,
  trackPublicPageOpened,
} from "../lib/public-page-open-tracking";
import { persistFragmentoLanguage } from "../lib/fragmento-language";
import { activatePublicLanguage } from "../lib/public-language-state";
import CookieConsentBanner from "./cookie-consent-banner";
import { isContractRepurchaseRestricted, REPURCHASE_UNAVAILABLE_CODE, REPURCHASE_UNAVAILABLE_MESSAGE } from "../lib/contract-repurchase-restrictions";

const LANGUAGE_OPTIONS = [
  { code: "de", label: "Deutsch", flagSrc: "https://flagcdn.com/w40/de.png" },
  { code: "en", label: "English", flagSrc: "https://flagcdn.com/w40/gb.png" },
  { code: "tr", label: "Türkçe", flagSrc: "https://flagcdn.com/w40/tr.png" },
  { code: "es", label: "Español", flagSrc: "https://flagcdn.com/w40/es.png" },
  { code: "fr", label: "Français", flagSrc: "https://flagcdn.com/w40/fr.png" },
  { code: "ru", label: "Русский", flagSrc: "https://flagcdn.com/w40/ru.png" },
];

const AVATAR_BASE_PATH = "/AVATAR";
const ENTRY_FLOW_STATE_KEY = "fragmentoEntryFlowState";
const LEGAL_RETURN_REQUEST_KEY = "fragmentoLegalReturnRequested";
const VALID_LANGUAGE_CODES = new Set(LANGUAGE_OPTIONS.map((language) => language.code));
const VALID_ENTRY_SCREENS = new Set(["language", "mode", "text", "video", "contract"]);

function getLegalReturnEntryState() {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.sessionStorage.getItem(LEGAL_RETURN_REQUEST_KEY) !== "1") {
    return null;
  }

  window.sessionStorage.removeItem(LEGAL_RETURN_REQUEST_KEY);

  try {
    const rawState = window.sessionStorage.getItem(ENTRY_FLOW_STATE_KEY);
    if (!rawState) {
      return null;
    }

    const parsedState = JSON.parse(rawState);
    const selectedLanguage = VALID_LANGUAGE_CODES.has(parsedState.selectedLanguage) ? parsedState.selectedLanguage : "";
    const selectedMode = parsedState.selectedMode === "text" || parsedState.selectedMode === "video" ? parsedState.selectedMode : "";
    const screen = VALID_ENTRY_SCREENS.has(parsedState.screen) ? parsedState.screen : "";

    if (!selectedLanguage || !screen) {
      return null;
    }

    return {
      selectedLanguage,
      selectedMode,
      screen,
      contractNumber: typeof parsedState.contractNumber === "string" ? parsedState.contractNumber : "",
    };
  } catch {
    return null;
  }
}

const SCREEN_TEXT = {
  de: {
    repurchaseNoticeTitle: "Wichtiger Hinweis!",
    repurchaseNoticeMessage: "Diese Küche ist nicht für einen digitalen Nachkauf vorgesehen. Bitte kontaktieren Sie Ihren Vermieter über die alternativen Nachkaufmöglichkeiten.",
    repurchaseNoticeDismiss: "Verstanden",
    languageTitle: "Wähle deine Sprache",
    modeTitle: "Wie möchtest du die Anweisungen erhalten?",
    modeDescription: "Wähle zwischen:",
    textButton: "Text",
    videoButton: "Video",
    textTitle: "Textanweisungen",
    continueLabel: "Weiter",
    backLabel: "Zurück",
    contractTitle: "Küchenvertragsnummer",
    contractHelper: "Gib deine Kaufvertragsnummer ein.\nDu findest sie auf der Innenseite deines Spülenschrankes.",
    contractLabel: "Bitte gib deine Vertragsnummer ein:*",
    contractAction: "Bestätigen",
    contractError: "Die eingegebene Vertragsnummer passt zu keiner aktiven Küche.",
    contractPrivacyPrefix: "Wir verwenden deine Vertragsnummer zur Zugangsprüfung sowie für Sicherheits- und Analysezwecke. Weitere Informationen findest du in unserer ",
    contractPrivacyLink: "Datenschutzerklärung",
    contractPrivacySuffix: ".",
  },
  en: {
    repurchaseNoticeTitle: "Important notice!",
    repurchaseNoticeMessage: "This kitchen is not eligible for digital additional purchases. Please contact your landlord to discuss alternative purchasing options.",
    repurchaseNoticeDismiss: "Understood",
    languageTitle: "Select your language",
    modeTitle: "How would you like instructions?",
    modeDescription: "Choose between:",
    textButton: "Text",
    videoButton: "Video",
    textTitle: "Text instructions",
    continueLabel: "Continue",
    backLabel: "Back",
    contractTitle: "Kitchen contract number",
    contractHelper: "Enter your purchase contract number.\nYou can find it on the inside of your sink cabinet.",
    contractLabel: "Please enter your contract number:*",
    contractAction: "Confirm",
    contractError: "The entered contract number does not match any active kitchen.",
    contractPrivacyPrefix: "We use your contract number for access verification, security, and analytics. Learn more in our ",
    contractPrivacyLink: "privacy policy",
    contractPrivacySuffix: ".",
  },
  tr: {
    repurchaseNoticeTitle: "Önemli bilgilendirme!",
    repurchaseNoticeMessage: "Bu mutfak, dijital ortamda ek ürün satın alımına uygun değildir. Alternatif satın alma seçeneklerini görüşmek için lütfen ev sahibinizle iletişime geçin.",
    repurchaseNoticeDismiss: "Anladım",
    languageTitle: "Dilini seç",
    modeTitle: "Talimatları nasıl almak istersiniz?",
    modeDescription: "Şunlardan birini seçin:",
    textButton: "Metin",
    videoButton: "Video",
    textTitle: "Metin talimatları",
    continueLabel: "Devam",
    backLabel: "Geri",
    contractTitle: "Mutfak sözleşme numarası",
    contractHelper: "Satın alma sözleşme numaranı gir.\nLavabo dolabının iç kısmında bulabilirsin.",
    contractLabel: "Lütfen sözleşme numaranı gir:*",
    contractAction: "Onayla",
    contractError: "Girilen sözleşme numarası aktif bir mutfakla eşleşmiyor.",
    contractPrivacyPrefix: "Sözleşme numaranızı erişim doğrulaması, güvenlik ve analiz için kullanıyoruz. Ayrıntılı bilgi için ",
    contractPrivacyLink: "gizlilik politikamızı",
    contractPrivacySuffix: " inceleyin.",
  },
  es: {
    repurchaseNoticeTitle: "¡Aviso importante!",
    repurchaseNoticeMessage: "Esta cocina no es apta para compras adicionales por vía digital. Póngase en contacto con su arrendador para consultar otras opciones de compra.",
    repurchaseNoticeDismiss: "Entendido",
    languageTitle: "Elige tu idioma",
    modeTitle: "¿Cómo quieres recibir las instrucciones?",
    modeDescription: "Elige entre:",
    textButton: "Texto",
    videoButton: "Video",
    textTitle: "Instrucciones en texto",
    continueLabel: "Continuar",
    backLabel: "Atrás",
    contractTitle: "Número de contrato de cocina",
    contractHelper: "Introduce tu número de contrato de compra.\nLo encontrarás en el interior del mueble del fregadero.",
    contractLabel: "Introduce tu número de contrato:*",
    contractAction: "Confirmar",
    contractError: "El número introducido no coincide con ninguna cocina activa.",
    contractPrivacyPrefix: "Utilizamos tu número de contrato para verificar el acceso, garantizar la seguridad y realizar análisis. Consulta nuestra ",
    contractPrivacyLink: "política de privacidad",
    contractPrivacySuffix: " para obtener más información.",
  },
  fr: {
    repurchaseNoticeTitle: "Information importante !",
    repurchaseNoticeMessage: "Cette cuisine n’est pas éligible aux achats complémentaires en ligne. Veuillez contacter votre bailleur pour discuter des autres possibilités d’achat.",
    repurchaseNoticeDismiss: "Compris",
    languageTitle: "Choisis ta langue",
    modeTitle: "Comment souhaitez-vous recevoir les instructions ?",
    modeDescription: "Choisissez :",
    textButton: "Texte",
    videoButton: "Vidéo",
    textTitle: "Instructions texte",
    continueLabel: "Continuer",
    backLabel: "Retour",
    contractTitle: "Numéro de contrat de cuisine",
    contractHelper: "Saisissez votre numéro de contrat d'achat.\nVous le trouverez à l'intérieur du meuble évier.",
    contractLabel: "Veuillez saisir votre numéro de contrat :*",
    contractAction: "Confirmer",
    contractError: "Le numéro saisi ne correspond à aucune cuisine active.",
    contractPrivacyPrefix: "Nous utilisons votre numéro de contrat pour la vérification de l'accès, la sécurité et l'analyse. Consultez notre ",
    contractPrivacyLink: "politique de confidentialité",
    contractPrivacySuffix: " pour en savoir plus.",
  },
  ru: {
    repurchaseNoticeTitle: "Важная информация!",
    repurchaseNoticeMessage: "Для этой кухни недоступна покупка дополнительных элементов онлайн. Пожалуйста, свяжитесь с вашим арендодателем, чтобы обсудить другие варианты покупки.",
    repurchaseNoticeDismiss: "Понятно",
    languageTitle: "Выберите язык",
    modeTitle: "Как вы хотите получить инструкции?",
    modeDescription: "Выберите вариант:",
    textButton: "Текст",
    videoButton: "Видео",
    textTitle: "Текстовые инструкции",
    continueLabel: "Продолжить",
    backLabel: "Назад",
    contractTitle: "Номер договора кухни",
    contractHelper: "Введите номер договора покупки.\nВы найдете его на внутренней стороне шкафа под мойкой.",
    contractLabel: "Пожалуйста, введите номер договора:*",
    contractAction: "Подтвердить",
    contractError: "Введенный номер не соответствует активной кухне.",
    contractPrivacyPrefix: "Мы используем номер вашего договора для проверки доступа, обеспечения безопасности и аналитики. Подробнее читайте в нашей ",
    contractPrivacyLink: "политике конфиденциальности",
    contractPrivacySuffix: ".",
  },
};

const INSTRUCTION_TEXTS = {
  de: [
    "Willkommen bei Fragmento by Architecto!",
    "",
    "Wir helfen dir, deine Küche in 4 einfachen und präzisen Schritten zu vervollständigen, mit 100 % Design- und Passgenauigkeitsgarantie.",
    "",
    "So funktioniert es:",
    "",
    "Schritt 1: Scanne den QR-Code. Du findest ihn auf einem Aufkleber am Kochfeld.",
    "Schritt 2: Gib deine Kaufvertragsnummer ein. Du findest sie auf der Innenseite deines Spülenschrankes.",
    "Schritt 3: Wähle die Komponenten aus, die du hinzufügen möchtest.",
    "Schritt 4: Gib deine persönlichen Daten ein und schließe deine Bestellung ab.",
    "",
    "Zusätzlich bieten wir dir:",
    "Professionellen Transport und fachgerechte Montage.",
    "Unterstützung bei Förderanträgen, falls nötig.",
    "",
    "Nach deiner Bestellung ruft dich einer unserer KI-Sprachassistenten an, um alle Details zu bestätigen.",
    "",
    "Einfach. Schnell. Zuverlässig.",
    "Lass uns starten!",
  ].join("\n"),
  en: [
    "Welcome to Fragmento by Architecto!",
    "",
    "We help you complete your kitchen in 4 easy and precise steps, with a 100% design and fit guarantee.",
    "",
    "How it works:",
    "",
    "Step 1: Scan the QR code. You can find it on a sticker on the cooktop.",
    "Step 2: Enter your purchase contract number. You will find it on the inside of your sink cabinet.",
    "Step 3: Choose the components you want to add.",
    "Step 4: Enter your personal details and complete your order.",
    "",
    "Additionally, we offer:",
    "Professional transport and installation.",
    "Support with subsidy applications if needed.",
    "",
    "After your order, one of our AI voice agents calls you to confirm all details.",
    "",
    "Simple. Fast. Reliable.",
    "Let us start!",
  ].join("\n"),
  tr: [
    "Fragmento by Architecto'ya hoş geldiniz!",
    "",
    "Mutfağınızı 4 kolay ve net adımda tamamlamanıza yardımcı oluyoruz.",
    "",
    "Nasıl çalışır:",
    "",
    "Adım 1: QR kodunu tara. Etiketi ocak üstünde bulabilirsin.",
    "Adım 2: Satın alma sözleşme numaranı gir. Evyenin alt dolabının iç kısmına bak.",
    "Adım 3: Eklemek istediğin bileşenleri seç.",
    "Adım 4: Kişisel bilgilerini gir ve siparişini tamamla.",
    "",
    "Ek olarak sunduklar\u0131m\u0131z:",
    "Profesyonel ta\u015f\u0131ma ve montaj.",
    "Gerekirse te\u015fvik ba\u015fvurular\u0131nda destek.",
    "",
    "Sipari\u015finden sonra yapay zeka sesli asistanlar\u0131m\u0131zdan biri seni arayarak t\u00fcm ayr\u0131nt\u0131lar\u0131 onaylar.",
    "",
    "Basit. H\u0131zl\u0131. G\u00fcvenilir.",
    "Ba\u015flayal\u0131m!",
  ].join("\n"),
  es: [
    "¡Bienvenido a Fragmento by Architecto!",
    "",
    "Te ayudamos a completar tu cocina en 4 pasos fáciles y precisos.",
    "",
    "Cómo funciona:",
    "",
    "Paso 1: Escanea el código QR.",
    "Paso 2: Introduce tu número de contrato de compra.",
    "Paso 3: Elige los componentes que quieres añadir.",
    "Paso 4: Introduce tus datos personales y completa tu pedido.",
    "",
    "Adem\u00e1s ofrecemos:",
    "Transporte y montaje profesional.",
    "Apoyo con solicitudes de subvenci\u00f3n si es necesario.",
    "",
    "Despu\u00e9s de tu pedido, uno de nuestros asistentes de voz con IA te llamar\u00e1 para confirmar todos los detalles.",
    "",
    "Simple. R\u00e1pido. Fiable.",
    "\u00a1Empecemos!",
  ].join("\n"),
  fr: [
    "Bienvenue chez Fragmento by Architecto !",
    "",
    "Nous vous aidons à compléter votre cuisine en 4 étapes simples et précises.",
    "",
    "Comment ça marche :",
    "",
    "Étape 1 : Scannez le code QR.",
    "Étape 2 : Saisissez votre numéro de contrat d'achat.",
    "Étape 3 : Choisissez les composants à ajouter.",
    "Étape 4 : Saisissez vos informations personnelles et finalisez la commande.",
    "",
    "Nous proposons aussi :",
    "Transport et montage professionnels.",
    "Aide pour les demandes de subvention si n\u00e9cessaire.",
    "",
    "Apr\u00e8s votre commande, l'un de nos assistants vocaux IA vous appelle pour confirmer tous les d\u00e9tails.",
    "",
    "Simple. Rapide. Fiable.",
    "C'est parti !",
  ].join("\n"),
  ru: [
    "Добро пожаловать в Fragmento by Architecto!",
    "",
    "Мы помогаем завершить вашу кухню за 4 простых шага.",
    "",
    "Как это работает:",
    "",
    "Шаг 1: Отсканируйте QR-код.",
    "Шаг 2: Введите номер договора покупки.",
    "Шаг 3: Выберите компоненты для добавления.",
    "Шаг 4: Введите личные данные и завершите заказ.",
    "",
    "\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u043e \u043c\u044b \u043f\u0440\u0435\u0434\u043b\u0430\u0433\u0430\u0435\u043c:",
    "\u041f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u0443\u044e \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0443 \u0438 \u043c\u043e\u043d\u0442\u0430\u0436.",
    "\u041f\u043e\u043c\u043e\u0449\u044c \u043f\u0440\u0438 \u043f\u043e\u0434\u0430\u0447\u0435 \u0437\u0430\u044f\u0432\u043e\u043a \u043d\u0430 \u0441\u0443\u0431\u0441\u0438\u0434\u0438\u0438 \u043f\u0440\u0438 \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e\u0441\u0442\u0438.",
    "",
    "\u041f\u043e\u0441\u043b\u0435 \u0437\u0430\u043a\u0430\u0437\u0430 \u043e\u0434\u0438\u043d \u0438\u0437 \u043d\u0430\u0448\u0438\u0445 \u0433\u043e\u043b\u043e\u0441\u043e\u0432\u044b\u0445 AI-\u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043d\u0442\u043e\u0432 \u0441\u0432\u044f\u0436\u0435\u0442\u0441\u044f \u0441 \u0432\u0430\u043c\u0438 \u0434\u043b\u044f \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f \u0432\u0441\u0435\u0445 \u0434\u0435\u0442\u0430\u043b\u0435\u0439.",
    "",
    "\u041f\u0440\u043e\u0441\u0442\u043e. \u0411\u044b\u0441\u0442\u0440\u043e. \u041d\u0430\u0434\u0435\u0436\u043d\u043e.",
    "\u041d\u0430\u0447\u0438\u043d\u0430\u0435\u043c!",
  ].join("\n"),
};

const AVATAR_SOURCES = {
  de: `${AVATAR_BASE_PATH}/de-avatar.mp4`,
  en: `${AVATAR_BASE_PATH}/en-avatar.mp4`,
  tr: `${AVATAR_BASE_PATH}/tr-avatar.mp4`,
  es: `${AVATAR_BASE_PATH}/es-avatar.mp4`,
  fr: `${AVATAR_BASE_PATH}/fr-avatar.mp4`,
  ru: `${AVATAR_BASE_PATH}/ru-avatar.mp4`,
};

function mapIntroLanguageToKitchenLanguage(language) {
  return language === "de" ? "de" : "en";
}

function ActionRow({ backLabel, onBack, actionLabel, onAction, submit = false, disabled = false, compact = false }) {
  return (
    <div style={compact ? compactFooterRowStyle : footerRowStyle}>
      <button type="button" style={secondaryButtonStyle} onClick={onBack} disabled={disabled}>
        {backLabel}
      </button>
      <button type={submit ? "submit" : "button"} style={primaryButtonStyle} onClick={onAction} disabled={disabled}>
        {actionLabel}
      </button>
    </div>
  );
}

function formatVideoTime(value) {
  const totalSeconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

const ORDER_CONFIRMED_TEXT = {
  de: {
    title: "Bestellung bestaetigt",
    message: "Vielen Dank. Deine Zahlung wurde bestaetigt und die Bestellbestaetigung wurde versendet. Bitte pruefe auch deinen Spam-Ordner.",
    reference: "Bestellnummer",
  },
  en: {
    title: "Order confirmed",
    message: "Thank you. Your payment was confirmed and the order confirmation has been sent. Please also check your spam or junk folder.",
    reference: "Order number",
  },
  tr: {
    title: "Siparis onaylandi",
    message: "Tesekkurler. Odemeniz onaylandi ve siparis onayi gonderildi. Lutfen spam veya gereksiz posta klasorunu de kontrol edin.",
    reference: "Siparis numarasi",
  },
  es: {
    title: "Pedido confirmado",
    message: "Gracias. Tu pago ha sido confirmado y la confirmacion del pedido ha sido enviada. Revisa tambien tu carpeta de spam o correo no deseado.",
    reference: "Numero de pedido",
  },
  fr: {
    title: "Commande confirmee",
    message: "Merci. Votre paiement a ete confirme et la confirmation de commande a ete envoyee. Verifiez aussi votre dossier spam ou courrier indesirable.",
    reference: "Numero de commande",
  },
  ru: {
    title: "Zakaz podtverzhden",
    message: "Spasibo. Oplata podtverzhdena, i podtverzhdenie zakaza otpravleno. Proverte takzhe papku spam ili nezhelatelnuyu pochtu.",
    reference: "Nomer zakaza",
  },
};

export default function FragmentoEntryFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageOpenTrackedRef = useRef(false);
  const videoRef = useRef(null);
  const repurchaseNoticeRef = useRef(null);
  const [initialEntryState] = useState(() => getLegalReturnEntryState());
  const [selectedLanguage, setSelectedLanguage] = useState(
    initialEntryState?.selectedLanguage || "de"
  );
  const [selectedMode, setSelectedMode] = useState(initialEntryState?.selectedMode || "");
  const [screen, setScreen] = useState(initialEntryState?.screen || "language");
  const [contractNumber, setContractNumber] = useState(initialEntryState?.contractNumber || "");
  const [error, setError] = useState("");
  const [isValidatingContract, setIsValidatingContract] = useState(false);
  const [isOrderConfirmedNoticeDismissed, setIsOrderConfirmedNoticeDismissed] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const text = SCREEN_TEXT[selectedLanguage] || SCREEN_TEXT.en;
  const instructionText = INSTRUCTION_TEXTS[selectedLanguage] || INSTRUCTION_TEXTS.en;
  const avatarSource = AVATAR_SOURCES[selectedLanguage] || AVATAR_SOURCES.en;
  const orderConfirmed = searchParams.get("orderConfirmed") === "1";
  const confirmedOrderNumber = String(searchParams.get("order") || "").trim();
  const orderConfirmedText = ORDER_CONFIRMED_TEXT[selectedLanguage] || ORDER_CONFIRMED_TEXT.en;
  const shouldShowOrderConfirmedNotice = orderConfirmed && !isOrderConfirmedNoticeDismissed && screen === "language";

  useEffect(() => {
    activatePublicLanguage(selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    if (screen !== "video" || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    video.currentTime = 0;
    setVideoCurrentTime(0);
    video.play().catch(() => {
      setIsVideoPlaying(false);
    });
  }, [avatarSource, screen]);

  useEffect(() => {
    if (pageOpenTrackedRef.current) {
      return;
    }

    pageOpenTrackedRef.current = true;
    trackPublicPageOpened(searchParams);
  }, [searchParams]);

  useEffect(() => {
    window.sessionStorage.setItem(
      ENTRY_FLOW_STATE_KEY,
      JSON.stringify({
        selectedLanguage,
        selectedMode,
        screen,
        contractNumber,
      })
    );
  }, [contractNumber, screen, selectedLanguage, selectedMode]);

  function handleLanguageSelect(nextLanguage) {
    persistFragmentoLanguage(nextLanguage);
    setIsOrderConfirmedNoticeDismissed(true);
    setSelectedLanguage(nextLanguage);
    setSelectedMode("");
    setError("");
    setScreen("mode");
  }

  function handleModeSelect(mode) {
    setSelectedMode(mode);
    setError("");
    setScreen(mode);
  }

  function toggleVideoPlayback() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      video.play().catch(() => setIsVideoPlaying(false));
      return;
    }

    video.pause();
  }

  function handleVideoSeek(event) {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const nextTime = Number(event.target.value);
    video.currentTime = nextTime;
    setVideoCurrentTime(nextTime);
  }

  async function handleContractSubmit(event) {
    event.preventDefault();
    const normalizedContractNumber = normalizeContractNumber(contractNumber);
    if (!normalizedContractNumber) {
      setError(selectedLanguage === "de" ? "Die Vertragsnummer ist erforderlich." : text.contractLabel.replace(":*", " is required."));
      return;
    }

    if (isContractRepurchaseRestricted(normalizedContractNumber)) {
      setError("");
      repurchaseNoticeRef.current?.showModal();
      return;
    }

    setIsValidatingContract(true);
    setError("");

    try {
      const response = await fetch("/api/kitchen-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractNumber: normalizedContractNumber,
          ...getPublicTrackingContext(searchParams),
        }),
      });
      const payload = await response.json();

      if (payload.code === REPURCHASE_UNAVAILABLE_CODE || payload.error === REPURCHASE_UNAVAILABLE_MESSAGE) {
        repurchaseNoticeRef.current?.showModal();
        return;
      }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || text.contractError);
      }

      const params = new URLSearchParams({
        contractNumber: payload.contractNumber || normalizedContractNumber,
        lang: mapIntroLanguageToKitchenLanguage(selectedLanguage),
        instructionMode: selectedMode || "text",
      });

      router.push(`/kitchens/${payload.kitchenSlug}?${params.toString()}`);
    } catch (error) {
      setError(error.message || text.contractError);
    } finally {
      setIsValidatingContract(false);
    }
  }

  return (
    <>
      <dialog
        ref={repurchaseNoticeRef}
        className="fragmento-repurchase-notice"
        lang={selectedLanguage || "en"}
        aria-labelledby="repurchase-notice-title"
        aria-describedby="repurchase-notice-message"
        style={{ width: "min(480px, calc(100vw - 40px))", boxSizing: "border-box", padding: "28px", border: "1px solid #eadfd3", borderRadius: "22px", background: "#fffdf9", color: "#302820", boxShadow: "0 24px 70px rgba(0,0,0,0.2)", textAlign: "center", fontFamily: pageStyle.fontFamily }}
      >
        <img src="/img/FIGURA.png" alt="Monteur Frank" style={{ width: "100px", height: "160px", objectFit: "contain" }} />
        <h2 id="repurchase-notice-title" style={{ margin: "12px 0 18px", fontSize: "clamp(26px, 5vw, 34px)", fontWeight: 800, lineHeight: 1.2, textTransform: "uppercase", color: "#8b4d18" }}>{text.repurchaseNoticeTitle}</h2>
        <p id="repurchase-notice-message" style={{ fontSize: "clamp(20px, 4vw, 22px)", fontWeight: 700, lineHeight: 1.5, margin: "0 0 24px", padding: "18px 20px", borderLeft: "4px solid #8b4d18", borderRadius: "10px", background: "#f4e9db", color: "#302820", textAlign: "left", overflowWrap: "break-word" }}>{text.repurchaseNoticeMessage}</p>
        <button type="button" style={primaryButtonStyle} onClick={() => repurchaseNoticeRef.current?.close()}>{text.repurchaseNoticeDismiss}</button>
      </dialog>
      <style>{`.fragmento-repurchase-notice::backdrop { background: rgba(35, 29, 23, 0.45); }`}</style>
      <main style={pageStyle}>
        <style>{responsivePanelMedia}</style>
        <div style={centerWrapStyle}>
        <section style={panelStyle}>
          <Link href="/admin" prefetch={false} style={adminLinkStyle}>
            Admin
          </Link>

          <div style={logoWrapStyle}>
            <img src="/img/fragmentologo.png" alt="Fragmento by architecto." style={logoStyle} />
          </div>

          {shouldShowOrderConfirmedNotice ? (
            <div style={orderConfirmedNoticeStyle} role="status" aria-live="polite">
              <strong style={orderConfirmedTitleStyle}>{orderConfirmedText.title}</strong>
              <span style={orderConfirmedMessageStyle}>{orderConfirmedText.message}</span>
              {confirmedOrderNumber ? (
                <span style={orderConfirmedReferenceStyle}>
                  {orderConfirmedText.reference}: {confirmedOrderNumber}
                </span>
              ) : null}
            </div>
          ) : null}

          {screen === "language" ? (
            <div style={contentAreaStyle}>
              <h2 style={headlineStyle}>{text.languageTitle}</h2>
              <div className="fragmento-entry-panel-grid" style={languageGridStyle}>
                {LANGUAGE_OPTIONS.map((language) => (
                  <button
                    key={language.code}
                    type="button"
                    style={optionButtonStyle}
                    onClick={() => handleLanguageSelect(language.code)}
                  >
                    <img src={language.flagSrc} alt="" aria-hidden="true" style={flagStyle} />
                    <span>{language.label}</span>
                  </button>
                ))}
              </div>
              <div className="fragmento-entry-language-footer" style={languageFooterStyle}>
                <img src="/img/FIGURA.png" alt="" aria-hidden="true" style={languageFigureStyle} />
              </div>
            </div>
          ) : null}

          {screen === "mode" ? (
            <div style={contentAreaStyle}>
              <h2 style={headlineStyle}>{text.modeTitle}</h2>
              <p style={subheadlineStyle}>{text.modeDescription}</p>
              <div style={modeGridStyle}>
                <button type="button" style={modeButtonStyle} onClick={() => handleModeSelect("text")}>
                  {text.textButton}
                </button>
                <button type="button" style={modeButtonStyle} onClick={() => handleModeSelect("video")}>
                  {text.videoButton}
                </button>
              </div>
              <div style={modeBackRowStyle}>
                <button type="button" style={secondaryButtonStyle} onClick={() => setScreen("language")}>
                  {text.backLabel}
                </button>
              </div>
            </div>
          ) : null}

          {screen === "text" ? (
            <div style={contentAreaStyle}>
              <div style={textCardCompactStyle}>
                {instructionText.split("\n").map((line, index) => (
                  <p
                    key={`${selectedLanguage}-${index}`}
                    style={line.trim() ? textLineStyle : textBlankLineStyle}
                    aria-hidden={line.trim() ? undefined : true}
                  >
                    {line}
                  </p>
                ))}
              </div>
              <ActionRow
                backLabel={text.backLabel}
                onBack={() => setScreen("mode")}
                actionLabel={text.continueLabel}
                onAction={() => setScreen("contract")}
                compact
              />
            </div>
          ) : null}

          {screen === "video" ? (
            <div style={contentAreaStyle}>
              <div className="fragmento-entry-video-frame" style={videoFrameStyle}>
                <video
                  key={avatarSource}
                  ref={videoRef}
                  autoPlay
                  playsInline
                  preload="auto"
                  style={videoStyle}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onEnded={() => setIsVideoPlaying(false)}
                  onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration || 0)}
                  onDurationChange={(event) => setVideoDuration(event.currentTarget.duration || 0)}
                  onTimeUpdate={(event) => setVideoCurrentTime(event.currentTarget.currentTime)}
                  onClick={toggleVideoPlayback}
                >
                  <source src={avatarSource} type="video/mp4" />
                </video>
                <button
                  type="button"
                  className="fragmento-entry-video-control"
                  style={videoPlaybackButtonStyle}
                  onClick={toggleVideoPlayback}
                  aria-label={isVideoPlaying ? "Pause video" : "Play video"}
                >
                  <span
                    aria-hidden="true"
                    style={isVideoPlaying ? videoPauseIconStyle : videoPlayIconStyle}
                  />
                </button>
                <div className="fragmento-entry-video-control" style={videoTimelineStyle}>
                  <span style={videoTimeStyle}>{formatVideoTime(videoCurrentTime)}</span>
                  <input
                    type="range"
                    min="0"
                    max={videoDuration || 0}
                    step="0.1"
                    value={Math.min(videoCurrentTime, videoDuration || 0)}
                    onChange={handleVideoSeek}
                    aria-label="Video timeline"
                    style={videoSeekStyle}
                  />
                  <span style={videoTimeStyle}>{formatVideoTime(videoDuration)}</span>
                </div>
              </div>
              <ActionRow
                backLabel={text.backLabel}
                onBack={() => setScreen("mode")}
                actionLabel={text.continueLabel}
                onAction={() => setScreen("contract")}
              />
            </div>
          ) : null}

          {screen === "contract" ? (
            <form style={contentAreaStyle} onSubmit={handleContractSubmit}>
              <h2 style={headlineStyle}>{text.contractTitle}</h2>
              <div style={contractInfoCardStyle}>
                <div style={contractImageWrapStyle}>
                  <img src="/img/sink23.png" alt="Sink cabinet contract number location" style={contractImageStyle} />
                </div>
                <div style={contractHelperWrapStyle}>
                  {text.contractHelper.split("\n").map((line, index) => (
                    <p key={`helper-${index}`} style={contractHelperStyle}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
              <label htmlFor="entry-contract-number" style={contractLabelStyle}>
                {text.contractLabel}
              </label>
              <input
                id="entry-contract-number"
                value={contractNumber}
                onChange={(event) => {
                  setContractNumber(event.target.value);
                  if (error) setError("");
                }}
                disabled={isValidatingContract}
                placeholder="e.g. 670123456"
                style={contractInputStyle}
              />
              <p style={contractPrivacyNoticeStyle}>
                {text.contractPrivacyPrefix}
                <Link href="/datenschutz" target="_blank" rel="noreferrer" style={contractPrivacyLinkStyle}>
                  {text.contractPrivacyLink}
                </Link>
                {text.contractPrivacySuffix}
              </p>
              {error ? <p style={errorStyle}>{error}</p> : null}
              <ActionRow
                backLabel={text.backLabel}
                onBack={() => setScreen(selectedMode || "mode")}
                actionLabel={isValidatingContract ? (selectedLanguage === "de" ? "Wird geprüft..." : "Checking...") : text.contractAction}
                submit
                disabled={isValidatingContract}
              />
            </form>
          ) : null}
          {screen === "mode" || screen === "text" || screen === "contract" ? (
            <img
              className={`fragmento-entry-figure fragmento-entry-figure--${screen}`}
              src="/img/FIGURA.png"
              alt=""
              aria-hidden="true"
              style={
                screen === "video"
                  ? videoFigureStyle
                  : screen === "text"
                    ? textFigureStyle
                    : screen === "contract"
                      ? contractFigureStyle
                      : figureStyle
              }
            />
          ) : null}
        </section>
        </div>
      </main>
      <CookieConsentBanner
        language={selectedLanguage}
        onConsentSaved={({ functional }) => {
          if (functional) persistFragmentoLanguage(selectedLanguage);
        }}
      />
    </>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#f8f7f4",
  fontFamily: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const centerWrapStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  width: "100%",
  padding: "28px 16px",
};

const panelStyle = {
  width: "100%",
  maxWidth: 720,
  minHeight: 480,
  position: "relative",
  background: "linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(252, 246, 238, 0.95) 100%)",
  border: "1px solid rgba(177, 145, 116, 0.22)",
  borderRadius: 18,
  boxShadow: "0 24px 56px rgba(36, 24, 12, 0.22)",
  padding: "10px 16px 16px",
  overflow: "hidden",
};

const adminLinkStyle = {
  position: "absolute",
  top: 18,
  right: 22,
  fontSize: 12,
  color: "#8e6e42",
  textDecoration: "none",
};

const logoWrapStyle = {
  display: "grid",
  placeItems: "center",
  marginTop: 0,
  marginBottom: 8,
};

const logoStyle = {
  width: "min(330px, 70%)",
  height: "auto",
  maxWidth: "100%",
  display: "block",
};

const contentAreaStyle = {
  width: "100%",
  maxWidth: 720,
  margin: "0 auto",
};

const headlineStyle = {
  margin: "0 0 16px",
  textAlign: "center",
  fontSize: "clamp(18px, 2.2vw, 24px)",
  fontWeight: 800,
  color: "#372f29",
  letterSpacing: "0.2px",
};

const orderConfirmedNoticeStyle = {
  display: "grid",
  gap: 5,
  margin: "0 auto 16px",
  maxWidth: 620,
  border: "1px solid rgba(63, 166, 107, 0.28)",
  borderRadius: 8,
  background: "linear-gradient(180deg, rgba(232, 245, 237, 0.96) 0%, rgba(248, 255, 250, 0.94) 100%)",
  color: "#245f3d",
  padding: "12px 14px",
  boxShadow: "0 10px 22px rgba(47, 94, 65, 0.12)",
};

const orderConfirmedTitleStyle = {
  display: "block",
  fontSize: 16,
  lineHeight: 1.25,
  fontWeight: 900,
};

const orderConfirmedMessageStyle = {
  display: "block",
  fontSize: 14,
  lineHeight: 1.45,
  fontWeight: 700,
};

const orderConfirmedReferenceStyle = {
  display: "block",
  fontSize: 13,
  lineHeight: 1.35,
  color: "#2f6f49",
  fontWeight: 900,
  overflowWrap: "anywhere",
};

const subheadlineStyle = {
  margin: "14px 0 0",
  textAlign: "center",
  fontSize: 18,
  color: "#302924",
};

const languageGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))",
  gap: 12,
  marginTop: 0,
};

const optionButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  justifyContent: "flex-start",
  padding: "11px 14px",
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(110, 84, 61, 0.2)",
  background: "linear-gradient(180deg, #fffdf8 0%, #f7ecdf 100%)",
  color: "#372f29",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
};

const flagStyle = {
  width: 24,
  height: 18,
  objectFit: "cover",
  borderRadius: 3,
  boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.12)",
  flexShrink: 0,
};

const modeGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 210px))",
  justifyContent: "center",
  gap: 16,
  marginTop: 34,
};

const modeButtonStyle = {
  padding: "16px 24px",
  borderRadius: 14,
  border: "1px solid #dbc9b1",
  background: "linear-gradient(180deg, #f9f3ea 0%, #f3eadf 100%)",
  color: "#372f29",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
};

const modeBackRowStyle = {
  marginTop: 166,
};

const textCardStyle = {
  minHeight: 340,
  background: "rgba(255, 255, 255, 0.48)",
  padding: "12px 8px 12px 8px",
  color: "#38322b",
};

const textCardCompactStyle = {
  ...textCardStyle,
  minHeight: 0,
  maxWidth: 700,
  margin: "0 auto",
  padding: "8px 6px 4px",
};

const textLineStyle = {
  margin: "0 0 7px",
  fontSize: 16,
  lineHeight: 1.22,
};

const textBlankLineStyle = {
  margin: 0,
  height: 13,
};

const videoFrameStyle = {
  position: "relative",
  width: "100%",
  minHeight: 340,
  borderRadius: 12,
  overflow: "hidden",
  background: "#16120f",
};

const videoStyle = {
  width: "100%",
  display: "block",
  maxHeight: 360,
  cursor: "pointer",
};

const videoPlaybackButtonStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 64,
  height: 64,
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(255, 255, 255, 0.72)",
  borderRadius: "50%",
  background: "rgba(31, 24, 18, 0.7)",
  color: "#ffffff",
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
};

const videoPlayIconStyle = {
  width: 0,
  height: 0,
  marginLeft: 5,
  borderTop: "11px solid transparent",
  borderBottom: "11px solid transparent",
  borderLeft: "17px solid #ffffff",
};

const videoPauseIconStyle = {
  width: 17,
  height: 22,
  borderLeft: "6px solid #ffffff",
  borderRight: "6px solid #ffffff",
};

const videoTimelineStyle = {
  position: "absolute",
  right: 14,
  bottom: 12,
  left: 14,
  display: "grid",
  gridTemplateColumns: "36px minmax(0, 1fr) 36px",
  alignItems: "center",
  gap: 8,
  padding: "7px 10px",
  borderRadius: 10,
  background: "rgba(31, 24, 18, 0.72)",
};

const videoSeekStyle = {
  width: "100%",
  margin: 0,
  cursor: "pointer",
  accentColor: "#c18a45",
};

const videoTimeStyle = {
  color: "#ffffff",
  fontSize: 12,
  fontVariantNumeric: "tabular-nums",
  textAlign: "center",
};

const contractInfoCardStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  alignItems: "center",
  gap: 18,
  marginTop: 22,
  marginBottom: 18,
  background: "rgba(255, 255, 255, 0.45)",
};

const contractImageWrapStyle = {
  display: "grid",
  placeItems: "center",
};

const contractImageStyle = {
  width: 190,
  height: "auto",
  display: "block",
};

const contractHelperWrapStyle = {
  textAlign: "center",
  paddingRight: 8,
};

const contractHelperStyle = {
  margin: "0 0 6px",
  fontSize: 18,
  lineHeight: 1.3,
  color: "#3b332d",
  fontWeight: 700,
};

const contractLabelStyle = {
  display: "block",
  color: "#6a625a",
  fontSize: 15,
  marginBottom: 10,
};

const contractInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 4,
  border: "1px solid #c9c8c6",
  background: "#ffffff",
  padding: "14px 12px",
  fontSize: 16,
  color: "#2f2924",
};

const contractPrivacyNoticeStyle = {
  margin: "9px 0 0",
  color: "#6a625a",
  fontSize: 13,
  lineHeight: 1.45,
};

const contractPrivacyLinkStyle = {
  color: "#76552f",
  fontWeight: 700,
  textDecoration: "underline",
  textUnderlineOffset: 2,
};

const footerRowStyle = {
  marginTop: 42,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
};

const compactFooterRowStyle = {
  ...footerRowStyle,
  marginTop: 30,
};

const secondaryButtonStyle = {
  border: "1px solid #dbc9b1",
  borderRadius: 12,
  background: "linear-gradient(180deg, #fbf5ed 0%, #f1e7db 100%)",
  color: "#372f29",
  padding: "10px 14px",
  fontSize: 16,
  cursor: "pointer",
};

const primaryButtonStyle = {
  border: "none",
  borderRadius: 12,
  background: "#b4712d",
  color: "#fffdf8",
  padding: "12px 20px",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "inset 0 -1px 0 rgba(0, 0, 0, 0.12)",
};

const figureStyle = {
  position: "absolute",
  right: 20,
  bottom: 18,
  width: 66,
  height: "auto",
  pointerEvents: "none",
};

const videoFigureStyle = {
  ...figureStyle,
  right: 26,
  bottom: 72,
  width: 56,
};

const textFigureStyle = {
  ...figureStyle,
  top: 12,
  right: "auto",
  bottom: "auto",
  left: 24,
  width: 90,
  opacity: 0.95,
};

const contractFigureStyle = {
  ...figureStyle,
  top: 4,
  right: "auto",
  bottom: "auto",
  left: 8,
  width: 96,
  opacity: 0.95,
};

const languageFooterStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  marginTop: 16,
  gap: 8,
  width: "100%",
};

const languageFigureStyle = {
  width: 112,
  maxWidth: 112,
  maxHeight: 112,
  height: "auto",
  objectFit: "contain",
  pointerEvents: "none",
};

const responsivePanelMedia = `
  .fragmento-entry-video-control {
    opacity: 0;
    pointer-events: none;
    transition: opacity 160ms ease, background-color 160ms ease;
  }

  .fragmento-entry-video-frame:hover .fragmento-entry-video-control,
  .fragmento-entry-video-frame:focus-within .fragmento-entry-video-control {
    opacity: 1;
    pointer-events: auto;
  }

  @media (max-width: 720px) {
    .fragmento-entry-panel-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }

  @media (max-width: 520px) {
    .fragmento-entry-panel-grid {
      grid-template-columns: 1fr !important;
    }

    .fragmento-entry-language-footer {
      margin-top: 12px !important;
    }

    .fragmento-entry-video-frame {
      min-height: 0 !important;
    }

    .fragmento-entry-figure--text,
    .fragmento-entry-figure--contract {
      top: 18px !important;
      left: 14px !important;
      right: auto !important;
      bottom: auto !important;
      width: 54px !important;
    }
  }
`;

const errorStyle = {
  margin: "8px 0 0",
  color: "#b0382d",
  fontSize: 14,
  fontWeight: 700,
};
