import { useState } from "react";
// We don't strictly need the Dialog imports since we built a custom overlay,
// but I'll keep the icons we need.
import { ChevronRight, AlertTriangle } from "lucide-react";

interface BCSGuideModalProps {
  onSave: (score: number) => void;
  onClose: () => void;
}

export default function BCSGuideModal({ onSave, onClose }: BCSGuideModalProps) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<number[]>([]);

  // Logic Engine:
  // Q1: Ribs (1=Too Thin, 2=Ideal, 3=Too Fat)
  // Q2: Waist (1=Too Thin, 2=Ideal, 3=Too Fat)
  // Q3: Tuck (1=Too Thin, 2=Ideal, 3=Too Fat)

  const handleAnswer = (val: number) => {
    const newAnswers = [...answers, val];
    if (step < 3) {
      setAnswers(newAnswers);
      setStep(step + 1);
    } else {
      calculateScore(newAnswers);
    }
  };

  const calculateScore = (finalAnswers: number[]) => {
    // Simple Heuristic:
    const sum = finalAnswers.reduce((a, b) => a + b, 0);
    let score = 5;

    if (sum <= 4) score = 3; // Thin
    else if (sum === 5 || sum === 6) score = 5; // Ideal
    else if (sum === 7 || sum === 8) score = 7; // Heavy
    else if (sum === 9) score = 9; // Obese

    onSave(score);
  };

  const questions = [
    {
      title: "Touch the Ribs",
      desc: "Run your hands along the side of their chest.",
      options: [
        { val: 1, label: "Ribs stick out visibly", sub: "No fat covering" },
        { val: 2, label: "Can feel ribs easily", sub: "Light fat covering" },
        { val: 3, label: "Hard to feel ribs", sub: "Heavy fat covering" },
      ],
    },
    {
      title: "Look from Above (Waist)",
      desc: "Stand over your pet and look down at their back.",
      options: [
        { val: 1, label: "Extreme hourglass", sub: "Hip bones visible" },
        { val: 2, label: "Visible waist curve", sub: "Hourglass shape" },
        { val: 3, label: "No waist / Broad back", sub: "Rectangular or oval" },
      ],
    },
    {
      title: "Look from Side (Tuck)",
      desc: "Look at their profile from the side.",
      options: [
        {
          val: 1,
          label: "Severe abdominal tuck",
          sub: "Stomach sucks in deeply",
        },
        {
          val: 2,
          label: "Gentle upward slope",
          sub: "Stomach tucks up nicely",
        },
        { val: 3, label: "Flat or Hanging belly", sub: "No tuck / Sagging" },
      ],
    },
  ];

  const currentQ = questions[step - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-1.5 bg-gray-100 w-full">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="mt-4 mb-6">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            Step {step} of 3
          </span>
          <h2 className="text-2xl font-black text-gray-900 mt-1">
            {currentQ.title}
          </h2>
          <p className="text-gray-500 text-sm mt-1">{currentQ.desc}</p>
        </div>

        <div className="space-y-3 mb-6">
          {currentQ.options.map((opt) => (
            <button
              key={opt.val}
              onClick={() => handleAnswer(opt.val)}
              className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-blue-600 hover:bg-blue-50 transition-all group"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900 group-hover:text-blue-700">
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-400 group-hover:text-blue-500">
                    {opt.sub}
                  </p>
                </div>
                <ChevronRight
                  className="text-gray-300 group-hover:text-blue-600"
                  size={18}
                />
              </div>
            </button>
          ))}
        </div>

        {/* ✅ DISCLAIMER SECTION */}
        <div className="mt-auto bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-snug">
            <strong>Note:</strong> This tool is a general guideline based on
            visual cues. It does not replace a professional veterinary exam.
            Always consult your vet for an accurate health assessment.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 text-xs text-gray-400 font-bold hover:text-gray-600 w-full text-center py-2"
        >
          Cancel Assessment
        </button>
      </div>
    </div>
  );
}
