"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, CheckCircle2, X } from "lucide-react";

export default function ProjectStarterWizard({ onClose }) {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [projectData, setProjectData] = useState({
    skillLevel: "",
    projectType: "",
    powerSource: "",
    projectGoal: "",
  });

  const skillLevels = [
    { id: "beginner", label: "Beginner", desc: "New to electronics, need guidance" },
    { id: "intermediate", label: "Intermediate", desc: "Some experience, comfortable with basics" },
    { id: "advanced", label: "Advanced", desc: "Experienced, complex projects" },
  ];

  const projectTypes = [
    { id: "school", label: "School Project", icon: "🎓" },
    { id: "personal", label: "Personal Hobby", icon: "🔧" },
    { id: "startup", label: "Startup/Commercial", icon: "🚀" },
  ];

  const powerSources = [
    { id: "solar", label: "Solar Power", icon: "☀️" },
    { id: "mains", label: "Mains (Wall Plug)", icon: "🔌" },
    { id: "battery", label: "Battery Powered", icon: "🔋" },
  ];

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleGeneratePartsList = async () => {
    // TODO: Call API to generate parts list based on projectData
    // For now, show placeholder
    setStep(5);
  };

  const handleAddAllToCart = () => {
    // TODO: Add generated parts to cart
    // For now, just close and redirect
    onClose();
    router.push("/cart");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6" />
              <div>
                <h2 className="text-2xl font-bold">Start a Project</h2>
                <p className="text-blue-100 text-sm">We'll help you find everything you need</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex-1 flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= s
                      ? "bg-white text-blue-600"
                      : "bg-white/30 text-white"
                  }`}
                >
                  {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-1 mx-1 ${
                      step > s ? "bg-white" : "bg-white/30"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Skill Level */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What's your skill level?
              </h3>
              <p className="text-gray-600 mb-6">
                This helps us recommend the right components and provide appropriate guidance.
              </p>
              <div className="grid gap-3">
                {skillLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => {
                      setProjectData({ ...projectData, skillLevel: level.id });
                      setTimeout(handleNext, 300);
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      projectData.skillLevel === level.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{level.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{level.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Project Type */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What type of project is this?
              </h3>
              <p className="text-gray-600 mb-6">
                Different project types may have different requirements and bulk options.
              </p>
              <div className="grid grid-cols-3 gap-4">
                {projectTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setProjectData({ ...projectData, projectType: type.id });
                      setTimeout(handleNext, 300);
                    }}
                    className={`p-6 rounded-lg border-2 text-center transition-all ${
                      projectData.projectType === type.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="text-4xl mb-2">{type.icon}</div>
                    <div className="font-semibold text-gray-900 text-sm">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Power Source */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What's your power source?
              </h3>
              <p className="text-gray-600 mb-6">
                This affects component selection and power management needs.
              </p>
              <div className="grid grid-cols-3 gap-4">
                {powerSources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => {
                      setProjectData({ ...projectData, powerSource: source.id });
                      setTimeout(handleNext, 300);
                    }}
                    className={`p-6 rounded-lg border-2 text-center transition-all ${
                      projectData.powerSource === source.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="text-4xl mb-2">{source.icon}</div>
                    <div className="font-semibold text-gray-900 text-sm">{source.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Project Goal */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What do you want to build?
              </h3>
              <p className="text-gray-600 mb-6">
                Describe your project goal. For example: "Automatic water level controller" or "Smart home lighting system"
              </p>
              <textarea
                value={projectData.projectGoal}
                onChange={(e) =>
                  setProjectData({ ...projectData, projectGoal: e.target.value })
                }
                placeholder="e.g., I want to build an automatic water level controller for my water tank..."
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 min-h-[120px]"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleGeneratePartsList}
                  disabled={!projectData.projectGoal.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Generate Parts List
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Parts List (Placeholder) */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Your Parts List
              </h3>
              <p className="text-gray-600 mb-6">
                Based on your project requirements, here's what you'll need:
              </p>
              
              {/* TODO: Replace with actual API-generated parts list */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <p className="text-blue-800">
                  <strong>Coming Soon:</strong> AI-powered parts list generation based on your project description.
                  For now, use the search bar or browse categories to find components.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleAddAllToCart}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  Browse Products
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
