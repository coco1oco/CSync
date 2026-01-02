import React, { createContext, useContext, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";

export type DialogVariant = "default" | "danger" | "success";

// 1. The Full State (Internal use)
export interface DialogOptions {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: "text" | "number";
  placeholder?: string;
  variant?: DialogVariant;
}

// 2. The Argument Type (Excludes 'message' because it's passed separately)
export type DialogConfig = Omit<DialogOptions, "message">;

interface DialogContextProps {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, options?: DialogConfig) => Promise<boolean>;
  prompt: (message: string, options?: DialogConfig) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextProps | undefined>(undefined);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context)
    throw new Error("useDialog must be used within a DialogProvider");
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<
    DialogOptions & { mode: "alert" | "confirm" | "prompt" }
  >({
    mode: "alert",
    message: "",
  });
  const [inputValue, setInputValue] = useState("");

  const resolveRef = useRef<(value: any) => void>(() => {});

  const openDialog = (
    mode: "alert" | "confirm" | "prompt",
    message: string,
    options?: DialogConfig
  ) => {
    setConfig({ ...options, message, mode });
    setInputValue("");
    setIsOpen(true);
    return new Promise<any>((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const closeDialog = (result: any) => {
    setIsOpen(false);
    resolveRef.current(result);
  };

  const handleConfirm = () => {
    if (config.mode === "prompt") {
      closeDialog(inputValue);
    } else {
      closeDialog(true);
    }
  };

  const handleCancel = () => {
    closeDialog(config.mode === "prompt" ? null : false);
  };

  const api: DialogContextProps = {
    alert: async (message, title = "Notice") => {
      await openDialog("alert", message, { title });
    },
    confirm: async (message, options) => {
      return await openDialog("confirm", message, {
        title: "Are you sure?",
        confirmText: "Confirm",
        cancelText: "Cancel",
        ...options,
      });
    },
    prompt: async (message, options) => {
      return await openDialog("prompt", message, {
        title: "Input Required",
        confirmText: "Submit",
        cancelText: "Cancel",
        ...options,
      });
    },
  };

  return (
    <DialogContext.Provider value={api}>
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="flex flex-col items-center text-center gap-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  config.variant === "danger"
                    ? "bg-red-100 text-red-600"
                    : config.mode === "alert"
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {config.variant === "danger" ? (
                  <AlertCircle size={24} />
                ) : config.mode === "alert" ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <HelpCircle size={24} />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-gray-900">
                  {config.title}
                </h3>
                <p className="text-gray-500 text-sm font-medium">
                  {config.message}
                </p>
              </div>

              {config.mode === "prompt" && (
                <Input
                  autoFocus
                  type={config.type || "text"}
                  placeholder={config.placeholder}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                  className="bg-gray-50 text-center font-bold text-lg h-12 rounded-xl"
                />
              )}

              <div className="flex gap-3 w-full mt-2">
                {config.mode !== "alert" && (
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 rounded-xl h-11 font-bold border-gray-200"
                  >
                    {config.cancelText || "Cancel"}
                  </Button>
                )}
                <Button
                  onClick={handleConfirm}
                  className={`flex-1 rounded-xl h-11 font-bold shadow-lg ${
                    config.variant === "danger"
                      ? "bg-red-600 hover:bg-red-700 shadow-red-200 text-white"
                      : "bg-gray-900 hover:bg-gray-800 text-white"
                  }`}
                >
                  {config.confirmText || "OK"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
