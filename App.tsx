import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartPulse,
  Languages,
  LockKeyhole,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Sun,
  CalendarClock,
  MessageSquare,
  Mic,
  Monitor,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Settings,
  ShieldCheck,
  Stethoscope,
  Smartphone,
  Trash2,
  Upload,
  UserRound,
  Users,
  Volume2,
  XCircle,
} from "lucide-react";

import "./App.css";

// AI provider: Sarvam AI via the backend /api/chat, /api/ocr, and /api/tts endpoints.

/* =========================================================
   TYPES
========================================================= */

type Language = "en" | "hi" | "bn" | "mr" | "te" | "ta";

type Role = "patient" | "doctor" | "admin";

type Screen =
  | "splash"
  | "welcome"
  | "publicMedicines"
  | "role"
  | "careMode"

  // Patient
  | "patientLogin"
  | "patientHome"
  | "patientRecordHistory"
  | "patientEmergency"
  | "patientMedicineOrder"
  | "patientMedicineCart"
  | "patientMedicineAddress"
  | "patientMedicineOrders"
  | "patientConsent"
  | "patientConsultation"
  | "patientDocuments"
  | "patientSummary"
  | "patientHandoff"
  | "patientRetention"
  | "patientAppointmentBooking"
  | "patientUpcomingAppointments"
  | "patientUpcomingAppointmentsAfterEmergency"
  | "patientInformationRetained"
  | "patientPrescription"
  | "patientOrderAddress"
  | "videoCall"

  // Doctor
  | "doctorLogin"
  | "doctorQueue"
  | "doctorPendingReviews"
  | "doctorOtpAuthorization"
  | "doctorOnlineConsultation"
  | "doctorOnlinePrescription"
  | "doctorPatient"
  | "doctorSummary"
  | "doctorDocuments"
  | "doctorReview"
  | "doctorPreviousSummaries"
  | "doctorDecision"

  // Admin
  | "adminLogin"
  | "adminDashboard"
  | "adminAppointmentRegistration"
  | "adminActiveSessions"
  | "adminUsers"
  | "adminKiosks"
  | "adminMonitoring"
  | "adminSecurity"

  | "complete";

const MEDICINE_CATALOG = [
  "Paracetamol 500 mg", "Ibuprofen 200 mg", "Cetirizine 10 mg", "Azithromycin 500 mg",
  "Amoxicillin 500 mg", "Pantoprazole 40 mg", "Omeprazole 20 mg", "Metformin 500 mg",
  "Amlodipine 5 mg", "Losartan 50 mg", "Atorvastatin 10 mg", "Rosuvastatin 10 mg",
  "Levocetirizine 5 mg", "Montelukast 10 mg", "Doxycycline 100 mg", "Cefixime 200 mg",
  "Domperidone 10 mg", "Ondansetron 4 mg", "ORS Sachets", "Calcium Carbonate 500 mg",
  "Vitamin D3 1000 IU", "Vitamin B12 500 mcg", "Iron + Folic Acid", "Folic Acid 5 mg",
  "Diclofenac 50 mg", "Naproxen 250 mg", "Aceclofenac 100 mg", "Mefenamic Acid 500 mg",
  "Loratadine 10 mg", "Fexofenadine 120 mg", "Salbutamol Inhaler", "Budesonide Inhaler",
  "Cough Syrup", "Antacid Suspension", "Lactulose Syrup", "Bisacodyl 5 mg",
  "Isabgol Husk", "Probiotic Capsules", "Multivitamin Tablets", "Zinc 20 mg",
  "Clotrimazole Cream", "Mupirocin Ointment", "Hydrocortisone Cream", "Calamine Lotion",
  "Povidone Iodine Solution", "Chlorhexidine Solution", "Artificial Tears", "Petroleum Jelly",
  "Moisturizing Cream", "Electrolyte Drink Powder"
] as const;

const VOICE_LANGUAGES: Record<Language, string> = {
  en: "en-IN", hi: "hi-IN", bn: "bn-IN", mr: "mr-IN", te: "te-IN", ta: "ta-IN",
};

const VOICE_LABELS: Record<Language, string> = {
  en: "Listen", hi: "सुनें", bn: "শুনুন", mr: "ऐका", te: "వినండి", ta: "கேளுங்கள்",
};

const STOP_LABELS: Record<Language, string> = {
  en: "Stop", hi: "रोकें", bn: "থামুন", mr: "थांबा", te: "ఆపండి", ta: "நிறுத்து",
};

/* =========================================================
   SARVAM AI TEXT-TO-SPEECH
========================================================= */

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? `http://${window.location.hostname}:3001`
    : "http://localhost:3001");

let activeTtsAudio: HTMLAudioElement | null = null;
let activeTtsUrl: string | null = null;

function stopSpeaking() {
  if (activeTtsAudio) {
    activeTtsAudio.pause();
    activeTtsAudio.currentTime = 0;
    activeTtsAudio = null;
  }

  if (activeTtsUrl) {
    URL.revokeObjectURL(activeTtsUrl);
    activeTtsUrl = null;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

async function speakText(
  text: string,
  language: string,
  onEnd?: () => void,
  onError?: () => void,
): Promise<boolean> {
  if (!text?.trim()) return false;

  try {
    stopSpeaking();

    const languageCode =
      VOICE_LANGUAGES[language as Language] || language || "en-IN";

    const response = await fetch(`${API_BASE_URL}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text.trim(),
        language_code: languageCode,
        target_language_code: languageCode,
        language,
        speaker: "shubh",
      }),
    });

    const responseText = await response.text();
    let data: any = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error("The TTS server returned an invalid response.");
    }

    if (!response.ok) {
      throw new Error(
        data?.error || data?.message || `TTS server error: ${response.status}`,
      );
    }

    if (!data?.success) {
      throw new Error(
        data?.error || data?.message || "Sarvam AI could not generate speech.",
      );
    }

    let base64Audio =
      typeof data.audio === "string"
        ? data.audio
        : Array.isArray(data.audios)
          ? data.audios[0]
          : "";

    if (!base64Audio) {
      throw new Error("No voice was received from Sarvam AI.");
    }

    if (base64Audio.includes(",")) {
      base64Audio = base64Audio.split(",").pop() || "";
    }

    base64Audio = base64Audio.replace(/\s/g, "");

    let binaryString = "";
    try {
      binaryString = window.atob(base64Audio);
    } catch {
      throw new Error("Sarvam returned invalid Base64 audio data.");
    }

    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioFormat = String(data.audioFormat || "wav").toLowerCase();
    const mimeType =
      audioFormat === "mp3"
        ? "audio/mpeg"
        : audioFormat === "opus"
          ? "audio/ogg"
          : "audio/wav";

    const audioBlob = new Blob([bytes], { type: mimeType });

    if (audioBlob.size === 0) {
      throw new Error("Sarvam returned an empty audio file.");
    }

    activeTtsUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(activeTtsUrl);
    activeTtsAudio = audio;
    audio.volume = 1;

    audio.onended = () => {
      if (activeTtsUrl) URL.revokeObjectURL(activeTtsUrl);
      activeTtsUrl = null;
      activeTtsAudio = null;
      onEnd?.();
    };

    audio.onerror = () => {
      console.error("[AAYUVORA TTS PLAYBACK ERROR]", audio.error);
      stopSpeaking();
      onError?.();
    };

    await audio.play();
    return true;
  } catch (error) {
    console.error("[AAYUVORA SARVAM TTS ERROR]", error);
    stopSpeaking();
    onError?.();

    alert(
      error instanceof Error
        ? `Voice Error: ${error.message}`
        : "Voice could not be generated.",
    );

    return false;
  }
}

type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    length: number;
    [index: number]: { transcript: string };
  }>;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

function VoiceInputButton({
  language,
  value,
  onChange,
  onListeningChange,
  label,
}: {
  language: Language;
  value: string;
  onChange: (value: string) => void;
  onListeningChange?: (listening: boolean) => void;
  label: string;
}) {
  const [listening, setListening] = useState(false);

  const startListening = () => {
    const Recognition =
      (window as typeof window & {
        SpeechRecognition?: new () => BrowserSpeechRecognition;
        webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
      }).SpeechRecognition ??
      (window as typeof window & {
        SpeechRecognition?: new () => BrowserSpeechRecognition;
        webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
      }).webkitSpeechRecognition;

    if (!Recognition) {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = VOICE_LANGUAGES[language];
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalText = value;
    setListening(true);
    onListeningChange?.(true);

    recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      finalText = transcript.trim();
      onChange(finalText);
    };

    recognition.onerror = () => {
      setListening(false);
      onListeningChange?.(false);
    };

    recognition.onend = () => {
      setListening(false);
      onListeningChange?.(false);
    };

    recognition.start();
  };

  return (
    <button
      type="button"
      className={listening ? "page-voice-button active" : "page-voice-button"}
      onClick={startListening}
      disabled={listening}
      aria-label={label}
    >
      <Mic size={19} />
      {listening ? (
        language === "hi"
          ? "सुन रहा है..."
          : language === "bn"
            ? "শুনছে..."
            : language === "mr"
              ? "ऐकत आहे..."
              : language === "te"
                ? "వింటోంది..."
                : language === "ta"
                  ? "கேட்கிறது..."
                  : "Listening..."
      ) : label}
    </button>
  );
}

function VoiceButton({
  language,
  getText,
}: {
  language: Language;
  getText: () => string;
}) {
  const [speaking, setSpeaking] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const handleClick = async () => {

    // Stop audio if already playing
    if (speaking) {
      stopSpeaking();

      setSpeaking(false);
      setLoading(false);

      return;
    }

    if (loading) {
      return;
    }

    const text = getText();

    if (!text || !text.trim()) {
      alert(
        "There is no text available to read.",
      );

      return;
    }

    setLoading(true);

    const started =
      await speakText(
        text,
        language,

        () => {
          setSpeaking(false);
          setLoading(false);
        },

        () => {
          setSpeaking(false);
          setLoading(false);
        },
      );

    setLoading(false);

    if (started) {
      setSpeaking(true);
    }
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const buttonLabel =
    loading
      ? "Loading..."
      : speaking
        ? STOP_LABELS[language]
        : VOICE_LABELS[language];

  return (
    <button
      type="button"
      className={
        speaking || loading
          ? "page-voice-button active"
          : "page-voice-button"
      }
      data-voice-control="true"
      onClick={handleClick}
      disabled={loading}
      aria-label={buttonLabel}
    >
      <span aria-hidden="true">
        {loading
          ? "⏳"
          : speaking
            ? "⏹"
            : "🔊"}
      </span>

      {buttonLabel}
    </button>
  );
}type Patient = {
  name: string;
  abha: string;
  otp: string;
  patientId: string;
  age: number;
  gender: string;
};

type SavedHealthSummary = {
  id: string;
  patientId: string;
  patientName: string;
  createdAt: string;
  summary: string;
  careMode: "modern" | "ayush";
};

type TemporaryDoctorPatient = {
  name: string;
  patientId: string;
  age: number;
  gender: string;
  phone: string;
  complaint: string;
  symptoms: string;
  duration: string;
  summary: string;
  redFlagDetection: string;
  reviewOfSystems: string;
  careMode: "modern" | "ayush";
  documents: {
    id: number;
    name: string;
    structured: string;
    status: "idle" | "processing" | "done" | "error";
    error: string;
  }[];
};

type DemoPendingReview = {
  name: string; patientId: string; age: number; gender: string; complaint: string; symptoms: string; duration: string; documentsUploaded: string; summary: string; redFlagDetection: string; reviewOfSystems: string;
};

const demoPendingReviews: DemoPendingReview[] = [
  { name: "Rahul Sharma", patientId: "DEMO-1001", age: 32, gender: "Male", complaint: "Fever and cough", symptoms: "Dry cough, fever, tiredness", duration: "3 days", documentsUploaded: "1 document — Previous Prescription.pdf", summary: "AI-Assisted Clinical Summary\n\nChief Complaint: Fever and cough\n\nDuration: 3 days\n\nSymptoms: Dry cough, fever, tiredness\n\nRelevant History: Not provided\n\nDoctor verification required.\n\nRed Flag Detection: No red flags detected based on the information provided.", redFlagDetection: "No red flags detected based on the information provided.", reviewOfSystems: "Constitutional: Fever, tiredness\nRespiratory: Dry cough\nNeurological: Not provided\nCardiovascular: Not provided\nGastrointestinal: Not provided\nMusculoskeletal: Not provided\nIntegumentary: Not provided\nENT / Eyes: Not provided" },
  { name: "Priya Verma", patientId: "DEMO-1002", age: 28, gender: "Female", complaint: "Headache", symptoms: "Headache, light sensitivity", duration: "2 days", documentsUploaded: "No documents uploaded", summary: "AI-Assisted Clinical Summary\n\nChief Complaint: Headache\n\nDuration: 2 days\n\nSymptoms: Headache, light sensitivity\n\nDoctor verification required.\n\nRed Flag Detection: No red flags detected based on the information provided.", redFlagDetection: "No red flags detected based on the information provided.", reviewOfSystems: "Neurological: Headache\nENT / Eyes: Light sensitivity\nConstitutional: Not provided\nCardiovascular: Not provided\nRespiratory: Not provided\nGastrointestinal: Not provided\nMusculoskeletal: Not provided\nIntegumentary: Not provided" },
  { name: "Amit Kumar", patientId: "DEMO-1003", age: 45, gender: "Male", complaint: "Stomach discomfort", symptoms: "Abdominal discomfort, acidity", duration: "1 week", documentsUploaded: "2 documents — Lab Report.pdf, Prescription.pdf", summary: "AI-Assisted Clinical Summary\n\nChief Complaint: Stomach discomfort\n\nDuration: 1 week\n\nSymptoms: Abdominal discomfort, acidity\n\nDoctor verification required.\n\nRed Flag Detection: No red flags detected based on the information provided.", redFlagDetection: "No red flags detected based on the information provided.", reviewOfSystems: "Gastrointestinal: Abdominal discomfort, acidity\nConstitutional: Not provided\nNeurological: Not provided\nCardiovascular: Not provided\nRespiratory: Not provided\nMusculoskeletal: Not provided\nIntegumentary: Not provided\nENT / Eyes: Not provided" },
  { name: "Neha Singh", patientId: "DEMO-1004", age: 34, gender: "Female", complaint: "Back pain", symptoms: "Lower back pain, stiffness", duration: "5 days", documentsUploaded: "1 document — Previous Report.pdf", summary: "AI-Assisted Clinical Summary\n\nChief Complaint: Back pain\n\nDuration: 5 days\n\nSymptoms: Lower back pain, stiffness\n\nDoctor verification required.\n\nRed Flag Detection: No red flags detected based on the information provided.", redFlagDetection: "No red flags detected based on the information provided.", reviewOfSystems: "Musculoskeletal: Lower back pain, stiffness\nConstitutional: Not provided\nNeurological: Not provided\nCardiovascular: Not provided\nRespiratory: Not provided\nGastrointestinal: Not provided\nIntegumentary: Not provided\nENT / Eyes: Not provided" },
  { name: "Sanjay Patel", patientId: "DEMO-1005", age: 52, gender: "Male", complaint: "Breathing discomfort", symptoms: "Breathlessness, cough", duration: "2 days", documentsUploaded: "2 documents — Prescription.pdf, Chest Report.pdf", summary: "AI-Assisted Clinical Summary\n\nChief Complaint: Breathing discomfort\n\nDuration: 2 days\n\nSymptoms: Breathlessness, cough\n\nDoctor verification required.\n\nRed Flag Detection: No red flags detected based on the information provided.", redFlagDetection: "No red flags detected based on the information provided.", reviewOfSystems: "Respiratory: Breathlessness, cough\nConstitutional: Not provided\nNeurological: Not provided\nCardiovascular: Not provided\nGastrointestinal: Not provided\nMusculoskeletal: Not provided\nIntegumentary: Not provided\nENT / Eyes: Not provided" },
  { name: "Anjali Das", patientId: "DEMO-1006", age: 39, gender: "Female", complaint: "Joint pain", symptoms: "Knee pain, morning stiffness", duration: "2 weeks", documentsUploaded: "No documents uploaded", summary: "AI-Assisted Clinical Summary\n\nChief Complaint: Joint pain\n\nDuration: 2 weeks\n\nSymptoms: Knee pain, morning stiffness\n\nDoctor verification required.\n\nRed Flag Detection: No red flags detected based on the information provided.", redFlagDetection: "No red flags detected based on the information provided.", reviewOfSystems: "Musculoskeletal: Knee pain, morning stiffness\nConstitutional: Not provided\nNeurological: Not provided\nCardiovascular: Not provided\nRespiratory: Not provided\nGastrointestinal: Not provided\nIntegumentary: Not provided\nENT / Eyes: Not provided" },
  { name: "Rohan Mehta", patientId: "DEMO-1007", age: 38, gender: "Male", complaint: "Skin irritation", symptoms: "Itching, redness", duration: "4 days", documentsUploaded: "1 document — Previous Prescription.pdf", summary: "AI-Assisted Clinical Summary\n\nChief Complaint: Skin irritation\n\nDuration: 4 days\n\nSymptoms: Itching, redness\n\nDoctor verification required.\n\nRed Flag Detection: No red flags detected based on the information provided.", redFlagDetection: "No red flags detected based on the information provided.", reviewOfSystems: "Integumentary: Itching, redness\nConstitutional: Not provided\nNeurological: Not provided\nCardiovascular: Not provided\nRespiratory: Not provided\nGastrointestinal: Not provided\nMusculoskeletal: Not provided\nENT / Eyes: Not provided" },
];

/* =========================================================
   DEMO PATIENTS
========================================================= */

const demoPatients: Patient[] = [
  {
    name: "Rahul Sharma",
    abha: "11-1111-1111-1111",
    otp: "111111",
    patientId: "DEMO-1001",
    age: 32,
    gender: "Male",
  },
  {
    name: "Priya Verma",
    abha: "22-2222-2222-2222",
    otp: "222222",
    patientId: "DEMO-1002",
    age: 28,
    gender: "Female",
  },
  {
    name: "Aman Kumar",
    abha: "33-3333-3333-3333",
    otp: "333333",
    patientId: "DEMO-1003",
    age: 41,
    gender: "Male",
  },
  {
    name: "Neha Singh",
    abha: "44-4444-4444-4444",
    otp: "444444",
    patientId: "DEMO-1004",
    age: 35,
    gender: "Female",
  },
  {
    name: "Arjun Patel",
    abha: "55-5555-5555-5555",
    otp: "555555",
    patientId: "DEMO-1005",
    age: 45,
    gender: "Male",
  },
  {
    name: "Ananya Das",
    abha: "66-6666-6666-6666",
    otp: "666666",
    patientId: "DEMO-1006",
    age: 26,
    gender: "Female",
  },
  {
    name: "Rohan Mehta",
    abha: "77-7777-7777-7777",
    otp: "777777",
    patientId: "DEMO-1007",
    age: 38,
    gender: "Male",
  },
  {
    name: "Sneha Gupta",
    abha: "88-8888-8888-8888",
    otp: "888888",
    patientId: "DEMO-1008",
    age: 30,
    gender: "Female",
  },
  {
    name: "Vikram Roy",
    abha: "99-9999-9999-9999",
    otp: "999999",
    patientId: "DEMO-1009",
    age: 50,
    gender: "Male",
  },
  {
    name: "Kavya Nair",
    abha: "10-1010-1010-1010",
    otp: "101010",
    patientId: "DEMO-1010",
    age: 24,
    gender: "Female",
  },
  { name: "Meera Kulkarni", abha: "20-2001-2001-2001", otp: "200001", patientId: "AYUSH-2001", age: 36, gender: "Female" },
  { name: "Arjun Iyer", abha: "20-2002-2002-2002", otp: "200002", patientId: "AYUSH-2002", age: 42, gender: "Male" },
  { name: "Kavita Rao", abha: "20-2003-2003-2003", otp: "200003", patientId: "AYUSH-2003", age: 31, gender: "Female" },
  { name: "Vikram Desai", abha: "20-2004-2004-2004", otp: "200004", patientId: "AYUSH-2004", age: 48, gender: "Male" },
  { name: "Nandini Bose", abha: "20-2005-2005-2005", otp: "200005", patientId: "AYUSH-2005", age: 29, gender: "Female" },
  { name: "Ramesh Pillai", abha: "20-2006-2006-2006", otp: "200006", patientId: "AYUSH-2006", age: 55, gender: "Male" },
  { name: "Shalini Menon", abha: "20-2007-2007-2007", otp: "200007", patientId: "AYUSH-2007", age: 40, gender: "Female" },
];

/* =========================================================
   DEMO LOGIN
========================================================= */

const demoDoctor = {
  username: "doctor@Aayuvora.demo",
  password: "doctor123",
};

const demoAyushDoctor = {
  username: "ayurveda@Aayuvora.demo",
  password: "ayurveda123",
};

const demoAyushPendingReviews: DemoPendingReview[] = [
  { name: "Meera Kulkarni", patientId: "AYUSH-2001", age: 36, gender: "Female", complaint: "Digestive discomfort", symptoms: "Bloating, irregular appetite", duration: "2 weeks", documentsUploaded: "1 document — Previous Ayurvedic Prescription.pdf", summary: "AI-Assisted AYUSH Clinical Summary\n\nChief Concern: Digestive discomfort\n\nDuration: 2 weeks\n\nReported Symptoms: Bloating, irregular appetite\n\nDashavidha / AYUSH History: Demo Vata-Pitta prakriti; mild digestive imbalance noted.\n\nAhara-Vihara: Mixed diet; routine requires review.\n\nDoctor verification required.", redFlagDetection: "No red flags detected based on the demo information provided.", reviewOfSystems: "Constitutional: Not provided\nNeurological: Not provided\nCardiovascular: Not provided\nRespiratory: Not provided\nGastrointestinal: Bloating, irregular appetite\nMusculoskeletal: Not provided\nIntegumentary: Not provided\nENT / Eyes: Not provided" },
  { name: "Arjun Iyer", patientId: "AYUSH-2002", age: 42, gender: "Male", complaint: "Joint stiffness", symptoms: "Morning stiffness, knee discomfort", duration: "3 months", documentsUploaded: "No documents uploaded", summary: "AI-Assisted AYUSH Clinical Summary\n\nChief Concern: Joint stiffness\n\nDuration: 3 months\n\nReported Symptoms: Morning stiffness, knee discomfort\n\nDashavidha / AYUSH History: Demo Vata predominance; functional status requires physician assessment.\n\nAhara-Vihara: Sedentary routine reported.\n\nDoctor verification required.", redFlagDetection: "No red flags detected based on the demo information provided.", reviewOfSystems: "Constitutional: Not provided\nNeurological: Not provided\nCardiovascular: Not provided\nRespiratory: Not provided\nGastrointestinal: Not provided\nMusculoskeletal: Morning stiffness, knee discomfort\nIntegumentary: Not provided\nENT / Eyes: Not provided" },
  { name: "Kavita Rao", patientId: "AYUSH-2003", age: 31, gender: "Female", complaint: "Sleep disturbance", symptoms: "Difficulty falling asleep, fatigue", duration: "1 month", documentsUploaded: "1 document — Wellness Notes.pdf", summary: "AI-Assisted AYUSH Clinical Summary\n\nChief Concern: Sleep disturbance\n\nDuration: 1 month\n\nReported Symptoms: Difficulty falling asleep, fatigue\n\nDashavidha / AYUSH History: Demo assessment suggests routine and lifestyle review is needed.\n\nAhara-Vihara: Irregular sleep schedule reported.\n\nDoctor verification required.", redFlagDetection: "No red flags detected based on the demo information provided.", reviewOfSystems: "Constitutional: Fatigue\nNeurological: Sleep disturbance\nCardiovascular: Not provided\nRespiratory: Not provided\nGastrointestinal: Not provided\nMusculoskeletal: Not provided\nIntegumentary: Not provided\nENT / Eyes: Not provided" },
  { name: "Vikram Desai", patientId: "AYUSH-2004", age: 48, gender: "Male", complaint: "Acidity and indigestion", symptoms: "Burning sensation, post-meal discomfort", duration: "10 days", documentsUploaded: "2 documents — Lab Report.pdf, Previous Prescription.pdf", summary: "AI-Assisted AYUSH Clinical Summary\n\nChief Concern: Acidity and indigestion\n\nDuration: 10 days\n\nReported Symptoms: Burning sensation, post-meal discomfort\n\nDashavidha / AYUSH History: Digestive pattern requires Ayurvedic physician review.\n\nAhara-Vihara: Spicy food intake reported.\n\nDoctor verification required.", redFlagDetection: "No red flags detected based on the demo information provided.", reviewOfSystems: "Constitutional: Not provided\nNeurological: Not provided\nCardiovascular: Not provided\nRespiratory: Not provided\nGastrointestinal: Burning sensation, post-meal discomfort\nMusculoskeletal: Not provided\nIntegumentary: Not provided\nENT / Eyes: Not provided" },
  { name: "Nandini Bose", patientId: "AYUSH-2005", age: 29, gender: "Female", complaint: "Recurrent headache", symptoms: "Head heaviness, fatigue", duration: "2 weeks", documentsUploaded: "No documents uploaded", summary: "AI-Assisted AYUSH Clinical Summary\n\nChief Concern: Recurrent headache\n\nDuration: 2 weeks\n\nReported Symptoms: Head heaviness, fatigue\n\nDashavidha / AYUSH History: Demo constitution and lifestyle information recorded for review.\n\nAhara-Vihara: Irregular meals reported.\n\nDoctor verification required.", redFlagDetection: "No red flags detected based on the demo information provided.", reviewOfSystems: "Constitutional: Fatigue\nNeurological: Head heaviness, recurrent headache\nCardiovascular: Not provided\nRespiratory: Not provided\nGastrointestinal: Not provided\nMusculoskeletal: Not provided\nIntegumentary: Not provided\nENT / Eyes: Not provided" },
  { name: "Ramesh Pillai", patientId: "AYUSH-2006", age: 55, gender: "Male", complaint: "General fatigue", symptoms: "Low energy, reduced exercise tolerance", duration: "1 month", documentsUploaded: "1 document — Previous Health Report.pdf", summary: "AI-Assisted AYUSH Clinical Summary\n\nChief Concern: General fatigue\n\nDuration: 1 month\n\nReported Symptoms: Low energy, reduced exercise tolerance\n\nDashavidha / AYUSH History: Demo bala and lifestyle observations require doctor review.\n\nAhara-Vihara: Daily activity reduced.\n\nDoctor verification required.", redFlagDetection: "No red flags detected based on the demo information provided.", reviewOfSystems: "Constitutional: Low energy, fatigue\nNeurological: Not provided\nCardiovascular: Not provided\nRespiratory: Not provided\nGastrointestinal: Not provided\nMusculoskeletal: Reduced exercise tolerance\nIntegumentary: Not provided\nENT / Eyes: Not provided" },
  { name: "Shalini Menon", patientId: "AYUSH-2007", age: 40, gender: "Female", complaint: "Skin dryness and itching", symptoms: "Dry skin, intermittent itching", duration: "3 weeks", documentsUploaded: "1 document — Dermatology Note.pdf", summary: "AI-Assisted AYUSH Clinical Summary\n\nChief Concern: Skin dryness and itching\n\nDuration: 3 weeks\n\nReported Symptoms: Dry skin, intermittent itching\n\nDashavidha / AYUSH History: Demo constitution recorded; skin and lifestyle factors require review.\n\nAhara-Vihara: Hydration and routine information recorded for physician assessment.\n\nDoctor verification required.", redFlagDetection: "No red flags detected based on the demo information provided.", reviewOfSystems: "Constitutional: Not provided\nNeurological: Not provided\nCardiovascular: Not provided\nRespiratory: Not provided\nGastrointestinal: Not provided\nMusculoskeletal: Not provided\nIntegumentary: Dry skin, intermittent itching\nENT / Eyes: Not provided" },
];

const demoAyushPatient = demoAyushPendingReviews[0];

const demoAdmin = {
  username: "admin@Aayuvora.demo",
  password: "admin123",
};

type HospitalDemo = { id: string; name: string; adminId: string; adminPassword: string };
type DoctorDemo = { id: string; username: string; password: string; name: string; hospitalId: string; hospitalName: string; careMode: "modern" | "ayush" };
type AppointmentBooking = {
  appointmentId?: string;
  patientId: string;
  hospitalId: string;
  hospitalName: string;
  doctorId: string;
  doctorName: string;
  careMode: "modern" | "ayush";
  appointmentType: "offline" | "online";
  appointmentDate: string;
  timeSlot: string;
  patientName?: string;
  videoRoomId?: string;
  videoUrl?: string;
  patientPhone?: string;
};

type EmergencyRequest = {
  emergencyId: string; patientId: string; patientName: string; doctorId: string; doctorName: string;
  hospitalId: string; hospitalName: string; careMode: "modern" | "ayush"; videoRoomId: string; videoUrl: string;
  status: "waiting" | "connected" | "completed"; createdAt: string;
};

// Real-time appointment slots: 10-minute slots from 9:00 AM through 1:00 AM.
// The final slot starts at 12:50 AM and ends at 1:00 AM.
const APPOINTMENT_TIME_SLOTS = Array.from({ length: 144 }, (_, index) => {
  const totalMinutes = index * 10;
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  const hour12 = hour24 % 12 || 12;
  const suffix = hour24 >= 12 ? "PM" : "AM";

  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
});

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseAppointmentDateTime = (dateString: string, timeSlot: string) => {
  const match = timeSlot.match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = match[3];
  if (suffix === "PM" && hour !== 12) hour += 12;
  if (suffix === "AM" && hour === 12) hour = 0;
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
};

const isAppointmentActive = (appointment: AppointmentBooking, now = new Date()) => {
  const start = parseAppointmentDateTime(appointment.appointmentDate, appointment.timeSlot);
  if (!start) return false;
  const end = new Date(start.getTime() + 10 * 60 * 1000);
  return now < end;
};

const isAppointmentSlotPast = (dateString: string, timeSlot: string, now = new Date()) => {
  const start = parseAppointmentDateTime(dateString, timeSlot);
  if (!start) return true;
  return start <= now;
};

const DEMO_HOSPITALS: HospitalDemo[] = [
  ["H01", "Aayuvora City Hospital"], ["H02", "Sunrise Multispeciality Hospital"], ["H03", "Eastern Care Hospital"], ["H04", "Green Valley Medical Centre"], ["H05", "Riverfront Health Hospital"],
  ["H06", "Metro Life Hospital"], ["H07", "Shantiniketan Medical Centre"], ["H08", "National Health & Wellness Hospital"], ["H09", "Heritage Care Hospital"], ["H10", "Aayuvora Advanced Care Hospital"],
].map(([id, name]) => ({ id, name, adminId: `${id}-ADMIN`, adminPassword: `${id}Admin@123` }));

const DOCTOR_FIRST_NAMES = ["Aarav", "Diya", "Kabir", "Ananya", "Rohan", "Ishita", "Arjun", "Meera", "Vihaan", "Nandini"];
const AYURVEDIC_FIRST_NAMES = ["Aditya", "Kavya", "Dev", "Asha", "Vedant", "Maya", "Ritvik", "Ira", "Atharv", "Tara"];

const DEMO_DOCTORS: DoctorDemo[] = DEMO_HOSPITALS.flatMap((hospital, hospitalIndex) => {
  const h = String(hospitalIndex + 1).padStart(2, "0");
  const modernRoles = ["General Physician", "Pediatrician", "Cardiology OPD", "Dermatology OPD"];
  const modernDoctors = modernRoles.map((specialty, doctorIndex) => ({
    id: `${hospital.id}-D0${doctorIndex + 1}`, username: `doctor.${h}.0${doctorIndex + 1}@aayuvora.demo`, password: `${hospital.id}Doc0${doctorIndex + 1}@123`,
    name: `Dr. ${DOCTOR_FIRST_NAMES[(hospitalIndex + doctorIndex) % DOCTOR_FIRST_NAMES.length]} (${specialty})`, hospitalId: hospital.id, hospitalName: hospital.name, careMode: "modern" as const,
  }));
  const ayushDoctor: DoctorDemo = { id: `${hospital.id}-D05`, username: `ayurveda.${h}@aayuvora.demo`, password: `${hospital.id}Ayurveda@123`, name: `Dr. ${AYURVEDIC_FIRST_NAMES[hospitalIndex]} (Ayurvedic OPD)`, hospitalId: hospital.id, hospitalName: hospital.name, careMode: "ayush" };
  return [...modernDoctors, ayushDoctor];
});

type AyushDashavidhaKey =
  | "Prakriti"
  | "Vikriti"
  | "Sara"
  | "Samhanana"
  | "Pramana"
  | "Satmya"
  | "Sattva"
  | "Ahara Shakti"
  | "Vyayama Shakti"
  | "Vaya";

const AYUSH_DASHAVIDHA_KEYS: AyushDashavidhaKey[] = [
  "Prakriti",
  "Vikriti",
  "Sara",
  "Samhanana",
  "Pramana",
  "Satmya",
  "Sattva",
  "Ahara Shakti",
  "Vyayama Shakti",
  "Vaya",
];

const AYUSH_DASHAVIDHA_QUESTIONS: Record<
  Language,
  Record<AyushDashavidhaKey, string>
> = {
  en: {
    "Prakriti": "First, let's complete your Dashavidha Pariksha. What would you describe about your Prakriti (your natural constitution)?",
    "Vikriti": "What changes or current imbalances do you notice in your health or body that may relate to your Vikriti?",
    "Sara": "How would you describe the quality or strength of your body's tissues for Sara?",
    "Samhanana": "How would you describe your overall body build or compactness for Samhanana?",
    "Pramana": "Please describe your body measurements or proportions relevant to Pramana, if known.",
    "Satmya": "What foods, routines, climate, or habits suit you well, and what tends not to suit you for Satmya?",
    "Sattva": "How would you describe your mental strength, emotional balance, and resilience for Sattva?",
    "Ahara Shakti": "How would you describe your appetite, digestion, and ability to handle food for Ahara Shakti?",
    "Vyayama Shakti": "How would you describe your stamina and ability to perform physical activity for Vyayama Shakti?",
    "Vaya": "Please tell me your age or describe your current stage of life for Vaya.",
  },
  hi: {
    "Prakriti": "सबसे पहले हम दशविध परीक्षा पूरी करेंगे। आपकी प्रकृति (स्वाभाविक शारीरिक गठन) कैसी है, आप इसे कैसे बताएंगे?",
    "Vikriti": "आप अपने स्वास्थ्य या शरीर में कौन से वर्तमान बदलाव या असंतुलन महसूस करते हैं, जो आपकी विकृति से संबंधित हो सकते हैं?",
    "Sara": "सार के बारे में आप अपने शरीर के ऊतकों की गुणवत्ता या मजबूती को कैसे बताएंगे?",
    "Samhanana": "संहनन के लिए अपने शरीर की बनावट या सघनता को आप कैसे बताएंगे?",
    "Pramana": "यदि ज्ञात हो, तो प्रमाण के लिए अपने शरीर के माप या अनुपात के बारे में बताएं।",
    "Satmya": "कौन से भोजन, दिनचर्या, मौसम या आदतें आपको अच्छी तरह अनुकूल होती हैं और कौन सी नहीं होतीं?",
    "Sattva": "सत्त्व के लिए अपनी मानसिक शक्ति, भावनात्मक संतुलन और सहनशीलता को आप कैसे बताएंगे?",
    "Ahara Shakti": "आहार शक्ति के लिए अपनी भूख, पाचन और भोजन सहन करने की क्षमता को आप कैसे बताएंगे?",
    "Vyayama Shakti": "व्यायाम शक्ति के लिए अपनी सहनशक्ति और शारीरिक गतिविधि करने की क्षमता को आप कैसे बताएंगे?",
    "Vaya": "कृपया अपनी उम्र या जीवन की वर्तमान अवस्था बताएं।",
  },
  bn: {
    "Prakriti": "প্রথমে আমরা দশবিধ পরীক্ষা সম্পূর্ণ করব। আপনার প্রকৃতি বা স্বাভাবিক দেহপ্রকৃতি কেমন, তা কীভাবে বর্ণনা করবেন?",
    "Vikriti": "আপনার স্বাস্থ্য বা শরীরে বর্তমানে কী ধরনের পরিবর্তন বা অসাম্য অনুভব করছেন, যা বিকৃতির সঙ্গে সম্পর্কিত হতে পারে?",
    "Sara": "সারের ক্ষেত্রে আপনার দেহের টিস্যুগুলির গুণমান বা শক্তি কীভাবে বর্ণনা করবেন?",
    "Samhanana": "সংহনের ক্ষেত্রে আপনার সামগ্রিক দেহগঠন বা দৃঢ়তা কীভাবে বর্ণনা করবেন?",
    "Pramana": "জানা থাকলে প্রমাণের জন্য আপনার শরীরের মাপ বা অনুপাত সম্পর্কে বলুন।",
    "Satmya": "কোন খাবার, দৈনন্দিন অভ্যাস, আবহাওয়া বা জীবনযাপন আপনাকে ভালো মানায়, আর কোনগুলো মানায় না?",
    "Sattva": "সত্ত্বের ক্ষেত্রে আপনার মানসিক শক্তি, আবেগীয় ভারসাম্য এবং স্থিতিস্থাপকতা কীভাবে বর্ণনা করবেন?",
    "Ahara Shakti": "আহার শক্তির ক্ষেত্রে আপনার ক্ষুধা, হজমশক্তি এবং খাবার সহ্য করার ক্ষমতা কীভাবে বর্ণনা করবেন?",
    "Vyayama Shakti": "ব্যায়াম শক্তির ক্ষেত্রে আপনার সহনশক্তি এবং শারীরিক কাজ করার ক্ষমতা কীভাবে বর্ণনা করবেন?",
    "Vaya": "দয়া করে আপনার বয়স বা জীবনের বর্তমান পর্যায়টি বলুন।",
  },
  mr: {
    "Prakriti": "सर्वप्रथम आपण दशविध परीक्षा पूर्ण करू. तुमची प्रकृती किंवा नैसर्गिक शरीररचना कशी आहे, ते कसे सांगाल?",
    "Vikriti": "तुमच्या आरोग्यात किंवा शरीरात सध्या कोणते बदल किंवा असंतुलन जाणवते, जे विकृतीशी संबंधित असू शकते?",
    "Sara": "सारासाठी तुमच्या शरीरातील ऊतींची गुणवत्ता किंवा ताकद कशी वर्णन कराल?",
    "Samhanana": "संहननासाठी तुमची एकूण शरीररचना किंवा बांधा कसा वर्णन कराल?",
    "Pramana": "माहित असल्यास प्रमाणासाठी तुमच्या शरीराच्या मापांबद्दल किंवा प्रमाणांबद्दल सांगा.",
    "Satmya": "कोणते अन्न, दिनचर्या, हवामान किंवा सवयी तुम्हाला चांगल्या प्रकारे अनुकूल होतात आणि कोणत्या होत नाहीत?",
    "Sattva": "सत्त्वासाठी तुमची मानसिक ताकद, भावनिक संतुलन आणि तणाव सहन करण्याची क्षमता कशी वर्णन कराल?",
    "Ahara Shakti": "आहार शक्तीसाठी तुमची भूक, पचनशक्ती आणि अन्न सहन करण्याची क्षमता कशी वर्णन कराल?",
    "Vyayama Shakti": "व्यायाम शक्तीसाठी तुमची सहनशक्ती आणि शारीरिक क्रिया करण्याची क्षमता कशी वर्णन कराल?",
    "Vaya": "कृपया तुमचे वय किंवा जीवनातील सध्याची अवस्था सांगा.",
  },
  te: {
    "Prakriti": "ముందుగా మనం దశవిధ పరీక్షను పూర్తి చేస్తాం. మీ ప్రకృతి లేదా సహజ శరీర నిర్మాణాన్ని ఎలా వివరిస్తారు?",
    "Vikriti": "మీ ఆరోగ్యం లేదా శరీరంలో ప్రస్తుతం ఏ మార్పులు లేదా అసమతుల్యతలు కనిపిస్తున్నాయి, అవి వికృతితో సంబంధం కలిగి ఉండవచ్చు?",
    "Sara": "సార గురించి మీ శరీర కణజాలాల నాణ్యత లేదా బలాన్ని ఎలా వివరిస్తారు?",
    "Samhanana": "సంహనన గురించి మీ మొత్తం శరీర నిర్మాణం లేదా గట్టితనాన్ని ఎలా వివరిస్తారు?",
    "Pramana": "తెలిస్తే, ప్రమాణం కోసం మీ శరీర కొలతలు లేదా నిష్పత్తుల గురించి చెప్పండి.",
    "Satmya": "ఏ ఆహారం, రోజువారీ అలవాట్లు, వాతావరణం లేదా జీవనశైలి మీకు బాగా సరిపోతాయి, ఏవి సరిపోవు?",
    "Sattva": "సత్త్వం గురించి మీ మానసిక బలం, భావోద్వేగ సమతుల్యత మరియు స్థైర్యాన్ని ఎలా వివరిస్తారు?",
    "Ahara Shakti": "ఆహార శక్తి గురించి మీ ఆకలి, జీర్ణశక్తి మరియు ఆహారాన్ని సహించే సామర్థ్యాన్ని ఎలా వివరిస్తారు?",
    "Vyayama Shakti": "వ్యాయామ శక్తి గురించి మీ సహనశక్తి మరియు శారీరక కార్యకలాపాలు చేసే సామర్థ్యం గురించి వివరాలు.",
    "Vaya": "దయచేసి మీ వయస్సు లేదా జీవితంలోని ప్రస్తుత దశను చెప్పండి.",
  },
  ta: {
    "Prakriti": "முதலில் தசவித பரீக்ஷாவை முடிப்போம். உங்கள் பிரகிருதி அல்லது இயல்பான உடல் அமைப்பை எவ்வாறு விவரிப்பீர்கள்?",
    "Vikriti": "உங்கள் உடல்நலம் அல்லது உடலில் தற்போது எந்த மாற்றங்கள் அல்லது சமநிலையின்மைகள் உள்ளன, அவை விகிருதியுடன் தொடர்புடையதாக இருக்கலாம்?",
    "Sara": "சாரா குறித்து உங்கள் உடல் திசுக்களின் தரம் அல்லது வலிமையை எவ்வாறு விவரிப்பீர்கள்?",
    "Samhanana": "சம்ஹனன குறித்து உங்கள் மொத்த உடல் அமைப்பு அல்லது உறுதியை எவ்வாறு விவரிப்பீர்கள்?",
    "Pramana": "தெரிந்தால், பிரமாணத்திற்காக உங்கள் உடல் அளவுகள் அல்லது விகிதங்களைப் பற்றி சொல்லுங்கள்.",
    "Satmya": "எந்த உணவுகள், தினசரி பழக்கங்கள், காலநிலை அல்லது வாழ்க்கைமுறை உங்களுக்கு ஏற்றவை, எவை ஏற்றதாக இல்லை?",
    "Sattva": "சத்த்வம் குறித்து உங்கள் மனவலிமை, உணர்ச்சி சமநிலை மற்றும் மனத்திட்பத்தை எவ்வாறு விவரிப்பீர்கள்?",
    "Ahara Shakti": "ஆஹார சக்தி குறித்து உங்கள் பசி, ஜீரண சக்தி மற்றும் உணவைத் தாங்கும் திறனை எவ்வாறு விவரிப்பீர்கள்?",
    "Vyayama Shakti": "வ்யாயாம சக்தி குறித்து உங்கள் சகிப்புத்தன்மை மற்றும் உடற்பயிற்சி செய்யும் திறனை எவ்வாறு விவரிப்பீர்கள்?",
    "Vaya": "தயவுசெய்து உங்கள் வயது அல்லது வாழ்க்கையின் தற்போதைய நிலையைச் சொல்லுங்கள்.",
  },
};

const AYUSH_GENERAL_TRANSITION: Record<Language, string> = {
  en: "Thank you. We have completed the Dashavidha Pariksha. Now I will ask the remaining health-history questions, including your main concern, current symptoms, past history, medicines or allergies, family history, personal history, and relevant Ahara-Vihara details.",
  hi: "धन्यवाद। दशविध परीक्षा पूरी हो गई है। अब मैं आपकी मुख्य समस्या, वर्तमान लक्षण, पिछले इतिहास, दवाओं या एलर्जी, पारिवारिक इतिहास, व्यक्तिगत इतिहास और संबंधित आहार-विहार के बारे में अन्य प्रश्न पूछूंगा।",
  bn: "ধন্যবাদ। দশবিধ পরীক্ষা সম্পূর্ণ হয়েছে। এখন আমি আপনার প্রধান সমস্যা, বর্তমান উপসর্গ, পূর্ব ইতিহাস, ওষুধ বা অ্যালার্জি, পারিবারিক ইতিহাস, ব্যক্তিগত ইতিহাস এবং প্রাসঙ্গিক আহার-বিহার সম্পর্কে আরও প্রশ্ন করব।",
  mr: "धन्यवाद. दशविध परीक्षा पूर्ण झाली आहे. आता मी तुमची मुख्य समस्या, सध्याची लक्षणे, पूर्व इतिहास, औषधे किंवा ऍलर्जी, कौटुंबिक इतिहास, वैयक्तिक इतिहास आणि संबंधित आहार-विहाराबद्दल इतर प्रश्न विचारेन.",
  te: "ధన్యవాదాలు. దశవిధ పరీక్ష పూర్తైంది. ఇప్పుడు మీ ప్రధాన సమస్య, ప్రస్తుత లక్షణాలు, గత చరిత్ర, మందులు లేదా అలర్జీలు, కుటుంబ చరిత్ర, వ్యక్తిగత చరిత్ర మరియు సంబంధిత ఆహార-విహార వివరాల గురించి మిగిలిన ప్రశ్నలు అడుగుతాను.",
  ta: "நன்றி. தசவித பரீக்ஷா முடிந்துவிட்டது. இப்போது உங்கள் முக்கிய பிரச்சனை, தற்போதைய அறிகுறிகள், முந்தைய மருத்துவ வரலாறு, மருந்துகள் அல்லது அலர்ஜிகள், குடும்ப வரலாறு, தனிப்பட்ட வரலாறு மற்றும் தொடர்புடைய ஆகார-விஹார விவரங்கள் பற்றி மீதமுள்ள கேள்விகளை கேட்பேன்.",
};

const SUMMARY_EXPLANATIONS: Record<
  Language,
  Record<string, string>
> = {
  en: {
    patient: "The patient whose information was collected during this session.",
    patientId: "The internal patient identifier used by the workflow.",
    dashavidha: "The ten-part Ayurvedic assessment collected during the AYUSH history sequence.",
    Prakriti: "Describes the patient's reported natural constitution or baseline body-mind characteristics.",
    Vikriti: "Describes current changes or perceived imbalances reported by the patient.",
    Sara: "Describes the reported quality and strength of body tissues.",
    Samhanana: "Describes overall body build, structure, or compactness.",
    Pramana: "Captures reported body measurements or proportions when available.",
    Satmya: "Describes foods, routines, climate, or habits that suit or do not suit the patient.",
    Sattva: "Describes reported mental strength, emotional balance, and resilience.",
    "Ahara Shakti": "Describes appetite, digestion, and the reported ability to handle food.",
    "Vyayama Shakti": "Describes stamina and the reported ability to perform physical activity.",
    Vaya: "Describes the patient's age or current stage of life.",
    aharaVihara: "Summarizes relevant diet, daily routine, sleep, activity, and lifestyle information reported during intake.",
    complaint: "The main health concern or reason for seeking the consultation.",
    duration: "How long the reported problem or symptoms have been present, when this information was collected.",
    symptoms: "Other symptoms the patient reported in addition to the main concern.",
    history: "Relevant past, family, personal, medication, or allergy history collected during intake.",
    documents: "A record of any prescription, lab report, or other medical document uploaded for review.",
    ocr: "Information extracted from the uploaded document for review; the original document should be checked for accuracy.",
  },
  hi: {
    patient: "इस सत्र में एकत्र की गई जानकारी किस रोगी की है।",
    patientId: "इस workflow में उपयोग किया गया आंतरिक रोगी पहचानकर्ता।",
    dashavidha: "दशविध परीक्षा आयुर्वेदिक इतिहास के दौरान एकत्र किया गया दस-भागीय आकलन है।",
    Prakriti: "रोगी द्वारा बताई गई प्राकृतिक प्रकृति या शरीर-मन की मूल विशेषताएँ।",
    Vikriti: "रोगी द्वारा बताए गए वर्तमान बदलाव या संभावित असंतुलन।",
    Sara: "शरीर के ऊतकों की बताई गई गुणवत्ता और मजबूती।",
    Samhanana: "शरीर की कुल बनावट, संरचना या सघनता का वर्णन।",
    Pramana: "उपलब्ध होने पर बताए गए शरीर के माप या अनुपात।",
    Satmya: "ऐसे भोजन, दिनचर्या, मौसम या आदतें जो रोगी को अनुकूल या प्रतिकूल लगती हैं।",
    Sattva: "मानसिक शक्ति, भावनात्मक संतुलन और सहनशीलता का बताया गया विवरण।",
    "Ahara Shakti": "भूख, पाचन और भोजन सहन करने की बताई गई क्षमता।",
    "Vyayama Shakti": "सहनशक्ति और शारीरिक गतिविधि करने की बताई गई क्षमता।",
    Vaya: "रोगी की आयु या जीवन की वर्तमान अवस्था।",
    aharaVihara: "आहार, दिनचर्या, नींद, गतिविधि और जीवनशैली से संबंधित जानकारी का संक्षेप।",
    complaint: "मुख्य स्वास्थ्य समस्या या परामर्श लेने का कारण।",
    duration: "समस्या या लक्षण कितने समय से हैं, जब यह जानकारी उपलब्ध हो।",
    symptoms: "मुख्य समस्या के अलावा रोगी द्वारा बताए गए अन्य लक्षण।",
    history: "पिछले, पारिवारिक, व्यक्तिगत, दवा या एलर्जी इतिहास की प्रासंगिक जानकारी।",
    documents: "अपलोड की गई प्रिस्क्रिप्शन, लैब रिपोर्ट या अन्य चिकित्सा दस्तावेज़ का रिकॉर्ड।",
    ocr: "दस्तावेज़ से निकाली गई जानकारी; सटीकता के लिए मूल दस्तावेज़ की जाँच आवश्यक है।",
  },
  bn: {
    patient: "এই সেশনে সংগৃহীত তথ্য কোন রোগীর তা বোঝায়।",
    patientId: "এই workflow-এ ব্যবহৃত অভ্যন্তরীণ রোগী শনাক্তকারী।",
    dashavidha: "দশবিধ পরীক্ষা হলো AYUSH ইতিহাসের সময় সংগৃহীত দশ-অংশের আয়ুর্বেদিক মূল্যায়ন।",
    Prakriti: "রোগীর বর্ণিত স্বাভাবিক দেহ-মন প্রকৃতি বা মৌলিক বৈশিষ্ট্য।",
    Vikriti: "রোগীর বর্ণিত বর্তমান পরিবর্তন বা সম্ভাব্য অসাম্য।",
    Sara: "দেহের টিস্যুর গুণমান ও শক্তির বর্ণনা।",
    Samhanana: "সামগ্রিক দেহগঠন, কাঠামো বা দৃঢ়তার বর্ণনা।",
    Pramana: "উপলব্ধ থাকলে রোগীর বলা শারীরিক মাপ বা অনুপাত।",
    Satmya: "যে খাবার, রুটিন, আবহাওয়া বা অভ্যাস রোগীর জন্য উপযোগী বা অনুপযোগী বলে মনে হয়।",
    Sattva: "মানসিক শক্তি, আবেগীয় ভারসাম্য ও স্থিতিস্থাপকতার বর্ণনা।",
    "Ahara Shakti": "ক্ষুধা, হজম এবং খাবার সহ্য করার ক্ষমতার বর্ণনা।",
    "Vyayama Shakti": "সহনশীলতা ও শারীরিক কার্যকলাপ করার ক্ষমতার বর্ণনা।",
    Vaya: "রোগীর বয়স বা জীবনের বর্তমান পর্যায়।",
    aharaVihara: "খাদ্যাভ্যাস, দৈনন্দিন রুটিন, ঘুম, কার্যকলাপ ও জীবনযাপনের প্রাসঙ্গিক তথ্যের সারাংশ।",
    complaint: "প্রধান স্বাস্থ্য সমস্যা বা পরামর্শ নেওয়ার কারণ।",
    duration: "সমস্যা বা উপসর্গ কতদিন ধরে আছে, যখন তথ্যটি পাওয়া গেছে।",
    symptoms: "প্রধান সমস্যার পাশাপাশি রোগীর উল্লেখ করা অন্যান্য উপসর্গ।",
    history: "প্রাসঙ্গিক পূর্ব, পারিবারিক, ব্যক্তিগত, ওষুধ বা অ্যালার্জির ইতিহাস।",
    documents: "আপলোড করা প্রেসক্রিপশন, ল্যাব রিপোর্ট বা অন্যান্য চিকিৎসা নথির রেকর্ড।",
    ocr: "নথি থেকে বের করা তথ্য; নির্ভুলতার জন্য মূল নথি যাচাই করা উচিত।",
  },
  mr: {
    patient: "या सत्रात गोळा केलेली माहिती कोणत्या रुग्णाची आहे.",
    patientId: "या workflow मध्ये वापरलेला अंतर्गत रुग्ण ओळखकर्ता.",
    dashavidha: "दशविध परीक्षा म्हणजे AYUSH इतिहासाच्या क्रमात घेतलेले दहा भागांचे आयुर्वेदिक मूल्यांकन.",
    Prakriti: "रुग्णाने सांगितलेली नैसर्गिक प्रकृती किंवा शरीर-मनाची मूलभूत वैशिष्ट्ये.",
    Vikriti: "रुग्णाने सांगितलेले सध्याचे बदल किंवा संभाव्य असंतुलन.",
    Sara: "शरीरातील ऊतींची सांगितलेली गुणवत्ता आणि ताकद.",
    Samhanana: "एकूण शरीररचना, बांधा किंवा सघनतेचे वर्णन.",
    Pramana: "उपलब्ध असल्यास सांगितलेली शरीराची मापे किंवा प्रमाण.",
    Satmya: "रुग्णाला अनुकूल किंवा प्रतिकूल वाटणारे अन्न, दिनचर्या, हवामान किंवा सवयी.",
    Sattva: "मानसिक ताकद, भावनिक संतुलन आणि तणाव सहनशक्तीचे वर्णन.",
    "Ahara Shakti": "भूक, पचनशक्ती आणि अन्न सहन करण्याची सांगितलेली क्षमता.",
    "Vyayama Shakti": "सहनशक्ती आणि शारीरिक क्रिया करण्याच्या क्षमतेचे वर्णन.",
    Vaya: "रुग्णाचे वय किंवा जीवनातील सध्याची अवस्था.",
    aharaVihara: "आहार, दिनचर्या, झोप, हालचाल आणि जीवनशैलीशी संबंधित माहितीचा सारांश.",
    complaint: "मुख्य आरोग्य समस्या किंवा सल्ला घेण्याचे कारण.",
    duration: "समस्या किंवा लक्षणे किती काळापासून आहेत, माहिती उपलब्ध असल्यास.",
    symptoms: "मुख्य समस्येसोबत रुग्णाने सांगितलेली इतर लक्षणे.",
    history: "भूतकाळ, कौटुंबिक, वैयक्तिक, औषधे किंवा ऍलर्जीशी संबंधित माहिती.",
    documents: "अपलोड केलेल्या प्रिस्क्रिप्शन, लॅब रिपोर्ट किंवा इतर वैद्यकीय कागदपत्रांची नोंद.",
    ocr: "कागदपत्रातून काढलेली माहिती; अचूकतेसाठी मूळ कागदपत्र तपासावे.",
  },
  te: {
    patient: "ఈ సెషన్‌లో సేకరించిన సమాచారం ఏ రోగికి సంబంధించినదో చూపిస్తుంది.",
    patientId: "ఈ workflowలో ఉపయోగించే అంతర్గత రోగి గుర్తింపు.",
    dashavidha: "దశవిధ పరీక్ష అనేది AYUSH చరిత్రలో సేకరించే పది భాగాల ఆయుర్వేద మూల్యాంకనం.",
    Prakriti: "రోగి వివరించిన సహజ ప్రకృతి లేదా శరీర-మనస్సు యొక్క ప్రాథమిక లక్షణాలు.",
    Vikriti: "రోగి వివరించిన ప్రస్తుత మార్పులు లేదా కనిపించే అసమతుల్యతలు.",
    Sara: "శరీర కణజాలాల నాణ్యత మరియు బలంపై చెప్పబడిన వివరాలు.",
    Samhanana: "మొత్తం శరీర నిర్మాణం, ఆకృతి లేదా దృఢత్వం.",
    Pramana: "తెలిస్తే రోగి తెలిపిన శరీర కొలతలు లేదా నిష్పత్తులు.",
    Satmya: "రోగికి అనుకూలంగా లేదా అననుకూలంగా అనిపించే ఆహారం, దినచర్య, వాతావరణం లేదా అలవాట్లు.",
    Sattva: "మానసిక బలం, భావోద్వేగ సమతుల్యత మరియు స్థైర్యం గురించి వివరాలు.",
    "Ahara Shakti": "ఆకలి, జీర్ణశక్తి మరియు ఆహారాన్ని సహించే సామర్థ్యం గురించి వివరాలు.",
    "Vyayama Shakti": "సహనశక్తి మరియు శారీరక కార్యకలాపాలు చేసే సామర్థ్యం గురించి వివరాలు.",
    Vaya: "రోగి వయస్సు లేదా జీవితంలోని ప్రస్తుత దశ.",
    aharaVihara: "ఆహారం, దినచర్య, నిద్ర, కార్యకలాపాలు మరియు జీవనశైలికి సంబంధించిన ముఖ్యమైన సమాచారం.",
    complaint: "ప్రధాన ఆరోగ్య సమస్య లేదా సంప్రదింపుకు కారణం.",
    duration: "సమస్య లేదా లక్షణాలు ఎంతకాలంగా ఉన్నాయో, సమాచారం లభ్యమైతే.",
    symptoms: "ప్రధాన సమస్యతో పాటు రోగి తెలిపిన ఇతర లక్షణాలు.",
    history: "గత, కుటుంబ, వ్యక్తిగత, మందులు లేదా అలర్జీలకు సంబంధించిన ముఖ్యమైన చరిత్ర.",
    documents: "అప్‌లోడ్ చేసిన ప్రిస్క్రిప్షన్, ల్యాబ్ రిపోర్ట్ లేదా ఇతర వైద్య పత్రాల రికార్డు.",
    ocr: "పత్రం నుండి తీసుకున్న సమాచారం; ఖచ్చితత్వం కోసం అసలు పత్రాన్ని తనిఖీ చేయాలి.",
  },
  ta: {
    patient: "இந்த அமர்வில் சேகரிக்கப்பட்ட தகவல் எந்த நோயாளிக்கானது என்பதை காட்டுகிறது.",
    patientId: "இந்த workflow பயன்படுத்தும் உள் நோயாளர் அடையாளம்.",
    dashavidha: "தசவித பரீக்ஷா என்பது AYUSH வரலாற்று முறையில் சேகரிக்கப்படும் பத்து பகுதிகளைக் கொண்ட ஆயுர்வேத மதிப்பீடு.",
    Prakriti: "நோயாளி கூறிய இயற்கை பிரகிருதி அல்லது உடல்-மனத்தின் அடிப்படை பண்புகள்.",
    Vikriti: "நோயாளி கூறிய தற்போதைய மாற்றங்கள் அல்லது சாத்தியமான சமநிலையின்மைகள்.",
    Sara: "உடல் திசுக்களின் தரம் மற்றும் வலிமை பற்றிய விளக்கம்.",
    Samhanana: "மொத்த உடல் அமைப்பு, கட்டமைப்பு அல்லது உறுதியின் விளக்கம்.",
    Pramana: "தெரிந்திருந்தால் நோயாளி கூறிய உடல் அளவுகள் அல்லது விகிதங்கள்.",
    Satmya: "நோயாளிக்கு ஏற்றதாக அல்லது ஏற்றதல்லாததாக உணரப்படும் உணவுகள், தினசரி பழக்கங்கள், காலநிலை அல்லது வாழ்க்கைமுறை.",
    Sattva: "மன வலிமை, உணர்ச்சி சமநிலை மற்றும் மனத்திட்பம் பற்றிய விளக்கம்.",
    "Ahara Shakti": "பசி, ஜீரண சக்தி மற்றும் உணவைத் தாங்கும் திறன் பற்றிய விளக்கம்.",
    "Vyayama Shakti": "சகிப்புத்தன்மை மற்றும் உடற்பயிற்சி/உடல் செயல்பாடு செய்யும் திறன் பற்றிய விளக்கம்.",
    Vaya: "நோயாளியின் வயது அல்லது வாழ்க்கையின் தற்போதைய நிலை.",
    aharaVihara: "ஆகார வழக்கம், தினசரி நடைமுறை, தூக்கம், செயல்பாடு மற்றும் வாழ்க்கைமுறை தொடர்பான முக்கிய தகவல்களின் சுருக்கம்.",
    complaint: "முக்கிய உடல்நலப் பிரச்சனை அல்லது ஆலோசனை பெறுவதற்கான காரணம்.",
    duration: "பிரச்சனை அல்லது அறிகுறிகள் எவ்வளவு காலமாக உள்ளன என்பதைக் காட்டுகிறது, தகவல் கிடைத்தால்.",
    symptoms: "முக்கிய பிரச்சனைக்கு மேலாக நோயாளி கூறிய பிற அறிகுறிகள்.",
    history: "முந்தைய, குடும்ப, தனிப்பட்ட, மருந்து அல்லது அலர்ஜி வரலாற்றில் பொருத்தமான தகவல்கள்.",
    documents: "பதிவேற்றப்பட்ட மருந்துச் சீட்டு, ஆய்வக அறிக்கை அல்லது பிற மருத்துவ ஆவணங்களின் பதிவு.",
    ocr: "ஆவணத்திலிருந்து எடுக்கப்பட்ட தகவல்; துல்லியத்திற்காக அசல் ஆவணத்தை சரிபார்க்க வேண்டும்.",
  },
};

const CARE_MODE_COPY: Record<
  Language,
  {
    title: string;
    description: string;
    modernTitle: string;
    modernDescription: string;
    ayushTitle: string;
    ayushDescription: string;
    ayushBadge: string;
  }
> = {
  en: {
    title: "Choose Care Mode",
    description: "Select the history-taking workflow for your consultation.",
    modernTitle: "Modern Clinical History",
    modernDescription: "Standard clinical history and AI-assisted pre-consultation.",
    ayushTitle: "AYUSH / Ayurvedic History",
    ayushDescription: "Ayurvedic history with Dashavidha Pariksha and Ahara-Vihara assessment.",
    ayushBadge: "AYUSH OPD",
  },
  hi: {
    title: "देखभाल का तरीका चुनें",
    description: "अपनी परामर्श प्रक्रिया के लिए इतिहास लेने का तरीका चुनें।",
    modernTitle: "आधुनिक क्लिनिकल इतिहास",
    modernDescription: "मानक क्लिनिकल इतिहास और AI-सहायित प्री-कंसल्टेशन।",
    ayushTitle: "AYUSH / आयुर्वेदिक इतिहास",
    ayushDescription: "दशविध परीक्षा और आहार-विहार आकलन सहित आयुर्वेदिक इतिहास।",
    ayushBadge: "AYUSH OPD",
  },
  bn: {
    title: "কেয়ার মোড নির্বাচন করুন",
    description: "আপনার পরামর্শের জন্য ইতিহাস নেওয়ার পদ্ধতি নির্বাচন করুন।",
    modernTitle: "আধুনিক ক্লিনিক্যাল ইতিহাস",
    modernDescription: "মানক ক্লিনিক্যাল ইতিহাস ও AI-সহায়িত প্রি-কনসালটেশন।",
    ayushTitle: "AYUSH / আয়ুর্বেদিক ইতিহাস",
    ayushDescription: "দশবিধ পরীক্ষা ও আহার-বিহার মূল্যায়নসহ আয়ুর্বেদিক ইতিহাস।",
    ayushBadge: "AYUSH OPD",
  },
  mr: {
    title: "केअर मोड निवडा",
    description: "तुमच्या सल्लामसलतीसाठी इतिहास घेण्याची पद्धत निवडा.",
    modernTitle: "आधुनिक क्लिनिकल इतिहास",
    modernDescription: "मानक क्लिनिकल इतिहास आणि AI-सहाय्यित प्री-कन्सल्टेशन.",
    ayushTitle: "AYUSH / आयुर्वेदिक इतिहास",
    ayushDescription: "दशविध परीक्षा आणि आहार-विहार मूल्यांकनासह आयुर्वेदिक इतिहास.",
    ayushBadge: "AYUSH OPD",
  },
  te: {
    title: "కేర్ మోడ్ ఎంచుకోండి",
    description: "మీ సంప్రదింపుకు చరిత్ర తీసుకునే విధానాన్ని ఎంచుకోండి.",
    modernTitle: "ఆధునిక క్లినికల్ చరిత్ర",
    modernDescription: "ప్రామాణిక క్లినికల్ చరిత్ర మరియు AI-సహాయక ప్రీ-కన్సల్టేషన్.",
    ayushTitle: "AYUSH / ఆయుర్వేద చరిత్ర",
    ayushDescription: "దశవిధ పరీక్ష మరియు ఆహార-విహార అంచనాతో ఆయుర్వేద చరిత్ర.",
    ayushBadge: "AYUSH OPD",
  },
  ta: {
    title: "பராமரிப்பு முறையைத் தேர்ந்தெடுக்கவும்",
    description: "உங்கள் ஆலோசனைக்கான வரலாறு சேகரிப்பு முறையைத் தேர்ந்தெடுக்கவும்.",
    modernTitle: "நவீன மருத்துவ வரலாறு",
    modernDescription: "தரநிலை மருத்துவ வரலாறு மற்றும் AI உதவியுடன் முன் ஆலோசனை.",
    ayushTitle: "AYUSH / ஆயுர்வேத வரலாறு",
    ayushDescription: "தசவித பரீக்ஷா மற்றும் ஆகார-விஹார மதிப்பீட்டுடன் ஆயுர்வேத வரலாறு.",
    ayushBadge: "AYUSH OPD",
  },
};

/* =========================================================
   ADDITIONAL LANGUAGES
   Keeps the original English/Hindi translation logic intact.
========================================================= */

const additionalTranslations: Record<
  "bn" | "mr" | "te" | "ta",
  Record<string, Record<string, string>>
> = {
  bn: {
    role: {
      title: "আপনি কে?",
      description: "সঠিক Aayuvora workflow খুলতে আপনার ভূমিকা নির্বাচন করুন।",
      patient: "রোগী",
      patientDescription: "পরামর্শ শুরু করুন, স্বাস্থ্য তথ্য দিন এবং আপনার অনুমোদিত রেকর্ড দেখুন।",
      doctor: "ডাক্তার",
      doctorDescription: "অনুমোদিত রোগীর তথ্য পর্যালোচনা করুন এবং ক্লিনিক্যাল workflow সম্পূর্ণ করুন।",
      admin: "অ্যাডমিন",
      adminDescription: "ইউজার, ডিভাইস, সিস্টেম এবং নিরাপত্তা পরিচালনা করুন।",
    },
    language: {
      title: "আপনার ভাষা নির্বাচন করুন",
      description: "Aayuvora ব্যবহারের জন্য আপনার পছন্দের ভাষা নির্বাচন করুন।",
      continue: "এগিয়ে যান",
    },
    patientLogin: {
      title: "আপনার ABHA সংযুক্ত করুন",
      description: "আপনার পরিচয় নিরাপদে যাচাই করতে ABHA তথ্য দিন।",
      abha: "ABHA নম্বর",
      otp: "OTP",
      abhaPlaceholder: "XX-XXXX-XXXX-XXXX",
      otpPlaceholder: "OTP দিন",
      verify: "যাচাই করে এগিয়ে যান",
      demo: "ডেমো মোড",
      demoText: "এই প্রোটোটাইপ কাল্পনিক রোগী ক্রেডেনশিয়াল ব্যবহার করে।",
      wrong: "ভুল ক্রেডেনশিয়াল",
      demoCredentials: "ডেমো ক্রেডেনশিয়াল",
    },
    consent: {
      title: "শুরু করার আগে",
      description: "আপনার পরামর্শের প্রস্তুতির জন্য Aayuvora আপনার বর্তমান স্বাস্থ্য সমস্যা সম্পর্কিত তথ্য সংগ্রহ করবে।",
      point1: "আপনি স্বাভাবিকভাবে বলতে পারেন বা স্ক্রিন ব্যবহার করে উত্তর দিতে পারেন।",
      point2: "Aayuvora প্রয়োজন অনুযায়ী অতিরিক্ত প্রশ্ন করতে পারে।",
      point3: "আপনি প্রাসঙ্গিক চিকিৎসা নথি দিতে পারেন।",
      consent: "আপনার তথ্য সম্মতিভিত্তিক workflow অনুযায়ী পরিচালিত হবে।",
      continue: "পরামর্শ শুরু করুন",
    },
    consultation: {
      title: "AI স্বাস্থ্য পরামর্শ",
      assistant: "Aayuvora AI",
      subtitle: "ক্লিনিক্যাল তথ্য সহকারী",
      greeting: "নমস্কার। আজ আপনাকে এখানে নিয়ে আসা স্বাস্থ্য সমস্যাটি সম্পর্কে বলুন।",
      followUp: "ধন্যবাদ। এই সমস্যাটি কতদিন ধরে হচ্ছে?",
      placeholder: "আপনার স্বাস্থ্য সমস্যা বর্ণনা করুন...",
      speak: "বলুন",
      send: "পাঠান",
      continue: "এগিয়ে যান",
      back: "পেছনে",
    },
    documents: {
      title: "চিকিৎসা নথি যোগ করুন",
      description: "প্রাসঙ্গিক প্রেসক্রিপশন, ল্যাব রিপোর্ট বা ডিসচার্জ নথি যোগ করুন।",
      upload: "নথি আপলোড করুন",
      fileTypes: "PDF, JPG বা PNG",
      continue: "সারাংশে যান",
      skip: "নথি বাদ দিন",
    },
    summary: {
      title: "Aayuvora আপনার সারাংশ প্রস্তুত করেছে",
      heading: "AI-সহায়িত ক্লিনিক্যাল সারাংশ",
      patient: "রোগী",
      patientId: "রোগী ID",
      complaint: "প্রধান সমস্যা",
      duration: "সময়কাল",
      symptoms: "সম্পর্কিত উপসর্গ",
      history: "পূর্ব ইতিহাস",
      documents: "নথি",
      unavailable: "উপলব্ধ নয়",
      warning: "এটি AI-সহায়িত খসড়া। ডাক্তারকে তথ্য পর্যালোচনা ও যাচাই করতে হবে।",
      sendDoctor: "ডাক্তারের পর্যালোচনায় পাঠান",
    },
    handoff: {
      title: "তথ্য ডাক্তার পর্যালোচনার জন্য পাঠানো হয়েছে",
      prepared: "রোগীর তথ্য প্রস্তুত",
      summary: "AI-সহায়িত সারাংশ প্রস্তুত",
      documents: "যেখানে দেওয়া হয়েছে সেখানে নথি সংযুক্ত করা হয়েছে",
      continue: "এগিয়ে যান",
    },
    retention: {
      title: "আপনার তথ্য, আপনার পছন্দ",
      description: "আপনার পরামর্শ সম্পূর্ণ হয়েছে। পরামর্শের তথ্য রাখা হবে কি না নির্বাচন করুন।",
      store: "আমার তথ্য সংরক্ষণ করুন",
      storeDescription: "অনুমোদিত workflow অনুযায়ী অনুমোদিত পরামর্শের তথ্য সংরক্ষণ করুন।",
      delete: "আমার কথোপকথন সংরক্ষণ করবেন না",
      deleteDescription: "প্রযোজ্য ডেটা-রিটেনশন নীতি অনুযায়ী সেশনের পরে অস্থায়ী কথোপকথনের বিষয়বস্তু সরিয়ে দিন।",
      privacy: "নিরাপত্তা ও পরিচালনার জন্য প্রয়োজনীয় ন্যূনতম প্রযুক্তিগত বা অডিট তথ্য রাখা হতে পারে।",
      storedTitle: "তথ্য সংরক্ষিত হয়েছে",
      storedMessage: "আপনার অনুমোদিত পরামর্শের তথ্য নির্বাচিত workflow অনুযায়ী সংরক্ষণ করা হয়েছে।",
      deletedTitle: "কথোপকথন সরানো হয়েছে",
      deletedMessage: "অস্থায়ী পরামর্শের বিষয়বস্তু রোগী সেশন থেকে সরিয়ে দেওয়া হয়েছে।",
      finish: "শেষ করুন",
    },
    doctor: {
      login: "ডাক্তার লগইন",
      loginDescription: "আপনার অনুমোদিত রোগী ড্যাশবোর্ডে প্রবেশ করতে লগইন করুন।",
      username: "ইউজারনেম",
      password: "পাসওয়ার্ড",
      queue: "রোগী কিউ",
      today: "আজকের রোগী",
      pending: "পর্যালোচনা বাকি",
      open: "খুলুন",
      details: "রোগীর তথ্য",
      patient: "রোগী",
      age: "বয়স",
      gender: "লিঙ্গ",
      complaint: "প্রধান সমস্যা",
      viewSummary: "AI সারাংশ দেখুন",
      aiSummary: "AI-সহায়িত ক্লিনিক্যাল সারাংশ",
      viewDocuments: "নথি দেখুন",
      documents: "রোগীর নথি",
      uploaded: "আপলোড করা নথি",
      openDocument: "নথি খুলুন",
      continueReview: "পর্যালোচনায় এগিয়ে যান",
      review: "পর্যালোচনা ও সংশোধন",
      approve: "অনুমোদন করে এগিয়ে যান",
      decision: "চূড়ান্ত চিকিৎসা সিদ্ধান্ত",
      reviewed: "রোগীর তথ্য পর্যালোচনা করা হয়েছে",
      verified: "AI সারাংশ যাচাই করা হয়েছে",
      source: "মূল নথি পর্যালোচনা করা হয়েছে",
      complete: "পরামর্শ সম্পূর্ণ করুন",
      previousPrescription: "Previous Prescription.pdf",
    },
    admin: {
      login: "অ্যাডমিন লগইন",
      loginDescription: "Aayuvora প্ল্যাটফর্ম পরিচালনা করতে লগইন করুন।",
      username: "ইউজারনেম",
      password: "পাসওয়ার্ড",
      dashboard: "অ্যাডমিন ড্যাশবোর্ড",
      patients: "রোগী",
      doctors: "ডাক্তার",
      kiosks: "কিয়স্ক",
      activeSessions: "সক্রিয় সেশন",
      usersRoles: "ইউজার ও ভূমিকা",
      usersDescription: "অ্যাকাউন্ট ও অনুমতি পরিচালনা করুন",
      kioskManagement: "কিয়স্ক ব্যবস্থাপনা",
      kioskDescription: "হাসপাতালের ডিভাইসগুলোর নজরদারি করুন",
      monitoring: "সিস্টেম মনিটরিং",
      monitoringDescription: "প্ল্যাটফর্মের স্বাস্থ্য ও পরিসংখ্যান",
      security: "নিরাপত্তা ও অডিট",
      securityDescription: "নিরাপত্তা ঘটনা ও অডিট লগ",
      patientUsers: "রোগী",
      doctorUsers: "ডাক্তার",
      administrators: "অ্যাডমিনিস্ট্রেটর",
      view: "দেখুন",
      manage: "পরিচালনা করুন",
      kiosk01: "কিয়স্ক 01",
      kiosk02: "কিয়স্ক 02",
      kiosk03: "কিয়স্ক 03",
      kiosk04: "কিয়স্ক 04",
      online1: "OPD ফ্লোর 1 • অনলাইন",
      online2: "OPD ফ্লোর 1 • অনলাইন",
      offline: "OPD ফ্লোর 2 • অফলাইন",
      maintenance: "রেজিস্ট্রেশন • রক্ষণাবেক্ষণ",
      monitor: "নজরদারি",
      systemStatus: "সিস্টেম অবস্থা",
      healthy: "সুস্থ",
      activeUsers: "সক্রিয় ইউজার",
      aiSessions: "AI সেশন",
      onlineKiosks: "অনলাইন কিয়স্ক",
      authentication: "অথেন্টিকেশন ইভেন্ট",
      failedLogins: "3টি ব্যর্থ লগইন প্রচেষ্টা শনাক্ত হয়েছে",
      accessControl: "অ্যাক্সেস কন্ট্রোল",
      roleBased: "ভূমিকা-ভিত্তিক অনুমতি সক্রিয়",
      auditLogging: "অডিট লগিং",
      logging: "সংবেদনশীল সিস্টেম ইভেন্ট লগ করা হচ্ছে",
      accessNote: "অ্যাডমিন অ্যাকাউন্ট ও অনুমতি পরিচালনা করে, তবে রোগীর ক্লিনিক্যাল রেকর্ডে স্বয়ংক্রিয়ভাবে সীমাহীন অ্যাক্সেস পায় না।",
    },
  },
  mr: {
    role: { title: "तुम्ही कोण आहात?", description: "योग्य Aayuvora workflow उघडण्यासाठी तुमची भूमिका निवडा.", patient: "रुग्ण", patientDescription: "सल्ला सुरू करा, आरोग्य माहिती द्या आणि तुमचे परवानगीचे रेकॉर्ड पहा.", doctor: "डॉक्टर", doctorDescription: "अधिकृत रुग्ण माहितीचे पुनरावलोकन करा आणि क्लिनिकल workflow पूर्ण करा.", admin: "अॅडमिन", adminDescription: "वापरकर्ते, डिव्हाइस, सिस्टम आणि सुरक्षा व्यवस्थापित करा." },
    language: { title: "तुमची भाषा निवडा", description: "Aayuvora वापरण्यासाठी तुमची पसंतीची भाषा निवडा.", continue: "पुढे जा" },
    patientLogin: { title: "तुमचे ABHA जोडा", description: "तुमची ओळख सुरक्षितपणे पडताळण्यासाठी ABHA तपशील वापरा.", abha: "ABHA क्रमांक", otp: "OTP", abhaPlaceholder: "XX-XXXX-XXXX-XXXX", otpPlaceholder: "OTP प्रविष्ट करा", verify: "पडताळा आणि पुढे जा", demo: "डेमो मोड", demoText: "हा प्रोटोटाइप काल्पनिक रुग्ण क्रेडेन्शियल वापरतो.", wrong: "चुकीचे क्रेडेन्शियल", demoCredentials: "डेमो क्रेडेन्शियल" },
    consent: { title: "सुरुवात करण्यापूर्वी", description: "तुमच्या सल्ल्याची तयारी करण्यासाठी Aayuvora तुमच्या सध्याच्या आरोग्य समस्येबद्दल माहिती गोळा करेल.", point1: "तुम्ही नैसर्गिकपणे बोलू शकता किंवा स्क्रीन वापरून उत्तर देऊ शकता.", point2: "Aayuvora आवश्यकतेनुसार पुढील प्रश्न विचारू शकते.", point3: "तुम्ही संबंधित वैद्यकीय कागदपत्रे देऊ शकता.", consent: "तुमची माहिती संमती-आधारित workflow नुसार हाताळली जाईल.", continue: "सल्ला सुरू करा" },
    consultation: { title: "AI आरोग्य सल्ला", assistant: "Aayuvora AI", subtitle: "क्लिनिकल माहिती सहाय्यक", greeting: "नमस्कार. आज तुम्हाला येथे कोणती आरोग्य समस्या घेऊन आली आहे ते सांगा.", followUp: "धन्यवाद. ही समस्या तुम्हाला किती काळापासून आहे?", placeholder: "तुमची आरोग्य समस्या सांगा...", speak: "बोला", send: "पाठवा", continue: "पुढे जा", back: "मागे" },
    documents: { title: "वैद्यकीय कागदपत्रे जोडा", description: "संबंधित प्रिस्क्रिप्शन, लॅब रिपोर्ट किंवा डिस्चार्ज कागदपत्र जोडा.", upload: "कागदपत्र अपलोड करा", fileTypes: "PDF, JPG किंवा PNG", continue: "सारांशाकडे जा", skip: "कागदपत्रे वगळा" },
    summary: { title: "Aayuvora ने तुमचा सारांश तयार केला आहे", heading: "AI-सहाय्यित क्लिनिकल सारांश", patient: "रुग्ण", patientId: "रुग्ण ID", complaint: "मुख्य तक्रार", duration: "कालावधी", symptoms: "संबंधित लक्षणे", history: "मागील इतिहास", documents: "कागदपत्रे", unavailable: "उपलब्ध नाही", warning: "हा AI-सहाय्यित मसुदा आहे. डॉक्टरांनी माहितीचे पुनरावलोकन व पडताळणी करणे आवश्यक आहे.", sendDoctor: "डॉक्टर पुनरावलोकनासाठी पाठवा" },
    handoff: { title: "माहिती डॉक्टरांच्या पुनरावलोकनासाठी पाठवली आहे", prepared: "रुग्णाची माहिती तयार आहे", summary: "AI-सहाय्यित सारांश तयार आहे", documents: "जिथे दिले आहेत तिथे कागदपत्रे जोडली आहेत", continue: "पुढे जा" },
    retention: { title: "तुमची माहिती, तुमची निवड", description: "तुमचा सल्ला पूर्ण झाला आहे. सल्ल्याची माहिती ठेवायची की नाही ते निवडा.", store: "माझी माहिती साठवा", storeDescription: "अधिकृत workflow नुसार परवानगी दिलेली सल्ला माहिती ठेवा.", delete: "माझे संभाषण साठवू नका", deleteDescription: "लागू डेटा-रिटेन्शन धोरणानुसार सत्रानंतर तात्पुरती संभाषण माहिती हटवा.", privacy: "सुरक्षा आणि ऑपरेशन्ससाठी आवश्यक किमान तांत्रिक किंवा ऑडिट माहिती ठेवली जाऊ शकते.", storedTitle: "माहिती साठवली", storedMessage: "तुमची परवानगी दिलेली सल्ला माहिती निवडलेल्या workflow नुसार साठवली आहे.", deletedTitle: "संभाषण हटवले", deletedMessage: "तात्पुरती सल्ला माहिती रुग्ण सत्रातून काढली आहे.", finish: "पूर्ण करा" },
    doctor: { login: "डॉक्टर लॉगिन", loginDescription: "तुमच्या अधिकृत रुग्ण डॅशबोर्डमध्ये प्रवेश करण्यासाठी लॉगिन करा.", username: "वापरकर्ता नाव", password: "पासवर्ड", queue: "रुग्ण रांग", today: "आजचे रुग्ण", pending: "पुनरावलोकन प्रलंबित", open: "उघडा", details: "रुग्ण तपशील", patient: "रुग्ण", age: "वय", gender: "लिंग", complaint: "मुख्य तक्रार", viewSummary: "AI सारांश पहा", aiSummary: "AI-सहाय्यित क्लिनिकल सारांश", viewDocuments: "कागदपत्रे पहा", documents: "रुग्ण कागदपत्रे", uploaded: "अपलोड केलेले कागदपत्र", openDocument: "कागदपत्र उघडा", continueReview: "पुनरावलोकनाकडे जा", review: "पुनरावलोकन आणि दुरुस्ती", approve: "मंजूर करून पुढे जा", decision: "अंतिम वैद्यकीय निर्णय", reviewed: "रुग्ण माहितीचे पुनरावलोकन झाले", verified: "AI सारांश पडताळला", source: "मूळ कागदपत्र तपासले", complete: "सल्ला पूर्ण करा", previousPrescription: "Previous Prescription.pdf" },
    admin: { login: "अॅडमिन लॉगिन", loginDescription: "Aayuvora प्लॅटफॉर्म व्यवस्थापित करण्यासाठी लॉगिन करा.", username: "वापरकर्ता नाव", password: "पासवर्ड", dashboard: "अॅडमिन डॅशबोर्ड", patients: "रुग्ण", doctors: "डॉक्टर", kiosks: "किओस्क", activeSessions: "सक्रिय सत्र", usersRoles: "वापरकर्ते आणि भूमिका", usersDescription: "खाती आणि परवानग्या व्यवस्थापित करा", kioskManagement: "किओस्क व्यवस्थापन", kioskDescription: "रुग्णालयातील उपकरणांवर लक्ष ठेवा", monitoring: "सिस्टम मॉनिटरिंग", monitoringDescription: "प्लॅटफॉर्म आरोग्य आणि आकडेवारी", security: "सुरक्षा आणि ऑडिट", securityDescription: "सुरक्षा घटना आणि ऑडिट लॉग", patientUsers: "रुग्ण", doctorUsers: "डॉक्टर", administrators: "अॅडमिनिस्ट्रेटर", view: "पहा", manage: "व्यवस्थापित करा", kiosk01: "किओस्क 01", kiosk02: "किओस्क 02", kiosk03: "किओस्क 03", kiosk04: "किओस्क 04", online1: "OPD मजला 1 • ऑनलाइन", online2: "OPD मजला 1 • ऑनलाइन", offline: "OPD मजला 2 • ऑफलाइन", maintenance: "नोंदणी • देखभाल", monitor: "निगराणी", systemStatus: "सिस्टम स्थिती", healthy: "सुरळीत", activeUsers: "सक्रिय वापरकर्ते", aiSessions: "AI सत्रे", onlineKiosks: "ऑनलाइन किओस्क", authentication: "ऑथेंटिकेशन इव्हेंट", failedLogins: "3 अयशस्वी लॉगिन प्रयत्न आढळले", accessControl: "अॅक्सेस कंट्रोल", roleBased: "भूमिका-आधारित परवानग्या सक्रिय", auditLogging: "ऑडिट लॉगिंग", logging: "संवेदनशील सिस्टम घटना लॉग केल्या जात आहेत", accessNote: "अॅडमिन खाती आणि परवानग्या व्यवस्थापित करतो, पण रुग्णांच्या क्लिनिकल रेकॉर्डला आपोआप अमर्यादित प्रवेश मिळत नाही." },
  },
  te: {
    role: { title: "మీరు ఎవరు?", description: "సరైన Aayuvora workflow తెరవడానికి మీ పాత్రను ఎంచుకోండి.", patient: "రోగి", patientDescription: "సంప్రదింపును ప్రారంభించి, ఆరోగ్య సమాచారాన్ని అందించి, మీకు అనుమతించబడిన రికార్డులను చూడండి.", doctor: "డాక్టర్", doctorDescription: "అధీకృత రోగి సమాచారాన్ని సమీక్షించి క్లినికల్ workflow ను పూర్తి చేయండి.", admin: "అడ్మిన్", adminDescription: "వినియోగదారులు, పరికరాలు, సిస్టమ్ మరియు భద్రతను నిర్వహించండి." },
    language: { title: "మీ భాషను ఎంచుకోండి", description: "Aayuvora ఉపయోగించడానికి మీకు ఇష్టమైన భాషను ఎంచుకోండి.", continue: "కొనసాగించండి" },
    patientLogin: { title: "మీ ABHAను కనెక్ట్ చేయండి", description: "మీ గుర్తింపును సురక్షితంగా ధృవీకరించడానికి ABHA వివరాలను ఉపయోగించండి.", abha: "ABHA నంబర్", otp: "OTP", abhaPlaceholder: "XX-XXXX-XXXX-XXXX", otpPlaceholder: "OTP నమోదు చేయండి", verify: "ధృవీకరించి కొనసాగండి", demo: "డెమో మోడ్", demoText: "ఈ ప్రోటోటైప్ కల్పిత రోగి క్రెడెన్షియల్స్‌ను ఉపయోగిస్తుంది.", wrong: "తప్పు క్రెడెన్షియల్స్", demoCredentials: "డెమో క్రెడెన్షియల్స్" },
    consent: { title: "ప్రారంభించే ముందు", description: "మీ సంప్రదింపుకు సిద్ధం చేయడానికి Aayuvora మీ ప్రస్తుత ఆరోగ్య సమస్య గురించి సమాచారాన్ని సేకరిస్తుంది.", point1: "మీరు సహజంగా మాట్లాడవచ్చు లేదా స్క్రీన్‌ను ఉపయోగించి సమాధానం ఇవ్వవచ్చు.", point2: "Aayuvora అవసరమైతే సంబంధిత తదుపరి ప్రశ్నలను అడగవచ్చు.", point3: "మీరు సంబంధిత వైద్య పత్రాలను అందించవచ్చు.", consent: "మీ సమాచారం సమ్మతి ఆధారిత workflow ద్వారా నిర్వహించబడుతుంది.", continue: "సంప్రదింపును ప్రారంభించండి" },
    consultation: { title: "AI ఆరోగ్య సంప్రదింపు", assistant: "Aayuvora AI", subtitle: "క్లినికల్ సమాచార సహాయకుడు", greeting: "నమస్కారం. ఈ రోజు మిమ్మల్ని ఇక్కడికి తీసుకువచ్చిన ఆరోగ్య సమస్య ఏమిటో చెప్పండి.", followUp: "ధన్యవాదాలు. ఈ సమస్య ఎంతకాలంగా ఉంది?", placeholder: "మీ ఆరోగ్య సమస్యను వివరించండి...", speak: "మాట్లాడండి", send: "పంపండి", continue: "కొనసాగించండి", back: "వెనక్కి" },
    documents: { title: "వైద్య పత్రాలను జోడించండి", description: "సంబంధిత ప్రిస్క్రిప్షన్, ల్యాబ్ రిపోర్ట్ లేదా డిశ్చార్జ్ పత్రాన్ని జోడించండి.", upload: "పత్రాన్ని అప్‌లోడ్ చేయండి", fileTypes: "PDF, JPG లేదా PNG", continue: "సారాంశానికి కొనసాగండి", skip: "పత్రాలను దాటవేయండి" },
    summary: { title: "Aayuvora మీ సారాంశాన్ని సిద్ధం చేసింది", heading: "AI-సహాయక క్లినికల్ సారాంశం", patient: "రోగి", patientId: "రోగి ID", complaint: "ప్రధాన సమస్య", duration: "వ్యవధి", symptoms: "సంబంధిత లక్షణాలు", history: "మునుపటి చరిత్ర", documents: "పత్రాలు", unavailable: "అందుబాటులో లేదు", warning: "ఇది AI-సహాయక డ్రాఫ్ట్. డాక్టర్ సమాచారాన్ని సమీక్షించి ధృవీకరించాలి.", sendDoctor: "డాక్టర్ సమీక్షకు పంపండి" },
    handoff: { title: "సమాచారం డాక్టర్ సమీక్షకు పంపబడింది", prepared: "రోగి సమాచారం సిద్ధంగా ఉంది", summary: "AI-సహాయక సారాంశం సిద్ధంగా ఉంది", documents: "అందించిన చోట పత్రాలు జత చేయబడ్డాయి", continue: "కొనసాగించండి" },
    retention: { title: "మీ సమాచారం, మీ ఎంపిక", description: "మీ సంప్రదింపు పూర్తయింది. సంప్రదింపు సమాచారాన్ని నిల్వ చేయాలా వద్దా ఎంచుకోండి.", store: "నా సమాచారాన్ని నిల్వ చేయండి", storeDescription: "అధీకృత workflow ప్రకారం అనుమతించబడిన సంప్రదింపు సమాచారాన్ని ఉంచండి.", delete: "నా సంభాషణను నిల్వ చేయవద్దు", deleteDescription: "వర్తించే డేటా రిటెన్షన్ విధానం ప్రకారం సెషన్ తర్వాత తాత్కాలిక సంభాషణ కంటెంట్‌ను తొలగించండి.", privacy: "భద్రత మరియు కార్యకలాపాల కోసం అవసరమైన కనీస సాంకేతిక లేదా ఆడిట్ సమాచారం నిల్వ చేయబడవచ్చు.", storedTitle: "సమాచారం నిల్వ చేయబడింది", storedMessage: "మీ అనుమతించబడిన సంప్రదింపు సమాచారం ఎంపిక చేసిన workflow ప్రకారం నిల్వ చేయబడింది.", deletedTitle: "సంభాషణ తొలగించబడింది", deletedMessage: "తాత్కాలిక సంప్రదింపు కంటెంట్ రోగి సెషన్ నుండి తొలగించబడింది.", finish: "ముగించండి" },
    doctor: { login: "డాక్టర్ లాగిన్", loginDescription: "మీ అధీకృత రోగి డ్యాష్‌బోర్డ్‌ను యాక్సెస్ చేయడానికి లాగిన్ అవ్వండి.", username: "వినియోగదారు పేరు", password: "పాస్‌వర్డ్", queue: "రోగి క్యూ", today: "ఈరోజు రోగులు", pending: "పెండింగ్ సమీక్ష", open: "తెరవండి", details: "రోగి వివరాలు", patient: "రోగి", age: "వయస్సు", gender: "లింగం", complaint: "ప్రధాన సమస్య", viewSummary: "AI సారాంశాన్ని చూడండి", aiSummary: "AI-సహాయక క్లినికల్ సారాంశం", viewDocuments: "పత్రాలను చూడండి", documents: "రోగి పత్రాలు", uploaded: "అప్‌లోడ్ చేసిన పత్రం", openDocument: "పత్రాన్ని తెరవండి", continueReview: "సమీక్షకు కొనసాగండి", review: "సమీక్ష & సవరణ", approve: "ఆమోదించి కొనసాగండి", decision: "తుది వైద్య నిర్ణయం", reviewed: "రోగి సమాచారం సమీక్షించబడింది", verified: "AI సారాంశం ధృవీకరించబడింది", source: "మూల పత్రం సమీక్షించబడింది", complete: "సంప్రదింపును పూర్తి చేయండి", previousPrescription: "Previous Prescription.pdf" },
    admin: { login: "అడ్మిన్ లాగిన్", loginDescription: "Aayuvora ప్లాట్‌ఫారమ్‌ను నిర్వహించడానికి లాగిన్ అవ్వండి.", username: "వినియోగదారు పేరు", password: "పాస్‌వర్డ్", dashboard: "అడ్మిన్ డ్యాష్‌బోర్డ్", patients: "రోగులు", doctors: "డాక్టర్లు", kiosks: "కియోస్క్‌లు", activeSessions: "క్రియాశీల సెషన్లు", usersRoles: "వినియోగదారులు & పాత్రలు", usersDescription: "ఖాతాలు మరియు అనుమతులను నిర్వహించండి", kioskManagement: "కియోస్క్ నిర్వహణ", kioskDescription: "ఆసుపత్రి పరికరాలను పర్యవేక్షించండి", monitoring: "సిస్టమ్ మానిటరింగ్", monitoringDescription: "ప్లాట్‌ఫారమ్ ఆరోగ్యం మరియు గణాంకాలు", security: "భద్రత & ఆడిట్", securityDescription: "భద్రతా సంఘటనలు మరియు ఆడిట్ లాగ్‌లు", patientUsers: "రోగులు", doctorUsers: "డాక్టర్లు", administrators: "అడ్మినిస్ట్రేటర్లు", view: "చూడండి", manage: "నిర్వహించండి", kiosk01: "కియోస్క్ 01", kiosk02: "కియోస్క్ 02", kiosk03: "కియోస్క్ 03", kiosk04: "కియోస్క్ 04", online1: "OPD ఫ్లోర్ 1 • ఆన్‌లైన్", online2: "OPD ఫ్లోర్ 1 • ఆన్‌లైన్", offline: "OPD ఫ్లోర్ 2 • ఆఫ్‌లైన్", maintenance: "రిజిస్ట్రేషన్ • నిర్వహణ", monitor: "పర్యవేక్షణ", systemStatus: "సిస్టమ్ స్థితి", healthy: "సక్రమంగా ఉంది", activeUsers: "క్రియాశీల వినియోగదారులు", aiSessions: "AI సెషన్లు", onlineKiosks: "ఆన్‌లైన్ కియోస్క్‌లు", authentication: "ఆథెంటికేషన్ ఈవెంట్స్", failedLogins: "3 విఫల లాగిన్ ప్రయత్నాలు గుర్తించబడ్డాయి", accessControl: "యాక్సెస్ కంట్రోల్", roleBased: "పాత్ర ఆధారిత అనుమతులు సక్రియంగా ఉన్నాయి", auditLogging: "ఆడిట్ లాగింగ్", logging: "సున్నితమైన సిస్టమ్ ఈవెంట్లు లాగ్ అవుతున్నాయి", accessNote: "అడ్మిన్ ఖాతాలు మరియు అనుమతులను నిర్వహిస్తాడు, కానీ రోగుల క్లినికల్ రికార్డులకు స్వయంచాలకంగా అపరిమిత ప్రాప్యత పొందడు." },
  },
  ta: {
    role: { title: "நீங்கள் யார்?", description: "சரியான Aayuvora workflow-ஐத் திறக்க உங்கள் பங்கைத் தேர்ந்தெடுக்கவும்.", patient: "நோயாளர்", patientDescription: "ஆலோசனையைத் தொடங்கி, உடல்நலத் தகவலை வழங்கி, உங்களுக்கு அனுமதிக்கப்பட்ட பதிவுகளைப் பார்க்கவும்.", doctor: "மருத்துவர்", doctorDescription: "அங்கீகரிக்கப்பட்ட நோயாளர் தகவலைப் பரிசீலித்து மருத்துவ workflow-ஐ முடிக்கவும்.", admin: "நிர்வாகி", adminDescription: "பயனர்கள், சாதனங்கள், அமைப்பு மற்றும் பாதுகாப்பை நிர்வகிக்கவும்." },
    language: { title: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்", description: "Aayuvora பயன்படுத்த உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்.", continue: "தொடரவும்" },
    patientLogin: { title: "உங்கள் ABHA-வை இணைக்கவும்", description: "உங்கள் அடையாளத்தை பாதுகாப்பாக சரிபார்க்க ABHA விவரங்களைப் பயன்படுத்தவும்.", abha: "ABHA எண்", otp: "OTP", abhaPlaceholder: "XX-XXXX-XXXX-XXXX", otpPlaceholder: "OTP உள்ளிடவும்", verify: "சரிபார்த்து தொடரவும்", demo: "டெமோ முறை", demoText: "இந்த முன்மாதிரி கற்பனையான நோயாளர் உள்நுழைவு விவரங்களைப் பயன்படுத்துகிறது.", wrong: "தவறான உள்நுழைவு விவரங்கள்", demoCredentials: "டெமோ உள்நுழைவு விவரங்கள்" },
    consent: { title: "தொடங்குவதற்கு முன்", description: "உங்கள் ஆலோசனைக்குத் தயாராக உங்கள் தற்போதைய உடல்நலப் பிரச்சனை பற்றிய தகவல்களை Aayuvora சேகரிக்கும்.", point1: "நீங்கள் இயல்பாகப் பேசலாம் அல்லது திரையைப் பயன்படுத்தி பதிலளிக்கலாம்.", point2: "தேவையானபோது Aayuvora தொடர்புடைய கூடுதல் கேள்விகளைக் கேட்கலாம்.", point3: "தொடர்புடைய மருத்துவ ஆவணங்களை வழங்கலாம்.", consent: "உங்கள் தகவல் ஒப்புதல் அடிப்படையிலான workflow மூலம் கையாளப்படும்.", continue: "ஆலோசனையைத் தொடங்கவும்" },
    consultation: { title: "AI சுகாதார ஆலோசனை", assistant: "Aayuvora AI", subtitle: "மருத்துவ தகவல் உதவியாளர்", greeting: "வணக்கம். இன்று உங்களை இங்கு கொண்டு வந்த உடல்நலப் பிரச்சனை பற்றி சொல்லுங்கள்.", followUp: "நன்றி. இந்த பிரச்சனை எவ்வளவு காலமாக உள்ளது?", placeholder: "உங்கள் உடல்நலப் பிரச்சனையை விவரிக்கவும்...", speak: "பேசவும்", send: "அனுப்பவும்", continue: "தொடரவும்", back: "பின்னால்" },
    documents: { title: "மருத்துவ ஆவணங்களைச் சேர்க்கவும்", description: "தொடர்புடைய மருந்துச் சீட்டு, ஆய்வக அறிக்கை அல்லது வெளியேற்ற ஆவணத்தைச் சேர்க்கவும்.", upload: "ஆவணத்தைப் பதிவேற்றவும்", fileTypes: "PDF, JPG அல்லது PNG", continue: "சுருக்கத்திற்குத் தொடரவும்", skip: "ஆவணங்களைத் தவிர்க்கவும்" },
    summary: { title: "Aayuvora உங்கள் சுருக்கத்தைத் தயாரித்துள்ளது", heading: "AI உதவியுடன் மருத்துவ சுருக்கம்", patient: "நோயாளர்", patientId: "நோயாளர் ID", complaint: "முக்கிய புகார்", duration: "கால அளவு", symptoms: "தொடர்புடைய அறிகுறிகள்", history: "முந்தைய வரலாறு", documents: "ஆவணங்கள்", unavailable: "கிடைக்கவில்லை", warning: "இது AI உதவியுடன் உருவாக்கப்பட்ட வரைவு. மருத்துவர் தகவலைப் பரிசீலித்து சரிபார்க்க வேண்டும்.", sendDoctor: "மருத்துவர் பரிசீலனைக்கு அனுப்பவும்" },
    handoff: { title: "தகவல் மருத்துவர் பரிசீலனைக்கு அனுப்பப்பட்டது", prepared: "நோயாளர் தகவல் தயாராக உள்ளது", summary: "AI உதவியுடன் சுருக்கம் தயாராக உள்ளது", documents: "வழங்கப்பட்ட இடங்களில் ஆவணங்கள் இணைக்கப்பட்டுள்ளன", continue: "தொடரவும்" },
    retention: { title: "உங்கள் தகவல், உங்கள் தேர்வு", description: "உங்கள் ஆலோசனை முடிந்தது. ஆலோசனைத் தகவலைச் சேமிக்க வேண்டுமா என்பதைத் தேர்ந்தெடுக்கவும்.", store: "என் தகவலைச் சேமிக்கவும்", storeDescription: "அங்கீகரிக்கப்பட்ட workflow-க்கு ஏற்ப அனுமதிக்கப்பட்ட ஆலோசனைத் தகவலை வைத்திருக்கவும்.", delete: "என் உரையாடலைச் சேமிக்க வேண்டாம்", deleteDescription: "பொருந்தும் தரவு சேமிப்பு கொள்கையின் படி அமர்வுக்குப் பிறகு தற்காலிக உரையாடல் உள்ளடக்கத்தை அகற்றவும்.", privacy: "பாதுகாப்பு மற்றும் செயல்பாடுகளுக்குத் தேவையான குறைந்தபட்ச தொழில்நுட்ப அல்லது ஆடிட் தகவல் வைத்திருக்கப்படலாம்.", storedTitle: "தகவல் சேமிக்கப்பட்டது", storedMessage: "உங்கள் அனுமதிக்கப்பட்ட ஆலோசனைத் தகவல் தேர்ந்தெடுக்கப்பட்ட workflow-க்கு ஏற்ப சேமிக்கப்பட்டுள்ளது.", deletedTitle: "உரையாடல் அகற்றப்பட்டது", deletedMessage: "தற்காலிக ஆலோசனை உள்ளடக்கம் நோயாளர் அமர்விலிருந்து அகற்றப்பட்டது.", finish: "முடிக்கவும்" },
    doctor: { login: "மருத்துவர் உள்நுழைவு", loginDescription: "உங்கள் அங்கீகரிக்கப்பட்ட நோயாளர் டாஷ்போர்டை அணுக உள்நுழையவும்.", username: "பயனர்பெயர்", password: "கடவுச்சொல்", queue: "நோயாளர் வரிசை", today: "இன்றைய நோயாளிகள்", pending: "பரிசீலனை நிலுவையில்", open: "திறக்கவும்", details: "நோயாளர் விவரங்கள்", patient: "நோயாளர்", age: "वयது", gender: "பாலினம்", complaint: "முக்கிய புகார்", viewSummary: "AI சுருக்கத்தைப் பார்க்கவும்", aiSummary: "AI உதவியுடன் மருத்துவ சுருக்கம்", viewDocuments: "ஆவணங்களைப் பார்க்கவும்", documents: "நோயாளர் ஆவணங்கள்", uploaded: "பதிவேற்றப்பட்ட ஆவணம்", openDocument: "ஆவணத்தைத் திறக்கவும்", continueReview: "பரிசீலனைக்கு தொடரவும்", review: "பரிசீலனை & திருத்தம்", approve: "அனுமதித்து தொடரவும்", decision: "இறுதி மருத்துவ முடிவு", reviewed: "நோயாளர் தகவல் பரிசீலிக்கப்பட்டது", verified: "AI சுருக்கம் சரிபார்க்கப்பட்டது", source: "மூல ஆவணம் பரிசீலிக்கப்பட்டது", complete: "ஆலோசனையை முடிக்கவும்", previousPrescription: "Previous Prescription.pdf" },
    admin: { login: "நிர்வாகி உள்நுழைவு", loginDescription: "Aayuvora தளத்தை நிர்வகிக்க உள்நுழையவும்.", username: "பயனர்பெயர்", password: "கடவுச்சொல்", dashboard: "நிர்வாகி டாஷ்போர்டு", patients: "நோயாளிகள்", doctors: "மருத்துவர்கள்", kiosks: "கியோஸ்க்கள்", activeSessions: "செயலில் உள்ள அமர்வுகள்", usersRoles: "பயனர்கள் & பங்குகள்", usersDescription: "கணக்குகள் மற்றும் அனுமதிகளை நிர்வகிக்கவும்", kioskManagement: "கியோஸ்க் மேலாண்மை", kioskDescription: "மருத்துவமனை சாதனங்களை கண்காணிக்கவும்", monitoring: "அமைப்பு கண்காணிப்பு", monitoringDescription: "தளத்தின் நிலை மற்றும் புள்ளிவிவரங்கள்", security: "பாதுகாப்பு & தணிக்கை", securityDescription: "பாதுகாப்பு நிகழ்வுகள் மற்றும் தணிக்கை பதிவுகள்", patientUsers: "நோயாளிகள்", doctorUsers: "மருத்துவர்கள்", administrators: "நிர்வாகிகள்", view: "பார்க்கவும்", manage: "நிர்வகிக்கவும்", kiosk01: "கியோஸ்க் 01", kiosk02: "கியோஸ்க் 02", kiosk03: "கியோஸ்க் 03", kiosk04: "கியோஸ்க் 04", online1: "OPD தளம் 1 • ஆன்லைன்", online2: "OPD தளம் 1 • ஆன்லைன்", offline: "OPD தளம் 2 • ஆஃப்லைன்", maintenance: "பதிவு • பராமரிப்பு", monitor: "கண்காணிப்பு", systemStatus: "அமைப்பு நிலை", healthy: "சீராக உள்ளது", activeUsers: "செயலில் உள்ள பயனர்கள்", aiSessions: "AI அமர்வுகள்", onlineKiosks: "ஆன்லைன் கியோஸ்க்கள்", authentication: "அங்கீகார நிகழ்வுகள்", failedLogins: "3 தோல்வியடைந்த உள்நுழைவு முயற்சிகள் கண்டறியப்பட்டன", accessControl: "அணுகல் கட்டுப்பாடு", roleBased: "பங்கு அடிப்படையிலான அனுமதிகள் செயலில் உள்ளன", auditLogging: "தணிக்கை பதிவு", logging: "முக்கிய அமைப்பு நிகழ்வுகள் பதிவு செய்யப்படுகின்றன", accessNote: "நிர்வாகி கணக்குகள் மற்றும் அனுமதிகளை நிர்வகிக்கிறார்; நோயாளர் மருத்துவ பதிவுகளுக்கு தானாகவே வரம்பற்ற அணுகலைப் பெறமாட்டார்." },
  },
};

/* =========================================================
   APP
========================================================= */

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => { dispose: () => void; addEventListener?: (event: string, callback: () => void) => void };
  }
}

type JitsiCallPanelProps = {
  roomName: string;
  displayName: string;
  onConferenceLeft?: () => void;
};

function JitsiCallPanel({ roomName, displayName, onConferenceLeft }: JitsiCallPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<{
    dispose: () => void;
    addEventListener?: (event: string, callback: () => void) => void;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const start = () => {
      if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
      apiRef.current?.dispose();
      containerRef.current.innerHTML = "";
      apiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName },
        configOverwrite: {
          prejoinConfig: { enabled: true },
        },
      });

      apiRef.current.addEventListener?.("videoConferenceLeft", () => {
        onConferenceLeft?.();
      });
      apiRef.current.addEventListener?.("readyToClose", () => {
        onConferenceLeft?.();
      });
    };

    if (window.JitsiMeetExternalAPI) {
      start();
    } else {
      const scriptId = "aayuvora-jitsi-external-api";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        script.onload = start;
        document.body.appendChild(script);
      } else {
        script.addEventListener("load", start, { once: true });
      }
    }

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [roomName, displayName]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

const GLOBAL_UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  hi: {
    "Welcome": "स्वागत है", "Continue": "जारी रखें", "Back": "वापस", "Next": "अगला", "Skip": "छोड़ें", "Cancel": "रद्द करें", "Save": "सहेजें", "Submit": "जमा करें", "Search": "खोजें", "Close": "बंद करें", "Open": "खोलें", "Log out": "लॉग आउट", "Logout": "लॉग आउट", "Home": "होम", "Menu": "मेन्यू", "Settings": "सेटिंग्स", "Language": "भाषा", "Choose your language": "अपनी भाषा चुनें", "Patient": "रोगी", "Doctor": "डॉक्टर", "Admin": "एडमिन", "Dashboard": "डैशबोर्ड", "Upcoming Appointments": "आगामी अपॉइंटमेंट", "AI pre-consultation": "AI पूर्व-परामर्श", "Your Records": "आपके रिकॉर्ड", "Order Medicines": "दवाइयाँ ऑर्डर करें", "Before we Begin": "शुरू करने से पहले", "Before we begin": "शुरू करने से पहले", "Emergency Appointment": "आपातकालीन अपॉइंटमेंट", "Emergency": "आपातकाल", "Appointments": "अपॉइंटमेंट", "No appointments found.": "कोई अपॉइंटमेंट नहीं मिला।", "No upcoming appointments": "कोई आगामी अपॉइंटमेंट नहीं है", "Book Appointment": "अपॉइंटमेंट बुक करें", "Book an Appointment": "अपॉइंटमेंट बुक करें", "Your Health Records": "आपके स्वास्थ्य रिकॉर्ड", "Frequently Asked Questions": "अक्सर पूछे जाने वाले प्रश्न", "Help & Support": "सहायता और समर्थन", "Dark mode": "डार्क मोड", "Light mode": "लाइट मोड", "Name": "नाम", "Age": "आयु", "Gender": "लिंग", "Phone Number": "फ़ोन नंबर", "Email": "ईमेल", "Address": "पता", "Date": "तारीख", "Time": "समय", "Status": "स्थिति", "Pending": "लंबित", "Completed": "पूर्ण", "Available": "उपलब्ध", "Unavailable": "अनुपलब्ध", "Upload": "अपलोड करें", "Upload Document": "दस्तावेज़ अपलोड करें", "Choose file": "फ़ाइल चुनें", "No file chosen": "कोई फ़ाइल नहीं चुनी गई", "View Details": "विवरण देखें", "View Summary": "सारांश देखें", "Download": "डाउनलोड करें", "Refresh": "रीफ़्रेश करें", "Confirm": "पुष्टि करें", "Yes": "हाँ", "No": "नहीं", "Loading...": "लोड हो रहा है...", "Please wait...": "कृपया प्रतीक्षा करें...", "Something went wrong. Please try again.": "कुछ गलत हुआ। कृपया फिर से प्रयास करें।", "What would you like to do today?": "आज आप क्या करना चाहेंगे?", "Patient Care Platform": "रोगी देखभाल प्लेटफ़ॉर्म", "Your care, in one place": "आपकी देखभाल, एक ही जगह", "AI Health Consultation": "AI स्वास्थ्य परामर्श", "Medical Documents": "चिकित्सा दस्तावेज़", "Consent": "सहमति", "Continue to Consultation": "परामर्श जारी रखें", "Skip for now": "अभी छोड़ें", "Submit and Continue": "जमा करें और आगे बढ़ें", "Back to Home": "होम पर वापस जाएँ"
  },
  bn: {
    "Welcome": "স্বাগতম", "Continue": "এগিয়ে যান", "Back": "ফিরে যান", "Next": "পরবর্তী", "Skip": "এড়িয়ে যান", "Cancel": "বাতিল করুন", "Save": "সংরক্ষণ করুন", "Submit": "জমা দিন", "Search": "খুঁজুন", "Close": "বন্ধ করুন", "Open": "খুলুন", "Log out": "লগ আউট", "Logout": "লগ আউট", "Home": "হোম", "Menu": "মেনু", "Settings": "সেটিংস", "Language": "ভাষা", "Choose your language": "আপনার ভাষা নির্বাচন করুন", "Patient": "রোগী", "Doctor": "চিকিৎসক", "Admin": "অ্যাডমিন", "Dashboard": "ড্যাশবোর্ড", "Upcoming Appointments": "আসন্ন অ্যাপয়েন্টমেন্ট", "AI pre-consultation": "AI প্রাক-পরামর্শ", "Your Records": "আপনার রেকর্ড", "Order Medicines": "ওষুধ অর্ডার করুন", "Before we Begin": "শুরু করার আগে", "Before we begin": "শুরু করার আগে", "Emergency Appointment": "জরুরি অ্যাপয়েন্টমেন্ট", "Emergency": "জরুরি অবস্থা", "Appointments": "অ্যাপয়েন্টমেন্ট", "No appointments found.": "কোনও অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।", "No upcoming appointments": "কোনও আসন্ন অ্যাপয়েন্টমেন্ট নেই", "Book Appointment": "অ্যাপয়েন্টমেন্ট বুক করুন", "Book an Appointment": "অ্যাপয়েন্টমেন্ট বুক করুন", "Your Health Records": "আপনার স্বাস্থ্য রেকর্ড", "Frequently Asked Questions": "প্রায়শই জিজ্ঞাসিত প্রশ্ন", "Help & Support": "সহায়তা ও সমর্থন", "Dark mode": "ডার্ক মোড", "Light mode": "লাইট মোড", "Name": "নাম", "Age": "বয়স", "Gender": "লিঙ্গ", "Phone Number": "ফোন নম্বর", "Email": "ইমেল", "Address": "ঠিকানা", "Date": "তারিখ", "Time": "সময়", "Status": "অবস্থা", "Pending": "বাকি", "Completed": "সম্পন্ন", "Available": "উপলব্ধ", "Unavailable": "অনুপলব্ধ", "Upload": "আপলোড করুন", "Upload Document": "নথি আপলোড করুন", "Choose file": "ফাইল বেছে নিন", "No file chosen": "কোনও ফাইল বেছে নেওয়া হয়নি", "View Details": "বিস্তারিত দেখুন", "View Summary": "সারাংশ দেখুন", "Download": "ডাউনলোড করুন", "Refresh": "রিফ্রেশ করুন", "Confirm": "নিশ্চিত করুন", "Yes": "হ্যাঁ", "No": "না", "Loading...": "লোড হচ্ছে...", "Please wait...": "অনুগ্রহ করে অপেক্ষা করুন...", "What would you like to do today?": "আজ আপনি কী করতে চান?", "Patient Care Platform": "রোগী পরিচর্যা প্ল্যাটফর্ম", "AI Health Consultation": "AI স্বাস্থ্য পরামর্শ", "Medical Documents": "চিকিৎসা নথি", "Consent": "সম্মতি", "Continue to Consultation": "পরামর্শে এগিয়ে যান", "Skip for now": "এখন এড়িয়ে যান", "Submit and Continue": "জমা দিয়ে এগিয়ে যান", "Back to Home": "হোমে ফিরে যান"
  },
  mr: {
    "Welcome": "स्वागत आहे", "Continue": "पुढे जा", "Back": "मागे", "Next": "पुढील", "Skip": "वगळा", "Cancel": "रद्द करा", "Save": "जतन करा", "Submit": "सबमिट करा", "Search": "शोधा", "Close": "बंद करा", "Open": "उघडा", "Log out": "लॉग आउट", "Logout": "लॉग आउट", "Home": "मुख्यपृष्ठ", "Menu": "मेनू", "Settings": "सेटिंग्ज", "Language": "भाषा", "Choose your language": "तुमची भाषा निवडा", "Patient": "रुग्ण", "Doctor": "डॉक्टर", "Admin": "अॅडमिन", "Dashboard": "डॅशबोर्ड", "Upcoming Appointments": "आगामी अपॉइंटमेंट्स", "AI pre-consultation": "AI पूर्व-सल्ला", "Your Records": "तुमचे रेकॉर्ड", "Order Medicines": "औषधे मागवा", "Before we Begin": "सुरुवात करण्यापूर्वी", "Before we begin": "सुरुवात करण्यापूर्वी", "Emergency Appointment": "आपत्कालीन अपॉइंटमेंट", "Emergency": "आपत्कालीन", "Appointments": "अपॉइंटमेंट्स", "No appointments found.": "कोणतीही अपॉइंटमेंट आढळली नाही.", "No upcoming appointments": "आगामी अपॉइंटमेंट्स नाहीत", "Book Appointment": "अपॉइंटमेंट बुक करा", "Book an Appointment": "अपॉइंटमेंट बुक करा", "Your Health Records": "तुमचे आरोग्य रेकॉर्ड", "Frequently Asked Questions": "वारंवार विचारले जाणारे प्रश्न", "Help & Support": "मदत आणि समर्थन", "Dark mode": "डार्क मोड", "Light mode": "लाइट मोड", "Name": "नाव", "Age": "वय", "Gender": "लिंग", "Phone Number": "फोन नंबर", "Email": "ईमेल", "Address": "पत्ता", "Date": "तारीख", "Time": "वेळ", "Status": "स्थिती", "Pending": "प्रलंबित", "Completed": "पूर्ण", "Available": "उपलब्ध", "Unavailable": "अनुपलब्ध", "Upload": "अपलोड करा", "Upload Document": "कागदपत्र अपलोड करा", "Choose file": "फाइल निवडा", "No file chosen": "फाइल निवडलेली नाही", "View Details": "तपशील पहा", "View Summary": "सारांश पहा", "Download": "डाउनलोड करा", "Refresh": "रीफ्रेश करा", "Confirm": "पुष्टी करा", "Yes": "होय", "No": "नाही", "Loading...": "लोड होत आहे...", "Please wait...": "कृपया प्रतीक्षा करा...", "What would you like to do today?": "आज तुम्हाला काय करायचे आहे?", "Patient Care Platform": "रुग्ण सेवा प्लॅटफॉर्म", "AI Health Consultation": "AI आरोग्य सल्ला", "Medical Documents": "वैद्यकीय कागदपत्रे", "Consent": "संमती", "Continue to Consultation": "सल्ल्यासाठी पुढे जा", "Skip for now": "आत्ता वगळा", "Submit and Continue": "सबमिट करून पुढे जा", "Back to Home": "मुख्यपृष्ठावर परत जा"
  },
  te: {
    "Welcome": "స్వాగతం", "Continue": "కొనసాగించండి", "Back": "వెనక్కి", "Next": "తదుపరి", "Skip": "దాటవేయండి", "Cancel": "రద్దు చేయండి", "Save": "సేవ్ చేయండి", "Submit": "సమర్పించండి", "Search": "వెతకండి", "Close": "మూసివేయండి", "Open": "తెరవండి", "Log out": "లాగ్ అవుట్", "Logout": "లాగ్ అవుట్", "Home": "హోమ్", "Menu": "మెనూ", "Settings": "సెట్టింగ్‌లు", "Language": "భాష", "Choose your language": "మీ భాషను ఎంచుకోండి", "Patient": "రోగి", "Doctor": "డాక్టర్", "Admin": "అడ్మిన్", "Dashboard": "డ్యాష్‌బోర్డ్", "Upcoming Appointments": "రాబోయే అపాయింట్‌మెంట్లు", "AI pre-consultation": "AI ముందస్తు సంప్రదింపు", "Your Records": "మీ రికార్డులు", "Order Medicines": "మందులు ఆర్డర్ చేయండి", "Before we Begin": "ప్రారంభించే ముందు", "Before we begin": "ప్రారంభించే ముందు", "Emergency Appointment": "అత్యవసర అపాయింట్‌మెంట్", "Emergency": "అత్యవసరం", "Appointments": "అపాయింట్‌మెంట్లు", "No appointments found.": "అపాయింట్‌మెంట్లు కనుగొనబడలేదు.", "No upcoming appointments": "రాబోయే అపాయింట్‌మెంట్లు లేవు", "Book Appointment": "అపాయింట్‌మెంట్ బుక్ చేయండి", "Book an Appointment": "అపాయింట్‌మెంట్ బుక్ చేయండి", "Your Health Records": "మీ ఆరోగ్య రికార్డులు", "Frequently Asked Questions": "తరచుగా అడిగే ప్రశ్నలు", "Help & Support": "సహాయం మరియు మద్దతు", "Dark mode": "డార్క్ మోడ్", "Light mode": "లైట్ మోడ్", "Name": "పేరు", "Age": "వయస్సు", "Gender": "లింగం", "Phone Number": "ఫోన్ నంబర్", "Email": "ఇమెయిల్", "Address": "చిరునామా", "Date": "తేదీ", "Time": "సమయం", "Status": "స్థితి", "Pending": "పెండింగ్‌లో ఉంది", "Completed": "పూర్తయింది", "Available": "అందుబాటులో ఉంది", "Unavailable": "అందుబాటులో లేదు", "Upload": "అప్‌లోడ్ చేయండి", "Upload Document": "పత్రాన్ని అప్‌లోడ్ చేయండి", "Choose file": "ఫైల్ ఎంచుకోండి", "No file chosen": "ఫైల్ ఎంచుకోలేదు", "View Details": "వివరాలు చూడండి", "View Summary": "సారాంశం చూడండి", "Download": "డౌన్‌లోడ్ చేయండి", "Refresh": "రిఫ్రెష్ చేయండి", "Confirm": "నిర్ధారించండి", "Yes": "అవును", "No": "కాదు", "Loading...": "లోడ్ అవుతోంది...", "Please wait...": "దయచేసి వేచి ఉండండి...", "What would you like to do today?": "ఈ రోజు మీరు ఏమి చేయాలనుకుంటున్నారు?", "Patient Care Platform": "రోగి సంరక్షణ వేదిక", "AI Health Consultation": "AI ఆరోగ్య సంప్రదింపు", "Medical Documents": "వైద్య పత్రాలు", "Consent": "సమ్మతి", "Continue to Consultation": "సంప్రదింపుకు కొనసాగండి", "Skip for now": "ప్రస్తుతానికి దాటవేయండి", "Submit and Continue": "సమర్పించి కొనసాగండి", "Back to Home": "హోమ్‌కు తిరిగి వెళ్లండి"
  },
  ta: {
    "Welcome": "வரவேற்கிறோம்", "Continue": "தொடரவும்", "Back": "பின்னால்", "Next": "அடுத்து", "Skip": "தவிர்க்கவும்", "Cancel": "ரத்துசெய்", "Save": "சேமிக்கவும்", "Submit": "சமர்ப்பிக்கவும்", "Search": "தேடவும்", "Close": "மூடவும்", "Open": "திறக்கவும்", "Log out": "வெளியேறு", "Logout": "வெளியேறு", "Home": "முகப்பு", "Menu": "மெனு", "Settings": "அமைப்புகள்", "Language": "மொழி", "Choose your language": "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்", "Patient": "நோயாளர்", "Doctor": "மருத்துவர்", "Admin": "நிர்வாகி", "Dashboard": "டாஷ்போர்டு", "Upcoming Appointments": "வரவிருக்கும் சந்திப்புகள்", "AI pre-consultation": "AI முன் ஆலோசனை", "Your Records": "உங்கள் பதிவுகள்", "Order Medicines": "மருந்துகளை ஆர்டர் செய்யவும்", "Before we Begin": "தொடங்குவதற்கு முன்", "Before we begin": "தொடங்குவதற்கு முன்", "Emergency Appointment": "அவசர சந்திப்பு", "Emergency": "அவசரம்", "Appointments": "சந்திப்புகள்", "No appointments found.": "சந்திப்புகள் எதுவும் கிடைக்கவில்லை.", "No upcoming appointments": "வரவிருக்கும் சந்திப்புகள் இல்லை", "Book Appointment": "சந்திப்பை பதிவு செய்யவும்", "Book an Appointment": "சந்திப்பை பதிவு செய்யவும்", "Your Health Records": "உங்கள் உடல்நலப் பதிவுகள்", "Frequently Asked Questions": "அடிக்கடி கேட்கப்படும் கேள்விகள்", "Help & Support": "உதவி மற்றும் ஆதரவு", "Dark mode": "இருண்ட பயன்முறை", "Light mode": "ஒளி பயன்முறை", "Name": "பெயர்", "Age": "வயது", "Gender": "பாலினம்", "Phone Number": "தொலைபேசி எண்", "Email": "மின்னஞ்சல்", "Address": "முகவரி", "Date": "தேதி", "Time": "நேரம்", "Status": "நிலை", "Pending": "நிலுவையில்", "Completed": "முடிந்தது", "Available": "கிடைக்கிறது", "Unavailable": "கிடைக்கவில்லை", "Upload": "பதிவேற்றவும்", "Upload Document": "ஆவணத்தைப் பதிவேற்றவும்", "Choose file": "கோப்பைத் தேர்ந்தெடுக்கவும்", "No file chosen": "கோப்பு தேர்ந்தெடுக்கப்படவில்லை", "View Details": "விவரங்களைப் பார்க்கவும்", "View Summary": "சுருக்கத்தைப் பார்க்கவும்", "Download": "பதிவிறக்கவும்", "Refresh": "புதுப்பிக்கவும்", "Confirm": "உறுதிப்படுத்தவும்", "Yes": "ஆம்", "No": "இல்லை", "Loading...": "ஏற்றப்படுகிறது...", "Please wait...": "தயவுசெய்து காத்திருக்கவும்...", "What would you like to do today?": "இன்று நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?", "Patient Care Platform": "நோயாளர் பராமரிப்பு தளம்", "AI Health Consultation": "AI சுகாதார ஆலோசனை", "Medical Documents": "மருத்துவ ஆவணங்கள்", "Consent": "ஒப்புதல்", "Continue to Consultation": "ஆலோசனைக்குத் தொடரவும்", "Skip for now": "இப்போதைக்கு தவிர்க்கவும்", "Submit and Continue": "சமர்ப்பித்து தொடரவும்", "Back to Home": "முகப்புக்குத் திரும்பவும்"
  }
};


// Word-level fallback for hard-coded labels and sentences that are not yet in
// the phrase dictionary. Exact phrase translations always take precedence.
const GLOBAL_WORD_TRANSLATIONS: Record<string, Record<string, string>> = {
  hi: {
    your:"आपका", you:"आप", yourself:"स्वयं", we:"हम", our:"हमारा", my:"मेरा", me:"मुझे", is:"है", are:"हैं", am:"हूँ", was:"था", were:"थे", be:"होना", been:"रहा", have:"है", has:"है", had:"था", do:"करें", does:"करता", did:"किया", can:"सकते", could:"सकते", should:"चाहिए", would:"होगा", will:"होगा", please:"कृपया", enter:"दर्ज करें", select:"चुनें", choose:"चुनें", add:"जोड़ें", edit:"संपादित करें", delete:"हटाएँ", remove:"हटाएँ", update:"अपडेट करें", view:"देखें", details:"विवरण", summary:"सारांश", information:"जानकारी", health:"स्वास्थ्य", record:"रिकॉर्ड", records:"रिकॉर्ड", medical:"चिकित्सा", medicine:"दवा", medicines:"दवाइयाँ", doctor:"डॉक्टर", patient:"रोगी", appointment:"अपॉइंटमेंट", appointments:"अपॉइंटमेंट", emergency:"आपातकाल", name:"नाम", age:"आयु", gender:"लिंग", phone:"फ़ोन", number:"संख्या", email:"ईमेल", address:"पता", date:"तारीख", time:"समय", status:"स्थिति", available:"उपलब्ध", unavailable:"अनुपलब्ध", completed:"पूर्ण", pending:"लंबित", upload:"अपलोड करें", document:"दस्तावेज़", documents:"दस्तावेज़", file:"फ़ाइल", files:"फ़ाइलें", search:"खोजें", result:"परिणाम", results:"परिणाम", loading:"लोड हो रहा है", error:"त्रुटि", success:"सफलता", failed:"विफल", retry:"फिर प्रयास करें", try:"प्रयास", again:"फिर से", continue:"जारी रखें", back:"वापस", next:"अगला", skip:"छोड़ें", cancel:"रद्द करें", save:"सहेजें", submit:"जमा करें", confirm:"पुष्टि करें", yes:"हाँ", no:"नहीं", home:"होम", help:"सहायता", support:"समर्थन", settings:"सेटिंग्स", language:"भाषा", welcome:"स्वागत", today:"आज", tomorrow:"कल", upcoming:"आगामी", previous:"पिछला", new:"नया", old:"पुराना", start:"शुरू करें", finish:"समाप्त करें", done:"हो गया", open:"खोलें", close:"बंद करें", online:"ऑनलाइन", offline:"ऑफ़लाइन", male:"पुरुष", female:"महिला", other:"अन्य", unknown:"अज्ञात", required:"आवश्यक", optional:"वैकल्पिक", selected:"चयनित", question:"प्रश्न", answer:"उत्तर", message:"संदेश", messages:"संदेश", consultation:"परामर्श", consent:"सहमति", privacy:"गोपनीयता", terms:"नियम", and:"और", or:"या", with:"के साथ", without:"के बिना", for:"के लिए", from:"से", to:"को", in:"में", on:"पर", at:"पर", by:"द्वारा", about:"के बारे में", this:"यह", that:"वह", the:"", a:"", an:"", of:"का", not:"नहीं",
  },
  bn: {
    your:"আপনার", you:"আপনি", we:"আমরা", our:"আমাদের", my:"আমার", is:"হয়", are:"হয়", please:"অনুগ্রহ করে", enter:"লিখুন", select:"নির্বাচন করুন", choose:"বেছে নিন", add:"যোগ করুন", edit:"সম্পাদনা করুন", delete:"মুছুন", remove:"সরান", update:"আপডেট করুন", view:"দেখুন", details:"বিস্তারিত", summary:"সারাংশ", information:"তথ্য", health:"স্বাস্থ্য", record:"রেকর্ড", records:"রেকর্ড", medical:"চিকিৎসা", medicine:"ওষুধ", medicines:"ওষুধ", doctor:"চিকিৎসক", patient:"রোগী", appointment:"অ্যাপয়েন্টমেন্ট", appointments:"অ্যাপয়েন্টমেন্ট", emergency:"জরুরি", name:"নাম", age:"বয়স", gender:"লিঙ্গ", phone:"ফোন", number:"নম্বর", email:"ইমেল", address:"ঠিকানা", date:"তারিখ", time:"সময়", status:"অবস্থা", available:"উপলব্ধ", unavailable:"অনুপলব্ধ", completed:"সম্পন্ন", pending:"বাকি", upload:"আপলোড করুন", document:"নথি", documents:"নথি", file:"ফাইল", files:"ফাইল", search:"খুঁজুন", result:"ফলাফল", results:"ফলাফল", loading:"লোড হচ্ছে", error:"ত্রুটি", success:"সাফল্য", failed:"ব্যর্থ", retry:"আবার চেষ্টা করুন", again:"আবার", continue:"এগিয়ে যান", back:"ফিরে যান", next:"পরবর্তী", skip:"এড়িয়ে যান", cancel:"বাতিল করুন", save:"সংরক্ষণ করুন", submit:"জমা দিন", confirm:"নিশ্চিত করুন", yes:"হ্যাঁ", no:"না", home:"হোম", help:"সহায়তা", support:"সমর্থন", settings:"সেটিংস", language:"ভাষা", welcome:"স্বাগতম", today:"আজ", upcoming:"আসন্ন", new:"নতুন", start:"শুরু করুন", finish:"শেষ করুন", open:"খুলুন", close:"বন্ধ করুন", online:"অনলাইন", offline:"অফলাইন", male:"পুরুষ", female:"মহিলা", other:"অন্যান্য", required:"আবশ্যক", optional:"ঐচ্ছিক", question:"প্রশ্ন", answer:"উত্তর", message:"বার্তা", messages:"বার্তা", consultation:"পরামর্শ", consent:"সম্মতি", privacy:"গোপনীয়তা", and:"এবং", or:"অথবা", with:"সঙ্গে", without:"ছাড়া", for:"জন্য", from:"থেকে", to:"দিকে", in:"মধ্যে", on:"উপর", about:"সম্পর্কে", this:"এই", that:"সেই", the:"", a:"", an:"", of:"এর", not:"নয়"
  },
  mr: {
    your:"तुमचे", you:"तुम्ही", we:"आम्ही", our:"आमचे", my:"माझे", is:"आहे", are:"आहेत", please:"कृपया", enter:"प्रविष्ट करा", select:"निवडा", choose:"निवडा", add:"जोडा", edit:"संपादित करा", delete:"हटवा", remove:"काढा", update:"अपडेट करा", view:"पहा", details:"तपशील", summary:"सारांश", information:"माहिती", health:"आरोग्य", record:"नोंद", records:"नोंदी", medical:"वैद्यकीय", medicine:"औषध", medicines:"औषधे", doctor:"डॉक्टर", patient:"रुग्ण", appointment:"अपॉइंटमेंट", appointments:"अपॉइंटमेंट्स", emergency:"आपत्कालीन", name:"नाव", age:"वय", gender:"लिंग", phone:"फोन", number:"क्रमांक", email:"ईमेल", address:"पत्ता", date:"तारीख", time:"वेळ", status:"स्थिती", available:"उपलब्ध", unavailable:"अनुपलब्ध", completed:"पूर्ण", pending:"प्रलंबित", upload:"अपलोड करा", document:"कागदपत्र", documents:"कागदपत्रे", file:"फाइल", files:"फाइल्स", search:"शोधा", result:"निकाल", results:"निकाल", loading:"लोड होत आहे", error:"त्रुटी", success:"यश", failed:"अयशस्वी", retry:"पुन्हा प्रयत्न करा", again:"पुन्हा", continue:"पुढे जा", back:"मागे", next:"पुढील", skip:"वगळा", cancel:"रद्द करा", save:"जतन करा", submit:"सबमिट करा", confirm:"पुष्टी करा", yes:"होय", no:"नाही", home:"मुख्यपृष्ठ", help:"मदत", support:"समर्थन", settings:"सेटिंग्ज", language:"भाषा", welcome:"स्वागत", today:"आज", upcoming:"आगामी", new:"नवीन", start:"सुरू करा", finish:"पूर्ण करा", open:"उघडा", close:"बंद करा", online:"ऑनलाइन", offline:"ऑफलाइन", male:"पुरुष", female:"स्त्री", other:"इतर", required:"आवश्यक", optional:"पर्यायी", question:"प्रश्न", answer:"उत्तर", message:"संदेश", messages:"संदेश", consultation:"सल्ला", consent:"संमती", privacy:"गोपनीयता", and:"आणि", or:"किंवा", with:"सह", without:"शिवाय", for:"साठी", from:"पासून", to:"कडे", in:"मध्ये", on:"वर", about:"बद्दल", this:"हे", that:"ते", the:"", a:"", an:"", of:"चा", not:"नाही"
  },
  te: {
    your:"మీ", you:"మీరు", we:"మేము", our:"మా", my:"నా", is:"ఉంది", are:"ఉన్నాయి", please:"దయచేసి", enter:"నమోదు చేయండి", select:"ఎంచుకోండి", choose:"ఎంచుకోండి", add:"జోడించండి", edit:"సవరించండి", delete:"తొలగించండి", remove:"తొలగించండి", update:"నవీకరించండి", view:"చూడండి", details:"వివరాలు", summary:"సారాంశం", information:"సమాచారం", health:"ఆరోగ్యం", record:"రికార్డు", records:"రికార్డులు", medical:"వైద్య", medicine:"మందు", medicines:"మందులు", doctor:"డాక్టర్", patient:"రోగి", appointment:"అపాయింట్‌మెంట్", appointments:"అపాయింట్‌మెంట్లు", emergency:"అత్యవసరం", name:"పేరు", age:"వయస్సు", gender:"లింగం", phone:"ఫోన్", number:"నంబర్", email:"ఇమెయిల్", address:"చిరునామా", date:"తేదీ", time:"సమయం", status:"స్థితి", available:"అందుబాటులో ఉంది", unavailable:"అందుబాటులో లేదు", completed:"పూర్తయింది", pending:"పెండింగ్‌లో ఉంది", upload:"అప్‌లోడ్ చేయండి", document:"పత్రం", documents:"పత్రాలు", file:"ఫైల్", files:"ఫైళ్లు", search:"వెతకండి", result:"ఫలితం", results:"ఫలితాలు", loading:"లోడ్ అవుతోంది", error:"లోపం", success:"విజయం", failed:"విఫలమైంది", retry:"మళ్లీ ప్రయత్నించండి", again:"మళ్లీ", continue:"కొనసాగించండి", back:"వెనక్కి", next:"తదుపరి", skip:"దాటవేయండి", cancel:"రద్దు చేయండి", save:"సేవ్ చేయండి", submit:"సమర్పించండి", confirm:"నిర్ధారించండి", yes:"అవును", no:"కాదు", home:"హోమ్", help:"సహాయం", support:"మద్దతు", settings:"సెట్టింగ్‌లు", language:"భాష", welcome:"స్వాగతం", today:"ఈ రోజు", upcoming:"రాబోయే", new:"కొత్త", start:"ప్రారంభించండి", finish:"ముగించండి", open:"తెరవండి", close:"మూసివేయండి", online:"ఆన్‌లైన్", offline:"ఆఫ్‌లైన్", male:"పురుషుడు", female:"స్త్రీ", other:"ఇతర", required:"అవసరం", optional:"ఐచ్ఛికం", question:"ప్రశ్న", answer:"సమాధానం", message:"సందేశం", messages:"సందేశాలు", consultation:"సంప్రదింపు", consent:"సమ్మతి", privacy:"గోప్యత", and:"మరియు", or:"లేదా", with:"తో", without:"లేకుండా", for:"కోసం", from:"నుండి", to:"కు", in:"లో", on:"పై", about:"గురించి", this:"ఈ", that:"ఆ", the:"", a:"", an:"", of:"యొక్క", not:"కాదు"
  },
  ta: {
    your:"உங்கள்", you:"நீங்கள்", we:"நாங்கள்", our:"எங்கள்", my:"என்", is:"உள்ளது", are:"உள்ளன", please:"தயவுசெய்து", enter:"உள்ளிடவும்", select:"தேர்ந்தெடுக்கவும்", choose:"தேர்வு செய்யவும்", add:"சேர்க்கவும்", edit:"திருத்தவும்", delete:"நீக்கவும்", remove:"அகற்றவும்", update:"புதுப்பிக்கவும்", view:"பார்க்கவும்", details:"விவரங்கள்", summary:"சுருக்கம்", information:"தகவல்", health:"உடல்நலம்", record:"பதிவு", records:"பதிவுகள்", medical:"மருத்துவ", medicine:"மருந்து", medicines:"மருந்துகள்", doctor:"மருத்துவர்", patient:"நோயாளர்", appointment:"சந்திப்பு", appointments:"சந்திப்புகள்", emergency:"அவசரம்", name:"பெயர்", age:"வயது", gender:"பாலினம்", phone:"தொலைபேசி", number:"எண்", email:"மின்னஞ்சல்", address:"முகவரி", date:"தேதி", time:"நேரம்", status:"நிலை", available:"கிடைக்கிறது", unavailable:"கிடைக்கவில்லை", completed:"முடிந்தது", pending:"நிலுவையில்", upload:"பதிவேற்றவும்", document:"ஆவணம்", documents:"ஆவணங்கள்", file:"கோப்பு", files:"கோப்புகள்", search:"தேடவும்", result:"முடிவு", results:"முடிவுகள்", loading:"ஏற்றப்படுகிறது", error:"பிழை", success:"வெற்றி", failed:"தோல்வியடைந்தது", retry:"மீண்டும் முயற்சிக்கவும்", again:"மீண்டும்", continue:"தொடரவும்", back:"பின்னால்", next:"அடுத்து", skip:"தவிர்க்கவும்", cancel:"ரத்துசெய்", save:"சேமிக்கவும்", submit:"சமர்ப்பிக்கவும்", confirm:"உறுதிப்படுத்தவும்", yes:"ஆம்", no:"இல்லை", home:"முகப்பு", help:"உதவி", support:"ஆதரவு", settings:"அமைப்புகள்", language:"மொழி", welcome:"வரவேற்கிறோம்", today:"இன்று", upcoming:"வரவிருக்கும்", new:"புதிய", start:"தொடங்கவும்", finish:"முடிக்கவும்", open:"திறக்கவும்", close:"மூடவும்", online:"ஆன்லைன்", offline:"ஆஃப்லைன்", male:"ஆண்", female:"பெண்", other:"மற்றவை", required:"தேவையான", optional:"விருப்பத்தேர்வு", question:"கேள்வி", answer:"பதில்", message:"செய்தி", messages:"செய்திகள்", consultation:"ஆலோசனை", consent:"ஒப்புதல்", privacy:"தனியுரிமை", and:"மற்றும்", or:"அல்லது", with:"உடன்", without:"இல்லாமல்", for:"க்காக", from:"இருந்து", to:"க்கு", in:"இல்", on:"மீது", about:"பற்றி", this:"இந்த", that:"அந்த", the:"", a:"", an:"", of:"இன்", not:"இல்லை"
  }
};

const GLOBAL_SENTENCE_TRANSLATIONS: Record<string, Record<string, string>> = {
  hi: {
    "Sign in securely to your account.": "अपने खाते में सुरक्षित रूप से साइन इन करें।",
    "Share your symptoms and concerns.": "अपने लक्षणों और चिंताओं के बारे में बताएँ।",
    "Choose a suitable care option and appointment.": "उपयुक्त देखभाल विकल्प और अपॉइंटमेंट चुनें।",
    "Connect with the care workflow and clinician.": "देखभाल प्रक्रिया और चिकित्सक से जुड़ें।",
    "No previous summaries have been saved for this patient in this browser yet.": "इस ब्राउज़र में इस मरीज़ के लिए अभी तक कोई पिछला सारांश सहेजा नहीं गया है।",
    "Complete AI pre-consultation and generate a summary to see it here.": "इसे यहाँ देखने के लिए AI पूर्व-परामर्श पूरा करें और सारांश बनाएँ।",
    "Is there any emergency that requires an immediate doctor consultation?": "क्या कोई ऐसी आपात स्थिति है जिसके लिए तुरंत डॉक्टर से परामर्श ज़रूरी है?",
    "If you select Yes, Aayuvora will immediately create an emergency video consultation and connect you to an available doctor.": "यदि आप हाँ चुनते हैं, तो Aayuvora तुरंत आपातकालीन वीडियो परामर्श शुरू करेगा और आपको उपलब्ध डॉक्टर से जोड़ेगा।",
    "Start an emergency video call now": "अभी आपातकालीन वीडियो कॉल शुरू करें।",
    "Continue to the regular consultation workflow": "नियमित परामर्श प्रक्रिया जारी रखें।",
    "Open your previously generated health summaries with date and time.": "पहले बनाए गए स्वास्थ्य सारांशों को तारीख और समय सहित खोलें।",
    "Your Records shows summaries saved in this browser for the signed-in patient.": "आपके रिकॉर्ड में इस ब्राउज़र में साइन इन किए गए मरीज़ के लिए सहेजे गए सारांश दिखते हैं।",
    "What would you like to do today?": "आज आप क्या करना चाहेंगे?",
    "Please wait...": "कृपया प्रतीक्षा करें...",
    "Something went wrong. Please try again.": "कुछ गलत हुआ। कृपया फिर से प्रयास करें।",

    "No appointments found.": "कोई अपॉइंटमेंट नहीं मिली।",
    "No generated summary text is available for this session.": "इस सत्र के लिए कोई सारांश उपलब्ध नहीं है।",
    "Unable to generate the clinical summary.": "क्लिनिकल सारांश तैयार नहीं किया जा सका।",
    "The AI assistant could not respond right now.": "AI सहायक अभी जवाब नहीं दे सका।",
    "The AI assistant is temporarily unavailable.": "AI सहायक अस्थायी रूप से उपलब्ध नहीं है।",
    "Patient information is unavailable.": "मरीज़ की जानकारी उपलब्ध नहीं है।",
    "Select a valid doctor from the selected hospital.": "चुने गए अस्पताल से मान्य डॉक्टर चुनें।",
    "Appointment could not be booked.": "अपॉइंटमेंट बुक नहीं हो सकी।",
    "This time slot is already booked for this doctor. Please choose another slot.": "यह समय इस डॉक्टर के लिए पहले से बुक है। कृपया दूसरा समय चुनें।",
    "Please add at least one medicine before confirming your order.": "ऑर्डर की पुष्टि करने से पहले कम से कम एक दवा जोड़ें।",
    "Please enter both address lines, a valid 6-digit PIN code, and city.": "कृपया पते की दोनों पंक्तियाँ, सही 6 अंकों का पिन कोड और शहर दर्ज करें।",
    "The video call becomes available when the appointment time starts.": "वीडियो कॉल अपॉइंटमेंट का समय शुरू होने पर उपलब्ध होगी।",
    "The video room is not available for this appointment yet.": "इस अपॉइंटमेंट के लिए वीडियो कक्ष अभी उपलब्ध नहीं है।",
    "Please enter both address lines, a valid 6-digit pin code, and city.": "कृपया पते की दोनों पंक्तियाँ, सही 6 अंकों का पिन कोड और शहर दर्ज करें।",
    "Your prescription order has been recorded successfully.": "आपका दवा-पर्ची ऑर्डर सफलतापूर्वक दर्ज किया गया है।",
    "Invalid or expired OTP. Access remains blocked.": "OTP गलत है या उसकी अवधि समाप्त हो गई है। प्रवेश अवरुद्ध रहेगा।",
    "OTP has been sent to the patient’s registered mobile number.": "OTP मरीज़ के पंजीकृत मोबाइल नंबर पर भेज दिया गया है।",
    "Prescription could not be saved.": "प्रिस्क्रिप्शन सहेजा नहीं जा सका।",
    "Unable to process this document.": "इस दस्तावेज़ को संसाधित नहीं किया जा सका।",
    "No extracted information available.": "निकाली गई कोई जानकारी उपलब्ध नहीं है।",
    "The OCR server returned an invalid response.": "OCR सर्वर ने अमान्य उत्तर दिया।",
    "Sarvam AI could not process this document.": "Sarvam AI इस दस्तावेज़ को संसाधित नहीं कर सका।",
    "What should I do in an emergency?": "आपात स्थिति में मुझे क्या करना चाहिए?",
    "Is an AI summary a medical diagnosis?": "क्या AI सारांश चिकित्सीय निदान है?",
    "Where can I see my appointments?": "मैं अपनी अपॉइंटमेंट कहाँ देख सकता हूँ?",
    "How do I start a consultation?": "मैं परामर्श कैसे शुरू करूँ?",
    "How do I log out?": "मैं लॉग आउट कैसे करूँ?",
    "AI-assisted patient care-taking and pre-consultation platform": "AI-सहायता प्राप्त रोगी देखभाल और पूर्व-परामर्श प्लेटफ़ॉर्म",
    "Login with your ABHA number.": "अपने ABHA नंबर से लॉग इन करें।",
    "AI pre-consultation, video consultation, hospital visits, prescriptions and medicine delivery, all in one place.": "AI पूर्व-परामर्श, वीडियो परामर्श, अस्पताल के दौरे, प्रिस्क्रिप्शन और दवाओं की डिलीवरी—सब कुछ एक ही जगह।",
    "Use the SOS button for urgent help.": "तत्काल सहायता के लिए SOS बटन का उपयोग करें।",
    "Care for every patient, in your language": "हर मरीज़ की देखभाल, आपकी भाषा में",
    "Your appointments are listed here. Online video calls do not open when you book; the Join Video Call button becomes available only when the appointment time starts.": "आपकी अपॉइंटमेंट यहाँ सूचीबद्ध हैं। बुकिंग करते ही ऑनलाइन वीडियो कॉल शुरू नहीं होती; “वीडियो कॉल में शामिल हों” बटन अपॉइंटमेंट का समय शुरू होने पर ही उपलब्ध होता है।",
    "No upcoming appointments.": "आने वाली कोई अपॉइंटमेंट नहीं है।",
    "Book an appointment to see it here.": "इसे यहाँ देखने के लिए अपॉइंटमेंट बुक करें।",
    "Offline appointment — please visit the selected hospital at the scheduled time.": "ऑफ़लाइन अपॉइंटमेंट — कृपया तय समय पर चुने गए अस्पताल जाएँ।",
    "Do you want to book an appointment?": "क्या आप अपॉइंटमेंट बुक करना चाहते हैं?",
    "Do you want to order medicines for delivery?": "क्या आप डिलीवरी के लिए दवाएँ ऑर्डर करना चाहते हैं?",
    "Go back and add medicines to your cart.": "वापस जाएँ और अपनी कार्ट में दवाएँ जोड़ें।",
    "Enter the address where your medicines should be delivered.": "वह पता दर्ज करें जहाँ आपकी दवाएँ पहुँचाई जानी हैं।",
    "Your medicine orders and estimated delivery status.": "आपके दवा ऑर्डर और डिलीवरी की अनुमानित स्थिति।",
    "Your confirmed medicine orders will appear here.": "आपके पुष्टि किए गए दवा ऑर्डर यहाँ दिखाई देंगे।",
    "Your doctor has completed the online consultation and provided the following prescription.": "आपके डॉक्टर ने ऑनलाइन परामर्श पूरा कर लिया है और नीचे दिया गया प्रिस्क्रिप्शन प्रदान किया है।",
    "Enter the delivery address for your prescribed medicines.": "आपके लिए लिखी गई दवाओं की डिलीवरी का पता दर्ज करें।",
    "Information retained successfully.": "जानकारी सफलतापूर्वक सुरक्षित रखी गई।",
    "Your retained information remains available to the authorized workflow.": "आपकी सुरक्षित रखी गई जानकारी अधिकृत प्रक्रिया में उपलब्ध रहेगी।",
    "You are joining the appointment-specific video room. The patient mobile and doctor laptop must use this same room.": "आप इस अपॉइंटमेंट के लिए निर्धारित वीडियो कक्ष में शामिल हो रहे हैं। मरीज़ के मोबाइल और डॉक्टर के लैपटॉप—दोनों पर यही कक्ष इस्तेमाल होना चाहिए।",
    "needs an immediate video consultation.": "को तुरंत वीडियो परामर्श की आवश्यकता है।",
    "Patient summary unlocked after OTP verification.": "OTP सत्यापन के बाद मरीज़ का सारांश उपलब्ध हो गया है।",
    "Enter the prescription given by the doctor.": "डॉक्टर द्वारा दिया गया प्रिस्क्रिप्शन दर्ज करें।",
    "End the online consultation without a prescription.": "प्रिस्क्रिप्शन के बिना ऑनलाइन परामर्श समाप्त करें।",
    "No prescription will be attached to this consultation.": "इस परामर्श के साथ कोई प्रिस्क्रिप्शन संलग्न नहीं होगा।",
    "Doctor access is granted only after the required patient authorization code is verified.": "डॉक्टर को प्रवेश केवल आवश्यक मरीज़ प्राधिकरण कोड के सत्यापन के बाद दिया जाता है।",
    "OTP has been sent to the patient's registered mobile number. Enter the OTP below to authorize access.": "मरीज़ के पंजीकृत मोबाइल नंबर पर OTP भेज दिया गया है। प्रवेश की अनुमति देने के लिए नीचे OTP दर्ज करें।",
    "Demo patient: enter the same OTP used with this patient's ABHA demo login.": "डेमो मरीज़: वही OTP दर्ज करें जिसका उपयोग इस मरीज़ के ABHA डेमो लॉगिन में किया गया था।",
    "Documents uploaded during this patient session": "इस मरीज़ के सत्र के दौरान अपलोड किए गए दस्तावेज़",
    "No medical documents were uploaded by this current patient.": "इस मरीज़ ने इस सत्र में कोई चिकित्सा दस्तावेज़ अपलोड नहीं किया।",
    "Live operational connections currently using Aayuvora.": "Aayuvora का वर्तमान में उपयोग कर रहे सक्रिय परिचालन कनेक्शन।",
    "Tell us how we can improve your experience.": "बताएँ कि हम आपके अनुभव को कैसे बेहतर बना सकते हैं।",
    "Thank you. Your feedback has been saved in this browser.": "धन्यवाद। आपकी प्रतिक्रिया इस ब्राउज़र में सुरक्षित कर दी गई है।",
    "Hello,": "नमस्कार,",
    "Login with your ABHA number. AI pre-consultation, video consultation, hospital visits, prescriptions and medicine delivery, all in one place.": "अपने ABHA नंबर से लॉग इन करें। AI पूर्व-परामर्श, वीडियो परामर्श, अस्पताल विज़िट, प्रिस्क्रिप्शन और दवाओं की डिलीवरी—सब एक ही जगह।",
    "Ayurvedic history mode selected.": "आयुर्वेदिक इतिहास मोड चुना गया है।",
    "Each uploaded document is processed independently. You can upload up to 5 documents, and each document keeps its own extracted information and summary.": "हर अपलोड किए गए दस्तावेज़ को अलग-अलग संसाधित किया जाता है। आप अधिकतम 5 दस्तावेज़ अपलोड कर सकते हैं; हर दस्तावेज़ की निकाली गई जानकारी और सारांश अलग सुरक्षित रहता है।",
    "You chose to store your information. Would you like to book an appointment now?": "आपने अपनी जानकारी सुरक्षित रखने का विकल्प चुना है। क्या आप अभी अपॉइंटमेंट बुक करना चाहेंगे?",
    "Select a hospital and doctor. Your stored clinical information will be routed only to the doctor whose appointment you book.": "अस्पताल और डॉक्टर चुनें। आपकी सुरक्षित रखी गई चिकित्सीय जानकारी केवल उसी डॉक्टर को भेजी जाएगी जिसके साथ आप अपॉइंटमेंट बुक करेंगे।",
    "and neither type can be booked again for that doctor and time.": "और उस डॉक्टर के लिए उसी समय पर इनमें से किसी भी प्रकार की दूसरी बुकिंग नहीं की जा सकती।",
    "Slots are 10 minutes each from 9:00 AM to 1:00 AM. Today's past slots are disabled using the device's real-time clock.": "सुबह 9:00 बजे से रात 1:00 बजे तक प्रत्येक स्लॉट 10 मिनट का है। आज के बीते हुए स्लॉट डिवाइस की वास्तविक घड़ी के अनुसार बंद रहते हैं।",
    "Click the Pending Reviews box to view the 7 demo patients for this OPD and any newly booked appointment routed only to this doctor. New booked appointments show their Online or Offline appointment type. Online appointments can later be connected to the video consultation flow.": "इस OPD के 7 डेमो मरीज़ों और केवल इसी डॉक्टर को भेजी गई नई बुकिंग देखने के लिए ‘लंबित समीक्षा’ बॉक्स पर क्लिक करें। नई बुकिंग में ऑनलाइन या ऑफ़लाइन अपॉइंटमेंट का प्रकार दिखेगा। ऑनलाइन अपॉइंटमेंट को बाद में वीडियो परामर्श प्रक्रिया से जोड़ा जा सकता है।",
    "AYUSH OPD demo: the patient record includes Dashavidha Pariksha and Ahara-Vihara history for doctor review.": "AYUSH OPD डेमो: मरीज़ के रिकॉर्ड में डॉक्टर की समीक्षा के लिए दशविध परीक्षा और आहार-विहार का इतिहास शामिल है।",
    "The doctor can join the video call immediately. OTP verification is required only to access the patient's clinical summary.": "डॉक्टर तुरंत वीडियो कॉल में शामिल हो सकते हैं। OTP सत्यापन केवल मरीज़ का चिकित्सीय सारांश देखने के लिए आवश्यक है।",
    "Are there any prescriptions for this patient from this online consultation?": "क्या इस ऑनलाइन परामर्श से इस मरीज़ के लिए कोई प्रिस्क्रिप्शन दिया गया है?",
    "📱 OTP has been sent to the patient's registered mobile number. Enter the OTP below to authorize access.": "📱 OTP मरीज़ के पंजीकृत मोबाइल नंबर पर भेज दिया गया है। प्रवेश की अनुमति देने के लिए नीचे OTP दर्ज करें।",
    "No prior summaries are stored in this browser for this patient. Only records saved here are displayed; backend or other-device records are not automatically fetched.": "इस ब्राउज़र में इस मरीज़ के पुराने सारांश सहेजे नहीं गए हैं। यहाँ केवल इसी ब्राउज़र में सुरक्षित रिकॉर्ड दिखते हैं; सर्वर या अन्य डिवाइस के रिकॉर्ड अपने-आप प्राप्त नहीं होते।",
    "Verify demo ABHA + OTP and book the patient's appointment.": "डेमो ABHA और OTP सत्यापित करें, फिर मरीज़ की अपॉइंटमेंट बुक करें।",
    "Register a new patient for appointment?": "क्या अपॉइंटमेंट के लिए नए मरीज़ का पंजीकरण करना है?",
    "Admin can select a 10-minute appointment slot from 9:00 AM through 1:00 AM. The slot is locked for the selected doctor once booked.": "एडमिन सुबह 9:00 बजे से रात 1:00 बजे तक 10 मिनट का अपॉइंटमेंट स्लॉट चुन सकता है। बुक होने के बाद वह स्लॉट चुने गए डॉक्टर के लिए लॉक हो जाता है।",
    // Patient medicine-order workflow: exact sentence-level translations.
    "Order Medicines": "दवाइयाँ ऑर्डर करें",
    "View Orders": "ऑर्डर देखें",
    "Yes, order medicines": "हाँ, दवाइयाँ ऑर्डर करें",
    "Search and add medicines to your cart": "दवाइयाँ खोजें और अपनी कार्ट में जोड़ें",
    "No, continue normally": "नहीं, सामान्य प्रक्रिया जारी रखें",
    "Continue to your normal workflow": "अपनी सामान्य प्रक्रिया जारी रखें",
    "Search Medicines": "दवाइयाँ खोजें",
    "Search from 50 medicines": "50 दवाइयों में खोजें",
    "Add": "जोड़ें",
    "View Cart": "कार्ट देखें",
    "Medicine Cart": "दवाइयों की कार्ट",
    "Your cart is empty.": "आपकी कार्ट खाली है।",
    "Quantity": "मात्रा",
    "Add Address": "पता जोड़ें",
    "Delivery Address": "डिलीवरी का पता",
    "Address Line 1": "पते की पंक्ति 1",
    "House / flat / street": "मकान / फ़्लैट / सड़क",
    "Address Line 2": "पते की पंक्ति 2",
    "Area / landmark": "इलाका / पहचान-चिह्न",
    "Pin Code": "पिन कोड",
    "6-digit PIN code": "6 अंकों का पिन कोड",
    "City": "शहर",
    "Confirm Order": "ऑर्डर की पुष्टि करें",
    "No orders yet": "अभी तक कोई ऑर्डर नहीं है",
    "Medicine Order": "दवा का ऑर्डर",
    "Booked on:": "ऑर्डर की तारीख:",
    "Qty:": "मात्रा:",
    "Delivery address": "डिलीवरी का पता",
    "Delivered": "डिलीवर हो गया",
    "Coming in": "आने में समय",
    "Order More Medicines": "और दवाइयाँ ऑर्डर करें",

    // Patient home greeting, services, workflow, FAQ, and feedback sentence translations.
    "YOUR CARE, IN ONE PLACE": "आपकी देखभाल, एक ही जगह",
    "Start the emergency appointment workflow.": "आपातकालीन अपॉइंटमेंट की प्रक्रिया शुरू करें।",
    "Browse medicines and manage your order.": "दवाइयाँ देखें और अपना ऑर्डर प्रबंधित करें।",
    "Review and manage your booked appointments.": "बुक किए गए अपॉइंटमेंट देखें और प्रबंधित करें।",
    "First tell about your health and then book an appointment.": "पहले अपने स्वास्थ्य के बारे में बताएँ, फिर अपॉइंटमेंट बुक करें।",
    "Open service": "सेवा खोलें",
    "How It Works": "यह कैसे काम करता है",
    "Login": "लॉग इन करें",
    "Tell us how you feel": "बताएँ कि आप कैसा महसूस कर रहे हैं",
    "Choose and Book": "चुनें और बुक करें",
    "Get Care": "देखभाल प्राप्त करें",
    "Choose AI pre-consultation, describe how you feel, and follow the steps to book or request care.": "AI पूर्व-परामर्श चुनें, बताएँ कि आप कैसा महसूस कर रहे हैं, और देखभाल का अनुरोध करने या अपॉइंटमेंट बुक करने के चरणों का पालन करें।",
    "What is AI pre-consultation?": "AI पूर्व-परामर्श क्या है?",
    "It helps organize the information you share before a clinician reviews it. It is not a diagnosis.": "यह चिकित्सक की समीक्षा से पहले आपके द्वारा दी गई जानकारी को व्यवस्थित करने में मदद करता है। यह निदान नहीं है।",
    "Can I order medicines here?": "क्या मैं यहाँ दवाइयाँ ऑर्डर कर सकता हूँ?",
    "Choose Order Medicines, select available items, and follow the order and address steps.": "“दवाइयाँ ऑर्डर करें” चुनें, उपलब्ध दवाइयाँ चुनें और ऑर्डर तथा पते के चरण पूरे करें।",
    "Open Upcoming Appointments to view bookings available to this account.": "इस खाते की बुकिंग देखने के लिए “आगामी अपॉइंटमेंट” खोलें।",
    "Where are my health summaries stored?": "मेरे स्वास्थ्य सारांश कहाँ सहेजे जाते हैं?",
    "Can I change the language?": "क्या मैं भाषा बदल सकता हूँ?",
    "Open Menu near the Aayuvora logo and choose one of the six supported languages.": "Aayuvora लोगो के पास मेन्यू खोलें और छह उपलब्ध भाषाओं में से एक चुनें।",
    "How do I enable dark mode?": "मैं डार्क मोड कैसे चालू करूँ?",
    "Open Menu and select Dark mode.": "मेन्यू खोलें और डार्क मोड चुनें।",
    "Use SOS for urgent help or Emergency Appointment to enter the emergency workflow. If there is immediate danger, contact local emergency services.": "तुरंत सहायता के लिए SOS या आपातकालीन प्रक्रिया शुरू करने के लिए “आपातकालीन अपॉइंटमेंट” चुनें। यदि तत्काल खतरा हो, तो स्थानीय आपातकालीन सेवाओं से संपर्क करें।",
    "No. AI summaries are drafts to support a clinician and must be reviewed by a qualified healthcare professional.": "नहीं। AI सारांश चिकित्सक की सहायता के लिए प्रारूप होते हैं और योग्य स्वास्थ्य पेशेवर द्वारा उनकी समीक्षा आवश्यक है।",
    "Use Log out in the upper-left area of this page to return to the welcome screen.": "स्वागत स्क्रीन पर लौटने के लिए इस पेज के ऊपरी हिस्से में “लॉग आउट” चुनें।",
    "Feedback": "प्रतिक्रिया",
    "How was your experience?": "आपका अनुभव कैसा रहा?",
    "Excellent": "बहुत अच्छा",
    "Good": "अच्छा",
    "Okay": "ठीक-ठाक",
    "Needs improvement": "सुधार की आवश्यकता है",
    "Poor": "खराब",
    "Comments": "टिप्पणियाँ",
    "Share your feedback...": "अपनी प्रतिक्रिया साझा करें...",
    "Submit Feedback": "प्रतिक्रिया भेजें",
    "Fetching location…": "स्थान प्राप्त किया जा रहा है…",
    "Requesting emergency location": "आपातकालीन स्थान का अनुरोध किया जा रहा है",
    "SOS status": "SOS की स्थिति",
    "Fetched address": "प्राप्त पता",

  },
  bn: {
    "Sign in securely to your account.": "আপনার অ্যাকাউন্টে নিরাপদে সাইন ইন করুন।",
    "Share your symptoms and concerns.": "আপনার উপসর্গ ও উদ্বেগের কথা জানান।",
    "Choose a suitable care option and appointment.": "উপযুক্ত চিকিৎসার বিকল্প ও অ্যাপয়েন্টমেন্ট বেছে নিন।",
    "Connect with the care workflow and clinician.": "চিকিৎসা প্রক্রিয়া ও চিকিৎসকের সঙ্গে যুক্ত হন।",
    "No previous summaries have been saved for this patient in this browser yet.": "এই ব্রাউজারে এই রোগীর জন্য এখনও কোনো পূর্ববর্তী সারাংশ সংরক্ষিত হয়নি।",
    "Complete AI pre-consultation and generate a summary to see it here.": "এখানে দেখতে AI প্রাক-পরামর্শ সম্পূর্ণ করে একটি সারাংশ তৈরি করুন।",
    "Is there any emergency that requires an immediate doctor consultation?": "এমন কোনো জরুরি অবস্থা আছে কি যার জন্য অবিলম্বে চিকিৎসকের পরামর্শ প্রয়োজন?",
    "If you select Yes, Aayuvora will immediately create an emergency video consultation and connect you to an available doctor.": "আপনি হ্যাঁ নির্বাচন করলে Aayuvora সঙ্গে সঙ্গে জরুরি ভিডিও পরামর্শ শুরু করবে এবং উপলব্ধ চিকিৎসকের সঙ্গে যুক্ত করবে।",
    "Start an emergency video call now": "এখনই জরুরি ভিডিও কল শুরু করুন।",
    "Continue to the regular consultation workflow": "নিয়মিত পরামর্শের প্রক্রিয়া চালিয়ে যান।",
    "Open your previously generated health summaries with date and time.": "আগে তৈরি করা স্বাস্থ্য-সারাংশগুলি তারিখ ও সময়সহ খুলুন।",
    "Your Records shows summaries saved in this browser for the signed-in patient.": "আপনার রেকর্ডে এই ব্রাউজারে সাইন-ইন করা রোগীর জন্য সংরক্ষিত সারাংশ দেখা যায়।",
    "What would you like to do today?": "আজ আপনি কী করতে চান?",
    "Please wait...": "অনুগ্রহ করে অপেক্ষা করুন...",
    "Something went wrong. Please try again.": "কিছু ভুল হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",

    "No appointments found.": "কোনও অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।",
    "No generated summary text is available for this session.": "এই সেশনের জন্য কোনও তৈরি করা সারাংশ উপলব্ধ নেই।",
    "Unable to generate the clinical summary.": "ক্লিনিক্যাল সারাংশ তৈরি করা যায়নি।",
    "The AI assistant could not respond right now.": "AI সহকারী এই মুহূর্তে উত্তর দিতে পারেনি।",
    "The AI assistant is temporarily unavailable.": "AI সহকারী সাময়িকভাবে উপলব্ধ নয়।",
    "Patient information is unavailable.": "রোগীর তথ্য উপলব্ধ নয়।",
    "Select a valid doctor from the selected hospital.": "নির্বাচিত হাসপাতাল থেকে একজন বৈধ চিকিৎসক নির্বাচন করুন।",
    "Appointment could not be booked.": "অ্যাপয়েন্টমেন্ট বুক করা যায়নি।",
    "This time slot is already booked for this doctor. Please choose another slot.": "এই সময়টি এই চিকিৎসকের জন্য ইতিমধ্যে বুক করা হয়েছে। অন্য সময় বেছে নিন।",
    "Please add at least one medicine before confirming your order.": "অর্ডার নিশ্চিত করার আগে অন্তত একটি ওষুধ যোগ করুন।",
    "Please enter both address lines, a valid 6-digit PIN code, and city.": "ঠিকানার দুইটি লাইন, সঠিক ৬ সংখ্যার পিন কোড এবং শহর লিখুন।",
    "The video call becomes available when the appointment time starts.": "অ্যাপয়েন্টমেন্টের সময় শুরু হলে ভিডিও কল উপলব্ধ হবে।",
    "The video room is not available for this appointment yet.": "এই অ্যাপয়েন্টমেন্টের জন্য ভিডিও রুম এখনও উপলব্ধ নয়।",
    "Please enter both address lines, a valid 6-digit pin code, and city.": "ঠিকানার দুইটি লাইন, সঠিক ৬ সংখ্যার পিন কোড এবং শহর লিখুন।",
    "Your prescription order has been recorded successfully.": "আপনার প্রেসক্রিপশন অর্ডার সফলভাবে নথিভুক্ত হয়েছে।",
    "Invalid or expired OTP. Access remains blocked.": "OTP ভুল বা মেয়াদোত্তীর্ণ। প্রবেশাধিকার বন্ধ থাকবে।",
    "OTP has been sent to the patient’s registered mobile number.": "রোগীর নিবন্ধিত মোবাইল নম্বরে OTP পাঠানো হয়েছে।",
    "Prescription could not be saved.": "প্রেসক্রিপশন সংরক্ষণ করা যায়নি।",
    "Unable to process this document.": "এই নথিটি প্রক্রিয়া করা যায়নি।",
    "No extracted information available.": "নিষ্কাশিত কোনও তথ্য উপলব্ধ নেই।",
    "The OCR server returned an invalid response.": "OCR সার্ভার একটি অবৈধ উত্তর দিয়েছে।",
    "Sarvam AI could not process this document.": "Sarvam AI এই নথিটি প্রক্রিয়া করতে পারেনি।",
    "What should I do in an emergency?": "জরুরি অবস্থায় আমার কী করা উচিত?",
    "Is an AI summary a medical diagnosis?": "AI সারাংশ কি চিকিৎসাগত রোগনির্ণয়?",
    "Where can I see my appointments?": "আমি আমার অ্যাপয়েন্টমেন্ট কোথায় দেখতে পারি?",
    "How do I start a consultation?": "আমি কীভাবে পরামর্শ শুরু করব?",
    "How do I log out?": "আমি কীভাবে লগ আউট করব?",
    "AI-assisted patient care-taking and pre-consultation platform": "AI-সহায়তায় রোগীর যত্ন ও প্রাক্‌-পরামর্শের প্ল্যাটফর্ম",
    "Login with your ABHA number.": "আপনার ABHA নম্বর দিয়ে লগ ইন করুন।",
    "AI pre-consultation, video consultation, hospital visits, prescriptions and medicine delivery, all in one place.": "AI প্রাক্‌-পরামর্শ, ভিডিও পরামর্শ, হাসপাতালে যাওয়া, প্রেসক্রিপশন এবং ওষুধ পৌঁছে দেওয়া—সব এক জায়গায়।",
    "Use the SOS button for urgent help.": "জরুরি সহায়তার জন্য SOS বোতাম ব্যবহার করুন।",
    "Care for every patient, in your language": "আপনার ভাষায় প্রত্যেক রোগীর যত্ন",
    "Your appointments are listed here. Online video calls do not open when you book; the Join Video Call button becomes available only when the appointment time starts.": "আপনার অ্যাপয়েন্টমেন্টগুলি এখানে তালিকাভুক্ত। বুক করার সঙ্গে সঙ্গে অনলাইন ভিডিও কল শুরু হয় না; অ্যাপয়েন্টমেন্টের সময় শুরু হলে তবেই “ভিডিও কলে যোগ দিন” বোতামটি চালু হয়।",
    "No upcoming appointments.": "আসন্ন কোনও অ্যাপয়েন্টমেন্ট নেই।",
    "Book an appointment to see it here.": "এখানে দেখতে একটি অ্যাপয়েন্টমেন্ট বুক করুন।",
    "Offline appointment — please visit the selected hospital at the scheduled time.": "অফলাইন অ্যাপয়েন্টমেন্ট — নির্ধারিত সময়ে নির্বাচিত হাসপাতালে যান।",
    "Do you want to book an appointment?": "আপনি কি অ্যাপয়েন্টমেন্ট বুক করতে চান?",
    "Do you want to order medicines for delivery?": "আপনি কি ডেলিভারির জন্য ওষুধ অর্ডার করতে চান?",
    "Go back and add medicines to your cart.": "ফিরে গিয়ে আপনার কার্টে ওষুধ যোগ করুন।",
    "Enter the address where your medicines should be delivered.": "যে ঠিকানায় ওষুধ পৌঁছে দিতে হবে, সেটি লিখুন।",
    "Your medicine orders and estimated delivery status.": "আপনার ওষুধের অর্ডার এবং আনুমানিক ডেলিভারির অবস্থা।",
    "Your confirmed medicine orders will appear here.": "আপনার নিশ্চিত করা ওষুধের অর্ডার এখানে দেখা যাবে।",
    "Your doctor has completed the online consultation and provided the following prescription.": "আপনার চিকিৎসক অনলাইন পরামর্শ শেষ করেছেন এবং নিচের প্রেসক্রিপশন দিয়েছেন।",
    "Enter the delivery address for your prescribed medicines.": "প্রেসক্রাইব করা ওষুধ পৌঁছে দেওয়ার ঠিকানা লিখুন।",
    "Information retained successfully.": "তথ্য সফলভাবে সংরক্ষণ করা হয়েছে।",
    "Your retained information remains available to the authorized workflow.": "সংরক্ষিত তথ্য অনুমোদিত প্রক্রিয়ায় উপলব্ধ থাকবে।",
    "You are joining the appointment-specific video room. The patient mobile and doctor laptop must use this same room.": "আপনি এই অ্যাপয়েন্টমেন্টের নির্দিষ্ট ভিডিও রুমে যোগ দিচ্ছেন। রোগীর মোবাইল এবং চিকিৎসকের ল্যাপটপ—দুটিতেই একই রুম ব্যবহার করতে হবে।",
    "needs an immediate video consultation.": "এর অবিলম্বে ভিডিও পরামর্শ প্রয়োজন।",
    "Patient summary unlocked after OTP verification.": "OTP যাচাইয়ের পর রোগীর সারাংশ দেখা যাবে।",
    "Enter the prescription given by the doctor.": "চিকিৎসকের দেওয়া প্রেসক্রিপশন লিখুন।",
    "End the online consultation without a prescription.": "প্রেসক্রিপশন ছাড়াই অনলাইন পরামর্শ শেষ করুন।",
    "No prescription will be attached to this consultation.": "এই পরামর্শের সঙ্গে কোনও প্রেসক্রিপশন যুক্ত হবে না।",
    "Doctor access is granted only after the required patient authorization code is verified.": "প্রয়োজনীয় রোগী-অনুমোদন কোড যাচাই করার পরেই চিকিৎসককে প্রবেশাধিকার দেওয়া হয়।",
    "OTP has been sent to the patient's registered mobile number. Enter the OTP below to authorize access.": "রোগীর নিবন্ধিত মোবাইল নম্বরে OTP পাঠানো হয়েছে। প্রবেশাধিকার অনুমোদন করতে নিচে OTP লিখুন।",
    "Demo patient: enter the same OTP used with this patient's ABHA demo login.": "ডেমো রোগী: এই রোগীর ABHA ডেমো লগইনে ব্যবহৃত একই OTP লিখুন।",
    "Documents uploaded during this patient session": "এই রোগীর সেশনে আপলোড করা নথি",
    "No medical documents were uploaded by this current patient.": "এই রোগী এই সেশনে কোনও চিকিৎসা-সংক্রান্ত নথি আপলোড করেননি।",
    "Live operational connections currently using Aayuvora.": "বর্তমানে Aayuvora ব্যবহার করছে এমন সক্রিয় সংযোগ।",
    "Tell us how we can improve your experience.": "আপনার অভিজ্ঞতা কীভাবে আরও ভালো করা যায়, আমাদের জানান।",
    "Thank you. Your feedback has been saved in this browser.": "ধন্যবাদ। আপনার মতামত এই ব্রাউজারে সংরক্ষণ করা হয়েছে।",
    "Login with your ABHA number. AI pre-consultation, video consultation, hospital visits, prescriptions and medicine delivery, all in one place.": "আপনার ABHA নম্বর দিয়ে লগ ইন করুন। AI প্রাক্‌-পরামর্শ, ভিডিও পরামর্শ, হাসপাতালে যাওয়া, প্রেসক্রিপশন এবং ওষুধ সরবরাহ—সব এক জায়গায়।",
    "Ayurvedic history mode selected.": "আয়ুর্বেদিক ইতিহাস মোড নির্বাচন করা হয়েছে।",
    "Each uploaded document is processed independently. You can upload up to 5 documents, and each document keeps its own extracted information and summary.": "প্রতিটি আপলোড করা নথি আলাদাভাবে প্রক্রিয়া করা হয়। আপনি সর্বোচ্চ ৫টি নথি আপলোড করতে পারেন; প্রতিটি নথির সংগৃহীত তথ্য ও সারাংশ আলাদাভাবে রাখা হয়।",
    "You chose to store your information. Would you like to book an appointment now?": "আপনি আপনার তথ্য সংরক্ষণ করার সিদ্ধান্ত নিয়েছেন। আপনি কি এখন অ্যাপয়েন্টমেন্ট বুক করতে চান?",
    "Select a hospital and doctor. Your stored clinical information will be routed only to the doctor whose appointment you book.": "একটি হাসপাতাল ও চিকিৎসক নির্বাচন করুন। আপনার সংরক্ষিত চিকিৎসা-সংক্রান্ত তথ্য শুধু সেই চিকিৎসকের কাছেই পাঠানো হবে, যার সঙ্গে আপনি অ্যাপয়েন্টমেন্ট বুক করবেন।",
    "and neither type can be booked again for that doctor and time.": "এবং একই চিকিৎসকের জন্য একই সময়ে এই দুই ধরনের কোনও অ্যাপয়েন্টমেন্ট আবার বুক করা যাবে না।",
    "Slots are 10 minutes each from 9:00 AM to 1:00 AM. Today's past slots are disabled using the device's real-time clock.": "সকাল ৯টা থেকে রাত ১টা পর্যন্ত প্রতিটি সময়স্লট ১০ মিনিটের। ডিভাইসের বর্তমান সময় অনুযায়ী আজকের অতীত স্লটগুলি বন্ধ থাকে।",
    "Click the Pending Reviews box to view the 7 demo patients for this OPD and any newly booked appointment routed only to this doctor. New booked appointments show their Online or Offline appointment type. Online appointments can later be connected to the video consultation flow.": "এই OPD-র ৭ জন ডেমো রোগী এবং শুধু এই চিকিৎসকের কাছে পাঠানো নতুন বুকিং দেখতে ‘বিচারাধীন পর্যালোচনা’ বাক্সে ক্লিক করুন। নতুন বুকিংয়ে অনলাইন বা অফলাইন অ্যাপয়েন্টমেন্টের ধরন দেখা যাবে। অনলাইন অ্যাপয়েন্টমেন্ট পরে ভিডিও পরামর্শের প্রক্রিয়ার সঙ্গে যুক্ত করা যাবে।",
    "AYUSH OPD demo: the patient record includes Dashavidha Pariksha and Ahara-Vihara history for doctor review.": "AYUSH OPD ডেমো: চিকিৎসকের পর্যালোচনার জন্য রোগীর রেকর্ডে দশবিধ পরীক্ষা এবং আহার-বিহারের ইতিহাস রয়েছে।",
    "The doctor can join the video call immediately. OTP verification is required only to access the patient's clinical summary.": "চিকিৎসক সঙ্গে সঙ্গেই ভিডিও কলে যোগ দিতে পারেন। রোগীর চিকিৎসা-সংক্রান্ত সারাংশ দেখতে শুধুমাত্র OTP যাচাই প্রয়োজন।",
    "Are there any prescriptions for this patient from this online consultation?": "এই অনলাইন পরামর্শে কি রোগীর জন্য কোনও প্রেসক্রিপশন দেওয়া হয়েছে?",
    "📱 OTP has been sent to the patient's registered mobile number. Enter the OTP below to authorize access.": "📱 রোগীর নিবন্ধিত মোবাইল নম্বরে OTP পাঠানো হয়েছে। প্রবেশের অনুমতি দিতে নিচে OTP লিখুন।",
    "No prior summaries are stored in this browser for this patient. Only records saved here are displayed; backend or other-device records are not automatically fetched.": "এই ব্রাউজারে এই রোগীর কোনও পুরোনো সারাংশ সংরক্ষিত নেই। এখানে শুধু এই ব্রাউজারে সংরক্ষিত রেকর্ড দেখা যায়; সার্ভার বা অন্য ডিভাইসের রেকর্ড স্বয়ংক্রিয়ভাবে আনা হয় না।",
    "Verify demo ABHA + OTP and book the patient's appointment.": "ডেমো ABHA ও OTP যাচাই করে রোগীর অ্যাপয়েন্টমেন্ট বুক করুন।",
    "Register a new patient for appointment?": "অ্যাপয়েন্টমেন্টের জন্য নতুন রোগী নিবন্ধন করবেন?",
    "Admin can select a 10-minute appointment slot from 9:00 AM through 1:00 AM. The slot is locked for the selected doctor once booked.": "অ্যাডমিন সকাল ৯টা থেকে রাত ১টার মধ্যে ১০ মিনিটের একটি অ্যাপয়েন্টমেন্ট স্লট নির্বাচন করতে পারেন। বুক করার পর স্লটটি নির্বাচিত চিকিৎসকের জন্য লক হয়ে যায়।",
    // Patient medicine-order workflow: exact sentence-level translations.
    "Order Medicines": "ওষুধ অর্ডার করুন",
    "View Orders": "অর্ডার দেখুন",
    "Yes, order medicines": "হ্যাঁ, ওষুধ অর্ডার করুন",
    "Search and add medicines to your cart": "ওষুধ খুঁজে কার্টে যোগ করুন",
    "No, continue normally": "না, স্বাভাবিকভাবে এগিয়ে যান",
    "Continue to your normal workflow": "আপনার স্বাভাবিক প্রক্রিয়ায় এগিয়ে যান",
    "Search Medicines": "ওষুধ খুঁজুন",
    "Search from 50 medicines": "৫০টি ওষুধের মধ্যে খুঁজুন",
    "Add": "যোগ করুন",
    "View Cart": "কার্ট দেখুন",
    "Medicine Cart": "ওষুধের কার্ট",
    "Your cart is empty.": "আপনার কার্ট খালি।",
    "Quantity": "পরিমাণ",
    "Add Address": "ঠিকানা যোগ করুন",
    "Delivery Address": "ডেলিভারির ঠিকানা",
    "Address Line 1": "ঠিকানার লাইন ১",
    "House / flat / street": "বাড়ি / ফ্ল্যাট / রাস্তা",
    "Address Line 2": "ঠিকানার লাইন ২",
    "Area / landmark": "এলাকা / পরিচিত স্থান",
    "Pin Code": "পিন কোড",
    "6-digit PIN code": "৬ সংখ্যার পিন কোড",
    "City": "শহর",
    "Confirm Order": "অর্ডার নিশ্চিত করুন",
    "No orders yet": "এখনও কোনো অর্ডার নেই",
    "Medicine Order": "ওষুধের অর্ডার",
    "Booked on:": "অর্ডারের তারিখ:",
    "Qty:": "পরিমাণ:",
    "Delivery address": "ডেলিভারির ঠিকানা",
    "Delivered": "পৌঁছে দেওয়া হয়েছে",
    "Coming in": "আসতে বাকি",
    "Order More Medicines": "আরও ওষুধ অর্ডার করুন",

    // Patient home greeting, services, workflow, FAQ, and feedback sentence translations.
    "YOUR CARE, IN ONE PLACE": "আপনার যত্ন, এক জায়গায়",
    "Hello,": "নমস্কার,",
    "Start the emergency appointment workflow.": "জরুরি অ্যাপয়েন্টমেন্টের প্রক্রিয়া শুরু করুন।",
    "Browse medicines and manage your order.": "ওষুধ দেখুন এবং আপনার অর্ডার পরিচালনা করুন।",
    "Review and manage your booked appointments.": "আপনার বুক করা অ্যাপয়েন্টমেন্ট দেখুন ও পরিচালনা করুন।",
    "First tell about your health and then book an appointment.": "প্রথমে আপনার স্বাস্থ্যের কথা জানান, তারপর অ্যাপয়েন্টমেন্ট বুক করুন।",
    "Open service": "পরিষেবা খুলুন",
    "How It Works": "এটি যেভাবে কাজ করে",
    "Login": "লগ ইন করুন",
    "Tell us how you feel": "আপনি কেমন অনুভব করছেন জানান",
    "Choose and Book": "বেছে নিন ও বুক করুন",
    "Get Care": "চিকিৎসা নিন",
    "Choose AI pre-consultation, describe how you feel, and follow the steps to book or request care.": "AI প্রাক্‌-পরামর্শ বেছে নিন, আপনার কেমন লাগছে তা জানান এবং চিকিৎসা চাইতে বা অ্যাপয়েন্টমেন্ট বুক করতে ধাপগুলি অনুসরণ করুন।",
    "What is AI pre-consultation?": "AI প্রাক্‌-পরামর্শ কী?",
    "It helps organize the information you share before a clinician reviews it. It is not a diagnosis.": "চিকিৎসক পর্যালোচনা করার আগে আপনার দেওয়া তথ্য সাজাতে এটি সাহায্য করে। এটি রোগ নির্ণয় নয়।",
    "Can I order medicines here?": "আমি কি এখানে ওষুধ অর্ডার করতে পারি?",
    "Choose Order Medicines, select available items, and follow the order and address steps.": "“ওষুধ অর্ডার করুন” বেছে নিন, উপলব্ধ ওষুধ নির্বাচন করুন এবং অর্ডার ও ঠিকানার ধাপগুলি অনুসরণ করুন।",
    "Open Upcoming Appointments to view bookings available to this account.": "এই অ্যাকাউন্টের বুকিং দেখতে “আসন্ন অ্যাপয়েন্টমেন্ট” খুলুন।",
    "Where are my health summaries stored?": "আমার স্বাস্থ্য-সারাংশ কোথায় সংরক্ষিত থাকে?",
    "Can I change the language?": "আমি কি ভাষা পরিবর্তন করতে পারি?",
    "Open Menu near the Aayuvora logo and choose one of the six supported languages.": "Aayuvora লোগোর পাশে মেনু খুলে ছয়টি সমর্থিত ভাষার মধ্যে একটি বেছে নিন।",
    "How do I enable dark mode?": "আমি কীভাবে ডার্ক মোড চালু করব?",
    "Open Menu and select Dark mode.": "মেনু খুলে ডার্ক মোড নির্বাচন করুন।",
    "Use SOS for urgent help or Emergency Appointment to enter the emergency workflow. If there is immediate danger, contact local emergency services.": "জরুরি সাহায্যের জন্য SOS ব্যবহার করুন অথবা জরুরি প্রক্রিয়া শুরু করতে “জরুরি অ্যাপয়েন্টমেন্ট” বেছে নিন। তাৎক্ষণিক বিপদ হলে স্থানীয় জরুরি পরিষেবার সঙ্গে যোগাযোগ করুন।",
    "No. AI summaries are drafts to support a clinician and must be reviewed by a qualified healthcare professional.": "না। AI সারাংশ চিকিৎসককে সহায়তা করার খসড়া এবং যোগ্য স্বাস্থ্য-পেশাদারের পর্যালোচনা প্রয়োজন।",
    "Use Log out in the upper-left area of this page to return to the welcome screen.": "স্বাগত পর্দায় ফিরতে এই পৃষ্ঠার উপরের বাম দিকে “লগ আউট” ব্যবহার করুন।",
    "Feedback": "মতামত",
    "How was your experience?": "আপনার অভিজ্ঞতা কেমন ছিল?",
    "Excellent": "চমৎকার",
    "Good": "ভালো",
    "Okay": "মোটামুটি",
    "Needs improvement": "উন্নতি দরকার",
    "Poor": "খারাপ",
    "Comments": "মন্তব্য",
    "Share your feedback...": "আপনার মতামত জানান...",
    "Submit Feedback": "মতামত জমা দিন",
    "Fetching location…": "অবস্থান সংগ্রহ করা হচ্ছে…",
    "Requesting emergency location": "জরুরি অবস্থানের অনুরোধ করা হচ্ছে",
    "SOS status": "SOS-এর অবস্থা",
    "Fetched address": "সংগৃহীত ঠিকানা",

  },
  mr: {
    "Sign in securely to your account.": "तुमच्या खात्यात सुरक्षितपणे साइन इन करा.",
    "Share your symptoms and concerns.": "तुमची लक्षणे आणि चिंता सांगा.",
    "Choose a suitable care option and appointment.": "योग्य उपचार पर्याय आणि अपॉइंटमेंट निवडा.",
    "Connect with the care workflow and clinician.": "उपचार प्रक्रियेशी आणि डॉक्टरांशी संपर्क साधा.",
    "No previous summaries have been saved for this patient in this browser yet.": "या ब्राउझरमध्ये या रुग्णासाठी अद्याप कोणताही मागील सारांश जतन केलेला नाही.",
    "Complete AI pre-consultation and generate a summary to see it here.": "येथे पाहण्यासाठी AI पूर्व-सल्ला पूर्ण करा आणि सारांश तयार करा.",
    "Is there any emergency that requires an immediate doctor consultation?": "तातडीने डॉक्टरांचा सल्ला आवश्यक असलेली कोणती आपत्कालीन परिस्थिती आहे का?",
    "If you select Yes, Aayuvora will immediately create an emergency video consultation and connect you to an available doctor.": "तुम्ही होय निवडल्यास, Aayuvora त्वरित आपत्कालीन व्हिडिओ सल्ला सुरू करून उपलब्ध डॉक्टरांशी जोडेल.",
    "Start an emergency video call now": "आत्ताच आपत्कालीन व्हिडिओ कॉल सुरू करा.",
    "Continue to the regular consultation workflow": "नियमित सल्ला प्रक्रिया सुरू ठेवा.",
    "Open your previously generated health summaries with date and time.": "यापूर्वी तयार केलेले आरोग्य सारांश तारीख आणि वेळेसह उघडा.",
    "Your Records shows summaries saved in this browser for the signed-in patient.": "तुमच्या रेकॉर्डमध्ये या ब्राउझरमध्ये साइन इन केलेल्या रुग्णासाठी जतन केलेले सारांश दिसतात.",
    "What would you like to do today?": "आज तुम्हाला काय करायचे आहे?",
    "Please wait...": "कृपया प्रतीक्षा करा...",
    "Something went wrong. Please try again.": "काहीतरी चुकले. कृपया पुन्हा प्रयत्न करा.",

    "No appointments found.": "कोणतीही अपॉइंटमेंट आढळली नाही.",
    "No generated summary text is available for this session.": "या सत्रासाठी तयार केलेला सारांश उपलब्ध नाही.",
    "Unable to generate the clinical summary.": "क्लिनिकल सारांश तयार करता आला नाही.",
    "The AI assistant could not respond right now.": "AI सहाय्यक सध्या उत्तर देऊ शकला नाही.",
    "The AI assistant is temporarily unavailable.": "AI सहाय्यक तात्पुरता उपलब्ध नाही.",
    "Patient information is unavailable.": "रुग्णाची माहिती उपलब्ध नाही.",
    "Select a valid doctor from the selected hospital.": "निवडलेल्या रुग्णालयातून वैध डॉक्टर निवडा.",
    "Appointment could not be booked.": "अपॉइंटमेंट बुक करता आली नाही.",
    "This time slot is already booked for this doctor. Please choose another slot.": "ही वेळ या डॉक्टरांसाठी आधीच बुक आहे. कृपया दुसरी वेळ निवडा.",
    "Please add at least one medicine before confirming your order.": "ऑर्डर निश्चित करण्यापूर्वी किमान एक औषध जोडा.",
    "Please enter both address lines, a valid 6-digit PIN code, and city.": "कृपया पत्त्याच्या दोन्ही ओळी, वैध ६ अंकी पिन कोड आणि शहर भरा.",
    "The video call becomes available when the appointment time starts.": "अपॉइंटमेंटची वेळ सुरू झाल्यावर व्हिडिओ कॉल उपलब्ध होईल.",
    "The video room is not available for this appointment yet.": "या अपॉइंटमेंटसाठी व्हिडिओ रूम अद्याप उपलब्ध नाही.",
    "Please enter both address lines, a valid 6-digit pin code, and city.": "कृपया पत्त्याच्या दोन्ही ओळी, वैध ६ अंकी पिन कोड आणि शहर भरा.",
    "Your prescription order has been recorded successfully.": "तुमची औषध-पर्ची ऑर्डर यशस्वीपणे नोंदवली आहे.",
    "Invalid or expired OTP. Access remains blocked.": "OTP चुकीचा आहे किंवा कालबाह्य झाला आहे. प्रवेश अवरोधित राहील.",
    "OTP has been sent to the patient’s registered mobile number.": "OTP रुग्णाच्या नोंदणीकृत मोबाइल क्रमांकावर पाठवला आहे.",
    "Prescription could not be saved.": "प्रिस्क्रिप्शन जतन करता आले नाही.",
    "Unable to process this document.": "या दस्तऐवजावर प्रक्रिया करता आली नाही.",
    "No extracted information available.": "काढलेली माहिती उपलब्ध नाही.",
    "The OCR server returned an invalid response.": "OCR सर्व्हरने अवैध प्रतिसाद दिला.",
    "Sarvam AI could not process this document.": "Sarvam AI या दस्तऐवजावर प्रक्रिया करू शकले नाही.",
    "What should I do in an emergency?": "आपत्कालीन परिस्थितीत मी काय करावे?",
    "Is an AI summary a medical diagnosis?": "AI सारांश हे वैद्यकीय निदान आहे का?",
    "Where can I see my appointments?": "माझ्या अपॉइंटमेंट कुठे पाहता येतील?",
    "How do I start a consultation?": "मी सल्लामसलत कशी सुरू करू?",
    "How do I log out?": "मी लॉग आउट कसे करू?",
    "AI-assisted patient care-taking and pre-consultation platform": "AI-सहाय्यित रुग्णसेवा आणि पूर्व-सल्ला प्लॅटफॉर्म",
    "Login with your ABHA number.": "तुमच्या ABHA क्रमांकाने लॉग इन करा.",
    "AI pre-consultation, video consultation, hospital visits, prescriptions and medicine delivery, all in one place.": "AI पूर्व-सल्ला, व्हिडिओ सल्ला, रुग्णालय भेटी, प्रिस्क्रिप्शन आणि औषध वितरण—सर्व एकाच ठिकाणी.",
    "Use the SOS button for urgent help.": "तातडीच्या मदतीसाठी SOS बटण वापरा.",
    "Care for every patient, in your language": "प्रत्येक रुग्णाची काळजी, तुमच्या भाषेत",
    "Your appointments are listed here. Online video calls do not open when you book; the Join Video Call button becomes available only when the appointment time starts.": "तुमच्या अपॉइंटमेंट येथे सूचीबद्ध आहेत. बुकिंग करताच ऑनलाइन व्हिडिओ कॉल सुरू होत नाही; अपॉइंटमेंटची वेळ सुरू झाल्यावरच “व्हिडिओ कॉलमध्ये सहभागी व्हा” हे बटण उपलब्ध होते.",
    "No upcoming appointments.": "आगामी अपॉइंटमेंट नाहीत.",
    "Book an appointment to see it here.": "येथे पाहण्यासाठी अपॉइंटमेंट बुक करा.",
    "Offline appointment — please visit the selected hospital at the scheduled time.": "ऑफलाइन अपॉइंटमेंट — कृपया ठरलेल्या वेळी निवडलेल्या रुग्णालयात जा.",
    "Do you want to book an appointment?": "तुम्हाला अपॉइंटमेंट बुक करायची आहे का?",
    "Do you want to order medicines for delivery?": "तुम्हाला औषधांची घरपोच डिलिव्हरी मागवायची आहे का?",
    "Go back and add medicines to your cart.": "मागे जा आणि तुमच्या कार्टमध्ये औषधे जोडा.",
    "Enter the address where your medicines should be delivered.": "औषधे ज्या पत्त्यावर पोहोचवायची आहेत तो पत्ता भरा.",
    "Your medicine orders and estimated delivery status.": "तुमच्या औषधांच्या ऑर्डर आणि अंदाजे डिलिव्हरी स्थिती.",
    "Your confirmed medicine orders will appear here.": "तुमच्या निश्चित केलेल्या औषधांच्या ऑर्डर येथे दिसतील.",
    "Your doctor has completed the online consultation and provided the following prescription.": "तुमच्या डॉक्टरांनी ऑनलाइन सल्ला पूर्ण केला आहे आणि खालील प्रिस्क्रिप्शन दिले आहे.",
    "Enter the delivery address for your prescribed medicines.": "तुमच्यासाठी लिहून दिलेल्या औषधांच्या डिलिव्हरीचा पत्ता भरा.",
    "Information retained successfully.": "माहिती यशस्वीपणे जतन केली.",
    "Your retained information remains available to the authorized workflow.": "जतन केलेली माहिती अधिकृत प्रक्रियेसाठी उपलब्ध राहील.",
    "You are joining the appointment-specific video room. The patient mobile and doctor laptop must use this same room.": "तुम्ही या अपॉइंटमेंटसाठी असलेल्या व्हिडिओ रूममध्ये सहभागी होत आहात. रुग्णाचा मोबाइल आणि डॉक्टरचा लॅपटॉप या दोन्हींवर हीच रूम वापरली पाहिजे.",
    "needs an immediate video consultation.": "यांना तातडीने व्हिडिओ सल्ल्याची गरज आहे.",
    "Patient summary unlocked after OTP verification.": "OTP पडताळणीनंतर रुग्णाचा सारांश उपलब्ध झाला.",
    "Enter the prescription given by the doctor.": "डॉक्टरांनी दिलेले प्रिस्क्रिप्शन भरा.",
    "End the online consultation without a prescription.": "प्रिस्क्रिप्शनशिवाय ऑनलाइन सल्ला समाप्त करा.",
    "No prescription will be attached to this consultation.": "या सल्ल्यासोबत कोणतेही प्रिस्क्रिप्शन जोडले जाणार नाही.",
    "Doctor access is granted only after the required patient authorization code is verified.": "आवश्यक रुग्ण-अधिकृतता कोड पडताळल्यानंतरच डॉक्टरांना प्रवेश दिला जातो.",
    "OTP has been sent to the patient's registered mobile number. Enter the OTP below to authorize access.": "रुग्णाच्या नोंदणीकृत मोबाइल क्रमांकावर OTP पाठवला आहे. प्रवेश अधिकृत करण्यासाठी खाली OTP भरा.",
    "Demo patient: enter the same OTP used with this patient's ABHA demo login.": "डेमो रुग्ण: या रुग्णाच्या ABHA डेमो लॉगिनसाठी वापरलेला तोच OTP भरा.",
    "Documents uploaded during this patient session": "या रुग्णाच्या सत्रात अपलोड केलेली कागदपत्रे",
    "No medical documents were uploaded by this current patient.": "या रुग्णाने सध्याच्या सत्रात कोणतीही वैद्यकीय कागदपत्रे अपलोड केलेली नाहीत.",
    "Live operational connections currently using Aayuvora.": "सध्या Aayuvora वापरत असलेली सक्रिय प्रणाली जोडणी.",
    "Tell us how we can improve your experience.": "तुमचा अनुभव अधिक चांगला करण्यासाठी आम्ही काय करू शकतो ते सांगा.",
    "Thank you. Your feedback has been saved in this browser.": "धन्यवाद. तुमचा अभिप्राय या ब्राउझरमध्ये जतन केला आहे.",
    "Login with your ABHA number. AI pre-consultation, video consultation, hospital visits, prescriptions and medicine delivery, all in one place.": "तुमच्या ABHA क्रमांकाने लॉग इन करा. AI पूर्व-सल्ला, व्हिडिओ सल्ला, रुग्णालय भेटी, प्रिस्क्रिप्शन आणि औषध वितरण—सर्व एकाच ठिकाणी.",
    "Ayurvedic history mode selected.": "आयुर्वेदिक इतिहास मोड निवडला आहे.",
    "Each uploaded document is processed independently. You can upload up to 5 documents, and each document keeps its own extracted information and summary.": "प्रत्येक अपलोड केलेल्या दस्तऐवजावर स्वतंत्रपणे प्रक्रिया केली जाते. तुम्ही जास्तीत जास्त ५ दस्तऐवज अपलोड करू शकता; प्रत्येक दस्तऐवजाची काढलेली माहिती आणि सारांश स्वतंत्रपणे जतन केला जातो.",
    "You chose to store your information. Would you like to book an appointment now?": "तुम्ही तुमची माहिती जतन करण्याचा पर्याय निवडला आहे. तुम्हाला आता अपॉइंटमेंट बुक करायची आहे का?",
    "Select a hospital and doctor. Your stored clinical information will be routed only to the doctor whose appointment you book.": "रुग्णालय आणि डॉक्टर निवडा. तुमची जतन केलेली वैद्यकीय माहिती फक्त तुम्ही ज्यांची अपॉइंटमेंट बुक कराल त्या डॉक्टरांकडेच पाठवली जाईल.",
    "and neither type can be booked again for that doctor and time.": "आणि त्याच डॉक्टरांसाठी त्याच वेळी यापैकी कोणत्याही प्रकारची दुसरी अपॉइंटमेंट बुक करता येणार नाही.",
    "Slots are 10 minutes each from 9:00 AM to 1:00 AM. Today's past slots are disabled using the device's real-time clock.": "सकाळी ९ ते रात्री १ या वेळेत प्रत्येक स्लॉट १० मिनिटांचा आहे. आजचे गेलेले स्लॉट डिव्हाइसच्या चालू वेळेनुसार बंद केले जातात.",
    "Click the Pending Reviews box to view the 7 demo patients for this OPD and any newly booked appointment routed only to this doctor. New booked appointments show their Online or Offline appointment type. Online appointments can later be connected to the video consultation flow.": "या OPD मधील ७ डेमो रुग्ण आणि फक्त या डॉक्टरांकडे पाठवलेल्या नव्या अपॉइंटमेंट पाहण्यासाठी ‘प्रलंबित पुनरावलोकने’ बॉक्सवर क्लिक करा. नव्या अपॉइंटमेंटचा ऑनलाइन किंवा ऑफलाइन प्रकार दिसेल. ऑनलाइन अपॉइंटमेंट नंतर व्हिडिओ सल्ला प्रक्रियेशी जोडता येतील.",
    "AYUSH OPD demo: the patient record includes Dashavidha Pariksha and Ahara-Vihara history for doctor review.": "AYUSH OPD डेमो: डॉक्टरांच्या पुनरावलोकनासाठी रुग्णाच्या नोंदीत दशविध परीक्षा आणि आहार-विहाराचा इतिहास समाविष्ट आहे.",
    "The doctor can join the video call immediately. OTP verification is required only to access the patient's clinical summary.": "डॉक्टर त्वरित व्हिडिओ कॉलमध्ये सहभागी होऊ शकतात. रुग्णाचा वैद्यकीय सारांश पाहण्यासाठीच OTP पडताळणी आवश्यक आहे.",
    "Are there any prescriptions for this patient from this online consultation?": "या ऑनलाइन सल्लामसलतीत या रुग्णासाठी कोणते प्रिस्क्रिप्शन दिले आहे का?",
    "📱 OTP has been sent to the patient's registered mobile number. Enter the OTP below to authorize access.": "📱 रुग्णाच्या नोंदणीकृत मोबाइल क्रमांकावर OTP पाठवला आहे. प्रवेशाची परवानगी देण्यासाठी खाली OTP टाका.",
    "No prior summaries are stored in this browser for this patient. Only records saved here are displayed; backend or other-device records are not automatically fetched.": "या ब्राउझरमध्ये या रुग्णाचे जुने सारांश जतन केलेले नाहीत. येथे फक्त याच ब्राउझरमध्ये जतन केलेल्या नोंदी दिसतात; सर्व्हरवरील किंवा इतर डिव्हाइसवरील नोंदी आपोआप आणल्या जात नाहीत.",
    "Verify demo ABHA + OTP and book the patient's appointment.": "डेमो ABHA आणि OTP पडताळा आणि रुग्णाची अपॉइंटमेंट बुक करा.",
    "Register a new patient for appointment?": "अपॉइंटमेंटसाठी नवीन रुग्णाची नोंदणी करायची आहे का?",
    "Admin can select a 10-minute appointment slot from 9:00 AM through 1:00 AM. The slot is locked for the selected doctor once booked.": "अॅडमिन सकाळी ९ ते रात्री १ दरम्यान १० मिनिटांचा अपॉइंटमेंट स्लॉट निवडू शकतो. बुक केल्यानंतर तो स्लॉट निवडलेल्या डॉक्टरांसाठी लॉक होतो.",
    // Patient medicine-order workflow: exact sentence-level translations.
    "Order Medicines": "औषधे मागवा",
    "View Orders": "ऑर्डर पहा",
    "Yes, order medicines": "होय, औषधे मागवा",
    "Search and add medicines to your cart": "औषधे शोधा आणि कार्टमध्ये जोडा",
    "No, continue normally": "नाही, नेहमीची प्रक्रिया सुरू ठेवा",
    "Continue to your normal workflow": "नेहमीच्या प्रक्रियेकडे पुढे जा",
    "Search Medicines": "औषधे शोधा",
    "Search from 50 medicines": "५० औषधांमधून शोधा",
    "Add": "जोडा",
    "View Cart": "कार्ट पहा",
    "Medicine Cart": "औषधांची कार्ट",
    "Your cart is empty.": "तुमची कार्ट रिकामी आहे.",
    "Quantity": "प्रमाण",
    "Add Address": "पत्ता जोडा",
    "Delivery Address": "डिलिव्हरीचा पत्ता",
    "Address Line 1": "पत्त्याची ओळ १",
    "House / flat / street": "घर / फ्लॅट / रस्ता",
    "Address Line 2": "पत्त्याची ओळ २",
    "Area / landmark": "परिसर / खूण",
    "Pin Code": "पिन कोड",
    "6-digit PIN code": "६ अंकी पिन कोड",
    "City": "शहर",
    "Confirm Order": "ऑर्डर निश्चित करा",
    "No orders yet": "अजून कोणतीही ऑर्डर नाही",
    "Medicine Order": "औषधांची ऑर्डर",
    "Booked on:": "ऑर्डरची तारीख:",
    "Qty:": "प्रमाण:",
    "Delivery address": "डिलिव्हरीचा पत्ता",
    "Delivered": "पोहोचवले",
    "Coming in": "येण्यासाठी वेळ",
    "Order More Medicines": "आणखी औषधे मागवा",

    // Patient home greeting, services, workflow, FAQ, and feedback sentence translations.
    "YOUR CARE, IN ONE PLACE": "तुमची काळजी, एकाच ठिकाणी",
    "Hello,": "नमस्कार,",
    "Start the emergency appointment workflow.": "आपत्कालीन अपॉइंटमेंटची प्रक्रिया सुरू करा.",
    "Browse medicines and manage your order.": "औषधे पाहा आणि तुमची ऑर्डर व्यवस्थापित करा.",
    "Review and manage your booked appointments.": "बुक केलेल्या अपॉइंटमेंट पाहा आणि व्यवस्थापित करा.",
    "First tell about your health and then book an appointment.": "प्रथम तुमच्या आरोग्याबद्दल सांगा आणि नंतर अपॉइंटमेंट बुक करा.",
    "Open service": "सेवा उघडा",
    "How It Works": "हे कसे कार्य करते",
    "Login": "लॉग इन करा",
    "Tell us how you feel": "तुम्हाला कसे वाटते ते सांगा",
    "Choose and Book": "निवडा आणि बुक करा",
    "Get Care": "उपचार मिळवा",
    "Choose AI pre-consultation, describe how you feel, and follow the steps to book or request care.": "AI पूर्व-सल्ला निवडा, तुम्हाला कसे वाटते ते सांगा आणि उपचार मागण्यासाठी किंवा अपॉइंटमेंट बुक करण्यासाठी दिलेल्या पायऱ्या अनुसरा.",
    "What is AI pre-consultation?": "AI पूर्व-सल्ला म्हणजे काय?",
    "It helps organize the information you share before a clinician reviews it. It is not a diagnosis.": "डॉक्टर तपासण्यापूर्वी तुम्ही दिलेली माहिती व्यवस्थित करण्यास हे मदत करते. हे निदान नाही.",
    "Can I order medicines here?": "मी येथे औषधे मागवू शकतो का?",
    "Choose Order Medicines, select available items, and follow the order and address steps.": "“औषधे मागवा” निवडा, उपलब्ध औषधे निवडा आणि ऑर्डर व पत्त्याच्या पायऱ्या पूर्ण करा.",
    "Open Upcoming Appointments to view bookings available to this account.": "या खात्याच्या बुकिंग पाहण्यासाठी “आगामी अपॉइंटमेंट्स” उघडा.",
    "Where are my health summaries stored?": "माझे आरोग्य सारांश कुठे जतन होतात?",
    "Can I change the language?": "मी भाषा बदलू शकतो का?",
    "Open Menu near the Aayuvora logo and choose one of the six supported languages.": "Aayuvora लोगोच्या जवळ मेनू उघडा आणि सहा समर्थित भाषांपैकी एक निवडा.",
    "How do I enable dark mode?": "डार्क मोड कसा सुरू करू?",
    "Open Menu and select Dark mode.": "मेनू उघडा आणि डार्क मोड निवडा.",
    "Use SOS for urgent help or Emergency Appointment to enter the emergency workflow. If there is immediate danger, contact local emergency services.": "तातडीच्या मदतीसाठी SOS वापरा किंवा आपत्कालीन प्रक्रिया सुरू करण्यासाठी “आपत्कालीन अपॉइंटमेंट” निवडा. तात्काळ धोका असल्यास स्थानिक आपत्कालीन सेवांशी संपर्क साधा.",
    "No. AI summaries are drafts to support a clinician and must be reviewed by a qualified healthcare professional.": "नाही. AI सारांश डॉक्टरांना मदत करण्यासाठी तयार केलेले मसुदे आहेत आणि पात्र आरोग्यतज्ज्ञांनी त्यांचे पुनरावलोकन करणे आवश्यक आहे.",
    "Use Log out in the upper-left area of this page to return to the welcome screen.": "स्वागत स्क्रीनवर परतण्यासाठी या पृष्ठाच्या वरच्या डाव्या बाजूला “लॉग आउट” निवडा.",
    "Feedback": "अभिप्राय",
    "How was your experience?": "तुमचा अनुभव कसा होता?",
    "Excellent": "उत्कृष्ट",
    "Good": "चांगला",
    "Okay": "ठीक",
    "Needs improvement": "सुधारणा आवश्यक",
    "Poor": "खराब",
    "Comments": "टिप्पण्या",
    "Share your feedback...": "तुमचा अभिप्राय सांगा...",
    "Submit Feedback": "अभिप्राय पाठवा",
    "Fetching location…": "स्थान मिळवत आहे…",
    "Requesting emergency location": "आपत्कालीन स्थानाची विनंती करत आहे",
    "SOS status": "SOS स्थिती",
    "Fetched address": "मिळालेला पत्ता",

  },
  te: {
    "Sign in securely to your account.": "మీ ఖాతాలో సురక్షితంగా సైన్ ఇన్ చేయండి.",
    "Share your symptoms and concerns.": "మీ లక్షణాలు మరియు ఆందోళనలను తెలియజేయండి.",
    "Choose a suitable care option and appointment.": "తగిన సంరక్షణ ఎంపిక మరియు అపాయింట్‌మెంట్‌ను ఎంచుకోండి.",
    "Connect with the care workflow and clinician.": "సంరక్షణ ప్రక్రియ మరియు వైద్యుడితో కనెక్ట్ అవ్వండి.",
    "No previous summaries have been saved for this patient in this browser yet.": "ఈ బ్రౌజర్‌లో ఈ రోగికి సంబంధించిన మునుపటి సారాంశాలు ఇంకా ఏవీ సేవ్ చేయబడలేదు.",
    "Complete AI pre-consultation and generate a summary to see it here.": "ఇక్కడ చూడటానికి AI ముందస్తు సంప్రదింపును పూర్తి చేసి సారాంశాన్ని రూపొందించండి.",
    "Is there any emergency that requires an immediate doctor consultation?": "వెంటనే వైద్యుడిని సంప్రదించాల్సిన అత్యవసర పరిస్థితి ఏదైనా ఉందా?",
    "If you select Yes, Aayuvora will immediately create an emergency video consultation and connect you to an available doctor.": "మీరు అవును ఎంచుకుంటే, Aayuvora వెంటనే అత్యవసర వీడియో సంప్రదింపును ప్రారంభించి అందుబాటులో ఉన్న వైద్యుడితో కలుపుతుంది.",
    "Start an emergency video call now": "ఇప్పుడే అత్యవసర వీడియో కాల్ ప్రారంభించండి.",
    "Continue to the regular consultation workflow": "సాధారణ సంప్రదింపు విధానాన్ని కొనసాగించండి.",
    "Open your previously generated health summaries with date and time.": "గతంలో రూపొందించిన ఆరోగ్య సారాంశాలను తేదీ మరియు సమయంతో తెరవండి.",
    "Your Records shows summaries saved in this browser for the signed-in patient.": "మీ రికార్డ్స్‌లో ఈ బ్రౌజర్‌లో సైన్ ఇన్ చేసిన రోగి కోసం సేవ్ చేసిన సారాంశాలు కనిపిస్తాయి.",
    "What would you like to do today?": "ఈ రోజు మీరు ఏమి చేయాలనుకుంటున్నారు?",
    "Please wait...": "దయచేసి వేచి ఉండండి...",
    "Something went wrong. Please try again.": "ఏదో తప్పు జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.",

    "No appointments found.": "అపాయింట్\u200cమెంట్\u200cలు కనబడలేదు.",
    "No generated summary text is available for this session.": "ఈ సెషన్\u200cకు రూపొందించిన సారాంశం అందుబాటులో లేదు.",
    "Unable to generate the clinical summary.": "క్లినికల్ సారాంశాన్ని రూపొందించలేకపోయాము.",
    "The AI assistant could not respond right now.": "AI సహాయకుడు ప్రస్తుతం స్పందించలేకపోయాడు.",
    "The AI assistant is temporarily unavailable.": "AI సహాయకుడు తాత్కాలికంగా అందుబాటులో లేడు.",
    "Patient information is unavailable.": "రోగి సమాచారం అందుబాటులో లేదు.",
    "Select a valid doctor from the selected hospital.": "ఎంచుకున్న ఆసుపత్రి నుంచి సరైన వైద్యుడిని ఎంచుకోండి.",
    "Appointment could not be booked.": "అపాయింట్\u200cమెంట్ బుక్ చేయలేకపోయాము.",
    "This time slot is already booked for this doctor. Please choose another slot.": "ఈ సమయం ఈ వైద్యుడికి ఇప్పటికే బుక్ అయింది. దయచేసి మరో సమయాన్ని ఎంచుకోండి.",
    "Please add at least one medicine before confirming your order.": "ఆర్డర్\u200cను నిర్ధారించే ముందు కనీసం ఒక మందును జోడించండి.",
    "Please enter both address lines, a valid 6-digit PIN code, and city.": "చిరునామా రెండు లైన్లు, సరైన 6 అంకెల PIN కోడ్, నగరాన్ని నమోదు చేయండి.",
    "The video call becomes available when the appointment time starts.": "అపాయింట్\u200cమెంట్ సమయం ప్రారంభమైనప్పుడు వీడియో కాల్ అందుబాటులోకి వస్తుంది.",
    "The video room is not available for this appointment yet.": "ఈ అపాయింట్\u200cమెంట్\u200cకు వీడియో గది ఇంకా అందుబాటులో లేదు.",
    "Please enter both address lines, a valid 6-digit pin code, and city.": "చిరునామా రెండు లైన్లు, సరైన 6 అంకెల PIN కోడ్, నగరాన్ని నమోదు చేయండి.",
    "Your prescription order has been recorded successfully.": "మీ ప్రిస్క్రిప్షన్ ఆర్డర్ విజయవంతంగా నమోదు చేయబడింది.",
    "Invalid or expired OTP. Access remains blocked.": "OTP చెల్లదు లేదా గడువు ముగిసింది. ప్రవేశం నిరోధించబడుతుంది.",
    "OTP has been sent to the patient’s registered mobile number.": "రోగి నమోదు చేసిన మొబైల్ నంబర్\u200cకు OTP పంపబడింది.",
    "Prescription could not be saved.": "ప్రిస్క్రిప్షన్\u200cను సేవ్ చేయలేకపోయాము.",
    "Unable to process this document.": "ఈ పత్రాన్ని ప్రాసెస్ చేయలేకపోయాము.",
    "No extracted information available.": "సేకరించిన సమాచారం అందుబాటులో లేదు.",
    "The OCR server returned an invalid response.": "OCR సర్వర్ చెల్లని ప్రతిస్పందన ఇచ్చింది.",
    "Sarvam AI could not process this document.": "Sarvam AI ఈ పత్రాన్ని ప్రాసెస్ చేయలేకపోయింది.",
    "What should I do in an emergency?": "అత్యవసర పరిస్థితిలో నేను ఏమి చేయాలి?",
    "Is an AI summary a medical diagnosis?": "AI సారాంశం వైద్య నిర్ధారణనా?",
    "Where can I see my appointments?": "నా అపాయింట్\u200cమెంట్\u200cలను ఎక్కడ చూడగలను?",
    "How do I start a consultation?": "సంప్రదింపును ఎలా ప్రారంభించాలి?",
    "How do I log out?": "నేను ఎలా లాగ్ అవుట్ చేయాలి?",
    "AI-assisted patient care-taking and pre-consultation platform": "AI సహాయంతో రోగి సంరక్షణ మరియు ముందస్తు సంప్రదింపు వేదిక",
    "Login with your ABHA number.": "మీ ABHA నంబర్‌తో లాగిన్ అవ్వండి.",
    "AI pre-consultation, video consultation, hospital visits, prescriptions and medicine delivery, all in one place.": "AI ముందస్తు సంప్రదింపు, వీడియో సంప్రదింపు, ఆసుపత్రి సందర్శనలు, ప్రిస్క్రిప్షన్లు, మందుల డెలివరీ—అన్నీ ఒకేచోట.",
    "Use the SOS button for urgent help.": "అత్యవసర సహాయం కోసం SOS బటన్‌ను ఉపయోగించండి.",
    "Care for every patient, in your language": "మీ భాషలో ప్రతి రోగికి సంరక్షణ",
    "Your appointments are listed here. Online video calls do not open when you book; the Join Video Call button becomes available only when the appointment time starts.": "మీ అపాయింట్‌మెంట్‌లు ఇక్కడ జాబితా చేయబడతాయి. బుక్ చేసిన వెంటనే ఆన్‌లైన్ వీడియో కాల్ ప్రారంభం కాదు; అపాయింట్‌మెంట్ సమయం మొదలైనప్పుడే “వీడియో కాల్‌లో చేరండి” బటన్ అందుబాటులోకి వస్తుంది.",
    "No upcoming appointments.": "రాబోయే అపాయింట్‌మెంట్‌లు లేవు.",
    "Book an appointment to see it here.": "ఇక్కడ చూడటానికి అపాయింట్‌మెంట్ బుక్ చేయండి.",
    "Offline appointment — please visit the selected hospital at the scheduled time.": "ఆఫ్‌లైన్ అపాయింట్‌మెంట్ — నిర్ణయించిన సమయంలో ఎంచుకున్న ఆసుపత్రికి వెళ్లండి.",
    "Do you want to book an appointment?": "మీరు అపాయింట్‌మెంట్ బుక్ చేయాలనుకుంటున్నారా?",
    "Do you want to order medicines for delivery?": "డెలివరీ కోసం మందులను ఆర్డర్ చేయాలనుకుంటున్నారా?",
    "Go back and add medicines to your cart.": "వెనక్కి వెళ్లి మీ కార్ట్‌లో మందులను జోడించండి.",
    "Enter the address where your medicines should be delivered.": "మందులను అందించాల్సిన చిరునామాను నమోదు చేయండి.",
    "Your medicine orders and estimated delivery status.": "మీ మందుల ఆర్డర్లు మరియు అంచనా డెలివరీ స్థితి.",
    "Your confirmed medicine orders will appear here.": "మీ నిర్ధారించిన మందుల ఆర్డర్లు ఇక్కడ కనిపిస్తాయి.",
    "Your doctor has completed the online consultation and provided the following prescription.": "మీ డాక్టర్ ఆన్‌లైన్ సంప్రదింపును పూర్తి చేసి, కింది ప్రిస్క్రిప్షన్‌ను అందించారు.",
    "Enter the delivery address for your prescribed medicines.": "మీకు సూచించిన మందులను డెలివరీ చేయాల్సిన చిరునామాను నమోదు చేయండి.",
    "Information retained successfully.": "సమాచారం విజయవంతంగా భద్రపరచబడింది.",
    "Your retained information remains available to the authorized workflow.": "మీరు భద్రపరిచిన సమాచారం అనుమతించబడిన విధానంలో అందుబాటులో ఉంటుంది.",
    "You are joining the appointment-specific video room. The patient mobile and doctor laptop must use this same room.": "మీరు ఈ అపాయింట్‌మెంట్‌కు సంబంధించిన వీడియో గదిలో చేరుతున్నారు. రోగి మొబైల్ మరియు డాక్టర్ ల్యాప్‌టాప్ రెండింటిలోనూ ఇదే గదిని ఉపయోగించాలి.",
    "needs an immediate video consultation.": "కు వెంటనే వీడియో సంప్రదింపు అవసరం.",
    "Patient summary unlocked after OTP verification.": "OTP ధృవీకరణ తర్వాత రోగి సారాంశం అందుబాటులోకి వచ్చింది.",
    "Enter the prescription given by the doctor.": "డాక్టర్ ఇచ్చిన ప్రిస్క్రిప్షన్‌ను నమోదు చేయండి.",
    "End the online consultation without a prescription.": "ప్రిస్క్రిప్షన్ లేకుండానే ఆన్‌లైన్ సంప్రదింపును ముగించండి.",
    "No prescription will be attached to this consultation.": "ఈ సంప్రదింపుకు ప్రిస్క్రిప్షన్ జత చేయబడదు.",
    "Doctor access is granted only after the required patient authorization code is verified.": "అవసరమైన రోగి అనుమతి కోడ్‌ను ధృవీకరించిన తర్వాతే డాక్టర్‌కు ప్రవేశం ఇవ్వబడుతుంది.",
    "OTP has been sent to the patient's registered mobile number. Enter the OTP below to authorize access.": "రోగి నమోదు చేసిన మొబైల్ నంబర్‌కు OTP పంపబడింది. ప్రవేశాన్ని అనుమతించడానికి కింద OTP నమోదు చేయండి.",
    "Demo patient: enter the same OTP used with this patient's ABHA demo login.": "డెమో రోగి: ఈ రోగి ABHA డెమో లాగిన్‌లో ఉపయోగించిన అదే OTP నమోదు చేయండి.",
    "Documents uploaded during this patient session": "ఈ రోగి సెషన్‌లో అప్‌లోడ్ చేసిన పత్రాలు",
    "No medical documents were uploaded by this current patient.": "ప్రస్తుత రోగి ఈ సెషన్‌లో వైద్య పత్రాలను అప్‌లోడ్ చేయలేదు.",
    "Live operational connections currently using Aayuvora.": "ప్రస్తుతం Aayuvoraను ఉపయోగిస్తున్న ప్రత్యక్ష కార్యాచరణ కనెక్షన్‌లు.",
    "Tell us how we can improve your experience.": "మీ అనుభవాన్ని మేమెలా మెరుగుపరచగలమో మాకు తెలియజేయండి.",
    "Thank you. Your feedback has been saved in this browser.": "ధన్యవాదాలు. మీ అభిప్రాయం ఈ బ్రౌజర్‌లో భద్రపరచబడింది.",
    "Login with your ABHA number. AI pre-consultation, video consultation, hospital visits, prescriptions and medicine delivery, all in one place.": "మీ ABHA నంబర్‌తో లాగిన్ అవ్వండి. AI ముందస్తు సంప్రదింపు, వీడియో సంప్రదింపు, ఆసుపత్రి సందర్శనలు, ప్రిస్క్రిప్షన్‌లు, మందుల డెలివరీ—అన్నీ ఒకేచోట.",
    "Ayurvedic history mode selected.": "ఆయుర్వేద చరిత్ర మోడ్ ఎంచుకోబడింది.",
    "Each uploaded document is processed independently. You can upload up to 5 documents, and each document keeps its own extracted information and summary.": "అప్‌లోడ్ చేసిన ప్రతి పత్రాన్ని విడిగా ప్రాసెస్ చేస్తారు. మీరు గరిష్ఠంగా 5 పత్రాలను అప్‌లోడ్ చేయవచ్చు; ప్రతి పత్రం నుంచి సేకరించిన సమాచారం, సారాంశం విడిగా ఉంచబడతాయి.",
    "You chose to store your information. Would you like to book an appointment now?": "మీ సమాచారాన్ని భద్రపరచాలని మీరు ఎంచుకున్నారు. ఇప్పుడు అపాయింట్‌మెంట్ బుక్ చేయాలనుకుంటున్నారా?",
    "Select a hospital and doctor. Your stored clinical information will be routed only to the doctor whose appointment you book.": "ఆసుపత్రి మరియు వైద్యుడిని ఎంచుకోండి. మీరు అపాయింట్‌మెంట్ బుక్ చేసే వైద్యుడికే మీ భద్రపరిచిన వైద్య సమాచారం పంపబడుతుంది.",
    "and neither type can be booked again for that doctor and time.": "అదే వైద్యుడికి అదే సమయంలో ఈ రెండు రకాలలో ఏదీ మళ్లీ బుక్ చేయలేరు.",
    "Slots are 10 minutes each from 9:00 AM to 1:00 AM. Today's past slots are disabled using the device's real-time clock.": "ఉదయం 9:00 నుంచి రాత్రి 1:00 వరకు ప్రతి స్లాట్ 10 నిమిషాలది. పరికరంలోని ప్రస్తుత సమయాన్ని బట్టి ఈరోజు గడిచిన స్లాట్‌లు నిలిపివేయబడతాయి.",
    "Click the Pending Reviews box to view the 7 demo patients for this OPD and any newly booked appointment routed only to this doctor. New booked appointments show their Online or Offline appointment type. Online appointments can later be connected to the video consultation flow.": "ఈ OPDలోని 7 డెమో రోగులు మరియు ఈ వైద్యుడికే పంపిన కొత్త బుకింగ్‌లను చూడటానికి ‘పెండింగ్ సమీక్షలు’ బాక్స్‌పై క్లిక్ చేయండి. కొత్త అపాయింట్‌మెంట్‌లు ఆన్‌లైన్ లేదా ఆఫ్‌లైన్ రకాన్ని చూపిస్తాయి. ఆన్‌లైన్ అపాయింట్‌మెంట్‌లను తర్వాత వీడియో సంప్రదింపు విధానానికి అనుసంధానించవచ్చు.",
    "AYUSH OPD demo: the patient record includes Dashavidha Pariksha and Ahara-Vihara history for doctor review.": "AYUSH OPD డెమో: వైద్యుడు పరిశీలించడానికి రోగి రికార్డులో దశవిధ పరీక్ష మరియు ఆహార-విహార చరిత్ర ఉంటాయి.",
    "The doctor can join the video call immediately. OTP verification is required only to access the patient's clinical summary.": "వైద్యుడు వెంటనే వీడియో కాల్‌లో చేరవచ్చు. రోగి వైద్య సారాంశాన్ని చూడటానికి మాత్రమే OTP ధృవీకరణ అవసరం.",
    "Are there any prescriptions for this patient from this online consultation?": "ఈ ఆన్‌లైన్ సంప్రదింపులో ఈ రోగికి ఏదైనా ప్రిస్క్రిప్షన్ ఇచ్చారా?",
    "📱 OTP has been sent to the patient's registered mobile number. Enter the OTP below to authorize access.": "📱 రోగి నమోదిత మొబైల్ నంబర్‌కు OTP పంపబడింది. యాక్సెస్‌కు అనుమతి ఇవ్వడానికి కింద OTP నమోదు చేయండి.",
    "No prior summaries are stored in this browser for this patient. Only records saved here are displayed; backend or other-device records are not automatically fetched.": "ఈ బ్రౌజర్‌లో ఈ రోగికి సంబంధించిన పాత సారాంశాలు లేవు. ఇక్కడ భద్రపరిచిన రికార్డులే కనిపిస్తాయి; సర్వర్ లేదా ఇతర పరికరాల రికార్డులు ఆటోమేటిక్‌గా పొందబడవు.",
    "Verify demo ABHA + OTP and book the patient's appointment.": "డెమో ABHA మరియు OTPని ధృవీకరించి రోగి అపాయింట్‌మెంట్‌ను బుక్ చేయండి.",
    "Register a new patient for appointment?": "అపాయింట్‌మెంట్ కోసం కొత్త రోగిని నమోదు చేయాలా?",
    "Admin can select a 10-minute appointment slot from 9:00 AM through 1:00 AM. The slot is locked for the selected doctor once booked.": "అడ్మిన్ ఉదయం 9:00 నుంచి రాత్రి 1:00 మధ్య 10 నిమిషాల అపాయింట్‌మెంట్ స్లాట్‌ను ఎంచుకోవచ్చు. బుక్ చేసిన తర్వాత ఆ స్లాట్ ఎంచుకున్న వైద్యుడికి లాక్ అవుతుంది.",
    // Patient medicine-order workflow: exact sentence-level translations.
    "Order Medicines": "మందులు ఆర్డర్ చేయండి",
    "View Orders": "ఆర్డర్లు చూడండి",
    "Yes, order medicines": "అవును, మందులు ఆర్డర్ చేయండి",
    "Search and add medicines to your cart": "మందులను వెతికి కార్ట్\u200cలో చేర్చండి",
    "No, continue normally": "వద్దు, సాధారణంగా కొనసాగండి",
    "Continue to your normal workflow": "మీ సాధారణ ప్రక్రియను కొనసాగించండి",
    "Search Medicines": "మందులను వెతకండి",
    "Search from 50 medicines": "50 మందుల్లో వెతకండి",
    "Add": "చేర్చండి",
    "View Cart": "కార్ట్ చూడండి",
    "Medicine Cart": "మందుల కార్ట్",
    "Your cart is empty.": "మీ కార్ట్ ఖాళీగా ఉంది.",
    "Quantity": "పరిమాణం",
    "Add Address": "చిరునామా చేర్చండి",
    "Delivery Address": "డెలివరీ చిరునామా",
    "Address Line 1": "చిరునామా లైన్ 1",
    "House / flat / street": "ఇల్లు / ఫ్లాట్ / వీధి",
    "Address Line 2": "చిరునామా లైన్ 2",
    "Area / landmark": "ప్రాంతం / గుర్తు",
    "Pin Code": "పిన్ కోడ్",
    "6-digit PIN code": "6 అంకెల పిన్ కోడ్",
    "City": "నగరం",
    "Confirm Order": "ఆర్డర్\u200cను నిర్ధారించండి",
    "No orders yet": "ఇంకా ఆర్డర్లు లేవు",
    "Medicine Order": "మందుల ఆర్డర్",
    "Booked on:": "ఆర్డర్ చేసిన తేదీ:",
    "Qty:": "పరిమాణం:",
    "Delivery address": "డెలివరీ చిరునామా",
    "Delivered": "డెలివరీ పూర్తయింది",
    "Coming in": "వచ్చే సమయం",
    "Order More Medicines": "మరిన్ని మందులు ఆర్డర్ చేయండి",

    // Patient home greeting, services, workflow, FAQ, and feedback sentence translations.
    "YOUR CARE, IN ONE PLACE": "మీ సంరక్షణ, ఒకే చోట",
    "Hello,": "నమస్కారం,",
    "Start the emergency appointment workflow.": "అత్యవసర అపాయింట్‌మెంట్ ప్రక్రియను ప్రారంభించండి.",
    "Browse medicines and manage your order.": "మందులను చూడండి, మీ ఆర్డర్‌ను నిర్వహించండి.",
    "Review and manage your booked appointments.": "మీరు బుక్ చేసిన అపాయింట్‌మెంట్‌లను చూడండి, నిర్వహించండి.",
    "First tell about your health and then book an appointment.": "ముందుగా మీ ఆరోగ్యం గురించి చెప్పి, ఆపై అపాయింట్‌మెంట్ బుక్ చేయండి.",
    "Open service": "సేవను తెరవండి",
    "How It Works": "ఇది ఎలా పనిచేస్తుంది",
    "Login": "లాగిన్ చేయండి",
    "Tell us how you feel": "మీకు ఎలా అనిపిస్తుందో చెప్పండి",
    "Choose and Book": "ఎంచుకుని బుక్ చేయండి",
    "Get Care": "సంరక్షణ పొందండి",
    "Choose AI pre-consultation, describe how you feel, and follow the steps to book or request care.": "AI ముందస్తు సంప్రదింపును ఎంచుకుని, మీకు ఎలా అనిపిస్తుందో వివరించి, అపాయింట్‌మెంట్ బుక్ చేయడానికి లేదా సంరక్షణ కోరడానికి దశలను అనుసరించండి.",
    "What is AI pre-consultation?": "AI ముందస్తు సంప్రదింపు అంటే ఏమిటి?",
    "It helps organize the information you share before a clinician reviews it. It is not a diagnosis.": "వైద్యుడు పరిశీలించే ముందు మీరు పంచుకున్న సమాచారాన్ని క్రమబద్ధీకరించడంలో ఇది సహాయపడుతుంది. ఇది రోగ నిర్ధారణ కాదు.",
    "Can I order medicines here?": "నేను ఇక్కడ మందులను ఆర్డర్ చేయవచ్చా?",
    "Choose Order Medicines, select available items, and follow the order and address steps.": "“మందులు ఆర్డర్ చేయండి” ఎంచుకుని, అందుబాటులో ఉన్న మందులను ఎంపిక చేసి, ఆర్డర్ మరియు చిరునామా దశలను అనుసరించండి.",
    "Open Upcoming Appointments to view bookings available to this account.": "ఈ ఖాతాకు సంబంధించిన బుకింగ్‌లను చూడటానికి “రాబోయే అపాయింట్‌మెంట్‌లు” తెరవండి.",
    "Where are my health summaries stored?": "నా ఆరోగ్య సారాంశాలు ఎక్కడ నిల్వ ఉంటాయి?",
    "Can I change the language?": "నేను భాషను మార్చవచ్చా?",
    "Open Menu near the Aayuvora logo and choose one of the six supported languages.": "Aayuvora లోగో పక్కన ఉన్న మెనూను తెరిచి, మద్దతు ఉన్న ఆరు భాషల్లో ఒకదాన్ని ఎంచుకోండి.",
    "How do I enable dark mode?": "డార్క్ మోడ్‌ను ఎలా ప్రారంభించాలి?",
    "Open Menu and select Dark mode.": "మెనూను తెరిచి డార్క్ మోడ్‌ను ఎంచుకోండి.",
    "Use SOS for urgent help or Emergency Appointment to enter the emergency workflow. If there is immediate danger, contact local emergency services.": "తక్షణ సహాయం కోసం SOS ఉపయోగించండి లేదా అత్యవసర ప్రక్రియలోకి వెళ్లడానికి “అత్యవసర అపాయింట్‌మెంట్” ఎంచుకోండి. వెంటనే ప్రమాదం ఉంటే స్థానిక అత్యవసర సేవలను సంప్రదించండి.",
    "No. AI summaries are drafts to support a clinician and must be reviewed by a qualified healthcare professional.": "కాదు. AI సారాంశాలు వైద్యుడికి సహాయపడే ముసాయిదాలు మాత్రమే; అర్హత కలిగిన ఆరోగ్య నిపుణుడు వాటిని సమీక్షించాలి.",
    "Use Log out in the upper-left area of this page to return to the welcome screen.": "స్వాగత స్క్రీన్‌కు తిరిగి వెళ్లడానికి ఈ పేజీ ఎగువ ఎడమవైపు ఉన్న “లాగ్ అవుట్”ను ఎంచుకోండి.",
    "Feedback": "అభిప్రాయం",
    "How was your experience?": "మీ అనుభవం ఎలా ఉంది?",
    "Excellent": "అద్భుతం",
    "Good": "బాగుంది",
    "Okay": "పర్వాలేదు",
    "Needs improvement": "మెరుగుపరచాలి",
    "Poor": "బాగాలేదు",
    "Comments": "వ్యాఖ్యలు",
    "Share your feedback...": "మీ అభిప్రాయాన్ని తెలియజేయండి...",
    "Submit Feedback": "అభిప్రాయాన్ని సమర్పించండి",
    "Fetching location…": "స్థానాన్ని పొందుతోంది…",
    "Requesting emergency location": "అత్యవసర స్థానం కోసం అభ్యర్థిస్తోంది",
    "SOS status": "SOS స్థితి",
    "Fetched address": "పొందిన చిరునామా",

  },
  ta: {
    "Sign in securely to your account.": "உங்கள் கணக்கில் பாதுகாப்பாக உள்நுழையவும்.",
    "Share your symptoms and concerns.": "உங்கள் அறிகுறிகளையும் கவலைகளையும் பகிரவும்.",
    "Choose a suitable care option and appointment.": "பொருத்தமான பராமரிப்பு விருப்பத்தையும் சந்திப்பையும் தேர்ந்தெடுக்கவும்.",
    "Connect with the care workflow and clinician.": "பராமரிப்பு செயல்முறை மற்றும் மருத்துவருடன் இணையவும்.",
    "No previous summaries have been saved for this patient in this browser yet.": "இந்த உலாவியில் இந்த நோயாளிக்கான முந்தைய சுருக்கங்கள் எதுவும் இன்னும் சேமிக்கப்படவில்லை.",
    "Complete AI pre-consultation and generate a summary to see it here.": "இதை இங்கே காண AI முன் ஆலோசனையை முடித்து சுருக்கத்தை உருவாக்கவும்.",
    "Is there any emergency that requires an immediate doctor consultation?": "உடனடி மருத்துவர் ஆலோசனை தேவைப்படும் அவசரநிலை ஏதேனும் உள்ளதா?",
    "If you select Yes, Aayuvora will immediately create an emergency video consultation and connect you to an available doctor.": "ஆம் என்பதைத் தேர்ந்தெடுத்தால், Aayuvora உடனடியாக அவசர காணொலி ஆலோசனையைத் தொடங்கி கிடைக்கும் மருத்துவருடன் இணைக்கும்.",
    "Start an emergency video call now": "இப்போதே அவசர காணொலி அழைப்பைத் தொடங்கவும்.",
    "Continue to the regular consultation workflow": "வழக்கமான ஆலோசனை செயல்முறையைத் தொடரவும்.",
    "Open your previously generated health summaries with date and time.": "முன்பு உருவாக்கிய உடல்நலச் சுருக்கங்களை தேதி மற்றும் நேரத்துடன் திறக்கவும்.",
    "Your Records shows summaries saved in this browser for the signed-in patient.": "உங்கள் பதிவுகள் பகுதியில் இந்த உலாவியில் உள்நுழைந்த நோயாளிக்காகச் சேமிக்கப்பட்ட சுருக்கங்கள் காட்டப்படும்.",
    "What would you like to do today?": "இன்று நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?",
    "Please wait...": "தயவுசெய்து காத்திருக்கவும்...",
    "Something went wrong. Please try again.": "ஏதோ தவறு ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.",

    "No appointments found.": "சந்திப்புகள் எதுவும் இல்லை.",
    "No generated summary text is available for this session.": "இந்த அமர்வுக்கான உருவாக்கப்பட்ட சுருக்கம் கிடைக்கவில்லை.",
    "Unable to generate the clinical summary.": "மருத்துவச் சுருக்கத்தை உருவாக்க முடியவில்லை.",
    "The AI assistant could not respond right now.": "AI உதவியாளரால் இப்போது பதிலளிக்க முடியவில்லை.",
    "The AI assistant is temporarily unavailable.": "AI உதவியாளர் தற்காலிகமாக கிடைக்கவில்லை.",
    "Patient information is unavailable.": "நோயாளர் தகவல் கிடைக்கவில்லை.",
    "Select a valid doctor from the selected hospital.": "தேர்ந்தெடுத்த மருத்துவமனையிலிருந்து சரியான மருத்துவரைத் தேர்ந்தெடுக்கவும்.",
    "Appointment could not be booked.": "சந்திப்பைப் பதிவு செய்ய முடியவில்லை.",
    "This time slot is already booked for this doctor. Please choose another slot.": "இந்த நேரம் இந்த மருத்துவருக்கு ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. வேறு நேரத்தைத் தேர்ந்தெடுக்கவும்.",
    "Please add at least one medicine before confirming your order.": "ஆர்டரை உறுதிப்படுத்துவதற்கு முன் குறைந்தது ஒரு மருந்தையாவது சேர்க்கவும்.",
    "Please enter both address lines, a valid 6-digit PIN code, and city.": "முகவரியின் இரண்டு வரிகள், சரியான 6 இலக்க PIN குறியீடு மற்றும் நகரத்தை உள்ளிடவும்.",
    "The video call becomes available when the appointment time starts.": "சந்திப்பு நேரம் தொடங்கும்போது காணொலி அழைப்பு கிடைக்கும்.",
    "The video room is not available for this appointment yet.": "இந்தச் சந்திப்பிற்கான காணொலி அறை இன்னும் கிடைக்கவில்லை.",
    "Please enter both address lines, a valid 6-digit pin code, and city.": "முகவரியின் இரண்டு வரிகள், சரியான 6 இலக்க PIN குறியீடு மற்றும் நகரத்தை உள்ளிடவும்.",
    "Your prescription order has been recorded successfully.": "உங்கள் மருந்துச் சீட்டு ஆர்டர் வெற்றிகரமாகப் பதிவு செய்யப்பட்டது.",
    "Invalid or expired OTP. Access remains blocked.": "OTP தவறானது அல்லது காலாவதியானது. அணுகல் தடுக்கப்பட்டிருக்கும்.",
    "OTP has been sent to the patient’s registered mobile number.": "நோயாளியின் பதிவு செய்யப்பட்ட கைப்பேசி எண்ணுக்கு OTP அனுப்பப்பட்டுள்ளது.",
    "Prescription could not be saved.": "மருந்துச் சீட்டைச் சேமிக்க முடியவில்லை.",
    "Unable to process this document.": "இந்த ஆவணத்தைச் செயலாக்க முடியவில்லை.",
    "No extracted information available.": "பிரித்தெடுக்கப்பட்ட தகவல் எதுவும் கிடைக்கவில்லை.",
    "The OCR server returned an invalid response.": "OCR சேவையகம் தவறான பதிலை வழங்கியது.",
    "Sarvam AI could not process this document.": "Sarvam AI இந்த ஆவணத்தைச் செயலாக்க முடியவில்லை.",
    "What should I do in an emergency?": "அவசரநிலையில் நான் என்ன செய்ய வேண்டும்?",
    "Is an AI summary a medical diagnosis?": "AI சுருக்கம் மருத்துவ நோயறிதலா?",
    "Where can I see my appointments?": "எனது சந்திப்புகளை எங்கே பார்க்கலாம்?",
    "How do I start a consultation?": "ஆலோசனையை எப்படித் தொடங்குவது?",
    "How do I log out?": "நான் எப்படிக் வெளியேறுவது?",
    "AI-assisted patient care-taking and pre-consultation platform": "AI உதவியுடன் நோயாளர் பராமரிப்பு மற்றும் முன் ஆலோசனைத் தளம்",
    "Login with your ABHA number.": "உங்கள் ABHA எண்ணைப் பயன்படுத்தி உள்நுழையவும்.",
    "AI pre-consultation, video consultation, hospital visits, prescriptions and medicine delivery, all in one place.": "AI முன் ஆலோசனை, காணொலி ஆலோசனை, மருத்துவமனை வருகைகள், மருந்துச் சீட்டுகள் மற்றும் மருந்து விநியோகம்—அனைத்தும் ஒரே இடத்தில்.",
    "Use the SOS button for urgent help.": "அவசர உதவிக்கு SOS பொத்தானைப் பயன்படுத்தவும்.",
    "Care for every patient, in your language": "ஒவ்வொரு நோயாளிக்கும் உங்கள் மொழியில் பராமரிப்பு",
    "Your appointments are listed here. Online video calls do not open when you book; the Join Video Call button becomes available only when the appointment time starts.": "உங்கள் சந்திப்புகள் இங்கே பட்டியலிடப்பட்டுள்ளன. பதிவு செய்தவுடன் காணொலி அழைப்பு தொடங்காது; சந்திப்பு நேரம் தொடங்கிய பிறகே “காணொலி அழைப்பில் சேரவும்” பொத்தான் கிடைக்கும்.",
    "No upcoming appointments.": "வரவிருக்கும் சந்திப்புகள் இல்லை.",
    "Book an appointment to see it here.": "இங்கே காண ஒரு சந்திப்பைப் பதிவு செய்யவும்.",
    "Offline appointment — please visit the selected hospital at the scheduled time.": "நேரடி சந்திப்பு — குறிப்பிட்ட நேரத்தில் தேர்ந்தெடுத்த மருத்துவமனைக்குச் செல்லவும்.",
    "Do you want to book an appointment?": "சந்திப்பைப் பதிவு செய்ய விரும்புகிறீர்களா?",
    "Do you want to order medicines for delivery?": "விநியோகத்திற்காக மருந்துகளை ஆர்டர் செய்ய விரும்புகிறீர்களா?",
    "Go back and add medicines to your cart.": "பின்சென்று உங்கள் கூடையில் மருந்துகளைச் சேர்க்கவும்.",
    "Enter the address where your medicines should be delivered.": "மருந்துகள் வழங்கப்பட வேண்டிய முகவரியை உள்ளிடவும்.",
    "Your medicine orders and estimated delivery status.": "உங்கள் மருந்து ஆர்டர்கள் மற்றும் எதிர்பார்க்கப்படும் விநியோக நிலை.",
    "Your confirmed medicine orders will appear here.": "உறுதிசெய்யப்பட்ட உங்கள் மருந்து ஆர்டர்கள் இங்கே தோன்றும்.",
    "Your doctor has completed the online consultation and provided the following prescription.": "உங்கள் மருத்துவர் ஆன்லைன் ஆலோசனையை முடித்து, பின்வரும் மருந்துச் சீட்டை வழங்கியுள்ளார்.",
    "Enter the delivery address for your prescribed medicines.": "பரிந்துரைக்கப்பட்ட மருந்துகள் வழங்கப்பட வேண்டிய முகவரியை உள்ளிடவும்.",
    "Information retained successfully.": "தகவல் வெற்றிகரமாகச் சேமிக்கப்பட்டது.",
    "Your retained information remains available to the authorized workflow.": "சேமிக்கப்பட்ட தகவல் அங்கீகரிக்கப்பட்ட செயல்முறைக்கு தொடர்ந்து கிடைக்கும்.",
    "You are joining the appointment-specific video room. The patient mobile and doctor laptop must use this same room.": "இந்தச் சந்திப்பிற்கான குறிப்பிட்ட காணொலி அறையில் நீங்கள் சேர்கிறீர்கள். நோயாளியின் கைப்பேசியும் மருத்துவரின் மடிக்கணினியும் இதே அறையைப் பயன்படுத்த வேண்டும்.",
    "needs an immediate video consultation.": "உடனடி காணொலி ஆலோசனை தேவைப்படுகிறது.",
    "Patient summary unlocked after OTP verification.": "OTP சரிபார்ப்புக்குப் பிறகு நோயாளர் சுருக்கம் திறக்கப்பட்டது.",
    "Enter the prescription given by the doctor.": "மருத்துவர் வழங்கிய மருந்துச் சீட்டை உள்ளிடவும்.",
    "End the online consultation without a prescription.": "மருந்துச் சீட்டு இல்லாமல் ஆன்லைன் ஆலோசனையை முடிக்கவும்.",
    "No prescription will be attached to this consultation.": "இந்த ஆலோசனையுடன் மருந்துச் சீட்டு எதுவும் இணைக்கப்படாது.",
    "Doctor access is granted only after the required patient authorization code is verified.": "தேவையான நோயாளர் அங்கீகாரக் குறியீடு சரிபார்க்கப்பட்ட பிறகே மருத்துவருக்கு அணுகல் வழங்கப்படும்.",
    "OTP has been sent to the patient's registered mobile number. Enter the OTP below to authorize access.": "நோயாளியின் பதிவு செய்யப்பட்ட கைப்பேசி எண்ணுக்கு OTP அனுப்பப்பட்டுள்ளது. அணுகலை அங்கீகரிக்க கீழே OTP-ஐ உள்ளிடவும்.",
    "Demo patient: enter the same OTP used with this patient's ABHA demo login.": "செயல்விளக்க நோயாளர்: இந்த நோயாளியின் ABHA செயல்விளக்க உள்நுழைவில் பயன்படுத்திய அதே OTP-ஐ உள்ளிடவும்.",
    "Documents uploaded during this patient session": "இந்த நோயாளர் அமர்வின்போது பதிவேற்றிய ஆவணங்கள்",
    "No medical documents were uploaded by this current patient.": "இந்த நோயாளர் தற்போதைய அமர்வில் மருத்துவ ஆவணங்கள் எதையும் பதிவேற்றவில்லை.",
    "Live operational connections currently using Aayuvora.": "தற்போது Aayuvora-ஐப் பயன்படுத்தும் செயல்பாட்டிலுள்ள இணைப்புகள்.",
    "Tell us how we can improve your experience.": "உங்கள் அனுபவத்தை எவ்வாறு மேம்படுத்தலாம் என்பதை எங்களுக்குத் தெரிவிக்கவும்.",
    "Thank you. Your feedback has been saved in this browser.": "நன்றி. உங்கள் கருத்து இந்த உலாவியில் சேமிக்கப்பட்டுள்ளது.",
    "Login with your ABHA number. AI pre-consultation, video consultation, hospital visits, prescriptions and medicine delivery, all in one place.": "உங்கள் ABHA எண்ணைப் பயன்படுத்தி உள்நுழையுங்கள். AI முன் ஆலோசனை, காணொலி ஆலோசனை, மருத்துவமனை வருகைகள், மருந்துச் சீட்டுகள் மற்றும் மருந்து விநியோகம்—அனைத்தும் ஒரே இடத்தில்.",
    "Ayurvedic history mode selected.": "ஆயுர்வேத வரலாறு முறை தேர்ந்தெடுக்கப்பட்டது.",
    "Each uploaded document is processed independently. You can upload up to 5 documents, and each document keeps its own extracted information and summary.": "பதிவேற்றப்படும் ஒவ்வொரு ஆவணமும் தனித்தனியாகச் செயலாக்கப்படும். அதிகபட்சம் 5 ஆவணங்களைப் பதிவேற்றலாம்; ஒவ்வொரு ஆவணத்திலிருந்தும் பெறப்பட்ட தகவலும் சுருக்கமும் தனியாக வைக்கப்படும்.",
    "You chose to store your information. Would you like to book an appointment now?": "உங்கள் தகவலைச் சேமிக்க நீங்கள் தேர்ந்தெடுத்துள்ளீர்கள். இப்போது சந்திப்பை முன்பதிவு செய்ய விரும்புகிறீர்களா?",
    "Select a hospital and doctor. Your stored clinical information will be routed only to the doctor whose appointment you book.": "மருத்துவமனையையும் மருத்துவரையும் தேர்ந்தெடுக்கவும். நீங்கள் முன்பதிவு செய்யும் மருத்துவரிடம் மட்டுமே சேமிக்கப்பட்ட மருத்துவத் தகவல் அனுப்பப்படும்.",
    "and neither type can be booked again for that doctor and time.": "அதே மருத்துவருக்கு அதே நேரத்தில் இந்த இரு வகைகளிலும் மீண்டும் முன்பதிவு செய்ய முடியாது.",
    "Slots are 10 minutes each from 9:00 AM to 1:00 AM. Today's past slots are disabled using the device's real-time clock.": "காலை 9:00 மணி முதல் இரவு 1:00 மணி வரை ஒவ்வொரு நேர இடைவெளியும் 10 நிமிடங்கள். சாதனத்தின் தற்போதைய நேரத்தைப் பயன்படுத்தி இன்றைய கடந்த நேர இடைவெளிகள் முடக்கப்படும்.",
    "Click the Pending Reviews box to view the 7 demo patients for this OPD and any newly booked appointment routed only to this doctor. New booked appointments show their Online or Offline appointment type. Online appointments can later be connected to the video consultation flow.": "இந்த OPD-யின் 7 டெமோ நோயாளிகளையும் இந்த மருத்துவருக்கு மட்டும் அனுப்பப்பட்ட புதிய முன்பதிவுகளையும் காண ‘நிலுவை மதிப்பாய்வுகள்’ பெட்டியைக் கிளிக் செய்யவும். புதிய முன்பதிவுகள் ஆன்லைன் அல்லது நேரடி வருகை வகையைக் காட்டும். ஆன்லைன் சந்திப்புகளைப் பின்னர் காணொலி ஆலோசனை செயல்முறையுடன் இணைக்கலாம்.",
    "AYUSH OPD demo: the patient record includes Dashavidha Pariksha and Ahara-Vihara history for doctor review.": "AYUSH OPD டெமோ: மருத்துவர் மதிப்பாய்வு செய்ய நோயாளியின் பதிவில் தசவித பரீட்சை மற்றும் ஆகார-விஹார வரலாறு இடம்பெறும்.",
    "The doctor can join the video call immediately. OTP verification is required only to access the patient's clinical summary.": "மருத்துவர் உடனடியாக காணொலி அழைப்பில் இணையலாம். நோயாளியின் மருத்துவச் சுருக்கத்தைப் பார்ப்பதற்கு மட்டுமே OTP சரிபார்ப்பு தேவை.",
    "Are there any prescriptions for this patient from this online consultation?": "இந்த ஆன்லைன் ஆலோசனையில் இந்த நோயாளிக்கு ஏதேனும் மருந்துச் சீட்டு வழங்கப்பட்டதா?",
    "📱 OTP has been sent to the patient's registered mobile number. Enter the OTP below to authorize access.": "📱 நோயாளியின் பதிவு செய்யப்பட்ட கைப்பேசி எண்ணுக்கு OTP அனுப்பப்பட்டுள்ளது. அணுகலை அனுமதிக்க கீழே OTP-ஐ உள்ளிடவும்.",
    "No prior summaries are stored in this browser for this patient. Only records saved here are displayed; backend or other-device records are not automatically fetched.": "இந்த நோயாளிக்கான முந்தைய சுருக்கங்கள் இந்த உலாவியில் சேமிக்கப்படவில்லை. இங்கே சேமிக்கப்பட்ட பதிவுகள் மட்டுமே காட்டப்படும்; சேவையகம் அல்லது பிற சாதனங்களின் பதிவுகள் தானாகப் பெறப்படாது.",
    "Verify demo ABHA + OTP and book the patient's appointment.": "டெமோ ABHA மற்றும் OTP-ஐ சரிபார்த்து நோயாளியின் சந்திப்பை முன்பதிவு செய்யவும்.",
    "Register a new patient for appointment?": "சந்திப்புக்காக புதிய நோயாளியைப் பதிவு செய்யவா?",
    "Admin can select a 10-minute appointment slot from 9:00 AM through 1:00 AM. The slot is locked for the selected doctor once booked.": "நிர்வாகி காலை 9:00 மணி முதல் இரவு 1:00 மணி வரை 10 நிமிடச் சந்திப்பு நேரத்தைத் தேர்ந்தெடுக்கலாம். முன்பதிவு செய்ததும் அந்த நேரம் தேர்ந்தெடுக்கப்பட்ட மருத்துவருக்காகப் பூட்டப்படும்.",
    // Patient medicine-order workflow: exact sentence-level translations.
    "Order Medicines": "மருந்துகளை ஆர்டர் செய்யவும்",
    "View Orders": "ஆர்டர்களைப் பார்க்கவும்",
    "Yes, order medicines": "ஆம், மருந்துகளை ஆர்டர் செய்யவும்",
    "Search and add medicines to your cart": "மருந்துகளைத் தேடி கார்ட்டில் சேர்க்கவும்",
    "No, continue normally": "வேண்டாம், வழக்கமான செயல்முறையைத் தொடரவும்",
    "Continue to your normal workflow": "வழக்கமான செயல்முறையைத் தொடரவும்",
    "Search Medicines": "மருந்துகளைத் தேடவும்",
    "Search from 50 medicines": "50 மருந்துகளில் தேடவும்",
    "Add": "சேர்க்கவும்",
    "View Cart": "கார்ட்டைப் பார்க்கவும்",
    "Medicine Cart": "மருந்து கார்ட்",
    "Your cart is empty.": "உங்கள் கார்ட் காலியாக உள்ளது.",
    "Quantity": "அளவு",
    "Add Address": "முகவரியைச் சேர்க்கவும்",
    "Delivery Address": "விநியோக முகவரி",
    "Address Line 1": "முகவரி வரி 1",
    "House / flat / street": "வீடு / குடியிருப்பு / தெரு",
    "Address Line 2": "முகவரி வரி 2",
    "Area / landmark": "பகுதி / அடையாளம்",
    "Pin Code": "அஞ்சல் குறியீடு",
    "6-digit PIN code": "6 இலக்க அஞ்சல் குறியீடு",
    "City": "நகரம்",
    "Confirm Order": "ஆர்டரை உறுதிப்படுத்தவும்",
    "No orders yet": "இன்னும் ஆர்டர்கள் இல்லை",
    "Medicine Order": "மருந்து ஆர்டர்",
    "Booked on:": "ஆர்டர் செய்த தேதி:",
    "Qty:": "அளவு:",
    "Delivery address": "விநியோக முகவரி",
    "Delivered": "வழங்கப்பட்டது",
    "Coming in": "வருவதற்கு மீதமுள்ள நேரம்",
    "Order More Medicines": "மேலும் மருந்துகளை ஆர்டர் செய்யவும்",

    // Patient home greeting, services, workflow, FAQ, and feedback sentence translations.
    "YOUR CARE, IN ONE PLACE": "உங்கள் பராமரிப்பு, ஒரே இடத்தில்",
    "Hello,": "வணக்கம்,",
    "Start the emergency appointment workflow.": "அவசரச் சந்திப்பு செயல்முறையைத் தொடங்கவும்.",
    "Browse medicines and manage your order.": "மருந்துகளைப் பார்த்து உங்கள் ஆர்டரை நிர்வகிக்கவும்.",
    "Review and manage your booked appointments.": "நீங்கள் முன்பதிவு செய்த சந்திப்புகளைப் பார்த்து நிர்வகிக்கவும்.",
    "First tell about your health and then book an appointment.": "முதலில் உங்கள் உடல்நிலை பற்றி தெரிவித்து, பின்னர் சந்திப்பைப் பதிவு செய்யவும்.",
    "Open service": "சேவையைத் திறக்கவும்",
    "How It Works": "இது எவ்வாறு செயல்படுகிறது",
    "Login": "உள்நுழையவும்",
    "Tell us how you feel": "உங்களுக்கு எப்படி இருக்கிறது என்பதைத் தெரிவிக்கவும்",
    "Choose and Book": "தேர்ந்தெடுத்து முன்பதிவு செய்யவும்",
    "Get Care": "பராமரிப்பைப் பெறவும்",
    "Choose AI pre-consultation, describe how you feel, and follow the steps to book or request care.": "AI முன் ஆலோசனையைத் தேர்ந்தெடுத்து, உங்கள் உடல்நிலையை விவரித்து, பராமரிப்பைக் கோர அல்லது சந்திப்பைப் பதிவு செய்யும் படிகளைப் பின்பற்றவும்.",
    "What is AI pre-consultation?": "AI முன் ஆலோசனை என்றால் என்ன?",
    "It helps organize the information you share before a clinician reviews it. It is not a diagnosis.": "மருத்துவர் மதிப்பாய்வு செய்வதற்கு முன் நீங்கள் பகிரும் தகவல்களை ஒழுங்குபடுத்த இது உதவும். இது நோயறிதல் அல்ல.",
    "Can I order medicines here?": "இங்கே மருந்துகளை ஆர்டர் செய்யலாமா?",
    "Choose Order Medicines, select available items, and follow the order and address steps.": "“மருந்துகளை ஆர்டர் செய்யவும்” என்பதைத் தேர்ந்தெடுத்து, கிடைக்கும் மருந்துகளைத் தேர்வு செய்து, ஆர்டர் மற்றும் முகவரி படிகளைப் பின்பற்றவும்.",
    "Open Upcoming Appointments to view bookings available to this account.": "இந்தக் கணக்கிற்கான முன்பதிவுகளைப் பார்க்க “வரவிருக்கும் சந்திப்புகள்” என்பதைத் திறக்கவும்.",
    "Where are my health summaries stored?": "எனது உடல்நலச் சுருக்கங்கள் எங்கே சேமிக்கப்படுகின்றன?",
    "Can I change the language?": "மொழியை மாற்ற முடியுமா?",
    "Open Menu near the Aayuvora logo and choose one of the six supported languages.": "Aayuvora சின்னத்தின் அருகிலுள்ள மெனுவைத் திறந்து, ஆதரிக்கப்படும் ஆறு மொழிகளில் ஒன்றைத் தேர்ந்தெடுக்கவும்.",
    "How do I enable dark mode?": "இருண்ட பயன்முறையை எவ்வாறு இயக்குவது?",
    "Open Menu and select Dark mode.": "மெனுவைத் திறந்து இருண்ட பயன்முறையைத் தேர்ந்தெடுக்கவும்.",
    "Use SOS for urgent help or Emergency Appointment to enter the emergency workflow. If there is immediate danger, contact local emergency services.": "அவசர உதவிக்கு SOS-ஐப் பயன்படுத்தவும் அல்லது அவசர செயல்முறைக்குச் செல்ல “அவசர சந்திப்பு” என்பதைத் தேர்ந்தெடுக்கவும். உடனடி ஆபத்து இருந்தால் உள்ளூர் அவசர சேவைகளைத் தொடர்புகொள்ளவும்.",
    "No. AI summaries are drafts to support a clinician and must be reviewed by a qualified healthcare professional.": "இல்லை. AI சுருக்கங்கள் மருத்துவருக்கு உதவும் வரைவு மட்டுமே; தகுதியான சுகாதார நிபுணர் அவற்றை மதிப்பாய்வு செய்ய வேண்டும்.",
    "Use Log out in the upper-left area of this page to return to the welcome screen.": "வரவேற்புத் திரைக்குத் திரும்ப இந்தப் பக்கத்தின் மேல் இடப்புறத்தில் உள்ள “வெளியேறு” என்பதைத் தேர்ந்தெடுக்கவும்.",
    "Feedback": "கருத்து",
    "How was your experience?": "உங்கள் அனுபவம் எப்படி இருந்தது?",
    "Excellent": "மிகச் சிறப்பு",
    "Good": "நன்று",
    "Okay": "பரவாயில்லை",
    "Needs improvement": "மேம்படுத்த வேண்டும்",
    "Poor": "மோசம்",
    "Comments": "கருத்துகள்",
    "Share your feedback...": "உங்கள் கருத்தைப் பகிரவும்...",
    "Submit Feedback": "கருத்தைச் சமர்ப்பிக்கவும்",
    "Fetching location…": "இருப்பிடத்தைப் பெறுகிறது…",
    "Requesting emergency location": "அவசர இருப்பிடத்தைக் கோருகிறது",
    "SOS status": "SOS நிலை",
    "Fetched address": "பெறப்பட்ட முகவரி",

  },
};

function translateUiText(value: string, phraseDictionary: Record<string, string>, language: string): string {
  const trimmed = value.trim();
  const sentenceDictionary = GLOBAL_SENTENCE_TRANSLATIONS[language] ?? {};
  // Prefer exact sentence translations first, then exact UI phrases, then the word fallback.
  if (sentenceDictionary[trimmed]) return value.replace(trimmed, sentenceDictionary[trimmed]);
  if (phraseDictionary[trimmed]) return value.replace(trimmed, phraseDictionary[trimmed]);
  const words = GLOBAL_WORD_TRANSLATIONS[language];
  if (!words) return value;
  // Translate sentence-sized chunks independently; retain punctuation and spacing.
  // This allows a text node containing several sentences to use sentence-level entries.
  const translateChunk = (chunk: string) => {
    const chunkTrimmed = chunk.trim();
    if (!chunkTrimmed) return chunk;
    if (sentenceDictionary[chunkTrimmed]) return chunk.replace(chunkTrimmed, sentenceDictionary[chunkTrimmed]);
    if (phraseDictionary[chunkTrimmed]) return chunk.replace(chunkTrimmed, phraseDictionary[chunkTrimmed]);
    return chunk.replace(/[A-Za-z]+(?:['’][A-Za-z]+)?/g, (word) => {
      const translated = words[word.toLowerCase()];
      return translated === undefined ? word : translated;
    });
  };
  return value.split(/(?<=[.!?])(?=\s|$)/).map(translateChunk).join("");
}

const originalUiText = new WeakMap<Node, string>();
const lastUiTranslation = new WeakMap<Node, string>();
const originalUiAttributes = new WeakMap<HTMLElement, Map<string, string>>();

function restoreOriginalUiText(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const original = originalUiText.get(node);
    if (original !== undefined && node.textContent !== original) node.textContent = original;
  }
  root.querySelectorAll<HTMLElement>("[placeholder], [title], [aria-label], [alt]").forEach((element) => {
    const originals = originalUiAttributes.get(element);
    originals?.forEach((value, attribute) => {
      if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
    });
  });
}

function App() {
  /* -------------------------------------------------------
     BASIC STATE
  ------------------------------------------------------- */

  const [screen, setScreen] =
    useState<Screen>("splash");
  const [publicMedicineSearch, setPublicMedicineSearch] = useState("");

  // Allow shared PageShell controls to navigate back to the welcome screen
  // without referencing App-local state from outside the App component.
  useEffect(() => {
    const returnToWelcome = () => setScreen("welcome");
    window.addEventListener("aayuvora:go-welcome", returnToWelcome);
    return () => window.removeEventListener("aayuvora:go-welcome", returnToWelcome);
  }, []);

  useEffect(() => {
    const returnToMainMenu = () => setScreen("patientHome");
    window.addEventListener("aayuvora:go-main-menu", returnToMainMenu);
    return () => window.removeEventListener("aayuvora:go-main-menu", returnToMainMenu);
  }, []);

  useEffect(() => {
    const openPublicMedicines = () => setScreen("publicMedicines");
    window.addEventListener("aayuvora:view-medicines", openPublicMedicines);
    return () => window.removeEventListener("aayuvora:view-medicines", openPublicMedicines);
  }, []);

  useEffect(() => {
    const handleLanguageChange = (event: Event) => setLanguage((event as CustomEvent<Language>).detail);
    window.addEventListener("aayuvora:set-language", handleLanguageChange);
    return () => window.removeEventListener("aayuvora:set-language", handleLanguageChange);
  }, []);

  useEffect(() => {
    stopSpeaking();
  }, [screen]);

  useEffect(() => {
    if (screen !== "splash") {
      return;
    }

    const timer = window.setTimeout(() => {
      setScreen("welcome");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [screen]);

  const [language, setLanguage] =
    useState<Language>("en");


  // Translate visible interface text throughout the application, including nested
  // elements and content added by later React renders. Original strings are kept
  // so switching languages never translates a previous translation.
  useEffect(() => {
    if (language === "en") {
      restoreOriginalUiText(document.querySelector("#root") ?? document.body);
      return;
    }

    const dictionary = GLOBAL_UI_TRANSLATIONS[language as keyof typeof GLOBAL_UI_TRANSLATIONS] ?? {};
    const root = document.querySelector("#root") ?? document.body;
    let translating = false;

    const translateNode = (node: Node) => {
      if (translating || !node) return;
      translating = true;
      try {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode(candidate) {
            const parent = candidate.parentElement;
            if (!parent || !candidate.textContent?.trim()) return NodeFilter.FILTER_REJECT;
            if (parent.closest("script, style, noscript, code, pre, textarea, input, select option, [contenteditable='true'], [data-no-translate], .saved-summary-text")) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        let textNode: Node | null;
        while ((textNode = walker.nextNode())) {
          const current = textNode.textContent ?? "";
          const previousTranslation = lastUiTranslation.get(textNode);
          if (!originalUiText.has(textNode) || (previousTranslation !== undefined && current !== previousTranslation)) {
            originalUiText.set(textNode, current);
          }
          const original = originalUiText.get(textNode) ?? current;
          const trimmed = original.trim();
          if (!trimmed) continue;
          const translated = translateUiText(trimmed, dictionary, language);
          const next = original.replace(trimmed, translated);
          if (current !== next) textNode.textContent = next;
          lastUiTranslation.set(textNode, next);
        }

        root.querySelectorAll<HTMLElement>("[placeholder], [title], [aria-label], [alt]").forEach((element) => {
          if (element.closest(".saved-summary-text, [data-no-translate]")) return;
          if (element.matches("input, textarea, select") && !element.hasAttribute("placeholder")) return;
          ["placeholder", "title", "aria-label", "alt"].forEach((attribute) => {
            const value = element.getAttribute(attribute);
            if (value == null) return;
            let originals = originalUiAttributes.get(element);
            if (!originals) {
              originals = new Map<string, string>();
              originalUiAttributes.set(element, originals);
            }
            if (!originals.has(attribute)) originals.set(attribute, value);
            const original = originals.get(attribute) ?? value;
            const translated = translateUiText(original, dictionary, language);
            if (translated !== value) element.setAttribute(attribute, translated);
          });
        });
      } finally {
        translating = false;
      }
    };

    translateNode(root);
    const observer = new MutationObserver((records) => {
      if (translating) return;
      // React may replace a text node after a state update. Scan the app root so
      // all visible pages and newly rendered sections receive the same treatment.
      if (records.some((record) => record.type === "childList" || record.type === "characterData" || record.type === "attributes")) {
        translateNode(root);
      }
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label", "alt"] });
    return () => observer.disconnect();
  }, [language]);

  const [savedHealthSummaries, setSavedHealthSummaries] = useState<SavedHealthSummary[]>(() => {
    try {
      const raw = window.localStorage.getItem("aayuvora.healthSummaries.v1");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.patientId === "string" && typeof item.summary === "string") : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { window.localStorage.setItem("aayuvora.healthSummaries.v1", JSON.stringify(savedHealthSummaries)); }
    catch (error) { console.warn("Could not save health summaries locally", error); }
  }, [savedHealthSummaries]);

  // Save a timestamped patient summary whenever the patient reaches the summary step.
  useEffect(() => {
    if (screen !== "patientSummary" || !patient) return;
    const summaryText = clinicalSummary.trim() || messages.filter((message) => message.sender === "patient" && message.text.trim()).map((message) => message.text.trim()).join("\n\n") || "No generated summary text is available for this session.";
    const newest = savedHealthSummaries[0];
    if (newest && newest.patientId === patient.patientId && newest.summary === summaryText && Date.now() - new Date(newest.createdAt).getTime() < 15000) return;
    setSavedHealthSummaries((previous) => [{ id: `${patient.patientId}-${Date.now()}`, patientId: patient.patientId, patientName: patient.name, createdAt: new Date().toISOString(), summary: summaryText, careMode }, ...previous].slice(0, 100));
  // Intentionally record once on entry to the summary screen.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const [role, setRole] =
    useState<Role | null>(null);

  const [careMode, setCareMode] =
    useState<"modern" | "ayush">("modern");

  const [ayushPhase, setAyushPhase] =
    useState<"dashavidha" | "general">("general");

  const [ayushAnswers, setAyushAnswers] =
    useState<Partial<Record<AyushDashavidhaKey, string>>>({});

  const [doctorMode, setDoctorMode] =
    useState<"modern" | "ayush">("modern");

  const [selectedDoctorHospitalId, setSelectedDoctorHospitalId] = useState(DEMO_HOSPITALS[0].id);
  const [loggedInDoctorId, setLoggedInDoctorId] = useState("");
  const [selectedAdminHospitalId, setSelectedAdminHospitalId] = useState(DEMO_HOSPITALS[0].id);
  const [loggedInAdminHospitalId, setLoggedInAdminHospitalId] = useState("");

  // React-memory only: automatically cleared when the website reloads.
  const [temporaryDoctorPatients, setTemporaryDoctorPatients] =
    useState<TemporaryDoctorPatient[]>([]);

  const [selectedDoctorPatient, setSelectedDoctorPatient] =
    useState<"demo" | "temporary">("demo");
  const [selectedDemoReviewIndex, setSelectedDemoReviewIndex] = useState(0);
  const [selectedTemporaryPatientIndex, setSelectedTemporaryPatientIndex] = useState(0);

  // Doctor access authorization. Demo reviews use the same OTP configured
  // for their corresponding ABHA demo patient. Temporary records receive a
  // fresh OTP when the doctor requests one (frontend demo only).
  const [doctorOtpInput, setDoctorOtpInput] = useState("");
  const [temporaryOtpSent, setTemporaryOtpSent] = useState(false);
  const [temporaryOtpSending, setTemporaryOtpSending] = useState(false);
  const [doctorOtpError, setDoctorOtpError] = useState("");

  // Online consultation summary editing. OTP unlocks the summary; the doctor
  // can then edit the AI draft without leaving the video consultation.
  const [onlineSummaryUnlocked, setOnlineSummaryUnlocked] = useState(false);
  const [onlineSummaryEditing, setOnlineSummaryEditing] = useState(false);
  const [onlineSummaryDraft, setOnlineSummaryDraft] = useState({
    summary: "",
    complaint: "",
    redFlagDetection: "",
    reviewOfSystems: "",
  });

  // Online-consultation prescriptions are entered by the doctor only after
  // Save Summary. They are shared through the backend so the patient can
  // see them after the video consultation ends.
  type OnlinePrescription = {
    medicine: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  };

  const [onlinePrescriptionChoice, setOnlinePrescriptionChoice] = useState<"yes" | "no" | null>(null);
  const [onlinePrescriptions, setOnlinePrescriptions] = useState<OnlinePrescription[]>([]);
  const [onlinePrescriptionDraft, setOnlinePrescriptionDraft] = useState<OnlinePrescription>({
    medicine: "", dosage: "", frequency: "", duration: "", instructions: "",
  });
  const [prescriptionError, setPrescriptionError] = useState("");
  const [patientPrescriptionSource, setPatientPrescriptionSource] = useState<OnlinePrescription[]>([]);
  const [patientPrescriptionLoading, setPatientPrescriptionLoading] = useState(false);
  const [orderAddress, setOrderAddress] = useState({ addressLine1: "", addressLine2: "", pinCode: "", city: "" });
  const [orderError, setOrderError] = useState("");
  const [prescriptionOrderConfirmed, setPrescriptionOrderConfirmed] = useState(false);

  // Patient medicine-order workflow. This is separate from doctor prescriptions.
  const [medicineOrderStarted, setMedicineOrderStarted] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [medicineCart, setMedicineCart] = useState<Record<string, number>>({});
  const [medicineOrderAddress, setMedicineOrderAddress] = useState({ addressLine1: "", addressLine2: "", pinCode: "", city: "" });
  const [medicineOrderError, setMedicineOrderError] = useState("");
  type MedicineOrder = {
    id: string;
    items: Array<{ medicine: string; quantity: number }>;
    address: { addressLine1: string; addressLine2: string; pinCode: string; city: string };
    bookedAt: number;
  };
  const MEDICINE_ORDERS_STORAGE_KEY = "aayuvora.medicineOrders.v1";

  // Load saved medicine orders from this browser when the app starts.
  // Keep the original bookedAt timestamp so the 30-minute delivery countdown
  // continues correctly after a refresh or when the user reopens the page.
  const [medicineOrders, setMedicineOrders] = useState<MedicineOrder[]>(() => {
    try {
      if (typeof window === "undefined") return [];
      const savedOrders = window.localStorage.getItem(MEDICINE_ORDERS_STORAGE_KEY);
      if (!savedOrders) return [];

      const parsed: unknown = JSON.parse(savedOrders);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter((order): order is MedicineOrder => {
        return Boolean(
          order &&
          typeof order === "object" &&
          typeof order.id === "string" &&
          typeof order.bookedAt === "number" &&
          Array.isArray(order.items) &&
          order.address &&
          typeof order.address === "object"
        );
      });
    } catch (error) {
      console.error("[AAYUVORA] Could not load saved medicine orders:", error);
      return [];
    }
  });

  // Persist each order change to localStorage so View Orders survives refreshes.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        MEDICINE_ORDERS_STORAGE_KEY,
        JSON.stringify(medicineOrders),
      );
    } catch (error) {
      console.error("[AAYUVORA] Could not save medicine orders:", error);
    }
  }, [medicineOrders]);

  const [medicineOrderClock, setMedicineOrderClock] = useState(Date.now());
  useEffect(() => {
    if (screen !== "patientMedicineOrders") return;
    const timer = window.setInterval(() => setMedicineOrderClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [screen]);

  // Admin appointment workflow. A temporary patient becomes visible to the
  // doctor only after the admin verifies the demo ABHA + OTP and books the
  // appointment.
  const [adminAppointmentAbha, setAdminAppointmentAbha] = useState("");
  const [adminAppointmentOtp, setAdminAppointmentOtp] = useState("");
  const [adminAppointmentError, setAdminAppointmentError] = useState("");
  const [adminAppointmentVerifiedPatient, setAdminAppointmentVerifiedPatient] =
    useState<Patient | null>(null);
  const [adminAppointmentChoice, setAdminAppointmentChoice] =
    useState<"yes" | "no" | null>(null);
  // Appointment bookings live only for the current website session.
  // They are intentionally cleared when the page is reloaded or reset.
  const [adminBookedPatientIds, setAdminBookedPatientIds] = useState<string[]>([]);
  const [adminAppointmentHospitalId, setAdminAppointmentHospitalId] = useState(DEMO_HOSPITALS[0].id);
  const [adminAppointmentDoctorId, setAdminAppointmentDoctorId] = useState("");
  const [adminAppointmentDate, setAdminAppointmentDate] = useState(getLocalDateString());
  const [adminAppointmentTimeSlot, setAdminAppointmentTimeSlot] = useState(APPOINTMENT_TIME_SLOTS[0]);
  const [appointmentBookings, setAppointmentBookings] = useState<AppointmentBooking[]>([]);
  const [sharedAppointmentBookings, setSharedAppointmentBookings] = useState<AppointmentBooking[]>([]);
  const [videoCallRoom, setVideoCallRoom] = useState("");
  const [videoCallDisplayName, setVideoCallDisplayName] = useState("");
  const [selectedOnlineBooking, setSelectedOnlineBooking] = useState<AppointmentBooking | null>(null);
  const [patientBookingHospitalId, setPatientBookingHospitalId] = useState(DEMO_HOSPITALS[0].id);
  const [patientBookingDoctorId, setPatientBookingDoctorId] = useState("");
  const [patientBookingDate, setPatientBookingDate] = useState(getLocalDateString());
  const [patientBookingTimeSlot, setPatientBookingTimeSlot] = useState(APPOINTMENT_TIME_SLOTS[0]);
  const [patientBookingError, setPatientBookingError] = useState("");
  const [patientAppointmentChoice, setPatientAppointmentChoice] = useState<"yes" | "no" | null>(null);
  const [patientAppointmentType, setPatientAppointmentType] = useState<"offline" | "online">("offline");
  const [emergencyRequest, setEmergencyRequest] = useState<EmergencyRequest | null>(null);
  const [doctorEmergencyRequests, setDoctorEmergencyRequests] = useState<EmergencyRequest[]>([]);
  const [seenEmergencyIds, setSeenEmergencyIds] = useState<string[]>([]);

  // Keep appointment expiry and time-slot availability live without changing the existing workflow.
  const [appointmentClock, setAppointmentClock] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setAppointmentClock(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  // Sync patient online appointments through the shared backend so a phone
  // and a doctor laptop see the same booking and video-room ID.
  useEffect(() => {
    let cancelled = false;
    const syncSharedAppointments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/appointments?active=true`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && Array.isArray(data.appointments)) setSharedAppointmentBookings(data.appointments);
      } catch {
        // Keep the existing local workflow working if the backend is offline.
      }
    };
    syncSharedAppointments();
    const timer = window.setInterval(syncSharedAppointments, 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  // Emergency requests are shared through the backend so a doctor dashboard on another device can receive the alert and join the same Jitsi room.
  useEffect(() => {
    if (role !== "doctor" || !loggedInDoctorId) return;
    let cancelled = false;
    const syncEmergencyRequests = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/emergency?active=true&doctorId=${encodeURIComponent(loggedInDoctorId)}`);
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled || !Array.isArray(data.requests)) return;
        setDoctorEmergencyRequests(data.requests);
        const fresh = data.requests.filter((item: EmergencyRequest) => !seenEmergencyIds.includes(item.emergencyId));
        if (fresh.length && (screen === "doctorQueue" || screen === "doctorPendingReviews")) {
          const latest = fresh[fresh.length - 1];
          setSeenEmergencyIds((previous) => Array.from(new Set([...previous, ...fresh.map((item: EmergencyRequest) => item.emergencyId)])));
          alert(`EMERGENCY APPOINTMENT\n\n${latest.patientName} needs an immediate video consultation.\n\nDoctor: ${latest.doctorName}\nHospital: ${latest.hospitalName}\n\nClick "Connect to Emergency Call" on the doctor dashboard to join.`);
        }
      } catch {}
    };
    syncEmergencyRequests();
    const timer = window.setInterval(syncEmergencyRequests, 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [role, loggedInDoctorId, screen, seenEmergencyIds]);

  // A booked patient's live record is visible to the assigned doctor only
  // while the appointment is active. Once the 10-minute slot ends, access
  // returns to the pending-review list automatically.
  useEffect(() => {
    if (selectedDoctorPatient !== "temporary") return;
    if (!(screen === "doctorPatient" || screen === "doctorSummary" || screen === "doctorDocuments" || screen === "doctorReview" || screen === "doctorDecision")) return;

    const selected = temporaryDoctorPatients[selectedTemporaryPatientIndex];
    if (!selected) return;

    const activeAppointment = appointmentBookings.find(
      (booking) =>
        booking.patientId === selected.patientId &&
        booking.doctorId === loggedInDoctorId &&
        booking.careMode === doctorMode &&
        isAppointmentActive(booking, new Date(appointmentClock)),
    );

    if (!activeAppointment) {
      setDoctorOtpError("This appointment slot has ended. Patient data is no longer available in the doctor view.");
      setScreen("doctorPendingReviews");
    }
  }, [appointmentClock, appointmentBookings, doctorMode, loggedInDoctorId, screen, selectedDoctorPatient, selectedTemporaryPatientIndex, temporaryDoctorPatients]);

  /* -------------------------------------------------------
     SOS / AMBULANCE
  ------------------------------------------------------- */

  const [sosLoading, setSosLoading] = useState(false);
  const [sosAddress, setSosAddress] = useState("");
  const [sosMessage, setSosMessage] = useState("");

  const handleSOS = () => {
    const needsAmbulance = window.confirm(
      "Do you need an ambulance?"
    );

    if (!needsAmbulance) {
      return;
    }

    if (!navigator.geolocation) {
      setSosMessage(
        "Location access is not supported by this browser."
      );
      setSosAddress("");
      return;
    }

    setSosLoading(true);
    setSosMessage("");
    setSosAddress("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/sos/ambulance`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                patientId: patient?.patientId || null,
                patientName: patient?.name || null,
              }),
            }
          );

          const data = await response.json();

          if (!response.ok || !data?.success) {
            throw new Error(
              data?.message ||
                data?.error ||
                "Unable to fetch your current address."
            );
          }

          const fetchedAddress =
            data?.address ||
            data?.display_name ||
            data?.location?.address ||
            "";

          if (!fetchedAddress) {
            throw new Error(
              "Your location was received, but no address could be fetched."
            );
          }

          setSosAddress(fetchedAddress);
          setSosMessage(
            "Ambulance will reach at the fetched address."
          );
        } catch (error) {
          console.error("[AAYUVORA SOS ERROR]", error);
          setSosMessage(
            error instanceof Error
              ? error.message
              : "Unable to fetch your current address."
          );
          setSosAddress("");
        } finally {
          setSosLoading(false);
        }
      },
      (error) => {
        console.error("[AAYUVORA LOCATION ERROR]", error);
        setSosLoading(false);
        setSosAddress("");

        if (error.code === error.PERMISSION_DENIED) {
          setSosMessage(
            "Location permission was denied. Please allow location access and try SOS again."
          );
        } else {
          setSosMessage(
            "Unable to fetch your current location. Please try again."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const getDoctorsForHospital = (hospitalId: string, careMode?: "modern" | "ayush") =>
    DEMO_DOCTORS.filter(
      (doctor) => doctor.hospitalId === hospitalId && (!careMode || doctor.careMode === careMode),
    );

  // Suggest a doctor automatically in BOTH Normal and Senior Citizen workflows.
  // The current careMode controls the pool: modern specialists for Normal Mode,
  // and AYUSH clinicians for Senior Citizen Mode. Patients can always change
  // the suggestion before booking; this is routing assistance, not a diagnosis.
  const getRecommendedDoctor = (hospitalId: string, mode: "modern" | "ayush") => {
    const doctors = getDoctorsForHospital(hospitalId, mode);
    if (!doctors.length) return undefined;

    const patientText = [
      // Include the current clinical history and patient-reported chat so the
      // Modern Clinical History path in Senior Citizen Mode is also matched.
      clinicalSummary,
      ...messages.filter((message) => message.sender === "patient").map((message) => message.text),
      ...temporaryDoctorPatients
        .filter((record) => !patient || record.patientId === patient.patientId)
        .flatMap((record) => [record.complaint, record.symptoms]),
    ].filter(Boolean).join(" ").toLowerCase();

    // Keep the two Senior Citizen care pathways distinct: AYUSH selects an
    // Ayurvedic clinician; Modern Clinical History uses modern specialists.
    if (mode === "ayush") {
      return doctors.find((doctor) => /ayurvedic|ayush/i.test(doctor.name)) ?? doctors[0];
    }

    if (patient && patient.age < 18) {
      return doctors.find((doctor) => doctor.name.toLowerCase().includes("pediatrician")) ?? doctors[0];
    }

    const specialtyRules: Array<{ keywords: RegExp; specialty: string }> = [
      { keywords: /chest pain|chest tightness|palpitation|heart|blood pressure|hypertension/, specialty: "cardiology" },
      { keywords: /rash|itch|skin|acne|eczema|hair loss/, specialty: "dermatology" },
      { keywords: /fever|cough|cold|fatigue|weakness|headache|stomach|pain|nausea|vomit|diarrhea|general/, specialty: "general physician" },
    ];
    const match = specialtyRules.find((rule) => rule.keywords.test(patientText));
    return doctors.find((doctor) => doctor.name.toLowerCase().includes(match?.specialty ?? "general physician")) ?? doctors[0];
  };

  const allKnownAppointmentBookings = [
    ...appointmentBookings,
    ...sharedAppointmentBookings.filter((shared) => !appointmentBookings.some((local) =>
      local.patientId === shared.patientId && local.doctorId === shared.doctorId &&
      local.appointmentDate === shared.appointmentDate && local.timeSlot === shared.timeSlot
    )),
  ];

  const isSlotTaken = (doctorId: string, appointmentDate: string, timeSlot: string) =>
    allKnownAppointmentBookings.some(
      (appointment) =>
        appointment.doctorId === doctorId && appointment.appointmentDate === appointmentDate &&
        appointment.timeSlot === timeSlot && isAppointmentActive(appointment),
    );

  const bookPatientAppointment = async () => {
    if (!patient) {
      setPatientBookingError("Patient information is unavailable.");
      return;
    }

    const doctor = DEMO_DOCTORS.find(
      (item) => item.id === patientBookingDoctorId && item.hospitalId === patientBookingHospitalId,
    );
    const hospital = DEMO_HOSPITALS.find((item) => item.id === patientBookingHospitalId);

    if (!doctor || !hospital) {
      setPatientBookingError("Select a valid doctor from the selected hospital.");
      return;
    }

    if (doctor.careMode !== careMode) {
      setPatientBookingError(
        careMode === "ayush"
          ? "AYUSH mode requires an Ayurvedic OPD doctor."
          : "Modern mode requires a Modern OPD doctor.",
      );
      return;
    }

    const selectedAppointmentDate = String(patientBookingDate || "").trim();
    const selectedAppointmentTime = String(patientBookingTimeSlot || "").trim();

    if (!selectedAppointmentDate || !selectedAppointmentTime) {
      setPatientBookingError("Please select an appointment date and time slot.");
      return;
    }

    if (isAppointmentSlotPast(selectedAppointmentDate, selectedAppointmentTime)) {
      setPatientBookingError("That time slot has already passed. Please choose a future slot.");
      return;
    }

    const alreadyBooked = appointmentBookings.some(
      (appointment) =>
        appointment.patientId === patient.patientId &&
        appointment.doctorId === doctor.id &&
        isAppointmentActive(appointment),
    );

    if (alreadyBooked) {
      setPatientBookingError("Appointment already booked with this doctor.");
      return;
    }

    if (isSlotTaken(doctor.id, selectedAppointmentDate, selectedAppointmentTime)) {
      setPatientBookingError("This time slot is already booked for this doctor. Please choose another slot.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.patientId, patientName: patient.name, patientPhone: temporaryDoctorPatients.find((record) => record.patientId === patient.patientId)?.phone || "", hospitalId: hospital.id, hospitalName: hospital.name, doctorId: doctor.id, doctorName: doctor.name, careMode, appointmentType: patientAppointmentType, appointmentDate: selectedAppointmentDate, timeSlot: selectedAppointmentTime }),
      });
      const responseText = await response.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          `Appointment server returned an invalid response (HTTP ${response.status}).`
        );
      }

      if (!response.ok || !data?.appointment) {
        throw new Error(
          data?.message ||
          data?.error ||
          `Appointment could not be booked (HTTP ${response.status}).`
        );
      }
      const bookedAppointment = data.appointment as AppointmentBooking;
      setAppointmentBookings((previous) => [...previous, bookedAppointment]);
      setSharedAppointmentBookings((previous) => [...previous.filter((item) => !(item.patientId === bookedAppointment.patientId && item.doctorId === bookedAppointment.doctorId && item.appointmentDate === bookedAppointment.appointmentDate && item.timeSlot === bookedAppointment.timeSlot)), bookedAppointment]);
      setPatientBookingError("");
      alert(`Appointment booked with ${doctor.name} at ${hospital.name} on ${selectedAppointmentDate} at ${selectedAppointmentTime}.`);
      // Booking never opens the video call. The patient joins later from the
      // Upcoming Appointments page when the online appointment time starts.
      setScreen("patientUpcomingAppointments");
    } catch (error) {
      console.error("Appointment booking error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Appointment could not be booked.";
      setPatientBookingError(
        message.includes("Failed to fetch") || message.includes("NetworkError")
          ? `Cannot reach the Aayuvora appointment server at ${API_BASE_URL}. Please make sure the backend is running on port 3001.`
          : message
      );
    }
  };

  // Completing a consultation releases the active appointment for this
  // specific patient + doctor pair. The patient can then book the same
  // doctor again, and the admin can also book that doctor again.
  const completeConsultationAndReleaseAppointment = () => {
    const completedPatientId = selectedDoctorPatient === "temporary"
      ? temporaryDoctorPatients[selectedTemporaryPatientIndex]?.patientId ?? ""
      : getSelectedRecordId();
    const completedDoctorId = loggedInDoctorId;

    if (!completedPatientId || !completedDoctorId) {
      setScreen("complete");
      return;
    }

    setAppointmentBookings((previous) => {
      const remaining = previous.filter(
        (booking) =>
          !(
            booking.patientId === completedPatientId &&
            booking.doctorId === completedDoctorId
          ),
      );

      // Keep the admin's legacy booking flag synchronized with active
      // appointments only. It must not block a future booking after the
      // consultation has been completed.
      const stillHasAppointment = remaining.some(
        (booking) => booking.patientId === completedPatientId,
      );
      setAdminBookedPatientIds((previousIds) =>
        stillHasAppointment
          ? previousIds.includes(completedPatientId)
            ? previousIds
            : [...previousIds, completedPatientId]
          : previousIds.filter((id) => id !== completedPatientId),
      );

      return remaining;
    });

    setScreen("complete");
  };

  const getSelectedRecordId = () => {
    if (selectedDoctorPatient === "temporary") {
      return temporaryDoctorPatients[selectedTemporaryPatientIndex]?.patientId ?? "";
    }
    return doctorMode === "ayush"
      ? (demoAyushPendingReviews[selectedDemoReviewIndex]?.patientId ?? demoAyushPatient.patientId)
      : (demoPendingReviews[selectedDemoReviewIndex]?.patientId ?? demoPatients[0].patientId);
  };

  const getDemoAbhaOtp = () => {
    const patientId = getSelectedRecordId();
    return demoPatients.find((item) => item.patientId === patientId)?.otp ?? "";
  };

  const openOtpAuthorization = () => {
    setDoctorOtpInput("");
    setDoctorOtpError("");
    setTemporaryOtpSent(false);
    setTemporaryOtpSending(false);
    setScreen("doctorOtpAuthorization");
  };

  const getOnlinePrescriptionAppointmentId = () => String(selectedOnlineBooking?.appointmentId || "").trim();

  const saveOnlinePrescriptionsToBackend = async (prescriptions: OnlinePrescription[]) => {
    const appointmentId = getOnlinePrescriptionAppointmentId();
    if (!appointmentId) {
      throw new Error("This online consultation does not have a valid appointment ID.");
    }

    const response = await fetch(`${API_BASE_URL}/api/prescriptions/${encodeURIComponent(appointmentId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointmentId,
        patientId: selectedOnlineBooking?.patientId || "",
        doctorId: selectedOnlineBooking?.doctorId || loggedInDoctorId,
        prescriptions,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success !== true) {
      throw new Error(data.message || "Prescription could not be saved.");
    }
    return data.prescriptions || prescriptions;
  };

  const loadPatientPrescription = async (booking: AppointmentBooking) => {
    const appointmentId = String(booking.appointmentId || "").trim();
    if (!appointmentId) return [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/prescriptions/${encodeURIComponent(appointmentId)}`);
        if (response.ok) {
          const data = await response.json();
          const prescriptions = Array.isArray(data.prescriptions) ? data.prescriptions : [];
          if (prescriptions.length > 0) return prescriptions;
        }
      } catch {}
      await new Promise((resolve) => window.setTimeout(resolve, 800));
    }
    return [];
  };

  const openDoctorSplitCall = (booking: AppointmentBooking, summaryRecord?: TemporaryDoctorPatient | DemoPendingReview) => {
    const room = String(booking.videoRoomId || "").trim();
    if (!room) {
      alert("This online appointment does not have a video room yet.");
      return;
    }

    const temporaryRecord = temporaryDoctorPatients.find(
      (item) => item.patientId === booking.patientId,
    );

    const demoRecord = doctorMode === "ayush"
      ? demoAyushPendingReviews.find((item) => item.patientId === booking.patientId)
      : demoPendingReviews.find((item) => item.patientId === booking.patientId);

    const record = summaryRecord || temporaryRecord || demoRecord || null;

    setSelectedOnlineBooking({
      ...booking,
      videoRoomId: room,
      patientPhone: String(
        booking.patientPhone ||
        (temporaryRecord?.phone || "")
      ).trim(),
    });

    setVideoCallRoom(room);
    setVideoCallDisplayName(booking.doctorName || "Aayuvora Doctor");

    if (temporaryRecord) {
      const index = temporaryDoctorPatients.findIndex(
        (item) => item.patientId === temporaryRecord.patientId,
      );
      setSelectedDoctorPatient("temporary");
      setSelectedTemporaryPatientIndex(index >= 0 ? index : 0);
    } else {
      const demoIndex = doctorMode === "ayush"
        ? demoAyushPendingReviews.findIndex((item) => item.patientId === booking.patientId)
        : demoPendingReviews.findIndex((item) => item.patientId === booking.patientId);
      setSelectedDoctorPatient("demo");
      setSelectedDemoReviewIndex(demoIndex >= 0 ? demoIndex : 0);
    }

    setDoctorOtpInput("");
    setDoctorOtpError("");
    setTemporaryOtpSent(false);
    setTemporaryOtpSending(false);
    setOnlinePrescriptionChoice(null);
    setOnlinePrescriptions([]);
    setOnlinePrescriptionDraft({ medicine: "", dosage: "", frequency: "", duration: "", instructions: "" });
    setPrescriptionError("");
    setScreen("doctorOnlineConsultation");
  };

  const verifyAdminAppointmentPatient = () => {
    setAdminAppointmentError("");
    const found = demoPatients.find((item) => item.abha === adminAppointmentAbha.trim() && item.otp === adminAppointmentOtp.trim());
    if (!found) {
      setAdminAppointmentVerifiedPatient(null);
      setAdminAppointmentError("Invalid demo ABHA ID or OTP. Use the demo credentials shown below.");
      return;
    }
    setAdminAppointmentVerifiedPatient(found);
    setAdminAppointmentHospitalId(DEMO_HOSPITALS[0].id);
      setPatientBookingHospitalId(DEMO_HOSPITALS[0].id);
      setPatientBookingDoctorId("");
    const mode = found.patientId.startsWith("AYUSH-") ? "ayush" : "modern";
    const firstDoctor = DEMO_DOCTORS.find((doctor) => doctor.hospitalId === DEMO_HOSPITALS[0].id && doctor.careMode === mode);
    setAdminAppointmentDoctorId(firstDoctor?.id ?? "");
  };

  const bookAdminAppointment = () => {
    if (!adminAppointmentVerifiedPatient) {
      setAdminAppointmentError("Verify the patient's ABHA ID and OTP first.");
      return;
    }
    const submittedRecord = temporaryDoctorPatients.find((record) => record.patientId === adminAppointmentVerifiedPatient.patientId);
    if (!submittedRecord) {
      setAdminAppointmentError("The patient has not submitted the consultation data yet. Ask the patient to complete and submit the consultation first.");
      return;
    }
    const doctor = DEMO_DOCTORS.find((item) => item.id === adminAppointmentDoctorId && item.hospitalId === adminAppointmentHospitalId);
    const hospital = DEMO_HOSPITALS.find((item) => item.id === adminAppointmentHospitalId);
    if (!doctor || !hospital) {
      setAdminAppointmentError("Select a valid hospital and doctor before booking.");
      return;
    }
    if (!adminAppointmentDate || !adminAppointmentTimeSlot) {
      setAdminAppointmentError("Select an appointment date and a 10-minute time slot.");
      return;
    }
    if (isAppointmentSlotPast(adminAppointmentDate, adminAppointmentTimeSlot)) {
      setAdminAppointmentError("That time slot has already passed. Please choose a future slot.");
      return;
    }
    if (doctor.careMode !== submittedRecord.careMode) {
      setAdminAppointmentError(submittedRecord.careMode === "ayush" ? "An AYUSH patient must be booked with an Ayurvedic OPD doctor." : "A modern-care patient must be booked with a non-AYUSH doctor.");
      return;
    }

    const alreadyBooked = appointmentBookings.some(
      (appointment) =>
        appointment.patientId === submittedRecord.patientId &&
        appointment.doctorId === doctor.id &&
        isAppointmentActive(appointment),
    );

    if (alreadyBooked) {
      setAdminAppointmentError("Appointment booked");
      alert("Appointment booked");
      return;
    }

    if (isSlotTaken(doctor.id, adminAppointmentDate, adminAppointmentTimeSlot)) {
      setAdminAppointmentError("This time slot is already booked for this doctor. Please choose another slot.");
      return;
    }

    setAppointmentBookings((previous) => [
      ...previous,
      {
        patientId: submittedRecord.patientId,
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        doctorId: doctor.id,
        doctorName: doctor.name,
        careMode: submittedRecord.careMode,
        appointmentType: "offline",
        appointmentDate: adminAppointmentDate,
        timeSlot: adminAppointmentTimeSlot,
      },
    ]);
    setAdminBookedPatientIds((previous) => previous.includes(submittedRecord.patientId) ? previous : [...previous, submittedRecord.patientId]);
    setAdminAppointmentError("");
    alert(`Appointment booked for ${submittedRecord.name} with ${doctor.name} at ${hospital.name} for ${adminAppointmentTimeSlot}.`);
  };

  /* -------------------------------------------------------
     PATIENT STATE
  ------------------------------------------------------- */

  const [abhaNumber, setAbhaNumber] =
    useState("");

  const [otp, setOtp] =
    useState("");

  const [patient, setPatient] =
    useState<Patient | null>(null);

  /* -------------------------------------------------------
     DOCTOR / ADMIN LOGIN
  ------------------------------------------------------- */

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  /* -------------------------------------------------------
     GENERAL
  ------------------------------------------------------- */

  const [loginError, setLoginError] =
    useState("");

  const [patientMessage, setPatientMessage] =
    useState("");

  const [messages, setMessages] = useState<
    {
      sender: "ai" | "patient";
      text: string;
    }[]
  >([]);

  const [isAiLoading, setIsAiLoading] =
    useState(false);

  const [clinicalSummary, setClinicalSummary] =
    useState("");

  // AI-assisted red-flag result shown separately on Patient Step 7.
  const [redFlagResult, setRedFlagResult] =
    useState("No red flags detected based on the information provided.");

  // AI-assisted Review of Systems shown on Patient Step 7 and Doctor Step 6.
  const [reviewOfSystemsResult, setReviewOfSystemsResult] =
    useState(
      "Constitutional: Not provided\nNeurological: Not provided\nCardiovascular: Not provided\nRespiratory: Not provided\nGastrointestinal: Not provided\nMusculoskeletal: Not provided\nIntegumentary: Not provided\nENT / Eyes: Not provided",
    );

  const [isSummaryLoading, setIsSummaryLoading] =
    useState(false);

  type MedicalDocument = {
    id: number;
    file: File | null;
    name: string;
    text: string;
    structured: string;
    status: "idle" | "processing" | "done" | "error";
    error: string;
  };

  // Start with one upload card; reveal the next only after the current
  // document has been processed successfully and the user clicks Add Document.
  const [medicalDocuments, setMedicalDocuments] = useState<MedicalDocument[]>(
    Array.from({ length: 1 }, (_, index) => ({
      id: index + 1,
      file: null,
      name: "",
      text: "",
      structured: "",
      status: "idle",
      error: "",
    })),
  );

  const [retentionChoice, setRetentionChoice] =
    useState<
      "store" | "delete" | null
    >(null);

  /* -------------------------------------------------------
     TRANSLATION FUNCTION
  ------------------------------------------------------- */

  const t = (
    section: string,
    key: string,
  ): string => {
    const hi = language === "hi";

    const additional = language === "bn" || language === "mr" || language === "te" || language === "ta"
      ? additionalTranslations[language]
      : undefined;

    if (additional?.[section]?.[key]) {
      return additional[section][key];
    }

    const dictionary: Record<
      string,
      Record<string, string>
    > = {

      role: {
        title: hi ? "आप कौन हैं?" : "Who are you?",
        description: hi
          ? "सही Aayuvora workflow खोलने के लिए अपनी भूमिका चुनें।"
          : "Select your role to open the appropriate Aayuvora workflow.",

        patient: hi ? "रोगी" : "Patient",
        patientDescription: hi
          ? "परामर्श शुरू करें, स्वास्थ्य जानकारी दें और अपनी अनुमत जानकारी देखें।"
          : "Start consultation, provide health information and access your permitted records.",

        doctor: hi ? "डॉक्टर" : "Doctor",
        doctorDescription: hi
          ? "अधिकृत रोगी जानकारी की समीक्षा करें और क्लिनिकल workflow पूरा करें।"
          : "Review authorized patient information and complete the clinical workflow.",

        admin: hi ? "एडमिन" : "Admin",
        adminDescription: hi
          ? "यूज़र, डिवाइस, सिस्टम और सुरक्षा प्रबंधित करें।"
          : "Manage users, devices, system health and security.",
      },

      language: {
        title: hi
          ? "अपनी भाषा चुनें"
          : "Choose your language",

        description: hi
          ? "Aayuvora का उपयोग करने के लिए अपनी पसंदीदा भाषा चुनें।"
          : "Select the language you are most comfortable using during your interaction with Aayuvora.",

        continue: hi ? "जारी रखें" : "Continue",
      },

      patientLogin: {
        title: hi
          ? "अपना ABHA जोड़ें"
          : "Connect your ABHA",

        description: hi
          ? "अपनी पहचान सुरक्षित रूप से सत्यापित करने के लिए अपना ABHA विवरण दर्ज करें।"
          : "Use your ABHA details to identify yourself securely.",

        abha: hi ? "ABHA नंबर" : "ABHA Number",
        otp: "OTP",

        abhaPlaceholder:
          "XX-XXXX-XXXX-XXXX",

        otpPlaceholder: hi
          ? "OTP दर्ज करें"
          : "Enter OTP",

        verify: hi
          ? "सत्यापित करें और आगे बढ़ें"
          : "Verify & Continue",

        demo: hi
          ? "डेमो मोड"
          : "DEMO MODE",

        demoText: hi
          ? "यह प्रोटोटाइप काल्पनिक रोगी क्रेडेंशियल का उपयोग करता है।"
          : "This prototype uses fictional patient credentials.",

        wrong: hi
          ? "गलत क्रेडेंशियल"
          : "WRONG CREDENTIALS",

        demoCredentials: hi
          ? "डेमो क्रेडेंशियल"
          : "Demo Credentials",
      },

      consent: {
        title: hi
          ? "शुरू करने से पहले"
          : "Before we begin",

        description: hi
          ? "Aayuvora आपकी वर्तमान स्वास्थ्य समस्या से संबंधित जानकारी एकत्र करेगा ताकि आपको परामर्श के लिए तैयार किया जा सके।"
          : "Aayuvora will collect information about your current health concern to prepare you for your consultation.",

        point1: hi
          ? "आप स्वाभाविक रूप से बोल सकते हैं या स्क्रीन का उपयोग करके उत्तर दे सकते हैं।"
          : "You can speak naturally or answer using the screen.",

        point2: hi
          ? "Aayuvora आवश्यक होने पर आगे के प्रश्न पूछ सकता है।"
          : "Aayuvora may ask relevant follow-up questions.",

        point3: hi
          ? "आप आवश्यक चिकित्सीय दस्तावेज़ प्रदान कर सकते हैं।"
          : "You may provide relevant medical documents.",

        consent: hi
          ? "आपकी जानकारी सहमति-आधारित workflow के अनुसार संभाली जाएगी।"
          : "Your information will be handled through a consent-based workflow.",

        continue: hi
          ? "परामर्श शुरू करें"
          : "Continue to Consultation",
      },

      consultation: {
        title: hi
          ? "AI स्वास्थ्य परामर्श"
          : "AI Health Consultation",

        assistant: "Aayuvora AI",

        subtitle: hi
          ? "क्लिनिकल जानकारी सहायक"
          : "Clinical intake assistant",

        greeting: hi
          ? "नमस्ते। कृपया बताएं कि आप आज किस स्वास्थ्य समस्या के लिए आए हैं।"
          : "Namaste. Please tell me what health concern brought you here today.",

        followUp: hi
          ? "धन्यवाद। आपको यह समस्या कितने समय से है?"
          : "Thank you. How long have you been experiencing this problem?",

        placeholder: hi
          ? "अपनी स्वास्थ्य समस्या बताएं..."
          : "Describe your health concern...",

        speak: hi ? "बोलें" : "Speak",
        send: hi ? "भेजें" : "Send",
        continue: hi ? "जारी रखें" : "Continue",
        back: hi ? "वापस" : "Back",
      },

      documents: {
        title: hi
          ? "चिकित्सीय दस्तावेज़ जोड़ें"
          : "Add Medical Documents",

        description: hi
          ? "प्रासंगिक प्रिस्क्रिप्शन, लैब रिपोर्ट या डिस्चार्ज दस्तावेज़ जोड़ें।"
          : "Add a relevant prescription, lab report or discharge document.",

        upload: hi
          ? "दस्तावेज़ अपलोड करें"
          : "Upload a document",

        fileTypes: "PDF, JPG or PNG",

        continue: hi
          ? "सारांश पर जाएं"
          : "Continue to Summary",

        skip: hi
          ? "दस्तावेज़ छोड़ें"
          : "Skip Documents",
      },

      summary: {
        title: hi
          ? "Aayuvora ने आपका सारांश तैयार किया है"
          : "Aayuvora has prepared your summary",

        heading: hi
          ? "AI-सहायित क्लिनिकल सारांश"
          : "AI-Assisted Clinical Summary",

        patient: hi ? "रोगी" : "Patient",

        patientId: hi
          ? "रोगी ID"
          : "Patient ID",

        complaint: hi
          ? "मुख्य समस्या"
          : "Chief Complaint",

        duration: hi
          ? "अवधि"
          : "Duration",

        symptoms: hi
          ? "संबंधित लक्षण"
          : "Associated Symptoms",

        history: hi
          ? "पिछला चिकित्सीय इतिहास"
          : "Previous History",

        documents: hi
          ? "दस्तावेज़"
          : "Documents",

        unavailable: hi
          ? "उपलब्ध नहीं"
          : "Not available",

        warning: hi
          ? "यह AI द्वारा तैयार किया गया प्रारंभिक मसौदा है। डॉक्टर द्वारा इसकी समीक्षा और पुष्टि आवश्यक है।"
          : "This is an AI-assisted draft. The doctor must review and verify the information.",

        sendDoctor: hi
          ? "डॉक्टर की समीक्षा के लिए भेजें"
          : "Send to Doctor Review",
      },

      handoff: {
        title: hi
          ? "जानकारी डॉक्टर की समीक्षा के लिए भेज दी गई है"
          : "Information sent for doctor review",

        prepared: hi
          ? "रोगी की जानकारी तैयार है"
          : "Patient information prepared",

        summary: hi
          ? "AI-सहायित सारांश तैयार है"
          : "AI-assisted summary prepared",

        documents: hi
          ? "जहां उपलब्ध थे वहां दस्तावेज़ संलग्न किए गए हैं"
          : "Documents attached where provided",

        continue: hi ? "जारी रखें" : "Continue",
      },

      retention: {
        title: hi
          ? "आपकी जानकारी, आपकी पसंद"
          : "Your information, your choice",

        description: hi
          ? "आपका परामर्श पूरा हो गया है। चुनें कि परामर्श की जानकारी सुरक्षित रखी जाए या नहीं।"
          : "Your consultation is complete. Choose whether the consultation information should be retained.",

        store: hi
          ? "मेरी जानकारी सुरक्षित रखें"
          : "Store my information",

        storeDescription: hi
          ? "अनुमत परामर्श जानकारी को अधिकृत प्रक्रिया के अनुसार सुरक्षित रखें।"
          : "Retain permitted consultation information according to the authorized workflow.",

        delete: hi
          ? "मेरी बातचीत सुरक्षित न रखें"
          : "Do not retain my conversation",

        deleteDescription: hi
          ? "सत्र के बाद अस्थायी बातचीत की सामग्री को लागू डेटा-रिटेंशन नीति के अनुसार हटा दें।"
          : "Remove temporary conversation content after the session, subject to the applicable retention policy.",

        privacy: hi
          ? "सुरक्षा और संचालन के लिए आवश्यक न्यूनतम तकनीकी या ऑडिट जानकारी रखी जा सकती है।"
          : "Minimal technical or audit information may still be retained when required for security and operations.",

        storedTitle: hi
          ? "जानकारी सुरक्षित रखी गई"
          : "Information retained",

        storedMessage: hi
          ? "आपकी अनुमत परामर्श जानकारी चुनी गई प्रक्रिया के अनुसार सुरक्षित रखी गई है।"
          : "Your permitted consultation information has been retained according to the selected workflow.",

        deletedTitle: hi
          ? "बातचीत हटा दी गई"
          : "Conversation removed",

        deletedMessage: hi
          ? "अस्थायी परामर्श सामग्री को रोगी सत्र से हटा दिया गया है।"
          : "The temporary consultation content has been cleared from the patient session.",

        finish: hi ? "समाप्त करें" : "Finish",
      },

      doctor: {
        login: hi
          ? "डॉक्टर लॉगिन"
          : "Doctor Login",

        loginDescription: hi
          ? "अपने अधिकृत रोगी डैशबोर्ड तक पहुंचने के लिए लॉगिन करें।"
          : "Sign in to access your authorized patient dashboard.",

        username: hi ? "यूज़रनेम" : "Username",
        password: hi ? "पासवर्ड" : "Password",

        queue: hi
          ? "रोगी कतार"
          : "Patient Queue",

        today: hi
          ? "आज के रोगी"
          : "Today's Patients",

        pending: hi
          ? "समीक्षा लंबित"
          : "Pending Review",

        open: hi ? "खोलें" : "Open",

        details: hi
          ? "रोगी विवरण"
          : "Patient Details",

        patient: hi ? "रोगी" : "Patient",

        age: hi ? "उम्र" : "Age",

        gender: hi ? "लिंग" : "Gender",

        complaint: hi
          ? "मुख्य समस्या"
          : "Chief Complaint",

        viewSummary: hi
          ? "AI सारांश देखें"
          : "View AI Summary",

        aiSummary: hi
          ? "AI-सहायित क्लिनिकल सारांश"
          : "AI-Assisted Clinical Summary",

        viewDocuments: hi
          ? "दस्तावेज़ देखें"
          : "View Documents",

        documents: hi
          ? "रोगी दस्तावेज़"
          : "Patient Documents",

        previousPrescription:
          "Previous Prescription.pdf",

        uploaded: hi
          ? "अपलोड किया गया दस्तावेज़"
          : "Uploaded document",

        openDocument: hi
          ? "दस्तावेज़ खोलें"
          : "Open Document",

        continueReview: hi
          ? "समीक्षा के लिए आगे बढ़ें"
          : "Continue to Review",

        review: hi
          ? "समीक्षा और सुधार"
          : "Review & Correct",

        approve: hi
          ? "स्वीकृत करें और आगे बढ़ें"
          : "Approve & Continue",

        decision: hi
          ? "अंतिम चिकित्सीय निर्णय"
          : "Final Clinical Decision",

        reviewed: hi
          ? "रोगी की जानकारी की समीक्षा की गई"
          : "Patient information reviewed",

        verified: hi
          ? "AI सारांश सत्यापित किया गया"
          : "AI summary verified",

        source: hi
          ? "मूल दस्तावेज़ की समीक्षा की गई"
          : "Source document reviewed",

        complete: hi
          ? "परामर्श पूरा करें"
          : "Complete Consultation",
      },

      admin: {
        login: hi
          ? "एडमिन लॉगिन"
          : "Admin Login",

        loginDescription: hi
          ? "Aayuvora प्लेटफ़ॉर्म को प्रबंधित करने के लिए लॉगिन करें।"
          : "Sign in to manage the Aayuvora platform.",

        username: hi ? "यूज़रनेम" : "Username",
        password: hi ? "पासवर्ड" : "Password",

        dashboard: hi
          ? "एडमिन डैशबोर्ड"
          : "Admin Dashboard",

        patients: hi ? "रोगी" : "Patients",

        doctors: hi
          ? "डॉक्टर"
          : "Doctors",

        kiosks: hi
          ? "कियोस्क"
          : "Kiosks",

        activeSessions: hi
          ? "सक्रिय सत्र"
          : "Active Sessions",

        usersRoles: hi
          ? "यूज़र और भूमिकाएं"
          : "Users & Roles",

        usersDescription: hi
          ? "अकाउंट और अनुमतियां प्रबंधित करें"
          : "Manage accounts and permissions",

        kioskManagement: hi
          ? "कियोस्क प्रबंधन"
          : "Kiosk Management",

        kioskDescription: hi
          ? "अस्पताल के उपकरणों की निगरानी करें"
          : "Monitor hospital devices",

        monitoring: hi
          ? "सिस्टम मॉनिटरिंग"
          : "System Monitoring",

        monitoringDescription: hi
          ? "प्लेटफ़ॉर्म स्वास्थ्य और आंकड़े"
          : "Platform health and statistics",

        security: hi
          ? "सुरक्षा और ऑडिट"
          : "Security & Audit",

        securityDescription: hi
          ? "सुरक्षा घटनाएं और ऑडिट लॉग"
          : "Security events and audit logs",

        patientUsers: hi
          ? "रोगी"
          : "Patients",

        doctorUsers: hi
          ? "डॉक्टर"
          : "Doctors",

        administrators: hi
          ? "एडमिनिस्ट्रेटर"
          : "Administrators",

        view: hi ? "देखें" : "View",
        manage: hi ? "प्रबंधित करें" : "Manage",

        kiosk01: hi ? "कियोस्क 01" : "Kiosk 01",
        kiosk02: hi ? "कियोस्क 02" : "Kiosk 02",
        kiosk03: hi ? "कियोस्क 03" : "Kiosk 03",
        kiosk04: hi ? "कियोस्क 04" : "Kiosk 04",

        online1: hi
          ? "OPD फ्लोर 1 • ऑनलाइन"
          : "OPD Floor 1 • ONLINE",

        online2: hi
          ? "OPD फ्लोर 1 • ऑनलाइन"
          : "OPD Floor 1 • ONLINE",

        offline: hi
          ? "OPD फ्लोर 2 • ऑफलाइन"
          : "OPD Floor 2 • OFFLINE",

        maintenance: hi
          ? "रजिस्ट्रेशन • मेंटेनेंस"
          : "Registration • MAINTENANCE",

        monitor: hi
          ? "निगरानी"
          : "Monitor",

        systemStatus: hi
          ? "सिस्टम स्थिति"
          : "System Status",

        healthy: hi ? "स्वस्थ" : "Healthy",

        activeUsers: hi
          ? "सक्रिय यूज़र"
          : "Active Users",

        aiSessions: hi
          ? "AI सत्र"
          : "AI Sessions",

        onlineKiosks: hi
          ? "ऑनलाइन कियोस्क"
          : "Online Kiosks",

        authentication: hi
          ? "ऑथेंटिकेशन इवेंट्स"
          : "Authentication Events",

        failedLogins: hi
          ? "3 असफल लॉगिन प्रयास मिले"
          : "3 failed login attempts detected",

        accessControl: hi
          ? "एक्सेस कंट्रोल"
          : "Access Control",

        roleBased: hi
          ? "भूमिका-आधारित अनुमतियां सक्रिय हैं"
          : "Role-based permissions active",

        auditLogging: hi
          ? "ऑडिट लॉगिंग"
          : "Audit Logging",

        logging: hi
          ? "महत्वपूर्ण सिस्टम घटनाएं लॉग की जा रही हैं"
          : "Sensitive system events are being logged",

        accessNote: hi
          ? "एडमिन अकाउंट और अनुमतियां प्रबंधित करता है, लेकिन उसे रोगियों के क्लिनिकल रिकॉर्ड की स्वतः असीमित पहुंच नहीं मिलती।"
          : "Admin manages accounts and permissions but does not automatically receive unrestricted access to patient clinical records.",
      },
    };

    return (
      dictionary[section]?.[key] ??
      key
    );
  };

  /* =========================================================
     TEMPORARY DOCTOR RECORD
  ========================================================= */

  const createTemporaryDoctorPatient = () => {
    if (!patient) return;

    const patientResponses = messages
      .filter((message) => message.sender === "patient" && message.text.trim())
      .map((message) => message.text.trim());

    const complaint = patientResponses[0] || "Patient-reported health concern";
    const additionalResponses = patientResponses.slice(1);
    const durationResponse =
      additionalResponses.find((text) =>
        /\b(day|days|week|weeks|month|months|year|years)\b/i.test(text) ||
        /(दिन|दिनों|हफ्ते|सप्ताह|महीने|माह|साल)/i.test(text),
      ) || "Not provided";

    const symptoms = additionalResponses
      .filter((text) => text !== durationResponse)
      .join(" • ") || "Not provided";

    const aiConversation = messages
      .filter((message) => message.sender === "ai" && message.text.trim())
      .map((message) => message.text.trim())
      .join(" ");

    const uploadedDocumentSummary = medicalDocuments
      .filter((document) => document.name.trim())
      .map((document) => `${document.name}: ${document.structured || document.text || "No extracted information available."}`)
      .join("\n\n");

    const summary = clinicalSummary.trim() || (careMode === "ayush"
      ? `AI-Assisted Ayurvedic Clinical Summary\n\nChief Concern:\n${complaint}\n\nDashavidha Pariksha / Patient Responses:\n${patientResponses.join(" • ") || "Not provided"}\n\nAhara-Vihara / Additional History:\n${symptoms}\n\nAI Conversation Context:\n${aiConversation || "No additional AI conversation context recorded."}\n\nUploaded Medical Documents:\n${uploadedDocumentSummary || "No documents uploaded."}\n\nNote: This summary requires doctor review and verification.`
      : `AI-Assisted Clinical Summary\n\nChief Complaint:\n${complaint}\n\nDuration / Timeline:\n${durationResponse}\n\nSymptoms / Additional Patient History:\n${symptoms}\n\nAI Conversation Context:\n${aiConversation || "No additional AI conversation context recorded."}\n\nUploaded Medical Documents:\n${uploadedDocumentSummary || "No documents uploaded."}\n\nNote: This summary requires doctor verification.`);

    const newRecord: TemporaryDoctorPatient = {
      name: patient.name,
      patientId: patient.patientId,
      age: patient.age,
      gender: patient.gender,
      phone: "+918697232379",
      complaint,
      symptoms,
      duration: durationResponse,
      summary,
      redFlagDetection: redFlagResult || detectRedFlagsFromConversation(messages.map((message) => message.text).join(" ")),
      reviewOfSystems: reviewOfSystemsResult || analyzeReviewOfSystemsFromText(messages.map((message) => message.text).join(" ")),
      careMode,
      documents: medicalDocuments
        .filter((document) => document.name.trim())
        .map((document) => ({
          id: document.id,
          name: document.name,
          structured: document.structured || document.text || "",
          status: document.status,
          error: document.error,
        })),
    };

    setTemporaryDoctorPatients((previous) => {
      const existingIndex = previous.findIndex(
        (record) => record.patientId === newRecord.patientId,
      );

      if (existingIndex === -1) return [...previous, newRecord];

      const updated = [...previous];
      updated[existingIndex] = newRecord;
      return updated;
    });
  };

  // Remove the current patient's temporary doctor-review record when
  // the patient chooses not to retain the conversation. This state is
  // kept only in React memory and is also cleared on a website reload.
  const removeTemporaryDoctorPatient = () => {
    if (!patient) return;

    setTemporaryDoctorPatients((previous) =>
      previous.filter((record) => record.patientId !== patient.patientId),
    );
  };

  /* =========================================================
     ROLE SELECTION
  ========================================================= */

  const selectRole = (
    selectedRole: Role,
  ) => {
    setRole(selectedRole);
    setLoginError("");

    if (selectedRole === "patient") {
      setScreen("careMode");
    }

    if (selectedRole === "doctor") {
      setScreen("doctorLogin");
    }

    if (selectedRole === "admin") {
      setScreen("adminLogin");
    }
  };

  /* =========================================================
     EMERGENCY APPOINTMENT
  ========================================================= */

  const handleEmergencyChoice = async (isEmergency: boolean) => {
    if (!isEmergency) {
      setMedicineOrderStarted(false);
      setMedicineSearch("");
      setMedicineOrderError("");
      setScreen("patientMedicineOrder");
      return;
    }
    if (!patient) { alert("Patient information is unavailable."); return; }
    const emergencyWindow = window.open("about:blank", "_blank");
    try {
      const doctors = DEMO_DOCTORS.map((doctor) => ({ id: doctor.id, name: doctor.name, hospitalId: doctor.hospitalId, hospitalName: doctor.hospitalName, careMode: doctor.careMode }));
      const response = await fetch(`${API_BASE_URL}/api/emergency`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: patient.patientId, patientName: patient.name, careMode, doctors }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.request) throw new Error(data.message || "Emergency video call could not be started.");
      const request = data.request as EmergencyRequest;
      setEmergencyRequest(request); setVideoCallRoom(request.videoRoomId); setVideoCallDisplayName(patient.name || "Patient");
      if (emergencyWindow && request.videoUrl) emergencyWindow.location.href = request.videoUrl;
      else if (request.videoUrl) window.open(request.videoUrl, "_blank");
      alert(`Emergency video call started. You are being connected to ${request.doctorName}.`);
      setScreen("complete");
    } catch (error) {
      if (emergencyWindow) emergencyWindow.close();
      alert(error instanceof Error ? error.message : "Emergency video call could not be started.");
    }
  };

  /* =========================================================
     PATIENT LOGIN
  ========================================================= */

  const verifyPatient = () => {
    setLoginError("");

    const found = demoPatients.find(
      (p) =>
        p.abha === abhaNumber.trim() &&
        p.otp === otp.trim(),
    );

    if (!found) {
      setLoginError(
        t(
          "patientLogin",
          "wrong",
        ),
      );
      return;
    }

    setPatient(found);

    // Preserve the original Senior Citizen workflow; Normal Mode opens the new service hub.
    const isSeniorCitizenMode = document.documentElement.classList.contains("senior-citizen-mode");
    setScreen(isSeniorCitizenMode ? "patientEmergency" : "patientHome");
  };

  /* =========================================================
     DOCTOR LOGIN
  ========================================================= */

  const verifyDoctor = () => {
    const doctor = DEMO_DOCTORS.find((item) => item.username === username.trim() && item.password === password && item.hospitalId === selectedDoctorHospitalId);
    if (doctor) {
      setDoctorMode(doctor.careMode);
      setLoggedInDoctorId(doctor.id);
      setLoginError("");
      setScreen("doctorQueue");
      return;
    }
    setLoginError("Invalid hospital, doctor ID, or password. Select the doctor's hospital and use a demo doctor credential from that hospital.");
  };

  const verifyAdmin = () => {
    const hospital = DEMO_HOSPITALS.find((item) => item.id === selectedAdminHospitalId);
    if (hospital && username.trim() === hospital.adminId && password === hospital.adminPassword) {
      setLoggedInAdminHospitalId(hospital.id);
      setLoginError("");
      setScreen("adminDashboard");
    } else {
      setLoginError("Invalid hospital, admin ID, or password. Select the correct hospital and use its demo admin credentials.");
    }
  };

  /* =========================================================
     RED-FLAG DETECTION & REVIEW OF SYSTEMS FALLBACK
  ========================================================= */

  const detectRedFlagsFromConversation = (conversation: string) => {
    const text = conversation.toLowerCase();
    const flags: string[] = [];

    // Safety screening fallback. The AI prompt below is also instructed to
    // perform this screening; this prevents an empty result if the API fails.
    const chestPain = /acute chest pain|severe chest pain|sudden chest pain|chest pain/.test(text);
    const breathlessness = /dyspnoea|dyspnea|shortness of breath|breathlessness|difficulty breathing/.test(text);
    if (chestPain && breathlessness) {
      flags.push("Acute chest pain with breathing difficulty reported — urgent clinical assessment required.");
    }

    if (/stroke symptoms|face droop|facial droop|arm weakness|one-sided weakness|speech difficulty|slurred speech/.test(text)) {
      flags.push("Possible stroke warning symptoms reported — urgent clinical assessment required.");
    }

    if (/unconscious|loss of consciousness|seizure|coughing blood|severe bleeding/.test(text)) {
      flags.push("Potential emergency warning symptom reported — urgent clinical assessment required.");
    }

    return flags.length
      ? flags.join("\n")
      : "No red flags detected based on the information provided.";
  };

  const analyzeReviewOfSystemsFromText = (conversation: string) => {
    const text = conversation.toLowerCase();

    const findMatch = (regex: RegExp) => {
      const match = text.match(regex);
      return match ? match[0] : null;
    };

    const constitutional = findMatch(/fever|chills|fatigue|tired|weakness|weight loss|weight gain/);
    const neurological = findMatch(/headache|migraine|dizz|lightheaded|numb|tingl|seiz|faint|blackout/);
    const cardiovascular = findMatch(/chest pain|palpitation|racing heart|irregular heartbeat/);
    const respiratory = findMatch(/cough|phlegm|sputum|shortness of breath|breathlessness|wheez|dyspnea/);
    const gastrointestinal = findMatch(/stomach|abdom|acidity|nausea|vomit|diarrhea|constipat|indigestion/);
    const musculoskeletal = findMatch(/back pain|joint pain|knee pain|stiff|swelling in joint|muscle ache/);
    const integumentary = findMatch(/rash|itch|redness|skin irritation|eruption/);
    const entEyes = findMatch(/sore throat|earache|eye redness|vision|light sensitivity|runny nose|nasal congestion/);

    const formatSystem = (name: string, match: string | null) => {
      if (match) {
        const capitalized = match.charAt(0).toUpperCase() + match.slice(1);
        return `${name}: ${capitalized}`;
      }
      return `${name}: Not provided`;
    };

    return [
      formatSystem("Constitutional", constitutional),
      formatSystem("Neurological", neurological),
      formatSystem("Cardiovascular", cardiovascular),
      formatSystem("Respiratory", respiratory),
      formatSystem("Gastrointestinal", gastrointestinal),
      formatSystem("Musculoskeletal", musculoskeletal),
      formatSystem("Integumentary", integumentary),
      formatSystem("ENT / Eyes", entEyes),
    ].join("\n");
  };

  /* =========================================================
     AI CLINICAL SUMMARY GENERATION
  ========================================================= */

  const generateClinicalSummary = async () => {
    if (isSummaryLoading) return;

    const patientConversation = messages
      .filter((message) => message.text.trim())
      .map((message) => `${message.sender === "patient" ? "PATIENT" : "AI"}: ${message.text.trim()}`)
      .join("\n");

    const documentInformation = medicalDocuments
      .filter((document) => document.name.trim())
      .map((document) => `DOCUMENT ${document.id} (${document.name}):\n${document.structured || document.text || "No extracted information available."}`)
      .join("\n\n");

    if (!patientConversation && !documentInformation) {
      setClinicalSummary("No clinical information was provided for analysis.");
      return;
    }

    setIsSummaryLoading(true);

    try {
      const apiBaseUrl =
        import.meta.env.VITE_API_URL ||
        "http://localhost:3001";

      const prompt = careMode === "ayush"
        ? `Create a physician-ready AYUSH clinical history summary from the information below. Analyze the patient's answers instead of copying them as a list. Clearly separate into distinct sections:
Chief Concern: ...
Dashavidha Pariksha: ...
Ahara-Vihara: ...
Relevant History: ...
Current Symptoms/Concerns: ...
Review of Systems:
Constitutional: [Mention reported symptoms or write 'Not provided']
Neurological: [Mention reported symptoms or write 'Not provided']
Cardiovascular: [Mention reported symptoms or write 'Not provided']
Respiratory: [Mention reported symptoms or write 'Not provided']
Gastrointestinal: [Mention reported symptoms or write 'Not provided']
Musculoskeletal: [Mention reported symptoms or write 'Not provided']
Integumentary: [Mention reported symptoms or write 'Not provided']
ENT / Eyes: [Mention reported symptoms or write 'Not provided']
Document Findings: ...
Red Flag Detection: [State 'No red flags detected' or list urgent symptoms]

For Review of Systems, specifically categorize reported symptoms into the matching system (for example, if a patient reports headache, report it under Neurological) and all other unaffected systems must explicitly say 'Not provided'. Do not invent symptoms or diagnose.

PATIENT CONVERSATION:\n${patientConversation}\n\nDOCUMENT INFORMATION:\n${documentInformation || "No documents uploaded."}`
        : `Create a physician-ready AI-assisted clinical summary from the information below. Analyze the patient's conversation and document findings instead of simply copying every patient sentence. Clearly organize the result under these exact sections:
Chief Complaint: ...
History of Present Illness: ...
Symptoms and Associated Features: ...
Review of Systems:
Constitutional: [Mention reported symptoms or write 'Not provided']
Neurological: [Mention reported symptoms or write 'Not provided']
Cardiovascular: [Mention reported symptoms or write 'Not provided']
Respiratory: [Mention reported symptoms or write 'Not provided']
Gastrointestinal: [Mention reported symptoms or write 'Not provided']
Musculoskeletal: [Mention reported symptoms or write 'Not provided']
Integumentary: [Mention reported symptoms or write 'Not provided']
ENT / Eyes: [Mention reported symptoms or write 'Not provided']
Relevant Medical History: ...
Medications/Allergies: ...
Document Findings: ...
Red Flag Detection: [State 'No red flags detected' or list urgent symptoms]

For Review of Systems, analyze the patient's reported symptoms and mention each symptom under its corresponding physiological system (for example, if the person has headache, mention headache in the Neurological review). Any system where no symptom was reported must be written as 'Not provided'. Do not diagnose or invent symptoms.

PATIENT CONVERSATION:\n${patientConversation}\n\nDOCUMENT INFORMATION:\n${documentInformation || "No documents uploaded."}` ;

      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          history: [],
          language,
          careMode,
          summaryMode: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to generate the clinical summary.");
      }

      const summary = (result?.reply || result?.content || "").trim();
      if (!summary) {
        throw new Error("The AI returned an empty summary.");
      }

      setClinicalSummary(summary);

      // Use the AI response when it explicitly provides a Red Flag Detection
      // section; otherwise use the local safety-screening fallback.
      const aiRedFlagMatch = summary.match(/Red Flag Detection\s*:\s*([\s\S]*?)(?=\n\s*\n[A-Z][^\n]*:|$)/i);
      setRedFlagResult(
        aiRedFlagMatch?.[1]?.trim() || detectRedFlagsFromConversation(patientConversation),
      );

      // Parse AI generated Review of Systems section
      const aiRosMatch = summary.match(/Review of Systems\s*(?:\(ROS\))?\s*:\s*([\s\S]*?)(?=\n\s*\n[A-Z][^\n]*:|$)/i);
      setReviewOfSystemsResult(
        aiRosMatch?.[1]?.trim() || analyzeReviewOfSystemsFromText(patientConversation),
      );
    } catch (error) {
      console.error("Clinical summary error:", error);
      // Safe fallback: still organize the available information rather than
      // incorrectly placing every patient sentence under Symptoms.
      const patientTexts = messages
        .filter((message) => message.sender === "patient" && message.text.trim())
        .map((message) => message.text.trim());

      setRedFlagResult(detectRedFlagsFromConversation(patientConversation));
      setReviewOfSystemsResult(analyzeReviewOfSystemsFromText(patientConversation));

      setClinicalSummary(
        `${careMode === "ayush" ? "AYUSH Clinical History Summary" : "AI-Assisted Clinical Summary"}\n\n` +
        `Chief Concern:\n${patientTexts[0] || "Not provided"}\n\n` +
        `Additional History:\n${patientTexts.slice(1).join(" • ") || "Not provided"}\n\n` +
        `Review of Systems:\n${analyzeReviewOfSystemsFromText(patientConversation)}\n\n` +
        `Document Findings:\n${documentInformation || "No documents uploaded."}\n\n` +
        `Note: AI analysis could not be completed at this time. This draft must be reviewed and verified by a doctor.`,
      );
    } finally {
      setIsSummaryLoading(false);
    }
  };

  /* =========================================================
     DOCUMENT OCR — UP TO 5 DOCUMENTS
  ========================================================= */

  const processMedicalDocument = async (file: File, documentId: number) => {
    setMedicalDocuments((previous) =>
      previous.map((document) =>
        document.id === documentId
          ? {
              ...document,
              file,
              name: file.name,
              text: "",
              structured: "",
              status: "processing",
              error: "",
            }
          : document,
      ),
    );

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const result = String(reader.result || "");
          const commaIndex = result.indexOf(",");
          const base64 = commaIndex >= 0 ? result.slice(commaIndex + 1) : result;

          if (!base64) {
            reject(new Error("The document could not be converted to Base64."));
            return;
          }

          resolve(base64);
        };

        reader.onerror = () => {
          reject(new Error("The document could not be read."));
        };

        reader.readAsDataURL(file);
      });

      const response = await fetch(`${API_BASE_URL}/api/ocr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          base64Data,
          language,
        }),
      });

      const responseText = await response.text();
      let result: any = {};

      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error("The OCR server returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(
          result?.error || result?.message || `OCR server error: ${response.status}`,
        );
      }

      if (!result?.success) {
        throw new Error(
          result?.error || result?.message || "Sarvam AI could not process this document.",
        );
      }

      const extractedText = result?.text || result?.result?.text || "";
      const structuredText =
        result?.structuredText ||
        (result?.structured ? JSON.stringify(result.structured, null, 2) : "");

      setMedicalDocuments((previous) =>
        previous.map((document) =>
          document.id === documentId
            ? {
                ...document,
                text: extractedText,
                structured: structuredText,
                status: "done",
                error: "",
              }
            : document,
        ),
      );
    } catch (error) {
      console.error(`[AAYUVORA OCR ERROR] Document ${documentId}:`, error);

      setMedicalDocuments((previous) =>
        previous.map((document) =>
          document.id === documentId
            ? {
                ...document,
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to process this document.",
              }
            : document,
        ),
      );
    }
  };

  const completedMedicalDocuments = medicalDocuments.filter(
    (document) => document.status === "done",
  );

  const hasProcessingMedicalDocuments = medicalDocuments.some(
    (document) => document.status === "processing",
  );

  const canAddMedicalDocument =
    medicalDocuments.length < 5 &&
    medicalDocuments.length > 0 &&
    medicalDocuments[medicalDocuments.length - 1].status === "done";

  const addMedicalDocument = () => {
    setMedicalDocuments((previous) => {
      if (previous.length >= 5 || !previous.length || previous[previous.length - 1].status !== "done") {
        return previous;
      }
      const nextId = Math.max(...previous.map((document) => document.id)) + 1;
      return [...previous, {
        id: nextId,
        file: null,
        name: "",
        text: "",
        structured: "",
        status: "idle",
        error: "",
      }];
    });
  };

  /* =========================================================
     PATIENT MESSAGE + OPENAI API
  ========================================================= */

  const sendPatientMessage = async () => {
    const value = patientMessage.trim();

    if (!value || isAiLoading) {
      return;
    }

    const history = messages.map((message) => ({
      role:
        message.sender === "patient"
          ? "user"
          : "model",
      text: message.text,
    }));

    const lastAiQuestion = [...messages]
      .reverse()
      .find((message) => message.sender === "ai" && message.text.trim())?.text || "";

    const askedAiQuestions = messages
      .filter((message) => message.sender === "ai" && message.text.trim())
      .map((message) => message.text.trim());

    setMessages((previous) => [
      ...previous,
      {
        sender: "patient",
        text: value,
      },
    ]);

    setPatientMessage("");

    if (careMode === "ayush" && ayushPhase === "dashavidha") {
      const currentIndex = Object.keys(ayushAnswers).length;
      const currentKey = AYUSH_DASHAVIDHA_KEYS[currentIndex];

      if (currentKey) {
        const nextAnswers = {
          ...ayushAnswers,
          [currentKey]: value,
        };

        setAyushAnswers(nextAnswers);

        // The patient answer was already added above before entering
        // the Dashavidha-specific flow, so do not append it again.
        const nextIndex = currentIndex + 1;

        if (nextIndex < AYUSH_DASHAVIDHA_KEYS.length) {
          const nextKey = AYUSH_DASHAVIDHA_KEYS[nextIndex];
          setMessages((previous) => [
            ...previous,
            {
              sender: "ai",
              text: AYUSH_DASHAVIDHA_QUESTIONS[language][nextKey],
            },
          ]);
        } else {
          setAyushPhase("general");
          setMessages((previous) => [
            ...previous,
            {
              sender: "ai",
              text: AYUSH_GENERAL_TRANSITION[language],
            },
          ]);
        }

        return;
      }
    }

    setIsAiLoading(true);

    try {
      const apiBaseUrl =
        import.meta.env.VITE_API_URL ||
        "http://localhost:3001";

      const response = await fetch(
        `${apiBaseUrl}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: value,
            history,
            language,
            careMode,
            ayushPhase,
            ayushDashavidhaAnswers: careMode === "ayush" ? ayushAnswers : undefined,
            lastAiQuestion,
            askedAiQuestions,
            ayushInstruction:
              careMode === "ayush"
                ? "Dashavidha Pariksha has been completed first. Now ask only the remaining non-Dashavidha health-history questions, including Ahara-Vihara, and prepare the final summary in Dashavidha format."
                : undefined,
          }),
        },
      );

      if (!response.ok) {
        let errorMessage =
          "The AI assistant could not respond right now.";

        try {
          const errorData = await response.json();
          if (typeof errorData?.error === "string") {
            errorMessage = errorData.error;
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();

      const finalReply =
        typeof result?.reply === "string"
          ? result.reply.trim()
          : "";

      if (!finalReply) {
        throw new Error(
          result?.error ||
            "Aayuvora AI returned no text. Please check the Sarvam backend and try again.",
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          sender: "ai",
          text: finalReply,
        },
      ]);
    } catch (error) {
      console.error("Aayuvora Sarvam request failed:", error);

      const errorText =
        error instanceof Error
          ? error.message
          : "The AI assistant is temporarily unavailable.";

      setMessages((previous) => [
        ...previous,
        {
          sender: "ai",
          text: errorText,
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  /* =========================================================
     RESET
  ========================================================= */

  const resetApp = () => {
    setScreen("welcome");

    setLanguage("en");

    setRole(null);
    setCareMode("modern");
    setAyushPhase("general");
    setAyushAnswers({});
    setSelectedDoctorHospitalId(DEMO_HOSPITALS[0].id);
    setLoggedInDoctorId("");
    setSelectedAdminHospitalId(DEMO_HOSPITALS[0].id);
    setLoggedInAdminHospitalId("");
    setAdminAppointmentHospitalId(DEMO_HOSPITALS[0].id);
    setAdminAppointmentDoctorId("");

    setAbhaNumber("");
    setOtp("");

    setUsername("");
    setPassword("");

    setLoginError("");

    setPatient(null);

    setPatientMessage("");

    setMessages([]);
    setIsAiLoading(false);

    setMedicalDocuments(
      Array.from({ length: 1 }, (_, index) => ({
        id: index + 1,
        file: null,
        name: "",
        text: "",
        structured: "",
        status: "idle",
        error: "",
      })),
    );

    setRetentionChoice(null);

    setAdminAppointmentAbha("");
    setAdminAppointmentOtp("");
    setAdminAppointmentError("");
    setAdminAppointmentVerifiedPatient(null);
    setAdminAppointmentChoice(null);

    // Keep appointment bookings and submitted temporary patient records alive
    // across in-app logout/login. They remain React-memory only, so a full
    // browser reload still clears them automatically. This lets the doctor
    // see patients booked by the admin during the same website session.
  };

  /* =========================================================
     SPLASH SCREEN — 5 SECONDS
  ========================================================= */

  if (screen === "splash") {
    return (
      <div
        className="app"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 25%, #ddf6ef 0, transparent 38%), #f5fbf9",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "min(760px, 92vw)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: "18px",
            animation: "AayuvoraSplashFade 0.8s ease-out",
          }}
        >
          <div
            style={{
              width: "min(420px, 72vw)",
              aspectRatio: "1 / 1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/aayuvora-logo.png"
              alt="Aayuvora healthcare logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          <div
            style={{
              fontSize: "clamp(30px, 5vw, 52px)",
              lineHeight: 1.1,
              fontWeight: 800,
              color: "#087f70",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Aayuvora
          </div>

          <div
            style={{
              fontSize: "clamp(28px, 4.5vw, 48px)",
              lineHeight: 1.2,
              fontWeight: 700,
              color: "#183c37",
              letterSpacing: "0.02em",
            }}
          >
            सर्वे सन्तु निरामयाः
          </div>

          <div
            style={{
              width: "min(520px, 82vw)",
              height: "1px",
              background: "#c8ddd8",
            }}
          />

          <div
            style={{
              fontSize: "clamp(14px, 2vw, 20px)",
              letterSpacing: "0.24em",
              fontWeight: 700,
              color: "#183c37",
            }}
          >
            HEALTH. <span style={{ color: "#d97732" }}>INDIA.</span>{" "}
            <span style={{ color: "#167c45" }}>TECHNOLOGY.</span>
          </div>
        </div>

        <style>
          {`
            @keyframes AayuvoraSplashFade {
              from {
                opacity: 0;
                transform: translateY(8px) scale(0.99);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}
        </style>
      </div>
    );
  }

  /* =========================================================
     SENIOR CITIZEN WELCOME — simplified layout matching reference
  ========================================================= */

  if (screen === "welcome" && document.documentElement.classList.contains("senior-welcome-design")) {
    const seniorWelcomeText = "Welcome to Aayuvora. AI-assisted patient care-taking and pre-consultation platform. Start consultation. Secure, consent-based, role-based access. Aayuvora Healthcare Platform. Use SOS for urgent help.";
    return (
      <div className="app senior-welcome-screen">
        <header className="senior-welcome-topbar">
          <AayuvoraMenu language={language} setLanguage={setLanguage} showViewMedicines />
          <button type="button" className="welcome-mode-button senior-normal-mode-button" onClick={() => {
            document.documentElement.classList.remove("large-text-mode", "senior-citizen-mode", "senior-welcome-design");
            document.body.classList.remove("large-text-mode", "senior-citizen-mode", "senior-welcome-design");
            setScreen("welcome");
            stopSpeaking();
          }}>Normal Mode</button>
        </header>
        <main className="senior-welcome-content">
          <div className="senior-welcome-logo-wrap">
            <img src="/aayuvora-logo.png" alt="Aayuvora healthcare logo" />
          </div>
          <h1>WELCOME TO<br />AAYUVORA</h1>
          <p className="senior-welcome-tagline">AI-assisted patient care-taking and pre-consultation platform</p>
          <div className="senior-welcome-actions">
            <button type="button" className="senior-listen-button" onClick={() => { stopSpeaking(); void speakText(seniorWelcomeText, VOICE_LANGUAGES[language] || "en-IN"); }}>
              <Volume2 size={18} /> Listen
            </button>
            <button type="button" className="senior-start-button" onClick={() => setScreen("role")}>
              Start Consultation <ArrowRight size={20} />
            </button>
          </div>
          <div className="senior-welcome-security"><ShieldCheck size={16} /> Secure • Consent-based • Role-based access</div>
          <footer className="senior-welcome-footer">Aayuvora Healthcare Platform</footer>
        </main>
        <button className="sos-button senior-welcome-sos" type="button" onClick={handleSOS} disabled={sosLoading} aria-busy={sosLoading}>
          <HeartPulse size={20} /> {sosLoading ? "Fetching location…" : "SOS"}
        </button>
        {(sosMessage || sosAddress) && (
          <section className="sos-status-card welcome-sos-status" role="status" aria-live="polite">
            <div className="sos-status-title">{sosLoading ? "Requesting emergency location" : "SOS status"}</div>
            {sosMessage && <p className="sos-status-text">{sosMessage}</p>}
            {sosAddress && <div className="sos-address"><strong>Fetched address</strong><span>{sosAddress}</span></div>}
            <button className="sos-close-button" type="button" onClick={() => { setSosMessage(""); setSosAddress(""); }}>Close</button>
          </section>
        )}
      </div>
    );
  }

  /* =========================================================
     WELCOME
  ========================================================= */

  if (screen === "welcome") {
    const enableSeniorMode = () => {
      // Keep the user on the welcome page while enabling accessibility mode.
      document.documentElement.classList.add("large-text-mode", "senior-citizen-mode", "senior-welcome-design");
      document.body.classList.add("large-text-mode", "senior-citizen-mode", "senior-welcome-design");
      setScreen("welcome");
      stopSpeaking();
      void speakText("Welcome to Aayuvora. AI-assisted patient care-taking and pre-consultation platform. Start consultation. Secure, consent-based, role-based access. Aayuvora Healthcare Platform. Use SOS for urgent help.", VOICE_LANGUAGES[language] || "en-IN");
    };
    const getWelcomeText = () => "Welcome to Aayuvora. AI-assisted patient care-taking and pre-consultation platform. AI pre-consultation, video consultation, hospital visits, prescriptions and medicine delivery, all in one place. Start consultation. Use the SOS button for urgent help.";
    return (
      <div className="app welcome-screen">
        <header className="welcome-topbar">
          <div className="welcome-brand">
            <AayuvoraMenu language={language} setLanguage={setLanguage} showViewMedicines />
            <img src="/aayuvora-logo.png" alt="Aayuvora healthcare logo" />
            <div><strong>Aayuvora</strong><span>सर्वे सन्तु निरामयाः</span></div>
          </div>
          <div className="welcome-controls">
            <VoiceButton language={language} getText={getWelcomeText} />
            <button className="welcome-mode-button" type="button" onClick={enableSeniorMode} aria-label="Enable Senior Citizen Mode">♿ <span>Senior Citizen Mode</span></button>
          </div>
        </header>
        <main className="welcome-hero">
          <section className="welcome-copy">
            <div className="welcome-pill"><ShieldCheck size={18}/> Care for every patient, in your language</div>
            <h1>AI-assisted patient care-taking and pre-consultation platform</h1>
            <p>Login with your ABHA number. AI pre-consultation, video consultation, hospital visits, prescriptions and medicine delivery, all in one place.</p>
            <div className="welcome-cta-row">
              <button className="primary-button start-button" onClick={() => setScreen("role")}> <Stethoscope size={22}/> Start Consultation <ArrowRight size={21}/></button>
              <span>Use the SOS button for urgent help.</span>
            </div>
          </section>
          <aside className="welcome-logo-card">
            <img src="/aayuvora-logo.png" alt="Aayuvora logo" />
            <strong>Aayuvora</strong><span>Patient Care Platform</span>
          </aside>
        </main>
        <button className="sos-button welcome-sos" type="button" onClick={handleSOS} disabled={sosLoading} aria-busy={sosLoading}>
          🚨 {sosLoading ? "Fetching location…" : "SOS"}
        </button>
        {(sosMessage || sosAddress) && (
          <section className="sos-status-card welcome-sos-status" role="status" aria-live="polite">
            <div className="sos-status-title">{sosLoading ? "Requesting emergency location" : "SOS status"}</div>
            {sosMessage && <p className="sos-status-text">{sosMessage}</p>}
            {sosAddress && <div className="sos-address"><strong>Fetched address</strong><span>{sosAddress}</span></div>}
            <button className="sos-close-button" type="button" onClick={() => { setSosMessage(""); setSosAddress(""); }}>Close</button>
          </section>
        )}
      </div>
    );
  }

  /* =========================================================
     PUBLIC MEDICINE CATALOG — AVAILABLE BEFORE LOGIN
  ========================================================= */

  if (screen === "publicMedicines") {
    const publicMedicineText: Record<Language, { title: string; subtitle: string; login: string; back: string; searchPlaceholder: string; noResults: string; resultCount: (count: number) => string }> = {
      en: { title: "View Medicines", subtitle: "Browse all 50 medicines available in the Aayuvora catalogue. Ordering medicines requires patient login.", login: "Login to Order Medicines", back: "Back to Welcome", searchPlaceholder: "Search medicines by name…", noResults: "No medicines match your search.", resultCount: (count) => `${count} ${count === 1 ? "medicine" : "medicines"} found` },
      hi: { title: "दवाइयाँ देखें", subtitle: "Aayuvora कैटलॉग में उपलब्ध सभी 50 दवाइयाँ देखें। दवाइयाँ ऑर्डर करने के लिए रोगी लॉगिन आवश्यक है।", login: "दवाइयाँ ऑर्डर करने के लिए लॉगिन करें", back: "स्वागत पृष्ठ पर वापस जाएँ", searchPlaceholder: "दवा का नाम खोजें…", noResults: "आपकी खोज से कोई दवा नहीं मिली।", resultCount: (count) => `${count} दवाइयाँ मिलीं` },
      bn: { title: "ওষুধ দেখুন", subtitle: "Aayuvora ক্যাটালগে থাকা ৫০টি ওষুধ দেখুন। ওষুধ অর্ডার করতে রোগীর লগইন প্রয়োজন।", login: "ওষুধ অর্ডার করতে লগইন করুন", back: "স্বাগত পাতায় ফিরে যান", searchPlaceholder: "ওষুধের নাম লিখে খুঁজুন…", noResults: "আপনার অনুসন্ধানে কোনও ওষুধ পাওয়া যায়নি।", resultCount: (count) => `${count}টি ওষুধ পাওয়া গেছে` },
      mr: { title: "औषधे पहा", subtitle: "Aayuvora कॅटलॉगमधील सर्व ५० औषधे पाहा. औषधे मागवण्यासाठी रुग्ण लॉगिन आवश्यक आहे.", login: "औषधे मागवण्यासाठी लॉगिन करा", back: "स्वागत पृष्ठावर परत जा", searchPlaceholder: "औषधाचे नाव शोधा…", noResults: "तुमच्या शोधाशी जुळणारे औषध सापडले नाही.", resultCount: (count) => `${count} औषधे सापडली` },
      te: { title: "మందులను చూడండి", subtitle: "Aayuvora కేటలాగ్‌లో అందుబాటులో ఉన్న మొత్తం 50 మందులను చూడండి. మందులను ఆర్డర్ చేయడానికి రోగి లాగిన్ అవసరం.", login: "మందులను ఆర్డర్ చేయడానికి లాగిన్ చేయండి", back: "స్వాగత పేజీకి తిరిగి వెళ్లండి", searchPlaceholder: "మందు పేరుతో వెతకండి…", noResults: "మీ శోధనకు సరిపోయే మందులు కనబడలేదు.", resultCount: (count) => `${count} మందులు కనుగొనబడ్డాయి` },
      ta: { title: "மருந்துகளைப் பார்க்கவும்", subtitle: "Aayuvora பட்டியலில் உள்ள 50 மருந்துகளையும் பார்க்கவும். மருந்துகளை ஆர்டர் செய்ய நோயாளர் உள்நுழைவு தேவை.", login: "மருந்துகளை ஆர்டர் செய்ய உள்நுழைக", back: "வரவேற்புப் பக்கத்திற்குத் திரும்பு", searchPlaceholder: "மருந்தின் பெயரைத் தேடவும்…", noResults: "உங்கள் தேடலுக்குப் பொருந்தும் மருந்துகள் இல்லை.", resultCount: (count) => `${count} மருந்துகள் கிடைத்தன` },
    };
    const labels = publicMedicineText[language] || publicMedicineText.en;
    const filteredMedicines = MEDICINE_CATALOG.filter((medicine) => medicine.toLocaleLowerCase().includes(publicMedicineSearch.trim().toLocaleLowerCase()));
    return <div className="app public-medicines-screen">
      <header className="patient-home-topbar">
        <div className="patient-home-brand"><img src="/aayuvora-logo.png" alt="Aayuvora logo" /><div><strong>Aayuvora</strong><span>{labels.title}</span></div></div>
        <div className="patient-home-header-actions"><AayuvoraMenu language={language} setLanguage={setLanguage} /><button type="button" className="secondary-button" onClick={() => setScreen("welcome")}>{labels.back}</button></div>
      </header>
      <main className="patient-home-content">
        <section className="patient-home-greeting"><p className="welcome-pill">AAYUVORA HEALTHCARE</p><h1>{labels.title}</h1><p>{labels.subtitle}</p></section>
        <div className="public-medicine-search-wrap">
          <label className="public-medicine-search" htmlFor="public-medicine-search-input">
            <Search size={20} aria-hidden="true" />
            <input id="public-medicine-search-input" type="search" value={publicMedicineSearch} onChange={(event) => setPublicMedicineSearch(event.target.value)} placeholder={labels.searchPlaceholder} autoComplete="off" />
            {publicMedicineSearch && <button type="button" className="public-medicine-search-clear" onClick={() => setPublicMedicineSearch("")} aria-label="Clear medicine search">×</button>}
          </label>
          <p className="public-medicine-result-count" aria-live="polite">{labels.resultCount(filteredMedicines.length)}</p>
        </div>
        {filteredMedicines.length > 0 ? <div className="public-medicine-grid">{filteredMedicines.map((medicine) => <article className="summary-card public-medicine-card" key={medicine}><span className="public-medicine-number">{String(MEDICINE_CATALOG.indexOf(medicine) + 1).padStart(2, "0")}</span><strong>{medicine}</strong></article>)}</div> : <div className="public-medicine-no-results" role="status">{labels.noResults}</div>}
        <div className="public-medicine-login-cta"><button type="button" className="primary-button full" onClick={() => setScreen("patientLogin")}>{labels.login}<ArrowRight size={19} /></button></div>
      </main>
    </div>;
  }

  /* =========================================================
     STEP 2 — ROLE
  ========================================================= */

  if (screen === "role") {
    return (
      <PageShell
        language={language}
        step="STEP 2"
        title={t(
          "role",
          "title",
        )}
        onBack={() =>
          setScreen("welcome")
        }
      >

        <div className="page-icon">
          <Users size={30} />
        </div>

        <p className="page-description">
          {t(
            "role",
            "description",
          )}
        </p>

        <div className="role-grid">

          <button
            className="role-card"
            onClick={() =>
              selectRole("patient")
            }
          >

            <UserRound size={34} />

            <strong>
              {t(
                "role",
                "patient",
              )}
            </strong>

            <span>
              {t(
                "role",
                "patientDescription",
              )}
            </span>

          </button>

          <button
            className="role-card"
            onClick={() =>
              selectRole("doctor")
            }
          >

            <Stethoscope size={34} />

            <strong>
              {t(
                "role",
                "doctor",
              )}
            </strong>

            <span>
              {t(
                "role",
                "doctorDescription",
              )}
            </span>

          </button>

          <button
            className="role-card"
            onClick={() =>
              selectRole("admin")
            }
          >

            <Settings size={34} />

            <strong>
              {t(
                "role",
                "admin",
              )}
            </strong>

            <span>
              {t(
                "role",
                "adminDescription",
              )}
            </span>

          </button>

        </div>

      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — CARE MODE
  ========================================================= */

  if (screen === "careMode") {
    const copy = CARE_MODE_COPY[language];

    return (
      <PageShell
        language={language}
        step="PATIENT • STEP 3"
        title={copy.title}
        onBack={() => setScreen("role")}
      >
        <div className="page-icon">
          <Stethoscope size={30} />
        </div>

        <p className="page-description">
          {copy.description}
        </p>

        <div className="role-grid">
          <button
            className="role-card"
            type="button"
            onClick={() => {
              setCareMode("modern");
              setScreen("patientLogin");
            }}
          >
            <HeartPulse size={34} />
            <strong>{copy.modernTitle}</strong>
            <span>{copy.modernDescription}</span>
          </button>

          <button
            className="role-card"
            type="button"
            onClick={() => {
              setCareMode("ayush");
              setScreen("patientLogin");
            }}
          >
            <Activity size={34} />
            <strong>{copy.ayushTitle}</strong>
            <span>{copy.ayushDescription}</span>
          </button>
        </div>
      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — STEP 3 ABHA
  ========================================================= */

  if (screen === "patientLogin") {
    return (
      <PageShell
        language={language}
        step="PATIENT • STEP 3"
        title={t(
          "patientLogin",
          "title",
        )}
        onBack={() =>
          setScreen("role")
        }
      >

        <div className="page-icon">
          <UserRound size={30} />
        </div>

        <p className="page-description">
          {t(
            "patientLogin",
            "description",
          )}
        </p>

        {careMode === "ayush" && (
          <div className="demo-banner">
            <strong>AYUSH OPD</strong>
            <span>Ayurvedic history mode selected.</span>
          </div>
        )}

        <div className="demo-banner">

          <strong>
            {t(
              "patientLogin",
              "demo",
            )}
          </strong>

          <span>
            {t(
              "patientLogin",
              "demoText",
            )}
          </span>

        </div>

        <label>
          {t(
            "patientLogin",
            "abha",
          )}
        </label>

        <input
          className="text-input"
          value={abhaNumber}
          onChange={(event) => {
            setAbhaNumber(
              event.target.value,
            );
            setLoginError("");
          }}
          placeholder={t(
            "patientLogin",
            "abhaPlaceholder",
          )}
        />

        <label>
          {t(
            "patientLogin",
            "otp",
          )}
        </label>

        <input
          className="text-input"
          type="password"
          value={otp}
          onChange={(event) => {
            setOtp(event.target.value);
            setLoginError("");
          }}
          placeholder={t(
            "patientLogin",
            "otpPlaceholder",
          )}
          maxLength={6}
        />

        {loginError && (
          <div className="login-error">

            <XCircle size={19} />

            <span>
              {loginError}
            </span>

          </div>
        )}

        <div className="demo-credentials">

          <strong>
            {t(
              "patientLogin",
              "demoCredentials",
            )}
          </strong>

          <p>
            ABHA:
            {" "}
            11-1111-1111-1111
          </p>

          <p>
            OTP: 111111
          </p>

        </div>

        <button
          className="primary-button full"
          onClick={verifyPatient}
        >
          {t(
            "patientLogin",
            "verify",
          )}

          <ArrowRight size={19} />
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     PATIENT HOME — SERVICE HUB
  ========================================================= */

  if (screen === "patientHome") {
    const serviceCards = [
      { title: "Emergency Appointment", description: "Start the emergency appointment workflow.", icon: <HeartPulse size={28} />, action: () => setScreen("patientEmergency") },
      { title: "Order Medicines", description: "Browse medicines and manage your order.", icon: <ShoppingCart size={28} />, action: () => setScreen("patientMedicineOrder") },
      { title: "Upcoming Appointments", description: "Review and manage your booked appointments.", icon: <CalendarClock size={28} />, action: () => setScreen("patientUpcomingAppointments") },
      { title: "AI pre-consultation", description: "First tell about your health and then book an appointment.", icon: <Stethoscope size={28} />, action: () => setScreen("patientConsent") },
      { title: "Your Records", description: "Open your previously generated health summaries with date and time.", icon: <FileText size={28} />, action: () => setScreen("patientRecordHistory") },
    ];
    const faqs = [
      ["How do I start a consultation?", "Choose AI pre-consultation, describe how you feel, and follow the steps to book or request care."],
      ["What is AI pre-consultation?", "It helps organize the information you share before a clinician reviews it. It is not a diagnosis."],
      ["Can I order medicines here?", "Choose Order Medicines, select available items, and follow the order and address steps."],
      ["Where can I see my appointments?", "Open Upcoming Appointments to view bookings available to this account."],
      ["Where are my health summaries stored?", "Your Records shows summaries saved in this browser for the signed-in patient."],
      ["Can I change the language?", "Open Menu near the Aayuvora logo and choose one of the six supported languages."],
      ["How do I enable dark mode?", "Open Menu and select Dark mode."],
      ["What should I do in an emergency?", "Use SOS for urgent help or Emergency Appointment to enter the emergency workflow. If there is immediate danger, contact local emergency services."],
      ["Is an AI summary a medical diagnosis?", "No. AI summaries are drafts to support a clinician and must be reviewed by a qualified healthcare professional."],
      ["How do I log out?", "Use Log out in the upper-left area of this page to return to the welcome screen."],
    ];
    return (
      <div className="app patient-home-screen">
        <header className="patient-home-topbar">
          <div className="patient-home-brand"><img src="/aayuvora-logo.png" alt="Aayuvora logo" /><div><strong>Aayuvora</strong><span>Patient Care Platform</span></div></div>
          <div className="patient-home-header-actions"><AayuvoraMenu language={language} setLanguage={setLanguage} /><button className="secondary-button" onClick={() => { setPatient(null); setAbhaNumber(""); setOtp(""); setScreen("welcome"); }}><LogOut size={17} /> Log out</button></div>
        </header>
        <nav className="patient-home-nav" aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="#workflow">Workflow</a>
          <a href="#faq">Frequently Asked Questions</a>
          <a href="#feedback">Feedback</a>
        </nav>
        <main className="patient-home-content">
          <section className="patient-home-greeting"><p className="welcome-pill">YOUR CARE, IN ONE PLACE</p><h1>{language === "en" ? `Hello, ${patient?.name || "there"}!` : `${GLOBAL_SENTENCE_TRANSLATIONS[language]?.["Hello,"] || "Hello,"} ${translatePatientName(patient?.name || "there", language)}!`}</h1><p>What would you like to do today?</p></section>
          <section id="services" className="patient-service-grid" aria-label="Patient services">
            {serviceCards.map((service) => <button key={service.title} className="patient-service-card" onClick={service.action}><span className="patient-service-icon">{service.icon}</span><strong>{service.title}</strong><span>{service.description}</span><span className="patient-service-link">Open service <ArrowRight size={16} /></span></button>)}
          </section>
          <section id="workflow" className="patient-home-section"><h2>How It Works</h2><div className="how-it-works-grid">{[["1", "Login", "Sign in securely to your account."], ["2", "Tell us how you feel", "Share your symptoms and concerns."], ["3", "Choose and Book", "Choose a suitable care option and appointment."], ["4", "Get Care", "Connect with the care workflow and clinician." ]].map(([number, title, description]) => <div className="how-step" key={number}><span>{number}</span><strong>{title}</strong><p>{description}</p></div>)}</div></section>
          <section id="faq" className="patient-home-section"><h2>Frequently Asked Questions</h2><div className="patient-faq-list">{faqs.map(([question, answer]) => <details key={question} className="patient-faq"><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
          <div id="feedback"><FeedbackSection language={language} patientName={patient?.name || ""} /></div>
        </main>
        <button className="sos-button patient-home-sos" type="button" onClick={handleSOS} disabled={sosLoading} aria-busy={sosLoading}><HeartPulse size={19} /> {sosLoading ? "Fetching location…" : "SOS"}</button>
        {(sosMessage || sosAddress) && <section className="sos-status-card patient-home-sos-status" role="status" aria-live="polite"><div className="sos-status-title">{sosLoading ? "Requesting emergency location" : "SOS status"}</div>{sosMessage && <p className="sos-status-text">{sosMessage}</p>}{sosAddress && <div className="sos-address"><strong>Fetched address</strong><span>{sosAddress}</span></div>}<button className="sos-close-button" onClick={() => { setSosMessage(""); setSosAddress(""); }}>Close</button></section>}
      </div>
    );
  }

  if (screen === "patientRecordHistory") {
    const records = savedHealthSummaries.filter((item) => item.patientId === patient?.patientId);
    return <PageShell language={language} step="PATIENT • YOUR RECORDS" title="Your Health Records" onBack={() => setScreen("patientHome")}>
      <p className="page-description">Previous AI-assisted summaries saved for {patient?.name || "this patient"}, newest first.</p>
      {records.length ? <div className="saved-summary-list">{records.map((record) => <article className="saved-summary-card" key={record.id}><div className="saved-summary-meta"><strong>{record.patientName}</strong><time dateTime={record.createdAt}>{new Date(record.createdAt).toLocaleString()}</time></div><p className="saved-summary-text" data-no-translate="true">{record.summary}</p><span className="saved-summary-mode">{record.careMode === "ayush" ? "AYUSH" : "Modern care"}</span></article>)}</div> : <div className="information-box"><div className="info-row"><FileText size={20}/><span>No previous summaries have been saved for this patient in this browser yet. Complete AI pre-consultation and generate a summary to see it here.</span></div></div>}
    </PageShell>;
  }

  /* =========================================================
     PATIENT — STEP 4 EMERGENCY APPOINTMENT
  ========================================================= */

  if (screen === "patientEmergency") {
    return (
      <PageShell language={language} step="PATIENT • STEP 4" title="Emergency Appointment" onBack={() => setScreen("patientLogin")}>
        <div className="page-icon"><HeartPulse size={30} /></div>
        <p className="page-description">Is there any emergency that requires an immediate doctor consultation?</p>
        <div className="information-box" style={{ marginBottom: "18px" }}><div className="info-row"><ShieldCheck size={18} /><span>If you select Yes, Aayuvora will immediately create an emergency video consultation and connect you to an available doctor.</span></div></div>
        <div className="choice-grid">
          <button type="button" className="role-card" onClick={() => handleEmergencyChoice(true)}><HeartPulse size={34} /><strong>Yes, this is an emergency</strong><span>Start an emergency video call now</span></button>
          <button type="button" className="role-card" onClick={() => handleEmergencyChoice(false)}><CheckCircle2 size={34} /><strong>No, continue normally</strong><span>Continue to the regular consultation workflow</span></button>
        </div>
      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — STEP 4 CONSENT
  ========================================================= */

  if (
    screen ===
    "patientConsent"
  ) {
    return (
      <PageShell
        language={language}
        step="PATIENT • STEP 4"
        title={t(
          "consent",
          "title",
        )}
        onBack={() =>
          setScreen(
            "patientLogin",
          )
        }
      >

        <div className="page-icon">
          <ShieldCheck size={30} />
        </div>

        <p className="page-description">

          <strong>
            {patient?.name}
          </strong>
          {", "}

          {t(
            "consent",
            "description",
          )}

        </p>

        <div className="information-box">

          <div className="info-row">
            <Check size={18} />

            <span>
              {t(
                "consent",
                "point1",
              )}
            </span>
          </div>

          <div className="info-row">
            <Check size={18} />

            <span>
              {t(
                "consent",
                "point2",
              )}
            </span>
          </div>

          <div className="info-row">
            <Check size={18} />

            <span>
              {t(
                "consent",
                "point3",
              )}
            </span>
          </div>

        </div>

        <div className="consent-message">

          <LockKeyhole size={18} />

          <span>
            {t(
              "consent",
              "consent",
            )}
          </span>

        </div>

        <button
          className="primary-button full"
          onClick={() => {

            setAyushAnswers({});

            if (careMode === "ayush") {
              setAyushPhase("dashavidha");
              setMessages([
                {
                  sender: "ai",
                  text: AYUSH_DASHAVIDHA_QUESTIONS[language][
                    AYUSH_DASHAVIDHA_KEYS[0]
                  ],
                },
              ]);
            } else {
              setAyushPhase("general");
              setMessages([
                {
                  sender: "ai",
                  text: t(
                    "consultation",
                    "greeting",
                  ),
                },
              ]);
            }

            setScreen(
              "patientConsultation",
            );

          }}
        >
          {t(
            "consent",
            "continue",
          )}

          <ArrowRight size={19} />
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — STEP 5 CONSULTATION
  ========================================================= */

  if (
    screen ===
    "patientConsultation"
  ) {
    return (
      <PageShell
        language={language}
        step="PATIENT • STEP 5"
        title={t(
          "consultation",
          "title",
        )}
        onBack={() =>
          setScreen(
            "patientConsent",
          )
        }
      >

        <div className="ai-header">

          <div className="ai-icon">
            <HeartPulse size={25} />
          </div>

          <div>

            <strong>
              {t(
                "consultation",
                "assistant",
              )}
            </strong>

            <span>
              {t(
                "consultation",
                "subtitle",
              )}
            </span>

          </div>

        </div>

        <div className="chat-area">

          {messages.map(
            (message, index) => (

              <div
                key={index}
                className={
                  message.sender ===
                  "patient"
                    ? "chat-message patient"
                    : "chat-message ai"
                }
              >

                {message.sender ===
                  "ai" && (
                  <strong>
                    {t(
                      "consultation",
                      "assistant",
                    )}
                  </strong>
                )}

                <p>
                  {message.text}
                </p>

              </div>

            ),
          )}

        </div>

        {isAiLoading && (
          <div className="ai-thinking">
            {language === "hi"
              ? "Aayuvora AI सोच रहा है..."
              : language === "bn"
                ? "Aayuvora AI ভাবছে..."
                : language === "mr"
                  ? "Aayuvora AI विचार करत आहे..."
                  : language === "te"
                    ? "Aayuvora AI ఆలోచిస్తోంది..."
                    : language === "ta"
                      ? "Aayuvora AI யோசிக்கிறது..."
                      : "Aayuvora AI is thinking..."}
          </div>
        )}

        <div className="message-input">

          <textarea
            value={patientMessage}
            onChange={(event) =>
              setPatientMessage(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendPatientMessage();
              }
            }}
            placeholder={t(
              "consultation",
              "placeholder",
            )}
            disabled={isAiLoading}
          />

          <VoiceInputButton
            language={language}
            value={patientMessage}
            onChange={setPatientMessage}
            onListeningChange={() => undefined}
            label={t(
              "consultation",
              "speak",
            )}
          />

        </div>

        <div className="action-row">

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              void sendPatientMessage();
            }}
            disabled={isAiLoading || !patientMessage.trim()}
          >
            {isAiLoading
              ? "Thinking..."
              : t(
                  "consultation",
                  "send",
                )}
          </button>

          <button
            className="primary-button"
            onClick={() =>
              setScreen(
                "patientDocuments",
              )
            }
          >
            {t(
              "consultation",
              "continue",
            )}

            <ArrowRight size={19} />
          </button>

        </div>

      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — STEP 6 DOCUMENTS
  ========================================================= */

  if (
    screen ===
    "patientDocuments"
  ) {
    return (
      <PageShell
        language={language}
        step="PATIENT • STEP 6"
        title={t(
          "documents",
          "title",
        )}
        onBack={() =>
          setScreen(
            "patientConsultation",
          )
        }
      >

        <div className="page-icon">
          <FileText size={30} />
        </div>

        <p className="page-description">
          {t(
            "documents",
            "description",
          )}
        </p>

        <div className="documents-upload-grid">
          {medicalDocuments.map((document) => (
            <div className="document-upload-card" key={document.id}>
              <label className="upload-area">
                <Upload size={30} />
                <strong>
                  {document.name || `Upload Document ${document.id}`}
                </strong>
                <span>
                  {t(
                    "documents",
                    "fileTypes",
                  )}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void processMedicalDocument(file, document.id);
                    }
                    event.currentTarget.value = "";
                  }}
                />
              </label>

              {document.status === "processing" && (
                <div className="doctor-note document-status-note">
                  <FileText size={18} />
                  <span>
                    Generating a separate summary for Document {document.id}...
                  </span>
                </div>
              )}

              {document.status === "done" && (
                <div className="information-box document-result-box">
                  <div className="info-row">
                    <CheckCircle2 size={18} />
                    <span>
                      Document {document.id} processed successfully.
                    </span>
                  </div>

                  {document.structured && (
                    <div className="info-row">
                      <FileText size={18} />
                      <span style={{ whiteSpace: "pre-wrap" }}>
                        {document.structured}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {document.status === "error" && (
                <div className="login-error document-status-note">
                  <XCircle size={18} />
                  <span>{document.error}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {canAddMedicalDocument && (
          <button
            type="button"
            className="secondary-button add-medical-document-button"
            onClick={addMedicalDocument}
          >
            <Plus size={18} /> Add Document
          </button>
        )}

        <div className="doctor-note" style={{ marginTop: "14px" }}>
          <FileText size={18} />
          <span>
            Upload one document at a time. After its summary is generated successfully, choose + Add Document to add the next document here. Up to 5 documents are supported.
          </span>
        </div>

        <button
          className="primary-button full"
          disabled={hasProcessingMedicalDocuments || isSummaryLoading}
          onClick={async () => {
            await generateClinicalSummary();
            setScreen("patientSummary");
          }}
        >
          {isSummaryLoading ? "Analyzing your health information..." : t(
            "documents",
            "continue",
          )}

          <ArrowRight size={19} />
        </button>

        <button
          className="secondary-button full"
          onClick={() =>
            setScreen(
              "patientSummary",
            )
          }
        >
          {t(
            "documents",
            "skip",
          )}
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — STEP 7 SUMMARY
  ========================================================= */

  if (
    screen ===
    "patientSummary"
  ) {
    const summaryExplanation =
      SUMMARY_EXPLANATIONS[language];

    const patientResponses =
      messages
        .filter(
          (message) =>
            message.sender === "patient" &&
            message.text.trim(),
        )
        .map(
          (message) =>
            message.text.trim(),
        );

    const firstPatientMessage =
      patientResponses[0] ||
      t(
        "summary",
        "unavailable",
      );

    const additionalResponses =
      patientResponses.slice(1);

    const durationResponse =
      additionalResponses.find(
        (text) =>
          /\b(day|days|week|weeks|month|months|year|years)\b/i.test(
            text,
          ) ||
          /(दिन|दिनों|हफ्ते|सप्ताह|महीने|माह|साल)/i.test(
            text,
          ),
      ) ||
      t(
        "summary",
        "unavailable",
      );

    const otherHistory =
      additionalResponses
        .filter(
          (text) =>
            text !== durationResponse,
        )
        .join(" • ") ||
      t(
        "summary",
        "unavailable",
      );

    const ayushAharaVihara =
      additionalResponses
        .filter((text) => {
          const lower =
            text.toLowerCase();

          return (
            lower.includes("diet") ||
            lower.includes("food") ||
            lower.includes("meal") ||
            lower.includes("sleep") ||
            lower.includes("routine") ||
            lower.includes("exercise") ||
            lower.includes("activity") ||
            lower.includes("lifestyle") ||
            lower.includes("आहार") ||
            lower.includes("विहार") ||
            lower.includes("खाना") ||
            lower.includes("दिनचर्या") ||
            lower.includes("नींद")
          );
        })
        .join(" • ") ||
      t(
        "summary",
        "unavailable",
      );

    return (
      <PageShell
        language={language}
        step="PATIENT • STEP 7"
        title={t(
          "summary",
          "title",
        )}
        onBack={() =>
          setScreen(
            "patientDocuments",
          )
        }
      >
        <div className="summary-card">

          <div className="summary-title">
            <Stethoscope size={21} />
            <strong>
              {t(
                "summary",
                "heading",
              )}
            </strong>
          </div>

          {clinicalSummary ? (
            <SummaryRow
              title="AI-Assisted Clinical Analysis"
              value={clinicalSummary}
              explanation="This summary analyzes the patient conversation and uploaded medical documents into clinically organized information. It is an AI-assisted draft and must be verified by a doctor."
            />
          ) : null}

          <SummaryRow
            title="Red Flag Detection"
            value={redFlagResult}
            explanation="AI-assisted safety screening checks the information provided for urgent warning symptoms. This is not a diagnosis and urgent concerns should be assessed immediately by qualified clinical staff."
          />

          <SummaryRow
            title="Review of Systems (ROS)"
            value={reviewOfSystemsResult}
            explanation="AI-assisted review of physiological systems identifying specific symptoms under their corresponding organ systems, with unmentioned systems designated as Not provided."
          />

          <SummaryRow
            title={t(
              "summary",
              "patient",
            )}
            value={
              patient?.name ||
              t(
                "summary",
                "unavailable",
              )
            }
            explanation={
              summaryExplanation.patient
            }
          />

          <SummaryRow
            title={t(
              "summary",
              "patientId",
            )}
            value={
              patient?.patientId ||
              t(
                "summary",
                "unavailable",
              )
            }
            explanation={
              summaryExplanation.patientId
            }
          />

          <SummaryRow
            title={t(
              "summary",
              "complaint",
            )}
            value={
              firstPatientMessage
            }
            explanation={
              summaryExplanation.complaint
            }
          />

          {careMode === "ayush" ? (
            <>
              <SummaryRow
                title="Dashavidha Pariksha"
                value="Completed in the AYUSH history sequence"
                explanation={
                  summaryExplanation.dashavidha
                }
              />

              {AYUSH_DASHAVIDHA_KEYS.map(
                (key) => (
                  <SummaryRow
                    key={key}
                    title={key}
                    value={
                      ayushAnswers[key] ||
                      t(
                        "summary",
                        "unavailable",
                      )
                    }
                    explanation={
                      summaryExplanation[key]
                    }
                  />
                ),
              )}

              <SummaryRow
                title="Ahara-Vihara"
                value={
                  ayushAharaVihara
                }
                explanation={
                  summaryExplanation.aharaVihara
                }
              />
            </>
          ) : (
            <>
              <SummaryRow
                title={t(
                  "summary",
                  "duration",
                )}
                value={
                  durationResponse
                }
                explanation={
                  summaryExplanation.duration
                }
              />

              <SummaryRow
                title={t(
                  "summary",
                  "symptoms",
                )}
                value={
                  clinicalSummary
                    ? "See the AI-Assisted Clinical Analysis above for analyzed symptoms and associated features."
                    : t(
                        "summary",
                        "unavailable",
                      )
                }
                explanation={
                  summaryExplanation.symptoms
                }
              />
            </>
          )}

          <SummaryRow
            title={t(
              "summary",
              "history",
            )}
            value={
              otherHistory
            }
            explanation={
              summaryExplanation.history
            }
          />

          <SummaryRow
            title={t(
              "summary",
              "documents",
            )}
            value={
              completedMedicalDocuments.length
                ? `${completedMedicalDocuments.length} document${completedMedicalDocuments.length === 1 ? "" : "s"} processed`
                : t(
                    "summary",
                    "unavailable",
                  )
            }
            explanation={
              summaryExplanation.documents
            }
          />

          {medicalDocuments
            .filter((document) => document.name)
            .map((document) => (
              <SummaryRow
                key={document.id}
                title={`Document ${document.id}: ${document.name}`}
                value={
                  document.structured ||
                  (document.status === "processing"
                    ? "Processing..."
                    : document.status === "error"
                      ? document.error
                      : "No extracted information available.")
                }
                explanation={
                  document.status === "done"
                    ? summaryExplanation.ocr
                    : summaryExplanation.documents
                }
              />
            ))}

        </div>

        <div className="doctor-note">
          <ShieldCheck size={18} />

          <span>
            {t(
              "summary",
              "warning",
            )}
          </span>
        </div>

        <button
          className="primary-button full"
          onClick={() => {
            // Do not create a doctor-review record yet. The patient decides
            // whether to retain the conversation on the next step.
            setScreen("patientHandoff");
          }}
        >
          {t(
            "summary",
            "sendDoctor",
          )}

          <ArrowRight size={19} />
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — STEP 8 HANDOFF
  ========================================================= */

  if (
    screen ===
    "patientHandoff"
  ) {
    return (
      <PageShell
        language={language}
        step="PATIENT • STEP 8"
        title={t(
          "handoff",
          "title",
        )}
        onBack={() =>
          setScreen(
            "patientSummary",
          )
        }
      >

        <div className="page-icon">
          <Stethoscope size={30} />
        </div>

        <div className="information-box">

          <div className="info-row">

            <CheckCircle2 size={18} />

            <span>
              {t(
                "handoff",
                "prepared",
              )}
            </span>

          </div>

          <div className="info-row">

            <CheckCircle2 size={18} />

            <span>
              {t(
                "handoff",
                "summary",
              )}
            </span>

          </div>

          <div className="info-row">

            <CheckCircle2 size={18} />

            <span>
              {t(
                "handoff",
                "documents",
              )}
            </span>

          </div>

        </div>

        <button
          className="primary-button full"
          onClick={() =>
            setScreen(
              "patientRetention",
            )
          }
        >
          {t(
            "handoff",
            "continue",
          )}

          <ArrowRight size={19} />
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — RETENTION
  ========================================================= */

  if (
    screen ===
    "patientRetention"
  ) {
    return (
      <PageShell
        language={language}
        step="PATIENT • STEP 9"
        title={t(
          "retention",
          "title",
        )}
      >

        <div className="page-icon">
          <LockKeyhole size={30} />
        </div>

        <p className="page-description">
          {t(
            "retention",
            "description",
          )}
        </p>

        <div className="retention-options">

          <button
            className="retention-card store"
            onClick={() => {

              // Keep the current patient's doctor-review record available in
              // React memory until the website is reloaded.
              createTemporaryDoctorPatient();

              setRetentionChoice(
                "store",
              );

              setPatientBookingHospitalId(DEMO_HOSPITALS[0].id);
              setPatientBookingDoctorId(
                getRecommendedDoctor(DEMO_HOSPITALS[0].id, careMode)?.id ?? "",
              );
              setPatientBookingDate(getLocalDateString());
              setPatientBookingTimeSlot(
                APPOINTMENT_TIME_SLOTS.find((slot) => !isAppointmentSlotPast(getLocalDateString(), slot)) ??
                  APPOINTMENT_TIME_SLOTS[APPOINTMENT_TIME_SLOTS.length - 1],
              );
              setPatientBookingError("");
              setPatientAppointmentChoice(null);
              setPatientAppointmentType("offline");
              setScreen("patientAppointmentBooking");

            }}
          >

            <CheckCircle2 size={26} />

            <div>

              <strong>
                {t(
                  "retention",
                  "store",
                )}
              </strong>

              <span>
                {t(
                  "retention",
                  "storeDescription",
                )}
              </span>

            </div>

          </button>

          <button
            className="retention-card delete"
            onClick={() => {

              // "Do not retain my conversation" means this patient's
              // temporary record must not be available in Doctor Pending Reviews.
              removeTemporaryDoctorPatient();

              setRetentionChoice(
                "delete",
              );

              setScreen("complete");

            }}
          >

            <Trash2 size={26} />

            <div>

              <strong>
                {t(
                  "retention",
                  "delete",
                )}
              </strong>

              <span>
                {t(
                  "retention",
                  "deleteDescription",
                )}
              </span>

            </div>

          </button>

        </div>

        <div className="privacy-note">

          <ShieldCheck size={17} />

          <span>
            {t(
              "retention",
              "privacy",
            )}
          </span>

        </div>

      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — SELF BOOK APPOINTMENT AFTER RETENTION
  ========================================================= */

  if (screen === "patientAppointmentBooking") {
    const availableDoctors = getDoctorsForHospital(patientBookingHospitalId, careMode);
    const selectedHospital = DEMO_HOSPITALS.find((hospital) => hospital.id === patientBookingHospitalId);

    return (
      <PageShell
        language={language}
        step="PATIENT • APPOINTMENT"
        title="Appointment Booking"
        onBack={() => setScreen("patientRetention")}
      >
        <div className="information-box">
          <div className="info-row">
            <ClipboardList size={18} />
            <span>
              You chose to store your information. Would you like to book an appointment now?
            </span>
          </div>
        </div>

        <label className="field-label">Do you want to book an appointment?</label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "18px",
          }}
        >
          <button
            className="primary-button"
            onClick={() => {
              setPatientAppointmentChoice("yes");
              setPatientBookingError("");
              const recommendedDoctor = getRecommendedDoctor(patientBookingHospitalId, careMode);
              setPatientBookingDoctorId(recommendedDoctor?.id ?? "");
            }}
          >
            Yes
          </button>

          <button
            className="secondary-button"
            onClick={() => {
              setPatientAppointmentChoice("no");
              setPatientBookingError("");
              // The patient has already chosen to retain the information.
              // Show upcoming appointments first, even when they do not
              // want to book an appointment.
              setScreen("patientUpcomingAppointments");
            }}
          >
            No
          </button>
        </div>

        {patientAppointmentChoice === "yes" && (
          <>
            <div className="information-box">
              <div className="info-row">
                <CheckCircle2 size={18} />
                <span>
                  Select a hospital and doctor. Your stored clinical information will be routed only to the doctor whose appointment you book.
                </span>
              </div>
            </div>

            <label className="field-label">Hospital</label>
            <select
              className="text-input"
              value={patientBookingHospitalId}
              onChange={(event) => {
                const hospitalId = event.target.value;
                const recommendedDoctor = getRecommendedDoctor(hospitalId, careMode);
                setPatientBookingHospitalId(hospitalId);
                setPatientBookingDoctorId(recommendedDoctor?.id ?? "");
                const firstFutureSlot = APPOINTMENT_TIME_SLOTS.find(
                  (slot) => !isAppointmentSlotPast(patientBookingDate, slot) && !isSlotTaken(recommendedDoctor?.id ?? "", patientBookingDate, slot),
                );
                setPatientBookingTimeSlot(firstFutureSlot ?? APPOINTMENT_TIME_SLOTS[APPOINTMENT_TIME_SLOTS.length - 1]);
                setPatientBookingError("");
              }}
            >
              {DEMO_HOSPITALS.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
              ))}
            </select>

            <label className="field-label">AI-recommended doctor (you can change this)</label>
            <div className="information-box" style={{ marginBottom: "10px" }}>
              <div className="info-row">
                <Stethoscope size={18} />
                <span>
                  Suggested based on the health concern you described: <strong>{getRecommendedDoctor(patientBookingHospitalId, careMode)?.name ?? "General Physician"}</strong>. This is an initial suggestion, not a diagnosis. You can select another available doctor below.
                </span>
              </div>
            </div>
            <label className="field-label">Choose or change doctor</label>
            <select
              className="text-input"
              value={patientBookingDoctorId}
              onChange={(event) => {
                const doctorId = event.target.value;
                setPatientBookingDoctorId(doctorId);
                const firstFutureSlot = APPOINTMENT_TIME_SLOTS.find(
                  (slot) => !isAppointmentSlotPast(patientBookingDate, slot) && !isSlotTaken(doctorId, patientBookingDate, slot),
                );
                setPatientBookingTimeSlot(firstFutureSlot ?? APPOINTMENT_TIME_SLOTS[APPOINTMENT_TIME_SLOTS.length - 1]);
                setPatientBookingError("");
              }}
            >
              {availableDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} — {doctor.careMode === "ayush" ? "AYUSH OPD" : "Modern OPD"}
                </option>
              ))}
            </select>

            <label className="field-label" style={{ marginTop: "18px" }}>Appointment Type</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginTop: "8px",
              }}
            >
              {[
                { type: "offline" as const, icon: "🏥", title: "Offline Appointment", subtitle: "Visit the clinic" },
                { type: "online" as const, icon: "💻", title: "Online Appointment", subtitle: "Video consultation" },
              ].map((option) => {
                const slotAlreadyBooked = isSlotTaken(
                  patientBookingDoctorId,
                  patientBookingDate,
                  patientBookingTimeSlot,
                );
                const selected = patientAppointmentType === option.type;

                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => {
                      if (!slotAlreadyBooked) {
                        setPatientAppointmentType(option.type);
                        setPatientBookingError("");
                      }
                    }}
                    style={{
                      border: selected ? "2px solid #087f70" : "1px solid #c8ddd8",
                      borderRadius: "14px",
                      padding: "14px",
                      textAlign: "left",
                      background: selected ? "#eefaf7" : "#ffffff",
                      cursor: slotAlreadyBooked ? "not-allowed" : "pointer",
                      opacity: slotAlreadyBooked ? 0.75 : 1,
                    }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "6px" }}>{option.icon}</div>
                    <strong style={{ display: "block" }}>{option.title}</strong>
                    <span style={{ display: "block", marginTop: "4px", fontSize: "13px" }}>{option.subtitle}</span>
                    {slotAlreadyBooked && (
                      <span style={{ display: "block", marginTop: "8px", fontWeight: 700 }}>Booked</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="demo-note" style={{ marginTop: "10px" }}>
              The selected time slot is shared by both appointment types. Once this slot is booked, both Online and Offline options show <strong>Booked</strong> and neither type can be booked again for that doctor and time.
            </div>

            <label className="field-label" style={{ marginTop: "14px" }}>Appointment Date</label>
            <input
              className="text-input"
              type="date"
              min={getLocalDateString()}
              value={patientBookingDate}
              onChange={(event) => {
                setPatientBookingDate(event.target.value);
                setPatientBookingError("");
                if (event.target.value === getLocalDateString() && isAppointmentSlotPast(event.target.value, patientBookingTimeSlot)) {
                  const firstFuture = APPOINTMENT_TIME_SLOTS.find((slot) => !isAppointmentSlotPast(event.target.value, slot));
                  setPatientBookingTimeSlot(firstFuture ?? APPOINTMENT_TIME_SLOTS[APPOINTMENT_TIME_SLOTS.length - 1]);
                }
              }}
            />

            <label className="field-label" style={{ marginTop: "14px" }}>Appointment Time Slot (10 minutes)</label>
            <select
              className="text-input"
              value={patientBookingTimeSlot}
              onChange={(event) => {
                setPatientBookingTimeSlot(event.target.value);
                setPatientBookingError("");
              }}
            >
              {APPOINTMENT_TIME_SLOTS.map((slot) => {
                const past = isAppointmentSlotPast(patientBookingDate, slot);
                const taken = isSlotTaken(patientBookingDoctorId, patientBookingDate, slot);
                return (
                  <option key={slot} value={slot} disabled={past || taken}>
                    {slot}{past ? " — Past" : taken ? " — Booked" : ""}
                  </option>
                );
              })}
            </select>

            <div className="demo-note" style={{ marginTop: "14px" }}>
              {selectedHospital?.name} • {careMode === "ayush"
                ? "AYUSH mode: only Ayurvedic OPD doctors are shown."
                : "Modern mode: only Modern OPD doctors are shown."}
              <br />
              Slots are 10 minutes each from 9:00 AM to 1:00 AM. Today's past slots are disabled using the device's real-time clock.
            </div>

            {patientBookingError && (
              <div className="otp-error" style={{ marginTop: "14px" }}>{patientBookingError}</div>
            )}

            <button className="primary-button full" onClick={bookPatientAppointment} style={{ marginTop: "18px" }}>
              Book Appointment <CheckCircle2 size={17} />
            </button>
          </>
        )}
      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — UPCOMING APPOINTMENTS
  ========================================================= */

  if (screen === "patientUpcomingAppointments") {
    const patientAppointments = allKnownAppointmentBookings
      .filter((booking) => booking.patientId === patient?.patientId)
      .filter((booking) => isAppointmentActive(booking, new Date(appointmentClock)))
      .sort((a, b) => {
        const aStart = parseAppointmentDateTime(a.appointmentDate, a.timeSlot)?.getTime() ?? 0;
        const bStart = parseAppointmentDateTime(b.appointmentDate, b.timeSlot)?.getTime() ?? 0;
        return aStart - bStart;
      });

    const now = new Date(appointmentClock);
    const joinAppointment = (booking: AppointmentBooking) => {
      const start = parseAppointmentDateTime(booking.appointmentDate, booking.timeSlot);
      const end = start ? new Date(start.getTime() + 10 * 60 * 1000) : null;
      if (!start || !end || now < start || now >= end) {
        setPatientBookingError("The video call becomes available when the appointment time starts.");
        return;
      }
      if (!booking.videoRoomId) {
        setPatientBookingError("The video room is not available for this appointment yet.");
        return;
      }
      setPatientBookingError("");
      setVideoCallRoom(booking.videoRoomId);
      setVideoCallDisplayName(patient?.name || "Patient");
      setSelectedOnlineBooking(booking);
      setScreen("videoCall");
    };

    return (
      <PageShell
        language={language}
        step="PATIENT • UPCOMING APPOINTMENTS"
        title="Upcoming Appointments"
        onBack={() => setScreen("patientAppointmentBooking")}
      >
        <div className="information-box">
          <div className="info-row">
            <ClipboardList size={18} />
            <span>Your appointments are listed here. Online video calls do not open when you book; the Join Video Call button becomes available only when the appointment time starts.</span>
          </div>
        </div>

        {patientAppointments.length === 0 ? (
          <div className="summary-card" style={{ marginTop: "16px" }}>
            <strong>No upcoming appointments.</strong>
            <p className="page-description" style={{ marginBottom: 0 }}>Book an appointment to see it here.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
            {patientAppointments.map((booking) => {
              const start = parseAppointmentDateTime(booking.appointmentDate, booking.timeSlot);
              const end = start ? new Date(start.getTime() + 10 * 60 * 1000) : null;
              const isStarted = !!start && now >= start && !!end && now < end;
              const appointmentEnded = !!end && now >= end;
              return (
                <div key={`${booking.doctorId}-${booking.appointmentDate}-${booking.timeSlot}`} className="summary-card">
                  <SummaryRow title="Doctor" value={booking.doctorName} />
                  <SummaryRow title="Hospital" value={booking.hospitalName} />
                  <SummaryRow title="Date" value={booking.appointmentDate} />
                  <SummaryRow title="Time" value={booking.timeSlot} />
                  <SummaryRow title="Appointment Type" value={booking.appointmentType === "online" ? "Online Appointment" : "Offline Appointment"} />

                  {booking.appointmentType === "online" ? (
                    <button
                      className="primary-button full"
                      style={{ marginTop: "14px" }}
                      disabled={!isStarted || appointmentEnded}
                      onClick={() => joinAppointment(booking)}
                    >
                      {isStarted ? "Join Video Call" : "Join Video Call — Available at appointment time"}
                      <ArrowRight size={17} />
                    </button>
                  ) : (
                    <div className="demo-note" style={{ marginTop: "14px" }}>Offline appointment — please visit the selected hospital at the scheduled time.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {patientBookingError && <div className="otp-error" style={{ marginTop: "14px" }}>{patientBookingError}</div>}

        <button
          type="button"
          className="secondary-button full"
          style={{ marginTop: "22px" }}
          onClick={() => {
            setPatientBookingError("");
            setScreen("patientConsent");
          }}
        >
          Skip
          <ArrowRight size={17} />
        </button>
      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — UPCOMING APPOINTMENTS AFTER EMERGENCY CHECK
  ========================================================= */

  if (screen === "patientMedicineOrder") {
    const filteredMedicines = MEDICINE_CATALOG
      .filter((medicine) => medicine.toLowerCase().includes(medicineSearch.trim().toLowerCase()))
      .slice(0, 4);

    const addMedicine = (medicine: string) => {
      setMedicineCart((current) => ({ ...current, [medicine]: (current[medicine] || 0) + 1 }));
    };

    return (
      <PageShell
        language={language}
        step="PATIENT • MEDICINE ORDER"
        title="Order Medicines"
        onBack={() => setScreen("patientEmergency")}
      >
        <div className="medicine-order-top-actions">
          <button type="button" className="secondary-button medicine-view-orders-button" onClick={() => { setMedicineOrderClock(Date.now()); setScreen("patientMedicineOrders"); }}>
            <ClipboardList size={17} /> View Orders ({medicineOrders.length})
          </button>
        </div>
        <div className="page-icon"><ShoppingCart size={30} /></div>
        <p className="page-description">Do you want to order medicines for delivery?</p>

        <div className="choice-grid">
          <button type="button" className="role-card" onClick={() => { setMedicineOrderStarted(true); setMedicineSearch(""); }}>
            <ShoppingCart size={34} />
            <strong>Yes, order medicines</strong>
            <span>Search and add medicines to your cart</span>
          </button>
          <button type="button" className="role-card" onClick={() => setScreen("patientUpcomingAppointmentsAfterEmergency")}>
            <CheckCircle2 size={34} />
            <strong>No, continue normally</strong>
            <span>Continue to your normal workflow</span>
          </button>
        </div>

        {medicineOrderStarted && <div style={{ marginTop: "18px" }}>
          <label className="field-label" style={{ display: "block" }}>Search Medicines</label>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: "12px", top: "14px" }} />
            <input
              className="text-input"
              style={{ paddingLeft: "40px" }}
              value={medicineSearch}
              onChange={(e) => setMedicineSearch(e.target.value)}
              placeholder="Search from 50 medicines"
            />
          </div>

          <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
            {filteredMedicines.map((medicine) => (
              <div className="summary-card" key={medicine} style={{ padding: "12px 14px" }}>
                <strong>{medicine}</strong>
                <div style={{ marginTop: "9px" }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => addMedicine(medicine)}
                    style={{ padding: "8px 12px" }}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>}

        {medicineOrderStarted && <button
          type="button"
          className="primary-button full"
          style={{ marginTop: "20px" }}
          onClick={() => setScreen("patientMedicineCart")}
        >
          View Cart ({Object.values(medicineCart).reduce((sum, quantity) => sum + quantity, 0)})
          <ShoppingCart size={17} />
        </button>}
      </PageShell>
    );
  }

  if (screen === "patientMedicineCart") {
    const cartItems = Object.entries(medicineCart).filter(([, quantity]) => quantity > 0);
    return (
      <PageShell
        language={language}
        step="PATIENT • MEDICINE CART"
        title="Medicine Cart"
        onBack={() => setScreen("patientMedicineOrder")}
      >
        <div className="page-icon"><ShoppingCart size={30} /></div>
        {cartItems.length === 0 ? (
          <div className="summary-card">
            <strong>Your cart is empty.</strong>
            <p className="page-description" style={{ marginBottom: 0 }}>Go back and add medicines to your cart.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
            {cartItems.map(([medicine, quantity]) => (
              <div className="summary-card" key={medicine}>
                <strong>{medicine}</strong>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                  <button type="button" className="secondary-button" style={{ padding: "7px 10px" }} onClick={() => setMedicineCart((current) => {
                    const next = { ...current };
                    if (next[medicine] <= 1) delete next[medicine]; else next[medicine] -= 1;
                    return next;
                  })}><Minus size={15} /></button>
                  <strong>Quantity: {quantity}</strong>
                  <button type="button" className="secondary-button" style={{ padding: "7px 10px" }} onClick={() => setMedicineCart((current) => ({ ...current, [medicine]: (current[medicine] || 0) + 1 }))}><Plus size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="primary-button full"
          style={{ marginTop: "20px" }}
          disabled={cartItems.length === 0}
          onClick={() => { setMedicineOrderError(""); setScreen("patientMedicineAddress"); }}
        >
          Add Address <ArrowRight size={17} />
        </button>
      </PageShell>
    );
  }

  if (screen === "patientMedicineAddress") {
    return (
      <PageShell
        language={language}
        step="PATIENT • MEDICINE ORDER"
        title="Delivery Address"
        onBack={() => setScreen("patientMedicineCart")}
      >
        <div className="page-icon"><ClipboardList size={30} /></div>
        <p className="page-description">Enter the address where your medicines should be delivered.</p>

        <label className="field-label" style={{ marginTop: "14px", display: "block" }}>Address Line 1</label>
        <input className="text-input" value={medicineOrderAddress.addressLine1} onChange={(e) => setMedicineOrderAddress((current) => ({ ...current, addressLine1: e.target.value }))} placeholder="House / flat / street" />
        <label className="field-label" style={{ marginTop: "12px", display: "block" }}>Address Line 2</label>
        <input className="text-input" value={medicineOrderAddress.addressLine2} onChange={(e) => setMedicineOrderAddress((current) => ({ ...current, addressLine2: e.target.value }))} placeholder="Area / landmark" />
        <label className="field-label" style={{ marginTop: "12px", display: "block" }}>Pin Code</label>
        <input
          className="text-input"
          inputMode="numeric"
          maxLength={6}
          value={medicineOrderAddress.pinCode}
          onChange={(e) => setMedicineOrderAddress((current) => ({ ...current, pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
          placeholder="6-digit PIN code"
        />
        <label className="field-label" style={{ marginTop: "12px", display: "block" }}>City</label>
        <input className="text-input" value={medicineOrderAddress.city} onChange={(e) => setMedicineOrderAddress((current) => ({ ...current, city: e.target.value }))} placeholder="City" />

        {medicineOrderError && <div className="otp-error" style={{ marginTop: "12px" }}>{medicineOrderError}</div>}

        <button
          type="button"
          className="primary-button full"
          style={{ marginTop: "18px" }}
          onClick={() => {
            const items = Object.entries(medicineCart)
              .filter(([, quantity]) => quantity > 0)
              .map(([medicine, quantity]) => ({ medicine, quantity }));
            if (!items.length) {
              setMedicineOrderError("Please add at least one medicine before confirming your order.");
              return;
            }
            if (!medicineOrderAddress.addressLine1.trim() || !medicineOrderAddress.addressLine2.trim() || !/^\d{6}$/.test(medicineOrderAddress.pinCode) || !medicineOrderAddress.city.trim()) {
              setMedicineOrderError("Please enter both address lines, a valid 6-digit PIN code, and city.");
              return;
            }
            const bookedAt = Date.now();
            setMedicineOrders((current) => [{
              id: `MED-${bookedAt}`,
              items,
              address: { ...medicineOrderAddress },
              bookedAt,
            }, ...current]);
            setMedicineOrderClock(bookedAt);
            setMedicineOrderError("");
            setScreen("patientMedicineOrders");
          }}
        >
          Confirm Order <CheckCircle2 size={17} />
        </button>
      </PageShell>
    );
  }

  if (screen === "patientMedicineOrders") {
    const deliveryWindowMs = 30 * 60 * 1000;
    return (
      <PageShell
        language={language}
        step="PATIENT • MEDICINE ORDERS"
        title="View Orders"
        onBack={() => setScreen("patientMedicineOrder")}
      >
        <div className="medicine-orders-heading">
          <div className="page-icon"><ClipboardList size={30} /></div>
          <p className="page-description">Your medicine orders and estimated delivery status.</p>
        </div>
        {medicineOrders.length === 0 ? (
          <div className="summary-card medicine-empty-orders">
            <strong>No orders yet</strong>
            <p className="page-description" style={{ marginBottom: 0 }}>Your confirmed medicine orders will appear here.</p>
            <button type="button" className="primary-button" style={{ marginTop: "16px" }} onClick={() => setScreen("patientMedicineOrder")}>Order Medicines <ArrowRight size={17} /></button>
          </div>
        ) : (
          <div className="medicine-orders-list">
            {medicineOrders.map((order) => {
              const elapsed = Math.max(0, medicineOrderClock - order.bookedAt);
              const remaining = Math.max(0, deliveryWindowMs - elapsed);
              const delivered = elapsed >= deliveryWindowMs;
              const timeText = new Date(order.bookedAt).toLocaleString([], {
                year: "numeric", month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              });
              return (
                <article className="summary-card medicine-order-card" key={order.id}>
                  <div className="medicine-order-card-head">
                    <strong>Medicine Order</strong>
                    <span className="medicine-order-id">{order.id}</span>
                  </div>
                  <p className="medicine-order-booked-at">Booked on: {timeText}</p>
                  <div className="medicine-order-items">
                    {order.items.map((item) => (
                      <div className="medicine-order-item" key={`${order.id}-${item.medicine}`}>
                        <span>{item.medicine}</span><strong>Qty: {item.quantity}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="medicine-order-delivery-address">
                    <strong>Delivery address</strong>
                    <span>{order.address.addressLine1}, {order.address.addressLine2}, {order.address.city} – {order.address.pinCode}</span>
                  </div>
                  <div className={`medicine-order-status ${delivered ? "is-delivered" : "is-coming"}`} aria-live="polite">
                    {delivered ? <CheckCircle2 size={18} /> : <ShoppingCart size={18} />}
                    <div>
                      <strong>{delivered ? "Delivered" : "Coming in"}</strong>
                      {!delivered && <span>{`${String(Math.floor(remaining / 60000)).padStart(2, "0")}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`}</span>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <button type="button" className="primary-button full" style={{ marginTop: "18px" }} onClick={() => setScreen("patientMedicineOrder")}>
          Order More Medicines <ArrowRight size={17} />
        </button>
      </PageShell>
    );
  }

  if (screen === "patientUpcomingAppointmentsAfterEmergency") {
    const patientAppointments = allKnownAppointmentBookings
      .filter((booking) => booking.patientId === patient?.patientId)
      .filter((booking) => isAppointmentActive(booking, new Date(appointmentClock)))
      .sort((a, b) => {
        const aStart = parseAppointmentDateTime(a.appointmentDate, a.timeSlot)?.getTime() ?? 0;
        const bStart = parseAppointmentDateTime(b.appointmentDate, b.timeSlot)?.getTime() ?? 0;
        return aStart - bStart;
      });

    const now = new Date(appointmentClock);
    const joinAppointment = (booking: AppointmentBooking) => {
      const start = parseAppointmentDateTime(booking.appointmentDate, booking.timeSlot);
      const end = start ? new Date(start.getTime() + 10 * 60 * 1000) : null;
      if (!start || !end || now < start || now >= end) {
        setPatientBookingError("The video call becomes available when the appointment time starts.");
        return;
      }
      if (!booking.videoRoomId) {
        setPatientBookingError("The video room is not available for this appointment yet.");
        return;
      }
      setPatientBookingError("");
      setVideoCallRoom(booking.videoRoomId);
      setVideoCallDisplayName(patient?.name || "Patient");
      setSelectedOnlineBooking(booking);
      setScreen("videoCall");
    };

    return (
      <PageShell
        language={language}
        step="PATIENT • UPCOMING APPOINTMENTS"
        title="Upcoming Appointments"
        onBack={() => setScreen("patientEmergency")}
      >
        <div className="information-box">
          <div className="info-row">
            <ClipboardList size={18} />
            <span>Your appointments are listed here. Online video calls do not open when you book; the Join Video Call button becomes available only when the appointment time starts.</span>
          </div>
        </div>

        {patientAppointments.length === 0 ? (
          <div className="summary-card" style={{ marginTop: "16px" }}>
            <strong>No upcoming appointments.</strong>
            <p className="page-description" style={{ marginBottom: 0 }}>Book an appointment to see it here.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
            {patientAppointments.map((booking) => {
              const start = parseAppointmentDateTime(booking.appointmentDate, booking.timeSlot);
              const end = start ? new Date(start.getTime() + 10 * 60 * 1000) : null;
              const isStarted = !!start && now >= start && !!end && now < end;
              const appointmentEnded = !!end && now >= end;
              return (
                <div key={`${booking.doctorId}-${booking.appointmentDate}-${booking.timeSlot}`} className="summary-card">
                  <SummaryRow title="Doctor" value={booking.doctorName} />
                  <SummaryRow title="Hospital" value={booking.hospitalName} />
                  <SummaryRow title="Date" value={booking.appointmentDate} />
                  <SummaryRow title="Time" value={booking.timeSlot} />
                  <SummaryRow title="Appointment Type" value={booking.appointmentType === "online" ? "Online Appointment" : "Offline Appointment"} />

                  {booking.appointmentType === "online" ? (
                    <button
                      className="primary-button full"
                      style={{ marginTop: "14px" }}
                      disabled={!isStarted || appointmentEnded}
                      onClick={() => joinAppointment(booking)}
                    >
                      {isStarted ? "Join Video Call" : "Join Video Call — Available at appointment time"}
                      <ArrowRight size={17} />
                    </button>
                  ) : (
                    <div className="demo-note" style={{ marginTop: "14px" }}>Offline appointment — please visit the selected hospital at the scheduled time.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {patientBookingError && <div className="otp-error" style={{ marginTop: "14px" }}>{patientBookingError}</div>}

        <button
          type="button"
          className="secondary-button full"
          style={{ marginTop: "22px" }}
          onClick={() => {
            setPatientBookingError("");
            setScreen("patientConsent");
          }}
        >
          Skip
          <ArrowRight size={17} />
        </button>
      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — PRESCRIPTION AFTER ONLINE CONSULTATION
  ========================================================= */

  if (screen === "patientPrescription") {
    const booking = selectedOnlineBooking;
    return (
      <PageShell language={language} step="PATIENT • PRESCRIPTION" title="Prescription" onBack={() => setScreen("complete")}>
        <div className="page-icon"><FileText size={30} /></div>
        <p className="page-description">Your doctor has completed the online consultation and provided the following prescription.</p>
        <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
          {patientPrescriptionSource.map((item, index) => (
            <div className="summary-card" key={`${item.medicine}-${index}`}>
              <SummaryRow title="Medicine" value={item.medicine} />
              <SummaryRow title="Dosage" value={item.dosage || "Not specified"} />
              <SummaryRow title="Frequency" value={item.frequency || "Not specified"} />
              <SummaryRow title="Duration" value={item.duration || "Not specified"} />
              {item.instructions ? <SummaryRow title="Instructions" value={item.instructions} /> : null}
            </div>
          ))}
        </div>
        {patientPrescriptionLoading && <div className="demo-note" style={{ marginTop: "12px" }}>Loading prescription…</div>}
        <button type="button" className="primary-button full" style={{ marginTop: "18px" }} onClick={() => { setOrderError(""); setScreen("patientOrderAddress"); }}>Order <ArrowRight size={17} /></button>
      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — PRESCRIPTION ORDER ADDRESS
  ========================================================= */

  if (screen === "patientOrderAddress") {
    return (
      <PageShell language={language} step="PATIENT • ORDER" title="Delivery Address" onBack={() => setScreen("patientPrescription")}>
        <div className="page-icon"><ClipboardList size={30} /></div>
        <p className="page-description">Enter the delivery address for your prescribed medicines.</p>
        <label className="field-label" style={{ marginTop: "14px", display: "block" }}>Address Line 1</label>
        <input className="text-input" value={orderAddress.addressLine1} onChange={(e) => setOrderAddress(c => ({ ...c, addressLine1: e.target.value }))} placeholder="House / flat / street" />
        <label className="field-label" style={{ marginTop: "12px", display: "block" }}>Address Line 2</label>
        <input className="text-input" value={orderAddress.addressLine2} onChange={(e) => setOrderAddress(c => ({ ...c, addressLine2: e.target.value }))} placeholder="Area / landmark" />
        <label className="field-label" style={{ marginTop: "12px", display: "block" }}>Pin Code</label>
        <input className="text-input" inputMode="numeric" maxLength={6} value={orderAddress.pinCode} onChange={(e) => setOrderAddress(c => ({ ...c, pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="6-digit PIN code" />
        <label className="field-label" style={{ marginTop: "12px", display: "block" }}>City</label>
        <input className="text-input" value={orderAddress.city} onChange={(e) => setOrderAddress(c => ({ ...c, city: e.target.value }))} placeholder="City" />
        {orderError && <div className="otp-error" style={{ marginTop: "12px" }}>{orderError}</div>}
        <button type="button" className="primary-button full" style={{ marginTop: "18px" }} onClick={() => {
          if (!orderAddress.addressLine1.trim() || !orderAddress.addressLine2.trim() || !/^\d{6}$/.test(orderAddress.pinCode) || !orderAddress.city.trim()) { setOrderError("Please enter both address lines, a valid 6-digit pin code, and city."); return; }
          setOrderError("");
          setPrescriptionOrderConfirmed(true);
          setScreen("patientInformationRetained");
        }}>Confirm Order <CheckCircle2 size={17} /></button>
      </PageShell>
    );
  }

  /* =========================================================
     PATIENT — INFORMATION RETAINED
  ========================================================= */

  if (screen === "patientInformationRetained") {
    return (
      <PageShell
        language={language}
        step="PATIENT • INFORMATION RETAINED"
        title="Information Retained"
      >
        <div className="page-icon">
          <ShieldCheck size={30} />
        </div>

        <div className="information-box">
          <div className="info-row">
            <CheckCircle2 size={18} />
            <span>{prescriptionOrderConfirmed ? "Your prescription order has been confirmed, and your permitted clinical information has been retained according to your selected workflow." : "Your appointment choice was recorded. No appointment was booked, and your permitted clinical information has been retained according to your selected workflow."}</span>
          </div>
          <div className="info-row">
            <CheckCircle2 size={18} />
            <span>{prescriptionOrderConfirmed ? "Your prescription order has been recorded successfully." : "You can finish this session now. No video call has been opened."}</span>
          </div>
        </div>

        <div className="summary-card" style={{ marginTop: "16px" }}>
          <strong>Information retained successfully.</strong>
          <p className="page-description" style={{ marginBottom: 0 }}>Your retained information remains available to the authorized workflow.</p>
        </div>

        <button
          type="button"
          className="primary-button full"
          style={{ marginTop: "18px" }}
          onClick={() => setScreen("complete")}
        >
          Finish
          <CheckCircle2 size={17} />
        </button>
      </PageShell>
    );
  }

  /* =========================================================
     ONLINE VIDEO CALL — PATIENT OR DOCTOR
  ========================================================= */

  if (screen === "videoCall") {
    return (
      <PageShell language={language} step="AAYUVORA • ONLINE CONSULTATION" title="Online Video Consultation" onBack={() => setScreen(role === "doctor" ? "doctorPendingReviews" : "complete")}>
        <div className="information-box" style={{ marginBottom: "14px" }}><div className="info-row"><Monitor size={18} /><span>You are joining the appointment-specific video room. The patient mobile and doctor laptop must use this same room.</span></div></div>
        <div style={{ width: "100%", height: "70vh", minHeight: "520px", borderRadius: "16px", overflow: "hidden", border: "1px solid #c8ddd8", background: "#111" }}>
          <JitsiCallPanel
            roomName={videoCallRoom}
            displayName={videoCallDisplayName || "Aayuvora participant"}
            onConferenceLeft={async () => {
              if (role !== "patient" || !selectedOnlineBooking) return;
              const prescriptions = await loadPatientPrescription(selectedOnlineBooking);
              if (prescriptions.length > 0) {
                setPatientPrescriptionSource(prescriptions);
                setPatientPrescriptionLoading(false);
                setScreen("patientPrescription");
              } else {
                setScreen("complete");
              }
            }}
          />
        </div>
        <div className="demo-note" style={{ marginTop: "12px" }}>Participant: <strong>{videoCallDisplayName || "Aayuvora participant"}</strong> • Room: <strong>{videoCallRoom}</strong></div>
        <button
          className="primary-button full"
          onClick={() => {
            const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(videoCallRoom)}`;
            window.open(jitsiUrl, "_blank", "noopener,noreferrer");
          }}
          style={{ marginTop: "14px" }}
          disabled={!videoCallRoom}
        >
          Open Video Call in New Tab <ArrowRight size={17} />
        </button>
        <button className="secondary-button full" onClick={() => setScreen(role === "doctor" ? "doctorPendingReviews" : "complete")} style={{ marginTop: "10px" }}>Leave Video Call</button>
      </PageShell>
    );
  }

  /* =========================================================
     DOCTOR — LOGIN
  ========================================================= */

  if (
    screen ===
    "doctorLogin"
  ) {
    return (
      <PageShell
        language={language}
        step="DOCTOR • STEP 3"
        title={t(
          "doctor",
          "login",
        )}
        onBack={() =>
          setScreen("role")
        }
      >

        <div className="page-icon">
          <Stethoscope size={30} />
        </div>

        <p className="page-description">
          {t(
            "doctor",
            "loginDescription",
          )}
        </p>

        <label>Hospital</label>
        <select className="text-input" value={selectedDoctorHospitalId} onChange={(event) => { setSelectedDoctorHospitalId(event.target.value); setUsername(""); setPassword(""); setLoginError(""); }}>
          {DEMO_HOSPITALS.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}
        </select>

        <label>
          {t(
            "doctor",
            "username",
          )}
        </label>

        <input
          className="text-input"
          value={username}
          onChange={(event) => {
            setUsername(
              event.target.value,
            );
            setLoginError("");
          }}
          placeholder={
            demoDoctor.username
          }
        />

        <label>
          {t(
            "doctor",
            "password",
          )}
        </label>

        <input
          className="text-input"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(
              event.target.value,
            );
            setLoginError("");
          }}
          placeholder="Enter password"
        />

        {loginError && (
          <div className="login-error">
            <XCircle size={19} />

            <span>
              {loginError}
            </span>
          </div>
        )}

        <div className="demo-credentials">
          <strong>5 demo doctors for this hospital</strong>
          {DEMO_DOCTORS.filter((doctor) => doctor.hospitalId === selectedDoctorHospitalId).map((doctor) => (
            <p key={doctor.id}><b>{doctor.name}</b> — ID: {doctor.username} — Password: {doctor.password}</p>
          ))}
        </div>

        <button
          className="primary-button full"
          onClick={verifyDoctor}
        >
          Login

          <ArrowRight size={19} />
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     DOCTOR — QUEUE
  ========================================================= */

  if (
    screen ===
    "doctorQueue"
  ) {
    return (
      <PageShell
        language={language}
        step="DOCTOR • STEP 4"
        title={t(
          "doctor",
          "queue",
        )}
      >

        <div className="demo-banner">
          <strong>{DEMO_HOSPITALS.find((hospital) => hospital.id === selectedDoctorHospitalId)?.name}</strong>
          <span>{DEMO_DOCTORS.find((doctor) => doctor.id === loggedInDoctorId)?.name} • {doctorMode === "ayush" ? "Ayurvedic OPD" : "Modern OPD"}</span>
        </div>

        <div className="dashboard-stat-grid">

          <StatCard
            icon={<Users size={22} />}
            title={t(
              "doctor",
              "today",
            )}
            value="24"
          />

          <StatCard
            icon={
              <ClipboardList size={22} />
            }
            title={t(
              "doctor",
              "pending",
            )}
            value={String(7 + temporaryDoctorPatients.filter((record) => record.careMode === doctorMode && allKnownAppointmentBookings.some((booking) => booking.patientId === record.patientId && booking.hospitalId === selectedDoctorHospitalId && booking.doctorId === loggedInDoctorId && isAppointmentActive(booking))).length + sharedAppointmentBookings.filter((booking) => booking.appointmentType === "online" && booking.doctorId === loggedInDoctorId && booking.hospitalId === selectedDoctorHospitalId && booking.careMode === doctorMode && isAppointmentActive(booking) && !temporaryDoctorPatients.some((record) => record.patientId === booking.patientId)).length)}
            onClick={() => setScreen("doctorPendingReviews")}
          />

        </div>

        <div className="doctor-note doctor-queue-note">
          <ClipboardList size={18} />
          <span>
            Click the Pending Reviews box to view the 7 demo patients for this OPD and any newly booked appointment routed only to this doctor. New booked appointments show their Online or Offline appointment type. Online appointments can later be connected to the video consultation flow.
          </span>
        </div>

        <button
          className="secondary-button full"
          onClick={resetApp}
        >
          <LogOut size={17} />

          Logout
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     DOCTOR — PENDING REVIEWS
  ========================================================= */

  if (
    screen ===
    "doctorPendingReviews"
  ) {
    return (
      <PageShell
        language={language}
        step="DOCTOR • STEP 4"
        title={t("doctor", "pending")}
      >

        {doctorEmergencyRequests.length > 0 && (
          <div className="information-box emergency-dashboard-banner" style={{ marginBottom: "16px", border: "2px solid #b42318" }}>
            <div className="info-row" style={{ alignItems: "flex-start" }}><HeartPulse size={20} /><div style={{ flex: 1 }}><strong>EMERGENCY APPOINTMENT</strong>
              {doctorEmergencyRequests.map((request) => (
                <div key={request.emergencyId} style={{ marginTop: "8px" }}><div><strong>{request.patientName}</strong> needs an immediate video consultation.</div>
                  <button className="primary-button" style={{ marginTop: "8px" }} onClick={async () => {
                    const url = request.videoUrl || (request.videoRoomId ? `https://meet.jit.si/${encodeURIComponent(request.videoRoomId)}` : "");
                    if (url) window.open(url, "_blank");
                    try { await fetch(`${API_BASE_URL}/api/emergency/${encodeURIComponent(request.emergencyId)}/connect`, { method: "POST" }); } catch {}
                    setDoctorEmergencyRequests((previous) => previous.filter((item) => item.emergencyId !== request.emergencyId));
                  }}>Connect to Emergency Call <ArrowRight size={15} /></button>
                </div>
              ))}
            </div></div>
          </div>
        )}

        <div className="pending-reviews-page-heading">
          <button
            className="secondary-button pending-back-button"
            onClick={() => setScreen("doctorQueue")}
          >
            <ArrowLeft size={17} />
            Back
          </button>

          <span className="pending-review-count">
            {String(7 + temporaryDoctorPatients.filter((record) => record.careMode === doctorMode && allKnownAppointmentBookings.some((booking) => booking.patientId === record.patientId && booking.hospitalId === selectedDoctorHospitalId && booking.doctorId === loggedInDoctorId && isAppointmentActive(booking))).length + sharedAppointmentBookings.filter((booking) => booking.appointmentType === "online" && booking.doctorId === loggedInDoctorId && booking.hospitalId === selectedDoctorHospitalId && booking.careMode === doctorMode && isAppointmentActive(booking) && !temporaryDoctorPatients.some((record) => record.patientId === booking.patientId)).length)} Pending Reviews
          </span>
        </div>

        <div className="pending-reviews-table-wrap" style={{ overflowX: "auto", margin: "16px 0" }}>
          <table className="active-sessions-table" style={{ width: "100%", textAlign: "left" }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px" }}>Name</th>
                <th style={{ padding: "12px 16px" }}>Chief Complaint</th>
                <th style={{ padding: "12px 16px" }}>Appointment Type</th>
                <th style={{ padding: "12px 16px" }}>Access</th>
              </tr>
            </thead>
            <tbody>
              {doctorMode === "ayush" ? (
                demoAyushPendingReviews.map((review) => {
                  const originalIndex = demoAyushPendingReviews.findIndex((item) => item.patientId === review.patientId);
                  return (
                  <tr key={review.patientId}>
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      <strong>{review.name}</strong>
                      <div style={{ marginTop: "8px" }}>
                        <button
                          className="primary-button"
                          onClick={() => {
                            setSelectedDoctorPatient("demo");
                            setSelectedDemoReviewIndex(originalIndex);
                            openOtpAuthorization();
                          }}
                        >
                          {t("doctor", "open")} <ArrowRight size={15} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      {review.complaint}
                    </td>
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      <span className="demo-note">Offline Appointment</span>
                    </td>
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      <span className="demo-note">Demo patient • OTP protected</span>
                    </td>
                  </tr>
                  );
                })
              ) : (
                demoPendingReviews.map((review) => {
                  const originalIndex = demoPendingReviews.findIndex((item) => item.patientId === review.patientId);
                  return (
                  <tr key={review.patientId}>
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      <strong>{review.name}</strong>
                      <div style={{ marginTop: "8px" }}>
                        <button
                          className="primary-button"
                          onClick={() => {
                            setSelectedDoctorPatient("demo");
                            setSelectedDemoReviewIndex(originalIndex);
                            openOtpAuthorization();
                          }}
                        >
                          {t("doctor", "open")} <ArrowRight size={15} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      {review.complaint}
                    </td>
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      <span className="demo-note">Offline Appointment</span>
                    </td>
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      <span className="demo-note">Demo patient • OTP protected</span>
                    </td>
                  </tr>
                  );
                })
              )}

              {temporaryDoctorPatients
                .map((temporaryPatient, index) => ({ temporaryPatient, index }))
                .filter(
                  ({ temporaryPatient }) =>
                    temporaryPatient.careMode === doctorMode &&
                    appointmentBookings.some((booking) =>
                      booking.patientId === temporaryPatient.patientId &&
                      booking.hospitalId === selectedDoctorHospitalId &&
                      booking.doctorId === loggedInDoctorId &&
                      booking.careMode === doctorMode &&
                      isAppointmentActive(booking)
                    ),
                )
                .map(({ temporaryPatient, index }) => (
                <tr key={`${temporaryPatient.patientId}-${index}`}>
                  <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                    <strong>{temporaryPatient.name}</strong>
                    <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {appointmentBookings.find((booking) => booking.patientId === temporaryPatient.patientId && booking.doctorId === loggedInDoctorId)?.appointmentType === "online" && (
                        <button
                          className="primary-button"
                          onClick={() => {
                            const booking = appointmentBookings.find((item) => item.patientId === temporaryPatient.patientId && item.doctorId === loggedInDoctorId);
                            if (booking) openDoctorSplitCall(booking, temporaryPatient);
                          }}
                        >
                          Join Video Call <ArrowRight size={15} />
                        </button>
                      )}
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setSelectedDoctorPatient("temporary");
                          setSelectedTemporaryPatientIndex(index);
                          openOtpAuthorization();
                        }}
                      >
                        Generate OTP <ArrowRight size={15} />
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                    {temporaryPatient.complaint}
                  </td>
                  <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                    <span className="demo-note">{appointmentBookings.find((booking) => booking.patientId === temporaryPatient.patientId && booking.doctorId === loggedInDoctorId)?.appointmentType === "online" ? "Online Appointment" : "Offline Appointment"}</span>
                  </td>
                  <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                    <span className="demo-note">Booked for this doctor • Twilio OTP</span>
                  </td>
                </tr>
              ))}
              {sharedAppointmentBookings.filter((booking) => booking.appointmentType === "online" && booking.doctorId === loggedInDoctorId && booking.hospitalId === selectedDoctorHospitalId && booking.careMode === doctorMode && isAppointmentActive(booking) && !temporaryDoctorPatients.some((patientRecord) => patientRecord.patientId === booking.patientId)).map((booking) => (
                <tr key={`online-${booking.patientId}-${booking.appointmentDate}-${booking.timeSlot}`}>
                  <td style={{ padding: "12px 16px", verticalAlign: "top" }}><strong>{booking.patientName || booking.patientId}</strong><div style={{ marginTop: "8px" }}><button className="primary-button" onClick={() => openDoctorSplitCall(booking)}>Join Video Call <ArrowRight size={15} /></button></div></td>
                  <td style={{ padding: "12px 16px", verticalAlign: "top" }}>Online consultation</td>
                  <td style={{ padding: "12px 16px", verticalAlign: "top" }}><span className="demo-note">Online Appointment</span></td>
                  <td style={{ padding: "12px 16px", verticalAlign: "top" }}><span className="demo-note">Shared appointment • Video room ready</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {doctorMode === "ayush" && (
          <div className="doctor-note">
            <Activity size={18} />
            <span>
              AYUSH OPD demo: the patient record includes Dashavidha Pariksha and Ahara-Vihara history for doctor review.
            </span>
          </div>
        )}

      </PageShell>
    );
  }

  /* =========================================================
     DOCTOR — ONLINE CONSULTATION + OTP
  ========================================================= */

  if (screen === "doctorOnlineConsultation") {
    const booking = selectedOnlineBooking;
    const isTemporaryRecord = selectedDoctorPatient === "temporary";
    const selectedTemporary = temporaryDoctorPatients[selectedTemporaryPatientIndex];
    const selectedDemo = doctorMode === "ayush"
      ? demoAyushPendingReviews[selectedDemoReviewIndex]
      : demoPendingReviews[selectedDemoReviewIndex];

    const patientName = booking?.patientName || selectedTemporary?.name || selectedDemo?.name || booking?.patientId || "Patient";
    const patientPhone = String(
      booking?.patientPhone || selectedTemporary?.phone || "",
    ).trim();
    const expectedDemoOtp = getDemoAbhaOtp();

    const generateOnlineOtp = async () => {
  setTemporaryOtpSending(true);
  setTemporaryOtpSent(false);
  setDoctorOtpError("");
  setDoctorOtpInput("");

  try {
    if (!patientPhone) {
      throw new Error(
        "The patient's registered mobile number is not available for OTP delivery."
      );
    }

    const response = await fetch(
      `${API_BASE_URL}/api/send-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: patientPhone,
          phone: patientPhone,
          patientId:
            booking?.patientId ||
            selectedTemporary?.patientId ||
            "",
          appointmentId:
            (
              booking as
                | (AppointmentBooking & {
                    appointmentId?: string;
                  })
                | null
            )?.appointmentId || "",
        }),
      }
    );

    const responseText = await response.text();

    let data: any = {};

    try {
      data = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      throw new Error(
        `OTP server returned an invalid response (HTTP ${response.status}).`
      );
    }

    if (
      !response.ok ||
      data.success !== true
    ) {
      throw new Error(
        data.message ||
          data.error ||
          `OTP could not be sent (HTTP ${response.status}).`
      );
    }

    setTemporaryOtpSent(true);
    setDoctorOtpError("");

  } catch (error) {
    setTemporaryOtpSent(false);

    setDoctorOtpError(
      error instanceof Error
        ? error.message
        : "OTP could not be sent to the patient's registered mobile number."
    );
  } finally {
    setTemporaryOtpSending(false);
  }
};

   const verifyOnlineOtpAndContinue = async () => {
  const otp = doctorOtpInput.trim();

  if (otp.length !== 6) {
    setDoctorOtpError(
      "Please enter the 6-digit OTP."
    );
    return;
  }

  if (!temporaryOtpSent) {
    setDoctorOtpError(
      "Generate the OTP before verifying this patient."
    );
    return;
  }

  if (!patientPhone) {
    setDoctorOtpError(
      "The patient's registered mobile number is not available."
    );
    return;
  }

  setDoctorOtpError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/verify-otp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: patientPhone,
          phone: patientPhone,
          patientId:
            booking?.patientId ||
            selectedTemporary?.patientId ||
            "",
          otp,
          code: otp,
        }),
      }
    );

    const responseText =
      await response.text();

    let data: any = {};

    try {
      data = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      throw new Error(
        `OTP verification server returned an invalid response (HTTP ${response.status}).`
      );
    }

    if (
      !response.ok ||
      data.success !== true ||
      data.authorized === false ||
      (
        data.status &&
        data.status !== "approved"
      )
    ) {
      throw new Error(
        data.message ||
          data.error ||
          "Invalid or expired OTP. Access remains blocked."
      );
    }

    /*
      OTP verification succeeded.
      Unlock the AI clinical summary while keeping
      the doctor inside the online consultation.
    */

    const sourceSummary =
      isTemporaryRecord
        ? selectedTemporary?.summary || ""
        : selectedDemo?.summary || "";

    const sourceComplaint =
      isTemporaryRecord
        ? selectedTemporary?.complaint || ""
        : selectedDemo?.complaint || "";

    const sourceRedFlags =
      isTemporaryRecord
        ? selectedTemporary?.redFlagDetection || ""
        : selectedDemo?.redFlagDetection || "";

    const sourceRos =
      isTemporaryRecord
        ? selectedTemporary?.reviewOfSystems || ""
        : selectedDemo?.reviewOfSystems || "";

    setOnlineSummaryDraft({
      summary: sourceSummary,
      complaint: sourceComplaint,
      redFlagDetection:
        sourceRedFlags,
      reviewOfSystems:
        sourceRos,
    });

    setOnlineSummaryUnlocked(true);
    setOnlineSummaryEditing(false);
    setDoctorOtpError("");

  } catch (error) {
    setDoctorOtpError(
      error instanceof Error
        ? error.message
        : "OTP verification failed. Access remains blocked."
    );
  }
};

    return (
      <PageShell
        language={language}
        step="DOCTOR • ONLINE CONSULTATION"
        title="Online Consultation"
        onBack={() => setScreen("doctorPendingReviews")}
      >
        <div
          className="aayuvora-online-consultation-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.45fr) minmax(340px, 0.8fr)",
            gap: "16px",
            width: "100%",
            minHeight: "620px",
          }}
        >
          <div
            className="summary-card"
            style={{
              padding: 0,
              overflow: "hidden",
              background: "#111",
              minHeight: "620px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "14px 16px", background: "#0d2421", color: "white" }}>
              <strong>Online Video Consultation</strong>
              <div style={{ opacity: 0.78, fontSize: "12px", marginTop: "4px" }}>
                {patientName} • {booking?.appointmentDate || ""} • {booking?.timeSlot || ""}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <JitsiCallPanel
                roomName={videoCallRoom}
                displayName={videoCallDisplayName || "Aayuvora Doctor"}
              />
            </div>
          </div>

          <div className="summary-card" style={{ minHeight: "620px" }}>
            <div className="otp-lock-icon">{onlineSummaryUnlocked ? "🔓" : "🔐"}</div>
            <h2>AI Clinical Summary</h2>
            <p className="page-description">
              The doctor can join the video call immediately. OTP verification is required only to access the patient's clinical summary.
            </p>

            <div className="otp-patient-preview">
              <strong>{patientName}</strong>
              <div style={{ marginTop: "8px" }}>
                <b>Chief Complaint:</b>{" "}
                {selectedTemporary?.complaint || selectedDemo?.complaint || "Not available"}
              </div>
            </div>

            {!onlineSummaryUnlocked && (
              <>
                <button
                  className="primary-button full"
                  onClick={generateOnlineOtp}
                  disabled={temporaryOtpSending}
                  style={{ marginTop: "16px" }}
                >
                  {temporaryOtpSending ? "Sending OTP..." : "Generate OTP"}
                </button>

                {temporaryOtpSent && (
                  <div className="otp-demo-code" style={{ marginTop: "12px" }}>
                    {isTemporaryRecord
                      ? "OTP has been sent to the patient's registered mobile number."
                      : "Demo patient: use the same OTP used during the patient's ABHA demo login."}
                  </div>
                )}

                <label className="field-label" style={{ marginTop: "16px", display: "block" }}>
                  Enter OTP
                </label>
                <input
                  className="otp-input"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={doctorOtpInput}
                  onChange={(e) => {
                    setDoctorOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setDoctorOtpError("");
                  }}
                />

                {doctorOtpError && (
                  <div className="otp-error" style={{ marginTop: "10px" }}>
                    {doctorOtpError}
                  </div>
                )}

                <button
                  className="primary-button full"
                  onClick={verifyOnlineOtpAndContinue}
                  style={{ marginTop: "16px" }}
                >
                  Verify & View Summary <ArrowRight size={17} />
                </button>
              </>
            )}

            {onlineSummaryUnlocked && (
              <div style={{ marginTop: "16px" }}>
                <div className="information-box">
                  <div className="info-row">
                    <ShieldCheck size={18} />
                    <span>Patient summary unlocked after OTP verification.</span>
                  </div>
                </div>

                {!onlineSummaryEditing ? (
                  <>
                    <div className="summary-card" style={{ marginTop: "12px", padding: "14px" }}>
                      <strong>AI Clinical Summary</strong>
                      <p style={{ whiteSpace: "pre-wrap", marginBottom: "12px" }}>{onlineSummaryDraft.summary || "Not available"}</p>
                      <SummaryRow title="Chief Complaint" value={onlineSummaryDraft.complaint || "Not available"} />
                      <SummaryRow title="Red Flag Detection" value={onlineSummaryDraft.redFlagDetection || "Not available"} />
                      <SummaryRow title="Review of Systems (ROS)" value={onlineSummaryDraft.reviewOfSystems || "Not available"} />
                    </div>
                    <button
                      className="primary-button full"
                      onClick={() => setOnlineSummaryEditing(true)}
                      style={{ marginTop: "12px" }}
                    >
                      Edit Summary <FileText size={17} />
                    </button>
                  </>
                ) : (
                  <>
                    <label className="field-label" style={{ marginTop: "12px", display: "block" }}>AI Clinical Summary</label>
                    <textarea
                      className="text-area"
                      rows={7}
                      value={onlineSummaryDraft.summary}
                      onChange={(e) => setOnlineSummaryDraft((current) => ({ ...current, summary: e.target.value }))}
                    />

                    <label className="field-label" style={{ marginTop: "10px", display: "block" }}>Chief Complaint</label>
                    <textarea
                      className="text-area"
                      rows={3}
                      value={onlineSummaryDraft.complaint}
                      onChange={(e) => setOnlineSummaryDraft((current) => ({ ...current, complaint: e.target.value }))}
                    />

                    <label className="field-label" style={{ marginTop: "10px", display: "block" }}>Red Flag Detection</label>
                    <textarea
                      className="text-area"
                      rows={3}
                      value={onlineSummaryDraft.redFlagDetection}
                      onChange={(e) => setOnlineSummaryDraft((current) => ({ ...current, redFlagDetection: e.target.value }))}
                    />

                    <label className="field-label" style={{ marginTop: "10px", display: "block" }}>Review of Systems (ROS)</label>
                    <textarea
                      className="text-area"
                      rows={4}
                      value={onlineSummaryDraft.reviewOfSystems}
                      onChange={(e) => setOnlineSummaryDraft((current) => ({ ...current, reviewOfSystems: e.target.value }))}
                    />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
                      <button
                        className="primary-button"
                        onClick={() => {
                          setOnlineSummaryEditing(false);
                          setOnlinePrescriptionChoice(null);
                          setOnlinePrescriptions([]);
                          setOnlinePrescriptionDraft({ medicine: "", dosage: "", frequency: "", duration: "", instructions: "" });
                          setPrescriptionError("");
                          setScreen("doctorOnlinePrescription");
                        }}
                      >
                        Save Summary <Check size={17} />
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => setOnlineSummaryEditing(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              className="secondary-button full"
              onClick={() => setScreen("doctorPreviousSummaries")}
              style={{ marginTop: "10px" }}
            >
              <FileText size={17} /> View Previous Health Summaries
            </button>
            <button
              className="secondary-button full"
              onClick={() => setScreen("doctorPendingReviews")}
              style={{ marginTop: "10px" }}
            >
              <ArrowLeft size={17} /> Back to Pending Reviews
            </button>
          </div>
        </div>

        <style>{`@media (max-width: 900px) { .aayuvora-online-consultation-grid { grid-template-columns: 1fr !important; } }`}</style>
      </PageShell>
    );
  }

  /* =========================================================
     DOCTOR — ONLINE CONSULTATION PRESCRIPTION
  ========================================================= */

  if (screen === "doctorOnlinePrescription") {
    const finishConsultation = async (prescriptions: OnlinePrescription[]) => {
      try {
        if (selectedOnlineBooking?.appointmentId) {
          await saveOnlinePrescriptionsToBackend(prescriptions);
        }
        setOnlinePrescriptions(prescriptions);
        setOnlinePrescriptionChoice(null);
        setPrescriptionError("");
        setScreen("doctorPendingReviews");
      } catch (error) {
        setPrescriptionError(error instanceof Error ? error.message : "Prescription could not be saved.");
      }
    };

    return (
      <PageShell
        language={language}
        step="DOCTOR • ONLINE CONSULTATION"
        title="Online Consultation Prescription"
        onBack={() => setScreen("doctorOnlineConsultation")}
      >
        <div className="page-icon"><FileText size={30} /></div>
        <p className="page-description">
          Are there any prescriptions for this patient from this online consultation?
        </p>

        <div className="choice-grid">
          <button type="button" className="role-card" onClick={() => { setOnlinePrescriptionChoice("yes"); setPrescriptionError(""); }}>
            <FileText size={34} />
            <strong>Yes, add prescription</strong>
            <span>Enter the prescription given by the doctor.</span>
          </button>
          <button type="button" className="role-card" onClick={() => { setOnlinePrescriptionChoice("no"); setPrescriptionError(""); }}>
            <CheckCircle2 size={34} />
            <strong>No prescription</strong>
            <span>End the online consultation without a prescription.</span>
          </button>
        </div>

        {onlinePrescriptionChoice === "yes" && (
          <div className="summary-card" style={{ marginTop: "18px" }}>
            <strong>Add Prescription</strong>
            <label className="field-label" style={{ marginTop: "12px", display: "block" }}>Medicine</label>
            <input className="text-input" value={onlinePrescriptionDraft.medicine} onChange={(e) => setOnlinePrescriptionDraft(c => ({ ...c, medicine: e.target.value }))} placeholder="Medicine name" />
            <label className="field-label" style={{ marginTop: "10px", display: "block" }}>Dosage</label>
            <input className="text-input" value={onlinePrescriptionDraft.dosage} onChange={(e) => setOnlinePrescriptionDraft(c => ({ ...c, dosage: e.target.value }))} placeholder="e.g. 1 tablet" />
            <label className="field-label" style={{ marginTop: "10px", display: "block" }}>Frequency</label>
            <input className="text-input" value={onlinePrescriptionDraft.frequency} onChange={(e) => setOnlinePrescriptionDraft(c => ({ ...c, frequency: e.target.value }))} placeholder="e.g. twice daily" />
            <label className="field-label" style={{ marginTop: "10px", display: "block" }}>Duration</label>
            <input className="text-input" value={onlinePrescriptionDraft.duration} onChange={(e) => setOnlinePrescriptionDraft(c => ({ ...c, duration: e.target.value }))} placeholder="e.g. 5 days" />
            <label className="field-label" style={{ marginTop: "10px", display: "block" }}>Instructions</label>
            <textarea className="text-area" rows={3} value={onlinePrescriptionDraft.instructions} onChange={(e) => setOnlinePrescriptionDraft(c => ({ ...c, instructions: e.target.value }))} placeholder="Doctor's instructions" />
            <button type="button" className="primary-button full" style={{ marginTop: "14px" }} onClick={() => {
              if (!onlinePrescriptionDraft.medicine.trim()) { setPrescriptionError("Enter the medicine name."); return; }
              setOnlinePrescriptions(current => [...current, { ...onlinePrescriptionDraft, medicine: onlinePrescriptionDraft.medicine.trim() }]);
              setOnlinePrescriptionDraft({ medicine: "", dosage: "", frequency: "", duration: "", instructions: "" });
              setPrescriptionError("");
            }}>Add Prescription <ArrowRight size={17} /></button>

            {onlinePrescriptions.length > 0 && (
              <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
                {onlinePrescriptions.map((item, index) => (
                  <div key={`${item.medicine}-${index}`} className="information-box">
                    <div className="info-row"><FileText size={18} /><span><strong>{item.medicine}</strong> • {item.dosage || "Dosage not specified"} • {item.frequency || "Frequency not specified"} • {item.duration || "Duration not specified"}{item.instructions ? ` • ${item.instructions}` : ""}</span></div>
                  </div>
                ))}
              </div>
            )}

            {prescriptionError && <div className="otp-error" style={{ marginTop: "12px" }}>{prescriptionError}</div>}
            <button type="button" className="primary-button full" style={{ marginTop: "14px" }} disabled={onlinePrescriptions.length === 0} onClick={() => finishConsultation(onlinePrescriptions)}>Save Prescription & End Consultation <Check size={17} /></button>
          </div>
        )}

        {onlinePrescriptionChoice === "no" && (
          <div className="summary-card" style={{ marginTop: "18px" }}>
            <p className="page-description">No prescription will be attached to this consultation.</p>
            {prescriptionError && <div className="otp-error" style={{ marginTop: "12px" }}>{prescriptionError}</div>}
            <button type="button" className="primary-button full" onClick={() => finishConsultation([])}>End Consultation <Check size={17} /></button>
          </div>
        )}
      </PageShell>
    );
  }

  /* =========================================================
     DOCTOR — OTP AUTHORIZATION
  ========================================================= */

  if (screen === "doctorOtpAuthorization") {
    const isTemporaryRecord = selectedDoctorPatient === "temporary";
    const selectedDemo = doctorMode === "ayush"
      ? demoAyushPendingReviews[selectedDemoReviewIndex]
      : demoPendingReviews[selectedDemoReviewIndex];
    const selectedTemporary = temporaryDoctorPatients[selectedTemporaryPatientIndex];
    const selectedName = isTemporaryRecord
      ? selectedTemporary?.name ?? "Temporary Patient"
      : selectedDemo?.name ?? demoAyushPatient.name;
    const selectedComplaint = isTemporaryRecord
      ? selectedTemporary?.complaint ?? "Not available"
      : selectedDemo?.complaint ?? demoAyushPatient.complaint;

    const generateTemporaryOtp = async () => {
      if (!selectedTemporary?.patientId) {
        setDoctorOtpError("Patient information is unavailable. OTP cannot be requested.");
        return;
      }

      setTemporaryOtpSending(true);
      setDoctorOtpInput("");
      setDoctorOtpError("");

      try {
        const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: selectedTemporary.phone,
            patientId: selectedTemporary.patientId,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
          throw new Error(data.message || "OTP could not be sent.");
        }

        setTemporaryOtpSent(true);
      } catch (error) {
        setTemporaryOtpSent(false);
        setDoctorOtpError(
          error instanceof Error
            ? error.message
            : "OTP could not be sent to the registered mobile number.",
        );
      } finally {
        setTemporaryOtpSending(false);
      }
    };

    const verifyDoctorOtp = async () => {
      if (isTemporaryRecord) {
        if (!temporaryOtpSent) {
          setDoctorOtpError("Generate and send an OTP before verifying this patient record.");
          return;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phoneNumber: selectedTemporary?.phone,
              patientId: selectedTemporary?.patientId,
              otp: doctorOtpInput.trim(),
            }),
          });

          const data = await response.json().catch(() => ({}));
          if (!response.ok || data.success === false || data.authorized === false) {
            throw new Error(data.message || "Invalid or expired OTP. Access remains blocked.");
          }

          setDoctorOtpError("");
          setScreen("doctorPatient");
        } catch (error) {
          setDoctorOtpError(
            error instanceof Error
              ? error.message
              : "OTP verification failed. Access remains blocked.",
          );
        }
        return;
      }

      const expectedOtp = getDemoAbhaOtp();
      if (!expectedOtp) {
        setDoctorOtpError("The demo patient's ABHA OTP could not be found.");
        return;
      }
      if (doctorOtpInput.trim() !== expectedOtp) {
        setDoctorOtpError("Invalid OTP. Access to the patient summary remains blocked.");
        return;
      }
      setDoctorOtpError("");
      setScreen("doctorPatient");
    };

    return (
      <PageShell language={language} step="DOCTOR • AUTHORIZATION" title="Patient Summary Authorization">
        <div className="otp-authorization-card">
          <div className="otp-lock-icon">🔐</div>
          <h2>Authorize Access to Patient Summary</h2>
          <p>Doctor access is granted only after the required patient authorization code is verified.</p>

          <div className="otp-patient-preview">
            <div style={{ marginBottom: "12px" }}>
              <strong>{selectedName}</strong>
            </div>
            <div>
              <span><b>Chief Complaint:</b> {selectedComplaint}</span>
            </div>
          </div>

          {isTemporaryRecord ? (
            <>
              <button
                className="primary-button otp-generate-button"
                onClick={generateTemporaryOtp}
                disabled={temporaryOtpSending}
              >
                {temporaryOtpSending ? "Sending OTP..." : "Generate OTP"}
              </button>
              {temporaryOtpSent && (
                <div className="otp-demo-code">
                  <small>📱 OTP has been sent to the patient's registered mobile number. Enter the OTP below to authorize access.</small>
                </div>
              )}
            </>
          ) : (
            <div className="otp-demo-code">
              <small>Demo patient: enter the same OTP used with this patient's ABHA demo login.</small>
            </div>
          )}

          <label className="field-label">Enter OTP</label>
          <input
            className="otp-input"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit OTP"
            value={doctorOtpInput}
            onChange={(e) => {
              setDoctorOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6));
              setDoctorOtpError("");
            }}
          />

          {doctorOtpError && <div className="otp-error">{doctorOtpError}</div>}

          <div
            className="otp-action-row"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              width: "100%",
              gap: "14px",
              marginTop: "18px",
            }}
          >
            <button
              className="primary-button"
              onClick={verifyDoctorOtp}
              style={{ width: "100%" }}
            >
              Verify & View Summary <ArrowRight size={17} />
            </button>

            <button
              className="secondary-button"
              onClick={() => setScreen("doctorPendingReviews")}
              style={{ width: "100%", marginTop: "0" }}
            >
              <ArrowLeft size={17} /> Back
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  /* =========================================================
     DOCTOR — PATIENT DETAILS
  ========================================================= */

  if (
    screen ===
    "doctorPatient"
  ) {
    const currentTemporaryPatient = selectedDoctorPatient === "temporary"
      ? temporaryDoctorPatients[selectedTemporaryPatientIndex] ?? null
      : null;
    const currentDemoReview = demoPendingReviews[selectedDemoReviewIndex] ?? demoPendingReviews[0];
    const currentAyushReview = demoAyushPendingReviews[selectedDemoReviewIndex] ?? demoAyushPendingReviews[0];
    const isTemporaryPatient = currentTemporaryPatient !== null;
    return (
      <PageShell
        language={language}
        step="DOCTOR • STEP 5"
        title={t(
          "doctor",
          "details",
        )}
        onBack={() =>
          setScreen(
            "doctorQueue",
          )
        }
      >

        <div className="summary-card">

          <SummaryRow
            title={t(
              "doctor",
              "patient",
            )}
            value={
              isTemporaryPatient ? currentTemporaryPatient!.name : doctorMode === "ayush"
                ? currentAyushReview.name
                : currentDemoReview.name
            }
          />

          <SummaryRow
            title="Patient ID"
            value={
              isTemporaryPatient ? currentTemporaryPatient!.patientId : doctorMode === "ayush"
                ? currentAyushReview.patientId
                : currentDemoReview.patientId
            }
          />

          <SummaryRow
            title={t(
              "doctor",
              "age",
            )}
            value={
              isTemporaryPatient ? String(currentTemporaryPatient!.age) : doctorMode === "ayush"
                ? String(currentAyushReview.age)
                : String(currentDemoReview.age)
            }
          />

          <SummaryRow
            title={t(
              "doctor",
              "gender",
            )}
            value={
              isTemporaryPatient ? currentTemporaryPatient!.gender : doctorMode === "ayush"
                ? currentAyushReview.gender
                : currentDemoReview.gender
            }
          />

          {isTemporaryPatient && (
            <SummaryRow
              title="Phone"
              value={currentTemporaryPatient!.phone}
            />
          )}

          <SummaryRow
            title={t(
              "doctor",
              "complaint",
            )}
            value={
              isTemporaryPatient ? currentTemporaryPatient!.complaint : doctorMode === "ayush"
                ? currentAyushReview.complaint
                : currentDemoReview.complaint
            }
          />

          {doctorMode === "ayush" && (
            <SummaryRow
              title="Care Mode"
              value="AYUSH / Ayurvedic History"
            />
          )}

        </div>

        <button
          className="primary-button full"
          onClick={() =>
            setScreen(
              "doctorSummary",
            )
          }
        >
          {t(
            "doctor",
            "viewSummary",
          )}

          <ArrowRight size={19} />
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     DOCTOR — SUMMARY
  ========================================================= */

  if (
    screen ===
    "doctorSummary"
  ) {
    const currentTemporaryPatient = selectedDoctorPatient === "temporary"
      ? temporaryDoctorPatients[selectedTemporaryPatientIndex] ?? null
      : null;
    const currentDemoReview = demoPendingReviews[selectedDemoReviewIndex] ?? demoPendingReviews[0];
    const currentAyushReview = demoAyushPendingReviews[selectedDemoReviewIndex] ?? demoAyushPendingReviews[0];
    const isTemporaryPatient = currentTemporaryPatient !== null;
    return (
      <PageShell
        language={language}
        step="DOCTOR • STEP 6"
        title={t(
          "doctor",
          "aiSummary",
        )}
        onBack={() =>
          setScreen(
            "doctorPatient",
          )
        }
      >

        <div className="summary-card">

          {isTemporaryPatient ? (
            <SummaryRow title={t("doctor", "aiSummary")} value={currentTemporaryPatient!.summary} />
          ) : doctorMode === "ayush" ? (
            <SummaryRow title={t("doctor", "aiSummary")} value={currentAyushReview.summary} />
          ) : (
            <SummaryRow title={t("doctor", "aiSummary")} value={currentDemoReview.summary} />
          )}

          <SummaryRow
            title={t(
              "doctor",
              "complaint",
            )}
            value={
              isTemporaryPatient ? currentTemporaryPatient!.complaint : doctorMode === "ayush"
                ? currentAyushReview.complaint
                : currentDemoReview.complaint
            }
          />

          <SummaryRow
            title="Red Flag Detection"
            value={
              isTemporaryPatient
                ? currentTemporaryPatient!.redFlagDetection
                : doctorMode === "ayush"
                  ? currentAyushReview.redFlagDetection
                  : currentDemoReview.redFlagDetection
            }
          />

          <SummaryRow
            title="Review of Systems (ROS)"
            value={
              isTemporaryPatient
                ? currentTemporaryPatient!.reviewOfSystems
                : doctorMode === "ayush"
                  ? currentAyushReview.reviewOfSystems
                  : currentDemoReview.reviewOfSystems
            }
          />

          {!isTemporaryPatient && doctorMode === "ayush" ? (
            <>
              <SummaryRow title="Prakriti" value="Demo: Vata-Pitta" />
              <SummaryRow title="Vikriti" value="Demo: Mild imbalance noted" />
              <SummaryRow title="Sara" value="Demo: Madhyama" />
              <SummaryRow title="Samhanana" value="Demo: Madhyama" />
              <SummaryRow title="Pramana" value="Demo: Within recorded range" />
              <SummaryRow title="Satmya" value="Demo: Suitable diet and routine" />
              <SummaryRow title="Sattva" value="Demo: Madhyama" />
              <SummaryRow title="Ahara Shakti" value="Demo: Madhyama" />
              <SummaryRow title="Vyayama Shakti" value="Demo: Madhyama" />
              <SummaryRow title="Vaya" value="Demo: Adult" />
              <SummaryRow title="Ahara-Vihara" value="Demo: Mixed diet; regular daily activity" />
            </>
          ) : (
            <>
              <SummaryRow
                title={t(
                  "summary",
                  "duration",
                )}
                value={isTemporaryPatient ? currentTemporaryPatient!.duration : currentDemoReview.duration}
              />

              <SummaryRow
                title={t(
                  "summary",
                  "symptoms",
                )}
                value={isTemporaryPatient ? currentTemporaryPatient!.symptoms : currentDemoReview.symptoms}
              />

              <SummaryRow
                title={t(
                  "summary",
                  "history",
                )}
                value={
                  t(
                    "summary",
                    "unavailable",
                  )
                }
              />
            </>
          )}

        </div>

        <div className="doctor-note">

          <ShieldCheck size={18} />

          <span>
            {t(
              "summary",
              "warning",
            )}
          </span>

        </div>

        <button
          className="primary-button full"
          onClick={() =>
            setScreen(
              "doctorDocuments",
            )
          }
        >
          {t(
            "doctor",
            "viewDocuments",
          )}

          <ArrowRight size={19} />
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     DOCTOR — DOCUMENTS
  ========================================================= */

  if (
    screen ===
    "doctorDocuments"
  ) {
    const currentTemporaryPatient = selectedDoctorPatient === "temporary"
      ? temporaryDoctorPatients[selectedTemporaryPatientIndex] ?? null
      : null;
    return (
      <PageShell
        language={language}
        step="DOCTOR • STEP 7"
        title={t(
          "doctor",
          "documents",
        )}
        onBack={() =>
          setScreen(
            "doctorSummary",
          )
        }
      >

        <div className="document-viewer">

          {selectedDoctorPatient === "temporary" && currentTemporaryPatient ? (
            currentTemporaryPatient.documents.length > 0 ? (
              <div style={{ width: "100%" }}>
                <FileText size={44} />

                <strong>Current Patient Uploaded Documents</strong>

                <span>Documents uploaded during this patient session</span>

                <div style={{ width: "100%", marginTop: "14px" }}>
                  {currentTemporaryPatient.documents.map((document) => (
                    <div
                      className="doctor-note"
                      key={document.id}
                      style={{ marginTop: "10px", width: "100%" }}
                    >
                      <FileText size={18} />
                      <span style={{ whiteSpace: "pre-wrap" }}>
                        <strong>Document {document.id}: {document.name}</strong>
                        {"\n"}
                        {document.structured ||
                          (document.status === "processing"
                            ? "Processing..."
                            : document.status === "error"
                              ? document.error
                              : "Document uploaded successfully. No extracted text is available yet.")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="doctor-note" style={{ width: "100%" }}>
                <FileText size={18} />
                <span>No medical documents were uploaded by this current patient.</span>
              </div>
            )
          ) : (
            <>
              <FileText size={44} />

              <strong>
                {t(
                  "doctor",
                  "previousPrescription",
                )}
              </strong>

              <span>
                {t(
                  "doctor",
                  "uploaded",
                )}
              </span>

              <button className="secondary-button">
                {t(
                  "doctor",
                  "openDocument",
                )}
              </button>
            </>
          )}

        </div>

        <button
          className="primary-button full"
          onClick={() => setScreen("doctorPreviousSummaries")}
        >
          View Previous Health Summaries <ArrowRight size={19} />
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     DOCTOR — PREVIOUS PATIENT HEALTH SUMMARIES
  ========================================================= */

  if (screen === "doctorPreviousSummaries") {
    const currentTemporaryPatient = selectedDoctorPatient === "temporary" ? temporaryDoctorPatients[selectedTemporaryPatientIndex] ?? null : null;
    const currentDemoReview = demoPendingReviews[selectedDemoReviewIndex] ?? demoPendingReviews[0];
    const currentAyushReview = demoAyushPendingReviews[selectedDemoReviewIndex] ?? demoAyushPendingReviews[0];
    const recordPatientId = selectedOnlineBooking?.patientId || currentTemporaryPatient?.patientId || (doctorMode === "ayush" ? currentAyushReview.patientId : currentDemoReview.patientId);
    const records = savedHealthSummaries.filter((item) => item.patientId === recordPatientId);
    return <PageShell language={language} step="DOCTOR • PREVIOUS RECORDS" title="Previous Health Summaries" onBack={() => setScreen(selectedOnlineBooking ? "doctorOnlineConsultation" : "doctorDocuments")}>
      <div className="information-box"><div className="info-row"><ShieldCheck size={20}/><span>Patient-specific records for {selectedOnlineBooking?.patientName || currentTemporaryPatient?.name || (doctorMode === "ayush" ? currentAyushReview.name : currentDemoReview.name)}. Use these summaries as supporting information; verify them with the patient and the clinical record.</span></div></div>
      {records.length ? <div className="saved-summary-list">{records.map((record) => <article className="saved-summary-card" key={record.id}><div className="saved-summary-meta"><strong>{record.patientName}</strong><time dateTime={record.createdAt}>{new Date(record.createdAt).toLocaleString()}</time></div><p className="saved-summary-text" data-no-translate="true">{record.summary}</p></article>)}</div> : <div className="information-box"><div className="info-row"><FileText size={20}/><span>No prior summaries are stored in this browser for this patient. Only records saved here are displayed; backend or other-device records are not automatically fetched.</span></div></div>}
      <button className="primary-button full" onClick={() => setScreen(selectedOnlineBooking ? "doctorOnlinePrescription" : "doctorReview")}>{selectedOnlineBooking ? "Continue to Prescription" : "Continue to Review"} <ArrowRight size={18}/></button>
    </PageShell>;
  }

  /* =========================================================
     DOCTOR — REVIEW
  ========================================================= */

  if (
    screen ===
    "doctorReview"
  ) {
    return (
      <PageShell
        language={language}
        step="DOCTOR • STEP 8"
        title={t(
          "doctor",
          "review",
        )}
        onBack={() =>
          setScreen(
            "doctorDocuments",
          )
        }
      >

        <div className="review-box">

          <label>
            {t(
              "doctor",
              "aiSummary",
            )}
          </label>

          {(() => {
            const currentTemporaryPatient = selectedDoctorPatient === "temporary"
              ? temporaryDoctorPatients[selectedTemporaryPatientIndex] ?? null
              : null;
            const isTemporaryPatient = currentTemporaryPatient !== null;
            const currentDemoReview = demoPendingReviews[selectedDemoReviewIndex] ?? demoPendingReviews[0];
            const reviewSummary = isTemporaryPatient
              ? currentTemporaryPatient!.summary
              : doctorMode === "ayush"
                ? (demoAyushPendingReviews[selectedDemoReviewIndex] ?? demoAyushPendingReviews[0]).summary
                : currentDemoReview.summary;

            return (
              <textarea
                className="doctor-summary-editor"
                value={reviewSummary}
                onChange={(event) => {
                  if (!isTemporaryPatient) return;
                  const updatedSummary = event.target.value;
                  setTemporaryDoctorPatients((previous) =>
                    previous.map((record, index) =>
                      index === selectedTemporaryPatientIndex
                        ? { ...record, summary: updatedSummary }
                        : record,
                    ),
                  );
                }}
                readOnly={!isTemporaryPatient}
              />
            );
          })()}

        </div>

        <button
          className="primary-button full"
          onClick={() =>
            setScreen(
              "doctorDecision",
            )
          }
        >
          {t(
            "doctor",
            "approve",
          )}

          <ArrowRight size={19} />
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     DOCTOR — FINAL DECISION
  ========================================================= */

  if (
    screen ===
    "doctorDecision"
  ) {
    return (
      <PageShell
        language={language}
        step="DOCTOR • STEP 9"
        title={t(
          "doctor",
          "decision",
        )}
      >

        <div className="information-box">

          <div className="info-row">

            <CheckCircle2 size={18} />

            <span>
              {t(
                "doctor",
                "reviewed",
              )}
            </span>

          </div>

          <div className="info-row">

            <CheckCircle2 size={18} />

            <span>
              {t(
                "doctor",
                "verified",
              )}
            </span>

          </div>

          <div className="info-row">

            <CheckCircle2 size={18} />

            <span>
              {t(
                "doctor",
                "source",
              )}
            </span>

          </div>

        </div>

        <button
          className="primary-button full"
          onClick={completeConsultationAndReleaseAppointment}
        >
          {t(
            "doctor",
            "complete",
          )}

          <CheckCircle2 size={19} />
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     ADMIN — LOGIN
  ========================================================= */

  if (
    screen ===
    "adminLogin"
  ) {
    return (
      <PageShell
        language={language}
        step="ADMIN • STEP 3"
        title={t(
          "admin",
          "login",
        )}
        onBack={() =>
          setScreen("role")
        }
      >

        <div className="page-icon">
          <Settings size={30} />
        </div>

        <p className="page-description">
          {t(
            "admin",
            "loginDescription",
          )}
        </p>

        <label>Hospital</label>
        <select className="text-input" value={selectedAdminHospitalId} onChange={(event) => { setSelectedAdminHospitalId(event.target.value); setUsername(""); setPassword(""); setLoginError(""); }}>
          {DEMO_HOSPITALS.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}
        </select>
        <div className="demo-credentials">
          <strong>{DEMO_HOSPITALS.find((hospital) => hospital.id === selectedAdminHospitalId)?.name} — Admin</strong>
          <p>Admin ID: {DEMO_HOSPITALS.find((hospital) => hospital.id === selectedAdminHospitalId)?.adminId}</p>
          <p>Password: {DEMO_HOSPITALS.find((hospital) => hospital.id === selectedAdminHospitalId)?.adminPassword}</p>
        </div>

        <label>
          {t(
            "admin",
            "username",
          )}
        </label>

        <input
          className="text-input"
          value={username}
          onChange={(event) => {
            setUsername(
              event.target.value,
            );
            setLoginError("");
          }}
          placeholder={
            demoAdmin.username
          }
        />

        <label>
          {t(
            "admin",
            "password",
          )}
        </label>

        <input
          className="text-input"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(
              event.target.value,
            );
            setLoginError("");
          }}
          placeholder="Enter password"
        />

        {loginError && (
          <div className="login-error">

            <XCircle size={19} />

            <span>
              {loginError}
            </span>

          </div>
        )}

        <div className="demo-credentials">

          <strong>
            Demo Admin
          </strong>

          <p>
            Username:{" "}
            {demoAdmin.username}
          </p>

          <p>
            Password:{" "}
            {demoAdmin.password}
          </p>

        </div>

        <button
          className="primary-button full"
          onClick={verifyAdmin}
        >
          Login

          <ArrowRight size={19} />
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     ADMIN — DASHBOARD
  ========================================================= */

  if (
    screen ===
    "adminDashboard"
  ) {
    const demoActiveSessions = [
      "Mobile", "Hospital Kiosk", "Mobile", "Hospital Kiosk",
      "Mobile", "Hospital Kiosk", "Mobile", "Hospital Kiosk",
      "Mobile", "Hospital Kiosk", "Mobile", "Hospital Kiosk",
      "Mobile", "Hospital Kiosk", "Mobile", "Hospital Kiosk",
      "Mobile", "Hospital Kiosk",
    ];

    return (
      <PageShell
        language={language}
        step="ADMIN • STEP 4"
        title={t(
          "admin",
          "dashboard",
        )}
      >

        <div className="demo-banner">
          <strong>{DEMO_HOSPITALS.find((hospital) => hospital.id === loggedInAdminHospitalId)?.name || "Hospital"}</strong>
          <span>Hospital administrator dashboard</span>
        </div>

        <div className="dashboard-stat-grid">

          <StatCard
            icon={<Users size={22} />}
            title={t(
              "admin",
              "patients",
            )}
            value="1,245"
          />

          <StatCard
            icon={
              <Stethoscope size={22} />
            }
            title={t(
              "admin",
              "doctors",
            )}
            value="43"
          />

          <StatCard
            icon={<Monitor size={22} />}
            title={t(
              "admin",
              "kiosks",
            )}
            value="27"
          />

          <StatCard
            icon={
              <Activity size={22} />
            }
            title={t(
              "admin",
              "activeSessions",
            )}
            value="18"
            onClick={() => setScreen("adminActiveSessions")}
          />

        </div>



        <button
          className="dashboard-menu-button"
          onClick={() => {
            setAdminAppointmentAbha("");
            setAdminAppointmentOtp("");
            setAdminAppointmentError("");
            setAdminAppointmentVerifiedPatient(null);
            setAdminAppointmentChoice(null);
            setAdminAppointmentDate(getLocalDateString());
            setAdminAppointmentTimeSlot(APPOINTMENT_TIME_SLOTS[0]);
            setScreen("adminAppointmentRegistration");
          }}
        >
          <ClipboardList size={20} />

          <div>
            <strong>Register Patient for Appointment</strong>
            <span>Verify demo ABHA + OTP and book the patient's appointment.</span>
          </div>

          <ArrowRight size={18} />
        </button>

        <button
          className="dashboard-menu-button"
          onClick={() =>
            setScreen(
              "adminUsers",
            )
          }
        >

          <Users size={20} />

          <div>

            <strong>
              {t(
                "admin",
                "usersRoles",
              )}
            </strong>

            <span>
              {t(
                "admin",
                "usersDescription",
              )}
            </span>

          </div>

          <ArrowRight size={18} />

        </button>

        <button
          className="dashboard-menu-button"
          onClick={() =>
            setScreen(
              "adminKiosks",
            )
          }
        >

          <Monitor size={20} />

          <div>

            <strong>
              {t(
                "admin",
                "kioskManagement",
              )}
            </strong>

            <span>
              {t(
                "admin",
                "kioskDescription",
              )}
            </span>

          </div>

          <ArrowRight size={18} />

        </button>

        <button
          className="dashboard-menu-button"
          onClick={() =>
            setScreen(
              "adminMonitoring",
            )
          }
        >

          <Activity size={20} />

          <div>

            <strong>
              {t(
                "admin",
                "monitoring",
              )}
            </strong>

            <span>
              {t(
                "admin",
                "monitoringDescription",
              )}
            </span>

          </div>

          <ArrowRight size={18} />

        </button>

        <button
          className="dashboard-menu-button"
          onClick={() =>
            setScreen(
              "adminSecurity",
            )
          }
        >

          <ShieldCheck size={20} />

          <div>

            <strong>
              {t(
                "admin",
                "security",
              )}
            </strong>

            <span>
              {t(
                "admin",
                "securityDescription",
              )}
            </span>

          </div>

          <ArrowRight size={18} />

        </button>

        <button
          className="secondary-button full"
          onClick={resetApp}
        >
          <LogOut size={17} />

          Logout
        </button>

      </PageShell>
    );
  }

  /* =========================================================
     ADMIN — PATIENT APPOINTMENT REGISTRATION
  ========================================================= */

  if (screen === "adminAppointmentRegistration") {
    const submittedRecord = adminAppointmentVerifiedPatient
      ? temporaryDoctorPatients.find(
          (record) =>
            record.patientId === adminAppointmentVerifiedPatient.patientId,
        ) ?? null
      : null;

    const isAlreadyBooked =
      adminAppointmentVerifiedPatient && adminAppointmentDoctorId
        ? appointmentBookings.some(
            (appointment) =>
              appointment.patientId === adminAppointmentVerifiedPatient.patientId &&
              appointment.doctorId === adminAppointmentDoctorId &&
              isAppointmentActive(appointment, new Date(appointmentClock)),
          )
        : false;

    return (
      <PageShell
        language={language}
        step="ADMIN • STEP 4"
        title="Register New Patient for Appointment"
        onBack={() => setScreen("adminDashboard")}
      >
        <div className="information-box">
          <div className="info-row">
            <ClipboardList size={18} />
            <span>
              Register a new patient for an appointment using the demo ABHA
              credentials. The doctor will only receive the patient's name
              and reported problem after the appointment is booked.
            </span>
          </div>
        </div>

        <label className="field-label">
          Register a new patient for appointment?
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "18px",
          }}
        >
          <button
            className="primary-button"
            onClick={() => {
              setAdminAppointmentChoice("yes");
              setAdminAppointmentError("");
              setAdminAppointmentVerifiedPatient(null);
            }}
          >
            Yes
          </button>

          <button
            className="secondary-button"
            onClick={() => {
              setAdminAppointmentChoice("no");
              setScreen("adminDashboard");
            }}
          >
            No
          </button>
        </div>

        {adminAppointmentChoice === "yes" && (
          <>
            <div
              style={{
                padding: "16px",
                border: "1px solid #dcebe7",
                borderRadius: "14px",
                background: "#f9fdfb",
                textAlign: "left",
              }}
            >
              <strong style={{ color: "#087f70" }}>
                Demo ABHA verification
              </strong>

              <label>ABHA ID</label>
              <input
                className="text-input"
                value={adminAppointmentAbha}
                onChange={(event) => {
                  setAdminAppointmentAbha(event.target.value);
                  setAdminAppointmentError("");
                  setAdminAppointmentVerifiedPatient(null);
                }}
                placeholder="XX-XXXX-XXXX-XXXX"
              />

              <label>OTP</label>
              <input
                className="text-input"
                inputMode="numeric"
                maxLength={6}
                value={adminAppointmentOtp}
                onChange={(event) => {
                  setAdminAppointmentOtp(
                    event.target.value.replace(/\D/g, "").slice(0, 6),
                  );
                  setAdminAppointmentError("");
                  setAdminAppointmentVerifiedPatient(null);
                }}
                placeholder="Enter 6-digit demo OTP"
              />

              <div className="demo-credentials" style={{ marginTop: "14px" }}>
                <strong>Demo credentials</strong>
                <p>ABHA ID: {demoPatients[0].abha}</p>
                <p>OTP: {demoPatients[0].otp}</p>
              </div>

              <button
                className="primary-button full"
                onClick={verifyAdminAppointmentPatient}
              >
                Verify ABHA & OTP <ArrowRight size={17} />
              </button>
            </div>

            {adminAppointmentVerifiedPatient && (
              <div
                className="information-box"
                style={{ marginTop: "18px" }}
              >
                <div className="info-row">
                  <CheckCircle2 size={18} />
                  <span>
                    Verified patient:{" "}
                    <strong>{adminAppointmentVerifiedPatient.name}</strong>
                  </span>
                </div>

                {submittedRecord ? (
                  <>
                    <div className="info-row">
                      <ClipboardList size={18} />
                      <span>
                        Submitted reported problem:{" "}
                        <strong>{submittedRecord.complaint}</strong>
                      </span>
                    </div>

                    <label style={{ display: "block", marginTop: "14px" }}>Hospital</label>
                    <select className="text-input" value={adminAppointmentHospitalId} onChange={(event) => {
                      const hospitalId = event.target.value;
                      setAdminAppointmentHospitalId(hospitalId);
                      const firstDoctor = DEMO_DOCTORS.find((doctor) => doctor.hospitalId === hospitalId && doctor.careMode === submittedRecord.careMode);
                      setAdminAppointmentDoctorId(firstDoctor?.id ?? "");
                      const firstFutureSlot = APPOINTMENT_TIME_SLOTS.find(
                        (slot) => !isAppointmentSlotPast(adminAppointmentDate, slot) && !isSlotTaken(firstDoctor?.id ?? "", adminAppointmentDate, slot),
                      );
                      setAdminAppointmentTimeSlot(firstFutureSlot ?? APPOINTMENT_TIME_SLOTS[APPOINTMENT_TIME_SLOTS.length - 1]);
                    }}>
                      {DEMO_HOSPITALS.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}
                    </select>
                    <label style={{ display: "block", marginTop: "14px" }}>Doctor whose appointment is booked</label>
                    <select className="text-input" value={adminAppointmentDoctorId} onChange={(event) => {
                      const doctorId = event.target.value;
                      setAdminAppointmentDoctorId(doctorId);
                      const firstFutureSlot = APPOINTMENT_TIME_SLOTS.find(
                        (slot) => !isAppointmentSlotPast(adminAppointmentDate, slot) && !isSlotTaken(doctorId, adminAppointmentDate, slot),
                      );
                      setAdminAppointmentTimeSlot(firstFutureSlot ?? APPOINTMENT_TIME_SLOTS[APPOINTMENT_TIME_SLOTS.length - 1]);
                    }}>
                      {DEMO_DOCTORS.filter((doctor) => doctor.hospitalId === adminAppointmentHospitalId && doctor.careMode === submittedRecord.careMode).map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                      ))}
                    </select>

                    <label style={{ display: "block", marginTop: "14px" }}>Appointment Date</label>
                    <input
                      className="text-input"
                      type="date"
                      min={getLocalDateString()}
                      value={adminAppointmentDate}
                      onChange={(event) => {
                        setAdminAppointmentDate(event.target.value);
                        setAdminAppointmentError("");
                        if (event.target.value === getLocalDateString() && isAppointmentSlotPast(event.target.value, adminAppointmentTimeSlot)) {
                          const firstFuture = APPOINTMENT_TIME_SLOTS.find((slot) => !isAppointmentSlotPast(event.target.value, slot));
                          setAdminAppointmentTimeSlot(firstFuture ?? APPOINTMENT_TIME_SLOTS[APPOINTMENT_TIME_SLOTS.length - 1]);
                        }
                      }}
                    />

                    <label style={{ display: "block", marginTop: "14px" }}>Appointment Time Slot (10 minutes)</label>
                    <select
                      className="text-input"
                      value={adminAppointmentTimeSlot}
                      onChange={(event) => setAdminAppointmentTimeSlot(event.target.value)}
                    >
                      {APPOINTMENT_TIME_SLOTS.map((slot) => {
                        const past = isAppointmentSlotPast(adminAppointmentDate, slot);
                        const taken = isSlotTaken(adminAppointmentDoctorId, adminAppointmentDate, slot);
                        return (
                          <option key={slot} value={slot} disabled={past || taken}>
                            {slot}{past ? " — Past" : taken ? " — Booked" : ""}
                          </option>
                        );
                      })}
                    </select>
                    <div className="demo-note" style={{ marginTop: "8px" }}>
                      Admin can select a 10-minute appointment slot from 9:00 AM through 1:00 AM. The slot is locked for the selected doctor once booked.
                    </div>
                    <div className="demo-note" style={{ marginTop: "10px" }}>
                      {submittedRecord.careMode === "ayush" ? "AYUSH patient: only the Ayurvedic OPD doctor is available." : "Modern-care patient: select one of the four modern OPD doctors."}
                    </div>

                    <button
                      className="primary-button full"
                      onClick={bookAdminAppointment}
                      disabled={isAlreadyBooked}
                    >
                      {isAlreadyBooked
                        ? "Appointment Already Booked"
                        : "Book Appointment"}
                      <CheckCircle2 size={17} />
                    </button>
                  </>
                ) : (
                  <div className="info-row">
                    <XCircle size={18} />
                    <span>
                      This patient has not submitted the consultation data yet.
                      Complete the patient workflow first.
                    </span>
                  </div>
                )}

                {isAlreadyBooked && (
                  <div className="demo-note" style={{ marginTop: "10px" }}>
                    The doctor can now see the patient's name and reported
                    problem. The doctor must still complete the patient OTP
                    authorization before viewing the complete record.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {adminAppointmentError && (
          <div className="login-error" style={{ marginTop: "15px" }}>
            <XCircle size={19} />
            <span>{adminAppointmentError}</span>
          </div>
        )}

        <button
          className="secondary-button full"
          style={{ marginTop: "15px" }}
          onClick={() => setScreen("adminDashboard")}
        >
          <ArrowLeft size={17} /> Back to Admin Dashboard
        </button>
      </PageShell>
    );
  }

  /* =========================================================
     ADMIN — ACTIVE SESSIONS
  ========================================================= */

  if (screen === "adminActiveSessions") {
    const demoActiveSessions: string[] = [
      "Mobile", "Hospital Kiosk", "Mobile", "Hospital Kiosk",
      "Mobile", "Hospital Kiosk", "Mobile", "Hospital Kiosk",
      "Mobile", "Hospital Kiosk", "Mobile", "Hospital Kiosk",
      "Mobile", "Hospital Kiosk", "Mobile", "Hospital Kiosk",
      "Mobile", "Hospital Kiosk",
    ];

    return (
      <PageShell
        language={language}
        step="ADMIN • STEP 4"
        title="Active Sessions"
        onBack={() => setScreen("adminDashboard")}
      >
        <div className="active-sessions-page">
          <div className="active-sessions-page-heading">
            <div>
              <h2>18 Active Sessions</h2>
              <p>Live operational connections currently using Aayuvora.</p>
            </div>
            <div className="active-session-count">18 Active</div>
          </div>

          <div className="active-sessions-table-wrap">
            <table className="active-sessions-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Access Source</th>
                  <th>Connection</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {demoActiveSessions.map((source: string, index: number) => (
                  <tr key={`${source}-${index}`}>
                    <td>{index + 1}</td>
                    <td>
                      <span className="session-source-cell">
                        {source === "Mobile" ? <Smartphone size={16} /> : <Monitor size={16} />}
                        {source}
                      </span>
                    </td>
                    <td>{source === "Mobile" ? "Secure mobile connection" : "Secure hospital kiosk connection"}</td>
                    <td>
                      <span className="active-status-badge"><i /> Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageShell>
    );
  }

  /* =========================================================
     ADMIN — USERS
  ========================================================= */

  if (
    screen ===
    "adminUsers"
  ) {
    return (
      <PageShell
        language={language}
        step="ADMIN • STEP 5"
        title={t(
          "admin",
          "usersRoles",
        )}
        onBack={() =>
          setScreen(
            "adminDashboard",
          )
        }
      >

        <AdminRow
          icon={
            <UserRound size={21} />
          }
          title={t(
            "admin",
            "patientUsers",
          )}
          value="1,245"
          action={t(
            "admin",
            "view",
          )}
        />

        <AdminRow
          icon={
            <Stethoscope size={21} />
          }
          title={t(
            "admin",
            "doctorUsers",
          )}
          value="43"
          action={t(
            "admin",
            "manage",
          )}
        />

        <AdminRow
          icon={
            <Settings size={21} />
          }
          title={t(
            "admin",
            "administrators",
          )}
          value="6"
          action={t(
            "admin",
            "manage",
          )}
        />

        <div className="admin-access-note">

          <ShieldCheck size={18} />

          <span>
            {t(
              "admin",
              "accessNote",
            )}
          </span>

        </div>

      </PageShell>
    );
  }

  /* =========================================================
     ADMIN — KIOSKS
  ========================================================= */

  if (
    screen ===
    "adminKiosks"
  ) {
    return (
      <PageShell
        language={language}
        step="ADMIN • STEP 6"
        title={t(
          "admin",
          "kioskManagement",
        )}
        onBack={() =>
          setScreen(
            "adminDashboard",
          )
        }
      >

        <AdminRow
          icon={
            <Monitor size={21} />
          }
          title={t(
            "admin",
            "kiosk01",
          )}
          value={t(
            "admin",
            "online1",
          )}
          action={t(
            "admin",
            "monitor",
          )}
        />

        <AdminRow
          icon={
            <Monitor size={21} />
          }
          title={t(
            "admin",
            "kiosk02",
          )}
          value={t(
            "admin",
            "online2",
          )}
          action={t(
            "admin",
            "monitor",
          )}
        />

        <AdminRow
          icon={
            <Monitor size={21} />
          }
          title={t(
            "admin",
            "kiosk03",
          )}
          value={t(
            "admin",
            "offline",
          )}
          action={t(
            "admin",
            "monitor",
          )}
        />

        <AdminRow
          icon={
            <Monitor size={21} />
          }
          title={t(
            "admin",
            "kiosk04",
          )}
          value={t(
            "admin",
            "maintenance",
          )}
          action={t(
            "admin",
            "monitor",
          )}
        />

      </PageShell>
    );
  }

  /* =========================================================
     ADMIN — MONITORING
  ========================================================= */

  if (
    screen ===
    "adminMonitoring"
  ) {
    return (
      <PageShell
        language={language}
        step="ADMIN • STEP 7"
        title={t(
          "admin",
          "monitoring",
        )}
        onBack={() =>
          setScreen(
            "adminDashboard",
          )
        }
      >

        <div className="dashboard-stat-grid">

          <StatCard
            icon={
              <Activity size={22} />
            }
            title={t(
              "admin",
              "systemStatus",
            )}
            value={t(
              "admin",
              "healthy",
            )}
          />

          <StatCard
            icon={
              <Users size={22} />
            }
            title={t(
              "admin",
              "activeUsers",
            )}
            value="18"
          />

          <StatCard
            icon={
              <HeartPulse size={22} />
            }
            title={t(
              "admin",
              "aiSessions",
            )}
            value="11"
          />

          <StatCard
            icon={
              <Monitor size={22} />
            }
            title={t(
              "admin",
              "onlineKiosks",
            )}
            value="26/27"
          />

        </div>

      </PageShell>
    );
  }

  /* =========================================================
     ADMIN — SECURITY
  ========================================================= */

  if (
    screen ===
    "adminSecurity"
  ) {
    return (
      <PageShell
        language={language}
        step="ADMIN • STEP 8"
        title={t(
          "admin",
          "security",
        )}
        onBack={() =>
          setScreen(
            "adminDashboard",
          )
        }
      >

        <div className="security-event">

          <ShieldCheck size={20} />

          <div>

            <strong>
              {t(
                "admin",
                "authentication",
              )}
            </strong>

            <span>
              {t(
                "admin",
                "failedLogins",
              )}
            </span>

          </div>

        </div>

        <div className="security-event">

          <LockKeyhole size={20} />

          <div>

            <strong>
              {t(
                "admin",
                "accessControl",
              )}
            </strong>

            <span>
              {t(
                "admin",
                "roleBased",
              )}
            </span>

          </div>

        </div>

        <div className="security-event">

          <Activity size={20} />

          <div>

            <strong>
              {t(
                "admin",
                "auditLogging",
              )}
            </strong>

            <span>
              {t(
                "admin",
                "logging",
              )}
            </span>

          </div>

        </div>

      </PageShell>
    );
  }

  /* =========================================================
     COMPLETE
  ========================================================= */

  return (
    <div className="app complete-screen">

      <div className="complete-card">

        <div className="complete-icon">

          {retentionChoice ===
          "delete" ? (
            <Trash2 size={48} />
          ) : (
            <CheckCircle2 size={48} />
          )}

        </div>

        <h1>

          {retentionChoice ===
          "store"
            ? t(
                "retention",
                "storedTitle",
              )
            : retentionChoice ===
                "delete"
              ? t(
                  "retention",
                  "deletedTitle",
                )
              : language === "hi"
                ? "वर्कफ़्लो पूरा हुआ"
                : "Workflow Completed"}

        </h1>

        <p>

          {retentionChoice ===
          "store"
            ? t(
                "retention",
                "storedMessage",
              )
            : retentionChoice ===
                "delete"
              ? t(
                  "retention",
                  "deletedMessage",
                )
              : language === "hi"
                ? "चयनित workflow सफलतापूर्वक पूरा हुआ।"
                : "The selected workflow has been completed successfully."}

        </p>

        <VoiceButton
          language={language}
          getText={() => {
            const heading =
              retentionChoice ===
              "store"
                ? t("retention", "storedTitle")
                : retentionChoice === "delete"
                  ? t("retention", "deletedTitle")
                  : language === "hi"
                    ? "वर्कफ़्लो पूरा हुआ"
                    : "Workflow Completed";

            const message =
              retentionChoice ===
              "store"
                ? t("retention", "storedMessage")
                : retentionChoice === "delete"
                  ? t("retention", "deletedMessage")
                  : language === "hi"
                    ? "चयनित workflow सफलतापूर्वक पूरा हुआ।"
                    : "The selected workflow has been completed successfully.";

            return `${heading}. ${message}. ${t("retention", "finish")}.`;
          }}
        />

        <button
          className="primary-button"
          onClick={resetApp}
        >
          {t(
            "retention",
            "finish",
          )}
        </button>

      </div>

    </div>
  );
}

/* =========================================================
   ACCESSIBILITY CONTROLS
========================================================= */

function AccessibilityControls() {
  const [largeText, setLargeText] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("large-text-mode"),
  );

  const toggleLargeText = () => {
    const next = !largeText;
    setLargeText(next);
    document.documentElement.classList.toggle("large-text-mode", next);
    document.body.classList.toggle("large-text-mode", next);
  };

  return (
    <div className="accessibility-controls" aria-label="Accessibility controls">
      <button
        type="button"
        className={largeText ? "accessibility-button active" : "accessibility-button"}
        onClick={toggleLargeText}
        aria-pressed={largeText}
      >
        Large Text
      </button>
    </div>
  );
}

/* =========================================================
   PAGE SHELL
========================================================= */

function AayuvoraMenu({ language, setLanguage, showViewMedicines = false }: { language: Language; setLanguage: (language: Language) => void; showViewMedicines?: boolean }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark-mode"));
  const toggleDark = () => {
    const next = !document.documentElement.classList.contains("dark-mode");
    document.documentElement.classList.toggle("dark-mode", next);
    document.body.classList.toggle("dark-mode", next);
    setDark(next);
  };
  return <div className="aayuvora-menu-wrap">
    <button type="button" className="aayuvora-menu-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}><MenuIcon size={18}/></button>
    {open && <div className="aayuvora-menu-popover" role="menu">
      <label htmlFor="aayuvora-language-menu">Language</label>
      <select id="aayuvora-language-menu" value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
        <option value="en">English</option><option value="hi">हिन्दी</option><option value="bn">বাংলা</option><option value="mr">मराठी</option><option value="te">తెలుగు</option><option value="ta">தமிழ்</option>
      </select>
      {showViewMedicines && <button type="button" className="aayuvora-menu-dark-toggle" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("aayuvora:view-medicines")); }}>{({ en: "View Medicines", hi: "दवाइयाँ देखें", bn: "ওষুধ দেখুন", mr: "औषधे पहा", te: "మందులను చూడండి", ta: "மருந்துகளைப் பார்க்கவும்" } as Record<Language, string>)[language]}</button>}
      <button type="button" className="aayuvora-menu-dark-toggle" onClick={toggleDark}>{dark ? <Sun size={17}/> : <Moon size={17}/>} {dark ? "Light mode" : "Dark mode"}</button>
    </div>}
  </div>;
}


/** Render a Latin-script personal name in the selected Indic script. This is phonetic transliteration, not a change to the person's identity or stored name. */
function translatePatientName(name: string, language: Language): string {
  if (!name || language === "en" || !/[A-Za-z]/.test(name)) return name;
  // Prefer verified spellings for common names; fall back to phonetic transliteration for other names.
  const knownNames: Record<string, Partial<Record<Language, string>>> = {
    anurag: { hi: "अनुराग", mr: "अनुराग", bn: "অনুরাগ", te: "అనురాగ్", ta: "அனுராக்" },
    ashutosh: { hi: "आशुतोष", mr: "आशुतोष", bn: "আশুতোষ", te: "ఆశుతోష్", ta: "ஆஷுதோஷ்" },
    rahul: { hi: "राहुल", mr: "राहुल", bn: "রাহুল", te: "రాహుల్", ta: "ராகுல்" },
    priya: { hi: "प्रिया", mr: "प्रिया", bn: "প্রিয়া", te: "ప్రియా", ta: "பிரியா" },
    neha: { hi: "नेहा", mr: "नेहा", bn: "নেহা", te: "నేహా", ta: "நேஹா" },
  };
  const known = knownNames[name.trim().toLowerCase()]?.[language];
  if (known) return known;
  const scripts: Record<string, { vowels: Record<string, string>; signs: Record<string, string>; consonants: Record<string, string>; virama: string; independent: Record<string, string> }> = {
    hi: { vowels: { a:"अ", aa:"आ", i:"इ", ee:"ई", ii:"ई", u:"उ", oo:"ऊ", uu:"ऊ", e:"ए", ai:"ऐ", o:"ओ", au:"औ", ri:"ऋ" }, signs: { a:"", aa:"ा", i:"ि", ee:"ी", ii:"ी", u:"ु", oo:"ू", uu:"ू", e:"े", ai:"ै", o:"ो", au:"ौ", ri:"ृ" }, consonants: { kh:"ख", gh:"घ", ch:"च", chh:"छ", jh:"झ", th:"थ", dh:"ध", ph:"फ", bh:"भ", sh:"श", ss:"ष", ng:"ङ", ny:"ञ", k:"क", g:"ग", c:"क", j:"ज", t:"त", d:"द", n:"न", p:"प", b:"ब", m:"म", y:"य", r:"र", l:"ल", v:"व", w:"व", s:"स", h:"ह", f:"फ़", z:"ज़", q:"क", x:"क्स" }, virama:"्", independent: {} },
    mr: { vowels: { a:"अ", aa:"आ", i:"इ", ee:"ई", ii:"ई", u:"उ", oo:"ऊ", uu:"ऊ", e:"ए", ai:"ऐ", o:"ओ", au:"औ", ri:"ऋ" }, signs: { a:"", aa:"ा", i:"ि", ee:"ी", ii:"ी", u:"ु", oo:"ू", uu:"ू", e:"े", ai:"ै", o:"ो", au:"ौ", ri:"ृ" }, consonants: { kh:"ख", gh:"घ", ch:"च", chh:"छ", jh:"झ", th:"थ", dh:"ध", ph:"फ", bh:"भ", sh:"श", ss:"ष", ng:"ङ", ny:"ञ", k:"क", g:"ग", c:"क", j:"ज", t:"त", d:"द", n:"न", p:"प", b:"ब", m:"म", y:"य", r:"र", l:"ल", v:"व", w:"व", s:"स", h:"ह", f:"फ", z:"झ", q:"क", x:"क्स" }, virama:"्", independent: {} },
    bn: { vowels: { a:"অ", aa:"আ", i:"ই", ee:"ঈ", ii:"ঈ", u:"উ", oo:"ঊ", uu:"ঊ", e:"এ", ai:"ঐ", o:"ও", au:"ঔ" }, signs: { a:"", aa:"া", i:"ি", ee:"ী", ii:"ী", u:"ু", oo:"ূ", uu:"ূ", e:"ে", ai:"ৈ", o:"ো", au:"ৌ" }, consonants: { kh:"খ", gh:"ঘ", ch:"চ", chh:"ছ", jh:"ঝ", th:"থ", dh:"ধ", ph:"ফ", bh:"ভ", sh:"শ", ss:"ষ", ng:"ঙ", ny:"ঞ", k:"ক", g:"গ", c:"ক", j:"জ", t:"ত", d:"দ", n:"ন", p:"প", b:"ব", m:"ম", y:"য", r:"র", l:"ল", v:"ভ", w:"ও", s:"স", h:"হ", f:"ফ", z:"জ", q:"ক", x:"ক্স" }, virama:"্", independent: {} },
    te: { vowels: { a:"అ", aa:"ఆ", i:"ఇ", ee:"ఈ", ii:"ఈ", u:"ఉ", oo:"ఊ", uu:"ఊ", e:"ఎ", ai:"ఐ", o:"ఒ", au:"ఔ" }, signs: { a:"", aa:"ా", i:"ి", ee:"ీ", ii:"ీ", u:"ు", oo:"ూ", uu:"ూ", e:"ె", ai:"ై", o:"ొ", au:"ౌ" }, consonants: { kh:"ఖ", gh:"ఘ", ch:"చ", chh:"ఛ", jh:"ఝ", th:"థ", dh:"ధ", ph:"ఫ", bh:"భ", sh:"శ", ss:"ష", ng:"ఙ", ny:"ఞ", k:"క", g:"గ", c:"క", j:"జ", t:"త", d:"ద", n:"న", p:"ప", b:"బ", m:"మ", y:"య", r:"ర", l:"ల", v:"వ", w:"వ", s:"స", h:"హ", f:"ఫ", z:"జ", q:"క", x:"క్స్" }, virama:"్", independent: {} },
    ta: { vowels: { a:"அ", aa:"ஆ", i:"இ", ee:"ஈ", ii:"ஈ", u:"உ", oo:"ஊ", uu:"ஊ", e:"எ", ai:"ஐ", o:"ஒ", au:"ஔ" }, signs: { a:"", aa:"ா", i:"ி", ee:"ீ", ii:"ீ", u:"ு", oo:"ூ", uu:"ூ", e:"ெ", ai:"ை", o:"ொ", au:"ௌ" }, consonants: { kh:"க", gh:"க", ch:"ச", chh:"ச", jh:"ஜ", th:"த", dh:"த", ph:"ப", bh:"ப", sh:"ஷ", ss:"ஷ", ng:"ங", ny:"ஞ", k:"க", g:"க", c:"க", j:"ஜ", t:"ட", d:"ட", n:"ந", p:"ப", b:"ப", m:"ம", y:"ய", r:"ர", l:"ல", v:"வ", w:"வ", s:"ஸ", h:"ஹ", f:"ஃப", z:"ஜ", q:"க", x:"க்ஸ" }, virama:"்", independent: {} },
  };
  const cfg = scripts[language];
  if (!cfg) return name;
  // Leave names already written in an Indic script untouched.
  if (/[\u0900-\u0DFF]/.test(name)) return name;
  const tokens = [...new Set([...Object.keys(cfg.consonants), ...Object.keys(cfg.vowels)].sort((a,b)=>b.length-a.length))];
  const lower = name.toLowerCase();
  let out = "";
  for (let i=0; i<lower.length;) {
    const ch = lower[i];
    if (!/[a-z]/.test(ch)) { out += name[i]; i++; continue; }
    const token = tokens.find(t => lower.startsWith(t, i));
    if (!token) { out += name[i]; i++; continue; }
    if (cfg.consonants[token]) {
      const consonant = cfg.consonants[token];
      const rest = lower.slice(i + token.length);
      const vowel = Object.keys(cfg.vowels).sort((a,b)=>b.length-a.length).find(v => rest.startsWith(v));
      out += consonant;
      if (vowel) { out += cfg.signs[vowel] ?? ""; i += token.length + vowel.length; }
      else { out += cfg.virama; i += token.length; }
    } else {
      out += cfg.vowels[token]; i += token.length;
    }
  }
  return out;
}

function FeedbackSection({ language, patientName: _patientName }: { language: Language; patientName: string }) {
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState("5");
  const [submitted, setSubmitted] = useState(false);
  const labels: Record<Language, { title: string; intro: string; name: string; rating: string; excellent: string; good: string; okay: string; improve: string; poor: string; comments: string; placeholder: string; submit: string; thanks: string }> = {
    en: { title: "Feedback", intro: "Tell us how we can improve your experience.", name: "Name", rating: "How was your experience?", excellent: "Excellent", good: "Good", okay: "Okay", improve: "Needs improvement", poor: "Poor", comments: "Comments", placeholder: "Share your feedback...", submit: "Submit Feedback", thanks: "Thank you. Your feedback has been saved in this browser." },
    hi: { title: "प्रतिक्रिया", intro: "बताएँ कि हम आपके अनुभव को कैसे बेहतर बना सकते हैं।", name: "नाम", rating: "आपका अनुभव कैसा रहा?", excellent: "बहुत अच्छा", good: "अच्छा", okay: "ठीक-ठाक", improve: "सुधार की आवश्यकता है", poor: "खराब", comments: "टिप्पणियाँ", placeholder: "अपनी प्रतिक्रिया साझा करें...", submit: "प्रतिक्रिया भेजें", thanks: "धन्यवाद। आपकी प्रतिक्रिया इस ब्राउज़र में सुरक्षित कर दी गई है।" },
    bn: { title: "মতামত", intro: "আপনার অভিজ্ঞতা আরও ভালো করতে আমরা কী করতে পারি জানান।", name: "নাম", rating: "আপনার অভিজ্ঞতা কেমন ছিল?", excellent: "চমৎকার", good: "ভালো", okay: "মোটামুটি", improve: "উন্নতি প্রয়োজন", poor: "খারাপ", comments: "মন্তব্য", placeholder: "আপনার মতামত জানান...", submit: "মতামত জমা দিন", thanks: "ধন্যবাদ। আপনার মতামত এই ব্রাউজারে সংরক্ষণ করা হয়েছে।" },
    mr: { title: "अभिप्राय", intro: "तुमचा अनुभव अधिक चांगला करण्यासाठी आम्ही काय करू शकतो ते सांगा.", name: "नाव", rating: "तुमचा अनुभव कसा होता?", excellent: "उत्कृष्ट", good: "चांगला", okay: "ठीक आहे", improve: "सुधारणा आवश्यक", poor: "वाईट", comments: "टिप्पण्या", placeholder: "तुमचा अभिप्राय सांगा...", submit: "अभिप्राय पाठवा", thanks: "धन्यवाद. तुमचा अभिप्राय या ब्राउझरमध्ये जतन केला आहे." },
    te: { title: "అభిప్రాయం", intro: "మీ అనుభవాన్ని మెరుగుపరచడానికి మేము ఏమి చేయగలమో చెప్పండి.", name: "పేరు", rating: "మీ అనుభవం ఎలా ఉంది?", excellent: "అద్భుతం", good: "బాగుంది", okay: "పర్వాలేదు", improve: "మెరుగుదల అవసరం", poor: "బాగాలేదు", comments: "వ్యాఖ్యలు", placeholder: "మీ అభిప్రాయాన్ని పంచుకోండి...", submit: "అభిప్రాయాన్ని సమర్పించండి", thanks: "ధన్యవాదాలు. మీ అభిప్రాయం ఈ బ్రౌజర్‌లో సేవ్ చేయబడింది." },
    ta: { title: "கருத்து", intro: "உங்கள் அனுபவத்தை மேம்படுத்த நாங்கள் என்ன செய்யலாம் என்பதைச் சொல்லுங்கள்.", name: "பெயர்", rating: "உங்கள் அனுபவம் எப்படி இருந்தது?", excellent: "மிகச் சிறப்பு", good: "நன்று", okay: "பரவாயில்லை", improve: "மேம்பாடு தேவை", poor: "மோசம்", comments: "கருத்துகள்", placeholder: "உங்கள் கருத்தைப் பகிரவும்...", submit: "கருத்தைச் சமர்ப்பிக்கவும்", thanks: "நன்றி. உங்கள் கருத்து இந்த உலாவியில் சேமிக்கப்பட்டது." },
  };
  const l = labels[language] || labels.en;
  const submit = () => {
    if (!feedback.trim()) return;
    try {
      const existing = JSON.parse(window.localStorage.getItem("aayuvora.feedback.v1") || "[]");
      const safeExisting = Array.isArray(existing) ? existing : [];
      window.localStorage.setItem("aayuvora.feedback.v1", JSON.stringify([{ rating, feedback: feedback.trim(), createdAt: new Date().toISOString() }, ...safeExisting].slice(0, 50)));
    } catch { /* feedback remains available for this interaction even if storage is disabled */ }
    setSubmitted(true);
  };
  return <section className="patient-home-section feedback-section"><h2>{l.title}</h2><p>{l.intro}</p>{submitted ? <div className="information-box"><div className="info-row"><CheckCircle2 size={20}/><span>{l.thanks}</span></div></div> : <div className="feedback-form"><label htmlFor="patient-feedback-rating">{l.rating}</label><select id="patient-feedback-rating" value={rating} onChange={(event) => setRating(event.target.value)}><option value="5">{l.excellent}</option><option value="4">{l.good}</option><option value="3">{l.okay}</option><option value="2">{l.improve}</option><option value="1">{l.poor}</option></select><label htmlFor="patient-feedback-text">{l.comments}</label><textarea id="patient-feedback-text" rows={4} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder={l.placeholder}/><button className="primary-button" type="button" onClick={submit} disabled={!feedback.trim()}>{l.submit} <ArrowRight size={17}/></button></div>}</section>;
}

function PageShell({
  children,
  step,
  title,
  language,
  onBack,
}: {
  children: ReactNode;
  step: string;
  title: string;
  language: Language;
  onBack?: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  const getPageText = () => {
    const node = contentRef.current;
    if (!node) {
      return title;
    }

    const clone = node.cloneNode(true) as HTMLDivElement;
    clone
      .querySelectorAll("[data-voice-control=\"true\"]")
      .forEach((element) => element.remove());

    return clone.innerText.trim();
  };

  useEffect(() => {
    if (!document.documentElement.classList.contains("senior-citizen-mode")) return;
    const timer = window.setTimeout(() => {
      const text = getPageText();
      if (text) void speakText(text, VOICE_LANGUAGES[language]);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [title, language]);

  return (
    <div className="app">

      <header className="topbar">

        <div className="brand">

          <div
            className="small-logo"
            style={{
              background: "transparent",
              borderRadius: "50%",
              overflow: "hidden",
            }}
          >
            <img
              src="/aayuvora-logo.png"
              alt="Aayuvora logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>

          <div>

            <strong>
              Aayuvora
            </strong>

            <span>
              Patient Care Platform
            </span>

          </div>

        </div>

        <div className="topbar-accessibility">
          <AccessibilityControls />
        </div>

        <span className="step">
          {step}
        </span>

      </header>

      <main className="content-container">

        <div className="content-card" ref={contentRef}>

          <div className="page-voice-row">
            <VoiceButton
              language={language}
              getText={getPageText}
            />
          </div>

          {onBack && (
            <button
              className="back-button"
              onClick={onBack}
            >
              <ArrowLeft size={17} />
              Back
            </button>
          )}

          <h1>
            {title}
          </h1>

          {children}

          {step.startsWith("PATIENT") && !step.includes("STEP 3") && !step.includes("LOGIN") && (
            <div className="patient-main-menu-footer">
              <button type="button" className="secondary-button" onClick={() => window.dispatchEvent(new Event("aayuvora:go-main-menu"))}>
                <ArrowLeft size={17} /> Back to Main Menu
              </button>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}

/* =========================================================
   SUMMARY ROW
========================================================= */

function SummaryRow({
  title,
  value,
  explanation,
}: {
  title: string;
  value: string;
  explanation?: string;
}) {
  return (
    <div className="summary-row">

      <span>
        {title}
      </span>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "5px",
          flex: 1,
          textAlign: "right",
        }}
      >
        <strong
          className={value.includes("\n") ? "summary-multiline-value" : undefined}
        >
          {value.includes("\n")
            ? value
                .split(/\n+/)
                .map((line, index) => line.trim())
                .filter(Boolean)
                .map((line, index) => (
                  <span
                    className="summary-detail-line"
                    key={`${index}-${line.slice(0, 20)}`}
                  >
                    {line}
                  </span>
                ))
            : value}
        </strong>

        {explanation && (
          <small
            style={{
              color: "#6f8580",
              fontSize: "11px",
              lineHeight: 1.45,
              fontWeight: 400,
            }}
          >
            {explanation}
          </small>
        )}
      </div>

    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  title,
  value,
  onClick,
  active = false,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`stat-card${isClickable ? " stat-card-clickable" : ""}${active ? " stat-card-active" : ""}`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(event) => {
        if (isClickable && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick?.();
        }
      }}
    >

      <div className="stat-icon">
        {icon}
      </div>

      <span>
        {title}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}

/* =========================================================
   ADMIN ROW
========================================================= */

function AdminRow({
  icon,
  title,
  value,
  action,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  action: string;
}) {
  return (
    <div className="admin-row">

      <div className="admin-row-icon">
        {icon}
      </div>

      <div>

        <strong>
          {title}
        </strong>

        <span>
          {value}
        </span>

      </div>

      <button className="secondary-button">
        {action}
      </button>

    </div>
  );
}

export default App;